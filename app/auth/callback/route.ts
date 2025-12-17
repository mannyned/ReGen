/**
 * GET /auth/callback
 *
 * Handles OAuth and magic link callbacks from Supabase Auth.
 *
 * This route is called when:
 * - User clicks email confirmation link
 * - User clicks magic link
 * - User completes OAuth flow (Google, Apple)
 *
 * Flow:
 * 1. Extract code from URL parameters
 * 2. Exchange code for session using Supabase
 * 3. Create or update profile in database
 * 4. Redirect to dashboard or error page
 *
 * Query parameters:
 * - code: Authorization code from Supabase
 * - next: Optional redirect URL after auth
 * - error: Error code if auth failed
 * - error_description: Error message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

  // Check for error from Supabase
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('[Auth Callback Error]', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Get the authorization code
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('No authorization code provided')}`
    );
  }

  try {
    const supabase = await createClient();

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth Callback Exchange Error]', exchangeError);
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.user) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Failed to authenticate user')}`
      );
    }

    const user = data.user;

    // Create or update profile in database
    try {
      const existingProfile = await prisma.profile.findUnique({
        where: { id: user.id },
      });

      if (!existingProfile) {
        // Extract user info from various sources
        const email = user.email?.toLowerCase() || '';
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          email.split('@')[0];
        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        // Create new profile
        await prisma.profile.create({
          data: {
            id: user.id,
            email,
            displayName,
            avatarUrl,
            tier: 'FREE',
          },
        });

        console.log('[Auth Callback] Created new profile for user:', user.id);
      } else {
        // Optionally update profile with latest OAuth data
        const updates: Record<string, string | undefined> = {};

        // Update avatar if we got a new one from OAuth
        const newAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
        if (newAvatarUrl && newAvatarUrl !== existingProfile.avatarUrl) {
          updates.avatarUrl = newAvatarUrl;
        }

        // Update display name if not set
        if (!existingProfile.displayName) {
          const displayName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.display_name;
          if (displayName) {
            updates.displayName = displayName;
          }
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await prisma.profile.update({
            where: { id: user.id },
            data: updates,
          });
        }
      }
    } catch (profileError) {
      // Log but don't fail - user is authenticated
      console.error('[Auth Callback Profile Error]', profileError);
    }

    // Redirect to intended destination
    return NextResponse.redirect(`${baseUrl}${next}`);
  } catch (error) {
    console.error('[Auth Callback Error]', error);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Authentication failed')}`
    );
  }
}
