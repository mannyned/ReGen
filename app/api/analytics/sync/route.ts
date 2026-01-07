/**
 * POST /api/analytics/sync
 *
 * Sync analytics from connected Instagram and Facebook accounts.
 * Fetches insights for posts published through ReGenr and stores them.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { TokenManager } from '@/lib/services/oauth/TokenManager'

export const runtime = 'nodejs'

const META_GRAPH_API = 'https://graph.facebook.com/v19.0'
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

interface InsightValue {
  value: number
}

interface InsightData {
  name: string
  values: InsightValue[]
}

interface MediaInsightsResponse {
  data: InsightData[]
}

interface PostInsightsResponse {
  data: InsightData[]
}

/**
 * Fetch Instagram media insights
 */
async function fetchInstagramInsights(
  mediaId: string,
  accessToken: string
): Promise<{
  impressions: number
  reach: number
  likes: number
  comments: number
  saved: number
  shares: number
} | null> {
  try {
    // Instagram media insights - available metrics depend on media type
    const metrics = 'impressions,reach,saved,likes,comments,shares'
    const url = `${META_GRAPH_API}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Instagram Insights] Failed for ${mediaId}:`, error)
      return null
    }

    const data: MediaInsightsResponse = await response.json()

    const result = {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      saved: 0,
      shares: 0,
    }

    for (const insight of data.data || []) {
      const value = insight.values?.[0]?.value || 0
      switch (insight.name) {
        case 'impressions':
          result.impressions = value
          break
        case 'reach':
          result.reach = value
          break
        case 'likes':
          result.likes = value
          break
        case 'comments':
          result.comments = value
          break
        case 'saved':
          result.saved = value
          break
        case 'shares':
          result.shares = value
          break
      }
    }

    return result
  } catch (error) {
    console.error(`[Instagram Insights] Error for ${mediaId}:`, error)
    return null
  }
}

/**
 * Fetch Facebook post insights
 */
async function fetchFacebookInsights(
  postId: string,
  accessToken: string
): Promise<{
  impressions: number
  reach: number
  engaged_users: number
  clicks: number
} | null> {
  try {
    const metrics = 'post_impressions,post_impressions_unique,post_engaged_users,post_clicks'
    const url = `${META_GRAPH_API}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Facebook Insights] Failed for ${postId}:`, error)
      return null
    }

    const data: PostInsightsResponse = await response.json()

    const result = {
      impressions: 0,
      reach: 0,
      engaged_users: 0,
      clicks: 0,
    }

    for (const insight of data.data || []) {
      const value = insight.values?.[0]?.value || 0
      switch (insight.name) {
        case 'post_impressions':
          result.impressions = value
          break
        case 'post_impressions_unique':
          result.reach = value
          break
        case 'post_engaged_users':
          result.engaged_users = value
          break
        case 'post_clicks':
          result.clicks = value
          break
      }
    }

    return result
  } catch (error) {
    console.error(`[Facebook Insights] Error for ${postId}:`, error)
    return null
  }
}

/**
 * Fetch YouTube video statistics
 */
async function fetchYouTubeInsights(
  videoId: string,
  accessToken: string
): Promise<{
  views: number
  likes: number
  comments: number
  shares: number
} | null> {
  try {
    const url = `${YOUTUBE_API}/videos?part=statistics&id=${videoId}&access_token=${accessToken}`
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.text()
      console.error(`[YouTube Insights] Failed for ${videoId}:`, error)
      return null
    }

    const data = await response.json()
    const stats = data.items?.[0]?.statistics

    if (!stats) {
      return null
    }

    return {
      views: parseInt(stats.viewCount || '0', 10),
      likes: parseInt(stats.likeCount || '0', 10),
      comments: parseInt(stats.commentCount || '0', 10),
      shares: 0, // YouTube doesn't expose share count in basic API
    }
  } catch (error) {
    console.error(`[YouTube Insights] Error for ${videoId}:`, error)
    return null
  }
}

/**
 * Fetch basic engagement counts directly from media/post object
 */
