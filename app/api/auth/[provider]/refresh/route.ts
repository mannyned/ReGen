/**
 * POST /api/auth/[provider]/refresh
 *
 * Refreshes the access token for a provider.
 *
 * Use this endpoint when:
 * - Access token has expired
 * - Proactively refreshing before expiration
 * - Provider reports token as invalid
 *
 * Not all providers support token refresh:
 * - Meta: Yes (long-lived tokens can be refreshed)
 * - TikTok: Yes (refresh tokens last 365 days)
 * - Google: Yes (refresh tokens don't expire)
 * - X: Yes (refresh tokens last 6 months)
 * - LinkedIn: Depends on API access level
 *
 * Response:
 * {
 *   success: boolean,
 *   expiresAt?: string (ISO date),
 *   message?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

// Import providers to register them with the engine
import '@/lib/providers';

import { OAuthEngine, isProviderRegistered, getProvider } from '@/lib/oauth/engine';
import {
  isOAuthError,
  wrapError,
  NotAuthenticatedError,
  TokenRefreshError,
} from '@/lib/oauth/errors';
import { getUserId } from '@/lib/auth/getUser';
import type { OAuthProvider } from '@/lib/oauth/types';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // Validate provider
    if (!isProviderRegistered(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unknown provider',
          code: 'UNKNOWN_PROVIDER',
          supportedProviders: ['meta', 'tiktok', 'google', 'x', 'linkedin'],
        },
        { status: 400 }
      );
    }

    // Check if provider supports refresh
    const providerImpl = getProvider(provider);
    if (!providerImpl.config.capabilities.supportsRefresh) {
      return NextResponse.json(
        {
          success: false,
          error: `${providerImpl.config.displayName} does not support token refresh`,
          code: 'REFRESH_NOT_SUPPORTED',
        },
        { status: 400 }
      );
    }

    // Get authenticated user (profile ID = Supabase user ID)
    const profileId = await getUserId(request);

    if (!profileId) {
      throw new NotAuthenticatedError();
    }

    // Refresh tokens
    const newTokens = await OAuthEngine.refreshTokens(provider, profileId);

    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ${provider} tokens`,
      expiresAt: newTokens.expiresAt?.toISOString() || null,
      expiresIn: newTokens.expiresIn,
    });
  } catch (error) {
    console.error('[OAuth Refresh Error]', error);

    const oauthError = isOAuthError(error) ? error : wrapError(error);

    return NextResponse.json(
      {
        success: false,
        error: oauthError.userMessage,
        code: oauthError.code,
      },
      { status: oauthError.httpStatus }
    );
  }
}
