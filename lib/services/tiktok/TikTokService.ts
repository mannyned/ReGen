/**
 * TikTok Service
 *
 * Handles all TikTok API interactions:
 * - Display API: Video list, user info, metrics
 * - Content Posting API: Post videos via PULL_FROM_URL or FILE_UPLOAD
 *
 * Uses the universal OAuth engine for token management.
 */

import { getAccessToken, refreshTokens } from '@/lib/oauth/engine'
import { prisma } from '@/lib/db'
import type {
  TikTokVideo,
  TikTokVideoListResponse,
  TikTokMetrics,
  TikTokVideoWithMetrics,
  TikTokCachedMetrics,
  TikTokPostOptions,
  TikTokPostResult,
  TikTokInitUploadResponse,
  TikTokApiResponse,
  TikTokApiVideoListResponse,
  TikTokApiVideo,
  TikTokPrivacyLevel,
} from '@/lib/types/tiktok'

// ============================================
// CONFIGURATION
// ============================================

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2'

// Verified domains for PULL_FROM_URL posting
// Add your production domains here
const VERIFIED_DOMAINS = [
  'regenr.app',
  'www.regenr.app',
  // Add staging/dev domains as needed
]

// Cache duration for metrics (in milliseconds)
const METRICS_CACHE_DURATION = 60 * 60 * 1000 // 1 hour

// ============================================
// TIKTOK SERVICE CLASS
// ============================================

export class TikTokService {
  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Get a valid access token for TikTok API calls
   * Automatically refreshes if expired
   */
  private async getValidAccessToken(profileId: string): Promise<string> {
    const accessToken = await getAccessToken('tiktok', profileId)
    return accessToken
  }

  // ============================================
  // VIDEO LIST (Display API)
  // ============================================

