/**
 * Discord Publishing Service
 *
 * Handles publishing content to Discord via Bot API.
 *
 * Discord Integration:
 * - Uses Discord Bot API to post messages to any channel the bot has access to
 * - Bot is added to server during OAuth flow
 * - Channel selection happens at publish time (not during OAuth)
 *
 * Supports:
 * - Text messages (up to 2000 characters)
 * - Embeds (rich content with images, titles, descriptions)
 * - Image attachments
 * - Video links (embedded via URL)
 *
 * @see https://discord.com/developers/docs/resources/channel#create-message
 */

import type {
  SocialPlatform,
  PublishResult,
  PostAnalytics,
  CarouselPublishOptions,
  PlatformCarouselResult,
} from '../../types/social'
import { BasePlatformPublisher, PublishOptions } from './BasePlatformPublisher'
import { API_BASE_URLS } from '../../config/oauth'
import { prisma } from '@/lib/db'

// ============================================
// DISCORD PUBLISHER
// ============================================

class DiscordPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'discord'
  protected baseUrl: string = API_BASE_URLS.discord

  /**
   * Get the Discord Bot Token from environment
   */
  private getBotToken(): string | null {
    return process.env.DISCORD_BOT_TOKEN || null
  }

  /**
   * Get the channel ID for publishing
   * Priority: 1. discordChannelId from options, 2. stored guildId's first channel
   */
  private async getChannelId(userId: string, optionsChannelId?: string): Promise<string | null> {
    // If channel ID is provided in options, use it
    if (optionsChannelId) {
      return optionsChannelId
    }

    // Try to get from connection metadata (legacy support)
    try {
      const connection = await prisma.oAuthConnection.findUnique({
        where: {
          profileId_provider: {
            profileId: userId,
            provider: 'discord',
          },
        },
      })

      if (connection?.metadata) {
        const metadata = connection.metadata as Record<string, any>
        // Check for stored channel ID
        if (metadata.channelId) {
          return metadata.channelId
        }
        // Check legacy webhook channel ID
        if (metadata.webhookChannelId) {
          return metadata.webhookChannelId
        }
      }
    } catch (error) {
      console.error('[DiscordPublisher] Error fetching connection:', error)
    }

    return null
  }

  /**
   * Get the guild ID for the user's Discord connection
   */
  private async getGuildId(userId: string): Promise<string | null> {
    try {
      const connection = await prisma.oAuthConnection.findUnique({
        where: {
          profileId_provider: {
            profileId: userId,
            provider: 'discord',
          },
        },
      })

      if (connection?.metadata) {
        const metadata = connection.metadata as Record<string, any>
        return metadata.guildId || metadata.webhookGuildId || null
      }
    } catch (error) {
      console.error('[DiscordPublisher] Error fetching guild ID:', error)
    }

    return null
  }

  /**
   * Publish content to Discord via Bot API
   *
   * Posts a message to the specified channel using the bot token.
   */
  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media, discordChannelId } = options

    console.log('[DiscordPublisher] publishContent called:', {
      userId,
      discordChannelId,
      hasDiscordChannelId: !!discordChannelId,
      optionsKeys: Object.keys(options),
    })

    try {
      const botToken = this.getBotToken()

      if (!botToken) {
        return {
          success: false,
          platform: this.platform,
          error: 'Discord bot token not configured. Please contact support.',
        }
      }

      const channelId = await this.getChannelId(userId, discordChannelId)
      console.log('[DiscordPublisher] getChannelId returned:', channelId)

      if (!channelId) {
        return {
          success: false,
          platform: this.platform,
          error: 'No Discord channel selected. Please select a channel to post to.',
        }
      }

      // Build the message payload
      const payload = this.buildMessagePayload(content, media)

      console.log('[DiscordPublisher] Publishing via Bot API', {
        channelId,
        hasContent: !!content.caption,
        hasMedia: !!media,
        hasEmbeds: payload.embeds?.length > 0,
      })

      const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${botToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[DiscordPublisher] Bot API error:', errorData)

        // Handle specific error cases
        if (response.status === 403) {
          return {
            success: false,
            platform: this.platform,
            error: 'Bot does not have permission to post in this channel. Please check bot permissions.',
          }
        }
        if (response.status === 404) {
          return {
            success: false,
            platform: this.platform,
            error: 'Channel not found. The channel may have been deleted.',
          }
        }

        return {
          success: false,
          platform: this.platform,
          error: `Discord API error: ${errorData.message || response.status} ${response.statusText}`,
        }
      }

      const data = await response.json()

      // Get guild ID for proper URL construction
      const guildId = await this.getGuildId(userId)

      // Build proper message URL
      const messageUrl = data.id && data.channel_id
        ? `https://discord.com/channels/${guildId || '@me'}/${data.channel_id}/${data.id}`
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
    const discordChannelId = (options as any).discordChannelId

    try {
      const botToken = this.getBotToken()

      if (!botToken) {
        return {
          platform: this.platform,
          success: false,
          error: 'Discord bot token not configured.',
          itemsPublished: 0,
          itemsTruncated: 0,
        }
      }

      const channelId = await this.getChannelId(userId, discordChannelId)

      if (!channelId) {
        return {
          platform: this.platform,
          success: false,
          error: 'No Discord channel selected.',
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
        color: 0x5865F2, // Discord blurple
      }))

      const payload: Record<string, any> = { embeds }

      // Add text content if caption is too long for embed
      if (content.caption && content.caption.length > 2000) {
        payload.content = content.caption.substring(0, 2000)
        embeds[0].description = undefined
      }

      console.log(`[DiscordPublisher] Publishing carousel with ${embeds.length} images to channel ${channelId}`)

      const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${botToken}`,
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
      const guildId = await this.getGuildId(userId)

      return {
        platform: this.platform,
        success: true,
        postId: data.id,
        postUrl: data.id && data.channel_id
          ? `https://discord.com/channels/${guildId || '@me'}/${data.channel_id}/${data.id}`
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
   * Build message payload for Discord Bot API
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
        // Video - Discord bot API doesn't support direct video upload via JSON
        // Add video URL in content for embedding
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
   * Note: Discord doesn't provide public analytics for bot messages.
   * This returns empty analytics.
   */
  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    console.log('[DiscordPublisher] Analytics not available for Discord messages')

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
   * Delete a Discord message via Bot API
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const botToken = this.getBotToken()

      if (!botToken) {
        console.error('[DiscordPublisher] No bot token for delete')
        return false
      }

      // We need the channel ID to delete - try to get from connection
      const channelId = await this.getChannelId(userId)

      if (!channelId) {
        console.error('[DiscordPublisher] No channel ID for delete')
        return false
      }

      const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${botToken}`,
        },
      })

      if (!response.ok && response.status !== 204) {
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
