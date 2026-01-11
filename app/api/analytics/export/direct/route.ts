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

    // Default: return summary for PDF preview
    const totalViews = exportData.reduce((sum, p) => sum + p.views, 0)
    const totalLikes = exportData.reduce((sum, p) => sum + p.likes, 0)
    const totalComments = exportData.reduce((sum, p) => sum + p.comments, 0)
    const totalShares = exportData.reduce((sum, p) => sum + p.shares, 0)
    const totalSaves = exportData.reduce((sum, p) => sum + p.saves, 0)
    const totalReach = exportData.reduce((sum, p) => sum + p.reach, 0)

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
        avgEngagementRate: totalReach > 0 ? ((totalLikes + totalComments + totalShares) / totalReach * 100).toFixed(2) + '%' : '0%',
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
