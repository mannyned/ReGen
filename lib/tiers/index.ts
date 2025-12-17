/**
 * Tier Management Exports
 *
 * Centralized exports for tier configuration and enforcement.
 *
 * @example
 * ```ts
 * // Configuration
 * import { TIER_CONFIGS, getTierLimits, hasFeature } from '@/lib/tiers';
 *
 * // Enforcement in routes
 * import { requireAuth, requireTier, checkPlatformLimit } from '@/lib/tiers';
 * ```
 */

// Configuration
export {
  TIER_CONFIGS,
  TIER_LEVELS,
  TIER_ORDER,
  DEFAULT_TIER,
  PLATFORM_ACCESS,
  getTierConfig,
  getTierLimits,
  getTierFeatures,
  hasTierAccess,
  hasFeature,
  isUnlimited,
  isUnderLimit,
  getNextTier,
  getUpgradeTiers,
  formatPrice,
  isPlatformAvailable,
  type TierConfig,
  type TierLimits,
  type TierFeatures,
  type UserTier,
} from './config';

// Enforcement
export {
  // Authentication
  getAuthenticatedUser,
  requireAuth,
  // Tier requirements
  requireTier,
  requireFeature,
  // Limit checks
  checkPlatformLimit,
  checkScheduledPostsLimit,
  checkUploadsLimit,
  // Team access
  checkTeamAccess,
  checkTeamMemberLimit,
  // Usage
  getUsageSummary,
  // Response helpers
  unauthorizedResponse,
  tierForbiddenResponse,
  limitExceededResponse,
  featureUnavailableResponse,
  // Higher-order handlers
  withAuthHandler,
  withTierHandler,
  withFeatureHandler,
  // Types
  type AuthenticatedUser,
  type TierCheckResult,
  type TierEnforcementOptions,
} from './enforce';
