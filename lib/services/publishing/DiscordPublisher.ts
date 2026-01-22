import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics, PlatformContent } from '../../types/social'
import { prisma } from '../../db'

// ============================================
// DISCORD PUBLISHER
// Uses Discord Webhooks for posting content
// ============================================

interface DiscordWebhook {
  id: string
  token: string
  url: string
  name: string
  avatar: string | null
  channel_id: string
  guild_id: string
  application_id: string
}

interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number
  image?: { url: string }
  video?: { url: string }
  thumbnail?: { url: string }
  footer?: { text: string }
  timestamp?: string
}

interface DiscordWebhookPayload {
  content?: string
  username?: string
  avatar_url?: string
  embeds?: DiscordEmbed[]
}

export class DiscordPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'discord'
  protected baseUrl = 'https://discord.com/api/v10'

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media, discordChannelId } = options

    console.log('[DiscordPublisher] publishContent called with media:', media ? {
      mediaUrl: media.mediaUrl?.substring(0, 100),
      mediaType: media.mediaType,
      mimeType: media.mimeType,
      additionalMediaUrls: media.additionalMediaUrls?.length || 0,
    } : 'no media')
    console.log('[DiscordPublisher] Custom channel ID:', discordChannelId || 'using webhook default')

    try {
      // Get webhook from stored connection
      const webhook = await this.getWebhook(userId)

      console.log('[DiscordPublisher] Starting publish for user:', userId)
      console.log('[DiscordPublisher] Webhook data:', JSON.stringify(webhook, null, 2))

      if (!webhook || !webhook.url) {
        return {
          success: false,
          platform: this.platform,
          error: 'No Discord webhook found. Please reconnect Discord and select a server/channel.',
        }
      }

      // Determine target channel (custom selection or webhook default)
      const targetChannelId = discordChannelId || webhook.channel_id

      // Build webhook payload with multi-image support
      const payload = this.buildPayload(content, media)

      console.log('[DiscordPublisher] Payload:', JSON.stringify(payload, null, 2))

      // Validate payload has content
      if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
        return {
          success: false,
          platform: this.platform,
          error: 'Cannot send empty message to Discord. Please add text or media.',
        }
      }

      // If using a different channel than webhook default, we need to use bot API
      let response: Response
      let responseText: string

      if (discordChannelId && discordChannelId !== webhook.channel_id) {
        // Use bot token to post to different channel
        const botToken = process.env.DISCORD_BOT_TOKEN
        if (!botToken) {
          console.log('[DiscordPublisher] No bot token, falling back to webhook channel')
          // Fall back to webhook if no bot token
          response = await fetch(`${webhook.url}?wait=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } else {
          // Post to custom channel via bot
          response = await fetch(`${this.baseUrl}/channels/${discordChannelId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bot ${botToken}`,
            },
            body: JSON.stringify(payload),
          })
        }
      } else {
        // Use webhook for default channel
        response = await fetch(`${webhook.url}?wait=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      responseText = await response.text()
      console.log('[DiscordPublisher] Response:', response.status, responseText)

      if (!response.ok) {
        const errorData = responseText ? JSON.parse(responseText) : {}
        throw new Error(errorData.message || `Discord API error ${response.status}: ${responseText}`)
      }

      const result = JSON.parse(responseText)

      return {
        success: true,
        platform: this.platform,
        platformPostId: result.id,
        platformUrl: `https://discord.com/channels/${webhook.guild_id}/${targetChannelId}/${result.id}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[DiscordPublisher] Error:', error)
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to Discord',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    // Discord webhooks don't provide analytics
    // Return empty analytics
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

  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const webhook = await this.getWebhook(userId)

      if (!webhook) {
        return false
      }

      // Discord webhook delete endpoint
      const response = await fetch(`${webhook.url}/messages/${postId}`, {
        method: 'DELETE',
      })

      return response.ok
    } catch {
      return false
    }
  }

  // ============================================
  // DISCORD-SPECIFIC HELPERS
  // ============================================

  private async getWebhook(userId: string): Promise<DiscordWebhook | null> {
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        profileId_provider: {
          profileId: userId,
          provider: 'discord',
        },
      },
    })

    if (!connection?.metadata) {
      return null
    }

    const metadata = connection.metadata as Record<string, unknown>
    return metadata.webhook as DiscordWebhook | null
  }

  private buildPayload(content: PlatformContent, media?: ContentPayload): DiscordWebhookPayload {
    const caption = this.formatCaption(content)
    const payload: DiscordWebhookPayload = {}

    // Build content with media URLs
    // Discord auto-embeds image/video URLs when posted as plain text
    let messageContent = caption || ''

    // Collect all media URLs (primary + additional)
    const allMediaUrls: string[] = []
    if (media?.mediaUrl) {
      allMediaUrls.push(media.mediaUrl)
    }
    if (media?.additionalMediaUrls && media.additionalMediaUrls.length > 0) {
      allMediaUrls.push(...media.additionalMediaUrls)
    }

    // Add all media URLs to the message - Discord will auto-embed images/videos
    // Discord can embed up to 4 images in a single message when posted as URLs
    if (allMediaUrls.length > 0) {
      const mediaUrlsText = allMediaUrls.join('\n')
      messageContent = messageContent
        ? `${messageContent}\n\n${mediaUrlsText}`
        : mediaUrlsText
    }

    // Truncate to Discord's 2000 char limit
    payload.content = messageContent.substring(0, 2000)

    // Ensure we have something to send
    if (!payload.content) {
      payload.content = content.caption || 'Shared via ReGenr'
    }

    console.log('[DiscordPublisher] buildPayload: Total media URLs:', allMediaUrls.length)

    return payload
  }

  // ============================================
  // RICH EMBED PUBLISHING
  // ============================================

  /**
   * Publish content with a rich embed
   */
  async publishWithEmbed(
    userId: string,
    embed: DiscordEmbed,
    content?: string
  ): Promise<PublishResult> {
    try {
      const webhook = await this.getWebhook(userId)

      if (!webhook) {
        return {
          success: false,
          platform: this.platform,
          error: 'No Discord webhook found. Please reconnect Discord with server permissions.',
        }
      }

      const payload: DiscordWebhookPayload = {
        content,
        embeds: [embed],
      }

      const response = await fetch(`${webhook.url}?wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Discord API error: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: true,
        platform: this.platform,
        platformPostId: result.id,
        platformUrl: `https://discord.com/channels/${webhook.guild_id}/${webhook.channel_id}/${result.id}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to Discord',
      }
    }
  }

  /**
   * Create a rich embed for content announcements
   */
  createContentEmbed(
    title: string,
    description: string,
    imageUrl?: string,
    color?: number
  ): DiscordEmbed {
    return {
      title,
      description,
      color: color || 0x5865F2, // Discord blurple
      image: imageUrl ? { url: imageUrl } : undefined,
      timestamp: new Date().toISOString(),
      footer: { text: 'Posted via ReGenr' },
    }
  }
}

export const discordPublisher = new DiscordPublisher()
