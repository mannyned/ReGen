import type {
  SocialPlatform,
  PlatformContent,
  PublishResult,
  PostAnalytics,
  CarouselItem,
  CarouselPublishOptions,
  PlatformCarouselResult,
  CarouselConstraints,
} from '../../types/social'
import { CAROUSEL_CONSTRAINTS } from '../../types/social'
import { tokenManager } from '../oauth/TokenManager'
import { API_BASE_URLS, CONTENT_LIMITS } from '../../config/oauth'

// ============================================
// BASE PLATFORM PUBLISHER INTERFACE
// ============================================

export interface ContentPayload {
  mediaUrl: string
  mediaType: 'image' | 'video' | 'carousel'
  mimeType: string
  fileSize: number
  duration?: number
  // For carousel posts with multiple images
  additionalMediaUrls?: string[]
}

export interface PublishOptions {
  userId: string
  content: PlatformContent
  media?: ContentPayload  // Optional for text-only posts
  scheduledAt?: Date
  contentType?: 'post' | 'story'  // Post to feed or story/reel
  linkedInOrganizationUrn?: string  // For LinkedIn organization/company page posts
  discordChannelId?: string  // For Discord channel selection during publish
  // TikTok-specific settings for Content Sharing Guidelines compliance
  tiktokSettings?: {
    privacyLevel: string | null
    disableComments: boolean
    disableDuet: boolean
    disableStitch: boolean
    brandContentToggle: boolean
    brandContentType: string | null
  }
}

export abstract class BasePlatformPublisher {
  protected abstract platform: SocialPlatform
  protected abstract baseUrl: string

  // ============================================
  // ABSTRACT METHODS (implement per platform)
  // ============================================

  abstract publishContent(options: PublishOptions): Promise<PublishResult>
  abstract getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics>
  abstract deletePost(postId: string, userId: string): Promise<boolean>

  // ============================================
  // CAROUSEL METHODS
  // ============================================

  /**
   * Publish a carousel/multi-image post to the platform.
   * Default implementation falls back to publishing first item only.
   * Override in platform-specific publishers for true carousel support.
   */
  async publishCarousel(options: CarouselPublishOptions): Promise<PlatformCarouselResult> {
    const { userId, items, content, contentType } = options

    // Default implementation: publish first item only
    if (items.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: 'No items provided for carousel',
        itemsPublished: 0,
        itemsTruncated: 0,
      }
    }

    // Validate and truncate items for this platform
    const { validItems, truncatedCount, hasUnsupportedMedia } = this.prepareCarouselItems(items)

    if (validItems.length === 0) {
      return {
        platform: this.platform,
        success: false,
        error: hasUnsupportedMedia
          ? `${this.platform} does not support videos in carousels`
          : 'No valid items for carousel after filtering',
        itemsPublished: 0,
        itemsTruncated: truncatedCount,
      }
    }

    // For platforms without carousel support, publish first item
    const firstItem = validItems[0]
    const result = await this.publishContent({
      userId,
      content,
      media: {
        mediaUrl: firstItem.mediaUrl,
        mediaType: firstItem.mimeType.startsWith('video/') ? 'video' : 'image',
        mimeType: firstItem.mimeType,
        fileSize: firstItem.fileSize,
        duration: firstItem.duration,
      },
      contentType,
    })

