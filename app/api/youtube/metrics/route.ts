/**
 * GET /api/youtube/metrics
 *
 * Get YouTube analytics metrics
 *
 * Query params:
 * - videoId (optional): Get metrics for specific video
 * - startDate (optional): ISO date for start of range
 * - endDate (optional): ISO date for end of range
 *
 * Response:
 * {
 *   channelId: string,
 *   channelTitle: string,
 *   videos?: YouTubeVideoMetrics[],
 *   channelMetrics?: YouTubeChannelMetrics,
 *   fetchedAt: string,
 *   cached: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/getUser';
import type { GetYouTubeMetricsResponse } from '@/lib/types/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Dynamic import to avoid circular dependency
    const { youtubeService } = await import('@/lib/services/youtube');

    // Get authenticated user
    const profileId = await getUserId(request);

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Check YouTube connection
    const connectionStatus = await youtubeService.getConnectionStatus(profileId);
    if (!connectionStatus.connected) {
      return NextResponse.json(
        { error: 'YouTube not connected', code: 'NOT_CONNECTED' },
        { status: 400 }
      );
    }

    let response: GetYouTubeMetricsResponse;

    if (videoId) {
      // Get specific video metrics
      const videoMetrics = await youtubeService.getVideoMetrics(
        profileId,
        videoId,
        startDate,
        endDate
      );

      response = {
        channelId: connectionStatus.channelId || '',
        channelTitle: connectionStatus.channelTitle || '',
        videos: [videoMetrics],
        fetchedAt: videoMetrics.fetchedAt,
        cached: videoMetrics.cached,
      };
    } else {
      // Get channel metrics
      const channelMetrics = await youtubeService.getChannelMetrics(
        profileId,
        startDate,
        endDate
      );

      response = {
        channelId: channelMetrics.channelId,
        channelTitle: channelMetrics.channelTitle,
        channelMetrics,
        fetchedAt: channelMetrics.fetchedAt,
        cached: channelMetrics.cached,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[YouTube Metrics Error]', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
        code: 'METRICS_ERROR',
      },
      { status: 500 }
    );
  }
}
