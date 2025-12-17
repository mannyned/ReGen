/**
 * Universal OAuth Engine
 *
 * This is the core of the provider-agnostic OAuth system. It orchestrates
 * the OAuth flow for any provider without knowing provider-specific details.
 *
 * Architecture:
 * - Engine handles: state management, token storage, flow coordination
 * - Providers handle: URLs, API calls, token exchange specifics
 * - This separation allows adding new providers without touching engine code
 *
 * Flow:
 * 1. startOAuth() - Generate auth URL and state, redirect user
 * 2. handleCallback() - Verify state, exchange code, store tokens
 * 3. refreshTokens() - Refresh expired tokens if supported
 * 4. getConnectionStatus() - Check if user is connected to provider
 * 5. disconnectProvider() - Remove stored tokens
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  OAuthProvider,
  OAuthProviderInterface,
  ProcessedToken,
  ProviderIdentity,
  ConnectionStatus,
  OAuthConnectionData,
} from './types';
import {
  UnknownProviderError,
  InvalidStateError,
  MissingCodeError,
  AccessDeniedError,
  ConnectionNotFoundError,
  TokenRefreshError,
  wrapError,
  OAuthError,
} from './errors';
import { encrypt, decrypt, generateSecureRandom, encryptOptional, decryptOptional } from '../crypto/encrypt';
import { prisma } from '../db';

// ============================================
// PROVIDER REGISTRY
// ============================================

/**
 * Registry of all available OAuth providers
 * Providers self-register when imported
 */
const providerRegistry = new Map<OAuthProvider, OAuthProviderInterface>();

/**
 * Register a provider with the engine
 * Called by each provider module on import
 */
export function registerProvider(provider: OAuthProviderInterface): void {
  providerRegistry.set(provider.config.id, provider);
}

/**
 * Get a registered provider by ID
 * Throws if provider not found
 */
export function getProvider(providerId: string): OAuthProviderInterface {
  const provider = providerRegistry.get(providerId as OAuthProvider);
  if (!provider) {
    throw new UnknownProviderError(providerId);
  }
  return provider;
}

/**
 * Check if a provider is registered
 */
export function isProviderRegistered(providerId: string): boolean {
  return providerRegistry.has(providerId as OAuthProvider);
}

/**
 * Get all registered providers
 */
export function getAllProviders(): OAuthProviderInterface[] {
  return Array.from(providerRegistry.values());
}

// ============================================
// COOKIE MANAGEMENT
// ============================================

/**
 * Cookie names for OAuth state management
 */
const COOKIE_NAMES = {
  STATE: 'oauth_state',
  CODE_VERIFIER: 'oauth_code_verifier',
  PROVIDER: 'oauth_provider',
} as const;

/**
 * Cookie options for security
 */
const COOKIE_OPTIONS = {
  httpOnly: true,      // Not accessible via JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax' as const, // CSRF protection while allowing OAuth redirects
  path: '/',
  maxAge: 60 * 10,     // 10 minutes - OAuth should complete quickly
};

/**
 * Set OAuth state cookies before redirect
 */
async function setOAuthCookies(
  state: string,
  provider: OAuthProvider,
  codeVerifier?: string
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAMES.STATE, state, COOKIE_OPTIONS);
  cookieStore.set(COOKIE_NAMES.PROVIDER, provider, COOKIE_OPTIONS);

  if (codeVerifier) {
    cookieStore.set(COOKIE_NAMES.CODE_VERIFIER, codeVerifier, COOKIE_OPTIONS);
  }
}

/**
 * Read and clear OAuth state cookies after callback
 */
async function consumeOAuthCookies(): Promise<{
  state: string | undefined;
  provider: string | undefined;
  codeVerifier: string | undefined;
}> {
  const cookieStore = await cookies();

  const state = cookieStore.get(COOKIE_NAMES.STATE)?.value;
  const provider = cookieStore.get(COOKIE_NAMES.PROVIDER)?.value;
  const codeVerifier = cookieStore.get(COOKIE_NAMES.CODE_VERIFIER)?.value;

  // Clear cookies after reading
  cookieStore.delete(COOKIE_NAMES.STATE);
  cookieStore.delete(COOKIE_NAMES.PROVIDER);
  cookieStore.delete(COOKIE_NAMES.CODE_VERIFIER);

  return { state, provider, codeVerifier };
}

// ============================================
// OAUTH FLOW METHODS
// ============================================

/**
 * Start OAuth flow - generate auth URL and redirect user
 *
 * @param providerId - Provider to authenticate with
 * @param profileId - Current authenticated user's profile ID (UUID from Supabase)
 * @returns Redirect response to provider's auth page
 */
