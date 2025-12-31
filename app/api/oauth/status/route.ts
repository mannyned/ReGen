import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// ============================================
// GET /api/oauth/status
// Get all connected platforms for a user
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'

    // Query from oAuthConnection table (where OAuth engine stores connections)
    const connections = await prisma.oAuthConnection.findMany({
      where: {
        profileId: userId,
      },
    })

    const connectedPlatforms = connections.map(connection => ({
      platform: connection.provider, // 'meta', 'google', 'tiktok', etc.
      username: (connection.metadata as any)?.primaryInstagramAccount?.username ||
                (connection.metadata as any)?.instagramAccounts?.[0]?.username ||
                (connection.metadata as any)?.youtubeChannel?.title ||
                (connection.metadata as any)?.displayName ||
                connection.providerAccountId,
      profileImageUrl: (connection.metadata as any)?.primaryInstagramAccount?.profilePictureUrl ||
                       (connection.metadata as any)?.instagramAccounts?.[0]?.profilePictureUrl ||
                       (connection.metadata as any)?.youtubeChannel?.thumbnailUrl ||
                       (connection.metadata as any)?.avatarUrl,
      connectedAt: connection.createdAt,
      isActive: true,
      expiresAt: connection.expiresAt,
    }))

    return NextResponse.json({
      success: true,
      userId,
      connectedPlatforms,
      totalConnected: connectedPlatforms.length,
    })

  } catch (error: unknown) {
    console.error('Status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch connection status',
      },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/oauth/status
// Check health of a specific connection
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, platform } = body

    if (!userId || !platform) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId and platform are required',
        },
        { status: 400 }
      )
    }

    // Check if connection exists in oAuthConnection table
    const connection = await prisma.oAuthConnection.findFirst({
      where: {
        profileId: userId,
        provider: platform,
      },
    })

    const healthy = !!connection && (!connection.expiresAt || connection.expiresAt > new Date())

    return NextResponse.json({
      success: true,
      platform,
      healthy,
      message: healthy ? 'Connection is active' : 'Connection not found or expired',
    })

  } catch (error: unknown) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check connection health',
      },
      { status: 500 }
    )
  }
}
