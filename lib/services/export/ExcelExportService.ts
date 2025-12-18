import ExcelJS from 'exceljs'
import type {
  ExportOptions,
  NormalizedPostAnalytics,
  ExportFilters,
} from '../../types/export'
import type { SocialPlatform, LocationData } from '../../types/social'
import { assertProAccess } from '../../middleware/roleGuard'
import type { PlanTier } from '../../types/social'

// ============================================
// EXCEL EXPORT SERVICE
// Professional Excel exports with formatting
// ============================================

// ReGenr brand colors
const COLORS = {
  primary: '6366F1', // Indigo
  secondary: '8B5CF6', // Purple
  accent: 'EC4899', // Pink
  success: '10B981', // Green
  warning: 'F59E0B', // Amber
  error: 'EF4444', // Red
  dark: '1F2937', // Gray 800
  light: 'F9FAFB', // Gray 50
  white: 'FFFFFF',
}

export class ExcelExportService {
  // ============================================
  // MAIN EXPORT METHOD
  // ============================================

  /**
   * Generate a professional Excel export
   */
  async generateExcelExport(
    userId: string,
    userPlan: PlanTier,
    options: ExportOptions,
    analyticsData: NormalizedPostAnalytics[]
  ): Promise<{
    buffer: Buffer
    fileName: string
    rowCount: number
    fileSize: number
  }> {
    // Enforce PRO-only access
    assertProAccess(userPlan)

    const workbook = new ExcelJS.Workbook()

    // Set workbook properties
    workbook.creator = 'ReGenr Analytics'
    workbook.lastModifiedBy = 'ReGenr Analytics'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.properties.date1904 = false

    // Add sheets
    await this.addSummarySheet(workbook, analyticsData, options.filters)
    await this.addPostsSheet(workbook, analyticsData, options.filters)
    await this.addPlatformBreakdownSheet(workbook, analyticsData)

    if (options.includeLocationData) {
      await this.addLocationSheet(workbook, analyticsData)
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer

    const fileName = this.generateFileName(userId, options.filters)

    return {
      buffer,
      fileName,
      rowCount: analyticsData.length,
      fileSize: buffer.length,
    }
  }

  // ============================================
  // SUMMARY SHEET
  // ============================================

  private async addSummarySheet(
    workbook: ExcelJS.Workbook,
    data: NormalizedPostAnalytics[],
    filters: ExportFilters
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: COLORS.primary } },
    })

    // Set column widths
    sheet.columns = [
      { width: 25 },
      { width: 20 },
      { width: 15 },
    ]

    // Header with branding
    sheet.mergeCells('A1:C1')
    const titleCell = sheet.getCell('A1')
    titleCell.value = 'ReGenr Analytics Report'
    titleCell.font = { size: 24, bold: true, color: { argb: COLORS.primary } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getRow(1).height = 40

    // Date range
    sheet.mergeCells('A2:C2')
    const dateRangeCell = sheet.getCell('A2')
    const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dateTo = filters.dateTo || new Date()
    dateRangeCell.value = `Report Period: ${this.formatDate(dateFrom)} - ${this.formatDate(dateTo)}`
    dateRangeCell.font = { size: 12, color: { argb: '666666' } }
    dateRangeCell.alignment = { horizontal: 'center' }

    // Generated date
    sheet.mergeCells('A3:C3')
    const generatedCell = sheet.getCell('A3')
    generatedCell.value = `Generated: ${this.formatDateTime(new Date())}`
    generatedCell.font = { size: 10, color: { argb: '999999' } }
    generatedCell.alignment = { horizontal: 'center' }

    // Blank row
    sheet.addRow([])

    // Summary metrics header
    const metricsHeader = sheet.addRow(['Key Metrics', '', ''])
    metricsHeader.getCell(1).font = { size: 16, bold: true, color: { argb: COLORS.dark } }
    metricsHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.light },
    }
    sheet.mergeCells(`A${metricsHeader.number}:C${metricsHeader.number}`)

    // Calculate metrics
    const totalViews = data.reduce((sum, p) => sum + p.views, 0)
    const totalEngagements = data.reduce((sum, p) => sum + p.likes + p.comments + p.shares, 0)
    const totalSaves = data.reduce((sum, p) => sum + p.saves, 0)
    const avgEngagement = data.length > 0
      ? data.reduce((sum, p) => sum + p.engagementRate, 0) / data.length
      : 0
    const avgSaveRate = data.length > 0
      ? data.reduce((sum, p) => sum + p.saveRate, 0) / data.length
      : 0

    // Add metrics
    const metrics = [
      ['Total Posts', data.length, ''],
      ['Total Views', totalViews, ''],
      ['Total Engagements', totalEngagements, ''],
      ['Total Saves', totalSaves, ''],
      ['Avg Engagement Rate', `${avgEngagement.toFixed(2)}%`, ''],
      ['Avg Save Rate', `${avgSaveRate.toFixed(2)}%`, ''],
    ]

    metrics.forEach((metric) => {
      const row = sheet.addRow(metric)
      row.getCell(1).font = { bold: true }
      row.getCell(2).font = { size: 14, color: { argb: COLORS.primary } }
      row.getCell(2).alignment = { horizontal: 'right' }
    })

    // Platform breakdown section
    sheet.addRow([])
    const platformHeader = sheet.addRow(['Platform Breakdown', '', ''])
    platformHeader.getCell(1).font = { size: 16, bold: true, color: { argb: COLORS.dark } }
    platformHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.light },
    }
    sheet.mergeCells(`A${platformHeader.number}:C${platformHeader.number}`)

    // Platform column headers
    const platformColHeaders = sheet.addRow(['Platform', 'Posts', 'Views'])
    platformColHeaders.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.primary },
      }
    })

    // Group by platform
    const platformGroups = this.groupByPlatform(data)
    Object.entries(platformGroups).forEach(([platform, posts]) => {
      const views = posts.reduce((sum, p) => sum + p.views, 0)
      const row = sheet.addRow([this.formatPlatformName(platform as SocialPlatform), posts.length, views])
      row.getCell(2).alignment = { horizontal: 'right' }
      row.getCell(3).alignment = { horizontal: 'right' }
      row.getCell(3).numFmt = '#,##0'
    })

    // Footer
    sheet.addRow([])
    sheet.addRow([])
    const footerRow = sheet.addRow(['Generated by ReGenr - AI-Powered Social Media Analytics', '', ''])
    footerRow.getCell(1).font = { size: 10, italic: true, color: { argb: '999999' } }
    sheet.mergeCells(`A${footerRow.number}:C${footerRow.number}`)
  }

  // ============================================
  // POSTS SHEET
  // ============================================

  private async addPostsSheet(
    workbook: ExcelJS.Workbook,
    data: NormalizedPostAnalytics[],
    filters: ExportFilters
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Post Analytics', {
      properties: { tabColor: { argb: COLORS.secondary } },
    })

    // Define columns
    sheet.columns = [
      { header: 'Platform', key: 'platform', width: 12 },
      { header: 'Post ID', key: 'postId', width: 20 },
      { header: 'Title / Caption', key: 'title', width: 40 },
      { header: 'Publish Date', key: 'publishDate', width: 15 },
      { header: 'Views', key: 'views', width: 12 },
      { header: 'Impressions', key: 'impressions', width: 12 },
      { header: 'Reach', key: 'reach', width: 12 },
      { header: 'Likes', key: 'likes', width: 10 },
      { header: 'Comments', key: 'comments', width: 10 },
      { header: 'Shares', key: 'shares', width: 10 },
      { header: 'Saves', key: 'saves', width: 10 },
      { header: 'Engagement Rate', key: 'engagementRate', width: 15 },
      { header: 'Save Rate', key: 'saveRate', width: 12 },
      { header: 'Watch Time', key: 'watchTime', width: 12 },
      { header: 'Completion %', key: 'completion', width: 12 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.primary },
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        bottom: { style: 'thin', color: { argb: COLORS.dark } },
      }
    })
    headerRow.height = 25

    // Add data rows
    data.forEach((post, index) => {
      const row = sheet.addRow({
        platform: this.formatPlatformName(post.platform),
        postId: post.postId,
        title: this.truncateText(post.title || post.caption || '', 100),
        publishDate: this.formatDate(post.publishedAt),
        views: post.views,
        impressions: post.impressions,
        reach: post.reach,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        saves: post.saves,
        engagementRate: post.engagementRate / 100,
        saveRate: post.saveRate / 100,
        watchTime: post.avgWatchTime ? this.formatWatchTime(post.avgWatchTime) : 'N/A',
        completion: post.completionRate ? post.completionRate / 100 : null,
      })

      // Alternate row colors
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.light },
          }
        })
      }

      // Format number cells
      row.getCell('views').numFmt = '#,##0'
      row.getCell('impressions').numFmt = '#,##0'
      row.getCell('reach').numFmt = '#,##0'
      row.getCell('likes').numFmt = '#,##0'
      row.getCell('comments').numFmt = '#,##0'
      row.getCell('shares').numFmt = '#,##0'
      row.getCell('saves').numFmt = '#,##0'
      row.getCell('engagementRate').numFmt = '0.00%'
      row.getCell('saveRate').numFmt = '0.00%'
      if (post.completionRate) {
        row.getCell('completion').numFmt = '0.0%'
      }
    })

    // Add filters
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.length + 1, column: 15 },
    }

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ============================================
  // PLATFORM BREAKDOWN SHEET
  // ============================================

  private async addPlatformBreakdownSheet(
    workbook: ExcelJS.Workbook,
    data: NormalizedPostAnalytics[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Platform Breakdown', {
      properties: { tabColor: { argb: COLORS.accent } },
    })

    // Define columns
    sheet.columns = [
      { header: 'Platform', key: 'platform', width: 15 },
      { header: 'Total Posts', key: 'posts', width: 12 },
      { header: 'Total Views', key: 'views', width: 15 },
      { header: 'Total Reach', key: 'reach', width: 15 },
      { header: 'Total Likes', key: 'likes', width: 12 },
      { header: 'Total Comments', key: 'comments', width: 15 },
      { header: 'Total Shares', key: 'shares', width: 12 },
      { header: 'Total Saves', key: 'saves', width: 12 },
      { header: 'Avg Engagement', key: 'avgEngagement', width: 15 },
      { header: 'Avg Save Rate', key: 'avgSaveRate', width: 15 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.secondary },
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    headerRow.height = 25

    // Group and calculate
    const platformGroups = this.groupByPlatform(data)

    Object.entries(platformGroups).forEach(([platform, posts], index) => {
      const totals = {
        posts: posts.length,
        views: posts.reduce((sum, p) => sum + p.views, 0),
        reach: posts.reduce((sum, p) => sum + p.reach, 0),
        likes: posts.reduce((sum, p) => sum + p.likes, 0),
        comments: posts.reduce((sum, p) => sum + p.comments, 0),
        shares: posts.reduce((sum, p) => sum + p.shares, 0),
        saves: posts.reduce((sum, p) => sum + p.saves, 0),
        avgEngagement: posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length,
        avgSaveRate: posts.reduce((sum, p) => sum + p.saveRate, 0) / posts.length,
      }

      const row = sheet.addRow({
        platform: this.formatPlatformName(platform as SocialPlatform),
        ...totals,
        avgEngagement: totals.avgEngagement / 100,
        avgSaveRate: totals.avgSaveRate / 100,
      })

      // Alternate row colors
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.light },
          }
        })
      }

      // Format numbers
      row.getCell('views').numFmt = '#,##0'
      row.getCell('reach').numFmt = '#,##0'
      row.getCell('likes').numFmt = '#,##0'
      row.getCell('comments').numFmt = '#,##0'
      row.getCell('shares').numFmt = '#,##0'
      row.getCell('saves').numFmt = '#,##0'
      row.getCell('avgEngagement').numFmt = '0.00%'
      row.getCell('avgSaveRate').numFmt = '0.00%'
    })

    // Add totals row
    const allTotals = {
      platform: 'TOTAL',
      posts: data.length,
      views: data.reduce((sum, p) => sum + p.views, 0),
      reach: data.reduce((sum, p) => sum + p.reach, 0),
      likes: data.reduce((sum, p) => sum + p.likes, 0),
      comments: data.reduce((sum, p) => sum + p.comments, 0),
      shares: data.reduce((sum, p) => sum + p.shares, 0),
      saves: data.reduce((sum, p) => sum + p.saves, 0),
      avgEngagement: data.reduce((sum, p) => sum + p.engagementRate, 0) / data.length / 100,
      avgSaveRate: data.reduce((sum, p) => sum + p.saveRate, 0) / data.length / 100,
    }

    const totalRow = sheet.addRow(allTotals)
    totalRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.primary },
      }
      cell.font = { bold: true, color: { argb: COLORS.white } }
    })

    totalRow.getCell('views').numFmt = '#,##0'
    totalRow.getCell('reach').numFmt = '#,##0'
    totalRow.getCell('likes').numFmt = '#,##0'
    totalRow.getCell('comments').numFmt = '#,##0'
    totalRow.getCell('shares').numFmt = '#,##0'
    totalRow.getCell('saves').numFmt = '#,##0'
    totalRow.getCell('avgEngagement').numFmt = '0.00%'
    totalRow.getCell('avgSaveRate').numFmt = '0.00%'

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ============================================
  // LOCATION SHEET
  // ============================================

  private async addLocationSheet(
    workbook: ExcelJS.Workbook,
    data: NormalizedPostAnalytics[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Location Analytics', {
      properties: { tabColor: { argb: COLORS.success } },
    })

    // Define columns
    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'City', key: 'city', width: 20 },
      { header: '% of Audience', key: 'percentage', width: 15 },
      { header: 'Engagements', key: 'engagement', width: 15 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.success },
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    headerRow.height = 25

    // Aggregate location data
    const locationMap = new Map<string, { count: number; engagement: number; city?: string }>()

    for (const post of data) {
      for (const loc of post.topLocations || []) {
        const key = `${loc.country}|${loc.city || ''}`
        const existing = locationMap.get(key) || { count: 0, engagement: 0, city: loc.city }
        existing.count++
        existing.engagement += loc.engagement
        locationMap.set(key, existing)
      }
    }

    const totalEngagement = Array.from(locationMap.values()).reduce(
      (sum, loc) => sum + loc.engagement,
      0
    )

    const sortedLocations = Array.from(locationMap.entries())
      .map(([key, data]) => {
        const [country] = key.split('|')
        return {
          country,
          city: data.city || '',
          percentage: totalEngagement > 0 ? (data.engagement / totalEngagement) * 100 : 0,
          engagement: data.engagement,
        }
      })
      .sort((a, b) => b.engagement - a.engagement)

    // Add data rows
    sortedLocations.forEach((loc, index) => {
      const row = sheet.addRow({
        rank: index + 1,
        country: loc.country,
        city: loc.city || '-',
        percentage: loc.percentage / 100,
        engagement: loc.engagement,
      })

      // Alternate row colors
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.light },
          }
        })
      }

      row.getCell('percentage').numFmt = '0.0%'
      row.getCell('engagement').numFmt = '#,##0'
    })

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private groupByPlatform(
    data: NormalizedPostAnalytics[]
  ): Record<string, NormalizedPostAnalytics[]> {
    const groups: Record<string, NormalizedPostAnalytics[]> = {}

    for (const post of data) {
      if (!groups[post.platform]) {
        groups[post.platform] = []
      }
      groups[post.platform].push(post)
    }

    return groups
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

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  private formatWatchTime(seconds?: number): string {
    if (!seconds) return 'N/A'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  private generateFileName(userId: string, filters: ExportFilters): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const platformSuffix = filters.platforms?.length === 1 ? `_${filters.platforms[0]}` : ''
    return `regen_analytics${platformSuffix}_${timestamp}.xlsx`
  }
}

// Singleton instance
export const excelExportService = new ExcelExportService()
