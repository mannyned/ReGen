/**
 * POST /api/tiers/upgrade
 *
 * Upgrades a user's tier.
 *
 * In production:
 * - Creates a Stripe checkout session
 * - Returns checkout URL for payment
 *
 * In development (with ALLOW_DIRECT_UPGRADE=true):
 * - Updates tier directly without payment
 *
 * Request body:
 * {
 *   targetTier: 'CREATOR' | 'PRO',
 *   interval?: 'monthly' | 'yearly'
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAuth,
  TIER_CONFIGS,
  TIER_ORDER,
  hasTierAccess,
} from '@/lib/tiers';
import { createCheckoutSession, STRIPE_PRICES } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import type { UserTier } from '@prisma/client';

interface UpgradeRequest {
  targetTier: UserTier;
  interval?: 'monthly' | 'yearly';
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const body: UpgradeRequest = await request.json();
    const { targetTier, interval = 'monthly' } = body;

    // Validate target tier
    if (!TIER_ORDER.includes(targetTier) || targetTier === 'FREE') {
      return NextResponse.json(
        {
          error: 'Invalid tier',
          validTiers: TIER_ORDER.filter((t) => t !== 'FREE'),
        },
        { status: 400 }
      );
    }

    // Check if this is actually an upgrade
    if (hasTierAccess(user!.tier, targetTier)) {
      return NextResponse.json(
        {
          error: 'You already have access to this tier or higher',
          currentTier: user!.tier,
          requestedTier: targetTier,
        },
        { status: 400 }
      );
    }

    // Development mode - direct upgrade without payment
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DIRECT_UPGRADE === 'true') {
      const updatedProfile = await prisma.profile.update({
        where: { id: user!.profileId },
        data: { tier: targetTier },
      });

      logger.info('Direct tier upgrade (dev mode)', {
        profileId: user!.profileId,
        previousTier: user!.tier,
        newTier: targetTier,
      });

      return NextResponse.json({
        success: true,
        message: `Upgraded to ${TIER_CONFIGS[targetTier].name}`,
        tier: {
          id: updatedProfile.tier,
          name: TIER_CONFIGS[updatedProfile.tier].name,
        },
      });
    }

    // Production mode - create Stripe checkout session
    try {
      const session = await createCheckoutSession({
        profileId: user!.profileId,
        email: user!.email,
        targetTier: targetTier as Exclude<UserTier, 'FREE'>,
        interval,
        currentTier: user!.tier,
      });

      return NextResponse.json({
        requiresPayment: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        tier: {
          id: targetTier,
          name: TIER_CONFIGS[targetTier].name,
          price: TIER_CONFIGS[targetTier].price,
        },
      });
    } catch (stripeError) {
      // If Stripe is not configured, return pricing info
      if (stripeError instanceof Error && stripeError.message.includes('STRIPE_SECRET_KEY')) {
        return NextResponse.json({
          requiresPayment: true,
          message: 'Payment processing not configured',
          tier: {
            id: targetTier,
            name: TIER_CONFIGS[targetTier].name,
            price: TIER_CONFIGS[targetTier].price,
          },
          checkoutUrl: `/pricing?tier=${targetTier}&interval=${interval}`,
        });
      }
      throw stripeError;
    }
  } catch (error) {
    logger.logError('Tier upgrade failed', error, { userId: user?.profileId });
    return NextResponse.json(
      { error: 'Failed to process upgrade' },
      { status: 500 }
    );
  }
}
