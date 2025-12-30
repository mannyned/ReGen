/**
 * OAuth Types - Provider-agnostic type definitions for the universal OAuth engine
 *
 * These types define the contract that all OAuth providers must implement,
 * enabling a pluggable architecture where new providers can be added without
 * modifying core logic.
 */

// ============================================
// PROVIDER CONFIGURATION
// ============================================

/**
 * Supported OAuth providers
 * Add new providers here as the system expands
 */
export type OAuthProvider =
  | 'meta'      // Facebook + Instagram
  | 'tiktok'
  | 'google'    // YouTube
  | 'x'         // Twitter
  | 'linkedin'
  | 'snapchat';

/**
 * Provider capability flags
 * Different providers support different OAuth features
 */
export interface ProviderCapabilities {
  /** Whether the provider supports refresh tokens */
  supportsRefresh: boolean;

  /** Whether we can verify tokens via an API endpoint */
  supportsTokenVerification: boolean;

  /** Whether tokens expire (some don't, like some legacy flows) */
  tokensExpire: boolean;

  /** Whether provider requires PKCE (Proof Key for Code Exchange) */
  requiresPKCE: boolean;

  /** Whether short-lived tokens can be exchanged for long-lived ones */
  supportsTokenExchange: boolean;
}

/**
 * Static configuration for an OAuth provider
 * This never changes at runtime
 */
export interface ProviderConfig {
  /** Unique provider identifier */
  id: OAuthProvider;

  /** Human-readable name */
  displayName: string;

  /** OAuth authorization endpoint */
  authorizationUrl: string;

  /** Token exchange endpoint */
  tokenUrl: string;

  /** Token refresh endpoint (if different from tokenUrl) */
  refreshUrl?: string;

  /** User identity endpoint */
  identityUrl: string;

  /** Token verification/introspection endpoint */
  tokenVerificationUrl?: string;

  /** Required OAuth scopes */
  scopes: string[];

  /** Provider capabilities */
  capabilities: ProviderCapabilities;

  /** Additional OAuth parameters specific to this provider */
  additionalAuthParams?: Record<string, string>;
}

// ============================================
// OAUTH FLOW TYPES
// ============================================

/**
 * Parameters for generating authorization URL
 */
export interface AuthorizationUrlParams {
  /** OAuth redirect URI (must match app configuration) */
  redirectUri: string;

  /** CSRF protection state parameter */
  state: string;

  /** PKCE code verifier (if required) */
  codeVerifier?: string;

  /** Additional scopes beyond defaults */
  additionalScopes?: string[];
}

/**
 * Result of generating authorization URL
 */
export interface AuthorizationUrlResult {
  /** Full authorization URL to redirect user to */
  url: string;

  /** State parameter for verification */
  state: string;

  /** Code verifier for PKCE (store in session) */
  codeVerifier?: string;
}

/**
 * Parameters for exchanging authorization code for tokens
 */
export interface TokenExchangeParams {
  /** Authorization code from callback */
  code: string;

  /** Redirect URI (must match authorization request) */
  redirectUri: string;

  /** PKCE code verifier (if PKCE was used) */
  codeVerifier?: string;
}

/**
 * Raw token response from provider
 */
export interface TokenResponse {
  /** Access token for API calls */
  accessToken: string;

  /** Refresh token for obtaining new access tokens */
  refreshToken?: string;

  /** Token type (usually "Bearer") */
  tokenType: string;

  /** Seconds until access token expires */
  expiresIn?: number;

  /** Granted scopes (may differ from requested) */
  scope?: string;

  /** Provider-specific additional data */
  raw?: Record<string, unknown>;
}

/**
 * Token with computed expiration timestamp
 */
export interface ProcessedToken extends TokenResponse {
  /** Absolute expiration timestamp */
  expiresAt?: Date;
}

/**
 * Parameters for refreshing access token
 */
export interface RefreshTokenParams {
  /** Current refresh token */
  refreshToken: string;
}

/**
 * Parameters for verifying token validity
 */
export interface TokenVerificationParams {
  /** Token to verify */
  accessToken: string;
}

/**
 * Result of token verification
 */
export interface TokenVerificationResult {
  /** Whether the token is valid */
  isValid: boolean;

  /** Token scopes */
  scopes?: string[];

  /** Expiration timestamp */
  expiresAt?: Date;

  /** User/app ID the token belongs to */
  userId?: string;

  /** App ID the token was issued to */
  appId?: string;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

// ============================================
// IDENTITY TYPES
// ============================================

/**
 * Parameters for fetching provider identity
 */
export interface IdentityParams {
  /** Access token for API call */
  accessToken: string;
}

/**
 * Normalized identity from any provider
 */
export interface ProviderIdentity {
  /** Provider's unique ID for this account */
  providerAccountId: string;

  /** Display name / username */
  displayName?: string;

  /** Email (if available and permitted) */
  email?: string;

  /** Profile picture URL */
  avatarUrl?: string;

  /** Provider-specific metadata (pages, channels, etc.) */
  metadata?: Record<string, unknown>;
}

// ============================================
// PROVIDER INTERFACE
// ============================================

/**
 * Interface that all OAuth providers must implement
 *
 * This abstraction allows the OAuth engine to work with any provider
 * without knowing provider-specific details.
 */
export interface OAuthProviderInterface {
  /** Static provider configuration */
  config: ProviderConfig;

  /**
   * Generate the authorization URL for OAuth flow start
   */
  getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult;

  /**
   * Exchange authorization code for access/refresh tokens
   */
  exchangeCodeForToken(params: TokenExchangeParams): Promise<ProcessedToken>;

  /**
   * Refresh an expired access token
   * Optional - only implement if provider supports refresh
   */
  refreshAccessToken?(params: RefreshTokenParams): Promise<ProcessedToken>;

  /**
   * Verify token validity and get metadata
   * Optional - only implement if provider supports verification
   */
  verifyToken?(params: TokenVerificationParams): Promise<TokenVerificationResult>;

  /**
   * Fetch the authenticated user's identity
   */
  getIdentity(params: IdentityParams): Promise<ProviderIdentity>;

  /**
   * Exchange short-lived token for long-lived token
   * Optional - only implement if provider supports this (e.g., Meta)
   */
  exchangeForLongLivedToken?(accessToken: string): Promise<ProcessedToken>;
}

// ============================================
// DATABASE TYPES
// ============================================

/**
 * OAuth connection as stored in database
 */
export interface StoredOAuthConnection {
  id: string;
  profileId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessTokenEnc: string;
  refreshTokenEnc?: string | null;
  scopes: string[];
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating/updating OAuth connection
 */
export interface OAuthConnectionData {
  profileId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string | null;
  scopes: string[];
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Connection status response
 */
export interface ConnectionStatus {
  connected: boolean;
  provider: OAuthProvider;
  providerAccountId?: string;
  expiresAt?: Date | null;
  scopes?: string[];
  displayName?: string;
}

/**
 * Standard API error response
 */
export interface OAuthErrorResponse {
  error: string;
  code: string;
  provider?: OAuthProvider;
  details?: string;
}
