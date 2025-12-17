/**
 * GET /api/tiers/current
 *
 * Returns the current user's tier and usage information.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  getUsageSummary,
  TIER_CONFIGS,
  getNextTier,
  getUpgradeTiers,
} from '@/lib/tiers';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  // Get usage summary
  const usage = await getUsageSummary(user!.profileId);

  // Get tier config
  const tierConfig = TIER_CONFIGS[usage.tier];

  // Get upgrade options
  const nextTier = getNextTier(usage.tier);
  const upgradeTiers = getUpgradeTiers(usage.tier);

  return NextResponse.json({
    tier: {
      id: tierConfig.id,
      name: tierConfig.name,
      description: tierConfig.description,
    },
    usage: usage.limits,
    features: usage.features,
    upgrade: nextTier
      ? {
          nextTier: {
            id: TIER_CONFIGS[nextTier].id,
            name: TIER_CONFIGS[nextTier].name,
            price: TIER_CONFIGS[nextTier].price,
          },
          allOptions: upgradeTiers.map((t) => ({
            id: TIER_CONFIGS[t].id,
            name: TIER_CONFIGS[t].name,
            price: TIER_CONFIGS[t].price,
          })),
        }
      : null,
  });
}
