// ============================================
// GOOGLE SHEETS EXPORT SERVICE
// PRO-Only Feature - Direct Export to Google Sheets
// ============================================

import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import type {
  ExportOptions,
  GoogleSheetsOptions,
  NormalizedPostAnalytics,
  CSV_COLUMN_HEADERS,
} from '@/lib/types/export'
import type { PlanTier } from '@prisma/client'

// Column headers for the spreadsheet
const COLUMN_HEADERS = [
  'Platform',
  'Post ID',
  'Post Title / Caption',
  'Publish Date',
  'Views',
  'Impressions',
  'Reach',
  'Likes',
  'Comments',
  'Shares',
  'Saves',
  'Save Rate (%)',
  'Watch Time',
  'Retention (%)',
  'Engagement Rate (%)',
  'Top Audience Locations',
  'Device Type',
  'Date Range (From)',
  'Date Range (To)',
]

interface GoogleSheetsExportResult {
  spreadsheetId: string
  spreadsheetUrl: string
  sheetName: string
  rowCount: number
}

interface GoogleCredentials {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export class GoogleSheetsExportService {
  private credentials: GoogleCredentials

  constructor() {
    this.credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    }
  }

  /**
   * Create OAuth2 client with user tokens
   */
  private createOAuth2Client(accessToken: string, refreshToken?: string): OAuth2Client {
    const oauth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret,
      this.credentials.redirectUri
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    return oauth2Client
  }

  /**
   * Generate Google Sheets authorization URL
   * Note: We use drive.file scope which allows creating and editing Google Sheets
   * files created by the app, without requiring sensitive scope verification
   */
  getAuthorizationUrl(state: string): string {
    const oauth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret,
      this.credentials.redirectUri
    )

