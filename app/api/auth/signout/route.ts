/**
 * POST /api/auth/signout
 *
 * Signs out the current user.
 *
 * Flow:
 * 1. Get current session
 * 2. Sign out from Supabase Auth
 * 3. Clear session cookies
 * 4. Return success response
 *
 * Response:
 * - 200: Signed out successfully
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[SignOut Error]', error);
      // Even if there's an error, we still want to clear client-side state
    }

    return NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    });
  } catch (error) {
    console.error('[SignOut Error]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Also support GET for simple redirects
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    // Redirect to home page after sign out
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
    return NextResponse.redirect(`${baseUrl}/`);
  } catch (error) {
    console.error('[SignOut Error]', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
    return NextResponse.redirect(`${baseUrl}/?error=signout_failed`);
  }
}
