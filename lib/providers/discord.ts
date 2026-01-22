/**
 * Discord OAuth Provider
 *
 * Discord uses OAuth 2.0 with refresh tokens.
 *
 * Key characteristics:
 * - Standard OAuth 2.0 flow
 * - Access tokens expire in 7 days
 * - Refresh tokens don't expire (unless revoked)
 * - webhook.incoming scope allows creating webhooks during OAuth
 *
 * Scopes:
 * - identify: Access user identity
 * - guilds: Access user's servers
 * - webhook.incoming: Create webhooks for posting
 *
 * @see https://discord.com/developers/docs/topics/oauth2
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

const DISCORD_AUTH_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/v10/users/@me';
const DISCORD_REVOKE_URL = 'https://discord.com/api/oauth2/token/revoke';

/**
 * Get Discord OAuth configuration from environment
 */
function getDiscordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('DISCORD_CLIENT_ID', 'discord');
  }
  if (!clientSecret) {
    throw new MissingConfigError('DISCORD_CLIENT_SECRET', 'discord');
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration
 */
const config: ProviderConfig = {
  id: 'discord',
  displayName: 'Discord',
  authorizationUrl: DISCORD_AUTH_URL,
  tokenUrl: DISCORD_TOKEN_URL,
  identityUrl: DISCORD_USER_URL,

  // Scopes for Discord API
  // Note: webhook.incoming removed temporarily - users will provide webhook URL manually
  scopes: [
    'identify',           // Access user identity
    'guilds',             // Access user's servers
  ],

  capabilities: {
    supportsRefresh: true,           // Refresh tokens supported
    supportsTokenVerification: false, // No dedicated verification endpoint
    tokensExpire: true,              // Access tokens expire in ~7 days
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
 * Discord OAuth requires response_type=code for authorization code flow
 */
function getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
  const { clientId } = getDiscordConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  const redirectUri = params.redirectUri || `${baseUrl}/api/auth/discord/callback`;

  const allScopes = [...config.scopes, ...(params.additionalScopes || [])];

  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', params.state);
  authUrl.searchParams.set('scope', allScopes.join(' ')); // Space-separated scopes
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('prompt', 'consent'); // Always show consent screen

  const finalUrl = authUrl.toString();
  console.log('[Discord OAuth] Authorization URL:', finalUrl);
  console.log('[Discord OAuth] redirect_uri param:', redirectUri);

  return {
    url: finalUrl,
    state: params.state,
  };
}

/**
 * Exchange authorization code for tokens
 *
 * Discord returns:
 * - access_token (~7 day lifetime)
 * - refresh_token (doesn't expire)
 * - expires_in (seconds)
 * - token_type (Bearer)
 * - scope (granted scopes)
 * - webhook (if webhook.incoming scope granted)
 */
async function exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getDiscordConfig();

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
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
        'discord',
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError('discord', 'No access token in response');
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
      'discord',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(params: RefreshTokenParams): Promise<ProcessedToken> {
  const { clientId, clientSecret } = getDiscordConfig();

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
        'discord',
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
      'discord',
      error instanceof Error ? error.message : 'Token refresh failed'
    );
  }
}

/**
 * Discord doesn't have a token verification endpoint
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
 * Fetch Discord user identity
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
        'discord',
        errorData.message || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.id) {
      throw new IdentityFetchError('discord', 'No user data in response');
    }

    // Discord avatar URL construction
    const avatarUrl = data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(data.discriminator || '0') % 5}.png`;

    return {
      providerAccountId: data.id,
      displayName: data.global_name || data.username,
      avatarUrl,
      metadata: {
        discordId: data.id,
        username: data.username,
        globalName: data.global_name,
        discriminator: data.discriminator,
        avatar: data.avatar,
        email: data.email,
        verified: data.verified,
        mfaEnabled: data.mfa_enabled,
        banner: data.banner,
        accentColor: data.accent_color,
        locale: data.locale,
        premiumType: data.premium_type,
        publicFlags: data.public_flags,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      'discord',
      error instanceof Error ? error.message : 'Failed to fetch identity'
    );
  }
}

// ============================================
// PROVIDER EXPORT
// ============================================

/**
 * Discord OAuth provider implementation
 */
export const discordProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

// Register provider with the engine
registerProvider(discordProvider);

export default discordProvider;
