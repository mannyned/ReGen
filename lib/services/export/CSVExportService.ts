import { Readable, Transform } from 'stream'
import type {
  ExportFilters,
  ExportOptions,
  CSVRow,
  CSV_COLUMNS,
  CSV_COLUMN_HEADERS,
  NormalizedPostAnalytics,
} from '../../types/export'
import type { SocialPlatform, LocationData } from '../../types/social'
import { assertProAccess } from '../../middleware/roleGuard'
import type { PlanTier } from '../../types/social'

// ============================================
// CSV EXPORT SERVICE
// Generates CSV exports with streaming support
// ============================================

export class CSVExportService {
  private readonly BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility

  // ============================================
  // MAIN EXPORT METHODS
  // ============================================

  /**
   * Generate a CSV export for analytics data
   * Uses streaming for large datasets
   */
  async generateCSVExport(
    userId: string,
    userPlan: PlanTier,
    options: ExportOptions,
    analyticsData: NormalizedPostAnalytics[]
  ): Promise<{
    content: string
    fileName: string
    rowCount: number
    fileSize: number
  }> {
    // Enforce PRO-only access
    assertProAccess(userPlan)

    const rows: string[] = []

    // Add BOM and header row
    rows.push(this.BOM + this.generateHeaderRow())

    // Generate data rows
    for (const post of analyticsData) {
      rows.push(this.generateDataRow(post, options.filters))
    }

    const content = rows.join('\n')
    const fileName = this.generateFileName(userId, options.filters)

    return {
      content,
      fileName,
      rowCount: analyticsData.length,
      fileSize: Buffer.byteLength(content, 'utf-8'),
    }
  }

  /**
   * Generate a streaming CSV export for large datasets
   * Returns a readable stream that can be piped directly to response
   */
  createStreamingExport(
    userId: string,
    userPlan: PlanTier,
    options: ExportOptions,
    dataGenerator: AsyncGenerator<NormalizedPostAnalytics>
  ): {
    stream: Readable
    fileName: string
  } {
    // Enforce PRO-only access
    assertProAccess(userPlan)

    const self = this
    let headerSent = false

    const stream = new Readable({
      async read() {
        try {
          if (!headerSent) {
            this.push(self.BOM + self.generateHeaderRow() + '\n')
            headerSent = true
          }

          const result = await dataGenerator.next()

          if (result.done) {
            this.push(null) // Signal end of stream
          } else {
            const row = self.generateDataRow(result.value, options.filters)
            this.push(row + '\n')
          }
        } catch (error) {
          this.destroy(error instanceof Error ? error : new Error(String(error)))
        }
      },
    })

    const fileName = this.generateFileName(userId, options.filters)

    return { stream, fileName }
  }

  // ============================================
  // ROW GENERATION
  // ============================================

  /**
   * Generate CSV header row
   */
  private generateHeaderRow(): string {
    const columns: (keyof CSVRow)[] = [
      'platform',
      'postId',
      'postTitle',
      'publishDate',
      'views',
      'impressions',
      'reach',
      'likes',
      'comments',
      'shares',
      'saves',
      'saveRate',
      'watchTime',
      'retention',
      'engagementRate',
      'topLocations',
      'deviceType',
      'dateRangeFrom',
      'dateRangeTo',
    ]

    const headers: Record<keyof CSVRow, string> = {
      platform: 'Platform',
      postId: 'Post ID',
      postTitle: 'Post Title / Caption',
      publishDate: 'Publish Date',
      views: 'Views',
      impressions: 'Impressions',
      reach: 'Reach',
      likes: 'Likes',
      comments: 'Comments',
      shares: 'Shares',
      saves: 'Saves',
      saveRate: 'Save Rate (%)',
      watchTime: 'Watch Time',
      retention: 'Retention (%)',
      engagementRate: 'Engagement Rate (%)',
      topLocations: 'Top Audience Locations',
      deviceType: 'Device Type',
      dateRangeFrom: 'Date Range (From)',
      dateRangeTo: 'Date Range (To)',
    }

    return columns.map((col) => this.escapeCSVValue(headers[col])).join(',')
  }

  /**
   * Generate a data row from normalized post analytics
   */
  private generateDataRow(post: NormalizedPostAnalytics, filters: ExportFilters): string {
    const row: CSVRow = {
      platform: this.formatPlatformName(post.platform),
      postId: post.postId,
      postTitle: this.truncateText(post.title || post.caption || '', 100),
      publishDate: this.formatDate(post.publishedAt),
      views: post.views,
      impressions: post.impressions,
      reach: post.reach,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      saves: post.saves,
      saveRate: this.formatPercentage(post.saveRate),
      watchTime: this.formatWatchTime(post.avgWatchTime),
      retention: this.formatPercentage(post.completionRate),
      engagementRate: this.formatPercentage(post.engagementRate),
      topLocations: this.formatLocations(post.topLocations),
      deviceType: this.formatDeviceBreakdown(post.deviceBreakdown),
      dateRangeFrom: filters.dateFrom ? this.formatDate(filters.dateFrom) : '',
      dateRangeTo: filters.dateTo ? this.formatDate(filters.dateTo) : '',
    }

    const columns: (keyof CSVRow)[] = [
      'platform',
      'postId',
      'postTitle',
      'publishDate',
      'views',
      'impressions',
      'reach',
      'likes',
      'comments',
      'shares',
      'saves',
      'saveRate',
      'watchTime',
      'retention',
      'engagementRate',
      'topLocations',
      'deviceType',
      'dateRangeFrom',
      'dateRangeTo',
    ]

    return columns
      .map((col) => this.escapeCSVValue(String(row[col])))
      .join(',')
  }

