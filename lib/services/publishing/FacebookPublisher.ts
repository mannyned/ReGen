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

      if (media?.mediaType === 'video') {
        postId = await this.publishVideo(page.accessToken, page.id, media, content)
      } else if (media?.mediaType === 'image') {
        postId = await this.publishPhoto(page.accessToken, page.id, media, content)
      } else {
        // Text-only post
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
  // FACEBOOK CAROUSEL/MULTI-PHOTO SUPPORT
  // ============================================

  /**
   * Publish a multi-photo post to Facebook (up to 10 items)
   * Uses the attached_media approach with unpublished photos
   */
  async publishCarousel(options: CarouselPublishOptions): Promise<PlatformCarouselResult> {
    const { userId, items, content } = options

    if (items.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: 'No items provided for carousel',
        itemsPublished: 0,
        itemsTruncated: 0,
      }
    }

    // Prepare items (validate, filter, truncate to max 10)
    const { validItems, truncatedCount, hasUnsupportedMedia } = this.prepareCarouselItems(items)

    // If only 1 item, use regular post
    if (validItems.length === 1) {
      const result = await this.publishContent({
        userId,
        content,
        media: {
          mediaUrl: validItems[0].mediaUrl,
          mediaType: validItems[0].mimeType.startsWith('video/') ? 'video' : 'image',
          mimeType: validItems[0].mimeType,
          fileSize: validItems[0].fileSize,
          duration: validItems[0].duration,
        },
      })

      return {
        platform: this.platform,
        success: result.success,
        postId: result.platformPostId,
        postUrl: result.platformUrl,
        itemIds: result.platformPostId ? [result.platformPostId] : undefined,
        itemsPublished: result.success ? 1 : 0,
        itemsTruncated: truncatedCount,
        error: result.error,
        publishedAt: result.publishedAt,
      }
    }

    const accessToken = await this.getAccessToken(userId)

    try {
      // Get the page info
      const page = await this.getPageInfo(accessToken)

      // Step 1: Upload each photo as unpublished
      console.log(`[FacebookPublisher] Uploading ${validItems.length} photos as unpublished`)
      const photoIds: string[] = []

      for (const item of validItems) {
        // Skip videos - Facebook multi-photo posts only support images
        if (item.mimeType.startsWith('video/')) {
          console.log('[FacebookPublisher] Skipping video in carousel - images only')
          continue
        }

        const photoId = await this.uploadUnpublishedPhoto(
          page.accessToken,
          page.id,
          item.mediaUrl
        )
        photoIds.push(photoId)
      }

      if (photoIds.length === 0) {
        return {
          platform: this.platform,
          success: false,
          error: 'No valid images for Facebook multi-photo post (videos are not supported)',
          itemsPublished: 0,
          itemsTruncated: truncatedCount,
        }
      }

      // Step 2: Create feed post with attached_media
      console.log('[FacebookPublisher] Creating multi-photo post with', photoIds.length, 'photos')
      const postId = await this.createMultiPhotoPost(
        page.accessToken,
        page.id,
        photoIds,
        content
      )

      console.log('[FacebookPublisher] Multi-photo post created:', postId)

      return {
        platform: this.platform,
        success: true,
        postId,
        postUrl: `https://www.facebook.com/${postId}`,
        itemIds: photoIds,
        itemsPublished: photoIds.length,
        itemsTruncated: truncatedCount + (hasUnsupportedMedia ? validItems.filter(i => i.mimeType.startsWith('video/')).length : 0),
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[FacebookPublisher] Multi-photo post failed:', error)
      return {
        platform: this.platform,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish multi-photo post to Facebook',
        itemsPublished: 0,
        itemsTruncated: truncatedCount,
      }
    }
  }

  /**
   * Upload a photo as unpublished (for use in multi-photo posts)
   */
  private async uploadUnpublishedPhoto(
    pageAccessToken: string,
    pageId: string,
    mediaUrl: string
  ): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/${pageId}/photos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: mediaUrl,
          published: false,  // Key: upload but don't publish yet
          access_token: pageAccessToken,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to upload unpublished photo: ${error}`)
    }

    const data = await response.json()
    console.log(`[FacebookPublisher] Uploaded unpublished photo: ${data.id}`)
    return data.id
  }

  /**
   * Create a feed post with multiple attached photos
   */
  private async createMultiPhotoPost(
    pageAccessToken: string,
    pageId: string,
    photoIds: string[],
    content: { caption: string; hashtags: string[] }
  ): Promise<string> {
    const message = this.formatCaption(content)

    // Build attached_media array
    const attachedMedia = photoIds.map(id => ({
      media_fbid: id,
    }))

    const response = await fetch(
      `${this.baseUrl}/${pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          attached_media: attachedMedia,
          access_token: pageAccessToken,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create multi-photo post: ${error}`)
    }

    const data = await response.json()
    return data.id
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

    // Use URL-based video upload - Facebook fetches the video from the URL
    // This is simpler and works with publicly accessible video URLs
    const response = await fetch(
      `${this.baseUrl}/${pageId}/videos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_url: media.mediaUrl, // Facebook will fetch video from this URL
          description,
          access_token: pageAccessToken,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to publish video: ${errorText}`)
    }

    const data = await response.json()
    return data.id
  }

  // ============================================
  // FACEBOOK REELS SUPPORT
  // ============================================

  async publishReel(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

    if (!media || media.mediaType !== 'video') {
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
