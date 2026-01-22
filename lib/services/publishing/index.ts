import type {
  SocialPlatform,
  PlatformContent,
  PublishResult,
  PostAnalytics,
  ScheduledPost,
  CarouselItem,
  CarouselPublishOptions,
  PlatformCarouselResult,
} from '../../types/social'
import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import { instagramPublisher } from './InstagramPublisher'
import { tiktokPublisher } from './TikTokPublisher'
import { youtubePublisher } from './YouTubePublisher'
import { twitterPublisher } from './TwitterPublisher'
import { linkedinPublisher } from './LinkedInPublisher'
import { facebookPublisher } from './FacebookPublisher'
import { snapchatPublisher } from './SnapchatPublisher'
import { redditPublisher } from './RedditPublisher'
import { pinterestPublisher } from './PinterestPublisher'
import { discordPublisher } from './DiscordPublisher'

// ============================================
// PLATFORM PUBLISHER REGISTRY
// ============================================

// Publishers for implemented platforms
const publishers: Partial<Record<SocialPlatform, BasePlatformPublisher>> = {
  instagram: instagramPublisher,
  tiktok: tiktokPublisher,
  youtube: youtubePublisher,
  twitter: twitterPublisher,
  linkedin: linkedinPublisher,
  facebook: facebookPublisher,
  snapchat: snapchatPublisher,
  reddit: redditPublisher,
  pinterest: pinterestPublisher,
  discord: discordPublisher,
}

// Coming soon platforms (none currently)
const comingSoonPlatforms: SocialPlatform[] = []

// ============================================
// UNIFIED PUBLISHING SERVICE
// ============================================

export class PublishingService {
  // ============================================
  // PUBLISH TO SINGLE PLATFORM
  // ============================================

