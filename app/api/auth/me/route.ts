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
import { getOrCreateDefaultWorkspace } from '@/lib/workspace/context';

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

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get profile from database (including beta fields and feedback tracking)
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
        // Beta feedback tracking
        hasCompletedFirstPost: true,
        hasViewedAnalyticsFirst: true,
        hasCompletedFirstAutoShare: true,
        feedbackDismissedTypes: true,
        lastFeedbackPromptAt: true,
        // Check team memberships (user can be in multiple workspaces)
        teamMemberships: {
          select: {
            id: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
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
          take: 1, // Get first membership for backwards compatibility
        },
      },
    });

    // Silently create a default workspace for ALL users (enables seamless Pro upgrade)
    if (profile) {
      try {
        await getOrCreateDefaultWorkspace({
          id: user.id,
          profileId: profile.id,
          email: profile.email,
          tier: profile.tier,
          emailVerified: !!user.email_confirmed_at,
        });
      } catch (wsError) {
        // Never fail the auth/me response — workspace creation is best-effort
        console.error('[Auth/Me] Silent workspace creation error:', wsError);
      }
    }

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
          isTeamMember: false,
          betaDaysRemaining: null,
          betaExpiringSoon: false,
          platformLimit: 2,
          hasTeamAccess: false,
          maxTeamSeats: 0,
        },
      });
    }

    // Check if user is a team member (not owner) - they inherit PRO access and beta status
    const teamMembership = profile.teamMemberships?.[0];
    const isTeamMember = !!teamMembership;
    let teamMemberPro = false;
    let teamMemberBeta = false;

    if (isTeamMember && teamMembership?.team?.owner) {
      const owner = teamMembership.team.owner;
      // Check if team owner has active PRO access (paid or beta)
      const ownerIsPro = owner.tier === 'PRO' ||
        !!(owner.betaUser && owner.betaExpiresAt && new Date(owner.betaExpiresAt) > new Date());
      teamMemberPro = ownerIsPro;
      // Team members inherit beta status from owner
      teamMemberBeta = owner.betaUser || false;
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
    let tierInfo = getClientTierInfo(profileWithBeta);

    // Override with team member PRO access if applicable
    if (teamMemberPro && tierInfo.effectiveTier !== 'PRO') {
      tierInfo = {
        ...tierInfo,
        effectiveTier: 'PRO',
        isTeamMember: true,
        platformLimit: -1, // Unlimited
        hasTeamAccess: true,
        maxTeamSeats: 0, // Team members can't invite others
      };
    }

    // Determine team role - owner if no team membership, otherwise the actual role
    const teamRole = teamMembership?.role || 'owner';

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
      // Beta access info (team members inherit from owner)
      betaUser: profile.betaUser || teamMemberBeta,
      betaExpiresAt: profile.betaExpiresAt,
      // Beta feedback tracking
      hasCompletedFirstPost: profile.hasCompletedFirstPost,
      hasViewedAnalyticsFirst: profile.hasViewedAnalyticsFirst,
      hasCompletedFirstAutoShare: profile.hasCompletedFirstAutoShare,
      feedbackDismissedTypes: profile.feedbackDismissedTypes,
      lastFeedbackPromptAt: profile.lastFeedbackPromptAt,
      // Effective tier info (includes beta)
      tierInfo,
      // Team role for billing visibility (owner, admin, member)
      teamRole,
      // Team info if member of a team
      team: teamMembership ? {
        id: teamMembership.team.id,
        name: teamMembership.team.name,
        role: teamMembership.role,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
