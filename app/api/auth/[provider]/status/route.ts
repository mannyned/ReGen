/**
 * GET /api/auth/[provider]/status
 *
 * Returns the connection status for a provider.
 *
 * Response:
 * {
 *   connected: boolean,
 *   provider: string,
 *   providerAccountId?: string,
 *   expiresAt?: string (ISO date),
 *   scopes?: string[],
 *   displayName?: string
 * }
 *
 * Use this endpoint to:
 * - Check if user has connected a provider
 * - Display connection info in UI
 * - Determine if token refresh is needed
 */

import { NextRequest, NextResponse } from 'next/server';

// Import providers to register them with the engine
import '@/lib/providers';

import { OAuthEngine, isProviderRegistered } from '@/lib/oauth/engine';
import { isOAuthError, wrapError, NotAuthenticatedError } from '@/lib/oauth/errors';
import { getUserId } from '@/lib/auth/getUser';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // Validate provider
    if (!isProviderRegistered(provider)) {
      return NextResponse.json(
        {
          error: 'Unknown provider',
          code: 'UNKNOWN_PROVIDER',
          supportedProviders: ['meta', 'tiktok', 'google', 'x', 'linkedin'],
        },
        { status: 400 }
      );
    }

    // Get authenticated user (profile ID = Supabase user ID)
    const profileId = await getUserId(request);

    if (!profileId) {
      throw new NotAuthenticatedError();
    }

    // Get connection status from engine
    const status = await OAuthEngine.getConnectionStatus(provider, profileId);

    return NextResponse.json({
      ...status,
      // Convert Date to ISO string for JSON
      expiresAt: status.expiresAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('[OAuth Status Error]', error);

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
