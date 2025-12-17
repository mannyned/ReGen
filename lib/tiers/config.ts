/**
 * Tier Configuration
 *
 * Defines the features, limits, and capabilities for each subscription tier.
 * This is the single source of truth for tier-based access control.
 */

import type { UserTier } from '@prisma/client';

// ============================================
// TIER DEFINITIONS
// ============================================

export interface TierLimits {
  /** Maximum number of social platforms that can be connected */
  maxPlatforms: number;
  /** Maximum scheduled posts per month */
  maxScheduledPosts: number;
  /** Maximum content uploads per month */
  maxUploads: number;
  /** Maximum storage in MB */
  maxStorageMB: number;
  /** Days of analytics history */
  analyticsHistoryDays: number;
  /** Maximum team members (0 = no team feature) */
  maxTeamMembers: number;
}

export interface TierFeatures {
  /** Can access team features */
  teamAccess: boolean;
  /** Can export analytics */
  analyticsExport: boolean;
  /** Can use AI caption generation */
  aiCaptions: boolean;
  /** Can use advanced scheduling */
  advancedScheduling: boolean;
  /** Can access detailed analytics */
  detailedAnalytics: boolean;
  /** Can use brand voice profiles */
  brandVoice: boolean;
  /** Can use bulk operations */
  bulkOperations: boolean;
  /** Priority support */
  prioritySupport: boolean;
  /** API access */
  apiAccess: boolean;
  /** Custom branding (remove ReGenr watermark) */
  customBranding: boolean;
}

export interface TierConfig {
  id: UserTier;
  name: string;
  description: string;
  limits: TierLimits;
  features: TierFeatures;
  price: {
    monthly: number;
    yearly: number;
  };
}

// ============================================
// TIER CONFIGURATIONS
// ============================================

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    description: 'Perfect for getting started',
    limits: {
      maxPlatforms: 2,
      maxScheduledPosts: 10,
      maxUploads: 20,
      maxStorageMB: 100,
      analyticsHistoryDays: 7,
      maxTeamMembers: 0,
    },
    features: {
      teamAccess: false,
      analyticsExport: false,
      aiCaptions: false,
      advancedScheduling: false,
      detailedAnalytics: false,
      brandVoice: false,
      bulkOperations: false,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false,
    },
    price: {
      monthly: 0,
      yearly: 0,
    },
  },

  CREATOR: {
    id: 'CREATOR',
    name: 'Creator',
    description: 'For growing content creators',
    limits: {
      maxPlatforms: 5,
      maxScheduledPosts: 100,
      maxUploads: 200,
      maxStorageMB: 1000,
      analyticsHistoryDays: 30,
      maxTeamMembers: 0,
    },
    features: {
      teamAccess: false,
      analyticsExport: true,
      aiCaptions: true,
      advancedScheduling: true,
      detailedAnalytics: true,
      brandVoice: true,
      bulkOperations: false,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false,
    },
    price: {
      monthly: 19,
      yearly: 190,
    },
  },

  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'For teams and agencies',
    limits: {
      maxPlatforms: -1, // Unlimited
      maxScheduledPosts: -1, // Unlimited
      maxUploads: -1, // Unlimited
      maxStorageMB: 10000,
      analyticsHistoryDays: 365,
      maxTeamMembers: 10,
    },
    features: {
      teamAccess: true,
      analyticsExport: true,
      aiCaptions: true,
      advancedScheduling: true,
      detailedAnalytics: true,
      brandVoice: true,
      bulkOperations: true,
      prioritySupport: true,
      apiAccess: true,
      customBranding: true,
    },
    price: {
      monthly: 49,
      yearly: 490,
    },
  },
};

// ============================================
// TIER HIERARCHY
// ============================================

/**
 * Numeric level for each tier (higher = more access)
 */
export const TIER_LEVELS: Record<UserTier, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
};

/**
 * All tiers in order from lowest to highest
 */
export const TIER_ORDER: UserTier[] = ['FREE', 'CREATOR', 'PRO'];

/**
 * Default tier for new users
 */
export const DEFAULT_TIER: UserTier = 'FREE';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get configuration for a tier
 */
export function getTierConfig(tier: UserTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Get limits for a tier
 */
export function getTierLimits(tier: UserTier): TierLimits {
  return TIER_CONFIGS[tier].limits;
}

/**
 * Get features for a tier
 */
export function getTierFeatures(tier: UserTier): TierFeatures {
  return TIER_CONFIGS[tier].features;
}

/**
 * Check if a tier has access to a specific tier level or higher
 */
export function hasTierAccess(userTier: UserTier, requiredTier: UserTier): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Check if a tier has a specific feature
 */
export function hasFeature(tier: UserTier, feature: keyof TierFeatures): boolean {
  return TIER_CONFIGS[tier].features[feature];
}

/**
 * Check if a limit is unlimited (-1)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Check if under limit (handles unlimited case)
 */
export function isUnderLimit(current: number, limit: number): boolean {
  if (isUnlimited(limit)) return true;
  return current < limit;
}

/**
 * Get the next tier upgrade option
 */
export function getNextTier(currentTier: UserTier): UserTier | null {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex >= TIER_ORDER.length - 1) {
    return null;
  }
  return TIER_ORDER[currentIndex + 1];
}

/**
 * Get all available upgrade tiers
 */
export function getUpgradeTiers(currentTier: UserTier): UserTier[] {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex === -1) return [];
  return TIER_ORDER.slice(currentIndex + 1);
}

/**
 * Format price for display
 */
export function formatPrice(tier: UserTier, period: 'monthly' | 'yearly'): string {
  const price = TIER_CONFIGS[tier].price[period];
  if (price === 0) return 'Free';
  return `$${price}/${period === 'monthly' ? 'mo' : 'yr'}`;
}

// ============================================
// PLATFORM-SPECIFIC LIMITS
// ============================================

/**
 * Platforms available for each tier
 */
export const PLATFORM_ACCESS: Record<UserTier, string[]> = {
  FREE: ['meta', 'tiktok'],
  CREATOR: ['meta', 'tiktok', 'google', 'x', 'linkedin'],
  PRO: ['meta', 'tiktok', 'google', 'x', 'linkedin'], // All platforms
};

/**
 * Check if a platform is available for a tier
 */
export function isPlatformAvailable(tier: UserTier, platform: string): boolean {
  // PRO has access to all platforms
  if (tier === 'PRO') return true;
  return PLATFORM_ACCESS[tier].includes(platform);
}

// ============================================
// EXPORTS
// ============================================

export type { UserTier };
