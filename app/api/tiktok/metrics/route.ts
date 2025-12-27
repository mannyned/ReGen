/**
 * GET /api/tiktok/metrics
 *
 * Get metrics for a specific TikTok video
 * Uses caching to reduce API calls
 *
 * Query params:
 * - videoId (required): TikTok video ID
 *
 * Response:
 * {
 *   videoId: string,
 *   metrics: { views, likes, comments, shares },
 *   fetchedAt: string (ISO date),
 *   cached: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import { tiktokService } from '@/lib/services/tiktok'
import type { GetTikTokMetricsResponse } from '@/lib/types/tiktok'

export const runtime = 'nodejs'

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

    // Get videoId from query params
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required', code: 'MISSING_VIDEO_ID' },
        { status: 400 }
      )
    }

    // Check TikTok connection
    const connectionStatus = await tiktokService.getConnectionStatus(profileId)
    if (!connectionStatus.connected) {
      return NextResponse.json(
        { error: 'TikTok not connected', code: 'NOT_CONNECTED' },
        { status: 400 }
      )
    }

    // Fetch metrics (uses cache if available)
    const result = await tiktokService.getVideoMetrics(profileId, videoId)

    const response: GetTikTokMetricsResponse = {
      videoId: result.videoId,
      metrics: result.metrics,
      fetchedAt: result.fetchedAt.toISOString(),
      cached: result.cached,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[TikTok Metrics Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    )
  }
}
