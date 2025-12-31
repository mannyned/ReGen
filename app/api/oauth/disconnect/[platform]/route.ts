import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Map platform IDs to OAuth provider IDs
const PLATFORM_TO_PROVIDER: Record<string, string> = {
  'instagram': 'meta',
  'facebook': 'meta',
  'youtube': 'google',
  'tiktok': 'tiktok',
  'twitter': 'x',
  'linkedin': 'linkedin',
  'snapchat': 'snapchat',
  'pinterest': 'pinterest',
  'discord': 'discord',
}

// ============================================
// DELETE /api/oauth/disconnect/[platform]
// Disconnect a social media platform
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'
    const { platform } = await params

    // Map platform to provider (instagram -> meta, youtube -> google)
    const provider = PLATFORM_TO_PROVIDER[platform] || platform

    console.log(`[Disconnect] User: ${userId}, Platform: ${platform}, Provider: ${provider}`)

    // Delete from oAuthConnection table
    const result = await prisma.oAuthConnection.deleteMany({
      where: {
        profileId: userId,
        provider: provider,
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No connection found for ${platform}`,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      platform: platform,
      provider: provider,
      message: `Successfully disconnected from ${platform}`,
    })

  } catch (error: unknown) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect platform',
      },
      { status: 500 }
    )
  }
}
