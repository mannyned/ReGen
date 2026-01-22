/**
 * Pinterest Publishing Service
 *
 * Handles publishing content to Pinterest via the Pinterest API v5.
 *
 * Supports:
 * - Image pins
 * - Carousel pins (2-5 images)
 *
 * Does NOT support:
 * - Video pins (requires different flow)
 * - Idea pins (deprecated in favor of standard pins)
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
   * Publish a single image pin to Pinterest
   */
  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

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

      // Pinterest requires an image URL
      if (!media?.mediaUrl) {
        return {
          success: false,
          platform: this.platform,
          error: 'Pinterest requires an image for pins.',
        }
      }

      // Check if it's a video (not supported for now)
      if (media.mimeType?.startsWith('video/')) {
        return {
          success: false,
          platform: this.platform,
          error: 'Video pins are not yet supported. Please use an image.',
        }
      }

      // Build pin data
      const pinData: Record<string, any> = {
        board_id: boardId,
        media_source: {
          source_type: 'image_url',
          url: media.mediaUrl,
        },
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

      // Add alt text for accessibility
      if (content.settings?.altText) {
        pinData.alt_text = content.settings.altText.substring(0, 500)
      }

      console.log(`[PinterestPublisher] Creating pin on board ${boardId}`, {
        hasTitle: !!pinData.title,
        hasDescription: !!pinData.description,
        hasLink: !!pinData.link,
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
