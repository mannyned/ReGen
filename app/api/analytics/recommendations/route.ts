/**
 * GET /api/analytics/recommendations
 *
 * Generate AI-powered recommendations based on user's analytics data
 *
 * Query params:
 * - platform: Filter recommendations for a specific platform (instagram, tiktok, youtube, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  icon: string
  category: 'content' | 'timing' | 'engagement' | 'growth'
}

// Map platform names to provider values in the database
const PLATFORM_TO_PROVIDERS: Record<string, string[]> = {
  instagram: ['meta', 'instagram'],
  youtube: ['google', 'youtube'],
  tiktok: ['tiktok'],
  twitter: ['twitter'],
  linkedin: ['linkedin'],
  facebook: ['facebook', 'meta'],
  snapchat: ['snapchat'],
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

    // Get platform filter from query params
    const { searchParams } = new URL(request.url)
    const platformFilter = searchParams.get('platform')
    const isFiltered = platformFilter && platformFilter !== 'all'

    // Get user's posts from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Build the where clause with optional platform filter
    const whereClause: Prisma.OutboundPostWhereInput = {
      profileId,
      status: 'POSTED',
      postedAt: { gte: thirtyDaysAgo },
    }

    // Add platform filter if specified
    if (isFiltered && PLATFORM_TO_PROVIDERS[platformFilter]) {
      whereClause.provider = { in: PLATFORM_TO_PROVIDERS[platformFilter] }
    }

    const posts = await prisma.outboundPost.findMany({
      where: whereClause,
      orderBy: { postedAt: 'desc' },
    })

    // For platform-specific filtering, also get all posts for context
    const allPosts = isFiltered
      ? await prisma.outboundPost.findMany({
          where: {
            profileId,
            status: 'POSTED',
            postedAt: { gte: thirtyDaysAgo },
          },
          orderBy: { postedAt: 'desc' },
        })
      : posts

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

    // Get platform display name for filtered recommendations
    const platformDisplayName = isFiltered
      ? platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)
      : null

    // Check posting frequency
    const postsPerWeek = posts.length / 4 // Last 30 days ≈ 4 weeks
    if (postsPerWeek < 3) {
      recommendations.push({
        id: String(recommendationId++),
        title: isFiltered
          ? `Increase ${platformDisplayName} Posting`
          : 'Increase Posting Frequency',
        description: isFiltered
          ? `You're posting ${postsPerWeek.toFixed(1)} times per week on ${platformDisplayName}. Aim for 3-5 posts per week to maximize visibility and engagement on this platform.`
          : `You're posting ${postsPerWeek.toFixed(1)} times per week. Accounts posting 5+ times per week typically see 2x more engagement. Try scheduling more content.`,
        impact: 'high',
        icon: '📈',
        category: 'growth'
      })
    }

    // Check platform diversity - only show when not filtering by platform
    if (!isFiltered) {
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
    }

    // Check for best performing platform - only when not filtering
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

    // When filtering by platform, show platform-specific engagement insights
    if (isFiltered) {
      const filteredEngagement = platformEngagement[platformFilter] || Object.values(platformEngagement)[0]
      if (filteredEngagement && filteredEngagement.reach > 0) {
        const engagementRate = ((filteredEngagement.likes + filteredEngagement.comments) / filteredEngagement.reach) * 100
        if (engagementRate > 5) {
          recommendations.push({
            id: String(recommendationId++),
            title: `Strong ${platformDisplayName} Engagement`,
            description: `Your ${platformDisplayName} content achieves ${engagementRate.toFixed(1)}% engagement rate. Keep creating similar content to maintain this momentum.`,
            impact: 'high',
            icon: '🎯',
            category: 'content'
          })
        } else if (engagementRate < 2) {
          recommendations.push({
            id: String(recommendationId++),
            title: `Boost ${platformDisplayName} Engagement`,
            description: `Your ${platformDisplayName} engagement is ${engagementRate.toFixed(1)}%. Try using more engaging hooks, relevant hashtags, and posting during peak hours.`,
            impact: 'high',
            icon: '🔄',
            category: 'content'
          })
        }
      }
    } else {
      // Show cross-platform comparison when not filtering
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
        title: isFiltered
          ? `Try Morning ${platformDisplayName} Posts`
          : 'Try Morning Posts',
        description: isFiltered
          ? `You haven't posted on ${platformDisplayName} in the morning (6-11 AM). Morning posts can boost reach by 20-30% on this platform.`
          : 'You haven\'t posted in the morning (6-11 AM). Morning posts often catch users during their commute and can boost reach by 20-30%.',
        impact: 'medium',
        icon: '🌅',
        category: 'timing'
      })
    }

    if (eveningPosts === 0 && posts.length > 5) {
      recommendations.push({
        id: String(recommendationId++),
        title: isFiltered
          ? `Post on ${platformDisplayName} During Peak Hours`
          : 'Post During Peak Hours',
        description: isFiltered
          ? `Consider posting on ${platformDisplayName} between 5-9 PM when most users are active. This is typically the highest engagement window for this platform.`
          : 'Consider posting between 5-9 PM when most users are active. This is typically the highest engagement window.',
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
        title: isFiltered
          ? `Engage on ${platformDisplayName}`
          : 'Engage With Your Community',
        description: isFiltered
          ? `You have ${totalComments} comments on ${platformDisplayName}. Responding to comments within 1 hour can boost engagement by up to 40%.`
          : `You have ${totalComments} comments across your posts. Responding to comments within 1 hour can boost engagement by up to 40%.`,
        impact: 'high',
        icon: '💬',
        category: 'engagement'
      })
    }

    // Platform-specific content recommendations
    if (isFiltered) {
      // Platform-specific tips
      const platformTips: Record<string, { title: string; description: string; icon: string }> = {
        instagram: {
          title: 'Use Instagram Reels',
          description: 'Reels get 22% more engagement than static posts on Instagram. Try creating short-form video content to boost your reach.',
          icon: '🎬'
        },
        tiktok: {
          title: 'Hook Viewers Fast',
          description: 'TikTok users decide in 1-3 seconds whether to keep watching. Start with a strong hook to improve your completion rate.',
          icon: '🎣'
        },
        youtube: {
          title: 'Optimize Thumbnails',
          description: 'Custom thumbnails get 90% of the best-performing videos. Create eye-catching thumbnails to boost click-through rate.',
          icon: '🖼️'
        },
        linkedin: {
          title: 'Share Industry Insights',
          description: 'LinkedIn posts with professional insights and thought leadership get 3x more engagement. Share your expertise.',
          icon: '💼'
        },
        twitter: {
          title: 'Engage in Conversations',
          description: 'Reply to trending topics and engage with others in your niche. Twitter rewards active participation.',
          icon: '💬'
        },
        facebook: {
          title: 'Post Native Video',
          description: 'Facebook prioritizes native video content. Upload videos directly instead of sharing links for better reach.',
          icon: '🎬'
        }
      }

      const platformTip = platformTips[platformFilter]
      if (platformTip) {
        recommendations.push({
          id: String(recommendationId++),
          title: platformTip.title,
          description: platformTip.description,
          impact: 'high',
          icon: platformTip.icon,
          category: 'content'
        })
      }
    } else {
      // Video content recommendation - only when not filtering
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
    }

    // Hashtag recommendation - customize for platform
    const hashtagTips: Record<string, string> = {
      instagram: 'Using 5-10 relevant hashtags on Instagram can increase reach by 30%. Mix popular and niche hashtags for best results.',
      tiktok: 'TikTok hashtags help categorize your content. Use 3-5 relevant hashtags including trending ones to boost discoverability.',
      twitter: 'Use 1-2 hashtags on Twitter. More can reduce engagement. Focus on trending or niche hashtags relevant to your content.',
      linkedin: 'LinkedIn posts with 3-5 hashtags perform best. Use professional, industry-specific hashtags to reach your target audience.',
      youtube: 'Include relevant keywords and hashtags in your video description and tags to improve search visibility.',
      facebook: 'Hashtags are less impactful on Facebook, but 1-2 relevant hashtags can help categorize your content.'
    }

    recommendations.push({
      id: String(recommendationId++),
      title: isFiltered
        ? `Optimize ${platformDisplayName} Hashtags`
        : 'Optimize Your Hashtags',
      description: isFiltered && hashtagTips[platformFilter]
        ? hashtagTips[platformFilter]
        : 'Using 3-5 relevant hashtags per post can increase reach by 30%. Mix popular and niche hashtags for best results.',
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
        title: isFiltered
          ? `Post on ${platformDisplayName} More Consistently`
          : 'Post More Consistently',
        description: isFiltered
          ? `You don't post on ${platformDisplayName} on ${inactiveDays.slice(0, 2).map(d => dayNames[d]).join(' or ')}. Consistent posting helps maintain audience engagement.`
          : `You don't post on ${inactiveDays.slice(0, 2).map(d => dayNames[d]).join(' or ')}. Consistent posting across the week helps maintain audience engagement.`,
        impact: 'medium',
        icon: '📅',
        category: 'timing'
      })
    }

    // If we have very few or no posts, provide starter recommendations
    if (posts.length < 3) {
      // Platform-specific starter recommendations
      if (isFiltered) {
        return NextResponse.json({
          success: true,
          recommendations: [
            {
              id: '1',
              title: `Start Posting on ${platformDisplayName}`,
              description: `Create and publish your first few ${platformDisplayName} posts to unlock personalized recommendations for this platform.`,
              impact: 'high' as const,
              icon: '🚀',
              category: 'growth' as const
            },
            {
              id: '2',
              title: `Learn ${platformDisplayName} Best Practices`,
              description: `Each platform has unique content styles. Research what works best on ${platformDisplayName} to maximize your engagement.`,
              impact: 'high' as const,
              icon: '📚',
              category: 'content' as const
            },
            {
              id: '3',
              title: 'Use AI-Generated Captions',
              description: `Let AI help craft engaging captions optimized for ${platformDisplayName}. AI captions typically see 30%+ higher engagement.`,
              impact: 'medium' as const,
              icon: '✨',
              category: 'content' as const
            }
          ],
          totalPosts: posts.length,
          analyzedDays: 30,
          platform: platformFilter
        })
      }

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
      platform: isFiltered ? platformFilter : null,
      insights: {
        postsPerWeek: postsPerWeek.toFixed(1),
        bestPlatform: isFiltered ? platformFilter : (bestPlatform || null),
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
