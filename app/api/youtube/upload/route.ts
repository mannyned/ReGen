/**
 * POST /api/youtube/upload
 *
 * Upload a video to YouTube
 *
 * Request body:
 * {
 *   title: string,              // Video title (required)
 *   description: string,        // Video description (required)
 *   videoUrl: string,           // URL to video file (required)
 *   tags?: string[],            // Video tags
 *   categoryId?: string,        // YouTube category ID
 *   privacyStatus?: 'public' | 'private' | 'unlisted'
 *   madeForKids?: boolean
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   videoId: string,
 *   videoUrl: string,
 *   status: string,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/getUser';
import type {
  UploadYouTubeVideoRequest,
  UploadYouTubeVideoResponse,
  YouTubePrivacyStatus,
} from '@/lib/types/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valid privacy values
const VALID_PRIVACY: YouTubePrivacyStatus[] = ['public', 'private', 'unlisted'];

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: UploadYouTubeVideoRequest = await request.json();

    // Validate required fields
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'title is required', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    if (!body.description) {
      return NextResponse.json(
        { error: 'description is required', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    if (!body.videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required', code: 'MISSING_VIDEO_URL' },
        { status: 400 }
      );
    }

    // Title limit: 100 characters
    if (body.title.length > 100) {
      return NextResponse.json(
        { error: 'title exceeds 100 character limit', code: 'TITLE_TOO_LONG' },
        { status: 400 }
      );
    }

    // Description limit: 5000 characters
    if (body.description.length > 5000) {
      return NextResponse.json(
        { error: 'description exceeds 5000 character limit', code: 'DESCRIPTION_TOO_LONG' },
        { status: 400 }
      );
    }

    // Validate privacy if provided
    if (body.privacyStatus && !VALID_PRIVACY.includes(body.privacyStatus)) {
      return NextResponse.json(
        {
          error: 'Invalid privacyStatus',
          code: 'INVALID_PRIVACY',
          validValues: VALID_PRIVACY,
        },
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

    // Upload the video
    const result = await youtubeService.uploadVideo(profileId, {
      title: body.title,
      description: body.description,
      videoUrl: body.videoUrl,
      tags: body.tags,
      categoryId: body.categoryId,
      privacyStatus: body.privacyStatus,
      madeForKids: body.madeForKids,
    });

    const response: UploadYouTubeVideoResponse = {
      success: result.success,
      videoId: result.videoId,
      videoUrl: result.videoUrl,
      status: result.status,
      error: result.error,
    };

    if (!result.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[YouTube Upload Error]', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload video',
        code: 'UPLOAD_ERROR',
      },
      { status: 500 }
    );
  }
}
