/**
 * GET /api/youtube/videos
 *
 * List user's YouTube videos
 *
 * Query params:
 * - maxResults (optional): Number of videos to return (default 20)
 * - pageToken (optional): Pagination token
 *
 * Response:
 * {
 *   videos: YouTubeVideoResource[],
 *   nextPageToken?: string,
 *   totalResults: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/getUser';
import { youtubeService } from '@/lib/services/youtube';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
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
    const maxResults = parseInt(searchParams.get('maxResults') || '20', 10);
    const pageToken = searchParams.get('pageToken') || undefined;

    // Validate maxResults
    if (maxResults < 1 || maxResults > 50) {
      return NextResponse.json(
        { error: 'maxResults must be between 1 and 50', code: 'INVALID_MAX_RESULTS' },
        { status: 400 }
      );
    }

    // Check YouTube connection
    const connectionStatus = await youtubeService.getConnectionStatus(profileId);
    if (!connectionStatus.connected) {
      return NextResponse.json(
        { error: 'YouTube not connected', code: 'NOT_CONNECTED' },
        { status: 400 }
      );
    }

    // List videos
    const result = await youtubeService.listVideos(profileId, maxResults, pageToken);

    return NextResponse.json({
      videos: result.videos,
      nextPageToken: result.nextPageToken,
      totalResults: result.totalResults,
    });
  } catch (error) {
    console.error('[YouTube Videos Error]', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch videos',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    );
  }
}
