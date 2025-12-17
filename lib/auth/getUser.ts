/**
 * User Authentication Utilities (Supabase Auth)
 *
 * Resolves the authenticated user from Supabase session.
 *
 * This module provides a consistent way to get the current user across
 * all API routes using Supabase Auth as the source of truth.
 *
 * Authentication flow:
 * 1. Supabase handles session via cookies (managed by @supabase/ssr)
 * 2. We fetch the user from Supabase Auth
 * 3. We fetch additional profile data from our database
 *
 * Usage in route handlers:
 * ```ts
 * const user = await getUser();
 * if (!user) {
 *   return unauthorizedResponse();
 * }
 * ```
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '../db';
import { NotAuthenticatedError } from '../oauth/errors';
import type { UserTier } from '@prisma/client';

// ============================================
// TYPES
// ============================================

/**
 * Authenticated user information
 */
export interface AuthenticatedUser {
  /** User's unique identifier (UUID from Supabase) */
  id: string;

  /** User's email address */
  email: string;

  /** User's display name */
  displayName?: string | null;

  /** User's avatar URL */
  avatarUrl?: string | null;

  /** User's subscription tier */
  tier: UserTier | string;

  /** Whether this is a development/test user */
  isDevelopment?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Development user for testing when auth is disabled
 * This allows API testing without full authentication setup
 */
const DEVELOPMENT_USER: AuthenticatedUser = {
  id: 'dev-user-001',
  email: 'dev@regenr.app',
  displayName: 'Development User',
  avatarUrl: null,
  tier: 'PRO',
  isDevelopment: true,
};

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Get the currently authenticated user from Supabase session
 *
 * This is the primary authentication method using Supabase Auth.
 * Falls back to development mode if configured.
 *
 * @param request - Optional Next.js request object (for dev mode userId param)
 * @returns Authenticated user or null if not authenticated
 */
export async function getUser(request?: NextRequest): Promise<AuthenticatedUser | null> {
  // Development mode: Allow userId query param for testing
  if (process.env.NODE_ENV === 'development' && request) {
    const { searchParams } = new URL(request.url);
    const devUserId = searchParams.get('userId');

    if (devUserId) {
      // Try to find profile in database
      const profile = await getProfileById(devUserId);
      if (profile) {
        return { ...profile, isDevelopment: true };
      }

      // Return mock development user with provided ID
      return {
        ...DEVELOPMENT_USER,
        id: devUserId,
      };
    }
  }

  // Primary: Get user from Supabase Auth session
  const supabaseUser = await getUserFromSupabase();
  if (supabaseUser) {
    return supabaseUser;
  }

  // Development fallback: return dev user if no auth configured
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    return DEVELOPMENT_USER;
  }

  return null;
}

/**
 * Get authenticated user or throw NotAuthenticatedError
 *
 * Use this when authentication is required (most routes)
 *
 * @param request - Optional Next.js request object
 * @returns Authenticated user
 * @throws NotAuthenticatedError if not authenticated
 */
export async function requireUser(request?: NextRequest): Promise<AuthenticatedUser> {
  const user = await getUser(request);

  if (!user) {
    throw new NotAuthenticatedError();
  }

  return user;
}

/**
 * Get user ID from request (lightweight version)
 *
 * Use this when you only need the user ID, not full user data.
 * Uses Supabase session without additional database lookup.
 *
 * @param request - Optional Next.js request object (for dev mode)
 * @returns User ID or null
 */
export async function getUserId(request?: NextRequest): Promise<string | null> {
  // Development mode: Check query param
  if (process.env.NODE_ENV === 'development' && request) {
    const { searchParams } = new URL(request.url);
    const devUserId = searchParams.get('userId');
    if (devUserId) {
      return devUserId;
    }
  }

  // Get user ID from Supabase session
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Development fallback
      if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
        return DEVELOPMENT_USER.id;
      }
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('[Auth] Failed to get user ID:', error);
    return null;
  }
}

/**
 * Require user ID or throw error
 *
 * @param request - Optional Next.js request object
 * @returns User ID
 * @throws NotAuthenticatedError if not authenticated
 */
export async function requireUserId(request?: NextRequest): Promise<string> {
  const userId = await getUserId(request);

  if (!userId) {
    throw new NotAuthenticatedError();
  }

  return userId;
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Get user from Supabase Auth session
 */
async function getUserFromSupabase(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient();

    // Get authenticated user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Fetch profile from database for additional data
    let profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    // Create profile if it doesn't exist (edge case)
    if (!profile) {
      try {
        profile = await prisma.profile.create({
          data: {
            id: user.id,
            email: user.email!.toLowerCase(),
            displayName: user.user_metadata?.display_name || user.email!.split('@')[0],
            avatarUrl: user.user_metadata?.avatar_url || null,
            tier: 'FREE',
          },
        });
      } catch {
        // Profile creation failed, use Supabase data only
        return {
          id: user.id,
          email: user.email!,
          displayName: user.user_metadata?.display_name || user.email!.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url || null,
          tier: 'FREE',
        };
      }
    }

    return {
      id: user.id,
      email: user.email!,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      tier: profile.tier,
    };
  } catch (error) {
    console.error('[Auth] Supabase auth check failed:', error);
    return null;
  }
}

/**
 * Get profile by ID from database
 */
async function getProfileById(profileId: string): Promise<AuthenticatedUser | null> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      tier: profile.tier,
    };
  } catch (error) {
    console.error('[Auth] Profile lookup failed:', error);
    return null;
  }
}

// ============================================
// SESSION HELPERS (Supabase-managed)
// ============================================

/**
 * Get current Supabase session
 *
 * Note: Sessions are managed by Supabase Auth.
 * Use this for session info, not for creating sessions manually.
 */
export async function getSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[Auth] Failed to get session:', error);
    return null;
  }

  return session;
}

/**
 * Refresh the current session
 *
 * Supabase handles session refresh automatically via middleware,
 * but this can be called manually if needed.
 */
export async function refreshSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error('[Auth] Failed to refresh session:', error);
    return null;
  }

  return data.session;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[Auth] Failed to sign out:', error);
    throw error;
  }
}

// ============================================
// PROFILE HELPERS
// ============================================

/**
 * Update user profile
 *
 * @param userId - User ID to update
 * @param data - Profile data to update
 */
export async function updateProfile(
  userId: string,
  data: {
    displayName?: string;
    avatarUrl?: string;
  }
) {
  return prisma.profile.update({
    where: { id: userId },
    data: {
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
    },
  });
}

/**
 * Upgrade user tier
 *
 * @param userId - User ID to upgrade
 * @param tier - New tier
 */
export async function upgradeTier(userId: string, tier: UserTier) {
  return prisma.profile.update({
    where: { id: userId },
    data: { tier },
  });
}

// ============================================
// EXPORTS
// ============================================

export {
  DEVELOPMENT_USER,
};
