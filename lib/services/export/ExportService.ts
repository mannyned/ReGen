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
import { prisma } from '../../db'

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
   * Process export job - optimized for speed
   */
  private async processExport(job: ExportJob, userPlan: PlanTier): Promise<void> {
    try {
      job.status = 'processing'
      job.progress = 20

      // Fetch analytics data
      const analyticsData = await this.fetchAnalyticsData(job.userId, job.options)
      console.log(`[ExportService] Fetched ${analyticsData.length} posts for export`)
      job.progress = 60

      if (job.format === 'csv') {
        await this.processCSVExport(job, userPlan, analyticsData)
      } else {
        await this.processPDFExport(job, userPlan, analyticsData)
      }

      job.status = 'completed'
      job.progress = 100
      job.completedAt = new Date()
    } catch (error) {
      console.error('[ExportService] Export failed:', error)
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Export failed'
      throw error
    }
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
   * Validate if a string is a valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Map database provider to platform name
   */
  private providerToPlatform(provider: string): SocialPlatform {
    const mapping: Record<string, SocialPlatform> = {
      'meta': 'instagram',
      'instagram': 'instagram',
      'google': 'youtube',
      'youtube': 'youtube',
      'facebook': 'facebook',
      'tiktok': 'tiktok',
      'linkedin': 'linkedin',
      'twitter': 'twitter',
      'x': 'twitter',
      'snapchat': 'snapchat',
    }
    return mapping[provider.toLowerCase()] || provider as SocialPlatform
  }

  /**
   * Fetch and normalize analytics data for export - matches working stats API pattern
   */
  private async fetchAnalyticsData(
    userId: string,
    options: ExportOptions
  ): Promise<NormalizedPostAnalytics[]> {
    // Validate userId is a valid UUID before querying
    if (!this.isValidUUID(userId)) {
      console.warn(`[ExportService] Invalid UUID format for userId: ${userId}`)
      return []
    }

    const { filters } = options || {}

    // Date range - only use start date like the working stats API
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Default 30 days
    const dateFrom = filters?.dateFrom || startDate

    // Build provider filter if platforms specified (matches stats API pattern)
    const getProviderFilter = (platforms?: string[]) => {
      if (!platforms || platforms.length === 0) return undefined
      const platformMap: Record<string, string[]> = {
        'instagram': ['meta', 'instagram'],
        'youtube': ['google', 'youtube'],
        'facebook': ['facebook', 'meta'],
        'tiktok': ['tiktok'],
        'linkedin': ['linkedin'],
        'twitter': ['twitter', 'x'],
        'snapchat': ['snapchat'],
      }
      const allProviders: string[] = []
      for (const platform of platforms) {
        const providers = platformMap[platform.toLowerCase()] || [platform]
        allProviders.push(...providers)
      }
      return { in: allProviders }
    }

    const providerFilter = getProviderFilter(filters?.platforms as string[] | undefined)
    const providerWhere = providerFilter ? { provider: providerFilter } : {}

    console.log(`[ExportService] Fetching posts for userId: ${userId}, dateFrom: ${dateFrom.toISOString()}`)

    // Single optimized query matching working stats API pattern
    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId: userId,
        status: 'POSTED',
        postedAt: { gte: dateFrom },
        ...providerWhere,
        ...(filters?.postIds?.length ? { id: { in: filters.postIds } } : {}),
      },
      select: {
        id: true,
        provider: true,
        externalPostId: true,
        metadata: true,
        postedAt: true,
        createdAt: true,
        contentUpload: {
          select: {
            fileName: true,
          },
        },
      },
      orderBy: {
        postedAt: 'desc',
      },
    })

    console.log(`[ExportService] Found ${posts.length} posts in database`)

    // Transform to NormalizedPostAnalytics format (matches stats API data extraction)
    return posts.map(post => {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, unknown> | null
      const platform = this.providerToPlatform(post.provider)

      // Extract metrics matching stats API pattern
      const views = Number(analytics?.views) || 0
      const likes = Number(analytics?.likes) || 0
      const comments = Number(analytics?.comments) || 0
      const shares = Number(analytics?.shares) || 0
      const saves = Number(analytics?.saved || analytics?.saves) || 0
      const reach = Number(analytics?.reach) || 0
      const impressions = Number(analytics?.impressions) || reach || views

      // Calculate engagement rate
      const totalEngagement = likes + comments + shares
      const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0
      const saveRate = reach > 0 ? (saves / reach) * 100 : 0

      // Get title and caption
      const title = String(metadata?.title || post.contentUpload?.fileName || `${platform} post`)
      const caption = String(metadata?.caption || metadata?.description || '')

      return {
        postId: post.id,
        platform,
        platformPostId: post.externalPostId || post.id,
        title,
        caption,
        publishedAt: post.postedAt || post.createdAt,
        views,
        impressions,
        reach,
        likes,
        comments,
        shares,
        saves,
        engagementRate,
        saveRate,
        avgWatchTime: analytics?.avgWatchTime ? Number(analytics.avgWatchTime) : undefined,
        completionRate: analytics?.completionRate ? Number(analytics.completionRate) : undefined,
        topLocations: Array.isArray(analytics?.topLocations) ? analytics.topLocations as Array<{
          country: string
          city?: string
          percentage: number
          engagement: number
        }> : [],
      }
    })
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

    // Fetch real user profile data
    const userProfile = await this.fetchUserProfile(userId)

    return {
      creatorName: userProfile.name,
      creatorEmail: userProfile.email,
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
      meta: 'Meta',
      snapchat: 'Snapchat',
      pinterest: 'Pinterest',
      discord: 'Discord',
    }
    return names[platform] || platform
  }

  /**
   * Fetch user profile data for reports
   */
  private async fetchUserProfile(userId: string): Promise<{ name: string; email?: string }> {
    // Validate userId is a valid UUID before querying
    if (!this.isValidUUID(userId)) {
      return { name: 'Creator' }
    }

    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: {
          displayName: true,
          email: true,
        },
      })

      if (profile) {
        const name = profile.displayName || 'Creator'
        return { name, email: profile.email || undefined }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }

    return { name: 'Creator' }
  }
}

// Singleton instance
export const exportService = new ExportService()
