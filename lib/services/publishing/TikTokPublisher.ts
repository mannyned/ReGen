import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// TIKTOK PUBLISHER
// Uses TikTok Content Posting API v2
// ============================================

export class TikTokPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'tiktok'
  protected baseUrl = API_BASE_URLS.tiktok

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

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
      // Using video.upload scope - video goes to user's TikTok inbox
      // User will need to open TikTok app to review and publish
      const caption = this.formatCaption(content)

      // Always use FILE_UPLOAD method (PULL_FROM_URL requires domain verification)
      // First fetch the video to get the actual size
      console.log('[TikTok] Fetching video from:', media.mediaUrl)
      const videoResponse = await fetch(media.mediaUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`)
      }
      const videoBuffer = await videoResponse.arrayBuffer()
      const videoSize = videoBuffer.byteLength
      console.log('[TikTok] Video fetched, size:', videoSize)

      // Initialize inbox upload with actual file size
      const uploadInfo = await this.initializeInboxUpload(accessToken, videoSize, caption)

      // Upload the video to TikTok
      await this.uploadVideoBuffer(uploadInfo, videoBuffer, media.mimeType)

      // With video.upload scope, video goes to inbox - no separate publish step
      // User opens TikTok to review and publish
      return {
        success: true,
        platform: this.platform,
        platformPostId: uploadInfo.publish_id,
        publishedAt: new Date(),
        message: 'Video sent to your TikTok inbox. Open TikTok app to review and publish.',
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

  private async initializeInboxUpload(
    accessToken: string,
    videoSize: number,
    caption: string
  ): Promise<{
    publish_id: string
    upload_url: string
  }> {
    // Always use FILE_UPLOAD - PULL_FROM_URL requires domain verification
    const chunkSize = Math.min(videoSize, 10 * 1024 * 1024) // 10MB max chunk size
    const totalChunks = Math.ceil(videoSize / chunkSize)

    const requestBody = {
      post_info: {
        title: caption.substring(0, 150), // TikTok title limit
        description: caption,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunks,
      },
    }

    console.log('[TikTok] Initializing inbox upload:', JSON.stringify(requestBody))

    const response = await this.makeApiRequest<{
      data: {
        publish_id: string
        upload_url: string
      }
    }>(
      '/post/publish/inbox/video/init/',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      accessToken
    )

    console.log('[TikTok] Inbox upload initialized:', JSON.stringify(response.data))

    if (!response.data.upload_url) {
      throw new Error('TikTok did not return an upload URL')
    }

    return response.data
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
