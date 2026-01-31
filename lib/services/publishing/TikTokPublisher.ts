import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'
import { prisma } from '../../db'

// ============================================
// TIKTOK PUBLISHER
// Uses TikTok Content Posting API v2
//
// Direct publish flow (AUDITED app):
// - Video publishes directly to user's profile
// - Endpoint: /post/publish/video/init/
//
// See: https://developers.tiktok.com/doc/content-sharing-guidelines/
// ============================================

// TikTok privacy levels (for reference - used when user publishes from TikTok app)
// - PUBLIC_TO_EVERYONE: Visible to everyone
// - MUTUAL_FOLLOW_FRIENDS: Visible to mutual followers
// - FOLLOWER_OF_CREATOR: Visible to followers only
// - SELF_ONLY: Private/draft

export class TikTokPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'tiktok'
  protected baseUrl = API_BASE_URLS.tiktok

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media, tiktokSettings } = options as PublishOptions & {
      tiktokSettings?: {
        privacyLevel: string | null
        disableComments: boolean
        disableDuet: boolean
        disableStitch: boolean
        brandContentToggle: boolean
        brandContentType: string | null
      }
    }

    // TikTok requires video content
    if (!media || media.mediaType !== 'video') {
      return {
        success: false,
        platform: this.platform,
        error: 'TikTok requires video content. Images and text-only posts are not supported.',
      }
    }

    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Using video.publish scope - direct publish to TikTok
      const caption = this.formatCaption(content)

      // First fetch the video to get the actual size
      console.log('[TikTok] Fetching video from:', media.mediaUrl)
      const videoResponse = await fetch(media.mediaUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`)
      }
      const videoBuffer = await videoResponse.arrayBuffer()
      const videoSize = videoBuffer.byteLength
      console.log('[TikTok] Video fetched, size:', videoSize)

      // Initialize direct publish upload with actual file size and TikTok settings
      const uploadInfo = await this.initializeDirectPublish(accessToken, videoSize, caption, tiktokSettings)

      // Upload the video to TikTok
      await this.uploadVideoBuffer(uploadInfo, videoBuffer, media.mimeType)

      // Check publish status - video.publish allows direct publishing
      const publishStatus = await this.checkPublishStatus(accessToken, uploadInfo.publish_id)

      if (publishStatus.status === 'FAILED') {
        throw new Error(publishStatus.fail_reason || 'TikTok publish failed')
      }

      // Get TikTok username from OAuth connection metadata for proper URL
      let platformUrl: string | undefined
      if (publishStatus.video_id) {
        try {
          const connection = await prisma.oAuthConnection.findUnique({
            where: {
              profileId_provider: {
                profileId: userId,
                provider: 'tiktok',
              },
            },
            select: { metadata: true },
          })
          const metadata = connection?.metadata as Record<string, unknown> | null
          const username = metadata?.displayName || metadata?.username
          if (username) {
            platformUrl = `https://www.tiktok.com/@${username}/video/${publishStatus.video_id}`
          }
        } catch (e) {
          console.warn('[TikTok] Could not fetch username for URL:', e)
        }
      }

      return {
        success: true,
        platform: this.platform,
        platformPostId: publishStatus.video_id || uploadInfo.publish_id,
        publishedAt: new Date(),
        platformUrl,
        message: publishStatus.status === 'PUBLISH_COMPLETE'
          ? 'Video published to TikTok!'
          : 'Video is being processed and will appear on your TikTok profile shortly.',
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to TikTok',
      }
    }
  }


  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    const response = await this.makeApiRequest<{
      data: {
        videos: Array<{
          view_count: number
          like_count: number
          comment_count: number
          share_count: number
        }>
      }
    }>(
      `/video/query/?filters={"video_ids":["${postId}"]}&fields=view_count,like_count,comment_count,share_count`,
      { method: 'POST' },
      accessToken
    )

    const video = response.data.videos[0]

    return {
      views: video?.view_count || 0,
      likes: video?.like_count || 0,
      comments: video?.comment_count || 0,
      shares: video?.share_count || 0,
      saves: 0, // TikTok doesn't expose saves
      reach: video?.view_count || 0,
      impressions: video?.view_count || 0,
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    // TikTok doesn't support deleting posts via API
    console.warn('TikTok does not support deleting posts via API')
    return false
  }

  // ============================================
  // TIKTOK-SPECIFIC HELPERS
  // ============================================

  /**
   * Initialize direct publish upload (for audited apps)
   * Video publishes directly to user's TikTok profile
   *
   * TikTok API requirements:
   * - For videos < 64MB: upload as single chunk (chunk_size = video_size, total_chunk_count = 1)
   * - For videos >= 64MB: use chunked upload (chunk_size between 5MB-64MB)
   *
   * Content Sharing Guidelines compliance:
   * - privacy_level, disable_duet, disable_stitch, disable_comment are passed when available
   * - brand_content_toggle and brand_organic_toggle for commercial content disclosure
   */
  private async initializeDirectPublish(
    accessToken: string,
    videoSize: number,
    caption: string,
    tiktokSettings?: {
      privacyLevel: string | null
      disableComments: boolean
      disableDuet: boolean
      disableStitch: boolean
      brandContentToggle: boolean
      brandContentType: string | null
    }
  ): Promise<{
    publish_id: string
    upload_url: string
  }> {
    // Validate video size
    if (!videoSize || videoSize <= 0) {
      throw new Error('Invalid video size: ' + videoSize)
    }

    const MAX_SINGLE_UPLOAD_SIZE = 64 * 1024 * 1024 // 64MB
    const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB per chunk for large files

    // For videos under 64MB, upload as single chunk
    // For larger videos, use chunked upload
    let chunkSize: number
    let totalChunks: number

    if (videoSize <= MAX_SINGLE_UPLOAD_SIZE) {
      // Single chunk upload - chunk_size equals video_size
      chunkSize = videoSize
      totalChunks = 1
    } else {
      // Chunked upload for large files
      chunkSize = CHUNK_SIZE
      totalChunks = Math.ceil(videoSize / chunkSize)
    }

    // Build post_info with TikTok settings for Content Sharing Guidelines compliance
    const postInfo: Record<string, unknown> = {
      title: caption.substring(0, 150), // TikTok title limit
      video_cover_timestamp_ms: 1000, // Use frame at 1 second as cover
    }

    // Add TikTok settings if provided (Content Sharing Guidelines requirements)
    if (tiktokSettings) {
      if (tiktokSettings.privacyLevel) {
        postInfo.privacy_level = tiktokSettings.privacyLevel
      }
      postInfo.disable_comment = tiktokSettings.disableComments
      postInfo.disable_duet = tiktokSettings.disableDuet
      postInfo.disable_stitch = tiktokSettings.disableStitch

      // Commercial content disclosure
      if (tiktokSettings.brandContentToggle) {
        if (tiktokSettings.brandContentType === 'YOUR_BRAND') {
          // "Your Brand" - Promotional content label
          postInfo.brand_organic_toggle = true
          postInfo.brand_content_toggle = false
        } else if (tiktokSettings.brandContentType === 'BRANDED_CONTENT') {
          // "Branded Content" - Paid partnership label
          postInfo.brand_content_toggle = true
          postInfo.brand_organic_toggle = false
        }
      }
    }

    const requestBody = {
      post_info: postInfo,
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunks,
      },
    }

    console.log('[TikTok] Initializing direct publish:', JSON.stringify(requestBody))
    console.log(`[TikTok] Video size: ${videoSize} bytes, Chunk size: ${chunkSize}, Total chunks: ${totalChunks}`)

    // Use direct publish endpoint (audited app - publishes directly to profile)
    const response = await this.makeApiRequest<{
      data: {
        publish_id: string
        upload_url: string
      }
    }>(
      '/post/publish/video/init/',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      accessToken
    )

    console.log('[TikTok] Direct publish initialized:', JSON.stringify(response.data))

    if (!response.data.upload_url) {
      throw new Error('TikTok did not return an upload URL')
    }

    return response.data
  }

  /**
   * Check publish status after upload
   * Returns the status and video ID once published
   */
  private async checkPublishStatus(
    accessToken: string,
    publishId: string,
    maxAttempts: number = 10
  ): Promise<{
    status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'PUBLISH_COMPLETE' | 'FAILED'
    video_id?: string
    fail_reason?: string
  }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`[TikTok] Checking publish status (attempt ${attempt + 1}/${maxAttempts})`)

      const response = await this.makeApiRequest<{
        data: {
          status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'PUBLISH_COMPLETE' | 'FAILED'
          publicaly_available_post_id?: string[]
          fail_reason?: string
        }
      }>(
        '/post/publish/status/fetch/',
        {
          method: 'POST',
          body: JSON.stringify({ publish_id: publishId }),
        },
        accessToken
      )

      const status = response.data.status
      console.log('[TikTok] Publish status:', status)

      // If complete or failed, return immediately
      if (status === 'PUBLISH_COMPLETE') {
        return {
          status,
          video_id: response.data.publicaly_available_post_id?.[0],
        }
      }

      if (status === 'FAILED') {
        return {
          status,
          fail_reason: response.data.fail_reason,
        }
      }

      // Still processing, wait before next check
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
    }

    // If we've exhausted attempts, return the last known status
    return {
      status: 'PROCESSING_UPLOAD',
    }
  }

  private async uploadVideoBuffer(
    uploadInfo: { publish_id: string; upload_url: string },
    videoBuffer: ArrayBuffer,
    mimeType?: string
  ): Promise<void> {
    const videoSize = videoBuffer.byteLength

    console.log('[TikTok] Uploading video to TikTok, size:', videoSize)

    // Upload video to TikTok's upload URL
    const response = await fetch(uploadInfo.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType || 'video/mp4',
        'Content-Length': String(videoSize),
        'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
      },
      body: videoBuffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TikTok] Upload failed:', response.status, errorText)
      throw new Error(`Failed to upload video to TikTok: ${response.status}`)
    }

    console.log('[TikTok] Video uploaded successfully')
  }
}

export const tiktokPublisher = new TikTokPublisher()
