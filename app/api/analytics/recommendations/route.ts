/**
 * GET /api/analytics/recommendations
 *
 * Generate AI-powered recommendations based on user's analytics data
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

export const runtime = 'nodejs'

interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  icon: string
  category: 'content' | 'timing' | 'engagement' | 'growth'
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get user's posts from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { postedAt: 'desc' },
    })

    // Analyze platform distribution
    const platformCounts: Record<string, number> = {}
    const platformEngagement: Record<string, { likes: number; comments: number; reach: number; posts: number }> = {}

    for (const post of posts) {
      const platform = post.provider === 'meta' ? 'instagram' : post.provider === 'google' ? 'youtube' : post.provider
      platformCounts[platform] = (platformCounts[platform] || 0) + 1

      // Get engagement from metadata if available
      const metadata = post.metadata as Record<string, unknown> | null
      const analytics = metadata?.analytics as Record<string, number> | undefined

      if (!platformEngagement[platform]) {
        platformEngagement[platform] = { likes: 0, comments: 0, reach: 0, posts: 0 }
      }
      platformEngagement[platform].posts++

      if (analytics) {
        platformEngagement[platform].likes += analytics.likes || 0
        platformEngagement[platform].comments += analytics.comments || 0
        platformEngagement[platform].reach += analytics.reach || analytics.impressions || 0
      }
    }

    // Analyze posting times
    const postingHours: Record<number, number> = {}
    const postingDays: Record<number, number> = {}

    for (const post of posts) {
      if (post.postedAt) {
        const hour = post.postedAt.getHours()
        const day = post.postedAt.getDay()
        postingHours[hour] = (postingHours[hour] || 0) + 1
        postingDays[day] = (postingDays[day] || 0) + 1
      }
    }

    // Generate recommendations based on analysis
    const recommendations: Recommendation[] = []
    let recommendationId = 1

    // Check posting frequency
    const postsPerWeek = posts.length / 4 // Last 30 days ≈ 4 weeks
    if (postsPerWeek < 3) {
      recommendations.push({
        id: String(recommendationId++),
        title: 'Increase Posting Frequency',
        description: `You're posting ${postsPerWeek.toFixed(1)} times per week. Accounts posting 5+ times per week typically see 2x more engagement. Try scheduling more content.`,
        impact: 'high',
        icon: '📈',
        category: 'growth'
      })
    }

    // Check platform diversity
    const platformCount = Object.keys(platformCounts).length
    if (platformCount < 3 && posts.length > 5) {
      const missingPlatforms = ['instagram', 'tiktok', 'linkedin', 'youtube', 'twitter']
        .filter(p => !platformCounts[p])
        .slice(0, 2)

      if (missingPlatforms.length > 0) {
        recommendations.push({
          id: String(recommendationId++),
          title: 'Expand to More Platforms',
          description: `You're only active on ${platformCount} platform${platformCount > 1 ? 's' : ''}. Consider expanding to ${missingPlatforms.join(' and ')} to reach new audiences.`,
          impact: 'medium',
          icon: '🌐',
          category: 'growth'
        })
      }
    }

    // Check for best performing platform
    let bestPlatform = ''
    let bestEngagementRate = 0
    let worstPlatform = ''
    let worstEngagementRate = Infinity

    for (const [platform, data] of Object.entries(platformEngagement)) {
      if (data.reach > 0) {
        const engagementRate = ((data.likes + data.comments) / data.reach) * 100
        if (engagementRate > bestEngagementRate) {
          bestEngagementRate = engagementRate
          bestPlatform = platform
        }
        if (engagementRate < worstEngagementRate && data.posts >= 3) {
          worstEngagementRate = engagementRate
          worstPlatform = platform
        }
      }
    }

    if (bestPlatform && bestEngagementRate > 0) {
      const platformName = bestPlatform.charAt(0).toUpperCase() + bestPlatform.slice(1)
      recommendations.push({
        id: String(recommendationId++),
        title: `Double Down on ${platformName}`,
        description: `Your ${platformName} content has ${bestEngagementRate.toFixed(1)}% engagement rate - your best performing platform. Consider posting more frequently here.`,
        impact: 'high',
        icon: '🎯',
        category: 'content'
      })
    }

    if (worstPlatform && worstPlatform !== bestPlatform && worstEngagementRate < Infinity) {
      const platformName = worstPlatform.charAt(0).toUpperCase() + worstPlatform.slice(1)
      recommendations.push({
        id: String(recommendationId++),
        title: `Improve ${platformName} Strategy`,
        description: `Your ${platformName} engagement is lower than other platforms. Try different content formats or posting times to boost performance.`,
        impact: 'medium',
        icon: '🔄',
        category: 'content'
      })
    }

    // Check posting time patterns
    const peakHours = Object.entries(postingHours)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    const morningPosts = Object.entries(postingHours)
      .filter(([hour]) => parseInt(hour) >= 6 && parseInt(hour) <= 11)
      .reduce((sum, [, count]) => sum + count, 0)

    const eveningPosts = Object.entries(postingHours)
      .filter(([hour]) => parseInt(hour) >= 17 && parseInt(hour) <= 21)
      .reduce((sum, [, count]) => sum + count, 0)

    if (morningPosts === 0 && posts.length > 5) {
      recommendations.push({
        id: String(recommendationId++),
        title: 'Try Morning Posts',
        description: 'You haven\'t posted in the morning (6-11 AM). Morning posts often catch users during their commute and can boost reach by 20-30%.',
        impact: 'medium',
        icon: '🌅',
        category: 'timing'
      })
    }

    if (eveningPosts === 0 && posts.length > 5) {
      recommendations.push({
        id: String(recommendationId++),
        title: 'Post During Peak Hours',
        description: 'Consider posting between 5-9 PM when most users are active. This is typically the highest engagement window.',
        impact: 'medium',
        icon: '⏰',
        category: 'timing'
      })
    }

    // Check engagement response
    const totalComments = Object.values(platformEngagement).reduce((sum, d) => sum + d.comments, 0)
    const totalLikes = Object.values(platformEngagement).reduce((sum, d) => sum + d.likes, 0)

    if (totalComments > 10) {
      recommendations.push({
        id: String(recommendationId++),
        title: 'Engage With Your Community',
        description: `You have ${totalComments} comments across your posts. Responding to comments within 1 hour can boost engagement by up to 40%.`,
        impact: 'high',
        icon: '💬',
        category: 'engagement'
      })
    }

    // Video content recommendation
    if (platformCounts['tiktok'] || platformCounts['youtube']) {
      recommendations.push({
        id: String(recommendationId++),
        title: 'Leverage Short-Form Video',
        description: 'Short-form video content (Reels, TikToks, Shorts) typically gets 2-3x more reach than static images. Consider creating more video content.',
        impact: 'high',
        icon: '🎬',
        category: 'content'
      })
    }

    // Hashtag recommendation
    recommendations.push({
      id: String(recommendationId++),
      title: 'Optimize Your Hashtags',
      description: 'Using 3-5 relevant hashtags per post can increase reach by 30%. Mix popular and niche hashtags for best results.',
      impact: 'medium',
      icon: '#️⃣',
      category: 'growth'
    })

    // Consistency recommendation
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const inactiveDays = [0, 1, 2, 3, 4, 5, 6].filter(day => !postingDays[day])

    if (inactiveDays.length >= 4 && posts.length > 5) {
      recommendations.push({
        id: String(recommendationId++),
        title: 'Post More Consistently',
        description: `You don't post on ${inactiveDays.slice(0, 2).map(d => dayNames[d]).join(' or ')}. Consistent posting across the week helps maintain audience engagement.`,
        impact: 'medium',
        icon: '📅',
        category: 'timing'
      })
    }

    // If we have very few or no posts, provide starter recommendations
    if (posts.length < 3) {
      return NextResponse.json({
        success: true,
        recommendations: [
          {
            id: '1',
            title: 'Start Your Content Journey',
            description: 'Create and publish your first few posts to unlock personalized AI recommendations based on your performance data.',
            impact: 'high' as const,
            icon: '🚀',
            category: 'growth' as const
          },
          {
            id: '2',
            title: 'Connect More Platforms',
            description: 'Connect Instagram, TikTok, YouTube, and other platforms to maximize your reach and get cross-platform insights.',
            impact: 'high' as const,
            icon: '🔗',
            category: 'growth' as const
          },
          {
            id: '3',
            title: 'Use AI-Generated Captions',
            description: 'Let AI help craft engaging captions. Posts with AI captions typically see 30%+ higher engagement.',
            impact: 'medium' as const,
            icon: '✨',
            category: 'content' as const
          }
        ],
        totalPosts: posts.length,
        analyzedDays: 30
      })
    }

    // Sort by impact and return top recommendations
    const impactOrder = { high: 0, medium: 1, low: 2 }
    recommendations.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])

    return NextResponse.json({
      success: true,
      recommendations: recommendations.slice(0, 5),
      totalPosts: posts.length,
      analyzedDays: 30,
      platforms: Object.keys(platformCounts),
      insights: {
        postsPerWeek: postsPerWeek.toFixed(1),
        bestPlatform: bestPlatform || null,
        bestEngagementRate: bestEngagementRate > 0 ? bestEngagementRate.toFixed(1) : null,
      }
    })
  } catch (error) {
    console.error('[Recommendations] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations', code: 'RECOMMENDATION_ERROR' },
      { status: 500 }
    )
  }
}
