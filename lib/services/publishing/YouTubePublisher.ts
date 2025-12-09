import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// YOUTUBE PUBLISHER
// Uses YouTube Data API v3
// ============================================

export class YouTubePublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'youtube'
  protected baseUrl = API_BASE_URLS.youtube

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options
    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Initialize resumable upload
      const uploadUrl = await this.initializeResumableUpload(
        accessToken,
        media,
        content,
        options.scheduledAt
      )

      // Step 2: Upload video
      const videoId = await this.uploadVideo(uploadUrl, media)

      // Step 3: Set thumbnail if provided
      if (content.settings?.coverPhoto) {
        await this.setThumbnail(accessToken, videoId, content.settings.coverPhoto as string)
      }

      return {
        success: true,
        platform: this.platform,
        platformPostId: videoId,
        platformUrl: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: options.scheduledAt || new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to YouTube',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    // Get video statistics
    const statsResponse = await this.makeApiRequest<{
      items: Array<{
        statistics: {
          viewCount: string
          likeCount: string
          commentCount: string
        }
      }>
    }>(
      `/videos?part=statistics&id=${postId}`,
      { method: 'GET' },
      accessToken
    )

    // Get analytics data
    const analyticsResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views,estimatedMinutesWatched,averageViewDuration,shares&dimensions=video&filters=video==${postId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const stats = statsResponse.items[0]?.statistics

    return {
      views: parseInt(stats?.viewCount || '0'),
      likes: parseInt(stats?.likeCount || '0'),
      comments: parseInt(stats?.commentCount || '0'),
      shares: 0, // YouTube doesn't expose shares easily
      saves: 0,
      reach: parseInt(stats?.viewCount || '0'),
      impressions: parseInt(stats?.viewCount || '0'),
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      await fetch(`${this.baseUrl}/videos?id=${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // YOUTUBE-SPECIFIC HELPERS
  // ============================================

  private async initializeResumableUpload(
    accessToken: string,
    media: ContentPayload,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> },
    scheduledAt?: Date
  ): Promise<string> {
    const settings = content.settings || {}
    const tags = content.hashtags?.map(tag => tag.replace('#', '')) || []

    const videoMetadata = {
      snippet: {
        title: (settings.title as string) || content.caption.substring(0, 100),
        description: this.formatCaption(content),
        tags,
        categoryId: (settings.categoryId as string) || '22', // People & Blogs
      },
      status: {
        privacyStatus: settings.privacyStatus || 'private',
        selfDeclaredMadeForKids: settings.madeForKids === true,
        publishAt: scheduledAt?.toISOString(),
      },
    }

    const response = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': media.fileSize.toString(),
          'X-Upload-Content-Type': media.mimeType,
        },
        body: JSON.stringify(videoMetadata),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to initialize upload: ${error}`)
    }

    const uploadUrl = response.headers.get('Location')
    if (!uploadUrl) {
      throw new Error('No upload URL returned')
    }

    return uploadUrl
  }

  private async uploadVideo(
    uploadUrl: string,
    media: ContentPayload
  ): Promise<string> {
    // In production, this would handle chunked upload with resume capability
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': media.fileSize.toString(),
      },
      body: media.mediaUrl, // In production, actual video buffer
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload video: ${error}`)
    }

    const result = await response.json()
    return result.id
  }

  private async setThumbnail(
    accessToken: string,
    videoId: string,
    thumbnailUrl: string
  ): Promise<void> {
    await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: thumbnailUrl, // In production, actual image buffer
      }
    )
  }

  // ============================================
  // YOUTUBE SHORTS SUPPORT
  // ============================================

  async publishShort(options: PublishOptions): Promise<PublishResult> {
    // YouTube Shorts are regular videos with specific requirements:
    // - Vertical aspect ratio (9:16)
    // - Duration <= 60 seconds
    // - #Shorts hashtag in title or description

    const updatedContent = {
      ...options.content,
      hashtags: [...(options.content.hashtags || []), 'Shorts'],
    }

    return this.publishContent({
      ...options,
      content: updatedContent,
    })
  }
}

export const youtubePublisher = new YouTubePublisher()