  async publishToSingle(
    platform: SocialPlatform,
    options: PublishOptions
  ): Promise<PublishResult> {
    console.log('[PublishingService] publishToSingle called:', {
      platform,
      contentType: options.contentType,
      mediaType: options.media?.mediaType,
    })

    const publisher = publishers[platform]

    if (!publisher) {
      const isComingSoon = comingSoonPlatforms.includes(platform)
      return {
        success: false,
        platform,
        error: isComingSoon ? `${platform} integration coming soon` : `Unsupported platform: ${platform}`,
      }
    }

    try {
      return await publisher.publishContent(options)
    } catch (error) {
      return {
        success: false,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  // ============================================
  // PUBLISH TO MULTIPLE PLATFORMS
  // ============================================

  async publishToMultiple(
    platforms: SocialPlatform[],
    options: Omit<PublishOptions, 'platform'> & {
      platformContent?: Record<SocialPlatform, PlatformContent>
    }
  ): Promise<Map<SocialPlatform, PublishResult>> {
    const results = new Map<SocialPlatform, PublishResult>()

    // Publish to all platforms concurrently
    const publishPromises = platforms.map(async (platform) => {
      const platformSpecificContent = options.platformContent?.[platform] || options.content

      const result = await this.publishToSingle(platform, {
        ...options,
        content: platformSpecificContent,
      })

      results.set(platform, result)
    })

    await Promise.allSettled(publishPromises)

    return results
  }

  // ============================================
  // CAROUSEL PUBLISHING
  // ============================================

  /**
   * Publish a carousel to a single platform
   */
  async publishCarouselToSingle(
    platform: SocialPlatform,
    options: CarouselPublishOptions
  ): Promise<PlatformCarouselResult> {
    console.log('[PublishingService] publishCarouselToSingle called:', {
      platform,
      itemCount: options.items.length,
      contentType: options.contentType,
    })

    const publisher = publishers[platform]

    if (!publisher) {
      const isComingSoon = comingSoonPlatforms.includes(platform)
      return {
        platform,
        success: false,
        error: isComingSoon ? `${platform} integration coming soon` : `Unsupported platform: ${platform}`,
        itemsPublished: 0,
        itemsTruncated: 0,
      }
    }

    try {
      return await publisher.publishCarousel(options)
    } catch (error) {
      return {
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        itemsPublished: 0,
        itemsTruncated: options.items.length,
      }
    }
  }

  /**
   * Publish a carousel to multiple platforms concurrently
   * Each platform will receive the appropriate number of items based on its limits
   */
  async publishCarouselToMultiple(
    platforms: SocialPlatform[],
    options: Omit<CarouselPublishOptions, 'platform'> & {
      platformContent?: Record<SocialPlatform, PlatformContent>
    }
  ): Promise<Map<SocialPlatform, PlatformCarouselResult>> {
    const results = new Map<SocialPlatform, PlatformCarouselResult>()

    console.log('[PublishingService] publishCarouselToMultiple called:', {
      platforms,
      itemCount: options.items.length,
    })

    // Publish to all platforms concurrently
    const publishPromises = platforms.map(async (platform) => {
      const platformSpecificContent = options.platformContent?.[platform] || options.content

      const result = await this.publishCarouselToSingle(platform, {
        ...options,
        content: platformSpecificContent,
      })

      results.set(platform, result)
    })

    await Promise.allSettled(publishPromises)

    // Log summary
    const succeeded = Array.from(results.values()).filter(r => r.success).length
    const failed = results.size - succeeded
    console.log(`[PublishingService] Carousel publish complete: ${succeeded} succeeded, ${failed} failed`)

    return results
  }

  /**
   * Check if a platform supports carousel posts
   */
  platformSupportsCarousel(platform: SocialPlatform): boolean {
    const publisher = publishers[platform]
    return publisher?.supportsCarousel() ?? false
  }

  /**
   * Get carousel support info for all active platforms
   */
  getCarouselSupportInfo(): Record<SocialPlatform, { supported: boolean; maxItems: number }> {
    const info: Partial<Record<SocialPlatform, { supported: boolean; maxItems: number }>> = {}

    for (const [platform, publisher] of Object.entries(publishers)) {
      if (publisher) {
        const constraints = (publisher as any).getCarouselConstraints?.() || { maxItems: 1 }
        info[platform as SocialPlatform] = {
          supported: publisher.supportsCarousel(),
          maxItems: constraints.maxItems,
        }
      }
    }

    return info as Record<SocialPlatform, { supported: boolean; maxItems: number }>
  }

  // ============================================
  // SCHEDULED PUBLISHING
  // ============================================

  private scheduledJobs = new Map<string, NodeJS.Timeout>()

  async schedulePost(
    id: string,
    platforms: SocialPlatform[],
    options: Omit<PublishOptions, 'platform'> & {
      platformContent?: Record<SocialPlatform, PlatformContent>
    },
    scheduledAt: Date
  ): Promise<ScheduledPost> {
    const delay = scheduledAt.getTime() - Date.now()

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future')
    }

    // Create scheduled job
    const timeout = setTimeout(async () => {
      console.log(`[PublishingService] Executing scheduled post ${id}`)
      await this.publishToMultiple(platforms, options)
      this.scheduledJobs.delete(id)
    }, delay)

    this.scheduledJobs.set(id, timeout)

    return {
      id,
      userId: options.userId,
      contentUploadId: '', // Would come from content upload
      platforms,
      scheduledAt,
      timezone: 'UTC',
      platformContent: options.platformContent || ({} as Record<SocialPlatform, PlatformContent>),
      status: 'pending',
    }
  }

  async cancelScheduledPost(id: string): Promise<boolean> {
    const timeout = this.scheduledJobs.get(id)

    if (!timeout) {
      return false
    }

    clearTimeout(timeout)
    this.scheduledJobs.delete(id)

    return true
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getPostAnalytics(
    platform: SocialPlatform,
    postId: string,
    userId: string
  ): Promise<PostAnalytics> {
    const publisher = publishers[platform]

    if (!publisher) {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    return publisher.getPostAnalytics(postId, userId)
  }

  async getMultiPlatformAnalytics(
    posts: Array<{ platform: SocialPlatform; postId: string }>,
    userId: string
  ): Promise<Map<string, PostAnalytics>> {
    const results = new Map<string, PostAnalytics>()

    const analyticsPromises = posts.map(async ({ platform, postId }) => {
      try {
        const analytics = await this.getPostAnalytics(platform, postId, userId)
        results.set(`${platform}:${postId}`, analytics)
      } catch (error) {
        console.error(`Failed to get analytics for ${platform}:${postId}`, error)
      }
    })

    await Promise.allSettled(analyticsPromises)

    return results
  }

  // ============================================
  // DELETE POST
  // ============================================

  async deletePost(
    platform: SocialPlatform,
    postId: string,
    userId: string
  ): Promise<boolean> {
    const publisher = publishers[platform]

    if (!publisher) {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    return publisher.deletePost(postId, userId)
  }
}

// Singleton instance
export const publishingService = new PublishingService()

// Re-export types and individual publishers
export * from './BasePlatformPublisher'
export { instagramPublisher } from './InstagramPublisher'
export { tiktokPublisher } from './TikTokPublisher'
export { youtubePublisher } from './YouTubePublisher'
export { twitterPublisher } from './TwitterPublisher'
export { linkedinPublisher } from './LinkedInPublisher'
export { facebookPublisher } from './FacebookPublisher'
export { snapchatPublisher } from './SnapchatPublisher'
export { redditPublisher } from './RedditPublisher'
export { pinterestPublisher } from './PinterestPublisher'
export { discordPublisher } from './DiscordPublisher'
