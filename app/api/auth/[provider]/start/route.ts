/**
 * GET /api/auth/[provider]/start
 *
 * Initiates the OAuth flow for the specified provider.
 *
 * Flow:
 * 1. Validate the provider exists and is configured
 * 2. Get the authenticated user
 * 3. Generate secure state parameter (includes user ID for callback)
 * 4. Store state in HttpOnly cookie
 * 5. Redirect user to provider's authorization URL
 *
 * Security:
 * - State parameter prevents CSRF attacks
 * - HttpOnly cookie prevents XSS access to state
 * - State includes user ID to associate tokens on callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

// Import providers to register them with the engine
import '@/lib/providers';

import { OAuthEngine, isProviderRegistered, getAllProviders } from '@/lib/oauth/engine';
import { UnknownProviderError, isOAuthError, wrapError } from '@/lib/oauth/errors';
import { getUserId } from '@/lib/auth/getUser';

export const runtime = 'nodejs'; // Required for crypto support

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    console.log('[OAuth Start] Starting OAuth for provider:', provider);

    // Step 1: Validate provider exists
    if (!isProviderRegistered(provider)) {
      console.log('[OAuth Start] Provider not registered:', provider);
      const registeredProviders = getAllProviders().map(p => p.config.id);
      return NextResponse.json(
        {
          error: 'Unknown provider',
          code: 'UNKNOWN_PROVIDER',
          message: `Provider "${provider}" is not supported.`,
          supportedProviders: registeredProviders,
        },
        { status: 400 }
      );
    }

    // Step 2: Get authenticated user (profile ID = Supabase user ID)
    const profileId = await getUserId(request);

    if (!profileId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
          message: 'You must be logged in to connect a social account.',
        },
        { status: 401 }
      );
    }

    // Get target platform from query params (for independent Instagram/Facebook connections)
    const targetPlatform = request.nextUrl.searchParams.get('targetPlatform') || undefined;
    console.log('[OAuth Start] User authenticated, profileId:', profileId, 'targetPlatform:', targetPlatform);

    // Step 3 & 4: Start OAuth flow (generates state, stores in cookie)
    console.log('[OAuth Start] Calling OAuthEngine.startOAuth...');
    const { authUrl } = await OAuthEngine.startOAuth(provider, profileId, targetPlatform);
    console.log('[OAuth Start] Got auth URL:', authUrl);

    // Step 5: Redirect to provider
    // Using NextResponse.redirect for proper status code
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[OAuth Start Error]', error);

    const oauthError = isOAuthError(error) ? error : wrapError(error);

    return NextResponse.json(
      {
        error: oauthError.userMessage,
        code: oauthError.code,
      },
      { status: oauthError.httpStatus }
    );
  }
}
