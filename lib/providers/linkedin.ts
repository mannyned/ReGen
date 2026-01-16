/**
 * LinkedIn OAuth Provider
 *
 * LinkedIn uses OAuth 2.0 for their Marketing API and Sign In.
 *
 * Key characteristics:
 * - Standard OAuth 2.0 flow
 * - Access tokens expire in 60 days
 * - Refresh tokens available for some products
 * - No token verification endpoint (introspection requires special access)
 *
 * Scopes:
 * - openid: OpenID Connect
 * - profile: Basic profile (first name, last name, etc.)
 * - email: Email address
 * - w_member_social: Post on behalf of user (personal profile)
 * - w_organization_social: Post on behalf of organization (company page)
 * - r_organization_social: Read organization posts/comments/reactions
 * - rw_organization_admin: Manage organization pages and retrieve reporting data
 *
 * Note: Organization scopes require the user to be an ADMINISTRATOR of the company page.
 *
 * @see https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
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

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * Get LinkedIn OAuth configuration from environment
 */
function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('LINKEDIN_CLIENT_ID', 'linkedin');
  }
  if (!clientSecret) {
    throw new MissingConfigError('LINKEDIN_CLIENT_SECRET', 'linkedin');
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'linkedin',
  displayName: 'LinkedIn',
  authorizationUrl: LINKEDIN_AUTH_URL,
  tokenUrl: LINKEDIN_TOKEN_URL,
  identityUrl: LINKEDIN_USERINFO_URL,

  // Scopes for Sign In with LinkedIn and Organization Management
  // See: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
  scopes: [
    'openid',              // OpenID Connect
    'profile',             // Basic profile
    'email',               // Email address
    'w_member_social',     // Post on user's behalf (personal profile)
    'w_organization_social', // Post on behalf of organization (company page)
    'r_organization_social', // Read organization posts/comments/reactions
    'rw_organization_admin', // Manage organization pages and retrieve reporting data
  ],

  capabilities: {
    supportsRefresh: true,           // Refresh available for some products
    supportsTokenVerification: false, // Token introspection requires special access
    tokensExpire: true,              // Access tokens expire in 60 days
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
 * LinkedIn OAuth with standard parameters.
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getLinkedInConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/linkedin/callback`;

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
 * LinkedIn returns:
 * - access_token (60 day lifetime)
 * - expires_in (seconds)
 * - refresh_token (if approved for refresh)
 * - refresh_token_expires_in (if applicable)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getLinkedInConfig();

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
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
      throw new TokenExchangeError(
        'linkedin',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('linkedin', 'No access token in response');
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: 'Bearer',
      expiresIn: data.expires_in,
      expiresAt,
      scope: data.scope,
      raw: {
        ...data,
        refresh_token_expires_in: data.refresh_token_expires_in,
      },
    };
  } catch (error) {
    if (error instanceof TokenExchangeError) {
      throw error;
    }
    throw new TokenExchangeError(
      'linkedin',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * Note: Refresh tokens may not be available for all LinkedIn products.
 * Requires specific OAuth product access.
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getLinkedInConfig();

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
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
        'linkedin',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || params.refreshToken,
      tokenType: 'Bearer',
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
      'linkedin',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * LinkedIn doesn't have a public token verification endpoint
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
 * Fetch LinkedIn user identity
 *
 * Uses the OpenID Connect userinfo endpoint for basic profile.
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
        'linkedin',
        errorData.message || `HTTP ${response.status}`
      );
    }

    const userData = await response.json();

    // OpenID Connect userinfo response
    return {
      providerAccountId: userData.sub,
      displayName: userData.name,
      email: userData.email,
      avatarUrl: userData.picture,
      metadata: {
        linkedInId: userData.sub,
        name: userData.name,
        givenName: userData.given_name,
        familyName: userData.family_name,
        email: userData.email,
        emailVerified: userData.email_verified,
        picture: userData.picture,
        locale: userData.locale,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'linkedin',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * LinkedIn OAuth provider implementation
 */
export const linkedinProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(linkedinProvider);

export default linkedinProvider;
