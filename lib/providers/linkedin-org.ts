/**
 * LinkedIn Organization OAuth Provider (Community Management API)
 *
 * Separate LinkedIn app for organization/company page features.
 * Requires LinkedIn Community Management API approval.
 *
 * Scopes:
 * - w_organization_social: Post on behalf of organization (company page)
 * - r_organization_social: Read organization posts/comments/reactions
 * - rw_organization_admin: Manage organization pages and retrieve reporting data
 *
 * Note: These scopes require the user to be an ADMINISTRATOR of the company page.
 *
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview
 */

import type {
  OAuthProviderInterface,
  ProviderConfig,
  AuthorizationUrlParams,
  AuthorizationUrlResult,
  TokenExchangeParams,
  ProcessedToken,
  RefreshTokenParams,
  IdentityParams,
  ProviderIdentity,
  TokenVerificationParams,
  TokenVerificationResult,
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
 * Get LinkedIn Community Management OAuth configuration from environment
 * Uses separate credentials from the personal profile app
 */
function getLinkedInOrgConfig() {
  const clientId = process.env.LINKEDIN_CM_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CM_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('LINKEDIN_CM_CLIENT_ID', 'linkedin-org');
  }
  if (!clientSecret) {
    throw new MissingConfigError('LINKEDIN_CM_CLIENT_SECRET', 'linkedin-org');
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration for LinkedIn Organization/Company Page access
 */
const config: ProviderConfig = {
  id: 'linkedin-org',
  displayName: 'LinkedIn Company Page',
  authorizationUrl: LINKEDIN_AUTH_URL,
  tokenUrl: LINKEDIN_TOKEN_URL,
  identityUrl: LINKEDIN_USERINFO_URL,

  // Community Management API scopes for organization access
  scopes: [
    'openid',                  // OpenID Connect
    'profile',                 // Basic profile
    'email',                   // Email address
    'w_organization_social',   // Post on behalf of organization (company page)
    'r_organization_social',   // Read organization posts/comments/reactions
    'rw_organization_admin',   // Manage organization pages and retrieve reporting data
  ],

  capabilities: {
    supportsRefresh: true,
    supportsTokenVerification: false,
    tokensExpire: true,
    requiresPKCE: false,
    supportsTokenExchange: false,
  },
};

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * Generate authorization URL for LinkedIn Organization
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  console.log('[LinkedIn-Org] getAuthorizationUrl called');
  const { clientId } = getLinkedInOrgConfig();
  console.log('[LinkedIn-Org] Got clientId:', clientId?.substring(0, 8) + '...');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
  console.log('[LinkedIn-Org] baseUrl:', baseUrl);

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/linkedin-org/callback`;
  console.log('[LinkedIn-Org] redirectUri:', redirectUri);

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];
  console.log('[LinkedIn-Org] scopes:', allScopes.join(' '));

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(' '));
  authUrl.searchParams.set('response_type', 'code');

  console.log('[LinkedIn-Org] Final auth URL:', authUrl.toString());

  return {
    url: authUrl.toString(),
    state: params.state,
  };
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getLinkedInOrgConfig();

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
        'linkedin-org',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('linkedin-org', 'No access token in response');
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
      'linkedin-org',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getLinkedInOrgConfig();

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
        'linkedin-org',
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
      'linkedin-org',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * Verify token by fetching user info
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
        'linkedin-org',
        errorData.message || `HTTP ${response.status}`
      );
    }

    const userData = await response.json();

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
        connectionType: 'organization', // Mark this as organization connection
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'linkedin-org',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * LinkedIn Organization OAuth provider implementation
 */
export const linkedinOrgProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(linkedinOrgProvider);

export default linkedinOrgProvider;
