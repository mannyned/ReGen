/**
 * GET /api/auth/[provider]/callback
 *
 * Handles the OAuth callback from the provider after user authorization.
 *
 * Flow:
 * 1. Check for error response from provider (user denied access, etc.)
 * 2. Validate state parameter matches cookie (CSRF protection)
 * 3. Extract user ID from state
 * 4. Exchange authorization code for tokens
 * 5. Exchange for long-lived token if supported
 * 6. Verify token if supported
 * 7. Fetch user identity from provider
 * 8. Encrypt and store tokens in database
 * 9. Redirect to success page
 *
 * Error handling:
 * - All errors redirect to integrations page with error query params
 * - Tokens are never exposed in URLs or logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

// Import providers to register them with the engine
import '@/lib/providers';

import { OAuthEngine, isProviderRegistered } from '@/lib/oauth/engine';
import { isOAuthError, wrapError } from '@/lib/oauth/errors';

export const runtime = 'nodejs'; // Required for crypto support

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

  console.log('[OAuth Callback] Provider:', provider);
  console.log('[OAuth Callback] Full URL:', request.url);

  try {
    // Validate provider
    if (!isProviderRegistered(provider)) {
      console.log('[OAuth Callback] Provider not registered:', provider);
      return NextResponse.redirect(
        `${baseUrl}/auth/callback-success?provider=${provider}&error=UNKNOWN_PROVIDER`
      );
    }

    // Get search params from callback URL
    const searchParams = request.nextUrl.searchParams;
    console.log('[OAuth Callback] Search params - error:', searchParams.get('error'), 'error_description:', searchParams.get('error_description'), 'code exists:', !!searchParams.get('code'));

    // Handle the callback through the engine
    // This handles: state validation, code exchange, token storage
    const result = await OAuthEngine.handleCallback(provider, searchParams);
    console.log('[OAuth Callback] Result:', { success: result.success, redirectUrl: result.redirectUrl });

    // Redirect based on result
    return NextResponse.redirect(result.redirectUrl);
  } catch (error) {
    console.error('[OAuth Callback Error]', { provider, error });

    const oauthError = isOAuthError(error) ? error : wrapError(error, provider as import('@/lib/oauth/types').OAuthProvider);

    // Redirect to callback success page with error (will auto-close popup)
    return NextResponse.redirect(
      `${baseUrl}/auth/callback-success?provider=${provider}&error=${oauthError.code}`
    );
  }
}
