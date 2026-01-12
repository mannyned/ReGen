/**
 * GET /api/analytics/export/direct
 *
 * Simple, fast direct export - returns file immediately without job queue
 * Uses the exact same data fetching as the working stats API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

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

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (!isValidUUID(profileId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log(`[Direct Export] Fetching data for user ${profileId}, last ${days} days`)

    // Fetch posts with analytics - same query as working stats API
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

    console.log(`[Direct Export] Found ${posts.length} posts`)

    // Transform posts to export data with ALL analytics
    const exportData = posts.map(post => {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, unknown> | null

      // Core metrics
      const views = Number(analytics?.views) || 0
      const likes = Number(analytics?.likes) || 0
      const comments = Number(analytics?.comments) || 0
      const shares = Number(analytics?.shares) || 0
      const saves = Number(analytics?.saved || analytics?.saves) || 0
      const reach = Number(analytics?.reach) || 0
      const impressions = Number(analytics?.impressions) || reach || views

      // Calculated rates
      const totalEngagement = likes + comments + shares + saves
      const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0
      const saveRate = impressions > 0 ? (saves / impressions) * 100 : 0

      // Video metrics (if available)
      const avgWatchTime = Number(analytics?.avgWatchTime || analytics?.averageViewDuration) || 0
      const completionRate = Number(analytics?.completionRate || analytics?.averageViewPercentage) || 0

      // Additional metrics
      const profileVisits = Number(analytics?.profileVisits || analytics?.profile_visits) || 0
      const websiteClicks = Number(analytics?.websiteClicks || analytics?.website_clicks) || 0
      const followersGained = Number(analytics?.followersGained || analytics?.followers_gained) || 0

      // Location data (top country)
      const topLocations = analytics?.topLocations as Array<{ country: string; percentage: number }> | undefined
      const topCountry = topLocations?.[0]?.country || ''

      return {
        id: post.id,
        platform: getProviderDisplayName(post.provider),
        title: String(metadata?.title || post.contentUpload?.fileName || 'Untitled'),
        caption: String(metadata?.caption || metadata?.description || ''),
        publishedAt: post.postedAt?.toISOString() || post.createdAt.toISOString(),
        views,
        likes,
        comments,
        shares,
        saves,
        reach,
        impressions,
        engagementRate,
        saveRate,
        avgWatchTime,
        completionRate,
        profileVisits,
        websiteClicks,
        followersGained,
        topCountry,
      }
    })

    if (format === 'csv') {
      // Generate CSV with ALL analytics columns
      const headers = [
        'ID', 'Platform', 'Title', 'Caption', 'Published At',
        'Views', 'Likes', 'Comments', 'Shares', 'Saves',
        'Reach', 'Impressions', 'Engagement Rate', 'Save Rate',
        'Avg Watch Time (s)', 'Completion Rate',
        'Profile Visits', 'Website Clicks', 'Followers Gained', 'Top Country'
      ]
      const rows = exportData.map(row => [
        row.id,
        row.platform,
        `"${row.title.replace(/"/g, '""')}"`,
        `"${row.caption.replace(/"/g, '""').substring(0, 200)}"`,
        row.publishedAt,
        row.views,
        row.likes,
        row.comments,
        row.shares,
        row.saves,
        row.reach,
        row.impressions,
        row.engagementRate.toFixed(2) + '%',
        row.saveRate.toFixed(2) + '%',
        row.avgWatchTime.toFixed(1),
        row.completionRate.toFixed(1) + '%',
        row.profileVisits,
        row.websiteClicks,
        row.followersGained,
        `"${row.topCountry}"`,
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="regen_analytics_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        exportedAt: new Date().toISOString(),
        totalPosts: exportData.length,
        data: exportData,
      })
    }

    // Calculate comprehensive summary stats
    const totalViews = exportData.reduce((sum, p) => sum + p.views, 0)
    const totalLikes = exportData.reduce((sum, p) => sum + p.likes, 0)
    const totalComments = exportData.reduce((sum, p) => sum + p.comments, 0)
    const totalShares = exportData.reduce((sum, p) => sum + p.shares, 0)
    const totalSaves = exportData.reduce((sum, p) => sum + p.saves, 0)
    const totalReach = exportData.reduce((sum, p) => sum + p.reach, 0)
    const totalImpressions = exportData.reduce((sum, p) => sum + p.impressions, 0)
    const totalProfileVisits = exportData.reduce((sum, p) => sum + p.profileVisits, 0)
    const totalWebsiteClicks = exportData.reduce((sum, p) => sum + p.websiteClicks, 0)
    const totalFollowersGained = exportData.reduce((sum, p) => sum + p.followersGained, 0)
    const avgEngagementRate = totalReach > 0 ? ((totalLikes + totalComments + totalShares + totalSaves) / totalReach * 100) : 0
    const avgSaveRate = totalImpressions > 0 ? (totalSaves / totalImpressions * 100) : 0

    // Video metrics averages (only for posts with video data)
    const videoPosts = exportData.filter(p => p.avgWatchTime > 0 || p.completionRate > 0)
    const avgWatchTime = videoPosts.length > 0 ? videoPosts.reduce((sum, p) => sum + p.avgWatchTime, 0) / videoPosts.length : 0
    const avgCompletionRate = videoPosts.length > 0 ? videoPosts.reduce((sum, p) => sum + p.completionRate, 0) / videoPosts.length : 0

    // Group by platform
    const byPlatform: Record<string, { posts: number; views: number; engagement: number }> = {}
    for (const post of exportData) {
      if (!byPlatform[post.platform]) {
        byPlatform[post.platform] = { posts: 0, views: 0, engagement: 0 }
      }
      byPlatform[post.platform].posts++
      byPlatform[post.platform].views += post.views
      byPlatform[post.platform].engagement += post.likes + post.comments + post.shares
    }

    // PDF format - return printable HTML
    if (format === 'pdf') {
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      const platformRows = Object.entries(byPlatform)
        .map(([platform, data]) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${platform}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${data.posts}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.views.toLocaleString()}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${data.engagement.toLocaleString()}</td>
          </tr>
        `).join('')

      const postRows = exportData.slice(0, 20).map(post => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${post.platform}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${post.title}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${post.views.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${post.likes.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${post.comments.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${post.shares.toLocaleString()}</td>
        </tr>
      `).join('')

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Analytics Report - ${dateStr}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; color: #1f2937; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { margin: 0 0 8px 0; font-size: 28px; color: #7c3aed; }
    .header p { margin: 0; color: #6b7280; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 16px; border-radius: 12px; text-align: center; }
    .stat-card .value { font-size: 24px; font-weight: 700; color: #1f2937; }
    .stat-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 18px; margin: 0 0 16px 0; color: #374151; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    th:not(:first-child) { text-align: right; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analytics Report</h1>
    <p>Generated on ${dateStr} | Last ${days} days</p>
  </div>

  <div class="summary">
    <div class="stat-card">
      <div class="value">${exportData.length}</div>
      <div class="label">Total Posts</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalViews.toLocaleString()}</div>
      <div class="label">Total Views</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalReach.toLocaleString()}</div>
      <div class="label">Total Reach</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalImpressions.toLocaleString()}</div>
      <div class="label">Impressions</div>
    </div>
  </div>

  <div class="summary">
    <div class="stat-card">
      <div class="value">${totalLikes.toLocaleString()}</div>
      <div class="label">Likes</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalComments.toLocaleString()}</div>
      <div class="label">Comments</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalShares.toLocaleString()}</div>
      <div class="label">Shares</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalSaves.toLocaleString()}</div>
      <div class="label">Saves</div>
    </div>
  </div>

  <div class="summary">
    <div class="stat-card">
      <div class="value">${avgEngagementRate.toFixed(2)}%</div>
      <div class="label">Engagement Rate</div>
    </div>
    <div class="stat-card">
      <div class="value">${avgSaveRate.toFixed(2)}%</div>
      <div class="label">Save Rate</div>
    </div>
    <div class="stat-card">
      <div class="value">${avgWatchTime.toFixed(1)}s</div>
      <div class="label">Avg Watch Time</div>
    </div>
    <div class="stat-card">
      <div class="value">${avgCompletionRate.toFixed(1)}%</div>
      <div class="label">Completion Rate</div>
    </div>
  </div>

  ${totalProfileVisits > 0 || totalWebsiteClicks > 0 || totalFollowersGained > 0 ? `
  <div class="summary">
    <div class="stat-card">
      <div class="value">${totalProfileVisits.toLocaleString()}</div>
      <div class="label">Profile Visits</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalWebsiteClicks.toLocaleString()}</div>
      <div class="label">Website Clicks</div>
    </div>
    <div class="stat-card">
      <div class="value">${totalFollowersGained >= 0 ? '+' : ''}${totalFollowersGained.toLocaleString()}</div>
      <div class="label">Followers Gained</div>
    </div>
    <div class="stat-card">
      <div class="value">-</div>
      <div class="label">-</div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>Performance by Platform</h2>
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th style="text-align: center;">Posts</th>
          <th>Views</th>
          <th>Engagement</th>
        </tr>
      </thead>
      <tbody>
        ${platformRows || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #6b7280;">No platform data available</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Top Posts${exportData.length > 20 ? ' (Top 20)' : ''}</h2>
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th>Title</th>
          <th>Views</th>
          <th>Likes</th>
          <th>Comments</th>
          <th>Shares</th>
        </tr>
      </thead>
      <tbody>
        ${postRows || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #6b7280;">No posts available</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated by ReGenr Analytics | ${new Date().toISOString()}</p>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    // Default: return JSON summary
    return NextResponse.json({
      success: true,
      exportedAt: new Date().toISOString(),
      summary: {
        totalPosts: exportData.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalSaves,
        totalReach,
        avgEngagementRate: avgEngagementRate.toFixed(2) + '%',
      },
      byPlatform,
      posts: exportData,
    })
  } catch (error) {
    console.error('[Direct Export] Error:', error)
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
