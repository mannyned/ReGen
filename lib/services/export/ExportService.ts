import type {
  ExportOptions,
  ExportResult,
  ExportJob,
  ExportJobCreateInput,
  ExportStatus,
  NormalizedPostAnalytics,
  NormalizedAccountAnalytics,
  PDFReportData,
} from '../../types/export'
import type { SocialPlatform, PlanTier, PostAnalytics, LocationData } from '../../types/social'
import { csvExportService } from './CSVExportService'
import { pdfExportService } from './PDFExportService'
import { assertProAccess, getExportRateLimit } from '../../middleware/roleGuard'
import { analyticsService } from '../analytics/AnalyticsService'

// ============================================
// EXPORT SERVICE
// Coordinates CSV and PDF exports with job management
// ============================================

// In-memory job store that persists across HMR (Hot Module Reload)
// Uses global reference to survive module reloads during development
declare global {
  // eslint-disable-next-line no-var
  var _exportJobs: Map<string, ExportJob> | undefined
  // eslint-disable-next-line no-var
  var _userExportCounts: Map<string, { hourly: number; daily: number; lastReset: Date }> | undefined
}

// Initialize or reuse existing stores (survives HMR)
const exportJobs = globalThis._exportJobs ?? new Map<string, ExportJob>()
const userExportCounts = globalThis._userExportCounts ?? new Map<string, { hourly: number; daily: number; lastReset: Date }>()

// Store references globally for HMR persistence
globalThis._exportJobs = exportJobs
globalThis._userExportCounts = userExportCounts

export class ExportService {
  // ============================================
  // MAIN EXPORT METHODS
  // ============================================

