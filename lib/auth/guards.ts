/**
 * Authentication Guards for API Routes
 *
 * Utilities for protecting API routes and handling authentication errors.
 * Use these in Route Handlers to enforce authentication requirements.
 *
 * @example
 * ```ts
 * // Simple protection
 * export async function GET(request: NextRequest) {
 *   const { user, response } = await withAuth(request);
 *   if (response) return response;
 *
 *   // user is guaranteed to be authenticated here
 *   return NextResponse.json({ userId: user.id });
 * }
 *
 * // With tier requirement
 * export async function POST(request: NextRequest) {
 *   const { user, response } = await withAuth(request, { requiredTier: 'PRO' });
 *   if (response) return response;
 *
 *   // user is authenticated and has PRO tier
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import type { UserTier } from '@prisma/client';
import type { User } from '@supabase/supabase-js';
import { getEffectiveTier, type ProfileWithBeta } from '@/lib/tiers/effective-tier';

// ============================================
// TYPES
// ============================================

export interface AuthenticatedRequest {
  /** Supabase user object */
  user: User;
  /** User's profile ID (same as user.id) */
  profileId: string;
  /** User's tier from profile */
  tier: UserTier;
  /** User's email */
  email: string;
}

export interface AuthGuardOptions {
  /** Required tier for access (user must have this tier or higher) */
  requiredTier?: UserTier;
  /** Custom error message for unauthorized */
  unauthorizedMessage?: string;
  /** Custom error message for forbidden */
  forbiddenMessage?: string;
}

export interface AuthGuardResult {
  /** Authenticated user info (null if not authenticated) */
  user: AuthenticatedRequest | null;
  /** Error response to return (null if authenticated) */
  response: NextResponse | null;
}

// ============================================
// TIER HIERARCHY
// ============================================

const TIER_LEVELS: Record<UserTier, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
};

function hasTierAccess(userTier: UserTier, requiredTier: UserTier): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

// ============================================
// ERROR RESPONSES
// ============================================

export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'FORBIDDEN',
    },
    { status: 403 }
  );
}

export function tierRequiredResponse(requiredTier: UserTier): NextResponse {
  return NextResponse.json(
    {
      error: `This feature requires ${requiredTier} tier or higher`,
      code: 'TIER_REQUIRED',
      requiredTier,
    },
    { status: 403 }
  );
}

// ============================================
// MAIN AUTH GUARD
// ============================================

/**
 * Protect an API route with authentication
 *
 * Returns the authenticated user or an error response.
 * Check if response is non-null to determine if auth failed.
 *
 * @param request - Next.js request object
 * @param options - Guard options
 * @returns Object with user (if authenticated) or response (if error)
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { user, response } = await withAuth(request);
 *   if (response) return response;
 *
 *   // TypeScript knows user is non-null here
 *   return NextResponse.json({ email: user.email });
 * }
 * ```
 */
