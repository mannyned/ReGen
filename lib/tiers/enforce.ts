/**
 * Tier Enforcement Utilities
 *
 * Functions to enforce tier requirements in API routes and client code.
 * Provides requireAuth, requireTier, and feature-specific checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import type { UserTier } from '@prisma/client';
import type { User } from '@supabase/supabase-js';
import {
  TIER_CONFIGS,
  TIER_LEVELS,
  hasTierAccess,
  hasFeature,
  isUnderLimit,
  getTierLimits,
  isPlatformAvailable,
  type TierFeatures,
} from './config';

// ============================================
// TYPES
// ============================================

export interface AuthenticatedUser {
  /** Supabase user object */
  user: User;
  /** User's profile ID (same as user.id) */
  profileId: string;
  /** User's tier from profile */
  tier: UserTier;
  /** User's email */
  email: string;
  /** User's display name */
  displayName?: string | null;
}

export interface TierCheckResult {
  /** Whether the check passed */
  allowed: boolean;
  /** Error response if check failed */
  response?: NextResponse;
  /** Error message */
  error?: string;
  /** Required tier for upgrade messaging */
  requiredTier?: UserTier;
  /** Current usage (for limit checks) */
  currentUsage?: number;
  /** Limit value */
  limit?: number;
}

export interface TierEnforcementOptions {
  /** Custom error message */
  errorMessage?: string;
  /** Whether to include upgrade info in response */
  includeUpgradeInfo?: boolean;
}

// ============================================
// ERROR RESPONSES
// ============================================

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}

/**
 * Create forbidden response for tier requirements
 */
export function tierForbiddenResponse(
  requiredTier: UserTier,
  message?: string,
  includeUpgradeInfo = true
): NextResponse {
  const tierConfig = TIER_CONFIGS[requiredTier];

  return NextResponse.json(
    {
      error: message || `This feature requires ${tierConfig.name} tier or higher`,
      code: 'TIER_REQUIRED',
      requiredTier,
      ...(includeUpgradeInfo && {
        upgrade: {
          tier: requiredTier,
          name: tierConfig.name,
          price: tierConfig.price,
        },
      }),
    },
    { status: 403 }
  );
}

/**
 * Create limit exceeded response
 */
export function limitExceededResponse(
  limitName: string,
  current: number,
  limit: number,
  requiredTier: UserTier
): NextResponse {
  const tierConfig = TIER_CONFIGS[requiredTier];

  return NextResponse.json(
    {
      error: `You have reached your ${limitName} limit (${current}/${limit})`,
      code: 'LIMIT_EXCEEDED',
      limitName,
      current,
      limit,
      upgrade: {
        tier: requiredTier,
        name: tierConfig.name,
        newLimit: TIER_CONFIGS[requiredTier].limits,
      },
    },
    { status: 403 }
  );
}

/**
 * Create feature unavailable response
 */
export function featureUnavailableResponse(
  feature: keyof TierFeatures,
  requiredTier: UserTier
): NextResponse {
  const tierConfig = TIER_CONFIGS[requiredTier];

  return NextResponse.json(
    {
      error: `This feature is available on ${tierConfig.name} tier and above`,
      code: 'FEATURE_UNAVAILABLE',
      feature,
      requiredTier,
      upgrade: {
        tier: requiredTier,
        name: tierConfig.name,
        price: tierConfig.price,
      },
    },
    { status: 403 }
  );
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Get authenticated user with tier info
 */
export async function getAuthenticatedUser(
  request?: NextRequest
): Promise<AuthenticatedUser | null> {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && request) {
    const { searchParams } = new URL(request.url);
    const devUserId = searchParams.get('userId');

    if (devUserId || process.env.DISABLE_AUTH === 'true') {
      const userId = devUserId || 'dev-user-001';
      return {
        user: { id: userId, email: 'dev@regenr.app' } as User,
        profileId: userId,
        tier: 'PRO', // Dev users get PRO access
        email: 'dev@regenr.app',
        displayName: 'Development User',
      };
    }
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get profile for tier info
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { tier: true, displayName: true },
    });

    return {
      user,
      profileId: user.id,
      tier: profile?.tier || 'FREE',
      email: user.email || '',
      displayName: profile?.displayName,
    };
  } catch (error) {
    console.error('[Auth] Failed to get authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication - returns user or error response
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { user, response } = await requireAuth(request);
 *   if (response) return response;
 *
 *   // user is guaranteed to be authenticated
 * }
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; response: NextResponse | null }> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      user: null,
      response: unauthorizedResponse(),
    };
  }

  return { user, response: null };
}

// ============================================
// TIER REQUIREMENTS
// ============================================

/**
 * Require a specific tier or higher
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { user, response } = await requireTier(request, 'CREATOR');
 *   if (response) return response;
 *
 *   // user has CREATOR tier or higher
 * }
 * ```
 */
