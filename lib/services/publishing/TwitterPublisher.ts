import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type {
  SocialPlatform,
  PublishResult,
  PostAnalytics,
  CarouselPublishOptions,
  PlatformCarouselResult,
  CarouselItem,
} from '../../types/social'
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
  // TWITTER MULTI-IMAGE SUPPORT
  // ============================================

  /**
   * Publish a multi-image tweet to Twitter/X (up to 4 images)
   * Note: Twitter does not support videos in multi-media tweets
   */
  async publishCarousel(options: CarouselPublishOptions): Promise<PlatformCarouselResult> {
    const { userId, items, content } = options

    if (items.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: 'No items provided for tweet',
        itemsPublished: 0,
        itemsTruncated: 0,
      }
    }

    // Filter to images only - Twitter multi-image tweets don't support videos
    const imageItems = items.filter(item => !item.mimeType.startsWith('video/'))
    const videoSkipped = items.length - imageItems.length

    // Prepare items (validate, truncate to max 4)
    const { validItems, truncatedCount } = this.prepareCarouselItems(imageItems)

    // If only 1 item, use regular post
    if (validItems.length === 1) {
      const result = await this.publishContent({
        userId,
        content,
        media: {
          mediaUrl: validItems[0].mediaUrl,
          mediaType: 'image',
          mimeType: validItems[0].mimeType,
          fileSize: validItems[0].fileSize,
        },
      })

      return {
        platform: this.platform,
        success: result.success,
        postId: result.platformPostId,
        postUrl: result.platformUrl,
        itemIds: result.platformPostId ? [result.platformPostId] : undefined,
        itemsPublished: result.success ? 1 : 0,
        itemsTruncated: truncatedCount + videoSkipped,
        error: result.error,
        message: videoSkipped > 0 ? 'Videos were skipped (Twitter multi-image tweets only support images)' : undefined,
        publishedAt: result.publishedAt,
      }
    }

    if (validItems.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: 'No valid images for Twitter multi-image tweet (videos are not supported)',
        itemsPublished: 0,
        itemsTruncated: items.length,
      }
    }

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Upload each image and collect media IDs
      console.log(`[TwitterPublisher] Uploading ${validItems.length} images`)
      const mediaIds: string[] = []

      for (const item of validItems) {
        const mediaId = await this.uploadMedia(accessToken, {
          mediaUrl: item.mediaUrl,
          mediaType: 'image',
          mimeType: item.mimeType,
          fileSize: item.fileSize,
        })
        mediaIds.push(mediaId)
      }

      // Step 2: Create tweet with all media IDs
      console.log('[TwitterPublisher] Creating tweet with', mediaIds.length, 'images')
      const tweet = await this.createTweetWithMultipleMedia(accessToken, content, mediaIds)

      console.log('[TwitterPublisher] Multi-image tweet created:', tweet.id)

      return {
        platform: this.platform,
        success: true,
        postId: tweet.id,
        postUrl: `https://twitter.com/i/status/${tweet.id}`,
        itemIds: mediaIds,
        itemsPublished: mediaIds.length,
        itemsTruncated: truncatedCount + videoSkipped,
        message: videoSkipped > 0 ? 'Videos were skipped (Twitter multi-image tweets only support images)' : undefined,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[TwitterPublisher] Multi-image tweet failed:', error)
      return {
        platform: this.platform,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish multi-image tweet',
        itemsPublished: 0,
        itemsTruncated: truncatedCount + videoSkipped,
      }
    }
  }

  /**
   * Create a tweet with multiple media attachments
   */
  private async createTweetWithMultipleMedia(
    accessToken: string,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> | object },
    mediaIds: string[]
  ): Promise<{ id: string }> {
    const text = this.formatCaption(content)
    const settings = (content.settings || {}) as Record<string, unknown>

    const tweetData: Record<string, unknown> = {
      text: text.substring(0, 280), // Twitter character limit
      media: {
        media_ids: mediaIds, // Array of media IDs
      },
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

    // For images, fetch the image and convert to base64
    console.log('[TwitterPublisher] Fetching image from URL:', media.mediaUrl)
    const imageResponse = await fetch(media.mediaUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    console.log('[TwitterPublisher] Image fetched, size:', imageBuffer.byteLength, 'bytes')

    // Upload using base64 media_data parameter
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        media_data: base64Image,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[TwitterPublisher] Upload failed:', error)
      throw new Error(`Failed to upload media: ${error}`)
    }

    const data = await response.json()
    console.log('[TwitterPublisher] Media uploaded, ID:', data.media_id_string)
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
