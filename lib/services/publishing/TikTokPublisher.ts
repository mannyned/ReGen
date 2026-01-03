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
      // Step 1: Initialize video upload
      const uploadInfo = await this.initializeUpload(accessToken, media)

      // Step 2: Upload video chunks
      await this.uploadVideo(uploadInfo, media)

      // Step 3: Create the post
      const postResult = await this.createPost(
        accessToken,
        uploadInfo.publish_id,
        content,
        options.scheduledAt
      )

      return {
        success: true,
        platform: this.platform,
        platformPostId: postResult.publish_id,
        platformUrl: postResult.share_url,
        publishedAt: options.scheduledAt || new Date(),
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

  private async initializeUpload(
    accessToken: string,
    media: ContentPayload
  ): Promise<{
    publish_id: string
    upload_url: string
  }> {
    const response = await this.makeApiRequest<{
      data: {
        publish_id: string
        upload_url: string
      }
    }>(
      '/post/publish/inbox/video/init/',
      {
        method: 'POST',
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: media.fileSize,
            chunk_size: Math.min(media.fileSize, 10 * 1024 * 1024), // 10MB chunks
            total_chunk_count: Math.ceil(media.fileSize / (10 * 1024 * 1024)),
          },
        }),
      },
      accessToken
    )

    return response.data
  }

  private async uploadVideo(
    uploadInfo: { publish_id: string; upload_url: string },
    media: ContentPayload
  ): Promise<void> {
    // In production, this would handle chunked video upload
    // For now, we'll use a direct URL approach
    const response = await fetch(uploadInfo.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': media.mimeType,
        'Content-Range': `bytes 0-${media.fileSize - 1}/${media.fileSize}`,
      },
      body: media.mediaUrl, // In production, this would be the actual file buffer
    })

    if (!response.ok) {
      throw new Error('Failed to upload video to TikTok')
    }
  }

  private async createPost(
    accessToken: string,
    publishId: string,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> | object },
    scheduledAt?: Date
  ): Promise<{
    publish_id: string
    share_url: string
  }> {
    const caption = this.formatCaption(content)
    const settings = (content.settings || {}) as Record<string, unknown>

    const postData: Record<string, unknown> = {
      publish_id: publishId,
      post_info: {
        title: caption.substring(0, 150), // TikTok title limit
        description: caption,
        privacy_level: settings.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disable_comment: settings.allowComments === false,
        disable_duet: settings.allowDuet === false,
        disable_stitch: settings.allowStitch === false,
      },
    }

    // Add scheduled time if provided
    if (scheduledAt) {
      postData.post_info = {
        ...postData.post_info as object,
        schedule_time: Math.floor(scheduledAt.getTime() / 1000),
      }
    }

    const response = await this.makeApiRequest<{
      data: {
        publish_id: string
        share_url: string
      }
    }>(
      '/post/publish/video/init/',
      {
        method: 'POST',
        body: JSON.stringify(postData),
      },
      accessToken
    )

    return response.data
  }
}

export const tiktokPublisher = new TikTokPublisher()
