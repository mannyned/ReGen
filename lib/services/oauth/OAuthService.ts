import crypto from 'crypto'
import type {
  SocialPlatform,
  OAuthTokens,
  OAuthState,
  SocialProfile,
} from '../../types/social'
import { OAUTH_CONFIGS, API_BASE_URLS, getOAuthConfig, isOAuthConfigured } from '../../config/oauth'

// ============================================
// PKCE UTILITIES
// ============================================

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

// ============================================
// STATE MANAGEMENT (Stateless with HMAC signature)
// ============================================

// Secret for signing state - use TOKEN_ENCRYPTION_KEY or generate one
const STATE_SECRET = process.env.TOKEN_ENCRYPTION_KEY || process.env.OAUTH_STATE_SECRET || 'default-oauth-state-secret-change-me'

function signState(data: string): string {
  const hmac = crypto.createHmac('sha256', STATE_SECRET)
  hmac.update(data)
  return hmac.digest('base64url')
}

function verifySignature(data: string, signature: string): boolean {
  const expectedSignature = signState(data)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export function generateOAuthState(
  userId: string,
  platform: SocialPlatform,
  codeVerifier?: string
): string {
  const state: OAuthState = {
    userId,
    platform,
    timestamp: Date.now(),
    nonce: generateNonce(),
    codeVerifier,
  }

  // Encode state as base64url
  const stateData = Buffer.from(JSON.stringify(state)).toString('base64url')

  // Sign the state
  const signature = signState(stateData)

  // Return state.signature format
  return `${stateData}.${signature}`
}

export function validateOAuthState(stateString: string): OAuthState | null {
  try {
    // Split state and signature
    const parts = stateString.split('.')
    if (parts.length !== 2) {
      console.error('[OAuth] Invalid state format - missing signature')
      return null
    }

    const [stateData, signature] = parts

    // Verify signature
    if (!verifySignature(stateData, signature)) {
      console.error('[OAuth] Invalid state signature')
      return null
    }

    // Decode state
    const state: OAuthState = JSON.parse(
      Buffer.from(stateData, 'base64url').toString('utf8')
    )

    // Check expiry (10 minutes)
    const expiryMs = 10 * 60 * 1000
    if (Date.now() - state.timestamp > expiryMs) {
      console.error('[OAuth] State expired')
      return null
    }

    return state
  } catch (error) {
    console.error('[OAuth] Failed to validate state:', error)
    return null
  }
}

// ============================================
// OAUTH SERVICE CLASS
// ============================================

export class OAuthService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }

  // ============================================
  // AUTHORIZATION URL GENERATION
  // ============================================

  generateAuthorizationUrl(platform: SocialPlatform, userId: string): {
    authUrl: string
    codeVerifier?: string
  } {
    if (!isOAuthConfigured(platform)) {
      throw new Error(`${platform.toUpperCase()} OAuth is not configured`)
    }

    const config = getOAuthConfig(platform)
    let codeVerifier: string | undefined
    let codeChallenge: string | undefined

    // Generate PKCE if required
    if (config.pkceRequired) {
      codeVerifier = generateCodeVerifier()
      codeChallenge = generateCodeChallenge(codeVerifier)
    }

    const state = generateOAuthState(userId, platform, codeVerifier)
    const redirectUri = `${this.baseUrl}/api/oauth/callback/${platform}`

    const params: Record<string, string> = {
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: config.responseType,
      scope: config.scopes.join(' '),
      state,
    }

    // Add PKCE parameters
    if (codeChallenge) {
      params.code_challenge = codeChallenge
      params.code_challenge_method = 'S256'
    }

    // Add platform-specific parameters
    if (config.additionalParams) {
      Object.assign(params, config.additionalParams)
    }

    // Platform-specific URL building
    let authUrl: string
    if (platform === 'tiktok') {
      // TikTok uses different parameter names
      params.client_key = config.clientId
      delete params.client_id
      authUrl = `${config.authUrl}?${new URLSearchParams(params).toString()}`
    } else {
      authUrl = `${config.authUrl}?${new URLSearchParams(params).toString()}`
    }

    return { authUrl, codeVerifier }
  }

  // ============================================
  // TOKEN EXCHANGE
  // ============================================

  async exchangeCodeForTokens(
    platform: SocialPlatform,
    code: string,
    codeVerifier?: string
  ): Promise<OAuthTokens> {
    const config = getOAuthConfig(platform)
    const redirectUri = `${this.baseUrl}/api/oauth/callback/${platform}`

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }

    // Add credentials based on platform requirements
    if (platform === 'tiktok') {
      body.client_key = config.clientId
      body.client_secret = config.clientSecret
    } else {
      body.client_id = config.clientId
      body.client_secret = config.clientSecret
    }

    // Add PKCE verifier if required
    if (codeVerifier) {
      body.code_verifier = codeVerifier
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Token exchange failed for ${platform}:`, error)
      throw new Error(`Failed to exchange code for tokens: ${error}`)
    }

    const data = await response.json()

    return this.normalizeTokenResponse(platform, data)
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  async refreshAccessToken(
    platform: SocialPlatform,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const config = getOAuthConfig(platform)

    if (!config.refreshUrl) {
      throw new Error(`Token refresh not supported for ${platform}`)
    }

    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }

    // Add credentials based on platform
    if (platform === 'tiktok') {
      body.client_key = config.clientId
      body.client_secret = config.clientSecret
    } else {
      body.client_id = config.clientId
      body.client_secret = config.clientSecret
    }

    const response = await fetch(config.refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Token refresh failed for ${platform}:`, error)
      throw new Error(`Failed to refresh token: ${error}`)
    }

    const data = await response.json()

    return this.normalizeTokenResponse(platform, data)
  }

  // ============================================
  // TOKEN REVOCATION
  // ============================================

  async revokeToken(
    platform: SocialPlatform,
    accessToken: string
  ): Promise<boolean> {
    const config = getOAuthConfig(platform)

    if (!config.revokeUrl) {
      console.warn(`Token revocation not supported for ${platform}`)
      return true
    }

    try {
      let response: Response

      if (platform === 'instagram' || platform === 'facebook') {
        // Facebook/Instagram uses DELETE with token in URL
        response = await fetch(`${config.revokeUrl}?access_token=${accessToken}`, {
          method: 'DELETE',
        })
      } else {
        const body: Record<string, string> = {
          token: accessToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }

        response = await fetch(config.revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(body).toString(),
        })
      }

      return response.ok
    } catch (error) {
      console.error(`Token revocation failed for ${platform}:`, error)
      return false
    }
  }

  // ============================================
  // USER PROFILE FETCHING
  // ============================================

  async fetchUserProfile(
    platform: SocialPlatform,
    accessToken: string
  ): Promise<SocialProfile> {
    const fetchers: Record<SocialPlatform, () => Promise<SocialProfile>> = {
      instagram: () => this.fetchInstagramProfile(accessToken),
      tiktok: () => this.fetchTikTokProfile(accessToken),
      youtube: () => this.fetchYouTubeProfile(accessToken),
      twitter: () => this.fetchTwitterProfile(accessToken),
      linkedin: () => this.fetchLinkedInProfile(accessToken),
      'linkedin-org': () => this.fetchLinkedInProfile(accessToken), // LinkedIn Company uses same profile fetch
      facebook: () => this.fetchFacebookProfile(accessToken),
      meta: () => this.fetchInstagramProfile(accessToken), // Meta uses Instagram profile
      snapchat: () => this.fetchSnapchatProfile(accessToken),
      pinterest: () => this.fetchPinterestProfile(accessToken),
      discord: () => this.fetchDiscordProfile(accessToken),
    }

    return fetchers[platform]()
  }

  private async fetchInstagramProfile(accessToken: string): Promise<SocialProfile> {
    // Instagram Graph API requires getting the Instagram Business Account through Facebook Pages
    // Step 1: Get Facebook Pages the user manages
    const pagesResponse = await fetch(
      `${API_BASE_URLS.instagram}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    )

    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch Facebook Pages for Instagram')
    }

    const pagesData = await pagesResponse.json()
    const pages = pagesData.data || []

    if (pages.length === 0) {
      throw new Error('No Facebook Pages found. Instagram Business accounts require a linked Facebook Page.')
    }

    // Step 2: Find Instagram Business Account linked to a Page
    for (const page of pages) {
      const igResponse = await fetch(
        `${API_BASE_URLS.instagram}/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count}&access_token=${page.access_token}`
      )

      if (!igResponse.ok) continue

      const igData = await igResponse.json()
      const igAccount = igData.instagram_business_account

      if (igAccount) {
        return {
          platformUserId: igAccount.id,
          username: igAccount.username,
          displayName: igAccount.name || igAccount.username,
          profileImageUrl: igAccount.profile_picture_url,
          followers: igAccount.followers_count,
          following: igAccount.follows_count,
        }
      }
    }

    throw new Error('No Instagram Business Account found linked to your Facebook Pages. Make sure your Instagram account is a Business or Creator account connected to a Facebook Page.')
  }

  private async fetchTikTokProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch(
      `${API_BASE_URLS.tiktok}/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) throw new Error('Failed to fetch TikTok profile')

    const { data } = await response.json()

    return {
      platformUserId: data.user.open_id,
      displayName: data.user.display_name,
      profileImageUrl: data.user.avatar_url,
      followers: data.user.follower_count,
      following: data.user.following_count,
    }
  }

  private async fetchYouTubeProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch(
      `${API_BASE_URLS.youtube}/channels?part=snippet,statistics&mine=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) throw new Error('Failed to fetch YouTube profile')

    const data = await response.json()
    const channel = data.items?.[0]

    if (!channel) throw new Error('No YouTube channel found')

    return {
      platformUserId: channel.id,
      username: channel.snippet?.customUrl,
      displayName: channel.snippet?.title,
      profileImageUrl: channel.snippet?.thumbnails?.default?.url,
      followers: parseInt(channel.statistics?.subscriberCount || '0'),
      metadata: {
        viewCount: channel.statistics?.viewCount,
        videoCount: channel.statistics?.videoCount,
      },
    }
  }

  private async fetchTwitterProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch(
      `${API_BASE_URLS.twitter}/users/me?user.fields=id,name,username,profile_image_url,public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) throw new Error('Failed to fetch Twitter profile')

    const { data } = await response.json()

    return {
      platformUserId: data.id,
      username: data.username,
      displayName: data.name,
      profileImageUrl: data.profile_image_url,
      followers: data.public_metrics?.followers_count,
      following: data.public_metrics?.following_count,
    }
  }

  private async fetchLinkedInProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch(
      `${API_BASE_URLS.linkedin}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) throw new Error('Failed to fetch LinkedIn profile')

    const data = await response.json()

    return {
      platformUserId: data.sub,
      displayName: data.name,
      email: data.email,
      profileImageUrl: data.picture,
    }
  }

  private async fetchFacebookProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch(
      `${API_BASE_URLS.facebook}/me?fields=id,name,email,picture&access_token=${accessToken}`
    )

    if (!response.ok) throw new Error('Failed to fetch Facebook profile')

    const data = await response.json()

    return {
      platformUserId: data.id,
      displayName: data.name,
      email: data.email,
      profileImageUrl: data.picture?.data?.url,
    }
  }

  private async fetchSnapchatProfile(accessToken: string): Promise<SocialProfile> {
    const response = await fetch(
      `${API_BASE_URLS.snapchat}/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) throw new Error('Failed to fetch Snapchat profile')

    const { me } = await response.json()

    return {
      platformUserId: me.id,
      displayName: me.display_name,
      email: me.email,
    }
  }

  private async fetchPinterestProfile(accessToken: string): Promise<SocialProfile> {
    // Pinterest API - coming soon
    throw new Error('Pinterest integration coming soon')
  }

  private async fetchDiscordProfile(accessToken: string): Promise<SocialProfile> {
    // Discord API - coming soon
    throw new Error('Discord integration coming soon')
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private normalizeTokenResponse(
    platform: SocialPlatform,
    data: Record<string, unknown>
  ): OAuthTokens {
    // Handle platform-specific response formats
    let expiresIn: number | undefined

    if (platform === 'tiktok') {
      expiresIn = data.expires_in as number
    } else {
      expiresIn = (data.expires_in as number) || undefined
    }

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      tokenType: data.token_type as string | undefined,
      scope: data.scope as string | undefined,
    }
  }
}

// Singleton instance
export const oauthService = new OAuthService()
