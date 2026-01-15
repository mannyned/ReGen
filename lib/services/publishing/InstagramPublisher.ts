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
// INSTAGRAM PUBLISHER
// Uses Facebook Graph API for Instagram Business/Creator accounts
// ============================================

export class InstagramPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'instagram'
  protected baseUrl = API_BASE_URLS.instagram

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media, contentType = 'post' } = options

    // Log for debugging
    console.log('[InstagramPublisher] publishContent called with:', {
      contentType,
      mediaType: media?.mediaType,
      hasMedia: !!media,
    })

    // Instagram requires media - text-only posts not supported
    if (!media) {
      return {
        success: false,
        platform: this.platform,
        error: 'Instagram requires media (image or video). Text-only posts are not supported.',
      }
    }

    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Get Instagram Business Account ID
      const accountId = await this.getInstagramAccountId(accessToken)

      // Determine if this is a story/reel or regular post
      const isStoryOrReel = contentType === 'story'
      const isStory = isStoryOrReel && media.mediaType !== 'video' // Stories are for images
      const isReel = isStoryOrReel && media.mediaType === 'video'  // Reels are for videos

      console.log('[InstagramPublisher] Content type detection:', {
        contentType,
        isStoryOrReel,
        isStory,
        isReel,
        mediaType: media.mediaType,
      })

      // Step 2: Create media container with appropriate type
      const containerId = await this.createMediaContainer(
        accountId,
        media,
        content,
        accessToken,
        isStoryOrReel
      )

      // Step 3: Wait for container to be ready
      // Reels/videos need more processing time on Instagram's servers
      // Videos: 90 attempts × 3 seconds = 4.5 minutes max wait
      // Images: 30 attempts × 2 seconds = 1 minute max wait
      const maxAttempts = media.mediaType === 'video' ? 90 : 30
      const delayMs = media.mediaType === 'video' ? 3000 : 2000
      console.log(`[InstagramPublisher] Waiting for ${media.mediaType} container to process...`)
      await this.waitForContainerReady(containerId, accessToken, maxAttempts, delayMs)

      // Step 4: Publish the container
      // All content types (posts, stories, reels) need the media_publish step
      const result = await this.publishContainer(accountId, containerId, accessToken)

      // Build the appropriate URL based on content type
      let platformUrl = `https://www.instagram.com/p/${result.id}`
      if (isStory) {
        // Stories have a different URL format
        platformUrl = `https://www.instagram.com/stories/`
      } else if (isReel) {
        platformUrl = `https://www.instagram.com/reel/${result.id}`
      }

      return {
        success: true,
        platform: this.platform,
        platformPostId: result.id,
        platformUrl,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to Instagram',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    const response = await this.makeApiRequest<{
      impressions: { value: number }
      reach: { value: number }
      likes: { value: number }
      comments: { value: number }
      saved: { value: number }
      shares: { value: number }
      video_views?: { value: number }
    }>(
      `/${postId}/insights?metric=impressions,reach,likes,comments,saved,shares,video_views`,
      { method: 'GET' },
      accessToken
    )

    return {
      views: response.video_views?.value || 0,
      likes: response.likes?.value || 0,
      comments: response.comments?.value || 0,
      shares: response.shares?.value || 0,
      saves: response.saved?.value || 0,
      reach: response.reach?.value || 0,
      impressions: response.impressions?.value || 0,
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      await this.makeApiRequest(
        `/${postId}`,
        { method: 'DELETE' },
        accessToken
      )
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // INSTAGRAM CAROUSEL SUPPORT
  // ============================================

  /**
   * Publish a carousel post to Instagram (up to 10 items)
   * Uses the Graph API's CAROUSEL media type
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
    const { validItems, truncatedCount } = this.prepareCarouselItems(items)

    // If only 1 item, use regular post instead of carousel
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
      // Step 1: Get Instagram Business Account ID
      const accountId = await this.getInstagramAccountId(accessToken)

      // Step 2: Create container for EACH carousel item
      console.log(`[InstagramPublisher] Creating ${validItems.length} carousel item containers`)
      const childContainerIds: string[] = []

      for (const item of validItems) {
        const containerId = await this.createCarouselItemContainer(
          accountId,
          item,
          accessToken
        )
        childContainerIds.push(containerId)

        // Wait for each item to process before continuing
        // Videos need more time, images need about 1 minute
        const isVideo = item.mimeType.startsWith('video/')
        await this.waitForContainerReady(containerId, accessToken, isVideo ? 90 : 30, isVideo ? 3000 : 2000)
      }

      // Step 3: Create CAROUSEL container referencing all children
      console.log('[InstagramPublisher] Creating carousel container with children:', childContainerIds)
      const carouselContainerId = await this.createCarouselContainer(
        accountId,
        childContainerIds,
        content,
        accessToken
      )

      // Step 4: Wait for carousel container to be ready
      await this.waitForContainerReady(carouselContainerId, accessToken, 45, 2000)

      // Step 5: Publish the carousel container
      const result = await this.publishContainer(accountId, carouselContainerId, accessToken)

      console.log('[InstagramPublisher] Carousel published successfully:', result.id)

      return {
        platform: this.platform,
        success: true,
        postId: result.id,
        postUrl: `https://www.instagram.com/p/${result.id}`,
        itemIds: childContainerIds,
        itemsPublished: validItems.length,
        itemsTruncated: truncatedCount,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[InstagramPublisher] Carousel publish failed:', error)
      return {
        platform: this.platform,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish carousel to Instagram',
        itemsPublished: 0,
        itemsTruncated: truncatedCount,
      }
    }
  }

  /**
   * Create a container for a single carousel item
   */
  private async createCarouselItemContainer(
    accountId: string,
    item: CarouselItem,
    accessToken: string
  ): Promise<string> {
    const params: Record<string, string> = {
      access_token: accessToken,
      is_carousel_item: 'true',  // Key flag that marks this as a carousel child
    }

    if (item.mimeType.startsWith('video/')) {
      // VIDEO is deprecated, use REELS for carousel video items
      params.media_type = 'REELS'
      params.video_url = item.mediaUrl
    } else {
      params.image_url = item.mediaUrl
    }

    const response = await fetch(
      `${this.baseUrl}/${accountId}/media?${new URLSearchParams(params)}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('[InstagramPublisher] Failed to create carousel item container:', error)
      throw new Error(`Failed to create carousel item container: ${error}`)
    }

    const data = await response.json()
    console.log(`[InstagramPublisher] Created carousel item container: ${data.id}`)
    return data.id
  }

  /**
   * Create the parent carousel container that references all child containers
   */
  private async createCarouselContainer(
    accountId: string,
    childContainerIds: string[],
    content: { caption: string; hashtags: string[] },
    accessToken: string
  ): Promise<string> {
    const caption = this.formatCaption(content)

    const params: Record<string, string> = {
      access_token: accessToken,
      media_type: 'CAROUSEL',
      caption,
      children: childContainerIds.join(','),  // Comma-separated container IDs
    }

    const response = await fetch(
      `${this.baseUrl}/${accountId}/media?${new URLSearchParams(params)}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('[InstagramPublisher] Failed to create carousel container:', error)
      throw new Error(`Failed to create carousel container: ${error}`)
    }

    const data = await response.json()
    console.log(`[InstagramPublisher] Created carousel container: ${data.id}`)
    return data.id
  }

  // ============================================
  // INSTAGRAM-SPECIFIC HELPERS
  // ============================================

  private async getInstagramAccountId(accessToken: string): Promise<string> {
    const response = await this.makeApiRequest<{
      data: Array<{ instagram_business_account?: { id: string } }>
    }>(
      '/me/accounts?fields=instagram_business_account',
      { method: 'GET' },
      accessToken
    )

    const account = response.data.find(a => a.instagram_business_account)
    if (!account?.instagram_business_account) {
      throw new Error('No Instagram Business account found')
    }

    return account.instagram_business_account.id
  }

  private async createMediaContainer(
    accountId: string,
    media: ContentPayload,
    content: { caption: string; hashtags: string[] },
    accessToken: string,
    isStoryOrReel: boolean = false
  ): Promise<string> {
    const caption = this.formatCaption(content)

    const params: Record<string, string> = {
      access_token: accessToken,
    }

    // Instagram Stories do NOT support captions - only add caption for Posts and Reels
    // Adding caption to Stories causes API to reject or fall back to regular post
    const isStory = isStoryOrReel && media.mediaType !== 'video'
    if (!isStory) {
      params.caption = caption
    }

    if (media.mediaType === 'video') {
      // All videos must now be posted as REELS (VIDEO media_type is deprecated)
      params.media_type = 'REELS'
      params.video_url = media.mediaUrl
      // Reels share to feed by default
      params.share_to_feed = 'true'
    } else {
      // For images: use STORIES when contentType is 'story', otherwise regular image post
      if (isStoryOrReel) {
        params.media_type = 'STORIES'
        params.image_url = media.mediaUrl
      } else {
        params.image_url = media.mediaUrl
      }
    }

    console.log('[InstagramPublisher] Creating media container with params:', {
      accountId,
      media_type: params.media_type,
      isStoryOrReel,
      isStory,
      hasCaption: !!params.caption,
      hasImageUrl: !!params.image_url,
      hasVideoUrl: !!params.video_url,
    })

    console.log('[InstagramPublisher] Creating media container, mediaUrl:', media.mediaUrl?.substring(0, 100) + '...')

    const response = await fetch(
      `${this.baseUrl}/${accountId}/media?${new URLSearchParams(params)}`,
      { method: 'POST' }
    )

    const responseText = await response.text()

    if (!response.ok) {
      console.error('[InstagramPublisher] Media container creation failed:', responseText)
      throw new Error(`Failed to create media container: ${responseText}`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error('[InstagramPublisher] Failed to parse response:', responseText)
      throw new Error(`Invalid response from Instagram: ${responseText}`)
    }

    console.log('[InstagramPublisher] Container created successfully, ID:', data.id)
    return data.id
  }

  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
    maxAttempts = 30,
    delayMs = 2000
  ): Promise<void> {
    console.log(`[InstagramPublisher] Waiting for container ${containerId} to be ready (max ${maxAttempts} attempts, ${delayMs}ms delay)`)

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(
          `${this.baseUrl}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
          { method: 'GET' }
        )

        if (!response.ok) {
          // If we can't check status, wait and retry
          console.log(`[InstagramPublisher] Status check failed (attempt ${i + 1}), retrying...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        }

        const data = await response.json()

        if (i % 10 === 0 || data.status_code === 'FINISHED') {
          console.log(`[InstagramPublisher] Container status (attempt ${i + 1}): ${data.status_code}`)
        }

        if (data.status_code === 'FINISHED') {
          console.log(`[InstagramPublisher] Container ready after ${i + 1} attempts`)
          return
        }

        if (data.status_code === 'ERROR') {
          throw new Error(`Container processing failed: ${data.status || 'Unknown error'}`)
        }

        // Status is IN_PROGRESS or PUBLISHED, wait and check again
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } catch (error) {
        // On network error, wait and retry
        if (i === maxAttempts - 1) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    throw new Error('Container processing timed out after ' + maxAttempts + ' attempts. The media may still be processing on Instagram.')
  }

  private async publishContainer(
    accountId: string,
    containerId: string,
    accessToken: string
  ): Promise<{ id: string }> {
    const response = await fetch(
      `${this.baseUrl}/${accountId}/media_publish?creation_id=${containerId}&access_token=${accessToken}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to publish container: ${error}`)
    }

    return response.json()
  }
}

export const instagramPublisher = new InstagramPublisher()
