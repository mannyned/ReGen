/**
 * Blog Auto-Share Service
 *
 * Processes new RSS feed items and automatically shares them to social platforms.
 * Integrates with the existing publishing infrastructure.
 */

import { prisma } from '@/lib/db'
import { publishingService } from '../publishing'
import { metadataExtractor, MetadataExtractor } from './MetadataExtractor'
import {
  PLATFORM_CAPABILITIES,
  BLOG_AUTO_SHARE_V1_PLATFORMS,
  requiresMedia,
} from '@/lib/config/platformCapabilities'
import type { SocialPlatform, PlatformContent } from '@/lib/types/social'
import type {
  RssFeedItem,
  BlogAutoShareSettings,
  BlogAutoSharePost,
  BlogAutoShareStatus,
} from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface AutoShareResult {
  rssFeedItemId: string
  autoSharePostId: string
  status: BlogAutoShareStatus
  platformResults: PlatformPublishResult[]
  error?: string
}

export interface PlatformPublishResult {
  platform: string
  status: 'published' | 'failed' | 'skipped'
  postId?: string
  postUrl?: string
  error?: string
}

export interface ProcessingJobResult {
  processed: number
  published: number
  drafts: number
  failed: number
  skipped: number
  results: AutoShareResult[]
  durationMs: number
}

// ============================================
// CONFIGURATION
// ============================================

const MAX_ITEMS_PER_RUN = 10 // Process up to 10 new items per cron run
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

// ============================================
// BLOG AUTO-SHARE SERVICE CLASS
// ============================================

