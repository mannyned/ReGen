import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform } from '@/lib/types/social'
import { OAUTH_CONFIGS, isOAuthConfigured, validatePlatform } from '@/lib/config/oauth'
import { oauthService } from '@/lib/services/oauth/OAuthService'
import { validatePlatformParam, validationErrorResponse } from '@/lib/middleware/validation'

// ============================================
// GET /api/oauth/connect/[platform]
// Initiates OAuth flow for a platform
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'
    const { platform } = await params

    // Validate platform
    const validation = validatePlatformParam(platform)
    if (!validation.valid) {
      return validationErrorResponse(validation.errors)
    }

    const validPlatform = platform as SocialPlatform

    // Check if OAuth credentials are configured
    if (!isOAuthConfigured(validPlatform)) {
      const envVars = [
        `${platform.toUpperCase()}_CLIENT_ID`,
        `${platform.toUpperCase()}_CLIENT_SECRET`,
      ]

      return NextResponse.json({
        success: false,
        setupRequired: true,
        error: `${platform.toUpperCase()} OAuth is not configured.`,
        requiredEnvVars: envVars,
        documentation: '/docs/OAUTH_SETUP_GUIDE.md',
      })
    }

    // Generate authorization URL
    const { authUrl, codeVerifier } = oauthService.generateAuthorizationUrl(
      validPlatform,
      userId
    )

    // Store code verifier in session if PKCE is used
    // In production, this would be stored in a secure session or cache

    return NextResponse.json({
      success: true,
      authUrl,
      platform: validPlatform,
      message: 'Redirect to this URL to authorize',
    })

  } catch (error: unknown) {
    console.error('OAuth connect error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth connection',
      },
      { status: 500 }
    )
  }
}
