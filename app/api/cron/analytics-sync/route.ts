/**
 * GET /api/cron/analytics-sync
 *
 * Automated cron job to sync analytics from connected platforms.
 * Runs every 6 hours to fetch latest engagement data for all users.
 *
 * Syncs data from:
 * - Instagram (likes, comments, reach, impressions, saves, shares)
 * - Facebook (likes, comments, reach, impressions, shares)
 * - YouTube (views, likes, comments)
 *
 * Note: LinkedIn analytics require Community Management API approval
 * and are not currently synced automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max for cron job

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'
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

/**
 * Fetch Instagram media insights
 */
async function fetchInstagramInsights(
  mediaId: string,
  accessToken: string
): Promise<Record<string, number> | null> {
  try {
    // Get likes and comments from media object
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
    }

    // Get insights (reach, saved, shares)
    // As of API v22.0+, 'impressions' is deprecated for Instagram media
    // For Reels: plays, reach, saved, shares
    // For Feed posts (IMAGE/CAROUSEL): reach, saved
    const insightMetrics = mediaType === 'VIDEO' || mediaType === 'REEL'
      ? 'reach,saved,shares,plays'
      : 'reach,saved'

    const insightsUrl = `${META_GRAPH_API}/${mediaId}/insights?metric=${insightMetrics}&access_token=${accessToken}`
    const insightsResponse = await fetch(insightsUrl)

    const result: Record<string, number> = {
      impressions: 0,
      reach: 0,
      likes,
      comments,
      saved: 0,
      shares: 0,
    }

    if (insightsResponse.ok) {
      const insightsData: MediaInsightsResponse = await insightsResponse.json()

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
    }

    return result
  } catch (error) {
    console.error(`[Cron Analytics] Instagram error for ${mediaId}:`, error)
    return null
  }
}

/**
 * Get Facebook Page Token from User Token
 */
async function getFacebookPageToken(userToken: string): Promise<string | null> {
  try {
    const url = `${META_GRAPH_API}/me/accounts?fields=id,name,access_token&access_token=${userToken}`
    const response = await fetch(url)

    if (!response.ok) return null

    const data = await response.json()
    return data.data?.[0]?.access_token || null
  } catch {
    return null
  }
}

/**
 * Fetch Facebook post insights
 */
async function fetchFacebookInsights(
  postId: string,
  accessToken: string
): Promise<Record<string, number> | null> {
  try {
    const result: Record<string, number> = {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    }

    // Get insights
    const insightsUrl = `${META_GRAPH_API}/${postId}/insights?metric=post_impressions,post_impressions_unique&access_token=${accessToken}`
    const insightsResponse = await fetch(insightsUrl)

    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json()
      for (const insight of insightsData.data || []) {
        const value = insight.values?.[0]?.value || 0
        if (insight.name === 'post_impressions') result.impressions = value
        if (insight.name === 'post_impressions_unique') result.reach = value
      }
    }

    // Get engagement
    const engagementUrl = `${META_GRAPH_API}/${postId}?fields=reactions.summary(total_count),comments.summary(total_count),shares&access_token=${accessToken}`
    const engagementResponse = await fetch(engagementUrl)

    if (engagementResponse.ok) {
      const engagementData = await engagementResponse.json()
      result.likes = engagementData.reactions?.summary?.total_count || 0
      result.comments = engagementData.comments?.summary?.total_count || 0
      result.shares = engagementData.shares?.count || 0
    }

    return result
  } catch (error) {
    console.error(`[Cron Analytics] Facebook error for ${postId}:`, error)
    return null
  }
}

/**
 * Fetch YouTube video statistics
 */
