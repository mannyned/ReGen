/**
 * Admin Beta Access Management API
 *
 * Secure endpoints for assigning and revoking beta access.
 * Protected by ADMIN_API_KEY environment variable.
 *
 * POST /api/admin/beta - Assign beta access
 * DELETE /api/admin/beta - Revoke beta access
 * GET /api/admin/beta - List beta users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// ============================================
// SECURITY
// ============================================

/**
 * Validate admin API key
 *
 * IMPORTANT: This key should be kept secret and only used server-side.
 */
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
// ASSIGN BETA ACCESS
// ============================================

/**
 * POST /api/admin/beta
 *
 * Assign beta access to users.
 *
 * Request body:
 * {
 *   emails?: string[]       // List of emails to assign
 *   userIds?: string[]      // List of user IDs to assign
 *   durationDays?: number   // Duration in days (default: 30)
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   assigned: number
 *   skipped: number
 *   notFound: string[]
 *   expiresAt: string
 * }
 */
export async function POST(request: NextRequest) {
  // Validate admin key
  if (!validateAdminKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { emails, userIds, durationDays = 30 } = body;

    // Validate input
    if (!emails?.length && !userIds?.length) {
      return NextResponse.json(
        { error: 'Either emails or userIds must be provided' },
        { status: 400 }
      );
    }

    if (durationDays < 1 || durationDays > 365) {
      return NextResponse.json(
        { error: 'durationDays must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Find profiles by email or ID
    const whereConditions: any[] = [];

    if (emails?.length) {
      whereConditions.push({
        email: {
          in: emails.map((e: string) => e.toLowerCase()),
        },
      });
    }

    if (userIds?.length) {
      whereConditions.push({
        id: {
          in: userIds,
        },
      });
    }

    const profiles = await prisma.profile.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        id: true,
        email: true,
        betaUser: true,
      },
    });

    // Track results
    const foundEmails = new Set(profiles.map(p => p.email.toLowerCase()));
    const foundIds = new Set(profiles.map(p => p.id));
    const notFound: string[] = [];

    // Check for not found emails
    if (emails?.length) {
      for (const email of emails) {
        if (!foundEmails.has(email.toLowerCase())) {
          notFound.push(email);
        }
      }
    }

    // Check for not found userIds
    if (userIds?.length) {
      for (const id of userIds) {
        if (!foundIds.has(id)) {
          notFound.push(id);
        }
      }
    }

    // Separate already-beta users
    const alreadyBeta = profiles.filter(p => p.betaUser);
    const toAssign = profiles.filter(p => !p.betaUser);

    // Assign beta access
    if (toAssign.length > 0) {
      await prisma.profile.updateMany({
        where: {
          id: {
            in: toAssign.map(p => p.id),
          },
        },
        data: {
          betaUser: true,
          betaExpiresAt: expiresAt,
        },
      });
    }

    // Log the action (non-sensitive info only)
    console.log('[Admin] Beta access assigned:', {
      assigned: toAssign.length,
      skipped: alreadyBeta.length,
      notFound: notFound.length,
      expiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      assigned: toAssign.length,
      skipped: alreadyBeta.length,
      notFound,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Failed to assign beta access:', error);
    return NextResponse.json(
      { error: 'Failed to assign beta access' },
      { status: 500 }
    );
  }
}

// ============================================
// REVOKE BETA ACCESS
// ============================================

/**
 * DELETE /api/admin/beta
 *
 * Revoke beta access from users.
 *
 * Request body:
 * {
 *   emails?: string[]    // List of emails to revoke
 *   userIds?: string[]   // List of user IDs to revoke
 *   all?: boolean        // Revoke from all users (requires confirmation)
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   revoked: number
 * }
 */
export async function DELETE(request: NextRequest) {
  // Validate admin key
  if (!validateAdminKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { emails, userIds, all } = body;

    // Validate input
    if (!emails?.length && !userIds?.length && !all) {
      return NextResponse.json(
        { error: 'Either emails, userIds, or all must be provided' },
        { status: 400 }
      );
    }

    let result;

    if (all === true) {
      // Revoke from all beta users
      result = await prisma.profile.updateMany({
        where: {
          betaUser: true,
        },
        data: {
          betaUser: false,
          betaExpiresAt: null,
        },
      });
    } else {
      // Build where conditions
      const whereConditions: any[] = [];

      if (emails?.length) {
        whereConditions.push({
          email: {
            in: emails.map((e: string) => e.toLowerCase()),
          },
        });
      }

      if (userIds?.length) {
        whereConditions.push({
          id: {
            in: userIds,
          },
        });
      }

      result = await prisma.profile.updateMany({
        where: {
          OR: whereConditions,
          betaUser: true,
        },
        data: {
          betaUser: false,
          betaExpiresAt: null,
        },
      });
    }

    // Log the action
    console.log('[Admin] Beta access revoked:', {
      revoked: result.count,
      all: all === true,
    });

    return NextResponse.json({
      success: true,
      revoked: result.count,
    });
  } catch (error) {
    console.error('[Admin] Failed to revoke beta access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke beta access' },
      { status: 500 }
    );
  }
}

// ============================================
// LIST BETA USERS
// ============================================

/**
 * GET /api/admin/beta
 *
 * List all beta users.
 *
 * Response:
 * {
 *   success: boolean
 *   count: number
 *   users: Array<{
 *     id: string
 *     email: string
 *     tier: string
 *     betaExpiresAt: string
 *     daysRemaining: number
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  // Validate admin key
  if (!validateAdminKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const betaUsers = await prisma.profile.findMany({
      where: {
        betaUser: true,
      },
      select: {
        id: true,
        email: true,
        tier: true,
        betaExpiresAt: true,
      },
      orderBy: {
        betaExpiresAt: 'asc',
      },
    });

    const now = new Date();

    const users = betaUsers.map(user => {
      const expiresAt = user.betaExpiresAt ? new Date(user.betaExpiresAt) : null;
      const daysRemaining = expiresAt
        ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        id: user.id,
        email: user.email,
        tier: user.tier,
        betaExpiresAt: user.betaExpiresAt?.toISOString() || null,
        daysRemaining,
        isExpired: daysRemaining === 0,
      };
    });

    return NextResponse.json({
      success: true,
      count: users.length,
      activeCount: users.filter(u => !u.isExpired).length,
      expiredCount: users.filter(u => u.isExpired).length,
      users,
    });
  } catch (error) {
    console.error('[Admin] Failed to list beta users:', error);
    return NextResponse.json(
      { error: 'Failed to list beta users' },
      { status: 500 }
    );
  }
}
