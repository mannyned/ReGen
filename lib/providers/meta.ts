/**
 * Meta OAuth Provider (Facebook + Instagram)
 *
 * Full implementation of Meta's OAuth system supporting:
 * - Facebook Login for Business
 * - Instagram Graph API
 * - Short-lived → Long-lived token exchange
 * - Token verification via debug_token endpoint
 * - Page and Instagram Business Account resolution
 *
 * Meta's OAuth flow is complex because:
 * 1. Initial tokens are short-lived (1 hour)
 * 2. Must exchange for long-lived tokens (60 days)
 * 3. Instagram access requires connected Facebook Pages
 * 4. Need to resolve Page → Instagram Business Account mapping
 *
 * Required scopes:
 * - pages_show_list: List user's Facebook Pages
 * - instagram_basic: Basic Instagram account info
 * - instagram_manage_insights: Access to Instagram insights
 *
 * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 * @see https://developers.facebook.com/docs/instagram-api/getting-started
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
  ProviderApiError,
  MissingConfigError,
} from '../oauth/errors';
import { registerProvider } from '../oauth/engine';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Meta API version - update periodically as new versions release
 * Using a recent stable version
 */
const META_API_VERSION = 'v21.0';

/**
 * Meta Graph API base URL
 */
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Get Meta OAuth configuration from environment
 */