export async function requireTier(
  request: NextRequest,
  requiredTier: UserTier,
  options: TierEnforcementOptions = {}
): Promise<{ user: AuthenticatedUser | null; response: NextResponse | null }> {
  // First check authentication
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return authResult;
  }

  const user = authResult.user!;

  // Check tier
  if (!hasTierAccess(user.tier, requiredTier)) {
    return {
      user: null,
      response: tierForbiddenResponse(
        requiredTier,
        options.errorMessage,
        options.includeUpgradeInfo !== false
      ),
    };
  }

  return { user, response: null };
}

/**
 * Require a specific feature
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { user, response } = await requireFeature(request, 'teamAccess');
 *   if (response) return response;
 *
 *   // user has team access feature
 * }
 * ```
 */
export async function requireFeature(
  request: NextRequest,
  feature: keyof TierFeatures
): Promise<{ user: AuthenticatedUser | null; response: NextResponse | null }> {
  // First check authentication
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return authResult;
  }

  const user = authResult.user!;

  // Check feature access
  if (!hasFeature(user.tier, feature)) {
    // Find minimum tier that has this feature
    const requiredTier = (['FREE', 'CREATOR', 'PRO'] as UserTier[]).find(
      (tier) => hasFeature(tier, feature)
    ) || 'PRO';

    return {
      user: null,
      response: featureUnavailableResponse(feature, requiredTier),
    };
  }

  return { user, response: null };
}

// ============================================
// LIMIT CHECKS
// ============================================

/**
 * Check platform connection limit
 *
 * @example
 * ```ts
 * const check = await checkPlatformLimit(request);
 * if (!check.allowed) return check.response;
 * ```
 */
export async function checkPlatformLimit(
  request: NextRequest,
  platformToAdd?: string
): Promise<TierCheckResult> {
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return {
      allowed: false,
      response: authResult.response,
      error: 'Authentication required',
    };
  }

  const user = authResult.user!;
  const limits = getTierLimits(user.tier);

  // Check if platform is available for tier
  if (platformToAdd && !isPlatformAvailable(user.tier, platformToAdd)) {
    return {
      allowed: false,
      response: tierForbiddenResponse(
        'CREATOR',
        `${platformToAdd} connections are available on Creator tier and above`
      ),
      error: 'Platform not available for tier',
      requiredTier: 'CREATOR',
    };
  }

  // Count current connections
  const currentConnections = await prisma.oAuthConnection.count({
    where: { profileId: user.profileId },
  });

  // Check limit
  if (!isUnderLimit(currentConnections, limits.maxPlatforms)) {
    const nextTier = user.tier === 'FREE' ? 'CREATOR' : 'PRO';
    return {
      allowed: false,
      response: limitExceededResponse(
        'platform connections',
        currentConnections,
        limits.maxPlatforms,
        nextTier
      ),
      error: 'Platform limit exceeded',
      requiredTier: nextTier,
      currentUsage: currentConnections,
      limit: limits.maxPlatforms,
    };
  }

  return {
    allowed: true,
    currentUsage: currentConnections,
    limit: limits.maxPlatforms,
  };
}

/**
 * Check scheduled posts limit
 */
export async function checkScheduledPostsLimit(
  request: NextRequest
): Promise<TierCheckResult> {
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return {
      allowed: false,
      response: authResult.response,
      error: 'Authentication required',
    };
  }

  const user = authResult.user!;
  const limits = getTierLimits(user.tier);

  // Count posts scheduled this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentPosts = await prisma.scheduledPost.count({
    where: {
      profileId: user.profileId,
      createdAt: { gte: startOfMonth },
    },
  });

  if (!isUnderLimit(currentPosts, limits.maxScheduledPosts)) {
    const nextTier = user.tier === 'FREE' ? 'CREATOR' : 'PRO';
    return {
      allowed: false,
      response: limitExceededResponse(
        'scheduled posts this month',
        currentPosts,
        limits.maxScheduledPosts,
        nextTier
      ),
      error: 'Scheduled posts limit exceeded',
      requiredTier: nextTier,
      currentUsage: currentPosts,
      limit: limits.maxScheduledPosts,
    };
  }

  return {
    allowed: true,
    currentUsage: currentPosts,
    limit: limits.maxScheduledPosts,
  };
}

/**
 * Check content uploads limit
 */
export async function checkUploadsLimit(
  request: NextRequest
): Promise<TierCheckResult> {
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return {
      allowed: false,
      response: authResult.response,
      error: 'Authentication required',
    };
  }

  const user = authResult.user!;
  const limits = getTierLimits(user.tier);

  // Count uploads this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentUploads = await prisma.contentUpload.count({
    where: {
      profileId: user.profileId,
      createdAt: { gte: startOfMonth },
    },
  });

  if (!isUnderLimit(currentUploads, limits.maxUploads)) {
    const nextTier = user.tier === 'FREE' ? 'CREATOR' : 'PRO';
    return {
      allowed: false,
      response: limitExceededResponse(
        'uploads this month',
        currentUploads,
        limits.maxUploads,
        nextTier
      ),
      error: 'Uploads limit exceeded',
      requiredTier: nextTier,
      currentUsage: currentUploads,
      limit: limits.maxUploads,
    };
  }

  return {
    allowed: true,
    currentUsage: currentUploads,
    limit: limits.maxUploads,
  };
}

