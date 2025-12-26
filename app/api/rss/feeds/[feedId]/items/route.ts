/**
 * RSS Feed Items API
 *
 * GET /api/rss/feeds/[feedId]/items - Get items for a specific feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ feedId: string }>;
}

/**
 * GET /api/rss/feeds/[feedId]/items
 * Get items for a specific feed with pagination and filtering
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { feedId } = await context.params;
  const { searchParams } = new URL(request.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;

  // Filtering
  const status = searchParams.get('status')?.toUpperCase();
  const search = searchParams.get('search');

  try {
    // Verify feed ownership
    const feed = await prisma.rssFeed.findFirst({
      where: {
        id: feedId,
        profileId: user!.profileId,
      },
    });

    if (!feed) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      feedId: feedId,
    };

    if (status && ['NEW', 'REVIEWED', 'CONVERTED', 'DISMISSED'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get items with pagination
    const [items, total] = await Promise.all([
      prisma.rssFeedItem.findMany({
        where,
        orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: limit,
      }),
      prisma.rssFeedItem.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        guid: item.guid,
        title: item.title,
        link: item.link,
        description: item.description,
        content: item.content,
        author: item.author,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        categories: item.categories,
        status: item.status,
        contentUploadId: item.contentUploadId,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      feed: {
        id: feed.id,
        name: feed.name,
      },
    });
  } catch (error) {
    console.error('[RSS Feed Items GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}
