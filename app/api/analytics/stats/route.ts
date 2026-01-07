/**
 * GET /api/analytics/stats
 *
 * Fetch basic analytics stats for the user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get time range from query params (default 30 days)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Calculate week start (7 days ago)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    // Count total posts (published, not deleted)
    const totalPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'POSTED',
      },
    })

    // Count posts this week (published in last 7 days, not deleted)
    const postsThisWeek = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: {
          gte: weekStart,
        },
      },
    })

    // Count deleted posts
    const deletedPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'DELETED',
      },
    })

    // Count posts in time range
    const postsInRange = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: {
          gte: startDate,
        },
      },
    })

    // Count queued posts (awaiting processing)
    const queuedPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'QUEUED',
      },
    })

    // Count failed posts
    const failedPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'FAILED',
      },
    })

    // Count posts by platform
    const postsByPlatform = await prisma.outboundPost.groupBy({
      by: ['provider'],
      where: {
        profileId,
        status: 'POSTED',
      },
      _count: {
        id: true,
      },
    })

    // Count AI-generated captions (posts with captions in metadata)
    // Since we can't easily filter on JSON in Prisma, count all posts
    // In practice, most posts from ReGenr have AI-generated captions
    const aiGenerated = totalPosts

    // Transform platform stats
    const platformStats: Record<string, number> = {}
    for (const stat of postsByPlatform) {
      platformStats[stat.provider] = stat._count.id
    }

    // Fetch engagement metrics from synced analytics
    const postsWithAnalytics = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: { gte: startDate },
      },
      select: {
        provider: true,
        metadata: true,
      },
    })

    // Aggregate engagement metrics
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0
    let totalReach = 0
    let totalImpressions = 0
    let totalSaves = 0
    let postsWithMetrics = 0

    const platformEngagement: Record<string, {
      posts: number
      likes: number
      comments: number
      shares: number
      reach: number
      impressions: number
      saves: number
    }> = {}

    for (const post of postsWithAnalytics) {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | null

      if (analytics) {
        postsWithMetrics++
        totalLikes += analytics.likes || 0
        totalComments += analytics.comments || 0
        totalShares += analytics.shares || 0
        totalReach += analytics.reach || 0
        totalImpressions += analytics.impressions || 0
        totalSaves += analytics.saved || analytics.saves || 0

        // Per-platform aggregation
        const provider = post.provider
        if (!platformEngagement[provider]) {
          platformEngagement[provider] = {
            posts: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            reach: 0,
            impressions: 0,
            saves: 0,
          }
        }
        platformEngagement[provider].posts++
        platformEngagement[provider].likes += analytics.likes || 0
        platformEngagement[provider].comments += analytics.comments || 0
        platformEngagement[provider].shares += analytics.shares || 0
        platformEngagement[provider].reach += analytics.reach || 0
        platformEngagement[provider].impressions += analytics.impressions || 0
        platformEngagement[provider].saves += analytics.saved || analytics.saves || 0
      }
    }

    // Calculate average engagement rate
    const totalEngagement = totalLikes + totalComments + totalShares + totalSaves
    const avgEngagementRate = totalReach > 0
      ? ((totalEngagement / totalReach) * 100).toFixed(2)
      : null

    return NextResponse.json({
      totalPosts,
      postsThisWeek,
      postsInRange,
      deletedPosts,
      queuedPosts,
      failedPosts,
      aiGenerated,
      platformStats,
      timeRange: days,
      // Engagement metrics
      engagement: {
        totalLikes,
        totalComments,
        totalShares,
        totalSaves,
        totalReach,
        totalImpressions,
        avgEngagementRate,
        postsWithMetrics,
      },
      platformEngagement,
    })
  } catch (error) {
    console.error('[Analytics Stats Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    )
  }
}
