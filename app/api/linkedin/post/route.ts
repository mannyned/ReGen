/**
 * POST /api/linkedin/post
 *
 * Create a new LinkedIn post
 *
 * Request body:
 * {
 *   text: string,           // Post content (required)
 *   linkUrl?: string,       // Optional link to attach
 *   visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN'
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   postId: string,
 *   postUrl: string,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/getUser';
import { linkedinService } from '@/lib/services/linkedin';
import type {
  CreateLinkedInPostRequest,
  CreateLinkedInPostResponse,
  LinkedInVisibility,
} from '@/lib/types/linkedin';

export const runtime = 'nodejs';

// Valid visibility values
const VALID_VISIBILITY: LinkedInVisibility[] = ['PUBLIC', 'CONNECTIONS', 'LOGGED_IN'];

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const profileId = await getUserId(request);

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateLinkedInPostRequest = await request.json();

    // Validate required fields
    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text is required', code: 'MISSING_TEXT' },
        { status: 400 }
      );
    }

    // LinkedIn has a 3000 character limit
    if (body.text.length > 3000) {
      return NextResponse.json(
        { error: 'text exceeds 3000 character limit', code: 'TEXT_TOO_LONG' },
        { status: 400 }
      );
    }

    // Validate visibility if provided
    if (body.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
      return NextResponse.json(
        {
          error: 'Invalid visibility',
          code: 'INVALID_VISIBILITY',
          validValues: VALID_VISIBILITY,
        },
        { status: 400 }
      );
    }

    // Check LinkedIn connection
    const connectionStatus = await linkedinService.getConnectionStatus(profileId);
    if (!connectionStatus.connected) {
      return NextResponse.json(
        { error: 'LinkedIn not connected', code: 'NOT_CONNECTED' },
        { status: 400 }
      );
    }

    // Create the post
    const result = await linkedinService.createPost(profileId, {
      text: body.text,
      linkUrl: body.linkUrl,
      visibility: body.visibility,
    });

    const response: CreateLinkedInPostResponse = {
      success: result.success,
      postId: result.postId,
      postUrl: result.postUrl,
      error: result.error,
    };

    if (!result.success) {
      return NextResponse.json(response, { status: 400 });
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[LinkedIn Post Error]', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
        code: 'POST_ERROR',
      },
      { status: 500 }
    );
  }
}
