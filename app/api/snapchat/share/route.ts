/**
 * POST /api/snapchat/share
 *
 * Generate a Snapchat share URL for Creative Kit
 *
 * IMPORTANT: This does NOT post to Snapchat automatically.
 * It generates a URL that opens Snapchat's composer.
 * The user must complete the share in Snapchat.
 *
 * Request body:
 * {
 *   type: 'photo' | 'video' | 'url' | 'lens',
 *   mediaUrl?: string,        // URL to photo/video
 *   attachmentUrl?: string,   // Swipe-up link
 *   caption?: string,         // Caption text
 *   lensUUID?: string         // For lens sharing
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   shareUrl: string,         // URL to open share composer
 *   webShareUrl: string,      // Web fallback URL
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/getUser';
import { snapchatService } from '@/lib/services/snapchat';
import type {
  GenerateSnapchatShareRequest,
  GenerateSnapchatShareResponse,
  SnapchatShareType,
} from '@/lib/types/snapchat';

export const runtime = 'nodejs';

// Valid share types
const VALID_SHARE_TYPES: SnapchatShareType[] = ['photo', 'video', 'url', 'lens'];

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
    const body: GenerateSnapchatShareRequest = await request.json();

    // Validate share type
    if (!body.type || !VALID_SHARE_TYPES.includes(body.type)) {
      return NextResponse.json(
        {
          error: 'Invalid share type',
          code: 'INVALID_TYPE',
          validTypes: VALID_SHARE_TYPES,
        },
        { status: 400 }
      );
    }

    // Validate required fields based on type
    if (body.type === 'url' && !body.attachmentUrl) {
      return NextResponse.json(
        { error: 'attachmentUrl is required for URL sharing', code: 'MISSING_URL' },
        { status: 400 }
      );
    }

    if ((body.type === 'photo' || body.type === 'video') && !body.mediaUrl) {
      return NextResponse.json(
        { error: 'mediaUrl is required for photo/video sharing', code: 'MISSING_MEDIA' },
        { status: 400 }
      );
    }

    // Check Snapchat connection (optional - share can work without login)
    const connectionStatus = await snapchatService.getConnectionStatus(profileId);

    // Generate share URL
    const sharePayload = await snapchatService.generateShareUrl({
      type: body.type,
      mediaUrl: body.mediaUrl,
      attachmentUrl: body.attachmentUrl,
      caption: body.caption,
    });

    // Record the share initiation (for tracking)
    await snapchatService.recordShareInitiated(profileId, null, body.type);

    const response: GenerateSnapchatShareResponse = {
      success: true,
      shareUrl: sharePayload.shareUrl,
      webShareUrl: sharePayload.webShareUrl,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Snapchat Share Error]', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate share URL',
        code: 'SHARE_ERROR',
      },
      { status: 500 }
    );
  }
}
