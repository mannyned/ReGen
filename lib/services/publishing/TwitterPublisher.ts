import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// TWITTER/X PUBLISHER
// Uses Twitter API v2
// ============================================

export class TwitterPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'twitter'
  protected baseUrl = API_BASE_URLS.twitter

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options
    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Upload media if present
      let mediaId: string | undefined
      if (media?.mediaUrl) {
        mediaId = await this.uploadMedia(accessToken, media)
      }

      // Step 2: Create tweet
      const tweet = await this.createTweet(accessToken, content, mediaId)

      return {
        success: true,
        platform: this.platform,
        platformPostId: tweet.id,
        platformUrl: `https://twitter.com/i/status/${tweet.id}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to Twitter/X',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    const response = await this.makeApiRequest<{
      data: {
        public_metrics: {
          impression_count: number
          like_count: number
          reply_count: number
          retweet_count: number
          quote_count: number
          bookmark_count: number
        }
      }
    }>(
      `/tweets/${postId}?tweet.fields=public_metrics`,
      { method: 'GET' },
      accessToken
    )

    const metrics = response.data.public_metrics

    return {
      views: metrics.impression_count,
      likes: metrics.like_count,
      comments: metrics.reply_count,
      shares: metrics.retweet_count + metrics.quote_count,
      saves: metrics.bookmark_count,
      reach: metrics.impression_count,
      impressions: metrics.impression_count,
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      await this.makeApiRequest(
        `/tweets/${postId}`,
        { method: 'DELETE' },
        accessToken
      )
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // TWITTER-SPECIFIC HELPERS
  // ============================================

  private async uploadMedia(
    accessToken: string,
    media: ContentPayload
  ): Promise<string> {
    // Twitter media upload uses v1.1 API
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'

    if (media.mediaType === 'video') {
      return this.uploadVideoChunked(accessToken, media)
    }

    // For images, use simple upload
    const formData = new FormData()
    formData.append('media', media.mediaUrl)

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload media: ${error}`)
    }

    const data = await response.json()
    return data.media_id_string
  }

  private async uploadVideoChunked(
    accessToken: string,
    media: ContentPayload
  ): Promise<string> {
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'

    // Step 1: INIT
    const initResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: media.fileSize.toString(),
        media_type: media.mimeType,
        media_category: 'tweet_video',
      }),
    })

    if (!initResponse.ok) {
      throw new Error('Failed to initialize video upload')
    }

    const initData = await initResponse.json()
    const mediaId = initData.media_id_string

    // Step 2: APPEND (chunked upload would happen here)
    // In production, split video into 5MB chunks

    // Step 3: FINALIZE
    const finalizeResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'FINALIZE',
        media_id: mediaId,
      }),
    })

    if (!finalizeResponse.ok) {
      throw new Error('Failed to finalize video upload')
    }

    // Step 4: Wait for processing
    await this.waitForMediaProcessing(accessToken, mediaId)

    return mediaId
  }

  private async waitForMediaProcessing(
    accessToken: string,
    mediaId: string,
    maxAttempts = 30
  ): Promise<void> {
    const statusUrl = `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(statusUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()
      const state = data.processing_info?.state

      if (state === 'succeeded') {
        return
      }

      if (state === 'failed') {
        throw new Error(`Video processing failed: ${data.processing_info?.error?.message}`)
      }

      // Wait before checking again
      const waitTime = data.processing_info?.check_after_secs || 5
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
    }

    throw new Error('Video processing timed out')
  }

  private async createTweet(
    accessToken: string,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> | object },
    mediaId?: string
  ): Promise<{ id: string }> {
    const text = this.formatCaption(content)
    const settings = (content.settings || {}) as Record<string, unknown>

    const tweetData: Record<string, unknown> = {
      text: text.substring(0, 280), // Twitter character limit
    }

    if (mediaId) {
      tweetData.media = {
        media_ids: [mediaId],
      }
    }

    if (settings.replySettings) {
      tweetData.reply_settings = settings.replySettings
    }

    const response = await this.makeApiRequest<{
      data: { id: string }
    }>(
      '/tweets',
      {
        method: 'POST',
        body: JSON.stringify(tweetData),
      },
      accessToken
    )

    return response.data
  }
}

export const twitterPublisher = new TwitterPublisher()
