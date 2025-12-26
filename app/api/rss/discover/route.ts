/**
 * RSS Feed Discovery API
 *
 * GET /api/rss/discover - Get curated feeds library
 * POST /api/rss/discover - Add a curated feed to user's subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { validateFeed, refreshFeed } from '@/lib/rss';
import {
  getEnabledFeeds,
  getFeedsByNiche,
  getFeedById,
  searchFeeds,
  NICHES,
  type CuratedFeed,
} from '@/lib/rss/curated-feeds';

export const runtime = 'nodejs';

// Maximum feeds per user
const MAX_FEEDS_PER_USER = 20;

/**
 * GET /api/rss/discover
 * Get curated feeds library with optional filtering
 */
export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const niche = searchParams.get('niche');
  const search = searchParams.get('search');
  const sourceType = searchParams.get('source_type');

  try {
    // Get user's existing feed URLs to mark which are already added
    const userFeeds = await prisma.rssFeed.findMany({
      where: { profileId: user!.profileId },
      select: { url: true },
    });
    const userFeedUrls = new Set(userFeeds.map((f) => f.url));

    // Get curated feeds based on filters
    let feeds: CuratedFeed[];

    if (search) {
      feeds = searchFeeds(search);
    } else if (niche) {
      feeds = getFeedsByNiche(niche);
    } else {
      feeds = getEnabledFeeds();
    }

    // Filter by source type if specified
    if (sourceType) {
      feeds = feeds.filter((f) => f.source_type === sourceType);
    }

    // Add "already_added" flag to each feed
    const feedsWithStatus = feeds.map((feed) => ({
      ...feed,
      already_added: userFeedUrls.has(feed.feed_url),
    }));

    // Group feeds by niche for the response
    const feedsByNiche: Record<string, typeof feedsWithStatus> = {};
    feedsWithStatus.forEach((feed) => {
      if (!feedsByNiche[feed.niche_key]) {
        feedsByNiche[feed.niche_key] = [];
      }
      feedsByNiche[feed.niche_key].push(feed);
    });

    return NextResponse.json({
      niches: NICHES,
      feeds: feedsWithStatus,
      feedsByNiche,
      totalFeeds: feeds.length,
      userFeedCount: userFeeds.length,
      userFeedLimit: MAX_FEEDS_PER_USER,
    });
  } catch (error) {
    console.error('[RSS Discover GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch curated feeds' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rss/discover
 * Add a curated feed to user's subscriptions
 */
export async function POST(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { feedId } = body;

    if (!feedId || typeof feedId !== 'string') {
      return NextResponse.json(
        { error: 'Feed ID is required' },
        { status: 400 }
      );
    }

    // Find the curated feed
    const curatedFeed = getFeedById(feedId);
    if (!curatedFeed) {
      return NextResponse.json(
        { error: 'Curated feed not found' },
        { status: 404 }
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
          url: curatedFeed.feed_url,
        },
      },
    });

    if (existingFeed) {
      return NextResponse.json(
        { error: 'You have already added this feed' },
        { status: 400 }
      );
    }

    // Validate the feed URL (reuse existing validation logic)
    const validation = await validateFeed(curatedFeed.feed_url);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Feed validation failed' },
        { status: 400 }
      );
    }

    // Create the feed (reuse existing creation logic)
    const feed = await prisma.rssFeed.create({
      data: {
        profileId: user!.profileId,
        url: curatedFeed.feed_url,
        name: curatedFeed.feed_name,
        feedTitle: validation.feed?.title || curatedFeed.feed_name,
        feedDescription: validation.feed?.description || curatedFeed.description,
        feedImageUrl: validation.feed?.imageUrl,
        status: 'ACTIVE',
      },
    });

    // Auto-refresh to fetch initial items (don't await to keep response fast)
    refreshFeed(feed.id).catch((err) => {
      console.error('[RSS Discover] Auto-refresh failed:', err);
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
      message: `Added "${curatedFeed.feed_name}" to your feeds`,
    });
  } catch (error) {
    console.error('[RSS Discover POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to add feed' },
      { status: 500 }
    );
  }
}
