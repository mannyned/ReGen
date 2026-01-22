/**
 * Discord OAuth Provider
 *
 * Discord uses OAuth 2.0 for authentication and authorization.
 *
 * Key characteristics:
 * - Access tokens expire in 7 days
 * - Refresh tokens are long-lived
 * - Supports token refresh
 * - Token verification via user lookup endpoint
 * - No PKCE required
 *
 * Scopes:
 * - identify: Read user info (id, username, avatar, etc.)
 * - guilds: Read user's guilds/servers
 * - webhook.incoming: Create webhooks for posting to channels
 *
 * @see https://discord.com/developers/docs/topics/oauth2
 * @see https://discord.com/developers/docs/resources/user#get-current-user
 */

import type {
  OAuthProvider,
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

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const DISCORD_REVOKE_URL = 'https://discord.com/api/oauth2/token/revoke';

/**
 * Get Discord OAuth configuration from environment
 */
function getDiscordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId) {
    throw new MissingConfigError('DISCORD_CLIENT_ID', PROVIDER_ID);
  }
  if (!clientSecret) {
    throw new MissingConfigError('DISCORD_CLIENT_SECRET', PROVIDER_ID);
  }

  return { clientId, clientSecret };
}

/**
 * Provider configuration
 */
const PROVIDER_ID: OAuthProvider = 'discord';

const config: ProviderConfig = {
  id: PROVIDER_ID,
  displayName: 'Discord',
  authorizationUrl: DISCORD_AUTH_URL,
  tokenUrl: DISCORD_TOKEN_URL,
  identityUrl: DISCORD_USER_URL,

  // Scopes for Discord API
  // See: https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes
  scopes: [
    'identify',           // Read user info
    'guilds',             // Read user's guilds
    'webhook.incoming',   // Create webhooks for posting to channels
  ],

  capabilities: {
    supportsRefresh: true,           // Refresh tokens supported
    supportsTokenVerification: false, // No dedicated verification endpoint
    tokensExpire: true,              // Access tokens expire in 7 days
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
 * Discord uses standard OAuth 2.0 authorization code flow.
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

  return {
    url: authUrl.toString(),
    state: params.state,
  };
}

/**
 * Exchange authorization code for tokens
 *
 * Discord returns:
 * - access_token (7 day lifetime)
 * - refresh_token (long-lived)
 * - expires_in (seconds)
 * - token_type (Bearer)
 * - scope (granted scopes)
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
        PROVIDER_ID,
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new TokenExchangeError(PROVIDER_ID, 'No access token in response');
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
      PROVIDER_ID,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Refresh an expired access token
 *
 * Discord refresh tokens are long-lived.
 * A new refresh token may be returned with each refresh.
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
        PROVIDER_ID,
        errorData.error_description || errorData.error || `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      // Discord may return a new refresh token
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
      PROVIDER_ID,
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
        PROVIDER_ID,
        errorData.message || `HTTP ${response.status}`
      );
    }

    const userData = await response.json();

    if (!userData || !userData.id) {
      throw new IdentityFetchError(PROVIDER_ID, 'No user data in response');
    }

    // Build avatar URL if avatar hash exists
    let avatarUrl: string | undefined;
    if (userData.avatar) {
      const ext = userData.avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${ext}`;
    } else if (userData.discriminator && userData.discriminator !== '0') {
      // Default avatar for users with discriminator (legacy)
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator) % 5}.png`;
    } else {
      // Default avatar for users without discriminator (new username system)
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(BigInt(userData.id) >> 22n) % 6n}.png`;
    }

    // Format display name
    const displayName = userData.global_name || userData.username;

    return {
      providerAccountId: userData.id,
      displayName,
      email: userData.email,
      avatarUrl,
      metadata: {
        discordId: userData.id,
        username: userData.username,
        globalName: userData.global_name,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        banner: userData.banner,
        accentColor: userData.accent_color,
        locale: userData.locale,
        verified: userData.verified,
        mfaEnabled: userData.mfa_enabled,
        premiumType: userData.premium_type,
        publicFlags: userData.public_flags,
        flags: userData.flags,
      },
    };
  } catch (error) {
    if (error instanceof IdentityFetchError) {
      throw error;
    }
    throw new IdentityFetchError(
      PROVIDER_ID,
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
