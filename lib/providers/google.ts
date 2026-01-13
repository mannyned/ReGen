/**
 * Google OAuth Provider (YouTube) - SCAFFOLD
 *
 * Google OAuth 2.0 for YouTube Data API access.
 *
 * Key characteristics:
 * - Standard OAuth 2.0 flow
 * - Access tokens expire in 1 hour
 * - Refresh tokens are long-lived (until revoked)
 * - Supports PKCE (optional but recommended)
 * - Token verification via tokeninfo endpoint
 *
 * YouTube-specific scopes:
 * - youtube.readonly: View YouTube account
 * - youtube.upload: Upload videos
 * - youtube.force-ssl: Manage videos (requires SSL)
 * - yt-analytics.readonly: View YouTube Analytics
 *
 * @see https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
 * @see https://developers.google.com/identity/protocols/oauth2/web-server
 *
 * TODO: Complete implementation when Google Cloud credentials are configured
 */

import type {
  OAuthProviderInterface,
  ProviderConfig,
  AuthorizationUrlParams,
  AuthorizationUrlResult,
  TokenExchangeParams,
  ProcessedToken,
  RefreshTokenParams,
  TokenVerificationParams,
  TokenVerificationResult,
  IdentityParams,
  ProviderIdentity,
} from '../oauth/types';
import {
  TokenExchangeError,
  TokenRefreshError,
  TokenVerificationError,
  IdentityFetchError,
  MissingConfigError,
} from '../oauth/errors';
import { registerProvider } from '../oauth/engine';

// ============================================
// CONFIGURATION
// ============================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const YOUTUBE_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';

/**
 * Get Google OAuth configuration from environment
 */
