/**
 * Discord Publishing Service
 *
 * Handles publishing content to Discord via webhooks.
 *
 * Discord Integration Options:
 * 1. Webhook URL (stored during OAuth with webhook.incoming scope)
 * 2. Manual webhook URL (user provides webhook URL from Discord settings)
 *
 * Supports:
 * - Text messages (up to 2000 characters)
 * - Embeds (rich content with images, titles, descriptions)
 * - Image attachments
 * - Video links (embedded via URL)
 *
 * @see https://discord.com/developers/docs/resources/webhook
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
// DISCORD PUBLISHER
// ============================================

class DiscordPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'discord'
  protected baseUrl: string = API_BASE_URLS.discord

  /**
   * Publish content to Discord via webhook
   *
   * The webhook URL can be:
   * 1. Stored during OAuth (webhook.incoming scope)
   * 2. Provided in settings.webhookUrl
   */
  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

    try {
      // Get webhook URL from settings or token metadata
      const webhookUrl = await this.getWebhookUrl(userId, content.settings?.webhookUrl)

      if (!webhookUrl) {
        return {
          success: false,
          platform: this.platform,
          error:
            'No Discord webhook configured. Please reconnect Discord or provide a webhook URL in settings.',
        }
      }

      // Build the message payload
      const payload = this.buildMessagePayload(content, media)

      console.log('[DiscordPublisher] Publishing to webhook', {
        hasContent: !!content.caption,
        hasMedia: !!media,
        hasEmbeds: payload.embeds?.length > 0,
      })

      const response = await fetch(`${webhookUrl}?wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[DiscordPublisher] Webhook error:', errorData)
        return {
          success: false,
          platform: this.platform,
          error: `Discord API error: ${errorData.message || response.status} ${response.statusText}`,
        }
      }

      const data = await response.json()

      // Extract channel and message IDs for the URL
      const messageUrl = data.id && data.channel_id
        ? `https://discord.com/channels/@me/${data.channel_id}/${data.id}`
        : undefined

      console.log('[DiscordPublisher] Published successfully:', {
        messageId: data.id,
        channelId: data.channel_id,
      })

      return {
        success: true,
        platform: this.platform,
        platformPostId: data.id,
        platformUrl: messageUrl,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[DiscordPublisher] Publish error:', error)
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Publish carousel/multiple images to Discord
   *
   * Discord supports multiple embeds (up to 10) in a single message
   */
  async publishCarousel(options: CarouselPublishOptions): Promise<PlatformCarouselResult> {
    const { userId, items, content } = options

    try {
      const webhookUrl = await this.getWebhookUrl(userId, content.settings?.webhookUrl)

      if (!webhookUrl) {
        return {
          platform: this.platform,
          success: false,
          error: 'No Discord webhook configured.',
          itemsPublished: 0,
          itemsTruncated: 0,
        }
      }

      // Prepare and validate carousel items
      const { validItems, truncatedCount } = this.prepareCarouselItems(items)

      if (validItems.length === 0) {
        return {
          platform: this.platform,
          success: false,
          error: 'No valid items for carousel',
          itemsPublished: 0,
          itemsTruncated: items.length,
        }
      }

      // Build embeds for each image (Discord supports up to 10 embeds)
      const embeds = validItems.slice(0, 10).map((item, index) => ({
        image: { url: item.mediaUrl },
        description: index === 0 ? content.caption?.substring(0, 2000) : undefined,
      }))

      const payload: Record<string, any> = { embeds }

      // Add text content if caption is too long for embed
      if (content.caption && content.caption.length > 2000) {
        payload.content = content.caption.substring(0, 2000)
        embeds[0].description = undefined
      }

      console.log(`[DiscordPublisher] Publishing carousel with ${embeds.length} images`)

      const response = await fetch(`${webhookUrl}?wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          platform: this.platform,
          success: false,
          error: `Discord API error: ${errorData.message || response.status}`,
          itemsPublished: 0,
          itemsTruncated: items.length,
        }
      }

      const data = await response.json()

      return {
        platform: this.platform,
        success: true,
        postId: data.id,
        postUrl: data.id && data.channel_id
          ? `https://discord.com/channels/@me/${data.channel_id}/${data.id}`
          : undefined,
        itemsPublished: validItems.length,
        itemsTruncated: truncatedCount,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[DiscordPublisher] Carousel error:', error)
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
   * Get webhook URL from settings
   *
   * Discord webhooks need to be configured by the user:
   * 1. Go to Discord Server Settings > Integrations > Webhooks
   * 2. Create a new webhook for the desired channel
   * 3. Copy the webhook URL and paste it in ReGen settings
   */
  private async getWebhookUrl(userId: string, settingsWebhookUrl?: string): Promise<string | null> {
    // Check if webhook URL is provided in settings
    if (settingsWebhookUrl) {
      return settingsWebhookUrl
    }

    // For now, webhook URL must be provided in settings
    // Future: Could store webhook during OAuth if user grants webhook.incoming scope
    console.log('[DiscordPublisher] No webhook URL found in settings')
    return null
  }

  /**
   * Build message payload for Discord webhook
   */
  private buildMessagePayload(
    content: PublishOptions['content'],
    media?: PublishOptions['media']
  ): Record<string, any> {
    const payload: Record<string, any> = {}
    const embeds: Record<string, any>[] = []

    // Format caption with hashtags and mentions
    const caption = this.formatCaption(content)

    // If we have media, create an embed
    if (media?.mediaUrl) {
      const embed: Record<string, any> = {}

      // Add title if provided
      if (content.settings?.title) {
        embed.title = content.settings.title.substring(0, 256)
      }

      // Add description (caption)
      if (caption) {
        embed.description = caption.substring(0, 4096) // Discord embed description limit
      }

      // Add media based on type
      if (media.mimeType?.startsWith('video/')) {
        // Video - use video embed or link
        // Discord webhooks don't support direct video upload, use URL
        embed.video = { url: media.mediaUrl }
        // Add as URL in content for better compatibility
        payload.content = media.mediaUrl
      } else if (media.mimeType?.startsWith('image/')) {
        // Image embed
        embed.image = { url: media.mediaUrl }
      }

      // Add link if provided
      if (content.settings?.link) {
        embed.url = content.settings.link
      }

      // Add color (Discord brand color)
      embed.color = 0x5865F2 // Discord blurple

      // Add timestamp
      embed.timestamp = new Date().toISOString()

      embeds.push(embed)
    } else {
      // Text-only post
      payload.content = caption?.substring(0, 2000) || ''
    }

    if (embeds.length > 0) {
      payload.embeds = embeds
    }

    return payload
  }

  /**
   * Get post analytics from Discord
   *
   * Note: Discord doesn't provide analytics for webhook messages.
   * This returns empty analytics.
   */
  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    // Discord doesn't provide analytics for webhook messages
    console.log('[DiscordPublisher] Analytics not available for Discord webhooks')

    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: 0,
      impressions: 0,
      demographics: {
        ageRanges: {},
        genders: {},
        countries: {},
      },
      locationData: [],
      retentionCurve: [],
    }
  }

  /**
   * Delete a Discord message
   *
   * Requires the webhook URL to include the message token
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const webhookUrl = await this.getWebhookUrl(userId)

      if (!webhookUrl) {
        console.error('[DiscordPublisher] No webhook URL for delete')
        return false
      }

      // Delete message via webhook
      const response = await fetch(`${webhookUrl}/messages/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        console.error('[DiscordPublisher] Delete error:', response.status)
        return false
      }

      return true
    } catch (error) {
      console.error('[DiscordPublisher] Delete error:', error)
      return false
    }
  }

  /**
   * Get user's guilds (servers) from Discord
   *
   * Useful for displaying which servers the user can post to
   */
  async getUserGuilds(
    userId: string
  ): Promise<Array<{ id: string; name: string; icon: string | null; owner: boolean }>> {
    try {
      const accessToken = await this.getAccessToken(userId)

      const response = await fetch(`${this.baseUrl}/users/@me/guilds`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch guilds: ${response.status}`)
      }

      const data = await response.json()

      return data.map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
          : null,
        owner: guild.owner,
      }))
    } catch (error) {
      console.error('[DiscordPublisher] Guilds error:', error)
      return []
    }
  }
}

// Export singleton instance
export const discordPublisher = new DiscordPublisher()

export default discordPublisher
