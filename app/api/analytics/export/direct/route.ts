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

    // Transform posts to export data
    const exportData = posts.map(post => {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, unknown> | null

      return {
        id: post.id,
        platform: getProviderDisplayName(post.provider),
        title: String(metadata?.title || post.contentUpload?.fileName || 'Untitled'),
        caption: String(metadata?.caption || metadata?.description || ''),
        publishedAt: post.postedAt?.toISOString() || post.createdAt.toISOString(),
        views: Number(analytics?.views) || 0,
        likes: Number(analytics?.likes) || 0,
        comments: Number(analytics?.comments) || 0,
        shares: Number(analytics?.shares) || 0,
        saves: Number(analytics?.saved || analytics?.saves) || 0,
        reach: Number(analytics?.reach) || 0,
        impressions: Number(analytics?.impressions) || 0,
        engagementRate: Number(analytics?.engagementRate) || 0,
      }
    })

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Platform', 'Title', 'Caption', 'Published At', 'Views', 'Likes', 'Comments', 'Shares', 'Saves', 'Reach', 'Impressions', 'Engagement Rate']
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

    // Calculate summary stats
    const totalViews = exportData.reduce((sum, p) => sum + p.views, 0)
    const totalLikes = exportData.reduce((sum, p) => sum + p.likes, 0)
    const totalComments = exportData.reduce((sum, p) => sum + p.comments, 0)
    const totalShares = exportData.reduce((sum, p) => sum + p.shares, 0)
    const totalSaves = exportData.reduce((sum, p) => sum + p.saves, 0)
    const totalReach = exportData.reduce((sum, p) => sum + p.reach, 0)
    const avgEngagementRate = totalReach > 0 ? ((totalLikes + totalComments + totalShares) / totalReach * 100) : 0

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
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; color: #1f2937; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { margin: 0 0 8px 0; font-size: 28px; color: #7c3aed; }
    .header p { margin: 0; color: #6b7280; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
    .stat-card { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 20px; border-radius: 12px; text-align: center; }
    .stat-card .value { font-size: 28px; font-weight: 700; color: #1f2937; }
    .stat-card .label { font-size: 13px; color: #6b7280; margin-top: 4px; }
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
      <div class="value">${(totalLikes + totalComments + totalShares).toLocaleString()}</div>
      <div class="label">Total Engagement</div>
    </div>
    <div class="stat-card">
      <div class="value">${avgEngagementRate.toFixed(2)}%</div>
      <div class="label">Avg Engagement Rate</div>
    </div>
  </div>

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
