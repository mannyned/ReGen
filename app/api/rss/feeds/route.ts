/**
 * RSS Feeds API
 *
 * GET /api/rss/feeds - List user's RSS feeds
 * POST /api/rss/feeds - Add a new RSS feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { validateFeed, refreshFeed } from '@/lib/rss';

export const runtime = 'nodejs';

// Maximum feeds per user (can be tier-based later)
const MAX_FEEDS_PER_USER = 20;

/**
 * GET /api/rss/feeds
 * List all RSS feeds for the authenticated user
 */
export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const feeds = await prisma.rssFeed.findMany({
      where: { profileId: user!.profileId },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get count of new items per feed
    const feedsWithStats = await Promise.all(
      feeds.map(async (feed) => {
        const newItemCount = await prisma.rssFeedItem.count({
          where: {
            feedId: feed.id,
            status: 'NEW',
          },
        });

        return {
          id: feed.id,
          name: feed.name,
          url: feed.url,
          feedTitle: feed.feedTitle,
          feedDescription: feed.feedDescription,
          feedImageUrl: feed.feedImageUrl,
          status: feed.status,
          lastFetchedAt: feed.lastFetchedAt,
          lastError: feed.lastError,
          errorCount: feed.errorCount,
          createdAt: feed.createdAt,
          totalItems: feed._count.items,
          newItems: newItemCount,
        };
      })
    );

    return NextResponse.json({
      feeds: feedsWithStats,
      count: feeds.length,
      limit: MAX_FEEDS_PER_USER,
    });
  } catch (error) {
    console.error('[RSS Feeds GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rss/feeds
 * Add a new RSS feed
 */
export async function POST(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { url, name } = body;

    // Validate input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Feed URL is required' },
        { status: 400 }
      );
    }

    // Check feed limit
    const existingCount = await prisma.rssFeed.count({
      where: { profileId: user!.profileId },
    });

    if (existingCount >= MAX_FEEDS_PER_USER) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_FEEDS_PER_USER} feeds allowed`,
          code: 'FEED_LIMIT_REACHED',
        },
        { status: 400 }
      );
    }

    // Check for duplicate URL
    const existingFeed = await prisma.rssFeed.findUnique({
      where: {
        profileId_url: {
          profileId: user!.profileId,
          url: url.trim(),
        },
      },
    });

    if (existingFeed) {
      return NextResponse.json(
        { error: 'You have already added this feed' },
        { status: 400 }
      );
    }

    // Validate the feed URL by fetching it
    const validation = await validateFeed(url.trim());

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid feed URL' },
        { status: 400 }
      );
    }

    // Create the feed
    const feed = await prisma.rssFeed.create({
      data: {
        profileId: user!.profileId,
        url: url.trim(),
        name: name?.trim() || validation.feed?.title || 'Untitled Feed',
        feedTitle: validation.feed?.title,
        feedDescription: validation.feed?.description,
        feedImageUrl: validation.feed?.imageUrl,
        status: 'ACTIVE',
      },
    });

    // Auto-refresh to fetch initial items (don't await to keep response fast)
    refreshFeed(feed.id).catch((err) => {
      console.error('[RSS Feeds] Auto-refresh failed:', err);
    });

    return NextResponse.json({
      success: true,
      feed: {
        id: feed.id,
        name: feed.name,
        url: feed.url,
        feedTitle: feed.feedTitle,
        feedDescription: feed.feedDescription,
        feedImageUrl: feed.feedImageUrl,
        status: feed.status,
        createdAt: feed.createdAt,
      },
      message: `Feed added with ${validation.feed?.itemCount || 0} items available`,
    });
  } catch (error) {
    console.error('[RSS Feeds POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to add feed' },
      { status: 500 }
    );
  }
}
