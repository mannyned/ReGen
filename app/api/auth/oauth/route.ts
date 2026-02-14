/**
 * POST /api/auth/oauth
 *
 * Initiates OAuth sign-in with external providers (Google, Apple).
 *
 * This endpoint generates the OAuth authorization URL that the client
 * should redirect to. The actual authentication happens at the provider.
 *
 * Request body:
 * {
 *   provider: 'google' | 'apple',
 *   redirectTo?: string  // Optional URL to redirect after auth
 * }
 *
 * Response:
 * - 200: { url: string } - Authorization URL to redirect to
 * - 400: Invalid provider
 * - 500: Server error
 *
 * Supported providers:
 * - google: Google OAuth (includes profile, email)
 * - apple: Apple Sign In (includes name, email)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type OAuthProvider = 'google' | 'apple';

const SUPPORTED_PROVIDERS: OAuthProvider[] = ['google', 'apple'];

interface OAuthRequest {
  provider: OAuthProvider;
  redirectTo?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OAuthRequest = await request.json();
    const { provider, redirectTo } = body;

    // Validate provider
    if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          error: 'Invalid provider',
          supportedProviders: SUPPORTED_PROVIDERS,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

    // Build callback URL
    const callbackUrl = new URL('/auth/callback', baseUrl);
    if (redirectTo) {
      callbackUrl.searchParams.set('next', redirectTo);
    }

    // Generate OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        // Request specific scopes for each provider
        scopes: provider === 'google' ? 'openid email profile' : undefined,
        queryParams: provider === 'apple' ? {
          // Apple requires these for native apps
          response_mode: 'fragment',
        } : undefined,
      },
    });

    if (error) {
      console.error('[OAuth Error]', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.url) {
      return NextResponse.json(
        { error: 'Failed to generate OAuth URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.url,
      provider,
    });
  } catch (error) {
    console.error('[OAuth Error]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/oauth?provider=google
 *
 * Alternative GET endpoint that directly redirects to OAuth provider.
 * Useful for simple link-based sign-in buttons.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') as OAuthProvider;
  const redirectTo = searchParams.get('redirectTo') || '/workspaces';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

  // Validate provider
  if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Invalid OAuth provider')}`
    );
  }

  try {
    const supabase = await createClient();

    // Build callback URL
    const callbackUrl = new URL('/auth/callback', baseUrl);
    callbackUrl.searchParams.set('next', redirectTo);

    // Generate OAuth URL and redirect
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: provider === 'google' ? 'openid email profile' : undefined,
      },
    });

    if (error || !data.url) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(error?.message || 'OAuth failed')}`
      );
    }

    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error('[OAuth Error]', error);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Authentication failed')}`
    );
  }
}