export async function withAuth(
  request: NextRequest,
  options: AuthGuardOptions = {}
): Promise<AuthGuardResult> {
  const {
    requiredTier,
    unauthorizedMessage,
  } = options;

  // SECURITY: User identity is ALWAYS derived from Supabase session
  // Never trust userId from query params, request body, or headers

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Not authenticated
    if (error || !user) {
      return {
        user: null,
        response: unauthorizedResponse(unauthorizedMessage),
      };
    }

    // Get profile for tier info (including beta and team membership)
    let effectiveTier: UserTier = 'FREE';
    let actualTier: UserTier = 'FREE';
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          tier: true,
          betaUser: true,
          betaExpiresAt: true,
          // Check team membership for inherited PRO access
          teamMembership: {
            select: {
              team: {
                select: {
                  owner: {
                    select: {
                      tier: true,
                      betaUser: true,
                      betaExpiresAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (profile) {
        actualTier = profile.tier;

        // Build profile for effective tier calculation
        const profileWithBeta: ProfileWithBeta = {
          id: profile.id,
          email: profile.email,
          tier: profile.tier,
          betaUser: profile.betaUser,
          betaExpiresAt: profile.betaExpiresAt,
        };

        // Get effective tier (considers beta access)
        const tierResult = getEffectiveTier(profileWithBeta);
        effectiveTier = tierResult.effectiveTier;

        // Check if team member inherits PRO from owner
        if (profile.teamMembership?.team?.owner) {
          const owner = profile.teamMembership.team.owner;
          const ownerIsPro =
            owner.tier === 'PRO' ||
            !!(owner.betaUser && owner.betaExpiresAt && new Date(owner.betaExpiresAt) > new Date());
          if (ownerIsPro && effectiveTier !== 'PRO') {
            effectiveTier = 'PRO';
          }
        }
      }
    } catch {
      // Profile not found, use default tier
    }

    // Check tier requirement using EFFECTIVE tier (includes beta & team)
    if (requiredTier && !hasTierAccess(effectiveTier, requiredTier)) {
      return {
        user: null,
        response: tierRequiredResponse(requiredTier),
      };
    }

    // Success - return authenticated user with effective tier
    return {
      user: {
        user,
        profileId: user.id,
        tier: effectiveTier, // Use effective tier (includes beta & team membership)
        email: user.email || '',
      },
      response: null,
    };
  } catch (error) {
    console.error('[Auth Guard Error]', error);
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_ERROR' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require authentication - throws if not authenticated
 *
 * Alternative to withAuth that throws instead of returning response.
 * Useful when you want to handle the error in a catch block.
 *
 * @param request - Next.js request object
 * @param options - Guard options
 * @returns Authenticated user info
 * @throws Error if not authenticated
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   try {
 *     const user = await requireAuth(request);
 *     return NextResponse.json({ email: user.email });
 *   } catch (error) {
 *     return NextResponse.json({ error: error.message }, { status: 401 });
 *   }
 * }
 * ```
 */
export async function requireAuth(
  request: NextRequest,
  options: AuthGuardOptions = {}
): Promise<AuthenticatedRequest> {
  const { user, response } = await withAuth(request, options);

  if (response || !user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Get current user without requiring authentication
 *
 * Returns the user if authenticated, null otherwise.
 * Useful for routes that work differently for authenticated users.
 *
 * @param request - Next.js request object
 * @returns Authenticated user or null
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const user = await getAuthUser(request);
 *
 *   if (user) {
 *     return NextResponse.json({ personalized: true, userId: user.profileId });
 *   }
 *
 *   return NextResponse.json({ personalized: false });
 * }
 * ```
 */
export async function getAuthUser(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  const { user } = await withAuth(request);
  return user;
}

// ============================================
// HIGHER-ORDER FUNCTION FOR ROUTE HANDLERS
// ============================================

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: AuthenticatedRequest
) => Promise<NextResponse>;

/**
 * Wrap a route handler with authentication
 *
 * Creates a protected route handler that automatically checks auth
 * and passes the user to your handler.
 *
 * @param handler - Route handler that receives authenticated user
 * @param options - Auth guard options
 * @returns Wrapped route handler
 *
 * @example
 * ```ts
 * export const GET = withAuthHandler(async (request, context, user) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ userId: user.profileId });
 * });
 *
 * // With tier requirement
 * export const POST = withAuthHandler(
 *   async (request, context, user) => {
 *     return NextResponse.json({ premium: true });
 *   },
 *   { requiredTier: 'PRO' }
 * );
 * ```
 */
export function withAuthHandler(
  handler: AuthenticatedRouteHandler,
  options: AuthGuardOptions = {}
): RouteHandler {
  return async (request, context) => {
    const { user, response } = await withAuth(request, options);

    if (response) {
      return response;
    }

    // TypeScript knows user is non-null here because response is null
    return handler(request, context, user!);
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  TIER_LEVELS,
  hasTierAccess,
};