// ============================================
// TEAM ACCESS (PRO ONLY)
// ============================================

/**
 * Check team access (Pro only)
 *
 * @example
 * ```ts
 * const check = await checkTeamAccess(request);
 * if (!check.allowed) return check.response;
 * ```
 */
export async function checkTeamAccess(
  request: NextRequest
): Promise<TierCheckResult> {
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return {
      allowed: false,
      response: authResult.response,
      error: 'Authentication required',
    };
  }

  const user = authResult.user!;

  // Team access is Pro only
  if (!hasFeature(user.tier, 'teamAccess')) {
    return {
      allowed: false,
      response: featureUnavailableResponse('teamAccess', 'PRO'),
      error: 'Team access requires Pro tier',
      requiredTier: 'PRO',
    };
  }

  return { allowed: true };
}

/**
 * Check team member limit (Pro only)
 */
export async function checkTeamMemberLimit(
  request: NextRequest,
  teamId: string
): Promise<TierCheckResult> {
  // First check team access
  const accessCheck = await checkTeamAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck;
  }

  const user = (await getAuthenticatedUser(request))!;
  const limits = getTierLimits(user.tier);

  // Count current team members
  // Note: This assumes a team_members table exists
  // const currentMembers = await prisma.teamMember.count({
  //   where: { teamId },
  // });
  const currentMembers = 0; // Placeholder until teams are implemented

  if (!isUnderLimit(currentMembers, limits.maxTeamMembers)) {
    return {
      allowed: false,
      response: limitExceededResponse(
        'team members',
        currentMembers,
        limits.maxTeamMembers,
        'PRO'
      ),
      error: 'Team member limit exceeded',
      requiredTier: 'PRO',
      currentUsage: currentMembers,
      limit: limits.maxTeamMembers,
    };
  }

  return {
    allowed: true,
    currentUsage: currentMembers,
    limit: limits.maxTeamMembers,
  };
}

// ============================================
// USAGE SUMMARY
// ============================================

/**
 * Get usage summary for a user
 *
 * Returns current usage across all limits for display in UI
 */
export async function getUsageSummary(profileId: string): Promise<{
  tier: UserTier;
  limits: Record<string, { current: number; limit: number; unlimited: boolean }>;
  features: Record<keyof TierFeatures, boolean>;
}> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { tier: true },
  });

  const tier = profile?.tier || 'FREE';
  const tierLimits = getTierLimits(tier);

  // Get current usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [platforms, scheduledPosts, uploads] = await Promise.all([
    prisma.oAuthConnection.count({ where: { profileId } }),
    prisma.scheduledPost.count({
      where: { profileId, createdAt: { gte: startOfMonth } },
    }),
    prisma.contentUpload.count({
      where: { profileId, createdAt: { gte: startOfMonth } },
    }),
  ]);

  return {
    tier,
    limits: {
      platforms: {
        current: platforms,
        limit: tierLimits.maxPlatforms,
        unlimited: tierLimits.maxPlatforms === -1,
      },
      scheduledPosts: {
        current: scheduledPosts,
        limit: tierLimits.maxScheduledPosts,
        unlimited: tierLimits.maxScheduledPosts === -1,
      },
      uploads: {
        current: uploads,
        limit: tierLimits.maxUploads,
        unlimited: tierLimits.maxUploads === -1,
      },
      storageMB: {
        current: 0, // TODO: Calculate actual storage usage
        limit: tierLimits.maxStorageMB,
        unlimited: tierLimits.maxStorageMB === -1,
      },
      teamMembers: {
        current: 0, // TODO: Get actual team member count
        limit: tierLimits.maxTeamMembers,
        unlimited: tierLimits.maxTeamMembers === -1,
      },
    },
    features: TIER_CONFIGS[tier].features,
  };
}

// ============================================
// HIGHER-ORDER HANDLER WRAPPERS
// ============================================

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: AuthenticatedUser
) => Promise<NextResponse>;

/**
 * Wrap handler with authentication requirement
 */
export function withAuthHandler(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (request, context) => {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    return handler(request, context, user!);
  };
}

/**
 * Wrap handler with tier requirement
 */
export function withTierHandler(
  handler: AuthenticatedRouteHandler,
  requiredTier: UserTier
): RouteHandler {
  return async (request, context) => {
    const { user, response } = await requireTier(request, requiredTier);
    if (response) return response;
    return handler(request, context, user!);
  };
}

/**
 * Wrap handler with feature requirement
 */
export function withFeatureHandler(
  handler: AuthenticatedRouteHandler,
  feature: keyof TierFeatures
): RouteHandler {
  return async (request, context) => {
    const { user, response } = await requireFeature(request, feature);
    if (response) return response;
    return handler(request, context, user!);
  };
}
