/**
 * RSS Feed Validation API
 *
 * POST /api/rss/validate - Validate a feed URL before adding
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { validateFeed, validateFeedUrl } from '@/lib/rss';

export const runtime = 'nodejs';
export const maxDuration = 30; // Allow up to 30 seconds for validation

/**
 * POST /api/rss/validate
 * Validate a feed URL and return metadata
 */
export async function POST(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { url } = body;

    // Validate input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Quick URL format validation first
    const urlValidation = validateFeedUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json({
        valid: false,
        error: urlValidation.error,
      });
    }

    // Full feed validation (fetches and parses)
    const result = await validateFeed(urlValidation.normalizedUrl!);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error,
      });
    }

    return NextResponse.json({
      valid: true,
      feed: {
        title: result.feed?.title,
        description: result.feed?.description,
        imageUrl: result.feed?.imageUrl,
        itemCount: result.feed?.itemCount,
      },
    });
  } catch (error) {
    console.error('[RSS Validate Error]', error);
    return NextResponse.json(
      { error: 'Failed to validate feed' },
      { status: 500 }
    );
  }
}
