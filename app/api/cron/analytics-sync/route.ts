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
const TWITTER_API = 'https://api.twitter.com/2'
const TIKTOK_API = 'https://open.tiktokapis.com/v2'
const LINKEDIN_API = 'https://api.linkedin.com'

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

    // Get insights (impressions, reach, and saves)
    const insightsUrl = `${META_GRAPH_API}/${postId}/insights?metric=post_impressions,post_impressions_unique,post_activity_by_action_type&access_token=${accessToken}`
    const insightsResponse = await fetch(insightsUrl)

    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json()
      for (const insight of insightsData.data || []) {
        const value = insight.values?.[0]?.value
        if (insight.name === 'post_impressions') result.impressions = (typeof value === 'number' ? value : 0)
        if (insight.name === 'post_impressions_unique') result.reach = (typeof value === 'number' ? value : 0)
        // post_activity_by_action_type returns an object with action counts
        if (insight.name === 'post_activity_by_action_type' && typeof value === 'object' && value !== null) {
          result.saves = (value as Record<string, number>).save || 0
        }
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
 * Fetch Twitter/X tweet metrics
 */
async function fetchTwitterInsights(
  tweetId: string,
  accessToken: string
): Promise<Record<string, number> | null> {
  try {
    // Try with full metrics first
    const url = `${TWITTER_API}/tweets/${tweetId}?tweet.fields=public_metrics,non_public_metrics,organic_metrics`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      // Fallback to public_metrics only
      if (response.status === 403 || response.status === 401) {
        const fallbackUrl = `${TWITTER_API}/tweets/${tweetId}?tweet.fields=public_metrics`
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        })

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          const metrics = fallbackData.data?.public_metrics
          if (metrics) {
            return {
              impressions: 0,
              likes: metrics.like_count || 0,
              comments: metrics.reply_count || 0,
              shares: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
              reach: 0,
              saves: metrics.bookmark_count || 0,
            }
          }
        }
      }
      return null
    }

    const data = await response.json()
    const metrics = data.data?.organic_metrics || data.data?.public_metrics
    const nonPublic = data.data?.non_public_metrics

    if (!metrics) return null

    return {
      impressions: nonPublic?.impression_count || metrics.impression_count || 0,
      likes: metrics.like_count || 0,
      comments: metrics.reply_count || 0,
      shares: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
      reach: nonPublic?.impression_count || metrics.impression_count || 0,
      saves: metrics.bookmark_count || 0,
    }
  } catch (error) {
    console.error(`[Cron Analytics] Twitter error for ${tweetId}:`, error)
    return null
  }
}

/**
 * Fetch TikTok video insights
 */
async function fetchTikTokInsights(
  videoId: string,
  accessToken: string
): Promise<Record<string, number> | null> {
  try {
    const listUrl = `${TIKTOK_API}/video/list/?fields=id,like_count,comment_count,share_count,view_count,collect_count`
    const listResponse = await fetch(listUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
    })

    if (!listResponse.ok) return null

    const listData = await listResponse.json()
    const videos = listData.data?.videos || []
    const video = videos.find((v: { id: string }) => v.id === videoId)

    if (!video) return null

    return {
      views: video.view_count || 0,
      likes: video.like_count || 0,
      comments: video.comment_count || 0,
      shares: video.share_count || 0,
      reach: video.view_count || 0,
      impressions: video.view_count || 0,
      saves: video.collect_count || 0,
    }
  } catch (error) {
    console.error(`[Cron Analytics] TikTok error for ${videoId}:`, error)
    return null
  }
}

/**
 * Fetch LinkedIn post insights
 * Works for both personal profiles and organization pages
 */