  // ============================================
  // FORMATTING HELPERS
  // ============================================

  /**
   * Escape a value for CSV (handles commas, quotes, newlines)
   */
  private escapeCSVValue(value: string): string {
    if (value === null || value === undefined) {
      return ''
    }

    const stringValue = String(value)

    // Check if escaping is needed
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      // Escape double quotes by doubling them and wrap in quotes
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    return stringValue
  }

  /**
   * Format platform name for display
   */
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
   * Format date for CSV
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  /**
   * Format percentage for display
   */
  private formatPercentage(value?: number): string {
    if (value === undefined || value === null) return 'N/A'
    return `${value.toFixed(2)}%`
  }

  /**
   * Format watch time (seconds) for display
   */
  private formatWatchTime(seconds?: number): string {
    if (seconds === undefined || seconds === null) return 'N/A'

    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)

    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  /**
   * Format location data for CSV cell
   */
  private formatLocations(locations?: LocationData[]): string {
    if (!locations || locations.length === 0) return 'N/A'

    // Show top 3 locations
    return locations
      .slice(0, 3)
      .map((loc) => {
        const parts = [loc.country]
        if (loc.city) parts.push(loc.city)
        return `${parts.join(', ')} (${loc.percentage.toFixed(1)}%)`
      })
      .join('; ')
  }

  /**
   * Format device breakdown for CSV cell
   */
  private formatDeviceBreakdown(breakdown?: Record<string, number>): string {
    if (!breakdown || Object.keys(breakdown).length === 0) return 'N/A'

    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([device, percentage]) => `${device}: ${percentage.toFixed(1)}%`)
      .join('; ')
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  /**
   * Generate file name for export
   */
  private generateFileName(userId: string, filters: ExportFilters): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const platformSuffix = filters.platforms?.length === 1 ? `_${filters.platforms[0]}` : ''
    return `regen_analytics${platformSuffix}_${timestamp}.csv`
  }

  // ============================================
  // AGGREGATION METHODS
  // ============================================

  /**
   * Aggregate posts by day
   */
  aggregateByDay(
    posts: NormalizedPostAnalytics[]
  ): Map<string, NormalizedPostAnalytics> {
    const aggregated = new Map<string, NormalizedPostAnalytics>()

    for (const post of posts) {
      const dateKey = this.formatDate(post.publishedAt)
      const key = `${post.platform}_${dateKey}`

      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!
        // Sum up metrics
        existing.views += post.views
        existing.impressions += post.impressions
        existing.reach += post.reach
        existing.likes += post.likes
        existing.comments += post.comments
        existing.shares += post.shares
        existing.saves += post.saves
        // Recalculate rates based on totals
        const totalEngagements = existing.likes + existing.comments + existing.shares
        existing.engagementRate =
          existing.impressions > 0 ? (totalEngagements / existing.impressions) * 100 : 0
        existing.saveRate =
          existing.impressions > 0 ? (existing.saves / existing.impressions) * 100 : 0
      } else {
        aggregated.set(key, { ...post })
      }
    }

    return aggregated
  }

  /**
   * Get total aggregated metrics across all posts
   */
  getTotalAggregates(posts: NormalizedPostAnalytics[]): {
    totalViews: number
    totalImpressions: number
    totalReach: number
    totalLikes: number
    totalComments: number
    totalShares: number
    totalSaves: number
    avgEngagementRate: number
    avgSaveRate: number
    postCount: number
  } {
    const totals = posts.reduce(
      (acc, post) => ({
        totalViews: acc.totalViews + post.views,
        totalImpressions: acc.totalImpressions + post.impressions,
        totalReach: acc.totalReach + post.reach,
        totalLikes: acc.totalLikes + post.likes,
        totalComments: acc.totalComments + post.comments,
        totalShares: acc.totalShares + post.shares,
        totalSaves: acc.totalSaves + post.saves,
      }),
      {
        totalViews: 0,
        totalImpressions: 0,
        totalReach: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
      }
    )

    const totalEngagements = totals.totalLikes + totals.totalComments + totals.totalShares
    const avgEngagementRate =
      totals.totalImpressions > 0
        ? (totalEngagements / totals.totalImpressions) * 100
        : 0
    const avgSaveRate =
      totals.totalImpressions > 0 ? (totals.totalSaves / totals.totalImpressions) * 100 : 0

    return {
      ...totals,
      avgEngagementRate,
      avgSaveRate,
      postCount: posts.length,
    }
  }
}

// Singleton instance
export const csvExportService = new CSVExportService()
