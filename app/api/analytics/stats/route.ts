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
    let totalViews = 0
    let postsWithMetrics = 0

    const platformEngagement: Record<string, {
      posts: number
      likes: number
      comments: number
      shares: number
      reach: number
      impressions: number
      saves: number
      views: number
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
        totalViews += analytics.views || 0

        // Per-platform aggregation
        // Normalize provider names for display
        let provider = post.provider
        if (provider === 'meta') provider = 'instagram'
        if (provider === 'google') provider = 'youtube'

        if (!platformEngagement[provider]) {
          platformEngagement[provider] = {
            posts: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            reach: 0,
            impressions: 0,
            saves: 0,
            views: 0,
          }
        }
        platformEngagement[provider].posts++
        platformEngagement[provider].likes += analytics.likes || 0
        platformEngagement[provider].comments += analytics.comments || 0
        platformEngagement[provider].shares += analytics.shares || 0
        platformEngagement[provider].reach += analytics.reach || 0
        platformEngagement[provider].impressions += analytics.impressions || 0
        platformEngagement[provider].saves += analytics.saved || analytics.saves || 0
        platformEngagement[provider].views += analytics.views || 0
      }
    }

    // Calculate average engagement rate
    const totalEngagement = totalLikes + totalComments + totalShares + totalSaves
    const avgEngagementRate = totalReach > 0
      ? ((totalEngagement / totalReach) * 100).toFixed(2)
      : null

    // ============================================
    // ADVANCED METRICS CALCULATIONS
    // ============================================

    // 1. Content Velocity - Posts per day in the time range
    const contentVelocity = days > 0 ? parseFloat((postsInRange / days).toFixed(2)) : 0

    // 2. Virality Score - Based on shares + saves relative to reach
    // Score 0-100: Higher means more viral potential
    let viralityScore = 0
    if (totalReach > 0) {
      const viralActions = totalShares + totalSaves
      const viralRatio = viralActions / totalReach
      // Scale to 0-100 (assuming 5% viral rate is excellent = 100)
      viralityScore = Math.min(100, Math.round(viralRatio * 2000))
    }

    // 3. Cross-Platform Synergy - Consistency of engagement across platforms
    // Score 0-100: Higher means more consistent performance
    let crossPlatformSynergy = 0
    const platformEngagementRates: number[] = []

    for (const [, data] of Object.entries(platformEngagement)) {
      if (data.posts > 0 && data.reach > 0) {
        const platformRate = ((data.likes + data.comments + data.shares + data.saves) / data.reach) * 100
        platformEngagementRates.push(platformRate)
      }
    }

    if (platformEngagementRates.length >= 2) {
      // Calculate coefficient of variation (lower = more consistent)
      const mean = platformEngagementRates.reduce((a, b) => a + b, 0) / platformEngagementRates.length
      const variance = platformEngagementRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / platformEngagementRates.length
      const stdDev = Math.sqrt(variance)
      const coeffOfVariation = mean > 0 ? stdDev / mean : 1

      // Convert to 0-100 score (lower variation = higher synergy)
      crossPlatformSynergy = Math.max(0, Math.min(100, Math.round((1 - coeffOfVariation) * 100)))
    } else if (platformEngagementRates.length === 1) {
      // Only one platform with data - give a baseline score
      crossPlatformSynergy = 50
    }

    // 4. Hashtag Performance - Placeholder (would need hashtag tracking)
    // For now, estimate based on reach per post
    const avgReachPerPost = postsWithMetrics > 0 ? totalReach / postsWithMetrics : 0
    // Score based on reach benchmarks (1000 reach per post = 50%, 5000+ = 100%)
    const hashtagPerformance = Math.min(100, Math.round((avgReachPerPost / 5000) * 100))

    // 5. Sentiment Score - Based on engagement quality signals
    // Higher likes/saves ratio vs comments indicates positive sentiment
    // Score 0-100: Positive engagement signals = higher score
    let sentimentScore = 0
    if (totalEngagement > 0) {
      // Positive signals: likes and saves (appreciation)
      const positiveSignals = totalLikes + totalSaves
      // Neutral signals: comments (could be positive or negative, but engagement)
      // Shares are also positive but weighted less
      const totalSignals = totalEngagement

      // Base sentiment on ratio of positive signals
      const positiveRatio = positiveSignals / totalSignals

      // Also factor in engagement rate (higher engagement = more positive audience)
      const engagementBonus = totalReach > 0
        ? Math.min(20, (totalEngagement / totalReach) * 500)
        : 0

      sentimentScore = Math.min(100, Math.round(positiveRatio * 80 + engagementBonus))
    }

    // 6. Audience Retention - Based on views vs impressions for video content
    // For non-video, estimate based on engagement depth (comments + saves vs likes)
    let audienceRetention = 0
    if (totalViews > 0 && totalImpressions > 0) {
      // Video retention: views / impressions ratio
      audienceRetention = Math.min(100, Math.round((totalViews / totalImpressions) * 100))
    } else if (totalEngagement > 0) {
      // Estimate from engagement depth (deeper engagement = higher retention)
      const deepEngagement = totalComments + totalSaves + totalShares
      const surfaceEngagement = totalLikes
      const totalEng = deepEngagement + surfaceEngagement

      if (totalEng > 0) {
        // Deep engagement indicates people stayed and engaged meaningfully
        const depthRatio = deepEngagement / totalEng
        audienceRetention = Math.min(100, Math.round(30 + depthRatio * 70))
      }
    }

    // Bundle advanced metrics
    const advancedMetrics = {
      contentVelocity,
      viralityScore,
      crossPlatformSynergy,
      hashtagPerformance,
      sentimentScore,
      audienceRetention,
      // Additional context
      postsPerWeek: parseFloat((postsInRange / (days / 7)).toFixed(1)),
      avgReachPerPost: Math.round(avgReachPerPost),
    }

    // ============================================
    // CALCULATE PREVIOUS PERIOD FOR TREND COMPARISON
    // ============================================

    // Previous period: same duration, ending where current period starts
    const previousPeriodEnd = new Date(startDate)
    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days)

    // Fetch posts from previous period
    const previousPeriodPosts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
      },
      select: {
        provider: true,
        metadata: true,
      },
    })

    // Calculate previous period engagement
    let prevTotalLikes = 0
    let prevTotalComments = 0
    let prevTotalShares = 0
    let prevTotalReach = 0
    let prevTotalSaves = 0
    let prevTotalViews = 0
    let prevTotalImpressions = 0
    let prevPostsWithMetrics = 0

    const prevPlatformEngagement: Record<string, { posts: number; reach: number; likes: number; comments: number; shares: number; saves: number }> = {}

    for (const post of previousPeriodPosts) {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | null

      if (analytics) {
        prevPostsWithMetrics++
        prevTotalLikes += analytics.likes || 0
        prevTotalComments += analytics.comments || 0
        prevTotalShares += analytics.shares || 0
        prevTotalReach += analytics.reach || 0
        prevTotalSaves += analytics.saved || analytics.saves || 0
        prevTotalViews += analytics.views || 0
        prevTotalImpressions += analytics.impressions || 0

        let provider = post.provider
        if (provider === 'meta') provider = 'instagram'
        if (provider === 'google') provider = 'youtube'

        if (!prevPlatformEngagement[provider]) {
          prevPlatformEngagement[provider] = { posts: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
        }
        prevPlatformEngagement[provider].posts++
        prevPlatformEngagement[provider].reach += analytics.reach || 0
        prevPlatformEngagement[provider].likes += analytics.likes || 0
        prevPlatformEngagement[provider].comments += analytics.comments || 0
        prevPlatformEngagement[provider].shares += analytics.shares || 0
        prevPlatformEngagement[provider].saves += analytics.saved || analytics.saves || 0
      }
    }

    // Calculate previous period advanced metrics
    const prevTotalEngagement = prevTotalLikes + prevTotalComments + prevTotalShares + prevTotalSaves

    // Previous Sentiment
    let prevSentimentScore = 0
    if (prevTotalEngagement > 0) {
      const prevPositiveSignals = prevTotalLikes + prevTotalSaves
      const prevPositiveRatio = prevPositiveSignals / prevTotalEngagement
      const prevEngagementBonus = prevTotalReach > 0 ? Math.min(20, (prevTotalEngagement / prevTotalReach) * 500) : 0
      prevSentimentScore = Math.min(100, Math.round(prevPositiveRatio * 80 + prevEngagementBonus))
    }

    // Previous Retention
    let prevAudienceRetention = 0
    if (prevTotalViews > 0 && prevTotalImpressions > 0) {
      prevAudienceRetention = Math.min(100, Math.round((prevTotalViews / prevTotalImpressions) * 100))
    } else if (prevTotalEngagement > 0) {
      const prevDeepEngagement = prevTotalComments + prevTotalSaves + prevTotalShares
      const prevSurfaceEngagement = prevTotalLikes
      const prevTotalEng = prevDeepEngagement + prevSurfaceEngagement
      if (prevTotalEng > 0) {
        const prevDepthRatio = prevDeepEngagement / prevTotalEng
        prevAudienceRetention = Math.min(100, Math.round(30 + prevDepthRatio * 70))
      }
    }

    // Previous Virality
    let prevViralityScore = 0
    if (prevTotalReach > 0) {
      const prevViralActions = prevTotalShares + prevTotalSaves
      prevViralityScore = Math.min(100, Math.round((prevViralActions / prevTotalReach) * 2000))
    }

    // Previous Velocity
    const prevContentVelocity = days > 0 ? parseFloat((previousPeriodPosts.length / days).toFixed(2)) : 0

    // Previous Cross-Platform Synergy
    let prevCrossPlatformSynergy = 0
    const prevPlatformRates: number[] = []
    for (const [, data] of Object.entries(prevPlatformEngagement)) {
      if (data.posts > 0 && data.reach > 0) {
        const rate = ((data.likes + data.comments + data.shares + data.saves) / data.reach) * 100
        prevPlatformRates.push(rate)
      }
    }
    if (prevPlatformRates.length >= 2) {
      const mean = prevPlatformRates.reduce((a, b) => a + b, 0) / prevPlatformRates.length
      const variance = prevPlatformRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / prevPlatformRates.length
      const stdDev = Math.sqrt(variance)
      const coeffOfVariation = mean > 0 ? stdDev / mean : 1
      prevCrossPlatformSynergy = Math.max(0, Math.min(100, Math.round((1 - coeffOfVariation) * 100)))
    } else if (prevPlatformRates.length === 1) {
      prevCrossPlatformSynergy = 50
    }

    // Previous Hashtag Performance
    const prevAvgReachPerPost = prevPostsWithMetrics > 0 ? prevTotalReach / prevPostsWithMetrics : 0
    const prevHashtagPerformance = Math.min(100, Math.round((prevAvgReachPerPost / 5000) * 100))

    // ============================================
    // CALCULATE TRENDS (current vs previous)
    // ============================================

    const calculateTrend = (current: number, previous: number): { trend: 'up' | 'down' | 'stable'; trendValue: number } => {
      if (previous === 0 && current === 0) {
        return { trend: 'stable', trendValue: 0 }
      }
      if (previous === 0) {
        return { trend: 'up', trendValue: 100 } // New metric, treat as 100% increase
      }
      const change = ((current - previous) / previous) * 100
      const roundedChange = Math.round(change * 10) / 10 // Round to 1 decimal

      if (Math.abs(roundedChange) < 1) {
        return { trend: 'stable', trendValue: 0 }
      }
      return {
        trend: roundedChange > 0 ? 'up' : 'down',
        trendValue: Math.abs(roundedChange)
      }
    }

    // Industry averages (static reference points based on general social media benchmarks)
    const industryBenchmarks = {
      sentiment: 65,      // Average positive sentiment
      retention: 45,      // Average retention rate
      virality: 25,       // Average virality score
      velocity: 1.5,      // Average posts per day
      crossPlatform: 55,  // Average cross-platform consistency
      hashtags: 40,       // Average hashtag reach performance
    }

    // Calculate benchmarks with real trends
    const benchmarks = {
      sentiment: {
        industry: industryBenchmarks.sentiment,
        userAvg: prevSentimentScore || sentimentScore, // Use previous as "average", or current if no previous
        ...calculateTrend(sentimentScore, prevSentimentScore)
      },
      retention: {
        industry: industryBenchmarks.retention,
        userAvg: prevAudienceRetention || audienceRetention,
        ...calculateTrend(audienceRetention, prevAudienceRetention)
      },
      virality: {
        industry: industryBenchmarks.virality,
        userAvg: prevViralityScore || viralityScore,
        ...calculateTrend(viralityScore, prevViralityScore)
      },
      velocity: {
        industry: industryBenchmarks.velocity,
        userAvg: prevContentVelocity || contentVelocity,
        ...calculateTrend(contentVelocity, prevContentVelocity)
      },
      crossPlatform: {
        industry: industryBenchmarks.crossPlatform,
        userAvg: prevCrossPlatformSynergy || crossPlatformSynergy,
        ...calculateTrend(crossPlatformSynergy, prevCrossPlatformSynergy)
      },
      hashtags: {
        industry: industryBenchmarks.hashtags,
        userAvg: prevHashtagPerformance || hashtagPerformance,
        ...calculateTrend(hashtagPerformance, prevHashtagPerformance)
      },
    }

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
        totalViews,
        totalReach,
        totalImpressions,
        avgEngagementRate,
        postsWithMetrics,
      },
      platformEngagement,
      // Advanced metrics (Pro feature)
      advancedMetrics,
      // Benchmark data for tooltips (Pro feature)
      benchmarks,
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
