/**
 * GET /api/cron/beta-expiration
 *
 * Cron endpoint for checking and expiring beta access.
 * Should be called daily by Vercel Cron or an external scheduler.
 *
 * Logic:
 * - Finds all beta users whose betaExpiresAt has passed
 * - Checks if they have an active paid subscription
 * - If no active subscription: downgrades to FREE tier
 * - If active subscription: keeps their current tier (they're paying)
 *
 * Authentication:
 * - Vercel Cron: Automatically authenticated via CRON_SECRET header
 * - Admin: Requires x-admin-key header matching ADMIN_API_KEY
 * - External: Requires Authorization header with Bearer token matching CRON_SECRET
 *
 * Response:
 * {
 *   success: boolean,
 *   checked: number,
 *   downgraded: number,
 *   keptPaid: number,
 *   errors: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UserTier, SubscriptionStatus } from '@prisma/client';

// Vercel Cron jobs run for up to 5 minutes on Pro plan
export const maxDuration = 300;

/**
 * Verify the cron request is authorized
 */
function isAuthorized(request: NextRequest): boolean {
  // Check for admin API key
  const adminKey = process.env.ADMIN_API_KEY;
  const providedAdminKey = request.headers.get('x-admin-key');
  if (adminKey && providedAdminKey === adminKey) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, check admin key only
  if (!cronSecret) {
    return false;
  }

  // Check for Vercel Cron header (Vercel automatically sends this)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === cronSecret) {
    return true;
  }

  // Check for Authorization header (for external schedulers)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return token === cronSecret;
  }

  return false;
}

// Active subscription statuses that should prevent downgrade
const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!isAuthorized(request)) {
    console.warn('[Beta Expiration] Unauthorized cron request', {
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const now = new Date();

  try {
    console.log('[Beta Expiration] Starting beta expiration check');

    // Find all expired beta users
    const expiredBetaUsers = await prisma.profile.findMany({
      where: {
        betaUser: true,
        betaExpiresAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        email: true,
        tier: true,
        betaExpiresAt: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
      },
    });

    console.log(`[Beta Expiration] Found ${expiredBetaUsers.length} expired beta users`);

    let downgraded = 0;
    let keptPaid = 0;
    let errors = 0;

    for (const user of expiredBetaUsers) {
      try {
        // Check if user has an active paid subscription
        const hasActiveSubscription =
          user.stripeSubscriptionId &&
          user.stripeSubscriptionStatus &&
          ACTIVE_SUBSCRIPTION_STATUSES.includes(user.stripeSubscriptionStatus);

        if (hasActiveSubscription) {
          // User has a paid subscription - just remove beta flag, keep tier
          await prisma.profile.update({
            where: { id: user.id },
            data: {
              betaUser: false,
              betaExpiresAt: null,
            },
          });
          keptPaid++;
          console.log(`[Beta Expiration] Kept paid user: ${user.email}`);
        } else {
          // No paid subscription - downgrade to FREE
          await prisma.profile.update({
            where: { id: user.id },
            data: {
              tier: UserTier.FREE,
              betaUser: false,
              betaExpiresAt: null,
            },
          });
          downgraded++;
          console.log(`[Beta Expiration] Downgraded user: ${user.email}`);
        }
      } catch (userError) {
        console.error(`[Beta Expiration] Error processing user ${user.email}:`, userError);
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    console.log('[Beta Expiration] Completed', {
      checked: expiredBetaUsers.length,
      downgraded,
      keptPaid,
      errors,
      duration,
    });

    return NextResponse.json({
      success: true,
      checked: expiredBetaUsers.length,
      downgraded,
      keptPaid,
      errors,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[Beta Expiration] Cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different schedulers
export const POST = GET;
