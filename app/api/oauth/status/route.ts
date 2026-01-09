import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

// ============================================
// GET /api/oauth/status
// Get all connected platforms for a user
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user ID
    const userId = await getUserId(request)
    console.log('[OAuth Status] getUserId returned:', userId)

    if (!userId) {
      console.log('[OAuth Status] No userId, returning 401')
      return NextResponse.json(
        { success: false, error: 'Not authenticated', connectedPlatforms: [], totalConnected: 0 },
        { status: 401 }
      )
    }

    // Query from oAuthConnection table (where OAuth engine stores connections)
    const connections = await prisma.oAuthConnection.findMany({
      where: {
        profileId: userId,
      },
    })

    console.log('[OAuth Status] Found connections:', connections.map(c => ({
      provider: c.provider,
      providerAccountId: c.providerAccountId,
      createdAt: c.createdAt,
    })))

    const connectedPlatforms = connections.map(connection => {
      const metadata = connection.metadata as any;

      // Extract username and profile image based on provider type
      let username = metadata?.username || metadata?.displayName || connection.providerAccountId;
      let profileImageUrl = metadata?.profilePictureUrl || metadata?.avatarUrl;

      // Map provider names to platform names used by the UI
      // 'google' OAuth provider is used for YouTube
      let platform = connection.provider;

      // For Google/YouTube connections
      if (connection.provider === 'google') {
        platform = 'youtube'; // Map 'google' to 'youtube' for UI consistency
        username = metadata?.youtubeChannel?.title || metadata?.googleName || username;
        profileImageUrl = metadata?.youtubeChannel?.thumbnailUrl || metadata?.googlePicture || profileImageUrl;
      }

      return {
        platform, // 'instagram', 'facebook', 'youtube', 'tiktok', etc.
        username,
        profileImageUrl,
        connectedAt: connection.createdAt,
        isActive: true,
        expiresAt: connection.expiresAt,
      };
    })

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
    // Get authenticated user ID
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { platform } = body

    if (!platform) {
      return NextResponse.json(
        {
          success: false,
          error: 'platform is required',
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
