import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform, RateLimitStatus } from '../types/social'
import { RATE_LIMITS } from '../config/oauth'

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

interface RateLimitEntry {
  count: number
  resetAt: Date
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

export function getRateLimitKey(
  identifier: string,
  endpoint: string
): string {
  return `${identifier}:${endpoint}`
}

export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: { maxRequests: number; windowMs: number }
): RateLimitStatus {
  const key = getRateLimitKey(identifier, endpoint)
  const now = new Date()
  const entry = rateLimitStore.get(key)

  // Initialize or reset if window expired
  if (!entry || entry.resetAt < now) {
    const resetAt = new Date(now.getTime() + config.windowMs)
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      remaining: config.maxRequests - 1,
      total: config.maxRequests,
      resetAt,
      isLimited: false,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  const remaining = Math.max(0, config.maxRequests - entry.count)

  return {
    remaining,
    total: config.maxRequests,
    resetAt: entry.resetAt,
    isLimited: remaining <= 0,
  }
}

export function getPlatformRateLimit(
  userId: string,
  platform: SocialPlatform
): RateLimitStatus {
  const config = RATE_LIMITS[platform]
  return checkRateLimit(userId, platform, config)
}

// ============================================
// API RATE LIMITING
// ============================================

const API_RATE_LIMITS = {
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100/min
  publish: { maxRequests: 10, windowMs: 60 * 1000 }, // 10/min for publishing
  analytics: { maxRequests: 30, windowMs: 60 * 1000 }, // 30/min for analytics
  oauth: { maxRequests: 20, windowMs: 60 * 1000 }, // 20/min for OAuth
}

export function createRateLimitMiddleware(
  type: keyof typeof API_RATE_LIMITS = 'default'
) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Get identifier (IP or user ID)
    const identifier =
      request.headers.get('x-user-id') ||
      request.headers.get('x-forwarded-for') ||
      'anonymous'

    const endpoint = request.nextUrl.pathname
    const config = API_RATE_LIMITS[type]
    const status = checkRateLimit(identifier, endpoint, config)

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': status.remaining.toString(),
      'X-RateLimit-Reset': status.resetAt.toISOString(),
    }

    if (status.isLimited) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((status.resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers,
        }
      )
    }

    const response = await handler()

    // Add headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

// ============================================
// CLEANUP (for memory management)
// ============================================

export function cleanupExpiredRateLimits(): void {
  const now = new Date()

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000)
}
