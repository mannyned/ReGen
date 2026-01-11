/**
 * GET /api/tiktok/videos
 *
 * List user's TikTok videos with metrics
 *
 * Query params:
 * - cursor (optional): Pagination cursor
 *
 * Response:
 * {
 *   videos: TikTokVideoWithMetrics[],
 *   hasMore: boolean,
 *   cursor: string | null
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import type { GetTikTokVideosResponse } from '@/lib/types/tiktok'

export const runtime = 'nodejs'

// Lazy import to avoid circular dependency
async function getTikTokService() {
  const { tiktokService } = await import('@/lib/services/tiktok')
  return tiktokService
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
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

    // Get pagination cursor from query params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined

    // Fetch videos with metrics
    const result = await tiktokService.getVideosWithMetrics(profileId, cursor)

    const response: GetTikTokVideosResponse = {
      videos: result.videos,
      hasMore: result.hasMore,
      cursor: result.cursor,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[TikTok Videos Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch videos',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    )
  }
}