    // drive.file scope allows creating/editing files created by this app (including Sheets)
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
    ]

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent',
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const oauth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret,
      this.credentials.redirectUri
    )

    const { tokens } = await oauth2Client.getToken(code)

    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
    }
  }

  /**
   * Main export method - exports analytics to Google Sheets
   */
  async exportToGoogleSheets(
    userId: string,
    userPlan: PlanTier,
    options: ExportOptions,
    analyticsData: NormalizedPostAnalytics[],
    googleAccessToken: string,
    googleRefreshToken?: string
  ): Promise<GoogleSheetsExportResult> {
    // Validate PRO access
    if (userPlan === 'FREE') {
      throw new Error('Google Sheets export is a PRO-only feature')
    }

    const auth = this.createOAuth2Client(googleAccessToken, googleRefreshToken)
    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    const sheetsOptions = options.googleSheets || {}
    const sheetName = sheetsOptions.sheetName || 'Analytics Export'

    let spreadsheetId: string

    if (sheetsOptions.spreadsheetId && !sheetsOptions.createNew) {
      // Update existing spreadsheet
      spreadsheetId = sheetsOptions.spreadsheetId
      await this.updateExistingSpreadsheet(sheets, spreadsheetId, sheetName, analyticsData, options)
    } else {
      // Create new spreadsheet
      spreadsheetId = await this.createNewSpreadsheet(sheets, sheetName, analyticsData, options)
    }

    // Share with specified emails if any
    if (sheetsOptions.shareWith && sheetsOptions.shareWith.length > 0) {
      await this.shareSpreadsheet(drive, spreadsheetId, sheetsOptions.shareWith)
    }

    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      sheetName,
      rowCount: analyticsData.length,
    }
  }

  /**
   * Create a new Google Spreadsheet with analytics data
   */
  private async createNewSpreadsheet(
    sheets: ReturnType<typeof google.sheets>,
    sheetName: string,
    analyticsData: NormalizedPostAnalytics[],
    options: ExportOptions
  ): Promise<string> {
    const dateFrom = options.filters.dateFrom
      ? new Date(options.filters.dateFrom).toLocaleDateString()
      : 'All time'
    const dateTo = options.filters.dateTo
      ? new Date(options.filters.dateTo).toLocaleDateString()
      : 'Present'

    // Create the spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `ReGenr Analytics Export - ${new Date().toLocaleDateString()}`,
        },
        sheets: [
          {
            properties: {
              title: 'Summary',
              index: 0,
            },
          },
          {
            properties: {
              title: sheetName,
              index: 1,
            },
          },
          {
            properties: {
              title: 'Platform Breakdown',
              index: 2,
            },
          },
        ],
      },
    })

    const spreadsheetId = spreadsheet.data.spreadsheetId!

    // Prepare summary data
    const summaryData = this.prepareSummaryData(analyticsData, dateFrom, dateTo)

    // Prepare main analytics data
    const mainData = this.prepareAnalyticsData(analyticsData, dateFrom, dateTo, options)

    // Prepare platform breakdown data
    const platformData = this.preparePlatformBreakdown(analyticsData)

    // Batch update all sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Summary!A1',
            values: summaryData,
          },
          {
            range: `'${sheetName}'!A1`,
            values: mainData,
          },
          {
            range: 'Platform Breakdown!A1',
            values: platformData,
          },
        ],
      },
    })

    // Apply formatting
    await this.applyFormatting(sheets, spreadsheetId, analyticsData.length)

    return spreadsheetId
  }

  /**
   * Update an existing Google Spreadsheet
   */
  private async updateExistingSpreadsheet(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string,
    sheetName: string,
    analyticsData: NormalizedPostAnalytics[],
    options: ExportOptions
  ): Promise<void> {
    const dateFrom = options.filters.dateFrom
      ? new Date(options.filters.dateFrom).toLocaleDateString()
      : 'All time'
    const dateTo = options.filters.dateTo
      ? new Date(options.filters.dateTo).toLocaleDateString()
      : 'Present'

    // Check if sheet exists, create if not
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const existingSheets = spreadsheet.data.sheets || []
    const sheetExists = existingSheets.some(
      (s) => s.properties?.title === sheetName
    )

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      })
    }

    // Clear existing data and write new data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:Z`,
    })

    const mainData = this.prepareAnalyticsData(analyticsData, dateFrom, dateTo, options)

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: mainData,
      },
    })
  }

  /**
   * Share spreadsheet with specified email addresses
   */
  private async shareSpreadsheet(
    drive: ReturnType<typeof google.drive>,
    spreadsheetId: string,
    emails: string[]
  ): Promise<void> {
    for (const email of emails) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'user',
            role: 'reader',
            emailAddress: email,
          },
          sendNotificationEmail: true,
        })
      } catch (error) {
        console.error(`Failed to share with ${email}:`, error)
        // Continue with other emails even if one fails
      }
    }
  }

  /**
   * Prepare summary sheet data
   */
  private prepareSummaryData(
    analyticsData: NormalizedPostAnalytics[],
    dateFrom: string,
    dateTo: string
  ): (string | number)[][] {
    const totalViews = analyticsData.reduce((sum, p) => sum + p.views, 0)
    const totalEngagements = analyticsData.reduce(
      (sum, p) => sum + p.likes + p.comments + p.shares + p.saves,
      0
    )
    const avgEngagementRate =
      analyticsData.length > 0
        ? analyticsData.reduce((sum, p) => sum + p.engagementRate, 0) / analyticsData.length
        : 0

    const platforms = [...new Set(analyticsData.map((p) => p.platform))]

    return [
      ['ReGenr Analytics Export Summary'],
      [''],
      ['Generated', new Date().toLocaleString()],
      ['Date Range', `${dateFrom} - ${dateTo}`],
      [''],
      ['Key Metrics'],
      ['Total Posts', analyticsData.length],
      ['Total Views', totalViews],
      ['Total Engagements', totalEngagements],
      ['Average Engagement Rate', `${avgEngagementRate.toFixed(2)}%`],
      ['Platforms', platforms.join(', ')],
      [''],
      ['Powered by ReGenr - https://regen.app'],
    ]
  }

  /**
   * Prepare main analytics data rows
   */
  private prepareAnalyticsData(
    analyticsData: NormalizedPostAnalytics[],
    dateFrom: string,
    dateTo: string,
    options: ExportOptions
  ): (string | number)[][] {
    const rows: (string | number)[][] = [COLUMN_HEADERS]

    for (const post of analyticsData) {
      // Format location data
      const topLocations =
        options.includeLocationData && post.topLocations
          ? post.topLocations
              .slice(0, 3)
              .map((loc) => `${loc.country}: ${loc.percentage.toFixed(1)}%`)
              .join('; ')
          : ''

      // Format device breakdown
      const deviceType = post.deviceBreakdown
        ? Object.entries(post.deviceBreakdown)
            .map(([device, pct]) => `${device}: ${pct}%`)
            .join('; ')
        : ''

      // Format watch time
      const watchTime = post.avgWatchTime
        ? this.formatWatchTime(post.avgWatchTime)
        : ''

      // Format retention
      const retention = post.completionRate
        ? `${post.completionRate.toFixed(1)}%`
        : ''

      rows.push([
        post.platform,
        post.platformPostId,
        post.title || post.caption || '',
        new Date(post.publishedAt).toLocaleDateString(),
        post.views,
        post.impressions,
        post.reach,
        post.likes,
        post.comments,
        post.shares,
        post.saves,
        `${post.saveRate.toFixed(2)}%`,
        watchTime,
        retention,
        `${post.engagementRate.toFixed(2)}%`,
        topLocations,
        deviceType,
        dateFrom,
        dateTo,
      ])
    }

    return rows
  }

  /**
   * Prepare platform breakdown data
   */
  private preparePlatformBreakdown(
    analyticsData: NormalizedPostAnalytics[]
  ): (string | number)[][] {
    const platformStats = new Map<
      string,
      { posts: number; views: number; engagements: number; reach: number }
    >()

    for (const post of analyticsData) {
      const stats = platformStats.get(post.platform) || {
        posts: 0,
        views: 0,
        engagements: 0,
        reach: 0,
      }

      stats.posts++
      stats.views += post.views
      stats.engagements += post.likes + post.comments + post.shares + post.saves
      stats.reach += post.reach

      platformStats.set(post.platform, stats)
    }

    const rows: (string | number)[][] = [
      ['Platform Breakdown'],
      [''],
      ['Platform', 'Posts', 'Total Views', 'Total Engagements', 'Total Reach', 'Avg Engagement Rate'],
    ]

    for (const [platform, stats] of platformStats) {
      const avgEngagementRate =
        stats.views > 0 ? ((stats.engagements / stats.views) * 100).toFixed(2) : '0.00'

      rows.push([
        platform,
        stats.posts,
        stats.views,
        stats.engagements,
        stats.reach,
        `${avgEngagementRate}%`,
      ])
    }

    return rows
  }

  /**
   * Apply formatting to the spreadsheet
   */
  private async applyFormatting(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string,
    rowCount: number
  ): Promise<void> {
    // Get sheet IDs
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetIds = spreadsheet.data.sheets?.map((s) => s.properties?.sheetId) || []

    const requests: any[] = []

    // Format header row for each sheet
    for (const sheetId of sheetIds) {
      if (sheetId === undefined) continue

      // Bold header row
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.39, green: 0.4, blue: 0.95 }, // ReGenr primary color
              textFormat: {
                foregroundColor: { red: 1, green: 1, blue: 1 },
                bold: true,
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      })

      // Auto-resize columns
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 20,
          },
        },
      })

      // Freeze header row
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      })
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      })
    }
  }

  /**
   * Format watch time from seconds to human readable
   */
  private formatWatchTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.round(seconds % 60)
      return `${mins}m ${secs}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${mins}m`
    }
  }

  /**
   * Verify Google connection is valid
   */
  async verifyConnection(accessToken: string): Promise<boolean> {
    try {
      const auth = this.createOAuth2Client(accessToken)
      const sheets = google.sheets({ version: 'v4', auth })

      // Try to list spreadsheets (simple test)
      await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'ReGenr Connection Test',
          },
        },
      })

      return true
    } catch (error) {
      console.error('Google Sheets connection verification failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const googleSheetsExportService = new GoogleSheetsExportService()
