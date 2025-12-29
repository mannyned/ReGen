/**
 * Snapchat OAuth Provider (Login Kit)
 *
 * Snapchat uses OAuth 2.0 for their Login Kit.
 *
 * Key characteristics:
 * - Standard OAuth 2.0 flow
 * - Access tokens expire in 30 minutes
 * - Refresh tokens expire in 30 days
 * - Supports token refresh
 *
 * Scopes:
 * - snapchat-marketing-api: Marketing API access (limited)
 *
 * Note: Snapchat does NOT have a public Content Posting API.
 * Use Creative Kit for user-initiated sharing (client-side).
 * This provider handles Login Kit only for identity.
 *
 * @see https://developers.snap.com/api/login-kit/login-kit-web
 * @see https://developers.snap.com/creative-kit/integrate
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

const SNAPCHAT_AUTH_URL = 'https://accounts.snapchat.com/accounts/oauth2/auth';
const SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/accounts/oauth2/token';
const SNAPCHAT_USERINFO_URL = 'https://kit.snapchat.com/v1/me';

/**
 * Get Snapchat OAuth configuration from environment
 */
function getSnapchatConfig() {
  const clientId = process.env.SNAPCHAT_CLIENT_ID;
  const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('SNAPCHAT_CLIENT_ID', 'snapchat');
  }
  if (!clientSecret) {
    throw new MissingConfigError('SNAPCHAT_CLIENT_SECRET', 'snapchat');
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'snapchat',
  displayName: 'Snapchat',
  authorizationUrl: SNAPCHAT_AUTH_URL,
  tokenUrl: SNAPCHAT_TOKEN_URL,
  identityUrl: SNAPCHAT_USERINFO_URL,

  // Login Kit scopes
  // See: https://developers.snap.com/api/login-kit/reference#scopes
  scopes: [
    'https://auth.snapchat.com/oauth2/api/user.display_name',  // Display name
    'https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar', // Bitmoji avatar
    'https://auth.snapchat.com/oauth2/api/user.external_id',    // External ID
  ],

  capabilities: {
    supportsRefresh: true,            // Refresh tokens supported
    supportsTokenVerification: false,  // No token introspection endpoint
    tokensExpire: true,               // Access tokens expire in 30 mins
    requiresPKCE: false,              // PKCE not required
    supportsTokenExchange: false,     // No short/long lived exchange
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL
 *
 * Snapchat OAuth with standard parameters.
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getSnapchatConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/snapchat/callback`;

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(' ')); // Space-separated
  authUrl.searchParams.set('response_type', 'code');

  return {
    url: authUrl.toString(),
    state: params.state,
  };
}

/**
 * Exchange authorization code for tokens
 *
 * Snapchat returns:
 * - access_token (30 minute lifetime)
 * - refresh_token (30 day lifetime)
 * - expires_in (seconds)
 * - token_type (Bearer)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getSnapchatConfig();

  try {
    // Snapchat requires Basic auth header
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenExchangeError(
        'snapchat',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('snapchat', 'No access token in response');
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
      'snapchat',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * Snapchat refresh tokens last 30 days.
 * After refresh, you get a new access token AND refresh token.
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getSnapchatConfig();

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenRefreshError(
        'snapchat',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      // Snapchat returns a new refresh token on each refresh
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
      'snapchat',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * Snapchat doesn't have a public token verification endpoint
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
 * Fetch Snapchat user identity
 *
 * Uses the Login Kit /me endpoint.
 */
async function getIdentity(params: IdentityParams): Promise<ProviderIdentity> {
  try {
    const url = new URL(config.identityUrl);
    url.searchParams.set('query', '{me{displayName,bitmoji{avatar},externalId}}');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new IdentityFetchError(
        'snapchat',
        errorData.message || `HTTP ${response.status}`
      );
    }

    const data = await response.json();
    const userData = data.data?.me;

    if (!userData) {
      throw new IdentityFetchError('snapchat', 'No user data in response');
    }

    return {
      providerAccountId: userData.externalId,
      displayName: userData.displayName,
      avatarUrl: userData.bitmoji?.avatar,
      metadata: {
        snapchatId: userData.externalId,
        displayName: userData.displayName,
        bitmojiAvatar: userData.bitmoji?.avatar,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'snapchat',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * Snapchat OAuth provider implementation
 */
export const snapchatProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(snapchatProvider);

export default snapchatProvider;
