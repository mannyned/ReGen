/**
 * Admin Waitlist Management API
 *
 * Secure endpoints for viewing and managing waitlist entries.
 * Protected by ADMIN_API_KEY environment variable.
 *
 * GET /api/admin/waitlist - List all waitlist entries
 * DELETE /api/admin/waitlist - Delete a waitlist entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// ============================================
// SECURITY
// ============================================

function validateAdminKey(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.error('[Admin] ADMIN_API_KEY not configured');
    return false;
  }

  const providedKey = request.headers.get('x-admin-key');

  if (!providedKey || providedKey !== adminKey) {
    console.warn('[Admin] Invalid admin key attempt');
    return false;
  }

  return true;
}

// ============================================
// GET WAITLIST ENTRIES
// ============================================

export async function GET(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { source: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get total count
    const total = await prisma.waitlistEntry.count({ where });

    // Get paginated entries
    const entries = await prisma.waitlistEntry.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get stats
    const stats = await prisma.waitlistEntry.groupBy({
      by: ['source'],
      _count: { source: true },
    });

    const sourceStats = stats.reduce((acc, stat) => {
      acc[stat.source || 'unknown'] = stat._count.source;
      return acc;
    }, {} as Record<string, number>);

    // Get signups by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEntries = await prisma.waitlistEntry.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const signupsByDate: Record<string, number> = {};
    recentEntries.forEach((entry) => {
      const date = entry.createdAt.toISOString().split('T')[0];
      signupsByDate[date] = (signupsByDate[date] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        bySource: sourceStats,
        last30Days: recentEntries.length,
        signupsByDate,
      },
    });
  } catch (error) {
    console.error('[Admin] Waitlist fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist entries' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE WAITLIST ENTRY
// ============================================

export async function DELETE(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json(
        { error: 'Either id or email is required' },
        { status: 400 }
      );
    }

    const where = id ? { id } : { email: email!.toLowerCase() };

    const deleted = await prisma.waitlistEntry.delete({ where });

    return NextResponse.json({
      success: true,
      deleted: deleted.email,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    console.error('[Admin] Waitlist delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}

// ============================================
// EXPORT WAITLIST (CSV)
// ============================================

export async function POST(request: NextRequest) {
  if (!validateAdminKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'export') {
      // Get all entries for export
      const entries = await prisma.waitlistEntry.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Create CSV content
      const headers = ['Email', 'Source', 'Signed Up'];
      const rows = entries.map((entry) => [
        entry.email,
        entry.source || 'landing',
        entry.createdAt.toISOString(),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="waitlist-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Admin] Waitlist export error:', error);
    return NextResponse.json(
      { error: 'Failed to export waitlist' },
      { status: 500 }
    );
  }
}