async function fetchYouTubeInsights(
  videoId: string,
  accessToken: string
): Promise<Record<string, number> | null> {
  try {
    const url = `${YOUTUBE_API}/videos?part=statistics&id=${videoId}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return null

    const data = await response.json()
    const stats = data.items?.[0]?.statistics

    if (!stats) return null

    return {
      views: parseInt(stats.viewCount || '0', 10),
      likes: parseInt(stats.likeCount || '0', 10),
      comments: parseInt(stats.commentCount || '0', 10),
      shares: 0,
      reach: parseInt(stats.viewCount || '0', 10),
      impressions: parseInt(stats.viewCount || '0', 10),
      saves: 0,
    }
  } catch (error) {
    console.error(`[Cron Analytics] YouTube error for ${videoId}:`, error)
    return null
  }
}

/**
 * Sync analytics for a single user
 */
async function syncUserAnalytics(profileId: string): Promise<{ synced: number; errors: number }> {
  let synced = 0
  let errors = 0

  // Get posts to sync (last 30 days)
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
    take: 50,
  })

  if (posts.length === 0) return { synced: 0, errors: 0 }

  // Get access tokens
  let instagramToken = await tokenManager.getValidAccessToken(profileId, 'instagram')
  if (!instagramToken) {
    instagramToken = await tokenManager.getValidAccessToken(profileId, 'meta')
  }

  let facebookToken = await tokenManager.getValidAccessToken(profileId, 'facebook')
  if (!facebookToken) {
    facebookToken = await tokenManager.getValidAccessToken(profileId, 'meta')
  }

  let facebookPageToken: string | null = null
  if (facebookToken) {
    facebookPageToken = await getFacebookPageToken(facebookToken)
  }

  const youtubeToken = await tokenManager.getValidAccessToken(profileId, 'youtube')

  // Process each post
  for (const post of posts) {
    let platform = post.provider
    if (platform === 'meta') platform = 'instagram'
    if (platform === 'google') platform = 'youtube'

    let accessToken: string | null = null
    if (platform === 'instagram') accessToken = instagramToken
    else if (platform === 'facebook') accessToken = facebookPageToken
    else if (platform === 'youtube') accessToken = youtubeToken

    if (!accessToken || !post.externalPostId) continue

    let insights: Record<string, number> | null = null

    if (platform === 'instagram') {
      insights = await fetchInstagramInsights(post.externalPostId, accessToken)
    } else if (platform === 'facebook') {
      insights = await fetchFacebookInsights(post.externalPostId, accessToken)
    } else if (platform === 'youtube') {
      insights = await fetchYouTubeInsights(post.externalPostId, accessToken)
    }

    if (insights) {
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
      synced++
    } else {
      errors++
    }

    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { synced, errors }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron Analytics] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron Analytics] Starting automated analytics sync...')

    // Find all users with connected social accounts
    const usersWithConnections = await prisma.oAuthConnection.findMany({
      where: {
        provider: { in: ['instagram', 'facebook', 'meta', 'youtube', 'google'] },
      },
      select: {
        profileId: true,
      },
      distinct: ['profileId'],
    })

    const uniqueProfileIds = [...new Set(usersWithConnections.map(c => c.profileId))]
    console.log(`[Cron Analytics] Found ${uniqueProfileIds.length} users with connected accounts`)

    let totalSynced = 0
    let totalErrors = 0
    const userResults: Array<{ profileId: string; synced: number; errors: number }> = []

    for (const profileId of uniqueProfileIds) {
      try {
        const result = await syncUserAnalytics(profileId)
        totalSynced += result.synced
        totalErrors += result.errors

        if (result.synced > 0 || result.errors > 0) {
          userResults.push({ profileId, ...result })
        }

        // Delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`[Cron Analytics] Error syncing user ${profileId}:`, error)
        totalErrors++
      }
    }

    console.log(`[Cron Analytics] Completed. Synced: ${totalSynced}, Errors: ${totalErrors}`)

    return NextResponse.json({
      success: true,
      usersProcessed: uniqueProfileIds.length,
      totalSynced,
      totalErrors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Analytics] Fatal error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Analytics sync failed',
        code: 'CRON_ERROR',
      },
      { status: 500 }
    )
  }
}
