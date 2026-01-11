/**
 * POST /api/tiktok/post
 *
 * Create a new TikTok post
 * Supports immediate posting and scheduling
 *
 * Request body:
 * {
 *   contentUploadId?: string,  // Reference to uploaded content
 *   videoUrl?: string,         // Direct video URL (must be from verified domain)
 *   caption: string,
 *   privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY',
 *   disableComments?: boolean,
 *   disableDuet?: boolean,
 *   disableStitch?: boolean,
 *   scheduledAt?: string       // ISO date for scheduled posts
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   postId: string,
 *   status: 'uploading' | 'processing' | 'posted' | 'scheduled',
 *   tiktokVideoId?: string,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import type { CreateTikTokPostRequest, CreateTikTokPostResponse, TikTokPrivacyLevel } from '@/lib/types/tiktok'

export const runtime = 'nodejs'

// Lazy import to avoid circular dependency
async function getTikTokService() {
  const { tiktokService } = await import('@/lib/services/tiktok')
  return tiktokService
}

// Validate privacy level
const VALID_PRIVACY_LEVELS: TikTokPrivacyLevel[] = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
]

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: CreateTikTokPostRequest = await request.json()

    // Validate required fields
    if (!body.caption) {
      return NextResponse.json(
        { error: 'caption is required', code: 'MISSING_CAPTION' },
        { status: 400 }
      )
    }

    if (!body.videoUrl && !body.contentUploadId) {
      return NextResponse.json(
        { error: 'Either videoUrl or contentUploadId is required', code: 'MISSING_VIDEO' },
        { status: 400 }
      )
    }

    // Validate privacy level if provided
    if (body.privacyLevel && !VALID_PRIVACY_LEVELS.includes(body.privacyLevel)) {
      return NextResponse.json(
        {
          error: 'Invalid privacy level',
          code: 'INVALID_PRIVACY_LEVEL',
          validLevels: VALID_PRIVACY_LEVELS,
        },
        { status: 400 }
      )
    }

    // Get service instance (lazy loaded to avoid circular dependency)
    const tiktokService = await getTikTokService()

    // Check TikTok connection
    const connectionStatus = await tiktokService.getConnectionStatus(profileId)
    if (!connectionStatus.connected) {
      return NextResponse.json(
        { error: 'TikTok not connected', code: 'NOT_CONNECTED' },
        { status: 400 }
      )
    }

    // Parse scheduled date if provided
    let scheduledAt: Date | undefined
    if (body.scheduledAt) {
      scheduledAt = new Date(body.scheduledAt)
      if (isNaN(scheduledAt.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduledAt date', code: 'INVALID_DATE' },
          { status: 400 }
        )
      }
      // Ensure scheduled time is in the future
      if (scheduledAt <= new Date()) {
        return NextResponse.json(
          { error: 'scheduledAt must be in the future', code: 'INVALID_SCHEDULE_TIME' },
          { status: 400 }
        )
      }
    }

    // Create the post
    const result = await tiktokService.postVideo(profileId, {
      caption: body.caption,
      videoUrl: body.videoUrl,
      contentUploadId: body.contentUploadId,
      privacyLevel: body.privacyLevel,
      disableComments: body.disableComments,
      disableDuet: body.disableDuet,
      disableStitch: body.disableStitch,
      scheduledAt,
    })

    const response: CreateTikTokPostResponse = {
      success: result.success,
      postId: result.postId,
      status: result.status,
      tiktokVideoId: result.tiktokVideoId,
      error: result.error,
    }

    if (!result.success) {
      return NextResponse.json(response, { status: 400 })
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[TikTok Post Error]', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
        code: 'POST_ERROR',
      },
      { status: 500 }
    )
  }
}
