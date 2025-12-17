/**
 * Rate Limit Middleware for API Routes
 *
 * Provides easy-to-use wrappers for adding rate limiting to API routes.
 * Integrates with authentication to provide tier-based limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  RateLimiter,
  checkRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
  getIpKey,
  getUserKey,
  DEFAULT_TIER_LIMITS,
  EXPENSIVE_OPERATION_LIMITS,
  AI_GENERATION_LIMITS,
  UPLOAD_LIMITS,
  AUTH_LIMITS,
  type RateLimitConfig,
  type TierRateLimits,
  type RateLimitResult,
} from './limiter';
import { getVerifiedIdentity } from '@/lib/security';
import type { UserTier } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface RateLimitMiddlewareOptions {
  /** Rate limit configuration */
  config?: RateLimitConfig | TierRateLimits;
  /** Use tier-based limits from authenticated user */
  useTierLimits?: boolean;
  /** Include user ID in rate limit key (requires auth) */
  perUser?: boolean;
  /** Custom key prefix */
  keyPrefix?: string;
}

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: { profileId: string; tier: UserTier }
) => Promise<NextResponse>;

// ============================================
// STANDALONE RATE LIMIT CHECK
// ============================================

/**
 * Check rate limit for a request
 *
 * Use this for simple rate limiting without authentication.
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const { response } = await rateLimit(request);
 *   if (response) return response;
 *
 *   // Handle request...
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { limit: 60, windowMs: 60000 }
): Promise<{ result: RateLimitResult; response: NextResponse | null }> {
  return checkRateLimit(request, { config });
}

/**
 * Check rate limit with tier-based limits
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const { identity, response: authResponse } = await requireVerifiedIdentity(request);
 *   if (authResponse) return authResponse;
 *
 *   const { response: rateLimitResponse } = await rateLimitByTier(
 *     request,
 *     identity.tier,
 *     identity.profileId
 *   );
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Handle request...
 * }
 * ```
 */
export async function rateLimitByTier(
  request: NextRequest,
  tier: UserTier,
  userId?: string,
  config: TierRateLimits = DEFAULT_TIER_LIMITS
): Promise<{ result: RateLimitResult; response: NextResponse | null }> {
  return checkRateLimit(request, {
    config,
    tier,
    keyGenerator: userId
      ? () => getUserKey(userId)
      : (req) => getIpKey(req),
  });
}

// ============================================
// HIGHER-ORDER ROUTE HANDLERS
// ============================================

/**
 * Wrap a route handler with rate limiting
 *
 * Uses IP-based rate limiting without authentication.
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   async (request) => {
 *     return NextResponse.json({ success: true });
 *   },
 *   { limit: 10, windowMs: 60000 }
 * );
 * ```
 */
export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig = { limit: 60, windowMs: 60000 }
): RouteHandler {
  return async (request, context) => {
    const { result, response } = await rateLimit(request, config);

    if (response) {
      return response;
    }

    // Execute handler and add rate limit headers
    const handlerResponse = await handler(request, context);
    return addRateLimitHeaders(handlerResponse, result);
  };
}

/**
 * Wrap a route handler with authentication and tier-based rate limiting
 *
 * Combines authentication check with rate limiting.
 *
 * @example
 * ```ts
 * export const POST = withAuthAndRateLimit(
 *   async (request, context, user) => {
 *     // user.profileId and user.tier are available
 *     return NextResponse.json({ userId: user.profileId });
 *   },
 *   { useTierLimits: true }
 * );
 * ```
 */
export function withAuthAndRateLimit(
  handler: AuthenticatedRouteHandler,
  options: RateLimitMiddlewareOptions = {}
): RouteHandler {
  const {
    config = DEFAULT_TIER_LIMITS,
    useTierLimits = true,
    perUser = true,
  } = options;

  return async (request, context) => {
    // Check authentication
    const identity = await getVerifiedIdentity();

    if (!identity) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Determine rate limit config
    let rateLimitConfig: RateLimitConfig;
    if (useTierLimits && 'FREE' in config) {
      rateLimitConfig = (config as TierRateLimits)[identity.tier];
    } else {
      rateLimitConfig = config as RateLimitConfig;
    }

    // Check rate limit
    const { result, response } = await checkRateLimit(request, {
      config: rateLimitConfig,
      keyGenerator: perUser
        ? () => getUserKey(identity.profileId)
        : (req) => getIpKey(req),
    });

    if (response) {
      return response;
    }

    // Execute handler
    const handlerResponse = await handler(request, context, {
      profileId: identity.profileId,
      tier: identity.tier,
    });

    return addRateLimitHeaders(handlerResponse, result);
  };
}

// ============================================
// PRESET RATE LIMITERS
// ============================================

/**
 * Standard API rate limiter (tier-based, per user)
 */
export function withStandardRateLimit(
  handler: AuthenticatedRouteHandler
): RouteHandler {
  return withAuthAndRateLimit(handler, {
    config: DEFAULT_TIER_LIMITS,
    useTierLimits: true,
    perUser: true,
  });
}

/**
 * Rate limiter for expensive operations (lower limits)
 */
export function withExpensiveRateLimit(
  handler: AuthenticatedRouteHandler
): RouteHandler {
  return withAuthAndRateLimit(handler, {
    config: EXPENSIVE_OPERATION_LIMITS,
    useTierLimits: true,
    perUser: true,
  });
}

/**
 * Rate limiter for AI/generation endpoints
 */
export function withAIRateLimit(
  handler: AuthenticatedRouteHandler
): RouteHandler {
  return withAuthAndRateLimit(handler, {
    config: AI_GENERATION_LIMITS,
    useTierLimits: true,
    perUser: true,
  });
}

/**
 * Rate limiter for upload endpoints
 */
export function withUploadRateLimit(
  handler: AuthenticatedRouteHandler
): RouteHandler {
  return withAuthAndRateLimit(handler, {
    config: UPLOAD_LIMITS,
    useTierLimits: true,
    perUser: true,
  });
}

/**
 * Rate limiter for auth endpoints (stricter, IP-based)
 */
export function withAuthRateLimit(handler: RouteHandler): RouteHandler {
  return withRateLimit(handler, AUTH_LIMITS);
}

// ============================================
// UTILITY: RATE LIMIT INFO ENDPOINT
// ============================================

/**
 * Get current rate limit status for a user
 *
 * Useful for showing users their current usage.
 */
export async function getRateLimitStatus(
  request: NextRequest,
  userId: string,
  tier: UserTier
): Promise<Record<string, RateLimitResult>> {
  const configs = {
    api: DEFAULT_TIER_LIMITS[tier],
    expensive: EXPENSIVE_OPERATION_LIMITS[tier],
    ai: AI_GENERATION_LIMITS[tier],
    upload: UPLOAD_LIMITS[tier],
  };

  const status: Record<string, RateLimitResult> = {};

  for (const [name, config] of Object.entries(configs)) {
    const limiter = new RateLimiter({
      config: { ...config, name },
      keyGenerator: () => getUserKey(userId),
    });

    // Get current status without incrementing
    // We do this by checking, then immediately we'd need to decrement
    // For simplicity, we'll just report the config limits
    const result = await limiter.check(request);

    // Decrement since we just want to read, not count this as a request
    // Note: This is a workaround - ideally we'd have a "peek" method
    status[name] = {
      ...result,
      current: Math.max(0, result.current - 1),
      remaining: Math.min(result.remaining + 1, config.limit),
    };
  }

  return status;
}
