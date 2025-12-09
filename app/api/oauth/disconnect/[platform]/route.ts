import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform } from '@/lib/types/social'
import { validatePlatform } from '@/lib/config/oauth'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

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

    // Validate platform
    if (!validatePlatform(platform)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid platform: ${platform}`,
        },
        { status: 400 }
      )
    }

    const validPlatform = platform as SocialPlatform

    // Disconnect the platform
    const disconnected = await tokenManager.disconnect(userId, validPlatform)

    if (!disconnected) {
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
      platform: validPlatform,
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
