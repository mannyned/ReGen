/**
 * Pinterest Publishing Service
 *
 * Handles publishing content to Pinterest via the Pinterest API v5.
 *
 * Supports:
 * - Image pins (via image URL)
 * - Video pins (uploaded to Pinterest servers)
 * - Carousel pins (2-5 images, no videos)
 *
 * Video Pin Flow:
 * 1. Register media upload with Pinterest
 * 2. Upload video to Pinterest's servers
 * 3. Wait for processing (poll status)
 * 4. Create pin with video media_id
 *
 * @see https://developers.pinterest.com/docs/api/v5/
 */

import type {
  SocialPlatform,
  PublishResult,
  PostAnalytics,
  CarouselItem,
  CarouselPublishOptions,
  PlatformCarouselResult,
} from '../../types/social'
import { BasePlatformPublisher, PublishOptions } from './BasePlatformPublisher'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// PINTEREST PUBLISHER
// ============================================

class PinterestPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'pinterest'
  protected baseUrl: string = API_BASE_URLS.pinterest

  /**
   * Override getAccessToken to support sandbox token
   * If PINTEREST_SANDBOX_TOKEN is set, use it instead of OAuth token
   */
  protected async getAccessToken(userId: string): Promise<string> {
    const sandboxToken = process.env.PINTEREST_SANDBOX_TOKEN
    if (sandboxToken) {
      console.log('[PinterestPublisher] Using SANDBOX token')
      return sandboxToken
    }
    return super.getAccessToken(userId)
  }

  /**
   * Publish a pin to Pinterest (image or video)
   */
  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

    // Debug logging
    console.log('[PinterestPublisher] publishContent called with:', {
      userId,
      hasContent: !!content,
      hasMedia: !!media,
      mediaUrl: media?.mediaUrl,
      mimeType: media?.mimeType,
      contentSettings: content?.settings,
      boardId: content?.settings?.boardId,
    })

    try {
      const accessToken = await this.getAccessToken(userId)

      // Pinterest requires a board ID
      const boardId = content.settings?.boardId

      if (!boardId) {
        return {
          success: false,
          platform: this.platform,
          error:
            'No board selected. Please select a Pinterest board to pin to.',
        }
      }

      // Pinterest requires media
      if (!media?.mediaUrl) {
        return {
          success: false,
          platform: this.platform,
          error: 'Pinterest requires an image or video for pins.',
        }
      }

      const isVideo = media.mimeType?.startsWith('video/')

      // Build pin data based on media type
      let pinData: Record<string, any>

      if (isVideo) {
        // Video pin - requires uploading to Pinterest first
        console.log(`[PinterestPublisher] Processing video pin...`)

        const mediaId = await this.uploadVideoToPinterest(accessToken, media.mediaUrl)

        if (!mediaId) {
          return {
            success: false,
            platform: this.platform,
            error: 'Failed to upload video to Pinterest. Please try again.',
          }
        }

        pinData = {
          board_id: boardId,
          media_source: {
            source_type: 'video_id',
            media_id: mediaId,
          },
        }
      } else {
        // Image pin - use URL directly (works for both sandbox and production)
        console.log('[PinterestPublisher] Creating image pin with URL:', media.mediaUrl)
        pinData = {
          board_id: boardId,
          media_source: {
            source_type: 'image_url',
            url: media.mediaUrl,
          },
        }
      }

      // Add title and description
      if (content.settings?.title) {
        pinData.title = content.settings.title.substring(0, 100) // Max 100 chars
      }

      if (content.caption) {
        pinData.description = content.caption.substring(0, 500) // Max 500 chars
      }

      // Add link if provided
      if (content.settings?.link) {
        pinData.link = content.settings.link
      }

      // Add alt text for accessibility (images only)
      if (!isVideo && content.settings?.altText) {
        pinData.alt_text = content.settings.altText.substring(0, 500)
      }

      console.log(`[PinterestPublisher] Creating ${isVideo ? 'video' : 'image'} pin on board ${boardId}`, {
        hasTitle: !!pinData.title,
        hasDescription: !!pinData.description,
        hasLink: !!pinData.link,
        isVideo,
        mediaSource: pinData.media_source,
      })

      console.log('[PinterestPublisher] Full pinData:', JSON.stringify(pinData, null, 2))

      const response = await fetch(`${this.baseUrl}/pins`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pinData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[PinterestPublisher] API error:', errorData)
        return {
          success: false,
          platform: this.platform,
          error: `Pinterest API error: ${errorData.message || response.status} ${response.statusText}`,
        }
      }

      const data = await response.json()

      const pinUrl = `https://www.pinterest.com/pin/${data.id}`

      console.log(`[PinterestPublisher] Published successfully:`, {
        pinId: data.id,
        pinUrl,
        isVideo,
      })

      return {
        success: true,
        platform: this.platform,
        platformPostId: data.id,
        platformUrl: pinUrl,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[PinterestPublisher] Publish error:', error)
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Upload video to Pinterest and return the media_id
   *
   * Pinterest video upload flow:
   * 1. POST /media to register the upload
   * 2. Upload video to the provided upload_url
   * 3. Poll GET /media/{media_id} until status is 'succeeded'
   * 4. Return media_id for use in pin creation
   */
  private async uploadVideoToPinterest(accessToken: string, videoUrl: string): Promise<string | null> {
    try {
      // Step 1: Register media upload
      console.log('[PinterestPublisher] Registering video upload...')

      const registerResponse = await fetch(`${this.baseUrl}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'video',
        }),
      })

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}))
        console.error('[PinterestPublisher] Media registration failed:', {
          status: registerResponse.status,
          statusText: registerResponse.statusText,
          error: errorData,
          url: `${this.baseUrl}/media`,
        })
        return null
      }

      const registerData = await registerResponse.json()
      const mediaId = registerData.media_id
      const uploadUrl = registerData.upload_url
      const uploadParameters = registerData.upload_parameters || {}

      console.log('[PinterestPublisher] Media registered:', { mediaId })

      // Step 2: Fetch video from URL
      console.log('[PinterestPublisher] Fetching video from URL...')
      const videoResponse = await fetch(videoUrl)

      if (!videoResponse.ok) {
        console.error('[PinterestPublisher] Failed to fetch video:', videoResponse.status)
        return null
      }

      const videoBlob = await videoResponse.blob()
      console.log('[PinterestPublisher] Video fetched:', { size: videoBlob.size })

      // Step 3: Upload video to Pinterest's upload URL
      console.log('[PinterestPublisher] Uploading video to Pinterest...')

      // Pinterest uses multipart form upload with specific parameters
      const formData = new FormData()

      // Add upload parameters from Pinterest
      for (const [key, value] of Object.entries(uploadParameters)) {
        formData.append(key, value as string)
      }

      // Add the video file
      formData.append('file', videoBlob, 'video.mp4')

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '')
        console.error('[PinterestPublisher] Video upload failed:', uploadResponse.status, errorText)
        return null
      }

      console.log('[PinterestPublisher] Video uploaded successfully')

      // Step 4: Poll for processing status
      console.log('[PinterestPublisher] Waiting for video processing...')

      const maxAttempts = 30 // Max 5 minutes (30 * 10 seconds)
      let attempts = 0

      while (attempts < maxAttempts) {
        await this.sleep(10000) // Wait 10 seconds between polls

        const statusResponse = await fetch(`${this.baseUrl}/media/${mediaId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!statusResponse.ok) {
          console.error('[PinterestPublisher] Status check failed:', statusResponse.status)
          attempts++
          continue
        }

        const statusData = await statusResponse.json()
        const status = statusData.status

        console.log(`[PinterestPublisher] Video status: ${status} (attempt ${attempts + 1})`)

        if (status === 'succeeded') {
          console.log('[PinterestPublisher] Video processing complete!')
          return mediaId
        }

        if (status === 'failed') {
          console.error('[PinterestPublisher] Video processing failed')
          return null
        }

        // Status is 'registered' or 'processing', continue polling
        attempts++
      }

      console.error('[PinterestPublisher] Video processing timed out')
      return null
    } catch (error) {
      console.error('[PinterestPublisher] Video upload error:', error)
      return null
    }
  }

  /**
   * Upload image to Pinterest and return the media_id
   * Similar to video upload but for images (required for sandbox)
   */
  private async uploadImageToPinterest(accessToken: string, imageUrl: string): Promise<string | null> {
    try {
      // Step 1: Register media upload for image
      console.log('[PinterestPublisher] Registering image upload...')

      const registerResponse = await fetch(`${this.baseUrl}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'image',
        }),
      })

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}))
        console.error('[PinterestPublisher] Image registration failed:', {
          status: registerResponse.status,
          error: errorData,
        })
        return null
      }

      const registerData = await registerResponse.json()
      const mediaId = registerData.media_id
      const uploadUrl = registerData.upload_url
      const uploadParameters = registerData.upload_parameters || {}

      console.log('[PinterestPublisher] Image media registered:', { mediaId })

      // Step 2: Fetch image from URL
      console.log('[PinterestPublisher] Fetching image from URL...')
      const imageResponse = await fetch(imageUrl)

      if (!imageResponse.ok) {
        console.error('[PinterestPublisher] Failed to fetch image:', imageResponse.status)
        return null
      }

      const imageBlob = await imageResponse.blob()
      console.log('[PinterestPublisher] Image fetched:', { size: imageBlob.size, type: imageBlob.type })

      // Step 3: Upload image to Pinterest's upload URL
      console.log('[PinterestPublisher] Uploading image to Pinterest...')

      const formData = new FormData()

      // Add upload parameters from Pinterest
      for (const [key, value] of Object.entries(uploadParameters)) {
        formData.append(key, value as string)
      }

      // Add the image file
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg'
      formData.append('file', imageBlob, `image.${extension}`)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '')
        console.error('[PinterestPublisher] Image upload failed:', uploadResponse.status, errorText)
        return null
      }

      console.log('[PinterestPublisher] Image uploaded successfully')

      // Step 4: Poll for processing status (images should be quick)
      console.log('[PinterestPublisher] Waiting for image processing...')

      const maxAttempts = 10 // Images process faster than videos
      let attempts = 0

      while (attempts < maxAttempts) {
        await this.sleep(2000) // Wait 2 seconds between polls

        const statusResponse = await fetch(`${this.baseUrl}/media/${mediaId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!statusResponse.ok) {
          console.error('[PinterestPublisher] Image status check failed:', statusResponse.status)
          attempts++
          continue
        }

        const statusData = await statusResponse.json()
        const status = statusData.status

        console.log(`[PinterestPublisher] Image status: ${status} (attempt ${attempts + 1})`)

        if (status === 'succeeded') {
          console.log('[PinterestPublisher] Image processing complete!')
          return mediaId
        }

        if (status === 'failed') {
          console.error('[PinterestPublisher] Image processing failed')
          return null
        }

        attempts++
      }

      console.error('[PinterestPublisher] Image processing timed out')
      return null
    } catch (error) {
      console.error('[PinterestPublisher] Image upload error:', error)
      return null
    }
  }

  /**
   * Helper to sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Publish a carousel pin (2-5 images)
   */
  async publishCarousel(options: CarouselPublishOptions): Promise<PlatformCarouselResult> {
    const { userId, items, content, contentType } = options

    try {
      const accessToken = await this.getAccessToken(userId)

      // Pinterest requires a board ID
      const boardId = content.settings?.boardId

      if (!boardId) {
        return {
          platform: this.platform,
          success: false,
          error: 'No board selected. Please select a Pinterest board to pin to.',
          itemsPublished: 0,
          itemsTruncated: 0,
        }
      }

      // Prepare and validate carousel items
      const { validItems, truncatedCount, hasUnsupportedMedia } = this.prepareCarouselItems(items)

      if (validItems.length < 2) {
        // Pinterest carousels require at least 2 images
        // If we only have 1, fall back to single pin
        if (validItems.length === 1) {
          const singleResult = await this.publishContent({
            userId,
            content,
            media: {
              mediaUrl: validItems[0].mediaUrl,
              mediaType: 'image',
              mimeType: validItems[0].mimeType,
              fileSize: validItems[0].fileSize,
            },
            contentType,
          })

          return {
            platform: this.platform,
            success: singleResult.success,
            postId: singleResult.platformPostId,
            postUrl: singleResult.platformUrl,
            itemsPublished: singleResult.success ? 1 : 0,
            itemsTruncated: truncatedCount,
            error: singleResult.error,
            message: 'Only 1 valid image - published as single pin instead of carousel',
            publishedAt: singleResult.publishedAt,
          }
        }

        return {
          platform: this.platform,
          success: false,
          error: hasUnsupportedMedia
            ? 'Pinterest carousels only support images (no videos)'
            : 'Pinterest carousels require at least 2 images',
          itemsPublished: 0,
          itemsTruncated: items.length,
        }
      }

      // Build carousel pin data
      const carouselItems = validItems.map((item, index) => ({
        title: item.caption?.substring(0, 100) || `Image ${index + 1}`,
        description: item.caption?.substring(0, 500) || '',
        link: content.settings?.link || '',
        media_source: {
          source_type: 'image_url',
          url: item.mediaUrl,
        },
      }))

      const pinData: Record<string, any> = {
        board_id: boardId,
        carousel_slots: carouselItems,
      }

      // Add title if provided
      if (content.settings?.title) {
        pinData.title = content.settings.title.substring(0, 100)
      }

      // Add description from caption
      if (content.caption) {
        pinData.description = content.caption.substring(0, 500)
      }

      console.log(`[PinterestPublisher] Creating carousel pin with ${validItems.length} items`, {
        boardId,
        truncated: truncatedCount,
      })

      const response = await fetch(`${this.baseUrl}/pins`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pinData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[PinterestPublisher] Carousel API error:', errorData)
        return {
          platform: this.platform,
          success: false,
          error: `Pinterest API error: ${errorData.message || response.status}`,
          itemsPublished: 0,
          itemsTruncated: items.length,
        }
      }

      const data = await response.json()
      const pinUrl = `https://www.pinterest.com/pin/${data.id}`

      console.log(`[PinterestPublisher] Carousel published successfully:`, {
        pinId: data.id,
        itemCount: validItems.length,
      })

      return {
        platform: this.platform,
        success: true,
        postId: data.id,
        postUrl: pinUrl,
        itemsPublished: validItems.length,
        itemsTruncated: truncatedCount,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[PinterestPublisher] Carousel error:', error)
      return {
        platform: this.platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        itemsPublished: 0,
        itemsTruncated: items.length,
      }
    }
  }

  /**
   * Get pin analytics from Pinterest
   */
  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    try {
      const accessToken = await this.getAccessToken(userId)

      const response = await fetch(
        `${this.baseUrl}/pins/${postId}/analytics?start_date=${this.getDateDaysAgo(30)}&end_date=${this.getToday()}&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`)
      }

      const data = await response.json()

      // Sum up the daily metrics
      let impressions = 0
      let saves = 0
      let clicks = 0
      let outboundClicks = 0

      if (data.all?.daily_metrics) {
        for (const day of data.all.daily_metrics) {
          impressions += day.data_status === 'READY' ? (day.metrics?.IMPRESSION || 0) : 0
          saves += day.data_status === 'READY' ? (day.metrics?.SAVE || 0) : 0
          clicks += day.data_status === 'READY' ? (day.metrics?.PIN_CLICK || 0) : 0
          outboundClicks += day.data_status === 'READY' ? (day.metrics?.OUTBOUND_CLICK || 0) : 0
        }
      }

      return {
        views: clicks, // Pin clicks as views
        likes: 0, // Pinterest doesn't have likes
        comments: 0, // Pinterest doesn't have comments on pins
        shares: 0,
        saves: saves,
        reach: 0,
        impressions: impressions,
        demographics: {
          ageRanges: {},
          genders: {},
          countries: {},
        },
        locationData: [],
        retentionCurve: [],
      }
    } catch (error) {
      console.error('[PinterestPublisher] Analytics error:', error)
      return {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        impressions: 0,
      }
    }
  }

  /**
   * Delete a pin from Pinterest
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(userId)

      const response = await fetch(`${this.baseUrl}/pins/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        console.error('[PinterestPublisher] Delete error:', response.status)
        return false
      }

      return true
    } catch (error) {
      console.error('[PinterestPublisher] Delete error:', error)
      return false
    }
  }

  /**
   * Get user's boards for selection
   */
  async getUserBoards(
    userId: string
  ): Promise<Array<{ id: string; name: string; description?: string; pinCount?: number }>> {
    try {
      const accessToken = await this.getAccessToken(userId)

      const response = await fetch(`${this.baseUrl}/boards?page_size=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch boards: ${response.status}`)
      }

      const data = await response.json()

      return (
        data.items?.map((board: any) => ({
          id: board.id,
          name: board.name,
          description: board.description,
          pinCount: board.pin_count,
        })) || []
      )
    } catch (error) {
      console.error('[PinterestPublisher] Boards error:', error)
      return []
    }
  }

  // Helper to get date string in YYYY-MM-DD format
  private getToday(): string {
    return new Date().toISOString().split('T')[0]
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }
}

// Export singleton instance
export const pinterestPublisher = new PinterestPublisher()

export default pinterestPublisher
