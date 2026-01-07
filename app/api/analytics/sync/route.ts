/**
 * POST /api/analytics/sync
 *
 * Sync analytics from connected Instagram and Facebook accounts.
 * Fetches insights for posts published through ReGenr and stores them.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

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
 * Note: As of 2024-2025, likes/comments come from media object, not insights endpoint
 * Insights returns: impressions, reach, saved, shares (for supported media types)
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
    // Step 1: Get likes and comments from media object
    const mediaUrl = `${META_GRAPH_API}/${mediaId}?fields=like_count,comments_count,media_type&access_token=${accessToken}`
    const mediaResponse = await fetch(mediaUrl)

    let likes = 0
    let comments = 0
    let mediaType = 'IMAGE'

    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json()
      likes = mediaData.like_count || 0
      comments = mediaData.comments_count || 0
      mediaType = mediaData.media_type || 'IMAGE'
      console.log(`[Instagram] Media ${mediaId}: type=${mediaType}, likes=${likes}, comments=${comments}`)
    } else {
      const error = await mediaResponse.text()
      console.error(`[Instagram] Failed to get media object for ${mediaId}:`, error)
    }

    // Step 2: Get insights (impressions, reach, saved, shares)
    // Note: Available metrics depend on media type
    // For Reels: plays, reach, saved, shares, total_interactions
    // For Feed posts: impressions, reach, saved
    const insightMetrics = mediaType === 'VIDEO' || mediaType === 'REEL'
      ? 'reach,saved,shares,plays'
      : 'impressions,reach,saved'

    const insightsUrl = `${META_GRAPH_API}/${mediaId}/insights?metric=${insightMetrics}&access_token=${accessToken}`
    const insightsResponse = await fetch(insightsUrl)

    const result = {
      impressions: 0,
      reach: 0,
      likes,
      comments,
      saved: 0,
      shares: 0,
    }

    if (insightsResponse.ok) {
      const insightsData: MediaInsightsResponse = await insightsResponse.json()
      console.log(`[Instagram] Insights for ${mediaId}:`, JSON.stringify(insightsData).slice(0, 300))

      for (const insight of insightsData.data || []) {
        const value = insight.values?.[0]?.value || 0
        switch (insight.name) {
          case 'impressions':
          case 'plays':
            result.impressions = value
            break
          case 'reach':
            result.reach = value
            break
          case 'saved':
            result.saved = value
            break
          case 'shares':
            result.shares = value
            break
        }
      }
    } else {
      const error = await insightsResponse.text()
      console.error(`[Instagram] Insights failed for ${mediaId}:`, error)
      // Still return what we have from media object
    }

    console.log(`[Instagram] Final metrics for ${mediaId}:`, result)
    return result
  } catch (error) {
    console.error(`[Instagram Insights] Error for ${mediaId}:`, error)
    return null
  }
}

/**
 * Fetch Facebook post insights
 * Note: Facebook Page posts require Page access token and insights permission
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
    // First try to get basic post data (likes, comments, shares)
    const basicUrl = `${META_GRAPH_API}/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`
    const basicResponse = await fetch(basicUrl)

    if (!basicResponse.ok) {
      const error = await basicResponse.text()
      console.error(`[Facebook Basic] Failed for ${postId}:`, error)
      // Try insights endpoint as fallback
    } else {
      const basicData = await basicResponse.json()
      console.log(`[Facebook Basic] Success for ${postId}:`, JSON.stringify(basicData).slice(0, 200))

      // Return basic metrics if available
      if (basicData.likes || basicData.comments || basicData.shares) {
        return {
          impressions: 0,
          reach: 0,
          engaged_users: (basicData.likes?.summary?.total_count || 0) +
                         (basicData.comments?.summary?.total_count || 0) +
                         (basicData.shares?.count || 0),
          clicks: 0,
        }
      }
    }

    // Try insights endpoint (requires Page token with read_insights)
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
    // YouTube API requires the key parameter or OAuth token in Authorization header
    const url = `${YOUTUBE_API}/videos?part=statistics&id=${videoId}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[YouTube Insights] Failed for ${videoId}:`, error)
      return null
    }

    const data = await response.json()
    console.log(`[YouTube Insights] Response for ${videoId}:`, JSON.stringify(data).slice(0, 300))

    const stats = data.items?.[0]?.statistics

    if (!stats) {
      console.error(`[YouTube Insights] No stats found for ${videoId}`)
      return null
    }

    const result = {
      views: parseInt(stats.viewCount || '0', 10),
      likes: parseInt(stats.likeCount || '0', 10),
      comments: parseInt(stats.commentCount || '0', 10),
      shares: 0, // YouTube doesn't expose share count in basic API
    }

    console.log(`[YouTube Insights] Parsed stats for ${videoId}:`, result)
    return result
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

    // Log what posts were found
    const postsByProvider: Record<string, number> = {}
    for (const post of posts) {
      postsByProvider[post.provider] = (postsByProvider[post.provider] || 0) + 1
    }
    console.log(`[Analytics Sync] Found ${posts.length} posts:`, postsByProvider)

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts to sync',
        synced: 0,
      })
    }

    // Get access tokens for Instagram, Facebook, and YouTube
    // Note: Instagram and Facebook both use Meta OAuth (stored as 'meta')
    // YouTube uses Google OAuth (stored as 'google')
    let metaToken: string | null = null
    let youtubeToken: string | null = null

    // Try to get Meta token (used for both Instagram and Facebook)
    try {
      metaToken = await tokenManager.getValidAccessToken(profileId, 'meta')
      console.log('[Analytics Sync] Meta token retrieved successfully')
    } catch {
      console.log('[Analytics Sync] No Meta token available')
    }

    // Try to get YouTube/Google token
    // Note: TokenManager internally maps 'youtube' -> 'google' for OAuth lookup
    try {
      youtubeToken = await tokenManager.getValidAccessToken(profileId, 'youtube')
      console.log('[Analytics Sync] YouTube token retrieved successfully')
    } catch {
      console.log('[Analytics Sync] No YouTube token available')
    }

    // Use Meta token for both Instagram and Facebook
    const instagramToken = metaToken
    const facebookToken = metaToken

    // Log token status
    console.log(`[Analytics Sync] Token status: Meta=${!!metaToken}, YouTube=${!!youtubeToken}`)

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
        console.log(`[Analytics Sync] Skipping post ${post.id}: provider=${post.provider}, platform=${platform}, hasToken=${!!accessToken}, hasExternalId=${!!post.externalPostId}`)
        continue
      }

      console.log(`[Analytics Sync] Processing ${platform} post: ${post.externalPostId}`)

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
        console.log(`[Analytics Sync] Fetching Facebook insights for ${post.externalPostId}`)
        const fullInsights = await fetchFacebookInsights(post.externalPostId, accessToken)

        if (fullInsights) {
          // Get likes/comments from separate call
          const basic = await fetchBasicEngagement(post.externalPostId, accessToken, 'facebook')

          insights = {
            impressions: fullInsights.impressions,
            reach: fullInsights.reach,
            likes: basic?.likes || 0,
            comments: basic?.comments || 0,
            shares: 0,
            saves: 0,
            engaged_users: fullInsights.engaged_users,
          }
          console.log(`[Analytics Sync] Facebook insights for ${post.externalPostId}:`, insights)
        } else {
          // Try basic engagement only as fallback
          const basic = await fetchBasicEngagement(post.externalPostId, accessToken, 'facebook')
          if (basic) {
            insights = {
              impressions: 0,
              reach: 0,
              likes: basic.likes,
              comments: basic.comments,
              shares: 0,
              saves: 0,
            }
            console.log(`[Analytics Sync] Facebook basic for ${post.externalPostId}:`, insights)
          }
        }
      } else if (platform === 'youtube') {
        console.log(`[Analytics Sync] Fetching YouTube insights for ${post.externalPostId}`)
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
