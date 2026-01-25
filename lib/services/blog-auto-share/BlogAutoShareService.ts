/**
 * Blog Auto-Share Service
 *
 * Processes new blog posts from the user's blog URL and automatically shares them to social platforms.
 * Integrates with the existing publishing infrastructure.
 */

import { prisma } from '@/lib/db'
import { publishingService } from '../publishing'
import { metadataExtractor, MetadataExtractor } from './MetadataExtractor'
import { sendPushToUser } from '../push/PushNotificationService'
import {
  PLATFORM_CAPABILITIES,
  BLOG_AUTO_SHARE_V1_PLATFORMS,
  requiresMedia,
} from '@/lib/config/platformCapabilities'
import type { SocialPlatform, PlatformContent } from '@/lib/types/social'
import type {
  BlogAutoShareSettings,
  BlogAutoSharePost,
  BlogAutoShareStatus,
} from '@prisma/client'
import Parser from 'rss-parser'

// RSS Parser instance
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'ReGenr Blog Auto-Share Bot/1.0',
  },
})

// Parsed RSS item type
interface ParsedRssItem {
  guid: string
  title: string
  link: string
  description?: string
  pubDate?: string
  imageUrl?: string
}

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
   * Fetch and parse RSS feed from URL
   */
  private async fetchRssFeed(url: string): Promise<ParsedRssItem[]> {
    try {
      const feed = await rssParser.parseURL(url)

      return feed.items.map(item => ({
        guid: item.guid || item.link || item.title || '',
        title: item.title || 'Untitled',
        link: item.link || '',
        description: item.contentSnippet || item.content || item.summary || '',
        pubDate: item.pubDate || item.isoDate,
        imageUrl: item.enclosure?.url || (item as any)['media:content']?.$.url,
      }))
    } catch (error) {
      console.error(`[BlogAutoShare] Failed to fetch RSS feed from ${url}:`, error)
      return []
    }
  }

  /**
   * Process new RSS items for a specific user
   */
  private async processUserItems(settings: BlogAutoShareSettings): Promise<AutoShareResult[]> {
    const results: AutoShareResult[] = []
    let skippedByDate = 0
    let skippedByDedupe = 0

    // Check if blogUrl is set
    if (!settings.blogUrl) {
      console.log(`[BlogAutoShare] No blog URL configured for user ${settings.profileId}`)
      return results
    }

    // Fetch RSS feed from blogUrl
    const feedItems = await this.fetchRssFeed(settings.blogUrl)

    if (feedItems.length === 0) {
      console.log(`[BlogAutoShare] No items found in feed for user ${settings.profileId}`)
      return results
    }

    console.log(`[BlogAutoShare] Found ${feedItems.length} items in feed for user ${settings.profileId}`)
    console.log(`[BlogAutoShare] enabledAt: ${settings.enabledAt}, onlyNewPosts: ${settings.onlyNewPosts}`)

    // Log first few items for debugging
    feedItems.slice(0, 3).forEach((item, i) => {
      console.log(`[BlogAutoShare] Feed item ${i + 1}: "${item.title}" pubDate: ${item.pubDate}`)
    })

    // Filter items by enabledAt date if onlyNewPosts is true
    const filteredItems = feedItems.filter(item => {
      if (!settings.onlyNewPosts || !settings.enabledAt) return true
      if (!item.pubDate) {
        console.log(`[BlogAutoShare] Item "${item.title}" has no pubDate, including it`)
        return true // Include items without pubDate
      }

      const itemDate = new Date(item.pubDate)
      const enabledAt = new Date(settings.enabledAt)
      const isNew = itemDate >= enabledAt

      if (!isNew) {
        console.log(`[BlogAutoShare] Skipping "${item.title}" - published ${itemDate.toISOString()} before enabledAt ${enabledAt.toISOString()}`)
        skippedByDate++
      }

      return isNew
    })

    console.log(`[BlogAutoShare] ${filteredItems.length} items after date filter (${skippedByDate} skipped by date)`)

    // Process up to MAX_ITEMS_PER_RUN
    const itemsToProcess = filteredItems.slice(0, MAX_ITEMS_PER_RUN)

    for (const item of itemsToProcess) {
      try {
        const result = await this.processRssItem(item, settings)
        if (result) {
          results.push(result)
        } else {
          // null means skipped due to deduplication
          skippedByDedupe++
        }
      } catch (error) {
        console.error(`[BlogAutoShare] Error processing item ${item.guid}:`, error)
        results.push({
          rssFeedItemId: item.guid,
          autoSharePostId: '',
          status: 'FAILED',
          platformResults: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    console.log(`[BlogAutoShare] User ${settings.profileId} summary: ${results.length} processed, ${skippedByDate} skipped by date, ${skippedByDedupe} skipped as duplicates`)

    return results
  }

  /**
   * Process a single RSS item from the feed
   */
  private async processRssItem(
    item: ParsedRssItem,
    settings: BlogAutoShareSettings
  ): Promise<AutoShareResult | null> {
    const articleUrl = item.link

    // Skip if no URL
    if (!articleUrl) {
      return {
        rssFeedItemId: item.guid,
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
      return null // Already processed, skip silently
    }

    // Check quiet hours
    if (settings.quietHoursEnabled && this.isInQuietHours(settings)) {
      console.log(`[BlogAutoShare] Skipping due to quiet hours`)
      const autoSharePost = await this.createAutoSharePostFromRss(item, settings, null, 'QUEUED')
      return {
        rssFeedItemId: item.guid,
        autoSharePostId: autoSharePost.id,
        status: 'QUEUED',
        platformResults: [],
      }
    }

    // Extract metadata from article
    const extraction = await metadataExtractor.extractMetadata(articleUrl)

    // Create auto-share post record
    const autoSharePost = await this.createAutoSharePostFromRss(
      item,
      settings,
      extraction.success ? extraction.metadata : null,
      settings.autoPublish ? 'PROCESSING' : 'DRAFT'
    )

    // If not auto-publishing, stop here (user will approve later)
    if (!settings.autoPublish) {
      return {
        rssFeedItemId: item.guid,
        autoSharePostId: autoSharePost.id,
        status: 'DRAFT',
        platformResults: [],
      }
    }

    // Generate caption
    const caption = await this.generateCaptionFromRss(item, extraction.metadata, settings)

    // Publish to platforms
    const platformResults = await this.publishToPlatforms(
      autoSharePost,
      settings,
      caption,
      extraction.metadata?.image || item.imageUrl || settings.defaultImageUrl
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

    // Send push notification
    const successfulPlatforms = platformResults.filter(r => r.status === 'published').map(r => r.platform)
    const failedPlatforms = platformResults.filter(r => r.status === 'failed').map(r => r.platform)

    console.log(`[BlogAutoShare] Sending push notification for ${finalStatus} status to user ${settings.profileId}`)

    let pushResult
    if (finalStatus === 'PUBLISHED') {
      pushResult = await sendPushToUser(settings.profileId, 'published', {
        title: 'Blog Post Published!',
        body: `"${item.title}" shared to ${successfulPlatforms.join(', ')}`,
        url: '/automations',
        tag: 'blog-auto-share',
      })
    } else if (finalStatus === 'PARTIAL') {
      pushResult = await sendPushToUser(settings.profileId, 'published', {
        title: 'Blog Post Partially Published',
        body: `"${item.title}" - Failed on: ${failedPlatforms.join(', ')}`,
        url: '/automations',
        tag: 'blog-auto-share',
      })
    } else if (finalStatus === 'FAILED') {
      pushResult = await sendPushToUser(settings.profileId, 'published', {
        title: 'Blog Post Failed',
        body: `"${item.title}" failed to publish to all platforms`,
        url: '/automations',
        tag: 'blog-auto-share',
      })
    }

    console.log(`[BlogAutoShare] Push notification result:`, pushResult)

    return {
      rssFeedItemId: item.guid,
      autoSharePostId: autoSharePost.id,
      status: finalStatus,
      platformResults,
    }
  }

  /**
   * Create an auto-share post record from RSS item
   */
  private async createAutoSharePostFromRss(
    item: ParsedRssItem,
    settings: BlogAutoShareSettings,
    metadata: any,
    status: BlogAutoShareStatus
  ): Promise<BlogAutoSharePost> {
    const dedupeHash = MetadataExtractor.generateDedupeHash(item.guid, item.link)

    return prisma.blogAutoSharePost.create({
      data: {
        profileId: settings.profileId,
        articleUrl: item.link,
        canonicalUrl: metadata?.canonicalUrl,
        ogTitle: metadata?.ogTitle,
        ogDescription: metadata?.ogDescription,
        ogImage: metadata?.ogImage || item.imageUrl,
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
   * Generate caption from RSS item
   */
  private async generateCaptionFromRss(
    item: ParsedRssItem,
    metadata: any,
    settings: BlogAutoShareSettings
  ): Promise<string> {
    const title = metadata?.title || item.title
    const url = metadata?.canonicalUrl || item.link
    const excerpt = metadata?.description
      ? MetadataExtractor.cleanExcerpt(metadata.description, 100)
      : (item.description ? MetadataExtractor.cleanExcerpt(item.description, 100) : '')

    // Try to generate AI caption
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
   * Generate AI-powered caption that summarizes blog content
   * Prioritizes article content over images, always includes blog link
   */
  private async generateAICaption(
    title: string,
    excerpt: string,
    url: string
  ): Promise<string | null> {
    try {
      // Build a content-focused prompt for the AI
      // Explicitly tell AI to summarize the blog content, not describe images
      const contentPrompt = `Summarize this blog post for social media. Focus on the key insights and value for readers.

Title: ${title}

Content Summary: ${excerpt || 'A new blog post sharing valuable insights.'}

Create an engaging caption that:
1. Summarizes the main point or takeaway from the article
2. Creates curiosity to read the full post
3. Uses a conversational, engaging tone
4. Does NOT describe any images - focus on the written content
5. Keep it concise (2-3 sentences max)`

      const response = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/brand-voice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentPrompt,
          platform: 'general',
          includeCTA: false, // We'll add our own CTA with the link
          includeEmojis: true,
          includeHashtags: false,
        }),
      })

      if (!response.ok) return null

      const data = await response.json()
      if (!data.success || !data.caption) return null

      // Always append the article URL with a clear CTA
      return `${data.caption}\n\n📖 Read the full article:\n🔗 ${url}`
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
    const caption = autoSharePost.generatedCaption || await this.generateCaptionFromRss(
      {
        guid: autoSharePost.dedupeHash,
        title: autoSharePost.articleTitle,
        link: autoSharePost.articleUrl,
        description: autoSharePost.articleExcerpt || undefined,
      },
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

    // Send push notification
    const successfulPlatforms = platformResults.filter(r => r.status === 'published').map(r => r.platform)
    const failedPlatforms = platformResults.filter(r => r.status === 'failed').map(r => r.platform)

    if (finalStatus === 'PUBLISHED') {
      await sendPushToUser(settings.profileId, 'published', {
        title: 'Blog Post Published!',
        body: `"${autoSharePost.articleTitle}" shared to ${successfulPlatforms.join(', ')}`,
        url: '/automations',
        tag: 'blog-auto-share',
      })
    } else if (finalStatus === 'PARTIAL') {
      await sendPushToUser(settings.profileId, 'published', {
        title: 'Blog Post Partially Published',
        body: `"${autoSharePost.articleTitle}" - Failed on: ${failedPlatforms.join(', ')}`,
        url: '/automations',
        tag: 'blog-auto-share',
      })
    } else if (finalStatus === 'FAILED') {
      await sendPushToUser(settings.profileId, 'published', {
        title: 'Blog Post Failed',
        body: `"${autoSharePost.articleTitle}" failed to publish to all platforms`,
        url: '/automations',
        tag: 'blog-auto-share',
      })
    }

    return {
      rssFeedItemId: autoSharePost.dedupeHash,
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
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get auto-share history for a user
   */
  async getHistory(userId: string, limit: number = 50) {
    return prisma.blogAutoSharePost.findMany({
      where: { profileId: userId },
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
