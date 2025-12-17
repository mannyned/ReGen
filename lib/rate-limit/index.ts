/**
 * Rate Limiting Module
 *
 * Provides rate limiting for API routes with tier-based limits.
 *
 * @example
 * ```ts
 * // Simple rate limiting
 * import { rateLimit } from '@/lib/rate-limit';
 *
 * export async function POST(request: NextRequest) {
 *   const { response } = await rateLimit(request);
 *   if (response) return response;
 *   // ...
 * }
 *
 * // With authentication and tier-based limits
 * import { withAuthAndRateLimit } from '@/lib/rate-limit';
 *
 * export const POST = withAuthAndRateLimit(async (request, context, user) => {
 *   return NextResponse.json({ userId: user.profileId });
 * });
 *
 * // Preset rate limiters
 * import { withAIRateLimit, withUploadRateLimit } from '@/lib/rate-limit';
 *
 * export const POST = withAIRateLimit(async (request, context, user) => {
 *   // AI generation endpoint with stricter limits
 * });
 * ```
 */

// Core types and utilities
export {
  RateLimiter,
  checkRateLimit,
  createRateLimiter,
  rateLimitExceededResponse,
  addRateLimitHeaders,
  getIpKey,
  getUserKey,
  getCompositeKey,
  type RateLimitConfig,
  type TierRateLimits,
  type RateLimitResult,
  type RateLimitOptions,
} from './limiter';

// Default configurations
export {
  DEFAULT_TIER_LIMITS,
  EXPENSIVE_OPERATION_LIMITS,
  AI_GENERATION_LIMITS,
  UPLOAD_LIMITS,
  AUTH_LIMITS,
} from './limiter';

// Middleware and handlers
export {
  rateLimit,
  rateLimitByTier,
  withRateLimit,
  withAuthAndRateLimit,
  withStandardRateLimit,
  withExpensiveRateLimit,
  withAIRateLimit,
  withUploadRateLimit,
  withAuthRateLimit,
  getRateLimitStatus,
  type RateLimitMiddlewareOptions,
} from './middleware';

// Store (for advanced usage)
export {
  getStore,
  MemoryStore,
  RedisStore,
  type RateLimitStore,
  type RateLimitEntry,
} from './store';
