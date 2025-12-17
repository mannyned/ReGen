/**
 * POST /api/auth/signup
 *
 * Creates a new user account with email and password.
 *
 * Flow:
 * 1. Validate email and password
 * 2. Create user in Supabase Auth
 * 3. Create profile record in database
 * 4. Send confirmation email (handled by Supabase)
 * 5. Return success response
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   displayName?: string
 * }
 *
 * Response:
 * - 201: User created successfully (confirmation email sent)
 * - 400: Invalid input
 * - 409: Email already exists
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface SignUpRequest {
  email: string;
  password: string;
  displayName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignUpRequest = await request.json();
    const { email, password, displayName } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Redirect to callback after email confirmation
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (authError) {
      console.error('[Signup Error]', authError);

      // Handle specific error cases
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create profile record in database
    // This creates the application-level user data
    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          email: email.toLowerCase(),
          displayName: displayName || email.split('@')[0],
          tier: 'FREE',
        },
      });
    } catch (profileError) {
      console.error('[Profile Creation Error]', profileError);
      // Profile creation failed - the user exists in Auth but not in our DB
      // This is handled by the auth callback or can be retried
    }

    // Check if email confirmation is required
    const requiresConfirmation = !authData.session;

    return NextResponse.json(
      {
        success: true,
        message: requiresConfirmation
          ? 'Please check your email to confirm your account'
          : 'Account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        requiresConfirmation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Signup Error]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
