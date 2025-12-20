/**
 * Admin Beta Access Management API
 *
 * Secure endpoints for assigning and revoking beta access.
 * Protected by ADMIN_API_KEY environment variable.
 *
 * POST /api/admin/beta - Assign beta access (or pre-register if user doesn't exist)
 * DELETE /api/admin/beta - Revoke beta access
 * GET /api/admin/beta - List beta users and pending invites
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UserTier } from '@prisma/client';
import { sendEmail, EmailTemplates } from '@/lib/email';

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
 * Assign beta access to users. If user doesn't exist, creates a beta invite
 * that will be applied when they sign up.
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
 *   assigned: number        // Existing users given beta access
 *   invited: number         // New users pre-registered for beta
 *   skipped: number         // Already had beta access
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

    // Calculate expiration date for existing users
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
    const notFoundEmails: string[] = [];

    // Check for not found emails (these will become invites)
    if (emails?.length) {
      for (const email of emails) {
        if (!foundEmails.has(email.toLowerCase())) {
          notFoundEmails.push(email.toLowerCase());
        }
      }
    }

    // Separate already-beta users
    const alreadyBeta = profiles.filter(p => p.betaUser);
    const toAssign = profiles.filter(p => !p.betaUser);

    // Assign beta access to existing users and upgrade to PRO
    if (toAssign.length > 0) {
      await prisma.profile.updateMany({
        where: {
          id: {
            in: toAssign.map(p => p.id),
          },
        },
        data: {
          tier: UserTier.PRO,
          betaUser: true,
          betaExpiresAt: expiresAt,
        },
      });
    }

    // Create beta invites for non-existing users
    let invitedCount = 0;
    const emailsSent: string[] = [];
    const emailsFailed: string[] = [];

    if (notFoundEmails.length > 0) {
      // Check for existing invites
      const existingInvites = await prisma.betaInvite.findMany({
        where: {
          email: { in: notFoundEmails },
        },
        select: { email: true },
      });
      const existingInviteEmails = new Set(existingInvites.map(i => i.email));

      // Create new invites (skip existing ones)
      const newInvites = notFoundEmails.filter(e => !existingInviteEmails.has(e));

      if (newInvites.length > 0) {
        await prisma.betaInvite.createMany({
          data: newInvites.map(email => ({
            email,
            durationDays,
          })),
          skipDuplicates: true,
        });
        invitedCount = newInvites.length;

        // Send invite emails
        for (const email of newInvites) {
          try {
            const result = await sendEmail({
              to: email,
              subject: "You're Invited to ReGenr Pro Beta!",
              template: EmailTemplates.BETA_INVITE,
              data: { durationDays },
            });

            if (result.success) {
              emailsSent.push(email);
            } else {
              emailsFailed.push(email);
              console.warn(`[Admin] Failed to send invite email to ${email}:`, result.error);
            }
          } catch (emailError) {
            emailsFailed.push(email);
            console.error(`[Admin] Error sending invite email to ${email}:`, emailError);
          }
        }
      }
    }

    // Log the action (non-sensitive info only)
    console.log('[Admin] Beta access assigned:', {
      assigned: toAssign.length,
      invited: invitedCount,
      skipped: alreadyBeta.length,
      emailsSent: emailsSent.length,
      emailsFailed: emailsFailed.length,
      expiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      assigned: toAssign.length,
      invited: invitedCount,
      skipped: alreadyBeta.length,
      emailsSent: emailsSent.length,
      emailsFailed: emailsFailed.length,
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
 * Revoke beta access from users and/or cancel pending invites.
 *
 * Request body:
 * {
 *   emails?: string[]    // List of emails to revoke/cancel
 *   userIds?: string[]   // List of user IDs to revoke
 *   inviteIds?: string[] // List of invite IDs to cancel
 *   all?: boolean        // Revoke from all users AND cancel all invites
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   revoked: number       // Users downgraded from beta
 *   cancelled: number     // Invites cancelled
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
    const { emails, userIds, inviteIds, all } = body;

    // Validate input
    if (!emails?.length && !userIds?.length && !inviteIds?.length && !all) {
      return NextResponse.json(
        { error: 'Either emails, userIds, inviteIds, or all must be provided' },
        { status: 400 }
      );
    }

    let revokedCount = 0;
    let cancelledCount = 0;

    if (all === true) {
      // Revoke from all beta users - downgrade to FREE
      const revokeResult = await prisma.profile.updateMany({
        where: {
          betaUser: true,
        },
        data: {
          tier: UserTier.FREE,
          betaUser: false,
          betaExpiresAt: null,
        },
      });
      revokedCount = revokeResult.count;

      // Cancel all pending invites
      const cancelResult = await prisma.betaInvite.deleteMany({
        where: {
          usedAt: null,
        },
      });
      cancelledCount = cancelResult.count;
    } else {
      // Build where conditions for profiles
      const profileWhereConditions: any[] = [];

      if (emails?.length) {
        profileWhereConditions.push({
          email: {
            in: emails.map((e: string) => e.toLowerCase()),
          },
        });
      }

      if (userIds?.length) {
        profileWhereConditions.push({
          id: {
            in: userIds,
          },
        });
      }

      // Revoke from specified profiles - downgrade to FREE
      if (profileWhereConditions.length > 0) {
        const revokeResult = await prisma.profile.updateMany({
          where: {
            OR: profileWhereConditions,
            betaUser: true,
          },
          data: {
            tier: UserTier.FREE,
            betaUser: false,
            betaExpiresAt: null,
          },
        });
        revokedCount = revokeResult.count;
      }

      // Cancel invites by email or invite ID
      const inviteWhereConditions: any[] = [];

      if (emails?.length) {
        inviteWhereConditions.push({
          email: {
            in: emails.map((e: string) => e.toLowerCase()),
          },
        });
      }

      if (inviteIds?.length) {
        inviteWhereConditions.push({
          id: {
            in: inviteIds,
          },
        });
      }

      if (inviteWhereConditions.length > 0) {
        const cancelResult = await prisma.betaInvite.deleteMany({
          where: {
            OR: inviteWhereConditions,
            usedAt: null,
          },
        });
        cancelledCount = cancelResult.count;
      }
    }

    // Log the action
    console.log('[Admin] Beta access revoked:', {
      revoked: revokedCount,
      cancelled: cancelledCount,
      all: all === true,
    });

    return NextResponse.json({
      success: true,
      revoked: revokedCount,
      cancelled: cancelledCount,
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
 * List all beta users and pending invites.
 *
 * Response:
 * {
 *   success: boolean
 *   count: number
 *   activeCount: number
 *   expiredCount: number
 *   inviteCount: number
 *   users: Array<{
 *     id: string
 *     email: string
 *     tier: string
 *     betaExpiresAt: string
 *     daysRemaining: number
 *     isExpired: boolean
 *     type: 'user'
 *   }>
 *   invites: Array<{
 *     id: string
 *     email: string
 *     durationDays: number
 *     createdAt: string
 *     type: 'invite'
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
    // Fetch beta users
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

    // Fetch pending invites (not yet claimed)
    const pendingInvites = await prisma.betaInvite.findMany({
      where: {
        usedAt: null,
      },
      select: {
        id: true,
        email: true,
        durationDays: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
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
        type: 'user' as const,
      };
    });

    const invites = pendingInvites.map(invite => ({
      id: invite.id,
      email: invite.email,
      durationDays: invite.durationDays,
      createdAt: invite.createdAt.toISOString(),
      type: 'invite' as const,
    }));

    return NextResponse.json({
      success: true,
      count: users.length,
      activeCount: users.filter(u => !u.isExpired).length,
      expiredCount: users.filter(u => u.isExpired).length,
      inviteCount: invites.length,
      users,
      invites,
    });
  } catch (error) {
    console.error('[Admin] Failed to list beta users:', error);
    return NextResponse.json(
      { error: 'Failed to list beta users' },
      { status: 500 }
    );
  }
}
