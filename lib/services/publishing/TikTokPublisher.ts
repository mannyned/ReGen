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

      // Initialize inbox upload with caption/title included
      const uploadInfo = await this.initializeInboxUpload(accessToken, media, caption)

      // Upload video chunks (for FILE_UPLOAD) or let TikTok pull (for PULL_FROM_URL)
      if (media.mediaUrl && this.isDirectUrl(media.mediaUrl)) {
        // TikTok will pull from URL - no upload needed
      } else {
        await this.uploadVideo(uploadInfo, media)
      }

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

  private isDirectUrl(url: string): boolean {
    // Check if URL is from a verified domain that TikTok can pull from
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:'
    } catch {
      return false
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
    media: ContentPayload,
    caption: string
  ): Promise<{
    publish_id: string
    upload_url?: string
  }> {
    // Determine source type based on media
    const isUrlSource = media.mediaUrl && this.isDirectUrl(media.mediaUrl)

    const requestBody: Record<string, unknown> = {
      post_info: {
        title: caption.substring(0, 150), // TikTok title limit
        description: caption,
      },
    }

    if (isUrlSource) {
      // PULL_FROM_URL - TikTok fetches the video
      requestBody.source_info = {
        source: 'PULL_FROM_URL',
        video_url: media.mediaUrl,
      }
    } else {
      // FILE_UPLOAD - We upload the video
      requestBody.source_info = {
        source: 'FILE_UPLOAD',
        video_size: media.fileSize,
        chunk_size: Math.min(media.fileSize, 10 * 1024 * 1024), // 10MB chunks
        total_chunk_count: Math.ceil(media.fileSize / (10 * 1024 * 1024)),
      }
    }

    console.log('[TikTok] Initializing inbox upload:', JSON.stringify(requestBody))

    const response = await this.makeApiRequest<{
      data: {
        publish_id: string
        upload_url?: string
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

    return response.data
  }

  private async uploadVideo(
    uploadInfo: { publish_id: string; upload_url?: string },
    media: ContentPayload
  ): Promise<void> {
    if (!uploadInfo.upload_url) {
      throw new Error('No upload URL provided - use PULL_FROM_URL instead')
    }

    // Fetch the video from the URL and upload to TikTok
    console.log('[TikTok] Fetching video from:', media.mediaUrl)
    const videoResponse = await fetch(media.mediaUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const videoSize = videoBuffer.byteLength

    console.log('[TikTok] Uploading video, size:', videoSize)

    // Upload video to TikTok's upload URL
    const response = await fetch(uploadInfo.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': media.mimeType || 'video/mp4',
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
