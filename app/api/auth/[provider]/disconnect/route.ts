/**
 * POST /api/auth/[provider]/disconnect
 *
 * Disconnects a provider by removing stored tokens.
 *
 * This endpoint:
 * 1. Validates the user is authenticated
 * 2. Deletes the OAuth connection from database
 * 3. Returns success/failure status
 *
 * Note: This does NOT revoke tokens on the provider's side.
 * Users should also revoke access in their provider account settings
 * for complete disconnection.
 *
 * Security:
 * - Requires authentication
 * - Only deletes tokens for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';

// Import providers to register them with the engine
import '@/lib/providers';

import { OAuthEngine, isProviderRegistered } from '@/lib/oauth/engine';
import { isOAuthError, wrapError, NotAuthenticatedError } from '@/lib/oauth/errors';
import { getUserId } from '@/lib/auth/getUser';

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

    // Disconnect provider
    await OAuthEngine.disconnectProvider(provider, profileId);

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${provider}`,
      provider,
    });
  } catch (error) {
    console.error('[OAuth Disconnect Error]', error);

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

// Also support DELETE method for RESTful APIs
export async function DELETE(
  request: NextRequest,
  params: { params: Promise<{ provider: string }> }
) {
  return POST(request, params);
}
