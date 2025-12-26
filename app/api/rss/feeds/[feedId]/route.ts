/**
 * Single RSS Feed API
 *
 * GET /api/rss/feeds/[feedId] - Get feed details
 * PUT /api/rss/feeds/[feedId] - Update feed
 * DELETE /api/rss/feeds/[feedId] - Delete feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { reactivateFeed } from '@/lib/rss';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ feedId: string }>;
}

/**
 * GET /api/rss/feeds/[feedId]
 * Get details of a specific feed
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { feedId } = await context.params;

  try {
    const feed = await prisma.rssFeed.findFirst({
      where: {
        id: feedId,
        profileId: user!.profileId,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!feed) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      );
    }

    // Get item counts by status
    const statusCounts = await prisma.rssFeedItem.groupBy({
      by: ['status'],
      where: { feedId: feed.id },
      _count: true,
    });

    const itemStats = {
      total: feed._count.items,
      new: 0,
      reviewed: 0,
      converted: 0,
      dismissed: 0,
    };

    statusCounts.forEach((s) => {
      const key = s.status.toLowerCase() as keyof typeof itemStats;
      if (key in itemStats) {
        itemStats[key] = s._count;
      }
    });

    return NextResponse.json({
      feed: {
        id: feed.id,
        name: feed.name,
        url: feed.url,
        feedTitle: feed.feedTitle,
        feedDescription: feed.feedDescription,
        feedImageUrl: feed.feedImageUrl,
        feedLink: feed.feedLink,
        status: feed.status,
        lastFetchedAt: feed.lastFetchedAt,
        lastError: feed.lastError,
        errorCount: feed.errorCount,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
        items: itemStats,
      },
    });
  } catch (error) {
    console.error('[RSS Feed GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rss/feeds/[feedId]
 * Update a feed's settings
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { feedId } = await context.params;

  try {
    const body = await request.json();
    const { name, status } = body;

    // Verify ownership
    const existingFeed = await prisma.rssFeed.findFirst({
      where: {
        id: feedId,
        profileId: user!.profileId,
      },
    });

    if (!existingFeed) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name && typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    if (status && ['ACTIVE', 'PAUSED'].includes(status)) {
      updateData.status = status;

      // If reactivating, reset error count
      if (status === 'ACTIVE' && existingFeed.status === 'ERROR') {
        await reactivateFeed(feedId, user!.profileId);
        return NextResponse.json({
          success: true,
          message: 'Feed reactivated',
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updated = await prisma.rssFeed.update({
      where: { id: feedId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      feed: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('[RSS Feed PUT Error]', error);
    return NextResponse.json(
      { error: 'Failed to update feed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rss/feeds/[feedId]
 * Delete a feed and all its items
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { feedId } = await context.params;

  try {
    // Verify ownership and delete (cascade will handle items)
    const result = await prisma.rssFeed.deleteMany({
      where: {
        id: feedId,
        profileId: user!.profileId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feed deleted',
    });
  } catch (error) {
    console.error('[RSS Feed DELETE Error]', error);
    return NextResponse.json(
      { error: 'Failed to delete feed' },
      { status: 500 }
    );
  }
}