export async function startOAuth(
  providerId: string,
  profileId: string
): Promise<{ authUrl: string; state: string }> {
  const provider = getProvider(providerId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  // Generate secure state parameter for CSRF protection
  // Encode profile ID in state so we can associate tokens after callback
  const stateData = {
    random: generateSecureRandom(16),
    profileId,
    timestamp: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  // Generate PKCE code verifier if required
  let codeVerifier: string | undefined;
  if (provider.config.capabilities.requiresPKCE) {
    codeVerifier = generateSecureRandom(32);
  }

  // Build redirect URI
  const redirectUri = `${baseUrl}/api/auth/${providerId}/callback`;

  // Get authorization URL from provider
  const authResult = provider.getAuthorizationUrl({
    redirectUri,
    state,
    codeVerifier,
  });

  // Store state in cookies for validation on callback
  await setOAuthCookies(state, provider.config.id, codeVerifier);

  return {
    authUrl: authResult.url,
    state,
  };
}

/**
 * Handle OAuth callback - validate state, exchange code, store tokens
 *
 * @param providerId - Provider this callback is for
 * @param searchParams - URL search parameters from callback
 * @returns Result with success/failure and redirect URL
 */
export async function handleCallback(
  providerId: string,
  searchParams: URLSearchParams
): Promise<{
  success: boolean;
  redirectUrl: string;
  error?: OAuthError;
}> {
  const provider = getProvider(providerId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  try {
    // Check for OAuth error response
    const errorCode = searchParams.get('error');
    if (errorCode) {
      const errorDescription = searchParams.get('error_description');
      if (errorCode === 'access_denied') {
        throw new AccessDeniedError(provider.config.id, errorDescription || undefined);
      }
      throw new OAuthError(
        `OAuth error: ${errorCode} - ${errorDescription}`,
        errorCode.toUpperCase(),
        400,
        provider.config.id
      );
    }

    // Get authorization code
    const code = searchParams.get('code');
    if (!code) {
      throw new MissingCodeError(provider.config.id);
    }

    // Get and validate state
    const returnedState = searchParams.get('state');
    const { state: storedState, codeVerifier } = await consumeOAuthCookies();

    if (!returnedState || !storedState || returnedState !== storedState) {
      throw new InvalidStateError(provider.config.id);
    }

    // Decode state to get profile ID
    let profileId: string;
    try {
      const stateData = JSON.parse(Buffer.from(storedState, 'base64url').toString());
      profileId = stateData.profileId;

      // Check if state is too old (10 minute max)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        throw new InvalidStateError(provider.config.id);
      }
    } catch {
      throw new InvalidStateError(provider.config.id);
    }

    // Build redirect URI (must match exactly)
    const redirectUri = `${baseUrl}/api/auth/${providerId}/callback`;

    // Exchange code for tokens
    let tokens = await provider.exchangeCodeForToken({
      code,
      redirectUri,
      codeVerifier,
    });

    // Exchange for long-lived token if supported
    if (provider.config.capabilities.supportsTokenExchange && provider.exchangeForLongLivedToken) {
      tokens = await provider.exchangeForLongLivedToken(tokens.accessToken);
    }

    // Verify token if supported
    if (provider.config.capabilities.supportsTokenVerification && provider.verifyToken) {
      const verification = await provider.verifyToken({ accessToken: tokens.accessToken });
      if (!verification.isValid) {
        throw new OAuthError(
          'Token verification failed',
          'TOKEN_INVALID',
          401,
          provider.config.id
        );
      }
    }

    // Fetch provider identity
    const identity = await provider.getIdentity({ accessToken: tokens.accessToken });

    // Store connection in database
    await storeConnection({
      profileId,
      provider: provider.config.id,
      providerAccountId: identity.providerAccountId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      scopes: tokens.scope?.split(/[,\s]+/) || provider.config.scopes,
      expiresAt: tokens.expiresAt,
      metadata: identity.metadata,
    });

    // Success - redirect to integrations page
    return {
      success: true,
      redirectUrl: `${baseUrl}/settings/integrations?connected=${providerId}`,
    };
  } catch (error) {
    const oauthError = wrapError(error, provider.config.id);

    // Redirect to integrations page with error
    return {
      success: false,
      redirectUrl: `${baseUrl}/settings/integrations?error=${oauthError.code}&provider=${providerId}`,
      error: oauthError,
    };
  }
}

/**
 * Refresh tokens for a provider connection
 *
 * @param providerId - Provider to refresh tokens for
 * @param profileId - Profile whose tokens to refresh
 * @returns Updated tokens
 */
export async function refreshTokens(
  providerId: string,
  profileId: string
): Promise<ProcessedToken> {
  const provider = getProvider(providerId);

  // Check if provider supports refresh
  if (!provider.config.capabilities.supportsRefresh || !provider.refreshAccessToken) {
    throw new TokenRefreshError(provider.config.id, 'Provider does not support token refresh');
  }

  // Get existing connection
  const connection = await prisma.oAuthConnection.findUnique({
    where: {
      profileId_provider: {
        profileId,
        provider: providerId,
      },
    },
  });

  if (!connection) {
    throw new ConnectionNotFoundError(provider.config.id);
  }

  // Decrypt refresh token
  const refreshToken = decryptOptional(connection.refreshTokenEnc);
  if (!refreshToken) {
    throw new TokenRefreshError(provider.config.id, 'No refresh token available');
  }

  // Refresh tokens via provider
  const newTokens = await provider.refreshAccessToken({ refreshToken });

  // Update database with new tokens
  await prisma.oAuthConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: encrypt(newTokens.accessToken),
      refreshTokenEnc: encryptOptional(newTokens.refreshToken || refreshToken),
      expiresAt: newTokens.expiresAt,
      updatedAt: new Date(),
    },
  });

  return newTokens;
}