async function fetchLinkedInInsights(
  postId: string,
  accessToken: string,
  isOrganization: boolean = false
): Promise<Record<string, number> | null> {
  try {
    if (isOrganization) {
      const encodedPostId = encodeURIComponent(postId)

      // Try organizationalEntityShareStatistics
      const sharesParam = encodeURIComponent(`List(${postId})`)
      const statsUrl = `${LINKEDIN_API}/rest/organizationalEntityShareStatistics?q=organizationalEntity&shares=${sharesParam}`
      const response = await fetch(statsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202503',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const stats = data.elements?.[0]?.totalShareStatistics
        if (stats) {
          return {
            impressions: stats.impressionCount || 0,
            likes: stats.likeCount || 0,
            comments: stats.commentCount || 0,
            shares: stats.shareCount || 0,
            reach: stats.uniqueImpressionsCount || stats.impressionCount || 0,
            clicks: stats.clickCount || 0,
            saves: 0,
          }
        }
      }

      // Fallback: socialMetadata
      const metadataUrl = `${LINKEDIN_API}/rest/socialMetadata/${encodedPostId}`
      const metadataResponse = await fetch(metadataUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202503',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      })

      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json()
        return {
          impressions: 0,
          likes: metadataData.reactionSummaries?.reduce((sum: number, r: { count?: number }) => sum + (r.count || 0), 0) ||
                 metadataData.totalReactionCount || 0,
          comments: metadataData.commentCount || metadataData.totalCommentCount || 0,
          shares: metadataData.shareCount || 0,
          reach: 0,
          saves: 0,
        }
      }

      // Fallback: reactions count
      const reactionsUrl = `${LINKEDIN_API}/rest/reactions/(entity:${encodedPostId})?count=true`
      const reactionsResponse = await fetch(reactionsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202503',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      })

      if (reactionsResponse.ok) {
        const reactionsData = await reactionsResponse.json()

        let commentsCount = 0
        const commentsUrl = `${LINKEDIN_API}/rest/socialActions/${encodedPostId}/comments?count=10`
        const commentsResponse = await fetch(commentsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'LinkedIn-Version': '202503',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        })
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json()
          commentsCount = commentsData.paging?.total || commentsData.elements?.length || 0
        }

        return {
          impressions: 0,
          likes: reactionsData.paging?.total || reactionsData.elements?.length || 0,
          comments: commentsCount,
          shares: 0,
          reach: 0,
          saves: 0,
        }
      }

      return null
    } else {
      // Personal posts - use v2 socialActions
      const socialUrl = `${LINKEDIN_API}/v2/socialActions/${encodeURIComponent(postId)}`
      const response = await fetch(socialUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      })

      if (!response.ok) return null

      const data = await response.json()
      return {
        impressions: 0,
        likes: data.likesSummary?.totalLikes || 0,
        comments: data.commentsSummary?.totalFirstLevelComments || 0,
        shares: 0,
        reach: 0,
        saves: 0,
      }
    }
  } catch (error) {
    console.error(`[Cron Analytics] LinkedIn error for ${postId}:`, error)
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
      provider: { in: ['instagram', 'facebook', 'meta', 'youtube', 'google', 'linkedin', 'linkedin-org', 'twitter', 'tiktok'] },
      status: 'POSTED',
      externalPostId: { not: null },
      postedAt: { gte: thirtyDaysAgo },
    },
    orderBy: { postedAt: 'desc' },
    take: 50,
  })

  if (posts.length === 0) return { synced: 0, errors: 0 }

  // Get access tokens for all platforms
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
  const twitterToken = await tokenManager.getValidAccessToken(profileId, 'twitter')
  const tiktokToken = await tokenManager.getValidAccessToken(profileId, 'tiktok')
  const linkedinToken = await tokenManager.getValidAccessToken(profileId, 'linkedin')
  const linkedinOrgToken = await tokenManager.getValidAccessToken(profileId, 'linkedin-org')

  // Process each post
  for (const post of posts) {
    let platform = post.provider
    if (platform === 'meta') platform = 'instagram'
    if (platform === 'google') platform = 'youtube'

    let accessToken: string | null = null
    if (platform === 'instagram') accessToken = instagramToken
    else if (platform === 'facebook') accessToken = facebookPageToken
    else if (platform === 'youtube') accessToken = youtubeToken
    else if (platform === 'twitter') accessToken = twitterToken
    else if (platform === 'tiktok') accessToken = tiktokToken
    else if (platform === 'linkedin') accessToken = linkedinToken
    else if (platform === 'linkedin-org') accessToken = linkedinOrgToken

    if (!accessToken || !post.externalPostId) continue

    let insights: Record<string, number> | null = null

    if (platform === 'instagram') {
      insights = await fetchInstagramInsights(post.externalPostId, accessToken)
    } else if (platform === 'facebook') {
      insights = await fetchFacebookInsights(post.externalPostId, accessToken)
    } else if (platform === 'youtube') {
      insights = await fetchYouTubeInsights(post.externalPostId, accessToken)
    } else if (platform === 'twitter') {
      insights = await fetchTwitterInsights(post.externalPostId, accessToken)
    } else if (platform === 'tiktok') {
      insights = await fetchTikTokInsights(post.externalPostId, accessToken)
    } else if (platform === 'linkedin') {
      insights = await fetchLinkedInInsights(post.externalPostId, accessToken, false)
    } else if (platform === 'linkedin-org') {
      insights = await fetchLinkedInInsights(post.externalPostId, accessToken, true)
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
        provider: { in: ['instagram', 'facebook', 'meta', 'youtube', 'google', 'linkedin', 'linkedin-org', 'twitter', 'tiktok'] },
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