export class BlogAutoShareService {
  /**
   * Process new RSS items for users with Blog Auto-Share enabled
   * Called by the RSS cron job after ingesting new items
   */
  async processNewItems(): Promise<ProcessingJobResult> {
    const startTime = Date.now()
    const results: AutoShareResult[] = []

    // Get all users with Blog Auto-Share enabled
    const enabledSettings = await prisma.blogAutoShareSettings.findMany({
      where: { enabled: true },
      include: { profile: true },
    })

    console.log(`[BlogAutoShare] Found ${enabledSettings.length} users with auto-share enabled`)

    for (const settings of enabledSettings) {
      try {
        const userResults = await this.processUserItems(settings)
        results.push(...userResults)
      } catch (error) {
        console.error(`[BlogAutoShare] Error processing user ${settings.profileId}:`, error)
      }
    }

    // Calculate summary
    const published = results.filter(r => r.status === 'PUBLISHED').length
    const drafts = results.filter(r => r.status === 'DRAFT').length
    const failed = results.filter(r => r.status === 'FAILED').length
    const skipped = results.filter(r => r.status === 'SKIPPED').length

    return {
      processed: results.length,
      published,
      drafts,
      failed,
      skipped,
      results,
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Process new RSS items for a specific user
   */
  private async processUserItems(settings: BlogAutoShareSettings): Promise<AutoShareResult[]> {
    const results: AutoShareResult[] = []

    // Get new RSS items that haven't been processed for auto-share
    const feedFilter = settings.feedIds.length > 0
      ? { feedId: { in: settings.feedIds } }
      : {}

    const newItems = await prisma.rssFeedItem.findMany({
      where: {
        profileId: settings.profileId,
        status: 'NEW',
        ...feedFilter,
        // Exclude items that already have auto-share posts
        blogAutoSharePosts: { none: {} },
      },
      orderBy: { publishedAt: 'desc' },
      take: MAX_ITEMS_PER_RUN,
    })

    console.log(`[BlogAutoShare] Processing ${newItems.length} items for user ${settings.profileId}`)

    for (const item of newItems) {
      try {
        const result = await this.processItem(item, settings)
        results.push(result)
      } catch (error) {
        console.error(`[BlogAutoShare] Error processing item ${item.id}:`, error)
        results.push({
          rssFeedItemId: item.id,
          autoSharePostId: '',
          status: 'FAILED',
          platformResults: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Process a single RSS item
   */
  private async processItem(
    item: RssFeedItem,
    settings: BlogAutoShareSettings
  ): Promise<AutoShareResult> {
    const articleUrl = item.link || ''

    // Skip if no URL
    if (!articleUrl) {
      return {
        rssFeedItemId: item.id,
        autoSharePostId: '',
        status: 'SKIPPED',
        platformResults: [],
        error: 'No article URL found',
      }
    }

    // Check deduplication
    const dedupeHash = MetadataExtractor.generateDedupeHash(item.guid, item.link)
    const existingPost = await prisma.blogAutoSharePost.findUnique({
      where: { dedupeHash },
    })

    if (existingPost) {
      console.log(`[BlogAutoShare] Skipping duplicate: ${item.guid}`)
      return {
        rssFeedItemId: item.id,
        autoSharePostId: existingPost.id,
        status: 'SKIPPED',
        platformResults: [],
        error: 'Duplicate content (already shared)',
      }
    }

    // Check quiet hours
    if (settings.quietHoursEnabled && this.isInQuietHours(settings)) {
      console.log(`[BlogAutoShare] Skipping due to quiet hours`)
      // Create draft instead
      const autoSharePost = await this.createAutoSharePost(item, settings, null, 'QUEUED')
      return {
        rssFeedItemId: item.id,
        autoSharePostId: autoSharePost.id,
        status: 'QUEUED',
        platformResults: [],
      }
    }

    // Extract metadata from article
    const extraction = await metadataExtractor.extractMetadata(articleUrl)

    // Create auto-share post record
    const autoSharePost = await this.createAutoSharePost(
      item,
      settings,
      extraction.success ? extraction.metadata : null,
      settings.autoPublish ? 'PROCESSING' : 'DRAFT'
    )

    // If not auto-publishing, stop here (user will approve later)
    if (!settings.autoPublish) {
      return {
        rssFeedItemId: item.id,
        autoSharePostId: autoSharePost.id,
        status: 'DRAFT',
        platformResults: [],
      }
    }

    // Generate caption
    const caption = await this.generateCaption(item, extraction.metadata, settings)

    // Publish to platforms
    const platformResults = await this.publishToPlatforms(
      autoSharePost,
      settings,
      caption,
      extraction.metadata?.image || settings.defaultImageUrl
    )

    // Determine final status
    const allPublished = platformResults.every(r => r.status === 'published')
    const anyPublished = platformResults.some(r => r.status === 'published')
    const finalStatus: BlogAutoShareStatus = allPublished
      ? 'PUBLISHED'
      : anyPublished
        ? 'PARTIAL'
        : 'FAILED'

    // Update auto-share post with results
    await prisma.blogAutoSharePost.update({
      where: { id: autoSharePost.id },
      data: {
        status: finalStatus,
        generatedCaption: caption,
        platformResults: JSON.stringify(platformResults),
        processedAt: new Date(),
      },
    })

    return {
      rssFeedItemId: item.id,
      autoSharePostId: autoSharePost.id,
      status: finalStatus,
      platformResults,
    }
  }

  /**
   * Create an auto-share post record
   */
  private async createAutoSharePost(
    item: RssFeedItem,
    settings: BlogAutoShareSettings,
    metadata: any,
    status: BlogAutoShareStatus
  ): Promise<BlogAutoSharePost> {
    const dedupeHash = MetadataExtractor.generateDedupeHash(item.guid, item.link)

    return prisma.blogAutoSharePost.create({
      data: {
        profileId: settings.profileId,
        rssFeedItemId: item.id,
        articleUrl: item.link || '',
        canonicalUrl: metadata?.canonicalUrl,
        ogTitle: metadata?.ogTitle,
        ogDescription: metadata?.ogDescription,
        ogImage: metadata?.ogImage,
        articleTitle: metadata?.title || item.title,
        articleExcerpt: metadata?.description
          ? MetadataExtractor.cleanExcerpt(metadata.description)
          : (item.description ? MetadataExtractor.cleanExcerpt(item.description) : null),
        dedupeHash,
        status,
      },
    })
  }

  /**
   * Generate caption for the blog post
   */
  private async generateCaption(
    item: RssFeedItem,
    metadata: any,
    settings: BlogAutoShareSettings
  ): Promise<string> {
    const title = metadata?.title || item.title
    const url = metadata?.canonicalUrl || item.link || ''
    const excerpt = metadata?.description
      ? MetadataExtractor.cleanExcerpt(metadata.description, 100)
      : (item.description ? MetadataExtractor.cleanExcerpt(item.description, 100) : '')

    // Try to generate AI caption using brand voice
    try {
      const aiCaption = await this.generateAICaption(title, excerpt, url)
      if (aiCaption) return aiCaption
    } catch (error) {
      console.warn('[BlogAutoShare] AI caption generation failed, using template:', error)
    }

    // Fallback to simple template
    return this.generateTemplateCaption(title, excerpt, url)
  }

  /**
   * Generate AI-powered caption
   */
  private async generateAICaption(
    title: string,
    excerpt: string,
    url: string
  ): Promise<string | null> {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/brand-voice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `New blog post: ${title}. ${excerpt}`,
          platform: 'general',
          includeCTA: true,
          includeEmojis: true,
          includeHashtags: false, // Will add separately if needed
        }),
      })

      if (!response.ok) return null

      const data = await response.json()
      if (!data.success || !data.caption) return null

      // Append the article URL
      return `${data.caption}\n\n🔗 Read more: ${url}`
    } catch {
      return null
    }
  }

  /**
   * Generate template-based caption
   */
  private generateTemplateCaption(title: string, excerpt: string, url: string): string {
    const teaser = excerpt || `Check out my latest post: ${title}`
    const cta = '📖 Read the full article'

    return `${teaser}\n\n${cta}\n\n🔗 ${url}`
  }

  /**
   * Apply platform-specific caption template
   */
  private applyPlatformTemplate(
    baseCaption: string,
    platform: SocialPlatform,
    settings: BlogAutoShareSettings,
    title: string,
    url: string
  ): string {
    const templates = settings.captionTemplates as Record<string, string> | null

    if (templates && templates[platform]) {
      // Apply custom template
      return templates[platform]
        .replace('{title}', title)
        .replace('{url}', url)
        .replace('{caption}', baseCaption)
    }

    // Platform-specific adjustments
    const caps = PLATFORM_CAPABILITIES[platform]

    // Add Instagram link note
    if (platform === 'instagram') {
      return `${baseCaption}\n\n(Link in bio - links aren't clickable in Instagram captions)`
    }

    // Truncate for Twitter
    if (platform === 'twitter' && baseCaption.length > 250) {
      const urlLength = url.length + 5 // "🔗 " prefix
      const maxTextLength = 250 - urlLength
      const truncated = baseCaption.slice(0, maxTextLength - 3) + '...'
      return `${truncated}\n\n🔗 ${url}`
    }

    return baseCaption
  }

  /**
   * Publish to all configured platforms
   */
  private async publishToPlatforms(
    autoSharePost: BlogAutoSharePost,
    settings: BlogAutoShareSettings,
    caption: string,
    imageUrl: string | null
  ): Promise<PlatformPublishResult[]> {
    const results: PlatformPublishResult[] = []

    // Filter to valid V1 platforms
    const platforms = settings.platforms.filter(p =>
      BLOG_AUTO_SHARE_V1_PLATFORMS.includes(p as SocialPlatform)
    )

    for (const platformStr of platforms) {
      const platform = platformStr as SocialPlatform
      const caps = PLATFORM_CAPABILITIES[platform]

      // Skip if platform requires media but we have none
      if (requiresMedia(platform) && !imageUrl && !settings.defaultImageUrl) {
        results.push({
          platform,
          status: 'skipped',
          error: 'Platform requires image but none available',
        })
        continue
      }

      try {
        // Apply platform-specific caption
        const platformCaption = this.applyPlatformTemplate(
          caption,
          platform,
          settings,
          autoSharePost.articleTitle,
          autoSharePost.articleUrl
        )

        // Build content payload
        const content: PlatformContent = {
          caption: platformCaption,
          hashtags: [],
          settings: {},
        }

        // Add platform-specific settings
        if (platform === 'pinterest') {
          content.settings = {
            boardId: settings.pinterestBoardId || undefined,
            link: autoSharePost.articleUrl,
          }
        }

        if (platform === 'discord') {
          content.settings = {
            channelId: settings.discordChannelId || undefined,
          }
        }

        // Publish
        const result = await this.publishWithRetry(
          platform,
          settings.profileId,
          content,
          imageUrl || settings.defaultImageUrl || undefined,
          {
            discordChannelId: settings.discordChannelId || undefined,
            linkedInOrganizationUrn: platform === 'linkedin-org' ? settings.linkedinOrgUrn || undefined : undefined,
          }
        )

        results.push({
          platform,
          status: result.success ? 'published' : 'failed',
          postId: result.platformPostId,
          postUrl: result.platformUrl,
          error: result.error,
        })

        // Small delay between platforms to avoid rate limits
        await this.delay(500)
      } catch (error) {
        results.push({
          platform,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Publish with retry logic
   */
  private async publishWithRetry(
    platform: SocialPlatform,
    userId: string,
    content: PlatformContent,
    imageUrl: string | undefined,
    options: {
      discordChannelId?: string
      linkedInOrganizationUrn?: string
    }
  ) {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await publishingService.publishToSingle(platform, {
          userId,
          content,
          media: imageUrl ? {
            mediaUrl: imageUrl,
            mediaType: 'image',
            mimeType: 'image/jpeg', // Assume JPEG for OG images
            fileSize: 0, // Unknown
          } : undefined,
          discordChannelId: options.discordChannelId,
          linkedInOrganizationUrn: options.linkedInOrganizationUrn,
        })

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`[BlogAutoShare] Publish attempt ${attempt} failed for ${platform}:`, lastError.message)

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * attempt)
        }
      }
    }

    return {
      success: false,
      platform,
      error: lastError?.message || 'Max retries exceeded',
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(settings: BlogAutoShareSettings): boolean {
    if (!settings.quietHoursEnabled) return false
    if (settings.quietHoursStart === null || settings.quietHoursEnd === null) return false

    const now = new Date()
    const currentHour = now.getUTCHours()

    const start = settings.quietHoursStart
    const end = settings.quietHoursEnd

    // Handle overnight quiet hours (e.g., 22:00 - 06:00)
    if (start > end) {
      return currentHour >= start || currentHour < end
    }

    return currentHour >= start && currentHour < end
  }

  /**
   * Approve a draft auto-share post and publish it
   */
  async approveDraft(autoSharePostId: string, userId: string): Promise<AutoShareResult> {
    const autoSharePost = await prisma.blogAutoSharePost.findFirst({
      where: {
        id: autoSharePostId,
        profileId: userId,
        status: 'DRAFT',
      },
      include: { rssFeedItem: true },
    })

    if (!autoSharePost) {
      throw new Error('Draft not found or already processed')
    }

    const settings = await prisma.blogAutoShareSettings.findUnique({
      where: { profileId: userId },
    })

    if (!settings) {
      throw new Error('Auto-share settings not found')
    }

    // Generate caption if not already done
    const caption = autoSharePost.generatedCaption || await this.generateCaption(
      autoSharePost.rssFeedItem,
      {
        title: autoSharePost.ogTitle || autoSharePost.articleTitle,
        description: autoSharePost.ogDescription || autoSharePost.articleExcerpt,
        canonicalUrl: autoSharePost.canonicalUrl,
      },
      settings
    )

    // Publish to platforms
    const platformResults = await this.publishToPlatforms(
      autoSharePost,
      settings,
      caption,
      autoSharePost.ogImage || settings.defaultImageUrl
    )

    // Determine final status
    const allPublished = platformResults.every(r => r.status === 'published')
    const anyPublished = platformResults.some(r => r.status === 'published')
    const finalStatus: BlogAutoShareStatus = allPublished
      ? 'PUBLISHED'
      : anyPublished
        ? 'PARTIAL'
        : 'FAILED'

    // Update record
    await prisma.blogAutoSharePost.update({
      where: { id: autoSharePostId },
      data: {
        status: finalStatus,
        generatedCaption: caption,
        platformResults: JSON.stringify(platformResults),
        processedAt: new Date(),
      },
    })

    return {
      rssFeedItemId: autoSharePost.rssFeedItemId,
      autoSharePostId: autoSharePost.id,
      status: finalStatus,
      platformResults,
    }
  }

  /**
   * Dismiss/skip a draft
   */
  async dismissDraft(autoSharePostId: string, userId: string): Promise<void> {
    await prisma.blogAutoSharePost.updateMany({
      where: {
        id: autoSharePostId,
        profileId: userId,
        status: { in: ['DRAFT', 'QUEUED'] },
      },
      data: {
        status: 'SKIPPED',
        processedAt: new Date(),
      },
    })
  }

  /**
   * Get pending drafts for a user
   */
  async getPendingDrafts(userId: string) {
    return prisma.blogAutoSharePost.findMany({
      where: {
        profileId: userId,
        status: { in: ['DRAFT', 'QUEUED'] },
      },
      include: { rssFeedItem: { include: { feed: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get auto-share history for a user
   */
  async getHistory(userId: string, limit: number = 50) {
    return prisma.blogAutoSharePost.findMany({
      where: { profileId: userId },
      include: { rssFeedItem: { include: { feed: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const blogAutoShareService = new BlogAutoShareService()
