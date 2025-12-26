/**
 * RSS Items API
 *
 * GET /api/rss/items - Get all items across all feeds
 * PUT /api/rss/items - Bulk update item status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/rss/items
 * Get all RSS items across all feeds with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;

  // Filtering
  const status = searchParams.get('status')?.toUpperCase();
  const feedId = searchParams.get('feedId');
  const search = searchParams.get('search');

  try {
    // Build where clause
    const where: Record<string, unknown> = {
      profileId: user!.profileId,
    };

    if (status && ['NEW', 'REVIEWED', 'CONVERTED', 'DISMISSED'].includes(status)) {
      where.status = status;
    }

    if (feedId) {
      where.feedId = feedId;
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
        include: {
          feed: {
            select: {
              id: true,
              name: true,
              feedImageUrl: true,
            },
          },
        },
        orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: limit,
      }),
      prisma.rssFeedItem.count({ where }),
    ]);

    // Get status counts
    const statusCounts = await prisma.rssFeedItem.groupBy({
      by: ['status'],
      where: { profileId: user!.profileId },
      _count: true,
    });

    const counts = {
      new: 0,
      reviewed: 0,
      converted: 0,
      dismissed: 0,
      total: 0,
    };

    statusCounts.forEach((s) => {
      const key = s.status.toLowerCase() as keyof typeof counts;
      if (key in counts) {
        counts[key] = s._count;
        counts.total += s._count;
      }
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        guid: item.guid,
        title: item.title,
        link: item.link,
        description: item.description,
        author: item.author,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        categories: item.categories,
        status: item.status,
        contentUploadId: item.contentUploadId,
        createdAt: item.createdAt,
        feed: item.feed,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      counts,
    });
  } catch (error) {
    console.error('[RSS Items GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rss/items
 * Bulk update item status
 */
export async function PUT(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { itemIds, status, contentUploadId } = body;

    // Validate input
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds array is required' },
        { status: 400 }
      );
    }

    if (itemIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 items can be updated at once' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status && ['NEW', 'REVIEWED', 'CONVERTED', 'DISMISSED'].includes(status)) {
      updateData.status = status;
    }

    if (contentUploadId) {
      updateData.contentUploadId = contentUploadId;
      updateData.status = 'CONVERTED';
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update items (only if owned by user)
    const result = await prisma.rssFeedItem.updateMany({
      where: {
        id: { in: itemIds },
        profileId: user!.profileId,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error) {
    console.error('[RSS Items PUT Error]', error);
    return NextResponse.json(
      { error: 'Failed to update items' },
      { status: 500 }
    );
  }
}
