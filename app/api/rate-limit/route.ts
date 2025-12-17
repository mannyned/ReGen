/**
 * GET /api/rate-limit
 *
 * Returns the current user's rate limit status across all limit types.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedIdentity } from '@/lib/security';
import {
  DEFAULT_TIER_LIMITS,
  EXPENSIVE_OPERATION_LIMITS,
  AI_GENERATION_LIMITS,
  UPLOAD_LIMITS,
} from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  const tier = identity.tier;

  // Return rate limit configurations for user's tier
  return NextResponse.json({
    tier,
    limits: {
      api: {
        name: 'Standard API',
        limit: DEFAULT_TIER_LIMITS[tier].limit,
        windowMs: DEFAULT_TIER_LIMITS[tier].windowMs,
        windowDescription: formatWindow(DEFAULT_TIER_LIMITS[tier].windowMs),
      },
      expensive: {
        name: 'Expensive Operations',
        limit: EXPENSIVE_OPERATION_LIMITS[tier].limit,
        windowMs: EXPENSIVE_OPERATION_LIMITS[tier].windowMs,
        windowDescription: formatWindow(EXPENSIVE_OPERATION_LIMITS[tier].windowMs),
      },
      ai: {
        name: 'AI Generation',
        limit: AI_GENERATION_LIMITS[tier].limit,
        windowMs: AI_GENERATION_LIMITS[tier].windowMs,
        windowDescription: formatWindow(AI_GENERATION_LIMITS[tier].windowMs),
      },
      upload: {
        name: 'File Uploads',
        limit: UPLOAD_LIMITS[tier].limit,
        windowMs: UPLOAD_LIMITS[tier].windowMs,
        windowDescription: formatWindow(UPLOAD_LIMITS[tier].windowMs),
      },
    },
  });
}

function formatWindow(ms: number): string {
  if (ms < 60000) return `${ms / 1000} seconds`;
  if (ms < 3600000) return `${ms / 60000} minute${ms > 60000 ? 's' : ''}`;
  return `${ms / 3600000} hour${ms > 3600000 ? 's' : ''}`;
}
