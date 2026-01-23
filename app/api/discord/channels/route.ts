/**
 * GET /api/discord/channels
 *
 * Fetches the user's Discord guilds and text channels they can post to.
 * Returns channels from the guild associated with the user's Discord connection.
 *
 * Supports both:
 * - Bot authorization (bot scope) - guild ID from tokens.raw.guild
 * - Legacy webhook authorization (webhook.incoming scope) - guild ID from webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

export const runtime = 'nodejs'

interface DiscordChannel {
  id: string
  name: string
  type: number
  position: number
}

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get Discord connection
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: 'discord',
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Discord not connected' },
        { status: 404 }
      )
    }

    // Get guild info from metadata
    // Supports both bot auth (guildId) and legacy webhook auth (webhookGuildId)
    const metadata = connection.metadata as Record<string, unknown> | null
    const guildId = metadata?.guildId || metadata?.webhookGuildId
    const guildName = metadata?.guildName as string | undefined
    const guildIcon = metadata?.guildIcon as string | undefined

    // Legacy webhook info (for backward compatibility)
    const webhookChannelId = metadata?.webhookChannelId as string | undefined

    if (!guildId) {
      return NextResponse.json(
        { error: 'No Discord server associated. Please reconnect Discord and select a server.' },
        { status: 400 }
      )
    }

    // Bot token is required for fetching channels
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json(
        { error: 'Discord bot not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Fetch guild info (to get latest name/icon)
    let guild: DiscordGuild | null = null
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (guildResponse.ok) {
      const guildData = await guildResponse.json()
      guild = {
        id: guildData.id,
        name: guildData.name,
        icon: guildData.icon,
      }
    } else {
      // Use cached guild info from metadata if API fails
      guild = guildName ? {
        id: guildId as string,
        name: guildName,
        icon: guildIcon || null,
      } : null
    }

    // Fetch channels from the guild
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (!channelsResponse.ok) {
      const errorData = await channelsResponse.json().catch(() => ({}))
      console.error('[Discord Channels] Failed to fetch channels:', errorData)

      // If bot doesn't have access, inform user
      if (channelsResponse.status === 403) {
        return NextResponse.json({
          guild,
          channels: [],
          currentChannelId: null,
          limited: true,
          error: 'Bot does not have access to this server. Please re-add the bot with proper permissions.',
        })
      }

      // For legacy webhook users, return the webhook channel as fallback
      if (webhookChannelId) {
        return NextResponse.json({
          guild,
          channels: [{
            id: webhookChannelId,
            name: 'Webhook Channel',
            type: 0,
            position: 0,
          }],
          currentChannelId: webhookChannelId,
          limited: true,
          message: 'Channel list limited. Please reconnect Discord to see all channels.',
        })
      }

      return NextResponse.json({
        guild,
        channels: [],
        currentChannelId: null,
        limited: true,
        error: 'Could not fetch channels. Please reconnect Discord.',
      })
    }

    const allChannels = await channelsResponse.json()

    // Filter to text channels only (type 0 = text, type 5 = announcement)
    const textChannels: DiscordChannel[] = allChannels
      .filter((ch: DiscordChannel) => ch.type === 0 || ch.type === 5)
      .sort((a: DiscordChannel, b: DiscordChannel) => a.position - b.position)
      .map((ch: DiscordChannel) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: ch.position,
      }))

    // Determine current/default channel
    // Priority: webhookChannelId (legacy), then first text channel
    const currentChannelId = webhookChannelId || (textChannels.length > 0 ? textChannels[0].id : null)

    return NextResponse.json({
      guild,
      channels: textChannels,
      currentChannelId,
      limited: false,
    })

  } catch (error) {
    console.error('[Discord Channels] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Discord channels' },
      { status: 500 }
    )
  }
}