  /**
   * Create a new export job
   */
  async createExport(
    userId: string,
    userPlan: PlanTier,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Enforce PRO-only access
    assertProAccess(userPlan)

    // Check rate limits
    const rateLimitCheck = this.checkRateLimit(userId, userPlan)
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.message,
      }
    }

    // Create job
    const jobId = this.generateJobId()
    const job: ExportJob = {
      id: jobId,
      userId,
      format: options.format,
      options,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }

    exportJobs.set(jobId, job)

    // Process export asynchronously
    this.processExport(job, userPlan).catch((error) => {
      console.error('Export processing error:', error)
      job.status = 'failed'
      job.error = error.message
    })

    // Increment rate limit counter
    this.incrementRateLimit(userId)

    return {
      success: true,
      jobId,
      estimatedTime: this.estimateProcessingTime(options),
    }
  }

  /**
   * Get export job status
   */
  async getJobStatus(userId: string, jobId: string): Promise<ExportJob | null> {
    const job = exportJobs.get(jobId)
    if (!job || job.userId !== userId) {
      return null
    }
    return job
  }

  /**
   * Download completed export
   */
  async downloadExport(
    userId: string,
    jobId: string
  ): Promise<{ content: string; fileName: string; contentType: string } | null> {
    const job = exportJobs.get(jobId)
    if (!job || job.userId !== userId || job.status !== 'completed') {
      return null
    }

    // In production, fetch from storage service
    // For now, return the stored content
    return {
      content: (job as ExportJob & { content?: string }).content || '',
      fileName: job.fileName || 'export',
      contentType: job.format === 'csv' ? 'text/csv' : 'application/pdf',
    }
  }

  // ============================================
  // EXPORT PROCESSING
  // ============================================

  /**
   * Process export job asynchronously
   */
  private async processExport(job: ExportJob, userPlan: PlanTier): Promise<void> {
    try {
      job.status = 'processing'
      job.progress = 10

      // Small delay to ensure status is visible
      await this.delay(100)
      job.progress = 20

      // Fetch analytics data
      const analyticsData = await this.fetchAnalyticsData(job.userId, job.options)
      job.progress = 60

      await this.delay(100)
      job.progress = 70

      if (job.format === 'csv') {
        await this.processCSVExport(job, userPlan, analyticsData)
      } else {
        await this.processPDFExport(job, userPlan, analyticsData)
      }

      job.progress = 90
      await this.delay(100)

      job.status = 'completed'
      job.progress = 100
      job.completedAt = new Date()
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Export failed'
      throw error
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Process CSV export
   */
  private async processCSVExport(
    job: ExportJob,
    userPlan: PlanTier,
    analyticsData: NormalizedPostAnalytics[]
  ): Promise<void> {
    const result = await csvExportService.generateCSVExport(
      job.userId,
      userPlan,
      job.options,
      analyticsData
    )

    job.fileName = result.fileName
    job.fileSize = result.fileSize
    ;(job as ExportJob & { content?: string }).content = result.content
  }

  /**
   * Process PDF export
   */
  private async processPDFExport(
    job: ExportJob,
    userPlan: PlanTier,
    analyticsData: NormalizedPostAnalytics[]
  ): Promise<void> {
    // Build PDF report data
    const reportData = await this.buildPDFReportData(job.userId, job.options, analyticsData)

    const result = await pdfExportService.generatePDFExport(
      job.userId,
      userPlan,
      job.options,
      reportData
    )

    job.fileName = result.fileName
    ;(job as ExportJob & { content?: string }).content = result.html
    // Note: In production, convert HTML to PDF using puppeteer/playwright
  }

  // ============================================
  // DATA FETCHING & NORMALIZATION
  // ============================================

  /**
   * Fetch and normalize analytics data for export
   */
  private async fetchAnalyticsData(
    userId: string,
    options: ExportOptions
  ): Promise<NormalizedPostAnalytics[]> {
    const { filters } = options
    const normalizedPosts: NormalizedPostAnalytics[] = []

    // Determine platforms to fetch
    const platforms: SocialPlatform[] = filters.platforms || [
      'instagram',
      'tiktok',
      'youtube',
      'twitter',
      'linkedin',
      'facebook',
      'snapchat',
    ]

    // Date range
    const dateRange = {
      start: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: filters.dateTo || new Date(),
    }

    // For demo purposes, generate sample data
    // In production, this would fetch from the database and platform APIs
    for (const platform of platforms) {
      const posts = await this.fetchPlatformPosts(userId, platform, dateRange, filters.postIds)
      normalizedPosts.push(...posts)
    }

    return normalizedPosts
  }

  /**
   * Fetch posts for a specific platform
   */
  private async fetchPlatformPosts(
    userId: string,
    platform: SocialPlatform,
    dateRange: { start: Date; end: Date },
    postIds?: string[]
  ): Promise<NormalizedPostAnalytics[]> {
    // In production, fetch from database:
    // const posts = await prisma.publishedPost.findMany({
    //   where: {
    //     socialConnection: { userId, platform },
    //     publishedAt: { gte: dateRange.start, lte: dateRange.end },
    //     ...(postIds?.length ? { id: { in: postIds } } : {}),
    //   },
    //   include: { analyticsData: true },
    // })

    // For demo, return sample data
    return this.generateSamplePosts(platform, dateRange)
  }

  /**
   * Build PDF report data structure
   */
  private async buildPDFReportData(
    userId: string,
    options: ExportOptions,
    analyticsData: NormalizedPostAnalytics[]
  ): Promise<PDFReportData> {
    const { filters } = options

    // Calculate summary metrics
    const totalViews = analyticsData.reduce((sum, p) => sum + p.views, 0)
    const totalEngagements = analyticsData.reduce(
      (sum, p) => sum + p.likes + p.comments + p.shares,
      0
    )
    const avgEngagementRate =
      analyticsData.length > 0
        ? analyticsData.reduce((sum, p) => sum + p.engagementRate, 0) / analyticsData.length
        : 0

    // Get platform breakdown
    const platformBreakdown = this.calculatePlatformBreakdown(analyticsData)

    // Find top performing platform
    const topPlatform = platformBreakdown.reduce(
      (top, current) => (current.engagementRate > (top?.engagementRate || 0) ? current : top),
      null as (typeof platformBreakdown)[0] | null
    )

    // Build charts data
    const chartsData = options.includeCharts
      ? {
          viewsOverTime: this.buildViewsOverTimeData(analyticsData),
          engagementByPlatform: platformBreakdown.map((p) => ({
            platform: this.formatPlatformName(p.platform),
            engagement: p.engagementRate,
          })),
        }
      : undefined

    // Get location data if enabled
    const locationData = options.includeLocationData
      ? this.aggregateLocationData(analyticsData)
      : undefined

    return {
      creatorName: 'Creator Name', // In production, fetch from user profile
      creatorEmail: undefined,
      reportTitle: 'Analytics Report',
      dateRange: {
        from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: filters.dateTo || new Date(),
      },
      generatedAt: new Date(),
      summary: {
        totalViews,
        totalEngagements,
        avgEngagementRate,
        totalPosts: analyticsData.length,
        topPerformingPlatform: topPlatform?.platform || null,
      },
      platformAnalytics: platformBreakdown,
      posts: analyticsData.map((p) => ({
        id: p.postId,
        platform: p.platform,
        title: p.title,
        publishedAt: p.publishedAt,
        analytics: {
          views: p.views,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          saves: p.saves,
          reach: p.reach,
          impressions: p.impressions,
        },
      })),
      chartsData,
      locationData,
    }
  }

  /**
   * Calculate platform breakdown from posts
   */
  private calculatePlatformBreakdown(
    posts: NormalizedPostAnalytics[]
  ): Array<{
    platform: SocialPlatform
    followers: number
    posts: number
    views: number
    engagementRate: number
    reach: number
    growth: number
  }> {
    const breakdown = new Map<
      SocialPlatform,
      {
        posts: number
        views: number
        reach: number
        engagementSum: number
      }
    >()

    for (const post of posts) {
      const existing = breakdown.get(post.platform) || {
        posts: 0,
        views: 0,
        reach: 0,
        engagementSum: 0,
      }

      existing.posts++
      existing.views += post.views
      existing.reach += post.reach
      existing.engagementSum += post.engagementRate

      breakdown.set(post.platform, existing)
    }

    return Array.from(breakdown.entries()).map(([platform, data]) => ({
      platform,
      followers: 0, // Would fetch from account analytics
      posts: data.posts,
      views: data.views,
      engagementRate: data.posts > 0 ? data.engagementSum / data.posts : 0,
      reach: data.reach,
      growth: 0, // Would calculate from historical data
    }))
  }

  /**
   * Build views over time chart data
   */
  private buildViewsOverTimeData(
    posts: NormalizedPostAnalytics[]
  ): Array<{ date: string; views: number }> {
    const viewsByDate = new Map<string, number>()

    for (const post of posts) {
      const dateKey = post.publishedAt.toISOString().split('T')[0]
      viewsByDate.set(dateKey, (viewsByDate.get(dateKey) || 0) + post.views)
    }

    return Array.from(viewsByDate.entries())
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Aggregate location data from all posts
   */
  private aggregateLocationData(posts: NormalizedPostAnalytics[]): LocationData[] {
    const locationMap = new Map<string, { count: number; engagement: number }>()

    for (const post of posts) {
      for (const loc of post.topLocations || []) {
        const key = `${loc.country}|${loc.city || ''}`
        const existing = locationMap.get(key) || { count: 0, engagement: 0 }
        existing.count++
        existing.engagement += loc.engagement
        locationMap.set(key, existing)
      }
    }

    const totalEngagement = Array.from(locationMap.values()).reduce(
      (sum, loc) => sum + loc.engagement,
      0
    )

    return Array.from(locationMap.entries())
      .map(([key, data]) => {
        const [country, city] = key.split('|')
        return {
          country,
          city: city || undefined,
          percentage: totalEngagement > 0 ? (data.engagement / totalEngagement) * 100 : 0,
          engagement: data.engagement,
        }
      })
      .sort((a, b) => b.engagement - a.engagement)
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  private checkRateLimit(
    userId: string,
    userPlan: PlanTier
  ): { allowed: boolean; message?: string } {
    const limits = getExportRateLimit(userPlan)
    const userCounts = this.getUserExportCounts(userId)

    // Reset counts if needed
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    if (userCounts.lastReset < dayAgo) {
      userCounts.daily = 0
      userCounts.hourly = 0
      userCounts.lastReset = now
    } else if (userCounts.lastReset < hourAgo) {
      userCounts.hourly = 0
    }

    if (userCounts.hourly >= limits.maxPerHour) {
      return {
        allowed: false,
        message: `Hourly export limit reached (${limits.maxPerHour}). Please try again later.`,
      }
    }

    if (userCounts.daily >= limits.maxPerDay) {
      return {
        allowed: false,
        message: `Daily export limit reached (${limits.maxPerDay}). Please try again tomorrow.`,
      }
    }

    return { allowed: true }
  }

  private getUserExportCounts(userId: string) {
    if (!userExportCounts.has(userId)) {
      userExportCounts.set(userId, { hourly: 0, daily: 0, lastReset: new Date() })
    }
    return userExportCounts.get(userId)!
  }

  private incrementRateLimit(userId: string): void {
    const counts = this.getUserExportCounts(userId)
    counts.hourly++
    counts.daily++
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private generateJobId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private estimateProcessingTime(options: ExportOptions): number {
    // Estimate in seconds - optimized for faster generation
    let baseTime = 2

    if (options.format === 'pdf') {
      baseTime += 3 // PDF generation
      if (options.includeCharts) baseTime += 1
    }

    return baseTime
  }

  private formatPlatformName(platform: SocialPlatform): string {
    const names: Record<SocialPlatform, string> = {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      twitter: 'Twitter/X',
      linkedin: 'LinkedIn',
      facebook: 'Facebook',
      snapchat: 'Snapchat',
    }
    return names[platform] || platform
  }

  /**
   * Generate sample posts for demo purposes
   * Optimized for faster generation with fewer posts per platform
   */
  private generateSamplePosts(
    platform: SocialPlatform,
    dateRange: { start: Date; end: Date }
  ): NormalizedPostAnalytics[] {
    const posts: NormalizedPostAnalytics[] = []
    const daysDiff = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    )
    // Reduced from 10 to 5 posts max per platform for faster generation
    const numPosts = Math.min(Math.floor(daysDiff / 5), 5)

    const now = Date.now()
    for (let i = 0; i < numPosts; i++) {
      const publishDate = new Date(
        dateRange.start.getTime() + Math.random() * (dateRange.end.getTime() - dateRange.start.getTime())
      )

      const views = Math.floor(Math.random() * 50000) + 1000
      const likes = Math.floor(views * (Math.random() * 0.1 + 0.02))
      const comments = Math.floor(likes * (Math.random() * 0.3 + 0.05))
      const shares = Math.floor(likes * (Math.random() * 0.2 + 0.01))
      const saves = Math.floor(views * (Math.random() * 0.03 + 0.005))
      const impressions = Math.floor(views * (Math.random() * 0.5 + 1.2))
      const reach = Math.floor(impressions * (Math.random() * 0.3 + 0.6))

      posts.push({
        postId: `post_${platform}_${i}_${now}`,
        platform,
        platformPostId: `${platform}_${i}${now.toString(36)}`,
        title: `Sample ${platform} post #${i + 1}`,
        caption: `This is a sample caption for ${platform} post ${i + 1}`,
        publishedAt: publishDate,
        views,
        impressions,
        reach,
        likes,
        comments,
        shares,
        saves,
        engagementRate: impressions > 0 ? ((likes + comments + shares) / impressions) * 100 : 0,
        saveRate: impressions > 0 ? (saves / impressions) * 100 : 0,
        avgWatchTime: platform === 'youtube' || platform === 'tiktok' ? Math.random() * 60 + 10 : undefined,
        completionRate: platform === 'youtube' || platform === 'tiktok' ? Math.random() * 50 + 20 : undefined,
        topLocations: [
          { country: 'United States', city: 'New York', percentage: 35, engagement: Math.floor(likes * 0.35) },
          { country: 'United Kingdom', city: 'London', percentage: 15, engagement: Math.floor(likes * 0.15) },
          { country: 'Canada', city: 'Toronto', percentage: 10, engagement: Math.floor(likes * 0.10) },
        ],
      })
    }

    return posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  }
}

// Singleton instance
export const exportService = new ExportService()
