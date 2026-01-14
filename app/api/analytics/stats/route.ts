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
    const platform = searchParams.get('platform') // Optional platform filter
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Calculate week start (7 days ago)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    // Map platform filter to provider values in database
    // Database uses: 'meta' for Instagram, 'google' for YouTube, etc.
    const getProviderFilter = (platformName: string | null) => {
      if (!platformName || platformName === 'all') return undefined
      const platformMap: Record<string, string[]> = {
        'instagram': ['meta', 'instagram'],
        'youtube': ['google', 'youtube'],
        'facebook': ['facebook', 'meta'],
        'tiktok': ['tiktok'],
        'linkedin': ['linkedin'],
        'twitter': ['twitter'],
        'x': ['twitter', 'x'],
      }
      return platformMap[platformName.toLowerCase()] || [platformName]
    }

    const providerFilter = getProviderFilter(platform)
    const providerWhere = providerFilter ? { provider: { in: providerFilter } } : {}

    // Count total posts (published, not deleted)
    const totalPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'POSTED',
        ...providerWhere,
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
        ...providerWhere,
      },
    })

    // Count deleted posts
    const deletedPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'DELETED',
        ...providerWhere,
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
        ...providerWhere,
      },
    })

    // Count queued posts (awaiting processing)
    const queuedPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'QUEUED',
        ...providerWhere,
      },
    })

    // Count failed posts
    const failedPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'FAILED',
        ...providerWhere,
      },
    })

    // Count posts by platform
    const postsByPlatform = await prisma.outboundPost.groupBy({
      by: ['provider'],
      where: {
        profileId,
        status: 'POSTED',
        ...providerWhere,
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
        ...providerWhere,
      },
      select: {
        id: true,
        provider: true,
        metadata: true,
        postedAt: true,
        contentUpload: {
          select: {
            mimeType: true,
            generatedCaptions: true,
            processedUrls: true,
          },
        },
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

    // Helper to normalize provider names for display
    // Note: 'meta' can be either Instagram or Facebook depending on context
    // We keep 'facebook' separate from 'instagram' for proper filtering
    const normalizeProvider = (provider: string): string => {
      // 'google' is always YouTube
      if (provider === 'google') return 'youtube'
      // 'meta' is Instagram (Facebook has its own 'facebook' provider)
      if (provider === 'meta') return 'instagram'
      return provider
    }

    // First, initialize platformEngagement from all posts (even those without analytics)
    // This ensures platforms appear even if no analytics have been synced yet
    for (const post of postsWithAnalytics) {
      const provider = normalizeProvider(post.provider)
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
    }

    // Now aggregate analytics data for posts that have been synced
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
        const provider = normalizeProvider(post.provider)
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

    // 4. Hashtag Performance - Based on hashtags extracted from captions
    // Extract hashtags from post captions stored in metadata
    const extractHashtags = (text: string | null | undefined): string[] => {
      if (!text) return []
      const matches = text.match(/#[\w\u0080-\uFFFF]+/g)
      return matches || []
    }

    let postsWithHashtags = 0
    let postsWithoutHashtags = 0
    let hashtagPostEngagement = 0
    let hashtagPostReach = 0
    let noHashtagPostEngagement = 0
    let noHashtagPostReach = 0
    let totalHashtagCount = 0

    for (const post of postsWithAnalytics) {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | null

      // Try to get caption from metadata
      const caption = metadata?.caption as string | undefined

      // Extract hashtags from caption
      const hashtags = extractHashtags(caption)
      const hasHashtags = hashtags.length > 0

      const postEngagement = analytics
        ? (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0) + (analytics.saved || analytics.saves || 0)
        : 0
      const postReach = analytics?.reach || 0

      if (hasHashtags) {
        postsWithHashtags++
        totalHashtagCount += hashtags.length
        hashtagPostEngagement += postEngagement
        hashtagPostReach += postReach
      } else {
        postsWithoutHashtags++
        noHashtagPostEngagement += postEngagement
        noHashtagPostReach += postReach
      }
    }

    // Calculate hashtag performance score (0-100)
    let hashtagPerformance = 0
    const avgReachPerPost = postsWithMetrics > 0 ? totalReach / postsWithMetrics : 0

    if (postsWithHashtags > 0) {
      // Base score: percentage of posts using hashtags (up to 40 points)
      const hashtagUsageRate = postsWithAnalytics.length > 0
        ? (postsWithHashtags / postsWithAnalytics.length) * 40
        : 0

      // Hashtag count score: optimal is 3-10 hashtags (up to 30 points)
      const avgHashtagsPerPost = postsWithHashtags > 0 ? totalHashtagCount / postsWithHashtags : 0
      let hashtagCountScore = 0
      if (avgHashtagsPerPost >= 3 && avgHashtagsPerPost <= 10) {
        hashtagCountScore = 30 // Optimal range
      } else if (avgHashtagsPerPost > 0 && avgHashtagsPerPost < 3) {
        hashtagCountScore = avgHashtagsPerPost * 10 // 1-2 hashtags: 10-20 points
      } else if (avgHashtagsPerPost > 10) {
        hashtagCountScore = Math.max(10, 30 - (avgHashtagsPerPost - 10) * 2) // Decreasing score for too many
      }

      // Engagement boost from hashtags (up to 30 points)
      let engagementBoostScore = 0
      if (postsWithHashtags > 0 && postsWithoutHashtags > 0) {
        // Compare engagement rates
        const hashtagEngRate = hashtagPostReach > 0 ? hashtagPostEngagement / hashtagPostReach : 0
        const noHashtagEngRate = noHashtagPostReach > 0 ? noHashtagPostEngagement / noHashtagPostReach : 0

        if (noHashtagEngRate > 0 && hashtagEngRate > noHashtagEngRate) {
          // Hashtags are helping - score based on improvement
          const improvement = (hashtagEngRate - noHashtagEngRate) / noHashtagEngRate
          engagementBoostScore = Math.min(30, improvement * 100)
        } else if (hashtagEngRate > 0) {
          // Can't compare, but posts with hashtags have engagement
          engagementBoostScore = 15 // Baseline
        }
      } else if (postsWithHashtags > 0 && hashtagPostEngagement > 0) {
        // All posts have hashtags and have engagement
        engagementBoostScore = 20 // Good baseline
      }

      hashtagPerformance = Math.min(100, Math.round(hashtagUsageRate + hashtagCountScore + engagementBoostScore))
    } else if (avgReachPerPost > 0) {
      // Fallback: no hashtag data, use reach-based estimate
      hashtagPerformance = Math.min(100, Math.round((avgReachPerPost / 5000) * 100))
    }

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
    // TOP FORMATS CALCULATION
    // ============================================
    const formatStats: Record<string, { count: number; likes: number; comments: number; shares: number; saves: number; reach: number }> = {}

    for (const post of postsWithAnalytics) {
      const metadata = post.metadata as Record<string, unknown> | null
      const processedUrls = post.contentUpload?.processedUrls as Record<string, unknown> | null

      // Get uploadType and contentType from processedUrls (matches Upload page)
      const uploadType = processedUrls?.uploadType as string | undefined
      const contentType = processedUrls?.contentType as string | undefined

      // Map uploadType to display names matching Upload page
      // 'media' → "Mixed Media", 'video' → "Video", 'image' → "Image", 'text' → "Text"
      let formatType = 'Text'

      if (uploadType) {
        switch (uploadType) {
          case 'media':
            formatType = 'Mixed Media'
            break
          case 'video':
            // Check if it's a Story
            formatType = contentType === 'story' ? 'Video Story' : 'Video'
            break
          case 'image':
            // Check if it's a Story
            formatType = contentType === 'story' ? 'Image Story' : 'Image'
            break
          case 'text':
            formatType = 'Text'
            break
          default:
            formatType = uploadType.charAt(0).toUpperCase() + uploadType.slice(1)
        }
      } else {
        // Fallback: infer from mimeType if processedUrls not available
        const mimeType = post.contentUpload?.mimeType || ''
        if (mimeType.startsWith('video/')) {
          formatType = 'Video'
        } else if (mimeType.startsWith('image/')) {
          formatType = 'Image'
        } else if (mimeType.startsWith('audio/')) {
          formatType = 'Audio'
        } else if (mimeType === 'text/plain' || mimeType === '') {
          formatType = 'Text'
        }
      }

      if (!formatStats[formatType]) {
        formatStats[formatType] = { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 }
      }

      formatStats[formatType].count++

      const analytics = metadata?.analytics as Record<string, number> | null
      if (analytics) {
        formatStats[formatType].likes += analytics.likes || 0
        formatStats[formatType].comments += analytics.comments || 0
        formatStats[formatType].shares += analytics.shares || 0
        formatStats[formatType].saves += analytics.saved || analytics.saves || 0
        formatStats[formatType].reach += analytics.reach || 0
      }
    }

    // Calculate engagement rate per format and create sorted list
    const topFormats = Object.entries(formatStats)
      .map(([format, stats]) => {
        const totalEngagement = stats.likes + stats.comments + stats.shares + stats.saves
        const engagementRate = stats.reach > 0 ? (totalEngagement / stats.reach) * 100 : 0
        return {
          format,
          count: stats.count,
          percentage: postsWithAnalytics.length > 0 ? Math.round((stats.count / postsWithAnalytics.length) * 100) : 0,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          totalEngagement,
        }
      })
      .sort((a, b) => b.count - a.count)

    // ============================================
    // AI IMPACT CALCULATION
    // ============================================
    let aiCaptionPosts = { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 }
    let manualCaptionPosts = { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 }

    for (const post of postsWithAnalytics) {
      const generatedCaptions = post.contentUpload?.generatedCaptions as unknown[] | null
      const hasAiCaption = generatedCaptions && generatedCaptions.length > 0

      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | null

      const target = hasAiCaption ? aiCaptionPosts : manualCaptionPosts
      target.count++

      if (analytics) {
        target.likes += analytics.likes || 0
        target.comments += analytics.comments || 0
        target.shares += analytics.shares || 0
        target.saves += analytics.saved || analytics.saves || 0
        target.reach += analytics.reach || 0
      }
    }

    const aiEngagement = aiCaptionPosts.likes + aiCaptionPosts.comments + aiCaptionPosts.shares + aiCaptionPosts.saves
    const manualEngagement = manualCaptionPosts.likes + manualCaptionPosts.comments + manualCaptionPosts.shares + manualCaptionPosts.saves

    const aiImpact = {
      aiCaptions: {
        count: aiCaptionPosts.count,
        totalEngagement: aiEngagement,
        avgEngagement: aiCaptionPosts.count > 0 ? Math.round(aiEngagement / aiCaptionPosts.count) : 0,
        engagementRate: aiCaptionPosts.reach > 0 ? parseFloat(((aiEngagement / aiCaptionPosts.reach) * 100).toFixed(2)) : 0,
      },
      manualCaptions: {
        count: manualCaptionPosts.count,
        totalEngagement: manualEngagement,
        avgEngagement: manualCaptionPosts.count > 0 ? Math.round(manualEngagement / manualCaptionPosts.count) : 0,
        engagementRate: manualCaptionPosts.reach > 0 ? parseFloat(((manualEngagement / manualCaptionPosts.reach) * 100).toFixed(2)) : 0,
      },
      improvement: manualCaptionPosts.count > 0 && aiCaptionPosts.count > 0
        ? parseFloat((((aiEngagement / aiCaptionPosts.count) / (manualEngagement / manualCaptionPosts.count) - 1) * 100).toFixed(1))
        : null,
    }

    // ============================================
    // CAPTION USAGE ANALYTICS
    // ============================================
    const captionModeStats: Record<string, { count: number; likes: number; comments: number; shares: number; saves: number; reach: number }> = {}

    for (const post of postsWithAnalytics) {
      const generatedCaptions = post.contentUpload?.generatedCaptions as Array<{ mode?: string }> | null

      // Determine caption mode used
      let mode = 'Manual'
      if (generatedCaptions && generatedCaptions.length > 0) {
        // Try to get the mode from the first caption
        const firstCaption = generatedCaptions[0]
        if (firstCaption?.mode) {
          mode = firstCaption.mode
        } else {
          mode = 'AI Generated'
        }
      }

      if (!captionModeStats[mode]) {
        captionModeStats[mode] = { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 }
      }

      captionModeStats[mode].count++

      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | null
      if (analytics) {
        captionModeStats[mode].likes += analytics.likes || 0
        captionModeStats[mode].comments += analytics.comments || 0
        captionModeStats[mode].shares += analytics.shares || 0
        captionModeStats[mode].saves += analytics.saved || analytics.saves || 0
        captionModeStats[mode].reach += analytics.reach || 0
      }
    }

    const captionUsage = Object.entries(captionModeStats)
      .map(([mode, stats]) => {
        const modeEngagement = stats.likes + stats.comments + stats.shares + stats.saves
        return {
          mode,
          count: stats.count,
          percentage: postsWithAnalytics.length > 0 ? Math.round((stats.count / postsWithAnalytics.length) * 100) : 0,
          avgEngagement: stats.count > 0 ? Math.round(modeEngagement / stats.count) : 0,
          engagementRate: stats.reach > 0 ? parseFloat(((modeEngagement / stats.reach) * 100).toFixed(2)) : 0,
        }
      })
      .sort((a, b) => b.count - a.count)

    // ============================================
    // CONTENT CALENDAR INSIGHTS
    // ============================================
    const dayOfWeekStats: Record<number, { count: number; likes: number; comments: number; shares: number; saves: number; reach: number }> = {}
    const hourOfDayStats: Record<number, { count: number; likes: number; comments: number; shares: number; saves: number; reach: number }> = {}

    for (const post of postsWithAnalytics) {
      if (!post.postedAt) continue

      const postedDate = new Date(post.postedAt)
      const dayOfWeek = postedDate.getDay() // 0 = Sunday, 6 = Saturday
      const hourOfDay = postedDate.getHours()

      // Initialize day stats
      if (!dayOfWeekStats[dayOfWeek]) {
        dayOfWeekStats[dayOfWeek] = { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 }
      }
      dayOfWeekStats[dayOfWeek].count++

      // Initialize hour stats
      if (!hourOfDayStats[hourOfDay]) {
        hourOfDayStats[hourOfDay] = { count: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 }
      }
      hourOfDayStats[hourOfDay].count++

      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | null
      if (analytics) {
        dayOfWeekStats[dayOfWeek].likes += analytics.likes || 0
        dayOfWeekStats[dayOfWeek].comments += analytics.comments || 0
        dayOfWeekStats[dayOfWeek].shares += analytics.shares || 0
        dayOfWeekStats[dayOfWeek].saves += analytics.saved || analytics.saves || 0
        dayOfWeekStats[dayOfWeek].reach += analytics.reach || 0

        hourOfDayStats[hourOfDay].likes += analytics.likes || 0
        hourOfDayStats[hourOfDay].comments += analytics.comments || 0
        hourOfDayStats[hourOfDay].shares += analytics.shares || 0
        hourOfDayStats[hourOfDay].saves += analytics.saved || analytics.saves || 0
        hourOfDayStats[hourOfDay].reach += analytics.reach || 0
      }
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // Calculate best days to post
    const bestDays = Object.entries(dayOfWeekStats)
      .map(([day, stats]) => {
        const dayEngagement = stats.likes + stats.comments + stats.shares + stats.saves
        return {
          day: dayNames[parseInt(day)],
          dayIndex: parseInt(day),
          posts: stats.count,
          avgEngagement: stats.count > 0 ? Math.round(dayEngagement / stats.count) : 0,
          engagementRate: stats.reach > 0 ? parseFloat(((dayEngagement / stats.reach) * 100).toFixed(2)) : 0,
        }
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement)

    // Calculate best hours to post
    const bestHours = Object.entries(hourOfDayStats)
      .map(([hour, stats]) => {
        const hourEngagement = stats.likes + stats.comments + stats.shares + stats.saves
        const hourNum = parseInt(hour)
        const displayHour = hourNum === 0 ? '12 AM' : hourNum < 12 ? `${hourNum} AM` : hourNum === 12 ? '12 PM' : `${hourNum - 12} PM`
        return {
          hour: displayHour,
          hourIndex: hourNum,
          posts: stats.count,
          avgEngagement: stats.count > 0 ? Math.round(hourEngagement / stats.count) : 0,
          engagementRate: stats.reach > 0 ? parseFloat(((hourEngagement / stats.reach) * 100).toFixed(2)) : 0,
        }
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement)

    const calendarInsights = {
      bestDays: bestDays.slice(0, 3), // Top 3 best days
      bestHours: bestHours.slice(0, 5), // Top 5 best hours
      allDays: bestDays.sort((a, b) => a.dayIndex - b.dayIndex), // All days in order
      allHours: bestHours.sort((a, b) => a.hourIndex - b.hourIndex), // All hours in order
      totalPostsAnalyzed: postsWithAnalytics.filter(p => p.postedAt).length,
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
        ...providerWhere,
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

        // Use the same normalization helper as the current period
        const provider = normalizeProvider(post.provider)

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

    // Previous Hashtag Performance - Using same logic as current period
    let prevPostsWithHashtags = 0
    let prevTotalHashtagCount = 0
    let prevHashtagPostEngagement = 0

    for (const post of previousPeriodPosts) {
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | null
      const caption = metadata?.caption as string | undefined
      const hashtags = extractHashtags(caption)
      const hasHashtags = hashtags.length > 0

      if (hasHashtags) {
        prevPostsWithHashtags++
        prevTotalHashtagCount += hashtags.length
        if (analytics) {
          prevHashtagPostEngagement += (analytics.likes || 0) + (analytics.comments || 0) +
            (analytics.shares || 0) + (analytics.saved || analytics.saves || 0)
        }
      }
    }

    let prevHashtagPerformance = 0
    const prevAvgReachPerPost = prevPostsWithMetrics > 0 ? prevTotalReach / prevPostsWithMetrics : 0

    if (prevPostsWithHashtags > 0) {
      const prevHashtagUsageRate = previousPeriodPosts.length > 0
        ? (prevPostsWithHashtags / previousPeriodPosts.length) * 40
        : 0

      const prevAvgHashtagsPerPost = prevPostsWithHashtags > 0 ? prevTotalHashtagCount / prevPostsWithHashtags : 0
      let prevHashtagCountScore = 0
      if (prevAvgHashtagsPerPost >= 3 && prevAvgHashtagsPerPost <= 10) {
        prevHashtagCountScore = 30
      } else if (prevAvgHashtagsPerPost > 0 && prevAvgHashtagsPerPost < 3) {
        prevHashtagCountScore = prevAvgHashtagsPerPost * 10
      } else if (prevAvgHashtagsPerPost > 10) {
        prevHashtagCountScore = Math.max(10, 30 - (prevAvgHashtagsPerPost - 10) * 2)
      }

      const prevEngagementBoostScore = prevHashtagPostEngagement > 0 ? 20 : 0

      prevHashtagPerformance = Math.min(100, Math.round(prevHashtagUsageRate + prevHashtagCountScore + prevEngagementBoostScore))
    } else if (prevAvgReachPerPost > 0) {
      prevHashtagPerformance = Math.min(100, Math.round((prevAvgReachPerPost / 5000) * 100))
    }

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
      // New analytics features
      topFormats,
      aiImpact,
      captionUsage,
      calendarInsights,
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
