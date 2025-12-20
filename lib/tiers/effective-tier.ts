/**
 * Effective Tier Logic
 *
 * Computes the effective tier for a user, considering beta access.
 * This is the SINGLE SOURCE OF TRUTH for tier-based access control.
 *
 * Beta Pro users get temporary Pro-level access that expires automatically.
 * After expiry, they revert to their original tier.
 */

import type { UserTier } from '@prisma/client';
import { TIER_CONFIGS, getTierLimits, type TierLimits } from './config';

// ============================================
// TYPES
// ============================================

export interface ProfileWithBeta {
  id: string;
  email: string;
  tier: UserTier;
  betaUser: boolean;
  betaExpiresAt: Date | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface EffectiveTierResult {
  /** The effective tier (PRO if beta is active, otherwise actual tier) */
  effectiveTier: UserTier;
  /** Whether access is due to beta (not paid subscription) */
  isBetaPro: boolean;
  /** Days remaining in beta (null if not beta) */
  betaDaysRemaining: number | null;
  /** Whether beta expires within 7 days */
  betaExpiringSoon: boolean;
  /** The user's actual tier (not affected by beta) */
  actualTier: UserTier;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Check if a user currently has active beta access
 *
 * @param profile - Profile with beta fields
 * @returns true if beta is active and not expired
 */
export function isBetaActive(profile: ProfileWithBeta): boolean {
  if (!profile.betaUser || !profile.betaExpiresAt) {
    return false;
  }
  return new Date() < new Date(profile.betaExpiresAt);
}

/**
 * Calculate days remaining in beta
 *
 * @param betaExpiresAt - Beta expiration date
 * @returns Days remaining (0 if expired, null if not beta)
 */
export function getBetaDaysRemaining(betaExpiresAt: Date | null): number | null {
  if (!betaExpiresAt) return null;

  const now = new Date();
  const expiresAt = new Date(betaExpiresAt);
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get the effective tier for a user
 *
 * This is the main function to use for all tier-based access control.
 * It returns PRO if beta is active, otherwise the user's actual tier.
 *
 * @param profile - Profile with beta fields
 * @returns EffectiveTierResult with tier and beta status
 */
export function getEffectiveTier(profile: ProfileWithBeta): EffectiveTierResult {
  const betaActive = isBetaActive(profile);
  const daysRemaining = getBetaDaysRemaining(profile.betaExpiresAt);

  return {
    effectiveTier: betaActive ? 'PRO' : profile.tier,
    isBetaPro: betaActive,
    betaDaysRemaining: betaActive ? daysRemaining : null,
    betaExpiringSoon: betaActive && daysRemaining !== null && daysRemaining <= 7,
    actualTier: profile.tier,
  };
}

/**
 * Get effective tier limits for a user
 *
 * @param profile - Profile with beta fields
 * @returns Tier limits based on effective tier
 */
export function getEffectiveTierLimits(profile: ProfileWithBeta): TierLimits {
  const { effectiveTier } = getEffectiveTier(profile);
  return getTierLimits(effectiveTier);
}

/**
 * Check if user has access to a feature based on effective tier
 *
 * @param profile - Profile with beta fields
 * @param requiredTier - Minimum tier required
 * @returns true if user has access
 */
export function hasEffectiveTierAccess(
  profile: ProfileWithBeta,
  requiredTier: UserTier
): boolean {
  const { effectiveTier } = getEffectiveTier(profile);
  const tierOrder: UserTier[] = ['FREE', 'CREATOR', 'PRO'];
  return tierOrder.indexOf(effectiveTier) >= tierOrder.indexOf(requiredTier);
}

// ============================================
// PLATFORM LIMITS
// ============================================

/**
 * Platform limits by tier
 */
export const PLATFORM_LIMITS: Record<UserTier, number> = {
  FREE: 2,
  CREATOR: 5,
  PRO: -1, // Unlimited
};

/**
 * Get platform connection limit for effective tier
 *
 * @param profile - Profile with beta fields
 * @returns Number of platforms allowed (-1 = unlimited)
 */
export function getEffectivePlatformLimit(profile: ProfileWithBeta): number {
  const { effectiveTier } = getEffectiveTier(profile);
  return PLATFORM_LIMITS[effectiveTier];
}

/**
 * Check if user can connect more platforms
 *
 * @param profile - Profile with beta fields
 * @param currentConnections - Number of currently connected platforms
 * @returns true if user can connect more platforms
 */
export function canConnectMorePlatforms(
  profile: ProfileWithBeta,
  currentConnections: number
): boolean {
  const limit = getEffectivePlatformLimit(profile);
  if (limit === -1) return true; // Unlimited
  return currentConnections < limit;
}

// ============================================
// TEAM SEATS (PRO ONLY)
// ============================================

/**
 * Maximum team seats for Pro tier
 */
export const PRO_TEAM_SEATS = 3;

/**
 * Check if user has team access
 *
 * @param profile - Profile with beta fields
 * @returns true if user has team features (Pro/Beta Pro)
 */
export function hasTeamAccess(profile: ProfileWithBeta): boolean {
  return hasEffectiveTierAccess(profile, 'PRO');
}

/**
 * Get max team seats for user
 *
 * @param profile - Profile with beta fields
 * @returns Number of team seats (0 if not Pro)
 */
export function getMaxTeamSeats(profile: ProfileWithBeta): number {
  return hasTeamAccess(profile) ? PRO_TEAM_SEATS : 0;
}

// ============================================
// OVER-LIMIT HANDLING
// ============================================

export interface OverLimitStatus {
  isOverLimit: boolean;
  currentCount: number;
  allowedCount: number;
  excessCount: number;
}

/**
 * Check if user is over their platform connection limit
 *
 * This is used after beta expiry to show appropriate messaging
 * WITHOUT deleting existing connections.
 *
 * @param profile - Profile with beta fields
 * @param currentConnections - Number of currently connected platforms
 * @returns OverLimitStatus with details
 */
export function getPlatformOverLimitStatus(
  profile: ProfileWithBeta,
  currentConnections: number
): OverLimitStatus {
  const limit = getEffectivePlatformLimit(profile);

  // Unlimited = never over limit
  if (limit === -1) {
    return {
      isOverLimit: false,
      currentCount: currentConnections,
      allowedCount: -1,
      excessCount: 0,
    };
  }

  const isOverLimit = currentConnections > limit;

  return {
    isOverLimit,
    currentCount: currentConnections,
    allowedCount: limit,
    excessCount: isOverLimit ? currentConnections - limit : 0,
  };
}

// ============================================
// SERIALIZATION FOR CLIENT
// ============================================

/**
 * Serialize effective tier result for client-side use
 *
 * This is safe to send to the client as it contains no secrets.
 */
export interface ClientTierInfo {
  effectiveTier: UserTier;
  actualTier: UserTier;
  isBetaPro: boolean;
  betaDaysRemaining: number | null;
  betaExpiringSoon: boolean;
  platformLimit: number;
  hasTeamAccess: boolean;
  maxTeamSeats: number;
}

/**
 * Get tier info for client consumption
 *
 * @param profile - Profile with beta fields
 * @returns ClientTierInfo safe to send to frontend
 */
export function getClientTierInfo(profile: ProfileWithBeta): ClientTierInfo {
  const tierResult = getEffectiveTier(profile);

  return {
    effectiveTier: tierResult.effectiveTier,
    actualTier: tierResult.actualTier,
    isBetaPro: tierResult.isBetaPro,
    betaDaysRemaining: tierResult.betaDaysRemaining,
    betaExpiringSoon: tierResult.betaExpiringSoon,
    platformLimit: getEffectivePlatformLimit(profile),
    hasTeamAccess: hasTeamAccess(profile),
    maxTeamSeats: getMaxTeamSeats(profile),
  };
}