/**
 * Get connection status for a provider
 *
 * @param providerId - Provider to check
 * @param profileId - Profile to check connection for
 * @returns Connection status
 */
export async function getConnectionStatus(
  providerId: string,
  profileId: string
): Promise<ConnectionStatus> {
  const provider = getProvider(providerId);

  const connection = await prisma.oAuthConnection.findUnique({
    where: {
      profileId_provider: {
        profileId,
        provider: providerId,
      },
    },
  });

  if (!connection) {
    return {
      connected: false,
      provider: provider.config.id,
    };
  }

  // Check if token is expired
  const isExpired = connection.expiresAt && connection.expiresAt < new Date();

  return {
    connected: !isExpired,
    provider: provider.config.id,
    providerAccountId: connection.providerAccountId,
    expiresAt: connection.expiresAt,
    scopes: connection.scopes,
    displayName: (connection.metadata as Record<string, unknown>)?.displayName as string | undefined,
  };
}

/**
 * Disconnect a provider - remove stored tokens
 *
 * @param providerId - Provider to disconnect
 * @param profileId - Profile to disconnect
 */
export async function disconnectProvider(
  providerId: string,
  profileId: string
): Promise<void> {
  const provider = getProvider(providerId);

  const result = await prisma.oAuthConnection.deleteMany({
    where: {
      profileId,
      provider: providerId,
    },
  });

  if (result.count === 0) {
    throw new ConnectionNotFoundError(provider.config.id);
  }
}

/**
 * Get decrypted access token for a provider
 * Use this when making API calls on behalf of user
 *
 * @param providerId - Provider to get token for
 * @param profileId - Profile whose token to get
 * @returns Decrypted access token
 */
export async function getAccessToken(
  providerId: string,
  profileId: string
): Promise<string> {
  const provider = getProvider(providerId);

  const connection = await prisma.oAuthConnection.findUnique({
    where: {
      profileId_provider: {
        profileId,
        provider: providerId,
      },
    },
  });

  if (!connection) {
    throw new ConnectionNotFoundError(provider.config.id);
  }

  // Check if token is expired
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    // Try to refresh if supported
    if (provider.config.capabilities.supportsRefresh && connection.refreshTokenEnc) {
      const newTokens = await refreshTokens(providerId, profileId);
      return newTokens.accessToken;
    }
    throw new OAuthError(
      'Access token expired',
      'TOKEN_EXPIRED',
      401,
      provider.config.id,
      'Your session has expired. Please reconnect your account.'
    );
  }

  return decrypt(connection.accessTokenEnc);
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Store OAuth connection in database
 * Creates or updates existing connection
 */
async function storeConnection(data: OAuthConnectionData): Promise<void> {
  const encryptedData = {
    accessTokenEnc: encrypt(data.accessToken),
    refreshTokenEnc: encryptOptional(data.refreshToken),
    scopes: data.scopes,
    expiresAt: data.expiresAt,
    metadata: data.metadata || {},
  };

  await prisma.oAuthConnection.upsert({
    where: {
      profileId_provider: {
        profileId: data.profileId,
        provider: data.provider,
      },
    },
    create: {
      profileId: data.profileId,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      ...encryptedData,
    },
    update: {
      providerAccountId: data.providerAccountId,
      ...encryptedData,
      updatedAt: new Date(),
    },
  });
}

// ============================================
// EXPORTS
// ============================================

export const OAuthEngine = {
  // Provider management
  registerProvider,
  getProvider,
  isProviderRegistered,
  getAllProviders,

  // OAuth flow
  startOAuth,
  handleCallback,
  refreshTokens,

  // Connection management
  getConnectionStatus,
  disconnectProvider,
  getAccessToken,
};

export default OAuthEngine;
