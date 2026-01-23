/**
 * Pinterest OAuth Provider
 *
 * Pinterest uses OAuth 2.0 with refresh tokens.
 *
 * Key characteristics:
 * - Standard OAuth 2.0 flow
 * - Access tokens expire in 1 day
 * - Refresh tokens expire in 1 year
 * - Requires client credentials in token exchange body
 *
 * Scopes:
 * - user_accounts:read: Read user account info
 * - pins:read: Read pins
 * - pins:write: Create and update pins
 * - boards:read: Read boards
 * - boards:write: Write to boards (required for creating pins)
 *
 * @see https://developers.pinterest.com/docs/getting-started/authentication/
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
// CONFIGURATION
// ============================================

const PINTEREST_AUTH_URL = 'https://www.pinterest.com/oauth/';
const PINTEREST_TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token';
const PINTEREST_USER_URL = 'https://api.pinterest.com/v5/user_account';

/**
 * Get Pinterest OAuth configuration from environment
 */
function getPinterestConfig() {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('PINTEREST_CLIENT_ID', 'pinterest');
  }
  if (!clientSecret) {
    throw new MissingConfigError('PINTEREST_CLIENT_SECRET', 'pinterest');
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'pinterest',
  displayName: 'Pinterest',
  authorizationUrl: PINTEREST_AUTH_URL,
  tokenUrl: PINTEREST_TOKEN_URL,
  identityUrl: PINTEREST_USER_URL,

  // Scopes for Pinterest API
  scopes: [
    'user_accounts:read',  // Read user account info
    'pins:read',           // Read pins
    'pins:write',          // Create and update pins
    'boards:read',         // Read boards
    'boards:write',        // Write to boards (required for creating pins)
  ],

  capabilities: {
    supportsRefresh: true,            // Refresh tokens supported
    supportsTokenVerification: false, // No dedicated verification endpoint
    tokensExpire: true,               // Access tokens expire in 1 day
    requiresPKCE: false,              // PKCE not required
    supportsTokenExchange: false,     // No short/long lived exchange
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getPinterestConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/pinterest/callback`;

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(',')); // Comma-separated scopes for Pinterest
  authUrl.searchParams.set('response_type', 'code');

  return {
    url: authUrl.toString(),
    state: params.state,
  };
}

/**
 * Exchange authorization code for tokens
 *
 * Pinterest uses Basic Auth with client credentials for token exchange.
 *
 * Pinterest returns:
 * - access_token (1 day lifetime)
 * - refresh_token (1 year lifetime)
 * - expires_in (86400 seconds typically)
 * - token_type (bearer)
 * - scope (granted scopes)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getPinterestConfig();

  try {
    // Pinterest uses Basic Auth for token exchange
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
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
      throw new TokenExchangeError(
        'pinterest',
        errorData.message || errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('pinterest', 'No access token in response');
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
      'pinterest',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * Pinterest refresh tokens are valid for 1 year.
 * A new refresh token is returned on each refresh.
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getPinterestConfig();

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
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
        'pinterest',
        errorData.message || errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      // Pinterest returns a new refresh token on each refresh
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
      'pinterest',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * Pinterest doesn't have a token verification endpoint
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
 * Fetch Pinterest user identity
 *
 * Returns the authenticated user's profile information.
 */
async function getIdentity(params: IdentityParams): Promise<ProviderIdentity> {
  try {
    const response = await fetch(config.identityUrl, {
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new IdentityFetchError(
        'pinterest',
        errorData.message || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.username) {
      throw new IdentityFetchError('pinterest', 'No user data in response');
    }

    return {
      providerAccountId: data.username, // Pinterest uses username as unique ID
      displayName: data.username,
      avatarUrl: data.profile_image,
      metadata: {
        username: data.username,
        accountType: data.account_type,
        profileImage: data.profile_image,
        websiteUrl: data.website_url,
        businessName: data.business_name,
        boardCount: data.board_count,
        pinCount: data.pin_count,
        followerCount: data.follower_count,
        followingCount: data.following_count,
        monthlyViews: data.monthly_views,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'pinterest',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * Pinterest OAuth provider implementation
 */
export const pinterestProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(pinterestProvider);

export default pinterestProvider;
