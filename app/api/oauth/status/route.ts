import { NextRequest, NextResponse } from 'next/server'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

// ============================================
// GET /api/oauth/status
// Get all connected platforms for a user
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'

    const connections = await tokenManager.getUserConnections(userId)

    const connectedPlatforms = connections.map(connection => ({
      platform: connection.platform,
      username: connection.username || connection.displayName,
      profileImageUrl: connection.profileImageUrl,
      connectedAt: connection.createdAt,
      isActive: connection.isActive,
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

    const health = await tokenManager.checkConnectionHealth(userId, platform)

    return NextResponse.json({
      success: true,
      platform,
      healthy: health.healthy,
      message: health.message,
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
