/**
 * POST /api/tiers/downgrade
 *
 * Downgrades a user's tier (at end of billing period).
 *
 * In production, this would:
 * 1. Cancel subscription
 * 2. Schedule downgrade for end of billing period
 * 3. Notify user of feature changes
 *
 * Request body:
 * {
 *   targetTier: 'FREE' | 'CREATOR'
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireAuth,
  TIER_CONFIGS,
  TIER_LEVELS,
} from '@/lib/tiers';
import type { UserTier } from '@prisma/client';

interface DowngradeRequest {
  targetTier: UserTier;
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const body: DowngradeRequest = await request.json();
    const { targetTier } = body;

    // Validate target tier
    if (!['FREE', 'CREATOR', 'PRO'].includes(targetTier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Check if this is actually a downgrade
    if (TIER_LEVELS[targetTier] >= TIER_LEVELS[user!.tier]) {
      return NextResponse.json(
        {
          error: 'This is not a downgrade',
          currentTier: user!.tier,
          requestedTier: targetTier,
        },
        { status: 400 }
      );
    }

    // Check what features will be lost
    const currentFeatures = TIER_CONFIGS[user!.tier].features;
    const newFeatures = TIER_CONFIGS[targetTier].features;
    const lostFeatures = Object.entries(currentFeatures)
      .filter(([key, value]) => value && !newFeatures[key as keyof typeof newFeatures])
      .map(([key]) => key);

    // Check what limits will decrease
    const currentLimits = TIER_CONFIGS[user!.tier].limits;
    const newLimits = TIER_CONFIGS[targetTier].limits;
    const reducedLimits = Object.entries(currentLimits)
      .filter(([key, value]) => {
        const newValue = newLimits[key as keyof typeof newLimits];
        return value === -1 ? newValue !== -1 : newValue < value;
      })
      .map(([key]) => key);

    // In production, you would:
    // 1. Cancel the subscription at period end
    // 2. Schedule the downgrade
    // 3. Send confirmation email

    // For development/demo, we'll update directly
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DIRECT_DOWNGRADE === 'true') {
      const updatedProfile = await prisma.profile.update({
        where: { id: user!.profileId },
        data: { tier: targetTier },
      });

      return NextResponse.json({
        success: true,
        message: `Downgraded to ${TIER_CONFIGS[targetTier].name}`,
        tier: {
          id: updatedProfile.tier,
          name: TIER_CONFIGS[updatedProfile.tier].name,
        },
        changes: {
          lostFeatures,
          reducedLimits,
        },
      });
    }

    // Production flow - schedule downgrade
    return NextResponse.json({
      scheduled: true,
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      tier: {
        current: user!.tier,
        future: targetTier,
      },
      changes: {
        lostFeatures,
        reducedLimits,
      },
      message: 'Your downgrade will take effect at the end of your billing period.',
    });
  } catch (error) {
    console.error('[Tier Downgrade Error]', error);
    return NextResponse.json(
      { error: 'Failed to process downgrade' },
      { status: 500 }
    );
  }
}
