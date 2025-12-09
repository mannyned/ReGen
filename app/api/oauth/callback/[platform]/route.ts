import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform } from '@/lib/types/social'
import { validatePlatform } from '@/lib/config/oauth'
import { oauthService, validateOAuthState } from '@/lib/services/oauth/OAuthService'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

// ============================================
// GET /api/oauth/callback/[platform]
// Handles OAuth callback and token exchange
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const { platform } = await params

    // Validate platform
    if (!validatePlatform(platform)) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=invalid_platform`
      )
    }

    const validPlatform = platform as SocialPlatform

    // Handle OAuth error from provider
    if (error) {
      console.error(`OAuth error for ${platform}:`, error, errorDescription)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=no_authorization_code`
      )
    }

    // Validate state
    if (!state) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=missing_state`
      )
    }

    const stateData = validateOAuthState(state)
    if (!stateData) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=invalid_or_expired_state`
      )
    }

    // Verify platform matches
    if (stateData.platform !== validPlatform) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=platform_mismatch`
      )
    }

    console.log(`[OAuth] Processing callback for ${platform}, user: ${stateData.userId}`)

    // Exchange authorization code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(
      validPlatform,
      code,
      stateData.codeVerifier
    )

    console.log(`[OAuth] Tokens received for ${platform}`)

    // Fetch user profile
    const profile = await oauthService.fetchUserProfile(validPlatform, tokens.accessToken)

    console.log(`[OAuth] Profile fetched for ${platform}:`, profile.username || profile.displayName)

    // Store connection
    await tokenManager.storeConnection(
      stateData.userId,
      validPlatform,
      tokens,
      profile,
      [] // Scopes would come from token response
    )

    console.log(`[OAuth] Connection stored for ${platform}`)

    // Redirect back to settings with success
    const username = profile.username || profile.displayName || 'connected'
    return NextResponse.redirect(
      `${baseUrl}/settings?connected=${platform}&username=${encodeURIComponent(username)}`
    )

  } catch (error: unknown) {
    console.error('OAuth callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(errorMessage)}`
    )
  }
}
