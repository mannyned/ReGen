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

  /**
   * Override validateContent to skip caption length check for Twitter
   * Twitter captions are auto-truncated to 280 chars instead of failing validation
   */
  protected validateContent(content: { caption: string; hashtags: string[] }, media?: ContentPayload): void {
    // Only validate media, skip caption length check (we auto-truncate for Twitter)
    if (media) {
      const limits = { maxVideoLengthSeconds: 140, maxFileSizeMb: 512, supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'webp'] }

      if (media.duration && media.duration > limits.maxVideoLengthSeconds) {
        throw new Error(`Video exceeds maximum duration of ${limits.maxVideoLengthSeconds} seconds for twitter`)
      }

      const fileSizeMb = media.fileSize / (1024 * 1024)
      if (fileSizeMb > limits.maxFileSizeMb) {
        throw new Error(`File exceeds maximum size of ${limits.maxFileSizeMb}MB for twitter`)
      }
    }
    // Caption length is NOT validated - we auto-truncate to 280 chars
  }

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
    // X API v2 media upload supports OAuth 2.0 User Context
    // - Images: Simple upload with 'media' field
    // - Videos: Chunked upload with command=INIT/APPEND/FINALIZE
    // See: https://docs.x.com/x-api/media/quickstart/media-upload-chunked

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
    // X API v2 chunked upload - supports OAuth 2.0 User Context
    // As of Jan 2026, uses dedicated endpoints (command param deprecated):
    // - INIT: POST /2/media/upload/initialize (JSON body)
    // - APPEND: POST /2/media/upload/{id}/append (form-data)
    // - FINALIZE: POST /2/media/upload/{id}/finalize (form-data or JSON)
    // - STATUS: GET /2/media/upload/{id} OR ?command=STATUS&media_id=xxx

    const BASE_URL = 'https://api.x.com/2/media/upload'

    console.log('[TwitterPublisher] Fetching video from URL:', media.mediaUrl)
    const videoResponse = await fetch(media.mediaUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const videoSizeBytes = videoBuffer.byteLength
    console.log('[TwitterPublisher] Video fetched, size:', Math.round(videoSizeBytes / 1024 / 1024), 'MB')

    if (videoSizeBytes > 512 * 1024 * 1024) {
      throw new Error(`Video too large. Maximum size is 512MB.`)
    }

    // Step 1: INIT - Use dedicated /initialize endpoint with JSON
    console.log('[TwitterPublisher] Initializing video upload (INIT)...')

    const initResponse = await fetch(`${BASE_URL}/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: media.mimeType || 'video/mp4',
        media_category: 'tweet_video',
        total_bytes: videoSizeBytes,
      }),
    })

    const initText = await initResponse.text()
    console.log('[TwitterPublisher] INIT response:', initResponse.status, initText)

    if (!initResponse.ok) {
      let errorMsg = initText || 'Empty response'
      try {
        const errorData = JSON.parse(initText)
        if (errorData.errors?.[0]?.message) errorMsg = errorData.errors[0].message
        else if (errorData.detail) errorMsg = errorData.detail
      } catch { /* keep original */ }

      if (initResponse.status === 401 || initResponse.status === 403) {
        throw new Error(`Twitter video upload not authorized (${initResponse.status}). Please reconnect your Twitter account in Settings.`)
      }
      throw new Error(`Twitter video INIT failed (${initResponse.status}): ${errorMsg}`)
    }

    const initData = JSON.parse(initText)
    // Response: {"data":{"id":"...","media_key":"...","expires_after_secs":...}}
    const mediaId = initData.data?.id || initData.id
    console.log('[TwitterPublisher] Got media ID:', mediaId)

    if (!mediaId) {
      throw new Error(`Twitter video INIT succeeded but no media_id: ${initText}`)
    }

    // Step 2: APPEND - Upload chunks to /{id}/append
    const chunkSize = 1 * 1024 * 1024  // 1MB chunks
    const chunks = Math.ceil(videoSizeBytes / chunkSize)

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, videoSizeBytes)
      const chunk = videoBuffer.slice(start, end)

      console.log(`[TwitterPublisher] Uploading chunk ${i + 1}/${chunks} (${Math.round(chunk.byteLength / 1024)}KB)...`)

      const appendFormData = new FormData()
      appendFormData.append('segment_index', i.toString())
      const blob = new Blob([chunk], { type: 'application/octet-stream' })
      appendFormData.append('media', blob)

      const appendResponse = await fetch(`${BASE_URL}/${mediaId}/append`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: appendFormData,
      })

      const appendText = await appendResponse.text()
      console.log(`[TwitterPublisher] APPEND chunk ${i + 1}:`, appendResponse.status, appendText || '(empty)')

      if (!appendResponse.ok) {
        throw new Error(`Twitter APPEND failed (chunk ${i + 1}/${chunks}): ${appendText || appendResponse.status}`)
      }
    }

    // Step 3: FINALIZE - POST to /{id}/finalize with JSON
    console.log('[TwitterPublisher] Finalizing video upload...')

    const finalizeResponse = await fetch(`${BASE_URL}/${mediaId}/finalize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    const finalizeText = await finalizeResponse.text()
    console.log('[TwitterPublisher] FINALIZE response:', finalizeResponse.status, finalizeText)

    if (!finalizeResponse.ok) {
      throw new Error(`Twitter FINALIZE failed (${finalizeResponse.status}): ${finalizeText}`)
    }

    // Parse response, handle non-JSON gracefully
    let finalizeData: any = {}
    try {
      if (finalizeText && finalizeText.trim()) {
        finalizeData = JSON.parse(finalizeText)
      }
    } catch (parseErr) {
      console.warn('[TwitterPublisher] FINALIZE response not JSON:', finalizeText)
      // If response is empty or not JSON but status was OK, continue
    }

    const processingInfo = finalizeData.data?.processing_info || finalizeData.processing_info

    if (processingInfo) {
      console.log('[TwitterPublisher] Video processing, state:', processingInfo.state)
      await this.waitForMediaProcessing(accessToken, String(mediaId))
    } else {
      // No processing_info might mean video is ready, or we need to poll anyway
      // For safety, always poll for video status
      console.log('[TwitterPublisher] No processing_info, polling status to be safe...')
      await this.waitForMediaProcessing(accessToken, String(mediaId))
    }

    console.log('[TwitterPublisher] Video upload complete, media ID:', mediaId)
    return String(mediaId)
  }

  private async waitForMediaProcessing(
    accessToken: string,
    mediaId: string,
    maxAttempts = 30  // Reduced from 60 to avoid Vercel timeout
  ): Promise<void> {
    // Try both STATUS endpoint formats
    const STATUS_URL_V2 = `https://api.x.com/2/media/upload/${mediaId}`
    const STATUS_URL_QUERY = `https://api.x.com/2/media/upload?command=STATUS&media_id=${mediaId}`

    let consecutiveFailures = 0
    const MAX_FAILURES = 5  // After 5 failures, assume video is ready and try posting

    for (let i = 0; i < maxAttempts; i++) {
      console.log(`[TwitterPublisher] Checking processing status (attempt ${i + 1}/${maxAttempts})...`)

      // Try dedicated endpoint first, fall back to query param format
      let response = await fetch(STATUS_URL_V2, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      let responseText = await response.text()
      console.log(`[TwitterPublisher] STATUS v2 response (${response.status}):`, responseText.substring(0, 200))

      // If dedicated endpoint fails, try query param format
      if (!response.ok || responseText.includes('error')) {
        console.log('[TwitterPublisher] Trying query param STATUS format...')
        response = await fetch(STATUS_URL_QUERY, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        responseText = await response.text()
        console.log(`[TwitterPublisher] STATUS query response (${response.status}):`, responseText.substring(0, 200))
      }

      if (!response.ok) {
        consecutiveFailures++
        console.warn(`[TwitterPublisher] STATUS check failed (${consecutiveFailures}/${MAX_FAILURES})`)

        if (consecutiveFailures >= MAX_FAILURES) {
          console.log('[TwitterPublisher] Too many STATUS failures - assuming video ready, will try posting')
          return
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
        continue
      }

      consecutiveFailures = 0  // Reset on success

      // Parse response
      let data: any = {}
      try {
        if (responseText && responseText.trim()) {
          data = JSON.parse(responseText)
        }
      } catch {
        console.warn('[TwitterPublisher] STATUS not JSON, assuming ready')
        return
      }

      const processingInfo = data.data?.processing_info || data.processing_info
      const state = processingInfo?.state
      console.log(`[TwitterPublisher] Processing state: ${state || 'none'}`)

      if (!processingInfo || state === 'succeeded') {
        console.log('[TwitterPublisher] Video ready!')
        return
      }

      if (state === 'failed') {
        const errorMsg = processingInfo?.error?.message || 'Video processing failed'
        throw new Error(`Video processing failed: ${errorMsg}`)
      }

      // Wait before next check (max 5 seconds to avoid timeout)
      const waitTime = Math.min(processingInfo?.check_after_secs || 3, 5)
      console.log(`[TwitterPublisher] Waiting ${waitTime}s...`)
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
    }

    // If we hit max attempts, try posting anyway - it might work
    console.log('[TwitterPublisher] Max attempts reached - proceeding with post attempt')
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
