/**
 * GET /api/discord/channels
 *
 * Fetches the user's Discord servers and channels.
 *
 * Flow:
 * 1. If no guild selected yet, returns list of user's guilds to choose from
 * 2. If guild selected, returns channels from that guild (via bot)
 *
 * Query params:
 * - guildId: Optional guild ID to fetch channels for
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { decrypt } from '@/lib/crypto/encrypt'

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
  owner?: boolean
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

    const metadata = connection.metadata as Record<string, unknown> | null
    const storedGuildId = metadata?.guildId || metadata?.webhookGuildId

    // Check if a specific guild was requested
    const url = new URL(request.url)
    const requestedGuildId = url.searchParams.get('guildId')

    // Use requested guild, or fall back to stored guild
    const guildId = requestedGuildId || storedGuildId

    // Bot token is required for fetching channels
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json(
        { error: 'Discord bot not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // If no guild selected, fetch user's guilds so they can select one
    if (!guildId) {
      // Decrypt user's access token to fetch their guilds
      const accessToken = decrypt(connection.accessTokenEnc)
      console.log('[Discord Channels] Fetching guilds with access token, token length:', accessToken?.length || 0)

      const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      console.log('[Discord Channels] Guilds response status:', guildsResponse.status)

      if (!guildsResponse.ok) {
        const errorData = await guildsResponse.json().catch(() => ({}))
        console.error('[Discord Channels] Failed to fetch guilds:', errorData)
        return NextResponse.json(
          { error: 'Failed to fetch your Discord servers. Please reconnect Discord.' },
          { status: 400 }
        )
      }

      const userGuilds = await guildsResponse.json()

      // Return guilds list for user to select from
      const guilds: DiscordGuild[] = userGuilds.map((g: any) => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        owner: g.owner,
      }))

      return NextResponse.json({
        needsGuildSelection: true,
        guilds,
        channels: [],
        currentChannelId: null,
        botInviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=51200&scope=bot`,
      })
    }

    // Fetch guild info
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
        icon: guildData.icon ? `https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.png` : null,
      }
    }

    // Fetch channels from the guild
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (!channelsResponse.ok) {
      const errorStatus = channelsResponse.status
      console.error('[Discord Channels] Failed to fetch channels, status:', errorStatus)

      // Bot is not in this server
      if (errorStatus === 403 || errorStatus === 404) {
        // Fetch user's guilds so they can see the bot invite prompt
        const accessToken = decrypt(connection.accessTokenEnc)
        const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        let guilds: DiscordGuild[] = []
        if (guildsResponse.ok) {
          const userGuilds = await guildsResponse.json()
          guilds = userGuilds.map((g: any) => ({
            id: g.id,
            name: g.name,
            icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
            owner: g.owner,
          }))
        }

        return NextResponse.json({
          guild,
          guilds,
          channels: [],
          currentChannelId: null,
          needsBotInvite: true,
          botInviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=51200&scope=bot&guild_id=${guildId}`,
          error: 'Bot is not in this server. Please add the bot first.',
        })
      }

      return NextResponse.json({
        guild,
        channels: [],
        currentChannelId: null,
        error: 'Could not fetch channels.',
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

    // Default to first text channel
    const currentChannelId = textChannels.length > 0 ? textChannels[0].id : null

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

/**
 * POST /api/discord/channels
 *
 * Save the selected guild ID to the user's Discord connection
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { guildId, guildName, guildIcon } = body

    if (!guildId) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Update the Discord connection with selected guild
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

    const existingMetadata = connection.metadata as Record<string, unknown> || {}

    await prisma.oAuthConnection.update({
      where: {
        profileId_provider: {
          profileId,
          provider: 'discord',
        },
      },
      data: {
        metadata: {
          ...existingMetadata,
          guildId,
          guildName,
          guildIcon,
        },
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Discord Channels] POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to save guild selection' },
      { status: 500 }
    )
  }
}
