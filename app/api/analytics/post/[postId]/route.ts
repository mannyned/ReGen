import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform } from '@/lib/types/social'
import { publishingService } from '@/lib/services/publishing'
import { validatePlatformParam, validationErrorResponse } from '@/lib/middleware/validation'

// ============================================
// GET /api/analytics/post/[postId]
// Get analytics for a specific post
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const platform = searchParams.get('platform')
    const { postId } = await params

    if (!userId) {
      return validationErrorResponse([{ field: 'userId', message: 'userId is required' }])
    }

    if (!platform) {
      return validationErrorResponse([{ field: 'platform', message: 'platform is required' }])
    }

    // Validate platform
    const platformValidation = validatePlatformParam(platform)
    if (!platformValidation.valid) {
      return validationErrorResponse(platformValidation.errors)
    }

    const analytics = await publishingService.getPostAnalytics(
      platform as SocialPlatform,
      postId,
      userId
    )

    return NextResponse.json({
      success: true,
      postId,
      platform,
      data: analytics,
    })

  } catch (error: unknown) {
    console.error('Post analytics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch post analytics',
      },
      { status: 500 }
    )
  }
}
