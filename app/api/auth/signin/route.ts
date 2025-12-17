/**
 * POST /api/auth/signin
 *
 * Signs in a user with email and password.
 *
 * Flow:
 * 1. Validate credentials
 * 2. Authenticate with Supabase Auth
 * 3. Set session cookies
 * 4. Return user data
 *
 * Request body:
 * {
 *   email: string,
 *   password: string
 * }
 *
 * Response:
 * - 200: Login successful
 * - 400: Invalid credentials
 * - 401: Authentication failed
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface SignInRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignInRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[SignIn Error]', error);

      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Ensure profile exists (create if missing)
    let profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      // This handles edge cases where user exists in Auth but not in DB
      profile = await prisma.profile.create({
        data: {
          id: data.user.id,
          email: data.user.email!.toLowerCase(),
          displayName: data.user.user_metadata?.display_name || data.user.email!.split('@')[0],
          avatarUrl: data.user.user_metadata?.avatar_url,
          tier: 'FREE',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Signed in successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        tier: profile.tier,
      },
      session: {
        expiresAt: data.session.expires_at,
      },
    });
  } catch (error) {
    console.error('[SignIn Error]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
