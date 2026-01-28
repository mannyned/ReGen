/**
 * TikTok OAuth Provider - SCAFFOLD
 *
 * TikTok uses OAuth 2.0 with PKCE for their Login Kit.
 *
 * Key characteristics:
 * - Requires PKCE (Proof Key for Code Exchange)
 * - Access tokens expire in 24 hours
 * - Refresh tokens are long-lived (365 days)
 * - Supports token refresh
 * - No token verification endpoint (must make API call to verify)
 *
 * Scopes for content creators:
 * - user.info.basic: Basic profile info
 * - video.list: Access to user's videos
 * - video.upload: Upload videos (if needed)
 *
 * @see https://developers.tiktok.com/doc/login-kit-web/
 * @see https://developers.tiktok.com/doc/oauth-user-access-token-management/
 *
 * TODO: Implement full API calls when TikTok credentials are ready
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
  IdentityFetchError,
  MissingConfigError,
} from '../oauth/errors';
import { registerProvider } from '../oauth/engine';
import { sha256 } from '../crypto/encrypt';

// ============================================
// CONFIGURATION
// ============================================

/**
 * TikTok API version and URLs
 */
const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

/**
 * Get TikTok OAuth configuration from environment
 */
function getTikTokConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_ID || process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey) {
    throw new MissingConfigError('TIKTOK_CLIENT_ID', 'tiktok');
  }
  if (!clientSecret) {
    throw new MissingConfigError('TIKTOK_CLIENT_SECRET', 'tiktok');
  }

  return { clientKey, clientSecret };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'tiktok',
  displayName: 'TikTok',
  authorizationUrl: TIKTOK_AUTH_URL,
  tokenUrl: TIKTOK_TOKEN_URL,
  identityUrl: TIKTOK_USER_INFO_URL,

  // Scopes for creator accounts
  // See: https://developers.tiktok.com/doc/tiktok-api-scopes/
  // Approved scopes for this app:
  // Note: video.list scope required for analytics but needs separate TikTok approval
  scopes: [
    'user.info.basic',    // Basic profile (avatar, display name) - Login Kit
    'video.upload',       // Upload videos to TikTok inbox
    'video.publish',      // Direct publish videos to TikTok (approved Jan 2026)
  ],

  capabilities: {
    supportsRefresh: true,           // Refresh tokens supported
    supportsTokenVerification: false, // No debug_token equivalent
    tokensExpire: true,              // Access tokens expire in 24 hours
    requiresPKCE: true,              // PKCE is required
    supportsTokenExchange: false,    // No short/long lived token exchange
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL with PKCE
 *
 * TikTok requires PKCE with S256 challenge method.
 * The code_verifier must be stored and sent during token exchange.
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientKey } = getTikTokConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/tiktok/callback`;

  // PKCE: Generate code challenge from code verifier
  // TikTok requires S256 method (SHA-256 hash, base64url encoded)
  let codeChallenge: string | undefined;
  if (params.codeVerifier) {
    // SHA-256 hash, then base64url encode
    const hash = sha256(params.codeVerifier);
    codeChallenge = Buffer.from(hash, 'hex')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(','));
  authUrl.searchParams.set('response_type', 'code');

  // PKCE parameters
  if (codeChallenge) {
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
 * TikTok returns:
 * - access_token (24 hour lifetime)
 * - refresh_token (365 day lifetime)
 * - open_id (TikTok user identifier)
 * - scope (granted scopes)
 * - expires_in (seconds until access token expires)
 * - refresh_expires_in (seconds until refresh token expires)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientKey, clientSecret } = getTikTokConfig();

  try {
    // TikTok expects form-urlencoded body
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
    });

    // Add code verifier if PKCE was used
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
        'tiktok',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    // TikTok wraps response in a 'data' object on success
    const tokenData = data.data || data;

    if (!tokenData.access_token) {
      throw new TokenExchangeError('tiktok', 'No access token in response');
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: 'Bearer',
      expiresIn: tokenData.expires_in,
      expiresAt,
      scope: tokenData.scope,
      raw: {
        ...tokenData,
        open_id: tokenData.open_id, // TikTok's user identifier
        refresh_expires_in: tokenData.refresh_expires_in,
      },
    };
  } catch (error) {
    if (error instanceof TokenExchangeError) {
      throw error;
    }
    throw new TokenExchangeError(
      'tiktok',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * TikTok refresh tokens last 365 days and can be used to get new access tokens.
 * A new refresh token is returned with each refresh.
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientKey, clientSecret } = getTikTokConfig();

  try {
    const body = new URLSearchParams({
      client_key: clientKey,
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
        'tiktok',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();
    const tokenData = data.data || data;

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token, // New refresh token
      tokenType: 'Bearer',
      expiresIn: tokenData.expires_in,
      expiresAt,
      scope: tokenData.scope,
      raw: tokenData,
    };
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      throw error;
    }
    throw new TokenRefreshError(
      'tiktok',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * TikTok doesn't have a token verification endpoint
 * We verify by attempting to fetch user info
 */
async function verifyToken(params: TokenVerificationParams): Promise<TokenVerificationResult> {
  try {
    // Attempt to fetch user info to verify token
    const identity = await getIdentity({ accessToken: params.accessToken });

    return {
      isValid: true,
      userId: identity.providerAccountId,
      // TikTok doesn't return scope info from user endpoint
      metadata: identity.metadata,
    };
  } catch {
    return {
      isValid: false,
    };
  }
}

/**
 * Fetch TikTok user identity
 *
 * Returns basic user profile information.
 * Fields available depend on granted scopes.
 */
async function getIdentity(params: IdentityParams): Promise<ProviderIdentity> {
  try {
    // TikTok user.info.basic scope only allows these fields:
    // open_id, union_id, avatar_url, display_name
    // See: https://developers.tiktok.com/doc/tiktok-api-scopes/
    const fields = 'open_id,union_id,avatar_url,display_name';

    const url = new URL(config.identityUrl);
    url.searchParams.set('fields', fields);

    console.log('[TikTok] Fetching identity from:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
      },
    });

    const responseText = await response.text();
    console.log('[TikTok] Identity response status:', response.status);
    console.log('[TikTok] Identity response body:', responseText);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        // Use status code as message
      }
      throw new IdentityFetchError('tiktok', errorMessage);
    }

    const data = JSON.parse(responseText);

    // TikTok wraps user data in data.user
    const userData = data.data?.user || data.user || data;

    console.log('[TikTok] Parsed user data:', JSON.stringify(userData));

    if (!userData.open_id) {
      throw new IdentityFetchError('tiktok', 'No open_id in response');
    }

    return {
      providerAccountId: userData.open_id,
      displayName: userData.display_name || 'TikTok User',
      avatarUrl: userData.avatar_url,
      metadata: {
        openId: userData.open_id,
        unionId: userData.union_id,
        displayName: userData.display_name,
        avatarUrl: userData.avatar_url,
      },
    };
  } catch (error) {
    console.error('[TikTok] Identity fetch error:', error);
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'tiktok',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * TikTok OAuth provider implementation
 */
export const tiktokProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(tiktokProvider);

export default tiktokProvider;
