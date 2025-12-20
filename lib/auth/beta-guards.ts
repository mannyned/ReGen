/**
 * Beta-Aware Authentication Guards
 *
 * Server-side guards that use effective tier (including beta access).
 * These should be used in ALL route handlers for tier-based access control.
 *
 * IMPORTANT: Never trust client-provided tier. Always use these guards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import {
  getEffectiveTier,
  hasEffectiveTierAccess,
  getClientTierInfo,
  type ProfileWithBeta,
  type EffectiveTierResult,
  type ClientTierInfo,
} from '@/lib/tiers/effective-tier';
import type { UserTier } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  profile: ProfileWithBeta;
  tierInfo: EffectiveTierResult;
  clientTierInfo: ClientTierInfo;
}

export interface AuthResult {
  success: true;
  data: AuthenticatedRequest;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

export type AuthResponse = AuthResult | AuthError;

// ============================================
// CORE AUTHENTICATION
// ============================================

/**
 * Get authenticated user session from Supabase
 *
 * @returns User data or null
 */
export async function getUserSession(): Promise<{ id: string; email: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    return { id: user.id, email: user.email };
  } catch (error) {
    console.error('[Auth] Failed to get user session:', error);
    return null;
  }
}

/**
 * Get profile with beta fields
 *
 * @param userId - User ID
 * @returns Profile or null
 */
export async function getProfile(userId: string): Promise<ProfileWithBeta | null> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        tier: true,
        betaUser: true,
        betaExpiresAt: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      tier: profile.tier,
      betaUser: profile.betaUser,
      betaExpiresAt: profile.betaExpiresAt,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    };
  } catch (error) {
    console.error('[Auth] Failed to get profile:', error);
    return null;
  }
}

/**
 * Require authenticated user
 *
 * Returns user data with effective tier information.
 *
 * @param request - Optional NextRequest
 * @returns AuthResponse with user data or error
 */
export async function requireAuth(request?: NextRequest): Promise<AuthResponse> {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    const mockProfile: ProfileWithBeta = {
      id: 'dev-user-001',
      email: 'dev@regenr.app',
      tier: 'PRO',
      betaUser: false,
      betaExpiresAt: null,
      displayName: 'Development User',
      avatarUrl: null,
    };

    return {
      success: true,
      data: {
        userId: mockProfile.id,
        email: mockProfile.email,
        profile: mockProfile,
        tierInfo: getEffectiveTier(mockProfile),
        clientTierInfo: getClientTierInfo(mockProfile),
      },
    };
  }

  // Get session from Supabase
  const session = await getUserSession();
  if (!session) {
    return {
      success: false,
      error: 'Not authenticated',
      status: 401,
    };
  }

  // Get profile with beta fields
  const profile = await getProfile(session.id);
  if (!profile) {
    // Create profile if it doesn't exist (edge case for new users)
    try {
      const newProfile = await prisma.profile.create({
        data: {
          id: session.id,
          email: session.email.toLowerCase(),
          tier: 'FREE',
          betaUser: false,
          betaExpiresAt: null,
        },
      });

      const profileWithBeta: ProfileWithBeta = {
        id: newProfile.id,
        email: newProfile.email,
        tier: newProfile.tier,
        betaUser: newProfile.betaUser,
        betaExpiresAt: newProfile.betaExpiresAt,
        displayName: newProfile.displayName,
        avatarUrl: newProfile.avatarUrl,
      };

      return {
        success: true,
        data: {
          userId: profileWithBeta.id,
          email: profileWithBeta.email,
          profile: profileWithBeta,
          tierInfo: getEffectiveTier(profileWithBeta),
          clientTierInfo: getClientTierInfo(profileWithBeta),
        },
      };
    } catch (error) {
      console.error('[Auth] Failed to create profile:', error);
      return {
        success: false,
        error: 'Failed to initialize user profile',
        status: 500,
      };
    }
  }

  return {
    success: true,
    data: {
      userId: profile.id,
      email: profile.email,
      profile,
      tierInfo: getEffectiveTier(profile),
      clientTierInfo: getClientTierInfo(profile),
    },
  };
}

/**
 * Require specific tier level (using effective tier)
 *
 * @param requiredTier - Minimum tier required
 * @param request - Optional NextRequest
 * @returns AuthResponse with user data or error
 */
export async function requireEffectiveTier(
  requiredTier: UserTier,
  request?: NextRequest
): Promise<AuthResponse> {
  const authResult = await requireAuth(request);

  if (!authResult.success) {
    return authResult;
  }

  if (!hasEffectiveTierAccess(authResult.data.profile, requiredTier)) {
    return {
      success: false,
      error: `This feature requires ${requiredTier} tier or higher`,
      status: 403,
    };
  }

  return authResult;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Not authenticated'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Handle auth result and return response if error
 *
 * @param authResult - Result from requireAuth or requireEffectiveTier
 * @returns NextResponse if error, null if success
 */
export function handleAuthError(authResult: AuthResponse): NextResponse | null {
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }
  return null;
}
