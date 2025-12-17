/**
 * Secure User Identity Derivation
 *
 * SECURITY PRINCIPLE: User identity MUST always be derived from the
 * authenticated Supabase session, NEVER from request parameters.
 *
 * This module provides the ONLY approved way to get user identity
 * in API routes and server components.
 */

import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import type { UserTier } from '@prisma/client';
import type { User } from '@supabase/supabase-js';
import { checkUntrustedInput, logSecurityWarnings } from './server-only';

// ============================================
// TYPES
// ============================================

/**
 * Verified user identity from Supabase session
 *
 * All fields are derived from the authenticated session,
 * NOT from any user-provided input.
 */
export interface VerifiedIdentity {
  /** Supabase user ID (from auth.users) */
  readonly id: string;
  /** Profile ID (same as user ID in our schema) */
  readonly profileId: string;
  /** Verified email from Supabase */
  readonly email: string;
  /** User tier from profiles table */
  readonly tier: UserTier;
  /** Whether email is verified */
  readonly emailVerified: boolean;
  /** Raw Supabase user object */
  readonly _supabaseUser: User;
}

export interface IdentityResult {
  /** Verified identity (null if not authenticated) */
  identity: VerifiedIdentity | null;
  /** Error response to return (null if authenticated) */
  response: NextResponse | null;
}

// ============================================
// IDENTITY DERIVATION
// ============================================

/**
 * Get verified user identity from Supabase session
 *
 * SECURITY: This is the ONLY approved method for obtaining user identity
 * in API routes. The identity is derived entirely from the Supabase
 * session cookie, with NO user-provided input.
 *
 * @returns Verified identity or null if not authenticated
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const identity = await getVerifiedIdentity();
 *
 *   if (!identity) {
 *     return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
 *   }
 *
 *   // identity.profileId is SAFE to use - derived from session
 *   const data = await prisma.profile.findUnique({
 *     where: { id: identity.profileId }
 *   });
 * }
 * ```
 */
export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  try {
    const supabase = await createClient();

    // getUser() validates the session with Supabase
    // This is more secure than getSession() which only reads cookies
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get tier from profile (or default to FREE)
    let tier: UserTier = 'FREE';
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { tier: true },
      });
      tier = profile?.tier || 'FREE';
    } catch {
      // Profile lookup failed, use default tier
    }

    return {
      id: user.id,
      profileId: user.id, // In our schema, profile.id = auth.users.id
      email: user.email || '',
      tier,
      emailVerified: user.email_confirmed_at !== null,
      _supabaseUser: user,
    };
  } catch (error) {
    console.error('[Identity Error]', error);
    return null;
  }
}

/**
 * Require verified identity - returns error response if not authenticated
 *
 * SECURITY: Use this in API routes to ensure user identity is verified.
 *
 * @param request - NextRequest (used only for security auditing)
 * @returns Identity result with either verified identity or error response
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const { identity, response } = await requireVerifiedIdentity(request);
 *   if (response) return response;
 *
 *   // identity is verified from session
 *   await prisma.resource.create({
 *     data: { profileId: identity.profileId, ... }
 *   });
 * }
 * ```
 */
export async function requireVerifiedIdentity(
  request: NextRequest
): Promise<IdentityResult> {
  // Security audit: check for untrusted input in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      const warnings = checkUntrustedInput(body);
      logSecurityWarnings(warnings);
    } catch {
      // No JSON body or parse error - that's fine
    }

    // Check query params
    const { searchParams } = new URL(request.url);
    if (searchParams.has('userId') || searchParams.has('profileId')) {
      console.warn(
        '\n========== SECURITY WARNING ==========\n' +
        '  Request contains userId/profileId in query params.\n' +
        '  These values MUST NOT be trusted.\n' +
        '  Use identity from session instead.\n' +
        '========================================\n'
      );
    }
  }

  const identity = await getVerifiedIdentity();

  if (!identity) {
    return {
      identity: null,
      response: NextResponse.json(
        {
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      ),
    };
  }

  return { identity, response: null };
}

/**
 * Require verified identity with tier check
 *
 * @param request - NextRequest
 * @param requiredTier - Minimum tier required
 * @returns Identity result
 */
export async function requireVerifiedIdentityWithTier(
  request: NextRequest,
  requiredTier: UserTier
): Promise<IdentityResult> {
  const { identity, response } = await requireVerifiedIdentity(request);

  if (response) {
    return { identity: null, response };
  }

  const TIER_LEVELS: Record<UserTier, number> = {
    FREE: 0,
    CREATOR: 1,
    PRO: 2,
  };

  if (TIER_LEVELS[identity!.tier] < TIER_LEVELS[requiredTier]) {
    return {
      identity: null,
      response: NextResponse.json(
        {
          error: `This feature requires ${requiredTier} tier or higher`,
          code: 'TIER_REQUIRED',
          requiredTier,
          currentTier: identity!.tier,
        },
        { status: 403 }
      ),
    };
  }

  return { identity, response: null };
}

// ============================================
// RESOURCE OWNERSHIP VERIFICATION
// ============================================

/**
 * Verify that the authenticated user owns a resource
 *
 * SECURITY: Use this when accessing resources to ensure the user
 * owns the resource they're trying to access.
 *
 * @param identity - Verified user identity
 * @param resourceProfileId - Profile ID of the resource owner
 * @returns true if user owns the resource
 */
export function verifyOwnership(
  identity: VerifiedIdentity,
  resourceProfileId: string
): boolean {
  return identity.profileId === resourceProfileId;
}

/**
 * Require ownership of a resource
 *
 * @param identity - Verified user identity
 * @param resourceProfileId - Profile ID of the resource owner
 * @returns Error response if user doesn't own the resource, null otherwise
 */
export function requireOwnership(
  identity: VerifiedIdentity,
  resourceProfileId: string
): NextResponse | null {
  if (!verifyOwnership(identity, resourceProfileId)) {
    return NextResponse.json(
      {
        error: 'You do not have permission to access this resource',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    );
  }
  return null;
}
