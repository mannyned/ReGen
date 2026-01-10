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
const LINKEDIN_API = 'https://api.linkedin.com/v2'

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

interface ApiError {
  platform: string
  postId: string
  endpoint: string
  status: number
  error: string
}

// Collect detailed errors for debugging
const detailedErrors: ApiError[] = []

/**
 * Get Facebook Page Access Token from User Token
 * The User Token can fetch the list of pages with their Page Access Tokens
 */
async function getFacebookPageToken(userAccessToken: string): Promise<string | null> {
  try {
    const url = `${META_GRAPH_API}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
    console.log('[Facebook] Fetching Page Token from /me/accounts')

    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Facebook] Failed to get pages (${response.status}):`, errorText.slice(0, 300))
      detailedErrors.push({
        platform: 'facebook',
        postId: 'page_token',
        endpoint: '/me/accounts',
        status: response.status,
        error: errorText.slice(0, 500),
      })
      return null
    }

    const data = await response.json()
    const page = data.data?.[0]

    if (!page?.access_token) {
      console.error('[Facebook] No pages found or no access token returned')
      detailedErrors.push({
        platform: 'facebook',
        postId: 'page_token',
        endpoint: '/me/accounts',
        status: 200,
        error: 'No pages found in response or missing access_token',
      })
      return null
    }

    console.log(`[Facebook] Got Page Token for page: ${page.name} (${page.id})`)
    return page.access_token
  } catch (error) {
    console.error('[Facebook] Exception getting page token:', error)
    return null
  }
}

/**
 * Fetch Facebook post insights
 * Note: Facebook Page posts require Page access token and insights permission
 */
