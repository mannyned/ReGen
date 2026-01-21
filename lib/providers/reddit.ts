/**
 * Reddit OAuth Provider
 *
 * Reddit uses OAuth 2.0 with permanent refresh tokens.
 *
 * Key characteristics:
 * - Requires Basic Auth for token exchange
 * - Access tokens expire in 1 hour
 * - Refresh tokens are permanent (when duration=permanent)
 * - Requires User-Agent header for all API calls
 *
 * Scopes:
 * - identity: Access user identity
 * - submit: Submit posts
 * - read: Read content
 * - mysubreddits: Access user's subreddits
 *
 * @see https://www.reddit.com/dev/api/oauth
 * @see https://github.com/reddit-archive/reddit/wiki/OAuth2
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

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_USER_URL = 'https://oauth.reddit.com/api/v1/me';
const USER_AGENT = 'ReGen/1.0';

/**
 * Get Reddit OAuth configuration from environment
 */
function getRedditConfig() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('REDDIT_CLIENT_ID', 'reddit');
  }
  if (!clientSecret) {
    throw new MissingConfigError('REDDIT_CLIENT_SECRET', 'reddit');
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'reddit',
  displayName: 'Reddit',
  authorizationUrl: REDDIT_AUTH_URL,
  tokenUrl: REDDIT_TOKEN_URL,
  identityUrl: REDDIT_USER_URL,

  // Scopes for Reddit API
  scopes: [
    'identity',      // Access user identity
    'submit',        // Submit posts
    'read',          // Read content
    'mysubreddits',  // Access user's subreddits
  ],

  capabilities: {
    supportsRefresh: true,           // Refresh tokens supported
    supportsTokenVerification: false, // No dedicated verification endpoint
    tokensExpire: true,              // Access tokens expire in 1 hour
    requiresPKCE: false,             // PKCE not required
    supportsTokenExchange: false,    // No short/long lived exchange
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL
 *
 * Reddit requires duration=permanent for refresh tokens
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getRedditConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/reddit/callback`;

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(' ')); // Space-separated scopes
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('duration', 'permanent'); // Request permanent refresh token

  return {
    url: authUrl.toString(),
    state: params.state,
  };
}

/**
 * Exchange authorization code for tokens
 *
 * Reddit requires Basic Auth header with client credentials
 *
 * Reddit returns:
 * - access_token (1 hour lifetime)
 * - refresh_token (permanent if duration=permanent)
 * - expires_in (3600 seconds typically)
 * - token_type (bearer)
 * - scope (granted scopes)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getRedditConfig();

  try {
    // Reddit requires Basic auth header with client credentials
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
        'User-Agent': USER_AGENT,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenExchangeError(
        'reddit',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('reddit', 'No access token in response');
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
      'reddit',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * Reddit refresh tokens are permanent.
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getRedditConfig();

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
        'User-Agent': USER_AGENT,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenRefreshError(
        'reddit',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      // Reddit doesn't return a new refresh token on refresh
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
      'reddit',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * Reddit doesn't have a token verification endpoint
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
 * Fetch Reddit user identity
 *
 * Returns the authenticated user's profile information.
 */
async function getIdentity(params: IdentityParams): Promise<ProviderIdentity> {
  try {
    const response = await fetch(config.identityUrl, {
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new IdentityFetchError(
        'reddit',
        errorData.message || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.id) {
      throw new IdentityFetchError('reddit', 'No user data in response');
    }

    return {
      providerAccountId: data.id,
      displayName: data.name,
      avatarUrl: data.icon_img?.split('?')[0], // Remove query params from avatar URL
      metadata: {
        redditId: data.id,
        username: data.name,
        displayName: data.subreddit?.display_name_prefixed,
        iconImg: data.icon_img,
        totalKarma: data.total_karma,
        linkKarma: data.link_karma,
        commentKarma: data.comment_karma,
        verified: data.verified,
        hasVerifiedEmail: data.has_verified_email,
        isGold: data.is_gold,
        isMod: data.is_mod,
        createdUtc: data.created_utc,
        over18: data.over_18,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'reddit',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * Reddit OAuth provider implementation
 */
export const redditProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(redditProvider);

export default redditProvider;
