/**
 * POST /api/analytics/export/google_sheets
 *
 * Creates a Google Spreadsheet with analytics data.
 * Requires user to have connected their Google account.
 *
 * Flow:
 * 1. Get user's Google OAuth token from database
 * 2. Fetch analytics data
 * 3. Create new Google Spreadsheet
 * 4. Populate with analytics data
 * 5. Return spreadsheet URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { OAuthEngine } from '@/lib/oauth/engine'

export const runtime = 'nodejs'

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Map provider to display name
function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    'meta': 'Instagram',
    'instagram': 'Instagram',
    'google': 'YouTube',
    'youtube': 'YouTube',
    'facebook': 'Facebook',
    'tiktok': 'TikTok',
    'linkedin': 'LinkedIn',
    'twitter': 'Twitter/X',
    'x': 'Twitter/X',
    'snapchat': 'Snapchat',
  }
  return names[provider.toLowerCase()] || provider
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (!isValidUUID(profileId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    // Check if user has connected Google account
    let accessToken: string
    try {
      accessToken = await OAuthEngine.getAccessToken('google', profileId)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google account not connected',
          code: 'GOOGLE_NOT_CONNECTED',
          message: 'Please connect your Google account to export to Google Sheets.',
          connectUrl: '/api/auth/google/start',
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const days = body.days || 30

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log(`[Google Sheets Export] Fetching data for user ${profileId}, last ${days} days`)

    // Fetch posts with analytics
    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: { gte: startDate },
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

    console.log(`[Google Sheets Export] Found ${posts.length} posts`)

    // Transform posts to export data
    const exportData = posts.map(post => {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, unknown> | null

      const views = Number(analytics?.views) || 0
      const likes = Number(analytics?.likes) || 0
      const comments = Number(analytics?.comments) || 0
      const shares = Number(analytics?.shares) || 0
      const saves = Number(analytics?.saved || analytics?.saves) || 0
      const reach = Number(analytics?.reach) || 0
      const impressions = Number(analytics?.impressions) || reach || views

      const totalEngagement = likes + comments + shares + saves
      const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0
      const saveRate = impressions > 0 ? (saves / impressions) * 100 : 0

      return {
        platform: getProviderDisplayName(post.provider),
        title: String(metadata?.title || post.contentUpload?.fileName || 'Untitled'),
        publishedAt: post.postedAt?.toISOString().split('T')[0] || post.createdAt.toISOString().split('T')[0],
        views,
        likes,
        comments,
        shares,
        saves,
        reach,
        impressions,
        engagementRate: engagementRate.toFixed(2) + '%',
        saveRate: saveRate.toFixed(2) + '%',
      }
    })

    // Create Google Sheets client
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    // Create new spreadsheet
    const dateStr = new Date().toISOString().split('T')[0]
    const spreadsheetTitle = `ReGenr Analytics Report - ${dateStr}`

    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: spreadsheetTitle,
        },
        sheets: [
          {
            properties: {
              title: 'Analytics Data',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
          {
            properties: {
              title: 'Summary',
            },
          },
        ],
      },
    })

    const spreadsheetId = spreadsheet.data.spreadsheetId!
    const spreadsheetUrl = spreadsheet.data.spreadsheetUrl!

    // Prepare data for Analytics Data sheet
    const headers = [
      'Platform', 'Title', 'Published', 'Views', 'Likes', 'Comments',
      'Shares', 'Saves', 'Reach', 'Impressions', 'Engagement Rate', 'Save Rate'
    ]

    const rows = exportData.map(row => [
      row.platform,
      row.title,
      row.publishedAt,
      row.views,
      row.likes,
      row.comments,
      row.shares,
      row.saves,
      row.reach,
      row.impressions,
      row.engagementRate,
      row.saveRate,
    ])

    // Calculate summary stats
    const totalViews = exportData.reduce((sum, p) => sum + p.views, 0)
    const totalLikes = exportData.reduce((sum, p) => sum + p.likes, 0)
    const totalComments = exportData.reduce((sum, p) => sum + p.comments, 0)
    const totalShares = exportData.reduce((sum, p) => sum + p.shares, 0)
    const totalSaves = exportData.reduce((sum, p) => sum + p.saves, 0)
    const totalReach = exportData.reduce((sum, p) => sum + p.reach, 0)
    const avgEngagement = totalReach > 0
      ? ((totalLikes + totalComments + totalShares + totalSaves) / totalReach * 100).toFixed(2) + '%'
      : '0%'

    // Prepare summary data
    const summaryData = [
      ['ReGenr Analytics Summary'],
      [''],
      ['Report Generated', new Date().toISOString()],
      ['Date Range', `Last ${days} days`],
      [''],
      ['Metric', 'Value'],
      ['Total Posts', exportData.length],
      ['Total Views', totalViews],
      ['Total Likes', totalLikes],
      ['Total Comments', totalComments],
      ['Total Shares', totalShares],
      ['Total Saves', totalSaves],
      ['Total Reach', totalReach],
      ['Average Engagement Rate', avgEngagement],
    ]

    // Write data to spreadsheet
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Analytics Data!A1',
            values: [headers, ...rows],
          },
          {
            range: 'Summary!A1',
            values: summaryData,
          },
        ],
      },
    })

    // Format the spreadsheet (header row styling)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Format Analytics Data header
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.49, green: 0.23, blue: 0.93 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          // Format Summary title
          {
            repeatCell: {
              range: {
                sheetId: 1,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    fontSize: 16,
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(textFormat)',
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 12,
              },
            },
          },
        ],
      },
    })

    console.log(`[Google Sheets Export] Created spreadsheet: ${spreadsheetUrl}`)

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      title: spreadsheetTitle,
      rowCount: exportData.length,
    })
  } catch (error) {
    console.error('[Google Sheets Export] Error:', error)

    // Handle specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google token expired',
            code: 'TOKEN_EXPIRED',
            message: 'Your Google connection has expired. Please reconnect your account.',
            connectUrl: '/api/auth/google/start',
          },
          { status: 401 }
        )
      }

      if (error.message.includes('insufficient')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_SCOPE',
            message: 'Please reconnect your Google account to grant Google Sheets access.',
            connectUrl: '/api/auth/google/start',
          },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'Failed to create Google Spreadsheet',
      },
      { status: 500 }
    )
  }
}
