/**
 * RSS Feed Refresh API
 *
 * POST /api/rss/feeds/[feedId]/refresh - Manually refresh a feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { refreshFeed } from '@/lib/rss';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for feed refresh

interface RouteContext {
  params: Promise<{ feedId: string }>;
}

/**
 * POST /api/rss/feeds/[feedId]/refresh
 * Manually refresh a feed immediately
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { feedId } = await context.params;

  try {
    const result = await refreshFeed(feedId, user!.profileId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error?.includes('not found') ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      feedName: result.feedName,
      itemsCreated: result.itemsCreated,
      itemsSkipped: result.itemsSkipped,
      message: result.itemsCreated > 0
        ? `Found ${result.itemsCreated} new items`
        : 'No new items found',
    });
  } catch (error) {
    console.error('[RSS Feed Refresh Error]', error);
    return NextResponse.json(
      { error: 'Failed to refresh feed' },
      { status: 500 }
    );
  }
}