async function fetchBasicEngagement(
  mediaId: string,
  accessToken: string,
  platform: 'instagram' | 'facebook'
): Promise<{ likes: number; comments: number } | null> {
  try {
    const fields = platform === 'instagram'
      ? 'like_count,comments_count'
      : 'likes.summary(true),comments.summary(true)'

    const url = `${META_GRAPH_API}/${mediaId}?fields=${fields}&access_token=${accessToken}`
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (platform === 'instagram') {
      return {
        likes: data.like_count || 0,
        comments: data.comments_count || 0,
      }
    } else {
      return {
        likes: data.likes?.summary?.total_count || 0,
        comments: data.comments?.summary?.total_count || 0,
      }
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get posts to sync (Instagram, Facebook, and YouTube, last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        provider: { in: ['instagram', 'facebook', 'meta', 'youtube', 'google'] },
        status: 'POSTED',
        externalPostId: { not: null },
        postedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { postedAt: 'desc' },
      take: 50, // Limit to 50 most recent posts
    })

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts to sync',
        synced: 0,
      })
    }

    // Get access tokens for Instagram, Facebook, and YouTube
    let instagramToken: string | null = null
    let facebookToken: string | null = null
    let youtubeToken: string | null = null

    try {
      instagramToken = await TokenManager.getValidAccessToken(profileId, 'instagram')
    } catch {
      console.log('[Analytics Sync] No Instagram token available')
    }

    try {
      facebookToken = await TokenManager.getValidAccessToken(profileId, 'facebook')
    } catch {
      console.log('[Analytics Sync] No Facebook token available')
    }

    try {
      youtubeToken = await TokenManager.getValidAccessToken(profileId, 'youtube')
    } catch {
      console.log('[Analytics Sync] No YouTube token available')
    }

    // If no Meta token, try to get one
    if (!instagramToken && !facebookToken) {
      try {
        const metaToken = await TokenManager.getValidAccessToken(profileId, 'meta')
        instagramToken = metaToken
        facebookToken = metaToken
      } catch {
        console.log('[Analytics Sync] No Meta token available')
      }
    }

    // Check if we have any tokens
    if (!instagramToken && !facebookToken && !youtubeToken) {
      return NextResponse.json({
        success: false,
        error: 'No connected Instagram, Facebook, or YouTube account',
        code: 'NO_CONNECTION',
      }, { status: 400 })
    }

    let syncedCount = 0
    const errors: string[] = []
    const results: Array<{
      postId: string
      platform: string
      metrics: Record<string, number> | null
    }> = []

    for (const post of posts) {
      // Normalize platform names
      let platform = post.provider
      if (platform === 'meta') platform = 'instagram'
      if (platform === 'google') platform = 'youtube'

      // Get the appropriate token
      let accessToken: string | null = null
      if (platform === 'instagram') accessToken = instagramToken
      else if (platform === 'facebook') accessToken = facebookToken
      else if (platform === 'youtube') accessToken = youtubeToken

      if (!accessToken || !post.externalPostId) {
        continue
      }

      let insights: Record<string, number> | null = null

      if (platform === 'instagram') {
        // Try to get full insights first
        const fullInsights = await fetchInstagramInsights(post.externalPostId, accessToken)

        if (fullInsights) {
          insights = fullInsights
        } else {
          // Fall back to basic engagement
          const basic = await fetchBasicEngagement(post.externalPostId, accessToken, 'instagram')
          if (basic) {
            insights = {
              likes: basic.likes,
              comments: basic.comments,
              impressions: 0,
              reach: 0,
              saved: 0,
              shares: 0,
            }
          }
        }
      } else if (platform === 'facebook') {
        const fullInsights = await fetchFacebookInsights(post.externalPostId, accessToken)

        if (fullInsights) {
          insights = {
            impressions: fullInsights.impressions,
            reach: fullInsights.reach,
            likes: fullInsights.engaged_users, // Approximate
            comments: 0,
            shares: 0,
            saves: 0,
          }
        }

        // Get likes/comments count
        const basic = await fetchBasicEngagement(post.externalPostId, accessToken, 'facebook')
        if (basic && insights) {
          insights.likes = basic.likes
          insights.comments = basic.comments
        }
      } else if (platform === 'youtube') {
        const youtubeInsights = await fetchYouTubeInsights(post.externalPostId, accessToken)

        if (youtubeInsights) {
          insights = {
            views: youtubeInsights.views,
            likes: youtubeInsights.likes,
            comments: youtubeInsights.comments,
            shares: youtubeInsights.shares,
            reach: youtubeInsights.views, // Use views as reach for YouTube
            impressions: youtubeInsights.views,
            saves: 0,
          }
        }
      }

      if (insights) {
        // Store in metadata for now (could also create PostAnalytics record)
        await prisma.outboundPost.update({
          where: { id: post.id },
          data: {
            metadata: {
              ...(post.metadata as Record<string, unknown> || {}),
              analytics: {
                ...insights,
                syncedAt: new Date().toISOString(),
              },
            },
          },
        })

        syncedCount++
        results.push({
          postId: post.id,
          platform,
          metrics: insights,
        })
      } else {
        errors.push(`Failed to fetch insights for ${platform} post ${post.externalPostId}`)
      }

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: posts.length,
      errors: errors.length > 0 ? errors : undefined,
      results,
    })
  } catch (error) {
    console.error('[Analytics Sync Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync analytics',
        code: 'SYNC_ERROR',
      },
      { status: 500 }
    )
  }
}