  /**
   * List user's TikTok videos
   * Uses Display API /v2/video/list/
   */
  async listVideos(
    profileId: string,
    cursor?: string,
    maxCount: number = 20
  ): Promise<TikTokVideoListResponse> {
    const accessToken = await this.getValidAccessToken(profileId)

    const fields = [
      'id',
      'create_time',
      'cover_image_url',
      'share_url',
      'video_description',
      'duration',
      'title',
      'embed_html',
      'embed_link',
      'like_count',
      'comment_count',
      'share_count',
      'view_count',
    ].join(',')

    const body: Record<string, unknown> = {
      max_count: maxCount,
    }

    if (cursor) {
      body.cursor = parseInt(cursor, 10)
    }

    const response = await fetch(`${TIKTOK_API_BASE}/video/list/?fields=${fields}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `TikTok API error: ${errorData.error?.message || response.statusText}`
      )
    }

    const data: TikTokApiResponse<TikTokApiVideoListResponse> = await response.json()

    if (data.error) {
      throw new Error(`TikTok API error: ${data.error.message}`)
    }

    const videos: TikTokVideo[] = data.data.videos.map((v) => this.mapApiVideoToVideo(v))

    return {
      videos,
      cursor: data.data.has_more ? String(data.data.cursor) : null,
      hasMore: data.data.has_more,
    }
  }

  /**
   * Map TikTok API video object to our internal type
   */
  private mapApiVideoToVideo(apiVideo: TikTokApiVideo): TikTokVideo {
    return {
      id: apiVideo.id,
      createTime: apiVideo.create_time,
      coverImageUrl: apiVideo.cover_image_url,
      shareUrl: apiVideo.share_url,
      videoDescription: apiVideo.video_description,
      duration: apiVideo.duration,
      title: apiVideo.title,
      embedHtml: apiVideo.embed_html,
      embedLink: apiVideo.embed_link,
      height: apiVideo.height,
      width: apiVideo.width,
    }
  }

  // ============================================
  // VIDEO METRICS (Display API + Caching)
  // ============================================

  /**
   * Get metrics for a specific video
   * Checks cache first, fetches from API if not cached or stale
   */
  async getVideoMetrics(
    profileId: string,
    videoId: string
  ): Promise<TikTokCachedMetrics> {
    // Check cache first
    const cached = await this.getCachedMetrics(profileId, videoId)
    if (cached) {
      return cached
    }

    // Fetch fresh metrics from API
    const freshMetrics = await this.fetchVideoMetrics(profileId, videoId)

    // Cache the metrics
    await this.cacheMetrics(profileId, videoId, freshMetrics)

    return {
      videoId,
      metrics: freshMetrics,
      fetchedAt: new Date(),
      cached: false,
    }
  }

  /**
   * Get cached metrics from database
   */
  private async getCachedMetrics(
    profileId: string,
    videoId: string
  ): Promise<TikTokCachedMetrics | null> {
    const cached = await prisma.tikTokVideoMetrics.findFirst({
      where: {
        profileId,
        tiktokVideoId: videoId,
        fetchedAt: {
          gte: new Date(Date.now() - METRICS_CACHE_DURATION),
        },
      },
      orderBy: {
        fetchedAt: 'desc',
      },
    })

    if (!cached) return null

    return {
      videoId,
      metrics: cached.metrics as TikTokMetrics,
      fetchedAt: cached.fetchedAt,
      cached: true,
    }
  }

  /**
   * Fetch metrics from TikTok API
   * Uses the video list endpoint with a single video filter
   */
  private async fetchVideoMetrics(
    profileId: string,
    videoId: string
  ): Promise<TikTokMetrics> {
    const accessToken = await this.getValidAccessToken(profileId)

    const fields = [
      'id',
      'like_count',
      'comment_count',
      'share_count',
      'view_count',
    ].join(',')

    // Note: TikTok doesn't have a single video endpoint
    // We use video/list with the video info from our cache
    // In production, you might need to list videos and find the one you need
    const response = await fetch(
      `${TIKTOK_API_BASE}/video/query/?fields=${fields}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            video_ids: [videoId],
          },
        }),
      }
    )

    if (!response.ok) {
      // Return zeros if we can't fetch (video might be private/deleted)
      return { views: 0, likes: 0, comments: 0, shares: 0 }
    }

    const data = await response.json()
    const video = data.data?.videos?.[0]

    return {
      views: video?.view_count || 0,
      likes: video?.like_count || 0,
      comments: video?.comment_count || 0,
      shares: video?.share_count || 0,
    }
  }

  /**
   * Cache metrics in database
   */
  private async cacheMetrics(
    profileId: string,
    videoId: string,
    metrics: TikTokMetrics
  ): Promise<void> {
    await prisma.tikTokVideoMetrics.create({
      data: {
        profileId,
        tiktokVideoId: videoId,
        metrics,
        fetchedAt: new Date(),
      },
    })
  }

  /**
   * Get videos with their metrics (for UI display)
   */
  async getVideosWithMetrics(
    profileId: string,
    cursor?: string
  ): Promise<{ videos: TikTokVideoWithMetrics[]; hasMore: boolean; cursor: string | null }> {
    const { videos, hasMore, cursor: nextCursor } = await this.listVideos(profileId, cursor)

    // Fetch metrics for each video (in parallel)
    const videosWithMetrics = await Promise.all(
      videos.map(async (video) => {
        try {
          const { metrics, fetchedAt } = await this.getVideoMetrics(profileId, video.id)
          return {
            ...video,
            metrics,
            metricsFetchedAt: fetchedAt,
          }
        } catch {
          return {
            ...video,
            metrics: null,
            metricsFetchedAt: undefined,
          }
        }
      })
    )

    return { videos: videosWithMetrics, hasMore, cursor: nextCursor }
  }

  // ============================================
  // POSTING (Content Posting API)
  // ============================================

  /**
   * Post a video to TikTok
   * Uses PULL_FROM_URL by default, falls back to FILE_UPLOAD
   */
  async postVideo(
    profileId: string,
    options: TikTokPostOptions
  ): Promise<TikTokPostResult> {
    // Create a record in our database first
    const post = await prisma.tikTokPost.create({
      data: {
        profileId,
        contentUploadId: options.contentUploadId,
        caption: options.caption,
        privacyLevel: options.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disableComment: options.disableComments || false,
        disableDuet: options.disableDuet || false,
        disableStitch: options.disableStitch || false,
        scheduledAt: options.scheduledAt,
        status: options.scheduledAt ? 'SCHEDULED' : 'PENDING',
      },
    })

    try {
      // Try PULL_FROM_URL first if we have a URL from a verified domain
      if (options.videoUrl && this.isVerifiedDomain(options.videoUrl)) {
        try {
          return await this.postFromUrl(profileId, post.id, options)
        } catch (pullError) {
          console.warn('[TikTokService] PULL_FROM_URL failed, trying FILE_UPLOAD', pullError)
        }
      }

      // Fallback to FILE_UPLOAD
      if (options.videoFile || options.contentUploadId) {
        return await this.postViaUpload(profileId, post.id, options)
      }

      throw new Error('No video source provided (videoUrl or videoFile required)')
    } catch (error) {
      // Update post status to failed
      await prisma.tikTokPost.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      return {
        success: false,
        postId: post.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to post to TikTok',
      }
    }
  }

  /**
   * Check if a URL is from a verified domain
   */
  private isVerifiedDomain(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return VERIFIED_DOMAINS.some(
        (domain) =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`)
      )
    } catch {
      return false
    }
  }

  /**
   * Post using PULL_FROM_URL method
   * TikTok pulls the video from your server
   */
  private async postFromUrl(
    profileId: string,
    postId: string,
    options: TikTokPostOptions
  ): Promise<TikTokPostResult> {
    const accessToken = await this.getValidAccessToken(profileId)

    // Update status to uploading
    await prisma.tikTokPost.update({
      where: { id: postId },
      data: { status: 'UPLOADING' },
    })

    const postInfo: Record<string, unknown> = {
      title: options.caption.substring(0, 150), // TikTok title limit
      privacy_level: options.privacyLevel || 'PUBLIC_TO_EVERYONE',
      disable_comment: options.disableComments || false,
      disable_duet: options.disableDuet || false,
      disable_stitch: options.disableStitch || false,
    }

    // Add scheduled time if provided
    if (options.scheduledAt) {
      postInfo.schedule_time = Math.floor(options.scheduledAt.getTime() / 1000)
    }

    const response = await fetch(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: postInfo,
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: options.videoUrl,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `TikTok publish error: ${errorData.error?.message || response.statusText}`
      )
    }

    const data = await response.json()

    // Update post record
    await prisma.tikTokPost.update({
      where: { id: postId },
      data: {
        status: options.scheduledAt ? 'SCHEDULED' : 'PROCESSING',
        publishId: data.data?.publish_id,
      },
    })

    return {
      success: true,
      postId,
      status: options.scheduledAt ? 'scheduled' : 'processing',
      publishId: data.data?.publish_id,
    }
  }

  /**
   * Post using FILE_UPLOAD method
   * Upload video file directly to TikTok
   */
  private async postViaUpload(
    profileId: string,
    postId: string,
    options: TikTokPostOptions
  ): Promise<TikTokPostResult> {
    const accessToken = await this.getValidAccessToken(profileId)

    // Get the video file
    let videoBuffer: Buffer
    let videoSize: number

    if (options.videoFile) {
      if (Buffer.isBuffer(options.videoFile)) {
        videoBuffer = options.videoFile
        videoSize = videoBuffer.length
      } else {
        // Fetch from URL
        const videoResponse = await fetch(options.videoFile)
        videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
        videoSize = videoBuffer.length
      }
    } else if (options.contentUploadId) {
      // Get video from our storage
      const contentUpload = await prisma.contentUpload.findUnique({
        where: { id: options.contentUploadId },
      })
      if (!contentUpload) {
        throw new Error('Content upload not found')
      }
      // Fetch the video from our storage
      const videoResponse = await fetch(contentUpload.originalUrl)
      videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
      videoSize = videoBuffer.length
    } else {
      throw new Error('No video source provided')
    }

    // Update status to uploading
    await prisma.tikTokPost.update({
      where: { id: postId },
      data: { status: 'UPLOADING' },
    })

    // Step 1: Initialize upload
    const chunkSize = Math.min(videoSize, 10 * 1024 * 1024) // 10MB max
    const totalChunks = Math.ceil(videoSize / chunkSize)

    const initResponse = await fetch(
      `${TIKTOK_API_BASE}/post/publish/inbox/video/init/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: chunkSize,
            total_chunk_count: totalChunks,
          },
        }),
      }
    )

    if (!initResponse.ok) {
      const errorData = await initResponse.json().catch(() => ({}))
      throw new Error(
        `TikTok upload init error: ${errorData.error?.message || initResponse.statusText}`
      )
    }

    const initData: TikTokApiResponse<TikTokInitUploadResponse> = await initResponse.json()
    const { publish_id: publishId, upload_url: uploadUrl } = initData.data

    // Step 2: Upload video chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, videoSize)
      const chunk = videoBuffer.subarray(start, end)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': String(chunk.length),
          'Content-Range': `bytes ${start}-${end - 1}/${videoSize}`,
        },
        body: chunk,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`)
      }
    }

    // Step 3: Finalize the post
    const postInfo: Record<string, unknown> = {
      title: options.caption.substring(0, 150),
      privacy_level: options.privacyLevel || 'PUBLIC_TO_EVERYONE',
      disable_comment: options.disableComments || false,
      disable_duet: options.disableDuet || false,
      disable_stitch: options.disableStitch || false,
    }

    if (options.scheduledAt) {
      postInfo.schedule_time = Math.floor(options.scheduledAt.getTime() / 1000)
    }

    const finalizeResponse = await fetch(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publish_id: publishId,
          post_info: postInfo,
        }),
      }
    )

    if (!finalizeResponse.ok) {
      const errorData = await finalizeResponse.json().catch(() => ({}))
      throw new Error(
        `TikTok finalize error: ${errorData.error?.message || finalizeResponse.statusText}`
      )
    }

    const finalizeData = await finalizeResponse.json()

    // Update post record
    await prisma.tikTokPost.update({
      where: { id: postId },
      data: {
        status: options.scheduledAt ? 'SCHEDULED' : 'PROCESSING',
        publishId,
      },
    })

    return {
      success: true,
      postId,
      status: options.scheduledAt ? 'scheduled' : 'processing',
      publishId,
    }
  }

  // ============================================
  // POST STATUS & MANAGEMENT
  // ============================================

  /**
   * Get a TikTok post by ID
   */
  async getPost(postId: string) {
    return prisma.tikTokPost.findUnique({
      where: { id: postId },
      include: {
        contentUpload: true,
      },
    })
  }

  /**
   * Get user's TikTok posts
   */
  async getUserPosts(profileId: string, limit: number = 20) {
    return prisma.tikTokPost.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        contentUpload: true,
      },
    })
  }

  /**
   * Update post status (called by webhook or polling)
   */
  async updatePostStatus(
    postId: string,
    status: 'POSTED' | 'FAILED',
    tiktokVideoId?: string,
    error?: string
  ) {
    return prisma.tikTokPost.update({
      where: { id: postId },
      data: {
        status,
        tiktokVideoId,
        postedAt: status === 'POSTED' ? new Date() : undefined,
        lastError: error,
      },
    })
  }

  // ============================================
  // CONNECTION STATUS
  // ============================================

  /**
   * Check TikTok connection status
   */
  async getConnectionStatus(profileId: string) {
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: 'tiktok',
        },
      },
    })

    if (!connection) {
      return { connected: false }
    }

    const metadata = connection.metadata as Record<string, unknown> | null

    return {
      connected: true,
      username: metadata?.displayName as string | undefined,
      avatarUrl: metadata?.avatarUrl as string | undefined,
      scopes: connection.scopes,
      expiresAt: connection.expiresAt?.toISOString(),
    }
  }
}

// Singleton instance
export const tiktokService = new TikTokService()
