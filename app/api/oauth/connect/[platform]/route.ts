import { NextRequest, NextResponse } from 'next/server'

type OAuthConfig = {
  clientId?: string
  clientSecret?: string
  authUrl: string
  scope: string
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    // Instagram now uses Facebook Graph API (Basic Display is deprecated)
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scope: 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list'
  },
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_ID,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    authUrl: 'https://www.tiktok.com/auth/authorize/',
    scope: 'user.info.basic,video.publish'
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube'
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scope: 'tweet.read tweet.write users.read offline.access'
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'r_liteprofile w_member_social'
  },
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scope: 'pages_manage_posts,pages_read_engagement'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'
    const { platform } = await params

    const config = OAUTH_CONFIGS[platform]

    if (!config) {
      return NextResponse.json(
        { error: `Platform ${platform} is not supported` },
        { status: 400 }
      )
    }

    // Check if OAuth credentials are configured
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json({
        setupRequired: true,
        error: `${platform.toUpperCase()} OAuth is not configured.\n\nPlease add ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET to your .env.local file.`
      })
    }

    // Generate OAuth state for security
    const state = Buffer.from(JSON.stringify({
      userId,
      platform,
      timestamp: Date.now()
    })).toString('base64')

    // Build authorization URL
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/oauth/callback/${platform}`

    const authParams = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: state
    })

    const authUrl = `${config.authUrl}?${authParams.toString()}`

    return NextResponse.json({
      authUrl,
      platform,
      message: 'Redirect to this URL to authorize'
    })

  } catch (error: any) {
    console.error('OAuth connect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth connection' },
      { status: 500 }
    )
  }
}
