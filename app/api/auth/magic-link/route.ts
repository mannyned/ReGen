/**
 * POST /api/auth/magic-link
 *
 * Sends a magic link (passwordless) sign-in email.
 *
 * Flow:
 * 1. Validate email
 * 2. Send magic link via Supabase Auth
 * 3. User clicks link in email
 * 4. Redirected to /auth/callback with tokens
 *
 * Request body:
 * {
 *   email: string
 * }
 *
 * Response:
 * - 200: Magic link sent
 * - 400: Invalid email
 * - 429: Rate limited
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface MagicLinkRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MagicLinkRequest = await request.json();
    const { email } = body;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect to callback after clicking link
        emailRedirectTo: `${baseUrl}/auth/callback`,
        // Create user if doesn't exist
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[Magic Link Error]', error);

      // Handle rate limiting
      if (error.message.includes('rate limit') || error.status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    // Even if email doesn't exist, we don't want to reveal that
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.',
    });
  } catch (error) {
    console.error('[Magic Link Error]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
