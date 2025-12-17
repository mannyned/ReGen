/**
 * Rate Limiter Core
 *
 * Provides rate limiting functionality for API routes.
 * Supports tier-based limits and multiple rate limit rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore, type RateLimitStore } from './store';
import type { UserTier } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Unique identifier for this limit (e.g., 'api', 'upload') */
  name?: string;
}

export interface TierRateLimits {
  FREE: RateLimitConfig;
  CREATOR: RateLimitConfig;
  PRO: RateLimitConfig;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in window */
  current: number;
  /** Maximum requests allowed */
  limit: number;
  /** Requests remaining in window */
  remaining: number;
  /** Timestamp when window resets (ms) */
  resetAt: number;
  /** Seconds until window resets */
  retryAfter: number;
}

export interface RateLimitOptions {
  /** Rate limit configuration or tier-based configs */
  config: RateLimitConfig | TierRateLimits;
  /** User's tier (if using tier-based limits) */
  tier?: UserTier;
  /** Custom key generator (default: IP-based) */
  keyGenerator?: (request: NextRequest) => string;
  /** Skip rate limiting for certain requests */
  skip?: (request: NextRequest) => boolean;
  /** Custom store (default: auto-selected based on environment) */
  store?: RateLimitStore;
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

/**
 * Default rate limits per tier (requests per minute)
 */
export const DEFAULT_TIER_LIMITS: TierRateLimits = {
  FREE: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
    name: 'default',
  },
  CREATOR: {
    limit: 60,
    windowMs: 60 * 1000,
    name: 'default',
  },
  PRO: {
    limit: 120,
    windowMs: 60 * 1000,
    name: 'default',
  },
};

/**
 * Stricter limits for expensive operations (per minute)
 */
export const EXPENSIVE_OPERATION_LIMITS: TierRateLimits = {
  FREE: {
    limit: 5,
    windowMs: 60 * 1000,
    name: 'expensive',
  },
  CREATOR: {
    limit: 15,
    windowMs: 60 * 1000,
    name: 'expensive',
  },
  PRO: {
    limit: 30,
    windowMs: 60 * 1000,
    name: 'expensive',
  },
};

/**
 * Limits for AI/generation endpoints (per hour)
 */
export const AI_GENERATION_LIMITS: TierRateLimits = {
  FREE: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    name: 'ai',
  },
  CREATOR: {
    limit: 100,
    windowMs: 60 * 60 * 1000,
    name: 'ai',
  },
  PRO: {
    limit: 500,
    windowMs: 60 * 60 * 1000,
    name: 'ai',
  },
};

/**
 * Limits for upload endpoints (per hour)
 */
export const UPLOAD_LIMITS: TierRateLimits = {
  FREE: {
    limit: 10,
    windowMs: 60 * 60 * 1000,
    name: 'upload',
  },
  CREATOR: {
    limit: 50,
    windowMs: 60 * 60 * 1000,
    name: 'upload',
  },
  PRO: {
    limit: 200,
    windowMs: 60 * 60 * 1000,
    name: 'upload',
  },
};

/**
 * Auth endpoint limits (stricter to prevent brute force)
 */
export const AUTH_LIMITS: RateLimitConfig = {
  limit: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  name: 'auth',
};

// ============================================
// KEY GENERATORS
// ============================================

/**
 * Generate rate limit key from IP address
 */
export function getIpKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return `ip:${ip}`;
}

/**
 * Generate rate limit key from user ID
 */
export function getUserKey(userId: string): string {
  return `user:${userId}`;
}

/**
 * Generate composite key from IP and user
 */
export function getCompositeKey(request: NextRequest, userId?: string): string {
  const ip = getIpKey(request);
  if (userId) {
    return `${ip}:${getUserKey(userId)}`;
  }
  return ip;
}

// ============================================
// RATE LIMITER CLASS
// ============================================

export class RateLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;
  private keyGenerator: (request: NextRequest) => string;
  private skip?: (request: NextRequest) => boolean;

  constructor(options: RateLimitOptions) {
    this.store = options.store || getStore();
    this.keyGenerator = options.keyGenerator || getIpKey;
    this.skip = options.skip;

    // Resolve tier-based config
    if ('FREE' in options.config) {
      const tier = options.tier || 'FREE';
      this.config = (options.config as TierRateLimits)[tier];
    } else {
      this.config = options.config as RateLimitConfig;
    }
  }

  /**
   * Check if request should be rate limited
   */
  async check(request: NextRequest): Promise<RateLimitResult> {
    // Check if should skip
    if (this.skip?.(request)) {
      return {
        allowed: true,
        current: 0,
        limit: this.config.limit,
        remaining: this.config.limit,
        resetAt: Date.now() + this.config.windowMs,
        retryAfter: 0,
      };
    }

    const key = this.buildKey(request);
    const entry = await this.store.increment(key, this.config.windowMs);

    const allowed = entry.count <= this.config.limit;
    const remaining = Math.max(0, this.config.limit - entry.count);
    const retryAfter = allowed ? 0 : Math.ceil((entry.resetAt - Date.now()) / 1000);

    return {
      allowed,
      current: entry.count,
      limit: this.config.limit,
      remaining,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(request: NextRequest): Promise<void> {
    const key = this.buildKey(request);
    await this.store.reset(key);
  }

  private buildKey(request: NextRequest): string {
    const baseKey = this.keyGenerator(request);
    const name = this.config.name || 'default';
    return `${name}:${baseKey}`;
  }
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      limit: result.limit,
      current: result.current,
      retryAfter: result.retryAfter,
      resetAt: new Date(result.resetAt).toISOString(),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toString(),
        'Retry-After': result.retryAfter.toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetAt.toString());
  return response;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick rate limit check - returns error response if exceeded
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<{ result: RateLimitResult; response: NextResponse | null }> {
  const limiter = new RateLimiter(options);
  const result = await limiter.check(request);

  if (!result.allowed) {
    return { result, response: rateLimitExceededResponse(result) };
  }

  return { result, response: null };
}

/**
 * Create a rate limiter for a specific configuration
 * Useful for reusing the same limiter across requests
 */
export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  return new RateLimiter(options);
}
