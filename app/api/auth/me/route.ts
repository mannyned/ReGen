/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's profile information.
 * Used for checking authentication state on the client side.
 *
 * Includes beta access information for UI display.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { getClientTierInfo, type ProfileWithBeta } from '@/lib/tiers/effective-tier';

// Ensure fresh data on every request (no caching)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Debug logging
    console.log('[/api/auth/me] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
    });

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated', debug: authError?.message },
        { status: 401 }
      );
    }

    // Get profile from database (including beta fields)
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        tier: true,
        betaUser: true,
        betaExpiresAt: true,
        createdAt: true,
        stripeCustomerId: true,
        stripeSubscriptionStatus: true,
      },
    });

    if (!profile) {
      // Profile doesn't exist yet - return basic user info
      return NextResponse.json({
        id: user.id,
        email: user.email,
        tier: 'FREE',
        emailVerified: !!user.email_confirmed_at,
        tierInfo: {
          effectiveTier: 'FREE',
          actualTier: 'FREE',
          isBetaPro: false,
          betaDaysRemaining: null,
          betaExpiringSoon: false,
          platformLimit: 2,
          hasTeamAccess: false,
          maxTeamSeats: 0,
        },
      });
    }

    // Build profile with beta fields for tier calculation
    const profileWithBeta: ProfileWithBeta = {
      id: profile.id,
      email: profile.email,
      tier: profile.tier,
      betaUser: profile.betaUser,
      betaExpiresAt: profile.betaExpiresAt,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    };

    // Get effective tier info
    const tierInfo = getClientTierInfo(profileWithBeta);

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      tier: profile.tier,
      emailVerified: !!user.email_confirmed_at,
      createdAt: profile.createdAt,
      hasSubscription: !!profile.stripeCustomerId,
      subscriptionStatus: profile.stripeSubscriptionStatus,
      // Beta access info
      betaUser: profile.betaUser,
      betaExpiresAt: profile.betaExpiresAt,
      // Effective tier info (includes beta)
      tierInfo,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
