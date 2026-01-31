/**
 * X (Twitter) OAuth Provider
 *
 * X uses OAuth 2.0 with PKCE for their new API v2.
 *
 * BYOK (Bring Your Own Keys) Support:
 * Since Twitter/X charges for API access, users can provide their own
 * API credentials. The provider checks for user credentials first,
 * then falls back to environment variables.
 *
 * Key characteristics:
 * - Requires PKCE (Proof Key for Code Exchange)
 * - Access tokens expire in 2 hours
 * - Refresh tokens are long-lived (6 months)
 * - Supports token refresh
 * - Token verification via user lookup endpoint
 *
 * Scopes:
 * - tweet.read: Read tweets
 * - tweet.write: Post tweets
 * - users.read: Read user profiles
 * - offline.access: Get refresh token
 * - media.write: Upload media (REQUIRED for /2/media/upload)
 *
 * @see https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
 * @see https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
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

// ============================================
// BYOK CREDENTIALS INTERFACE
// ============================================

/**
 * User-provided credentials for BYOK support
 */
export interface XUserCredentials {
  clientId: string;
  clientSecret: string;
}

// ============================================
// CONFIGURATION
// ============================================

const X_AUTH_URL = 'https://x.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_USER_URL = 'https://api.twitter.com/2/users/me';

// Thread-local storage for user credentials during OAuth flow
let currentUserCredentials: XUserCredentials | null = null;

/**
 * Set user credentials for the current request
 * Call this before initiating OAuth or making API calls
 */
export function setUserCredentials(credentials: XUserCredentials | null): void {
  currentUserCredentials = credentials;
}

/**
 * Get current user credentials (if set)
 */
export function getUserCredentials(): XUserCredentials | null {
  return currentUserCredentials;
}

/**
 * Get X OAuth configuration
 *
 * Priority:
 * 1. User-provided credentials (BYOK)
 * 2. Environment variables (fallback)
 *
 * @param userCredentials - Optional user-provided credentials
 */
function getXConfig(userCredentials?: XUserCredentials | null) {
  // Check for user-provided credentials first (BYOK)
  const creds = userCredentials || currentUserCredentials;

  if (creds) {
    return {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      isByok: true,
    };
  }

  // Fall back to environment variables
  const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('X_CLIENT_ID', 'x');
  }
  if (!clientSecret) {
    throw new MissingConfigError('X_CLIENT_SECRET', 'x');
  }

  return { clientId, clientSecret, isByok: false };
}

/**
 * Check if BYOK credentials are required (no env vars configured)
 */
export function isXByokRequired(): boolean {
  const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET;
  return !clientId || !clientSecret;
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'x',
  displayName: 'X (Twitter)',
  authorizationUrl: X_AUTH_URL,
  tokenUrl: X_TOKEN_URL,
  identityUrl: X_USER_URL,

  // Scopes for X API v2
  // See: https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
  scopes: [
    'tweet.read',       // Read tweets
    'tweet.write',      // Post tweets
    'users.read',       // Read user profiles
    'offline.access',   // Get refresh token
    'media.write',      // REQUIRED for /2/media/upload endpoint
  ],

  capabilities: {
    supportsRefresh: true,           // Refresh tokens supported
    supportsTokenVerification: false, // No dedicated verification endpoint
    tokensExpire: true,              // Access tokens expire in 2 hours
    requiresPKCE: true,              // PKCE is required
    supportsTokenExchange: false,    // No short/long lived exchange
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL with PKCE
 *
 * X requires PKCE with S256 or plain challenge method.
 * S256 is recommended for security.
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getXConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/x/callback`;

  // Generate PKCE code challenge
  let codeChallenge: string | undefined;
  if (params.codeVerifier) {
    const crypto = require('crypto');
    codeChallenge = crypto
      .createHash('sha256')
      .update(params.codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(' ')); // Space-separated scopes
  authUrl.searchParams.set('response_type', 'code');

  // PKCE is required for X
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
 * X returns:
 * - access_token (2 hour lifetime)
 * - refresh_token (if offline.access scope requested)
 * - expires_in (7200 seconds typically)
 * - token_type (bearer)
 * - scope (granted scopes)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getXConfig();

  try {
    // X requires Basic auth header with client credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
      client_id: clientId,
    });

    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenExchangeError(
        'x',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('x', 'No access token in response');
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
      raw: data,
    };
  } catch (error) {
    if (error instanceof TokenExchangeError) {
      throw error;
    }
    throw new TokenExchangeError(
      'x',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * X refresh tokens last 6 months.
 * A new refresh token may be returned with each refresh.
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getXConfig();

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: clientId,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenRefreshError(
        'x',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      // X may return a new refresh token
      refreshToken: data.refresh_token || params.refreshToken,
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
      'x',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * X doesn't have a token verification endpoint
 * We verify by attempting to fetch user info
 */
async function verifyToken(params: TokenVerificationParams): Promise<TokenVerificationResult> {
  try {
    const identity = await getIdentity({ accessToken: params.accessToken });

    return {
      isValid: true,
      userId: identity.providerAccountId,
      metadata: identity.metadata,
    };
  } catch {
    return { isValid: false };
  }
}

/**
 * Fetch X user identity
 *
 * Returns the authenticated user's profile information.
 */
async function getIdentity(params: IdentityParams): Promise<ProviderIdentity> {
  try {
    // X API v2 user fields
    const userFields = [
      'id',
      'name',
      'username',
      'profile_image_url',
      'description',
      'public_metrics',
      'verified',
      'verified_type',
      'created_at',
      'url',
    ].join(',');

    const url = new URL(config.identityUrl);
    url.searchParams.set('user.fields', userFields);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new IdentityFetchError(
        'x',
        errorData.detail || errorData.title || `HTTP ${response.status}`
      );
    }

    const data = await response.json();
    const userData = data.data;

    if (!userData) {
      throw new IdentityFetchError('x', 'No user data in response');
    }

    return {
      providerAccountId: userData.id,
      displayName: userData.name,
      avatarUrl: userData.profile_image_url,
      metadata: {
        xId: userData.id,
        username: userData.username,
        name: userData.name,
        description: userData.description,
        profileImageUrl: userData.profile_image_url,
        verified: userData.verified,
        verifiedType: userData.verified_type,
        url: userData.url,
        createdAt: userData.created_at,
        publicMetrics: userData.public_metrics ? {
          followersCount: userData.public_metrics.followers_count,
          followingCount: userData.public_metrics.following_count,
          tweetCount: userData.public_metrics.tweet_count,
          listedCount: userData.public_metrics.listed_count,
        } : null,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'x',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * X (Twitter) OAuth provider implementation
 */
export const xProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(xProvider);

export default xProvider;
