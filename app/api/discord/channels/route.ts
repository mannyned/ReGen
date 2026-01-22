/**
 * GET /api/discord/channels
 *
 * Fetches the user's Discord guilds and text channels they can post to.
 * Returns channels from the guild associated with the user's webhook.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { decrypt } from '@/lib/oauth/encryption'

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

    // Decrypt access token
    const accessToken = await decrypt(connection.accessTokenEnc)

    // Get webhook info from metadata
    const metadata = connection.metadata as Record<string, unknown> | null
    const webhook = metadata?.webhook as { guild_id?: string; channel_id?: string } | undefined
    const guildId = metadata?.guildId || webhook?.guild_id

    if (!guildId) {
      return NextResponse.json(
        { error: 'No Discord server associated. Please reconnect Discord.' },
        { status: 400 }
      )
    }

    // Fetch guild info
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN || accessToken}`,
      },
    })

    let guild: DiscordGuild | null = null
    if (guildResponse.ok) {
      const guildData = await guildResponse.json()
      guild = {
        id: guildData.id,
        name: guildData.name,
        icon: guildData.icon,
      }
    }

    // Fetch channels from the guild
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN || accessToken}`,
      },
    })

    if (!channelsResponse.ok) {
      // If we can't fetch channels, return the current webhook channel as the only option
      const currentChannel = webhook?.channel_id
      return NextResponse.json({
        guild,
        channels: currentChannel ? [{
          id: currentChannel,
          name: 'Current Channel (webhook)',
          type: 0,
          position: 0,
        }] : [],
        currentChannelId: currentChannel,
        limited: true,
        message: 'Channel list limited. Using webhook channel only.',
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

    return NextResponse.json({
      guild,
      channels: textChannels,
      currentChannelId: webhook?.channel_id,
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