function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('GOOGLE_CLIENT_ID', 'google');
  }
  if (!clientSecret) {
    throw new MissingConfigError('GOOGLE_CLIENT_SECRET', 'google');
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'google',
  displayName: 'Google (YouTube)',
  authorizationUrl: GOOGLE_AUTH_URL,
  tokenUrl: GOOGLE_TOKEN_URL,
  identityUrl: GOOGLE_USERINFO_URL,
  tokenVerificationUrl: GOOGLE_TOKENINFO_URL,

  // Scopes for YouTube and Google Drive/Sheets access
  // See: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps#identify-access-scopes
  // See: https://developers.google.com/drive/api/guides/about-auth
  // Note: We use drive.file instead of spreadsheets - it allows creating/editing
  // Google Sheets files created by the app without requiring sensitive scope verification
  scopes: [
    'openid',                                                   // OpenID Connect
    'email',                                                    // User's email
    'profile',                                                  // Basic profile info
    'https://www.googleapis.com/auth/youtube.readonly',         // View YouTube data
    'https://www.googleapis.com/auth/youtube.upload',           // Upload videos
    'https://www.googleapis.com/auth/yt-analytics.readonly',    // View YouTube analytics
    'https://www.googleapis.com/auth/drive.file',               // Create/access files created by the app (includes Sheets)
  ],

  capabilities: {
    supportsRefresh: true,           // Refresh tokens supported
    supportsTokenVerification: true,  // tokeninfo endpoint available
    tokensExpire: true,              // Access tokens expire in 1 hour
    requiresPKCE: false,             // PKCE optional but recommended
    supportsTokenExchange: false,    // No short/long lived exchange
  },

  additionalAuthParams: {
    access_type: 'offline',          // Get refresh token
    prompt: 'consent',               // Force consent to ensure refresh token
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL
 *
 * Google OAuth with additional parameters for refresh token acquisition.
 * 'access_type=offline' ensures we get a refresh token.
 * 'prompt=consent' forces the consent screen even if previously authorized.
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getGoogleConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/google/callback`;

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(' ')); // Google uses space-separated scopes
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  // Add PKCE if provided (optional for Google but recommended)
  if (params.codeVerifier) {
    const crypto = require('crypto');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(params.codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
  }

  return {
    url: authUrl.toString(),
    state: params.state,
    codeVerifier: params.codeVerifier,
  };
}

/**
 * Exchange authorization code for tokens
 *
 * Google returns:
 * - access_token (1 hour lifetime)
 * - refresh_token (only on first authorization or with prompt=consent)
 * - id_token (JWT with user info)
 * - expires_in (3600 seconds typically)
 * - token_type (Bearer)
 * - scope (granted scopes)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getGoogleConfig();

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
    });

    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenExchangeError(
        'google',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('google', 'No access token in response');
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      expiresAt,
      scope: data.scope,
      raw: {
        ...data,
        id_token: data.id_token, // JWT with user claims
      },
    };
  } catch (error) {
    if (error instanceof TokenExchangeError) {
      throw error;
    }
    throw new TokenExchangeError(
      'google',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * Google refresh tokens don't expire unless revoked.
 * Each refresh returns a new access token (refresh token stays the same).
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getGoogleConfig();

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenRefreshError(
        'google',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      // Google doesn't return a new refresh token on refresh
      refreshToken: params.refreshToken,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      expiresAt,
      scope: data.scope,
      raw: data,
    };
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      throw error;
    }
    throw new TokenRefreshError(
      'google',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * Verify token validity using tokeninfo endpoint
 *
 * Returns information about the access token including:
 * - User ID (sub)
 * - Scopes
 * - Expiration
 * - Audience (client ID)
 */
async function verifyToken(params: TokenVerificationParams): Promise<TokenVerificationResult> {
  try {
    const url = new URL(config.tokenVerificationUrl!);
    url.searchParams.set('access_token', params.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return { isValid: false };
    }

    const data = await response.json();

    // Check if there's an error in the response
    if (data.error) {
      return { isValid: false };
    }

    return {
      isValid: true,
      scopes: data.scope?.split(' ') || [],
      expiresAt: data.exp ? new Date(data.exp * 1000) : undefined,
      userId: data.sub,
      appId: data.aud,
      metadata: {
        email: data.email,
        emailVerified: data.email_verified,
        azp: data.azp, // Authorized party
      },
    };
  } catch {
    return { isValid: false };
  }
}

/**
 * Fetch Google user identity and YouTube channel
 *
 * Gets basic Google profile info plus YouTube channel details.
 */
async function getIdentity(params: IdentityParams): Promise<ProviderIdentity> {
  try {
    // Step 1: Get Google user info
    const userResponse = await fetch(config.identityUrl, {
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new IdentityFetchError('google', `HTTP ${userResponse.status}`);
    }

    const userData = await userResponse.json();

    // Step 2: Get YouTube channel info
    let youtubeChannel = null;
    try {
      const youtubeUrl = new URL(YOUTUBE_CHANNELS_URL);
      youtubeUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
      youtubeUrl.searchParams.set('mine', 'true');

      const youtubeResponse = await fetch(youtubeUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
        },
      });

      if (youtubeResponse.ok) {
        const youtubeData = await youtubeResponse.json();
        youtubeChannel = youtubeData.items?.[0] || null;
      }
    } catch (error) {
      console.error('[Google] Failed to fetch YouTube channel:', error);
    }

    return {
      providerAccountId: userData.id,
      displayName: userData.name,
      email: userData.email,
      avatarUrl: userData.picture,
      metadata: {
        googleId: userData.id,
        googleEmail: userData.email,
        googleName: userData.name,
        googlePicture: userData.picture,
        verifiedEmail: userData.verified_email,
        locale: userData.locale,
        // YouTube channel info
        youtubeChannel: youtubeChannel ? {
          id: youtubeChannel.id,
          title: youtubeChannel.snippet?.title,
          description: youtubeChannel.snippet?.description,
          customUrl: youtubeChannel.snippet?.customUrl,
          thumbnailUrl: youtubeChannel.snippet?.thumbnails?.default?.url,
          subscriberCount: youtubeChannel.statistics?.subscriberCount,
          videoCount: youtubeChannel.statistics?.videoCount,
          viewCount: youtubeChannel.statistics?.viewCount,
        } : null,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'google',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * Google OAuth provider implementation (YouTube)
 */
export const googleProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(googleProvider);

export default googleProvider;
