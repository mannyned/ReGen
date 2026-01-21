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
      // Step 1: Try to upload media if present
      let mediaId: string | undefined
      let mediaSkipped = false
      let mediaSkipReason = ''

      if (media?.mediaUrl) {
        try {
          mediaId = await this.uploadMedia(accessToken, media)
        } catch (mediaError) {
          const errorMsg = mediaError instanceof Error ? mediaError.message : 'Unknown error'
          console.error('[TwitterPublisher] Media upload failed:', errorMsg)

          // For videos, don't fallback to text-only - fail the whole publish
          // Users expect their video to be posted, not just text
          if (media.mediaType === 'video') {
            throw new Error(`Video upload failed: ${errorMsg}`)
          }

          // For images, we can fallback to text-only with a warning
          console.warn('[TwitterPublisher] Posting without image due to upload failure')
          mediaSkipped = true
          mediaSkipReason = errorMsg
        }
      }

      // Step 2: Create tweet (with or without media)
      const tweet = await this.createTweet(accessToken, content, mediaId)

      return {
        success: true,
        platform: this.platform,
        platformPostId: tweet.id,
        platformUrl: `https://twitter.com/i/status/${tweet.id}`,
        publishedAt: new Date(),
        message: mediaSkipped ? `Posted without image: ${mediaSkipReason}` : undefined,
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
    // X API v2 media upload
    // - Images: Simple one-shot upload to POST /2/media/upload with 'media' field
    // - Videos: Use dedicated chunked endpoints (/initialize, /append, /finalize)
    // See: https://devcommunity.x.com/t/media-upload-endpoints-update-and-extended-migration-deadline/241818

    if (media.mediaType === 'video') {
      return this.uploadVideoChunkedV2(accessToken, media)
    }

    // For images, fetch first
    const imageUrl = media.mediaUrl
    console.log('[TwitterPublisher] Fetching image from URL:', imageUrl)

    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error(`Invalid image URL format: ${imageUrl?.substring(0, 100)}. Expected full HTTP URL.`)
    }

    const imageResponse = await fetch(imageUrl, {
      headers: { 'User-Agent': 'ReGenr/1.0' },
    })

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text().catch(() => '')
      throw new Error(`Failed to fetch image (${imageResponse.status}): ${errorText.substring(0, 100)}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageSizeBytes = imageBuffer.byteLength
    const imageSizeKB = Math.round(imageSizeBytes / 1024)
    console.log('[TwitterPublisher] Image fetched, size:', imageSizeKB, 'KB')

    if (imageSizeBytes > 5 * 1024 * 1024) {
      throw new Error(`Image too large for Twitter (${imageSizeKB}KB). Maximum is 5MB.`)
    }

    // X API v2 simple/one-shot upload for images
    // POST /2/media/upload with 'media' field containing the binary file
    const V2_UPLOAD_URL = 'https://api.x.com/2/media/upload'

    console.log('[TwitterPublisher] Uploading image via one-shot upload...')
    const formData = new FormData()
    // Send binary data as a Blob in the 'media' field
    const blob = new Blob([imageBuffer], { type: media.mimeType || 'image/jpeg' })
    formData.append('media', blob, 'image.jpg')
    // media_category is REQUIRED for v2 API
    formData.append('media_category', 'tweet_image')

    const response = await fetch(V2_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    const responseText = await response.text()
    console.log('[TwitterPublisher] Upload response:', response.status)
    console.log('[TwitterPublisher] Upload response body:', responseText)

    if (!response.ok) {
      throw new Error(`Twitter upload failed (${response.status}): ${responseText.substring(0, 200)}`)
    }

    const data = JSON.parse(responseText)
    // v2 API may return id in different formats - try all possibilities
    const mediaId = data.id || data.media_id_string || data.media_id || data.data?.id || data.data?.media_id_string
    console.log('[TwitterPublisher] Parsed response data:', JSON.stringify(data))
    console.log('[TwitterPublisher] Media ID extracted:', mediaId)

    if (!mediaId) {
      throw new Error(`Twitter upload succeeded but no media_id in response: ${responseText.substring(0, 300)}`)
    }

    return mediaId
  }

  private async uploadVideoChunkedV2(
    accessToken: string,
    media: ContentPayload
  ): Promise<string> {
    // X API v2 chunked video upload uses POST /2/media/upload with command parameter
    // All requests use multipart/form-data
    // See: https://docs.x.com/x-api/media/quickstart/media-upload-chunked

    const UPLOAD_URL = 'https://api.x.com/2/media/upload'

    console.log('[TwitterPublisher] Fetching video from URL:', media.mediaUrl)
    const videoResponse = await fetch(media.mediaUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const videoSizeBytes = videoBuffer.byteLength
    console.log('[TwitterPublisher] Video fetched, size:', Math.round(videoSizeBytes / 1024 / 1024), 'MB')

    // Step 1: INIT - Initialize the upload session
    console.log('[TwitterPublisher] Initializing video upload (INIT)...')
    const initFormData = new FormData()
    initFormData.append('command', 'INIT')
    initFormData.append('media_type', media.mimeType || 'video/mp4')
    initFormData.append('total_bytes', videoSizeBytes.toString())
    initFormData.append('media_category', 'tweet_video')

    const initResponse = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: initFormData,
    })

    const initText = await initResponse.text()
    console.log('[TwitterPublisher] INIT response:', initResponse.status, initText)

    if (!initResponse.ok) {
      throw new Error(`Twitter video INIT failed (${initResponse.status}): ${initText}`)
    }

    const initData = JSON.parse(initText)
    const mediaId = initData.id || initData.media_id_string || initData.media_id
    console.log('[TwitterPublisher] Got media ID:', mediaId)

    if (!mediaId) {
      throw new Error(`Twitter video INIT succeeded but no media_id in response: ${initText}`)
    }

    // Step 2: APPEND - Upload video in chunks (max 5MB per chunk)
    const chunkSize = 5 * 1024 * 1024
    const chunks = Math.ceil(videoSizeBytes / chunkSize)

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, videoSizeBytes)
      const chunk = videoBuffer.slice(start, end)

      console.log(`[TwitterPublisher] Uploading chunk ${i + 1}/${chunks} (${Math.round(chunk.byteLength / 1024)}KB)...`)

      const appendFormData = new FormData()
      appendFormData.append('command', 'APPEND')
      appendFormData.append('media_id', mediaId)
      appendFormData.append('segment_index', i.toString())
      // Send chunk as binary blob
      const blob = new Blob([chunk], { type: 'application/octet-stream' })
      appendFormData.append('media', blob, `chunk_${i}.mp4`)

      const appendResponse = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: appendFormData,
      })

      if (!appendResponse.ok) {
        const error = await appendResponse.text()
        throw new Error(`Twitter video APPEND failed (chunk ${i + 1}/${chunks}): ${error}`)
      }
      console.log(`[TwitterPublisher] Chunk ${i + 1}/${chunks} uploaded successfully`)
    }

    // Step 3: FINALIZE - Complete the upload
    console.log('[TwitterPublisher] Finalizing video upload (FINALIZE)...')
    const finalizeFormData = new FormData()
    finalizeFormData.append('command', 'FINALIZE')
    finalizeFormData.append('media_id', mediaId)

    const finalizeResponse = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: finalizeFormData,
    })

    const finalizeText = await finalizeResponse.text()
    console.log('[TwitterPublisher] FINALIZE response:', finalizeResponse.status, finalizeText)

    if (!finalizeResponse.ok) {
      throw new Error(`Twitter video FINALIZE failed (${finalizeResponse.status}): ${finalizeText}`)
    }

    const finalizeData = JSON.parse(finalizeText)

    // Check if async processing is needed (for videos)
    if (finalizeData.processing_info) {
      console.log('[TwitterPublisher] Video needs processing, waiting...')
      await this.waitForMediaProcessingV2(accessToken, mediaId)
    }

    console.log('[TwitterPublisher] Video upload complete, media ID:', mediaId)
    return mediaId
  }

  private async waitForMediaProcessingV2(
    accessToken: string,
    mediaId: string,
    maxAttempts = 30
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`https://api.x.com/2/media/upload?command=STATUS&media_id=${mediaId}`, {
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

      const waitTime = data.processing_info?.check_after_secs || 5
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
    }

    throw new Error('Video processing timed out')
  }

  // Keep old method for backwards compatibility but it won't be used
  private async uploadMediaLegacy(
    accessToken: string,
    media: ContentPayload
  ): Promise<string> {
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'
    // This requires OAuth 1.0a which we don't support
    throw new Error('Legacy v1.1 media upload requires OAuth 1.0a')
  }

  // Old video upload method - replaced by uploadVideoChunkedV2
  private async uploadVideoChunkedOld(
    accessToken: string,
    media: ContentPayload
  ): Promise<string> {
    // Redirect to v2 method
    return this.uploadVideoChunkedV2(accessToken, media)
  }

  private async uploadMediaSimple(
    accessToken: string,
    media: ContentPayload
  ): Promise<string> {
    // Simple upload attempt for small images
    console.log('[TwitterPublisher] Trying simple upload...')
    const imageResponse = await fetch(media.mediaUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const response = await fetch('https://api.x.com/2/media/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_data: base64Image,
        media_category: 'tweet_image',
      }),
    })

    const responseText = await response.text()
    console.log('[TwitterPublisher] Upload response status:', response.status)
    console.log('[TwitterPublisher] Upload response:', responseText.substring(0, 500))

    if (!response.ok) {
      // Parse error for better message
      let errorMsg = responseText
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.errors?.[0]?.message) {
          errorMsg = errorData.errors[0].message
        } else if (errorData.error) {
          errorMsg = errorData.error
        } else if (errorData.detail) {
          errorMsg = errorData.detail
        }
      } catch {
        // Keep original error text
      }

      // Check for scope/permission issues
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Twitter auth error (${response.status}): ${errorMsg}. You may need to reconnect Twitter in Settings to get media.write permission.`)
      }

      throw new Error(`Twitter upload failed (${response.status}): ${errorMsg}`)
    }

    const data = JSON.parse(responseText)
    // v2 API returns media_id in the response
    const mediaId = data.media_id_string || data.data?.media_id_string || data.data?.id
    console.log('[TwitterPublisher] Media uploaded, ID:', mediaId)
    return mediaId
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