    return {
      platform: this.platform,
      success: result.success,
      postId: result.platformPostId,
      postUrl: result.platformUrl,
      itemIds: result.platformPostId ? [result.platformPostId] : undefined,
      itemsPublished: result.success ? 1 : 0,
      itemsTruncated: items.length - 1,
      error: result.error,
      message: items.length > 1
        ? `${this.platform} does not support carousels - only first item was posted`
        : undefined,
      publishedAt: result.publishedAt,
    }
  }

  /**
   * Get carousel constraints for this platform
   */
  protected getCarouselConstraints(): CarouselConstraints {
    return CAROUSEL_CONSTRAINTS[this.platform] || {
      minItems: 1,
      maxItems: 1,
      allowVideo: true,
      allowMixed: false,
    }
  }

  /**
   * Prepare and validate carousel items for this platform
   */
  protected prepareCarouselItems(items: CarouselItem[]): {
    validItems: CarouselItem[]
    truncatedCount: number
    hasUnsupportedMedia: boolean
  } {
    const constraints = this.getCarouselConstraints()
    let validItems = [...items]
    let hasUnsupportedMedia = false

    // Filter out videos if platform doesn't support them in carousels
    if (!constraints.allowVideo) {
      const beforeFilter = validItems.length
      validItems = validItems.filter(item => !item.mimeType.startsWith('video/'))
      hasUnsupportedMedia = validItems.length < beforeFilter
    }

    // Sort by order
    validItems.sort((a, b) => a.order - b.order)

    // Truncate to max items
    const truncatedCount = Math.max(0, validItems.length - constraints.maxItems)
    validItems = validItems.slice(0, constraints.maxItems)

    return { validItems, truncatedCount, hasUnsupportedMedia }
  }

  /**
   * Check if this platform supports carousels
   */
  supportsCarousel(): boolean {
    const constraints = this.getCarouselConstraints()
    return constraints.maxItems > 1
  }

  // ============================================
  // SHARED UTILITIES
  // ============================================

  protected async getAccessToken(userId: string): Promise<string> {
    const token = await tokenManager.getValidAccessToken(userId, this.platform)
    if (!token) {
      throw new Error(`No valid access token for ${this.platform}`)
    }
    return token
  }

  protected validateContent(content: PlatformContent, media?: ContentPayload): void {
    const limits = CONTENT_LIMITS[this.platform]

    // Validate caption length
    if (content.caption && content.caption.length > limits.maxCaptionLength) {
      throw new Error(
        `Caption exceeds maximum length of ${limits.maxCaptionLength} characters for ${this.platform}`
      )
    }

    // Validate hashtag count
    if (content.hashtags && content.hashtags.length > limits.maxHashtags) {
      throw new Error(
        `Too many hashtags. Maximum is ${limits.maxHashtags} for ${this.platform}`
      )
    }

    // Only validate media if provided (allows text-only posts)
    if (media) {
      // Validate video duration
      if (media.duration && media.duration > limits.maxVideoLengthSeconds) {
        throw new Error(
          `Video exceeds maximum duration of ${limits.maxVideoLengthSeconds} seconds for ${this.platform}`
        )
      }

      // Validate file size
      const fileSizeMb = media.fileSize / (1024 * 1024)
      if (fileSizeMb > limits.maxFileSizeMb) {
        throw new Error(
          `File exceeds maximum size of ${limits.maxFileSizeMb}MB for ${this.platform}`
        )
      }

      // Validate format
      const extension = media.mediaUrl.split('.').pop()?.toLowerCase()
      if (extension && !limits.supportedFormats.includes(extension)) {
        throw new Error(
          `File format .${extension} is not supported by ${this.platform}. Supported: ${limits.supportedFormats.join(', ')}`
        )
      }
    }
  }

  protected formatCaption(content: PlatformContent): string {
    let caption = content.caption || ''

    // Add hashtags
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagString = content.hashtags
        .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ')
      caption = `${caption}\n\n${hashtagString}`
    }

    // Add mentions
    if (content.mentionedUsers && content.mentionedUsers.length > 0) {
      const mentionString = content.mentionedUsers
        .map(user => (user.startsWith('@') ? user : `@${user}`))
        .join(' ')
      caption = `${caption}\n\n${mentionString}`
    }

    return caption.trim()
  }

  protected async makeApiRequest<T>(
    endpoint: string,
    options: RequestInit,
    accessToken: string
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API request failed: ${error}`)
    }

    return response.json()
  }
}
