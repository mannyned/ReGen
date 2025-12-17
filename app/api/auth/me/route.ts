/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's profile information.
 * Used for checking authentication state on the client side.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

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

    // Get profile from database
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        tier: true,
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
      });
    }

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
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
