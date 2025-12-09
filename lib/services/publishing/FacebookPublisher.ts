import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// FACEBOOK PUBLISHER
// Uses Facebook Graph API v19
// ============================================

export class FacebookPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'facebook'
  protected baseUrl = API_BASE_URLS.facebook

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options
    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Get the page ID and page access token
      const page = await this.getPageInfo(accessToken)

      let postId: string

      if (media.mediaType === 'video') {
        postId = await this.publishVideo(page.accessToken, page.id, media, content)
      } else if (media.mediaType === 'image') {
        postId = await this.publishPhoto(page.accessToken, page.id, media, content)
      } else {
        postId = await this.publishText(page.accessToken, page.id, content)
      }

      return {
        success: true,
        platform: this.platform,
        platformPostId: postId,
        platformUrl: `https://www.facebook.com/${postId}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to Facebook',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    const response = await fetch(
      `${this.baseUrl}/${postId}/insights?metric=post_impressions,post_impressions_unique,post_engaged_users,post_reactions_by_type_total,post_clicks&access_token=${accessToken}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch post analytics')
    }

    const data = await response.json()
    const metrics = data.data?.reduce(
      (acc: Record<string, number>, item: { name: string; values: Array<{ value: number }> }) => {
        acc[item.name] = item.values[0]?.value || 0
        return acc
      },
      {}
    )

    // Get comments and shares count
    const engagementResponse = await fetch(
      `${this.baseUrl}/${postId}?fields=shares,comments.summary(true)&access_token=${accessToken}`
    )
    const engagement = await engagementResponse.json()

    return {
      views: 0, // Facebook doesn't provide video views in insights
      likes: metrics.post_reactions_by_type_total?.like || 0,
      comments: engagement.comments?.summary?.total_count || 0,
      shares: engagement.shares?.count || 0,
      saves: 0,
      reach: metrics.post_impressions_unique || 0,
      impressions: metrics.post_impressions || 0,
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      const response = await fetch(
        `${this.baseUrl}/${postId}?access_token=${accessToken}`,
        { method: 'DELETE' }
      )
      return response.ok
    } catch {
      return false
    }
  }

  // ============================================
  // FACEBOOK-SPECIFIC HELPERS
  // ============================================

  private async getPageInfo(accessToken: string): Promise<{
    id: string
    name: string
    accessToken: string
  }> {
    const response = await fetch(
      `${this.baseUrl}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    )

    if (!response.ok) {
      throw new Error('Failed to get Facebook pages')
    }

    const data = await response.json()
    const page = data.data?.[0]

    if (!page) {
      throw new Error('No Facebook page found')
    }

    return {
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
    }
  }

  private async publishText(
    pageAccessToken: string,
    pageId: string,
    content: { caption: string; hashtags: string[] }
  ): Promise<string> {
    const message = this.formatCaption(content)

    const response = await fetch(
      `${this.baseUrl}/${pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          access_token: pageAccessToken,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to publish text post: ${error}`)
    }

    const data = await response.json()
    return data.id
  }

  private async publishPhoto(
    pageAccessToken: string,
    pageId: string,
    media: ContentPayload,
    content: { caption: string; hashtags: string[] }
  ): Promise<string> {
    const message = this.formatCaption(content)

    const response = await fetch(
      `${this.baseUrl}/${pageId}/photos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: media.mediaUrl,
          caption: message,
          access_token: pageAccessToken,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to publish photo: ${error}`)
    }

    const data = await response.json()
    return data.post_id || data.id
  }

  private async publishVideo(
    pageAccessToken: string,
    pageId: string,
    media: ContentPayload,
    content: { caption: string; hashtags: string[] }
  ): Promise<string> {
    const description = this.formatCaption(content)

    // Use resumable upload for videos
    // Step 1: Start upload session
    const startResponse = await fetch(
      `${this.baseUrl}/${pageId}/videos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upload_phase: 'start',
          file_size: media.fileSize,
          access_token: pageAccessToken,
        }),
      }
    )

    if (!startResponse.ok) {
      throw new Error('Failed to start video upload')
    }

    const startData = await startResponse.json()
    const uploadSessionId = startData.upload_session_id
    const videoId = startData.video_id

    // Step 2: Transfer video (in production, would be chunked)
    const transferResponse = await fetch(
      `${this.baseUrl}/${pageId}/videos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upload_phase: 'transfer',
          upload_session_id: uploadSessionId,
          start_offset: 0,
          video_file_chunk: media.mediaUrl, // In production, actual video chunk
          access_token: pageAccessToken,
        }),
      }
    )

    if (!transferResponse.ok) {
      throw new Error('Failed to transfer video')
    }

    // Step 3: Finish upload
    const finishResponse = await fetch(
      `${this.baseUrl}/${pageId}/videos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upload_phase: 'finish',
          upload_session_id: uploadSessionId,
          description,
          access_token: pageAccessToken,
        }),
      }
    )

    if (!finishResponse.ok) {
      throw new Error('Failed to finish video upload')
    }

    return videoId
  }

  // ============================================
  // FACEBOOK REELS SUPPORT
  // ============================================

  async publishReel(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

    if (media.mediaType !== 'video') {
      throw new Error('Reels must be video content')
    }

    const accessToken = await this.getAccessToken(userId)
    const page = await this.getPageInfo(accessToken)

    try {
      const description = this.formatCaption(content)

      const response = await fetch(
        `${this.baseUrl}/${page.id}/video_reels`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_url: media.mediaUrl,
            description,
            access_token: page.accessToken,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to publish Reel: ${error}`)
      }

      const data = await response.json()

      return {
        success: true,
        platform: this.platform,
        platformPostId: data.id,
        platformUrl: `https://www.facebook.com/reel/${data.id}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish Reel',
      }
    }
  }
}

export const facebookPublisher = new FacebookPublisher()