function getMetaConfig() {
  const clientId = process.env.META_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET || process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!clientId) {
    throw new MissingConfigError('META_CLIENT_ID', 'meta');
  }
  if (!clientSecret) {
    throw new MissingConfigError('META_CLIENT_SECRET', 'meta');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'meta',
  displayName: 'Meta (Facebook/Instagram)',
  authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
  tokenUrl: `${META_GRAPH_URL}/oauth/access_token`,
  identityUrl: `${META_GRAPH_URL}/me`,
  tokenVerificationUrl: `${META_GRAPH_URL}/debug_token`,

  // Required scopes for Facebook + Instagram functionality
  // NOTE: Only request scopes that are approved in your Meta app
  scopes: [
    // Facebook Page permissions (approved)
    'pages_show_list',           // List Facebook Pages
    'pages_manage_posts',        // Publish posts to Facebook Pages (REQUIRED FOR FB POSTING)
    'pages_read_engagement',     // Page engagement metrics
    'pages_read_user_content',   // Read posts/comments on Pages (REQUIRED FOR FB ANALYTICS)
    // Instagram permissions (approved)
    'instagram_basic',           // Basic IG account info
    'instagram_content_publish', // Publish content to Instagram (REQUIRED FOR IG POSTING)
    'instagram_manage_insights', // Instagram analytics
    // NOTE: The following require additional Meta approval:
    // - publish_video: For video uploads to FB Pages
    // - business_management: For business account management
  ],

  capabilities: {
    supportsRefresh: true,          // Long-lived tokens can be refreshed
    supportsTokenVerification: true, // debug_token endpoint available
    tokensExpire: true,             // Tokens have expiration
    requiresPKCE: false,            // Meta doesn't require PKCE
    supportsTokenExchange: true,    // Short → Long token exchange
  },

  // Additional OAuth parameters Meta requires
  additionalAuthParams: {
    response_type: 'code',
    display: 'popup',
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL for Meta OAuth
 *
 * Constructs the Facebook OAuth dialog URL with all required parameters.
 * User will be redirected here to grant permissions.
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getMetaConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  // Build redirect URI if not provided
  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/meta/callback`;

  // Combine default scopes with any additional requested scopes
  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];
  const scopeString = allScopes.join(',');

  // Build authorization URL with all parameters
  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', scopeString);
  authUrl.searchParams.set('response_type', 'code');

  // Add additional params from config
  if (config.additionalAuthParams) {
    Object.entries(config.additionalAuthParams).forEach(([key, value]) => {
      if (!authUrl.searchParams.has(key)) {
        authUrl.searchParams.set(key, value);
      }
    });
  }

  return {
    url: authUrl.toString(),
    state: params.state,
  };
}

/**
 * Exchange authorization code for access token
 *
 * Meta returns a short-lived token (1 hour) from this exchange.
 * We'll exchange it for a long-lived token in a separate step.
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getMetaConfig();

  try {
    const tokenUrl = new URL(config.tokenUrl);
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('redirect_uri', params.redirectUri);
    tokenUrl.searchParams.set('code', params.code);

    const response = await fetch(tokenUrl.toString(), {
      method: 'GET', // Meta uses GET for token exchange
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenExchangeError(
        'meta',
        errorData.error?.message || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    // Meta returns: access_token, token_type, expires_in
    if (!data.access_token) {
      throw new TokenExchangeError('meta', 'No access token in response');
    }

    // Calculate expiration timestamp
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      expiresAt,
      raw: data,
    };
  } catch (error) {
    if (error instanceof TokenExchangeError) {
      throw error;
    }
    throw new TokenExchangeError(
      'meta',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Exchange short-lived token for long-lived token
 *
 * Meta's short-lived tokens last ~1 hour. Long-lived tokens last ~60 days.
 * This is a critical step for production use.
 *
 * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */
async function exchangeForLongLivedToken(shortLivedToken: string): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getMetaConfig();

  try {
    const exchangeUrl = new URL(`${META_GRAPH_URL}/oauth/access_token`);
    exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token');
    exchangeUrl.searchParams.set('client_id', clientId);
    exchangeUrl.searchParams.set('client_secret', clientSecret);
    exchangeUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const response = await fetch(exchangeUrl.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenExchangeError(
        'meta',
        `Long-lived token exchange failed: ${errorData.error?.message || response.status}`
      );
    }

    const data = await response.json();

    // Long-lived tokens typically last 60 days (~5184000 seconds)
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      expiresAt,
      raw: data,
    };
  } catch (error) {
    if (error instanceof TokenExchangeError) {
      throw error;
    }
    throw new TokenExchangeError(
      'meta',
      error instanceof Error ? error.message : 'Token exchange failed'
    );
  }
}

/**
 * Refresh an expiring long-lived token
 *
 * Long-lived tokens can be refreshed if they're less than 60 days old
 * but more than 24 hours old. The new token will be valid for another 60 days.
 *
 * Note: Meta's refresh mechanism is actually re-exchanging the existing
 * long-lived token for a new one, not using a separate refresh_token.
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getMetaConfig();

  try {
    // Meta refreshes by exchanging the existing long-lived token
    // The "refreshToken" here is actually the current access token
    const refreshUrl = new URL(`${META_GRAPH_URL}/oauth/access_token`);
    refreshUrl.searchParams.set('grant_type', 'fb_exchange_token');
    refreshUrl.searchParams.set('client_id', clientId);
    refreshUrl.searchParams.set('client_secret', clientSecret);
    refreshUrl.searchParams.set('fb_exchange_token', params.refreshToken);

    const response = await fetch(refreshUrl.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenRefreshError(
        'meta',
        errorData.error?.message || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      // For Meta, the "refresh token" is the access token itself
      refreshToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      expiresAt,
      raw: data,
    };
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      throw error;
    }
    throw new TokenRefreshError(
      'meta',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * Verify token validity using debug_token endpoint
 *
 * This endpoint returns detailed information about a token:
 * - Whether it's valid
 * - Scopes granted
 * - App ID and user ID
 * - Expiration time
 *
 * @see https://developers.facebook.com/docs/graph-api/reference/v21.0/debug_token
 */
async function verifyToken(params: TokenVerificationParams): Promise<TokenVerificationResult> {
  const { clientId, clientSecret } = getMetaConfig();

  try {
    // App access token for debug_token endpoint
    const appAccessToken = `${clientId}|${clientSecret}`;

    const debugUrl = new URL(config.tokenVerificationUrl!);
    debugUrl.searchParams.set('input_token', params.accessToken);
    debugUrl.searchParams.set('access_token', appAccessToken);

    const response = await fetch(debugUrl.toString());

    if (!response.ok) {
      throw new TokenVerificationError('meta', `HTTP ${response.status}`);
    }

    const data = await response.json();
    const tokenData = data.data;

    if (!tokenData) {
      throw new TokenVerificationError('meta', 'No token data in response');
    }

    // Check if token is valid
    const isValid = tokenData.is_valid === true;

    return {
      isValid,
      scopes: tokenData.scopes || [],
      expiresAt: tokenData.expires_at
        ? new Date(tokenData.expires_at * 1000)
        : undefined,
      userId: tokenData.user_id,
      appId: tokenData.app_id,
      metadata: {
        type: tokenData.type,
        granularScopes: tokenData.granular_scopes,
        issuedAt: tokenData.issued_at
          ? new Date(tokenData.issued_at * 1000)
          : undefined,
        dataAccessExpiresAt: tokenData.data_access_expires_at
          ? new Date(tokenData.data_access_expires_at * 1000)
          : undefined,
      },
    };
  } catch (error) {
    if (error instanceof TokenVerificationError) {
      throw error;
    }
    throw new TokenVerificationError(
      'meta',
      error instanceof Error ? error.message : 'Verification failed'
    );
  }
}

/**
 * Fetch user identity and connected accounts
 *
 * For Meta, we need to:
 * 1. Get basic user info
 * 2. Get connected Facebook Pages
 * 3. Get Instagram Business Accounts linked to those Pages
 *
 * This provides a complete picture of what the user has access to.
 */
async function getIdentity(params: IdentityParams): Promise<ProviderIdentity> {
  try {
    // Step 1: Get basic user info
    const userUrl = new URL(config.identityUrl);
    userUrl.searchParams.set('fields', 'id,name,email');
    userUrl.searchParams.set('access_token', params.accessToken);

    const userResponse = await fetch(userUrl.toString());

    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => ({}));
      throw new IdentityFetchError(
        'meta',
        errorData.error?.message || `HTTP ${userResponse.status}`
      );
    }

    const userData = await userResponse.json();

    // Step 2: Get Facebook Pages the user manages
    const pages = await getConnectedPages(params.accessToken);

    // Step 3: Get Instagram Business Accounts linked to Pages
    const instagramAccounts = await getInstagramBusinessAccounts(
      params.accessToken,
      pages
    );

    return {
      providerAccountId: userData.id,
      displayName: userData.name,
      email: userData.email,
      metadata: {
        facebookUserId: userData.id,
        facebookName: userData.name,
        pages,
        instagramAccounts,
        // Store the first IG account as primary (if any)
        primaryInstagramAccount: instagramAccounts[0] || null,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'meta',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Connected Page data structure
 */
interface FacebookPage {
  id: string;
  name: string;
  accessToken: string; // Page access token
  category?: string;
}

/**
 * Get Facebook Pages the user manages
 */
async function getConnectedPages(accessToken: string): Promise<FacebookPage[]> {
  try {
    const pagesUrl = new URL(`${META_GRAPH_URL}/me/accounts`);
    pagesUrl.searchParams.set('fields', 'id,name,access_token,category');
    pagesUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(pagesUrl.toString());

    if (!response.ok) {
      console.error('[Meta] Failed to fetch pages:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map((page: Record<string, unknown>) => ({
      id: page.id as string,
      name: page.name as string,
      accessToken: page.access_token as string,
      category: page.category as string,
    }));
  } catch (error) {
    console.error('[Meta] Error fetching pages:', error);
    return [];
  }
}

/**
 * Instagram Business Account data structure
 */
interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  linkedPageId: string;
  linkedPageName: string;
}

/**
 * Get Instagram Business Accounts linked to Facebook Pages
 *
 * Instagram Business Accounts are accessed through their connected Facebook Page.
 * Each Page can have one Instagram account linked to it.
 */
async function getInstagramBusinessAccounts(
  accessToken: string,
  pages: FacebookPage[]
): Promise<InstagramAccount[]> {
  const instagramAccounts: InstagramAccount[] = [];

  for (const page of pages) {
    try {
      // Use page access token to get linked Instagram account
      const igUrl = new URL(`${META_GRAPH_URL}/${page.id}`);
      igUrl.searchParams.set(
        'fields',
        'instagram_business_account{id,username,name,profile_picture_url,followers_count}'
      );
      igUrl.searchParams.set('access_token', page.accessToken);

      const response = await fetch(igUrl.toString());

      if (!response.ok) {
        continue; // Page might not have an Instagram account linked
      }

      const data = await response.json();
      const igAccount = data.instagram_business_account;

      if (igAccount) {
        instagramAccounts.push({
          id: igAccount.id,
          username: igAccount.username,
          name: igAccount.name,
          profilePictureUrl: igAccount.profile_picture_url,
          followersCount: igAccount.followers_count,
          linkedPageId: page.id,
          linkedPageName: page.name,
        });
      }
    } catch (error) {
      console.error(`[Meta] Error fetching IG account for page ${page.id}:`, error);
    }
  }

  return instagramAccounts;
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * Meta OAuth provider implementation
 */
export const metaProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(metaProvider);

export default metaProvider;

// ============================================
// ADDITIONAL EXPORTS FOR DIRECT API USE
// ============================================

/**
 * Make authenticated request to Meta Graph API
 *
 * Use this for making additional API calls with stored tokens
 */
export async function metaGraphRequest<T = unknown>(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${META_GRAPH_URL}${endpoint}`);
  url.searchParams.set('access_token', accessToken);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ProviderApiError(
      'meta',
      errorData.error?.message || `HTTP ${response.status}`,
      errorData
    );
  }

  return response.json();
}

/**
 * Get Instagram insights for a specific media object
 *
 * @param mediaId - Instagram media ID
 * @param accessToken - Valid access token
 * @param metrics - Metrics to fetch
 */
export async function getInstagramMediaInsights(
  mediaId: string,
  accessToken: string,
  metrics: string[] = ['impressions', 'reach', 'engagement', 'saved']
): Promise<unknown> {
  return metaGraphRequest(
    `/${mediaId}/insights`,
    accessToken,
    { metric: metrics.join(',') }
  );
}

/**
 * Get Instagram account insights
 *
 * @param accountId - Instagram Business Account ID
 * @param accessToken - Valid access token
 * @param metrics - Metrics to fetch
 * @param period - Time period (day, week, days_28, month, lifetime)
 */
export async function getInstagramAccountInsights(
  accountId: string,
  accessToken: string,
  metrics: string[] = ['impressions', 'reach', 'follower_count'],
  period: string = 'day'
): Promise<unknown> {
  return metaGraphRequest(
    `/${accountId}/insights`,
    accessToken,
    { metric: metrics.join(','), period }
  );
}
