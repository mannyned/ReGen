/**
 * GET /api/tiers
 *
 * Returns all available tiers with their configurations.
 * Public endpoint - no authentication required.
 */

import { NextResponse } from 'next/server';
import { TIER_CONFIGS, TIER_ORDER } from '@/lib/tiers';

export async function GET() {
  // Return all tier configurations
  const tiers = TIER_ORDER.map((tierId) => {
    const config = TIER_CONFIGS[tierId];
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      limits: config.limits,
      features: config.features,
      price: config.price,
    };
  });

  return NextResponse.json({ tiers });
}