async function fetchFacebookInsights(
  postId: string,
  pageAccessToken: string
): Promise<{
  impressions: number
  reach: number
  engaged_users: number
  clicks: number
  likes: number
  comments: number
  shares: number
} | null> {
  try {
    // First try to get basic post data (likes, comments, shares)
    const basicUrl = `${META_GRAPH_API}/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${pageAccessToken}`
    console.log(`[Facebook] Fetching basic data for ${postId}`)
    const basicResponse = await fetch(basicUrl)

    let likes = 0
    let comments = 0
    let shares = 0

    if (!basicResponse.ok) {
      const errorText = await basicResponse.text()
      console.error(`[Facebook Basic] Failed for ${postId} (${basicResponse.status}):`, errorText)
      detailedErrors.push({
        platform: 'facebook',
        postId,
        endpoint: 'basic',
        status: basicResponse.status,
        error: errorText.slice(0, 500),
      })
    } else {
      const basicData = await basicResponse.json()
      console.log(`[Facebook Basic] Success for ${postId}:`, JSON.stringify(basicData).slice(0, 300))

      likes = basicData.likes?.summary?.total_count || 0
      comments = basicData.comments?.summary?.total_count || 0
      shares = basicData.shares?.count || 0

      // If we got engagement data, return it
      if (likes > 0 || comments > 0 || shares > 0) {
        return {
          impressions: 0,
          reach: 0,
          engaged_users: likes + comments + shares,
          clicks: 0,
          likes,
          comments,
          shares,
        }
      }
    }

    // Try insights endpoint (requires Page token with read_insights)
    const metrics = 'post_impressions,post_impressions_unique,post_engaged_users,post_clicks'
    const url = `${META_GRAPH_API}/${postId}/insights?metric=${metrics}&access_token=${pageAccessToken}`
    console.log(`[Facebook] Fetching insights for ${postId}`)

    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Facebook Insights] Failed for ${postId} (${response.status}):`, errorText)
      detailedErrors.push({
        platform: 'facebook',
        postId,
        endpoint: 'insights',
        status: response.status,
        error: errorText.slice(0, 500),
      })
      return null
    }

    const data: PostInsightsResponse = await response.json()
    console.log(`[Facebook Insights] Success for ${postId}:`, JSON.stringify(data).slice(0, 300))

    const result = {
      impressions: 0,
      reach: 0,
      engaged_users: 0,
      clicks: 0,
      likes,
      comments,
      shares,
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
    detailedErrors.push({
      platform: 'facebook',
      postId,
      endpoint: 'exception',
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
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
 * Fetch LinkedIn post analytics
 * Note: LinkedIn's API access depends on the type of account:
 * - Personal profiles: Limited to basic engagement via share statistics
 * - Organization pages: Full analytics via organizationalEntityShareStatistics
 */
async function fetchLinkedInInsights(
  postId: string,
  accessToken: string
): Promise<{
  impressions: number
  likes: number
  comments: number
  shares: number
} | null> {
  try {
    // LinkedIn post URNs come in different formats:
    // - urn:li:share:123456789
    // - urn:li:ugcPost:123456789
    // - Just the ID: 123456789

    // Keep the original URN format
    const originalUrn = postId
    console.log(`[LinkedIn] Fetching analytics for: ${originalUrn}`)

    // Try multiple endpoints to get engagement data

    // 1. Try socialActions endpoint (for shares)
    const socialActionsUrl = `${LINKEDIN_API}/socialActions/${encodeURIComponent(originalUrn)}`
    console.log(`[LinkedIn] Trying socialActions: ${socialActionsUrl}`)

    const socialResponse = await fetch(socialActionsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    if (socialResponse.ok) {
      const data = await socialResponse.json()
      console.log(`[LinkedIn] socialActions SUCCESS:`, JSON.stringify(data).slice(0, 500))

      return {
        impressions: 0,
        likes: data.likesSummary?.totalLikes || data.likesCount || 0,
        comments: data.commentsSummary?.totalFirstLevelComments || data.commentsCount || 0,
        shares: data.sharesSummary?.totalShares || 0,
      }
    } else {
      const errorText = await socialResponse.text()
      console.error(`[LinkedIn] socialActions FAILED (${socialResponse.status}):`, errorText.slice(0, 500))
      detailedErrors.push({
        platform: 'linkedin',
        postId: originalUrn,
        endpoint: 'socialActions',
        status: socialResponse.status,
        error: errorText.slice(0, 500),
      })
    }

    // 2. Try reactions endpoint
    const reactionsUrl = `${LINKEDIN_API}/reactions/${encodeURIComponent(originalUrn)}?count=0`
    console.log(`[LinkedIn] Trying reactions: ${reactionsUrl}`)

    const reactionsResponse = await fetch(reactionsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    if (reactionsResponse.ok) {
      const reactionsData = await reactionsResponse.json()
      console.log(`[LinkedIn] reactions SUCCESS:`, JSON.stringify(reactionsData).slice(0, 500))

      return {
        impressions: 0,
        likes: reactionsData.paging?.total || reactionsData.elements?.length || 0,
        comments: 0,
        shares: 0,
      }
    } else {
      const errorText = await reactionsResponse.text()
      console.error(`[LinkedIn] reactions FAILED (${reactionsResponse.status}):`, errorText.slice(0, 500))
      detailedErrors.push({
        platform: 'linkedin',
        postId: originalUrn,
        endpoint: 'reactions',
        status: reactionsResponse.status,
        error: errorText.slice(0, 500),
      })
    }

    // 3. Try the posts endpoint (newer API)
    const postsUrl = `${LINKEDIN_API}/posts/${encodeURIComponent(originalUrn)}`
    console.log(`[LinkedIn] Trying posts: ${postsUrl}`)

    const postsResponse = await fetch(postsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })

    if (postsResponse.ok) {
      const postsData = await postsResponse.json()
      console.log(`[LinkedIn] posts SUCCESS:`, JSON.stringify(postsData).slice(0, 500))

      return {
        impressions: postsData.impressionCount || 0,
        likes: postsData.likeCount || postsData.numLikes || 0,
        comments: postsData.commentCount || postsData.numComments || 0,
        shares: postsData.shareCount || postsData.numShares || 0,
      }
    } else {
      const errorText = await postsResponse.text()
      console.error(`[LinkedIn] posts FAILED (${postsResponse.status}):`, errorText.slice(0, 500))
      detailedErrors.push({
        platform: 'linkedin',
        postId: originalUrn,
        endpoint: 'posts',
        status: postsResponse.status,
        error: errorText.slice(0, 500),
      })
    }

    // If all endpoints failed, return null
    console.log(`[LinkedIn] All endpoints failed for ${postId}`)
    return null

  } catch (error) {
    console.error(`[LinkedIn Insights] Exception for ${postId}:`, error)
    detailedErrors.push({
      platform: 'linkedin',
      postId,
      endpoint: 'exception',
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
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
  // Clear detailed errors from previous requests
  detailedErrors.length = 0

  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get posts to sync (Instagram, Facebook, YouTube, and LinkedIn, last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        provider: { in: ['instagram', 'facebook', 'meta', 'youtube', 'google', 'linkedin'] },
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

    // Get access tokens for Instagram, Facebook, YouTube, and LinkedIn
    // Provider names in database may vary:
    // - Instagram: 'meta' or 'instagram'
    // - Facebook: 'meta' or 'facebook'
    // - YouTube: 'google'
    // - LinkedIn: 'linkedin'
    let instagramToken: string | null = null
    let facebookToken: string | null = null
    let youtubeToken: string | null = null
    let linkedinToken: string | null = null

    // Try to get Instagram token - check 'instagram' first, then 'meta'
    console.log('[Analytics Sync] Attempting to get Instagram token...')
    instagramToken = await tokenManager.getValidAccessToken(profileId, 'instagram')
    if (!instagramToken) {
      console.log('[Analytics Sync] No instagram provider, trying meta...')
      instagramToken = await tokenManager.getValidAccessToken(profileId, 'meta')
    }
    console.log(`[Analytics Sync] Instagram token result: ${instagramToken ? 'SUCCESS' : 'NOT FOUND'}`)

    // Try to get Facebook token - check 'facebook' first, then 'meta'
    console.log('[Analytics Sync] Attempting to get Facebook token...')
    facebookToken = await tokenManager.getValidAccessToken(profileId, 'facebook')
    if (!facebookToken) {
      console.log('[Analytics Sync] No facebook provider, trying meta...')
      facebookToken = await tokenManager.getValidAccessToken(profileId, 'meta')
    }
    console.log(`[Analytics Sync] Facebook token result: ${facebookToken ? 'SUCCESS' : 'NOT FOUND'}`)

    // Exchange Facebook User Token for Page Token (required for post insights)
    let facebookPageToken: string | null = null
    if (facebookToken) {
      console.log('[Analytics Sync] Exchanging Facebook User Token for Page Token...')
      facebookPageToken = await getFacebookPageToken(facebookToken)
      console.log(`[Analytics Sync] Facebook Page Token result: ${facebookPageToken ? 'SUCCESS' : 'NOT FOUND'}`)
    }

    // Try to get YouTube/Google token
    console.log('[Analytics Sync] Attempting to get YouTube token...')
    youtubeToken = await tokenManager.getValidAccessToken(profileId, 'youtube')
    console.log(`[Analytics Sync] YouTube token result: ${youtubeToken ? 'SUCCESS' : 'NOT FOUND'}`)

    // Try to get LinkedIn token
    console.log('[Analytics Sync] Attempting to get LinkedIn token...')
    linkedinToken = await tokenManager.getValidAccessToken(profileId, 'linkedin')
    console.log(`[Analytics Sync] LinkedIn token result: ${linkedinToken ? 'SUCCESS' : 'NOT FOUND'}`)

    // Log token status
    console.log(`[Analytics Sync] Final token status: Instagram=${!!instagramToken}, Facebook=${!!facebookToken}, YouTube=${!!youtubeToken}, LinkedIn=${!!linkedinToken}`)

    // Check if we have any tokens
    if (!instagramToken && !facebookToken && !youtubeToken && !linkedinToken) {
      return NextResponse.json({
        success: false,
        error: 'No connected Instagram, Facebook, YouTube, or LinkedIn account',
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
      // Note: Facebook uses Page Token for analytics, others use User Token
      let accessToken: string | null = null
      if (platform === 'instagram') accessToken = instagramToken
      else if (platform === 'facebook') accessToken = facebookPageToken // Use Page Token, not User Token
      else if (platform === 'youtube') accessToken = youtubeToken
      else if (platform === 'linkedin') accessToken = linkedinToken

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
          insights = {
            impressions: fullInsights.impressions,
            reach: fullInsights.reach,
            likes: fullInsights.likes,
            comments: fullInsights.comments,
            shares: fullInsights.shares,
            saves: 0,
            engaged_users: fullInsights.engaged_users,
          }
          console.log(`[Analytics Sync] Facebook insights for ${post.externalPostId}:`, insights)
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
      } else if (platform === 'linkedin') {
        console.log(`[Analytics Sync] Fetching LinkedIn insights for ${post.externalPostId}`)
        const linkedinInsights = await fetchLinkedInInsights(post.externalPostId, accessToken)

        if (linkedinInsights) {
          insights = {
            likes: linkedinInsights.likes,
            comments: linkedinInsights.comments,
            shares: linkedinInsights.shares,
            reach: linkedinInsights.impressions, // Use impressions as reach for LinkedIn
            impressions: linkedinInsights.impressions,
            saves: 0,
            views: 0,
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
      detailedErrors: detailedErrors.length > 0 ? detailedErrors : undefined,
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

/**
 * GET /api/analytics/sync
 *
 * Debug endpoint to check analytics sync status:
 * - Posts available for each platform
 * - Token availability
 * - Recent posts with their analytics status
 */
export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all posts for supported platforms
    const allPosts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        provider: { in: ['instagram', 'facebook', 'meta', 'youtube', 'google', 'linkedin'] },
        postedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { postedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        provider: true,
        status: true,
        externalPostId: true,
        postedAt: true,
        metadata: true,
        createdAt: true,
      },
    })

    // Group posts by platform and status
    const postsByPlatform: Record<string, {
      total: number
      posted: number
      withExternalId: number
      withAnalytics: number
      statuses: Record<string, number>
    }> = {}

    for (const post of allPosts) {
      const platform = post.provider === 'meta' ? 'instagram' :
                       post.provider === 'google' ? 'youtube' : post.provider

      if (!postsByPlatform[platform]) {
        postsByPlatform[platform] = {
          total: 0,
          posted: 0,
          withExternalId: 0,
          withAnalytics: 0,
          statuses: {},
        }
      }

      postsByPlatform[platform].total++
      postsByPlatform[platform].statuses[post.status] =
        (postsByPlatform[platform].statuses[post.status] || 0) + 1

      if (post.status === 'POSTED') {
        postsByPlatform[platform].posted++
        if (post.externalPostId) {
          postsByPlatform[platform].withExternalId++
        }
        const metadata = post.metadata as Record<string, unknown> | null
        if (metadata?.analytics) {
          postsByPlatform[platform].withAnalytics++
        }
      }
    }

    // Check token availability for each platform
    const tokenStatus: Record<string, {
      available: boolean
      source: string | null
      error: string | null
    }> = {}

    const platforms = ['instagram', 'facebook', 'linkedin', 'youtube'] as const

    for (const platform of platforms) {
      try {
        const token = await tokenManager.getValidAccessToken(profileId, platform)
        tokenStatus[platform] = {
          available: !!token,
          source: token ? 'OAuthConnection or SocialConnection' : null,
          error: token ? null : 'No valid token found',
        }
      } catch (error) {
        tokenStatus[platform] = {
          available: false,
          source: null,
          error: error instanceof Error ? error.message : 'Token lookup failed',
        }
      }
    }

    // Get sample of recent posts with analytics details
    const recentPostsWithDetails = allPosts
      .filter(p => p.status === 'POSTED')
      .slice(0, 10)
      .map(post => {
        const metadata = post.metadata as Record<string, unknown> | null
        const analytics = metadata?.analytics as Record<string, unknown> | null

        return {
          id: post.id,
          platform: post.provider,
          externalPostId: post.externalPostId ?
            `${post.externalPostId.slice(0, 20)}...` : null,
          postedAt: post.postedAt,
          hasAnalytics: !!analytics,
          analyticsSyncedAt: analytics?.syncedAt || null,
          metrics: analytics ? {
            likes: analytics.likes || 0,
            comments: analytics.comments || 0,
            shares: analytics.shares || 0,
            reach: analytics.reach || 0,
            impressions: analytics.impressions || 0,
          } : null,
        }
      })

    // Summary diagnostics
    const diagnostics = {
      totalPostsLast30Days: allPosts.length,
      postsEligibleForSync: allPosts.filter(
        p => p.status === 'POSTED' && p.externalPostId
      ).length,
      postsWithAnalytics: allPosts.filter(p => {
        const metadata = p.metadata as Record<string, unknown> | null
        return metadata?.analytics
      }).length,
      issues: [] as string[],
    }

    // Identify issues
    if (diagnostics.postsEligibleForSync === 0) {
      diagnostics.issues.push(
        'No posts eligible for sync. Posts need status=POSTED and externalPostId set.'
      )
    }

    for (const [platform, status] of Object.entries(tokenStatus)) {
      if (!status.available) {
        diagnostics.issues.push(
          `${platform}: No valid access token - ${status.error}`
        )
      }
    }

    for (const [platform, data] of Object.entries(postsByPlatform)) {
      if (data.posted > 0 && data.withExternalId === 0) {
        diagnostics.issues.push(
          `${platform}: ${data.posted} posted but none have externalPostId`
        )
      }
      if (data.withExternalId > 0 && data.withAnalytics === 0) {
        diagnostics.issues.push(
          `${platform}: ${data.withExternalId} posts with externalPostId but no analytics synced`
        )
      }
    }

    return NextResponse.json({
      debug: true,
      profileId,
      timestamp: new Date().toISOString(),
      tokenStatus,
      postsByPlatform,
      recentPosts: recentPostsWithDetails,
      diagnostics,
    })
  } catch (error) {
    console.error('[Analytics Sync Debug Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Debug endpoint failed',
        code: 'DEBUG_ERROR',
      },
      { status: 500 }
    )
  }
}
