/**
 * OAuth Error Definitions
 *
 * Custom error classes for the OAuth system that provide:
 * - Specific error codes for different failure scenarios
 * - HTTP status code mapping for API responses
 * - User-friendly messages separate from technical details
 *
 * Error handling strategy:
 * - Catch provider-specific errors and wrap them in these classes
 * - Never expose internal details (tokens, secrets) in error messages
 * - Log detailed errors server-side, return safe messages to clients
 */

import type { OAuthProvider } from './types';

/**
 * Base class for all OAuth-related errors
 */
export class OAuthError extends Error {
  /** Machine-readable error code */
  public readonly code: string;

  /** HTTP status code for API responses */
  public readonly httpStatus: number;

  /** Provider that caused the error (if applicable) */
  public readonly provider?: OAuthProvider;

  /** Safe message for client response (no sensitive data) */
  public readonly userMessage: string;

  constructor(
    message: string,
    code: string,
    httpStatus: number = 500,
    provider?: OAuthProvider,
    userMessage?: string
  ) {
    super(message);
    this.name = 'OAuthError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.provider = provider;
    // Default user message strips any potentially sensitive info
    this.userMessage = userMessage || 'An authentication error occurred. Please try again.';

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to safe JSON response
   */
  toJSON() {
    return {
      error: this.userMessage,
      code: this.code,
      provider: this.provider,
    };
  }
}

// ============================================
// CONFIGURATION ERRORS
// ============================================

/**
 * Provider is not configured or missing required credentials
 */
export class ProviderNotConfiguredError extends OAuthError {
  constructor(provider: OAuthProvider) {
    super(
      `Provider "${provider}" is not configured. Check environment variables.`,
      'PROVIDER_NOT_CONFIGURED',
      500,
      provider,
      `${provider} integration is not available. Please contact support.`
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

/**
 * Unknown/unsupported provider requested
 */
export class UnknownProviderError extends OAuthError {
  constructor(provider: string) {
    super(
      `Unknown OAuth provider: "${provider}"`,
      'UNKNOWN_PROVIDER',
      400,
      undefined,
      'The requested service is not supported.'
    );
    this.name = 'UnknownProviderError';
  }
}

/**
 * Missing required environment variable
 */
export class MissingConfigError extends OAuthError {
  constructor(configKey: string, provider?: OAuthProvider) {
    super(
      `Missing required configuration: ${configKey}`,
      'MISSING_CONFIG',
      500,
      provider,
      'Service configuration error. Please contact support.'
    );
    this.name = 'MissingConfigError';
  }
}

// ============================================
// AUTHORIZATION FLOW ERRORS
// ============================================

/**
 * OAuth state parameter validation failed (CSRF protection)
 */
export class InvalidStateError extends OAuthError {
  constructor(provider?: OAuthProvider) {
    super(
      'OAuth state parameter mismatch - possible CSRF attack',
      'INVALID_STATE',
      400,
      provider,
      'Authentication session expired or invalid. Please try again.'
    );
    this.name = 'InvalidStateError';
  }
}

/**
 * No authorization code received from provider
 */
export class MissingCodeError extends OAuthError {
  constructor(provider?: OAuthProvider) {
    super(
      'No authorization code received from OAuth provider',
      'MISSING_CODE',
      400,
      provider,
      'Authentication was not completed. Please try again.'
    );
    this.name = 'MissingCodeError';
  }
}

/**
 * User denied OAuth permission request
 */
export class AccessDeniedError extends OAuthError {
  constructor(provider?: OAuthProvider, reason?: string) {
    super(
      `User denied OAuth access: ${reason || 'No reason provided'}`,
      'ACCESS_DENIED',
      400,
      provider,
      'You declined to grant access. Please try again if this was a mistake.'
    );
    this.name = 'AccessDeniedError';
  }
}

// ============================================
// TOKEN ERRORS
// ============================================

/**
 * Token exchange failed
 */
export class TokenExchangeError extends OAuthError {
  constructor(provider: OAuthProvider, details?: string) {
    super(
      `Token exchange failed for ${provider}: ${details || 'Unknown error'}`,
      'TOKEN_EXCHANGE_FAILED',
      500,
      provider,
      'Failed to complete authentication. Please try again.'
    );
    this.name = 'TokenExchangeError';
  }
}

/**
 * Token refresh failed
 */
export class TokenRefreshError extends OAuthError {
  constructor(provider: OAuthProvider, details?: string) {
    super(
      `Token refresh failed for ${provider}: ${details || 'Unknown error'}`,
      'TOKEN_REFRESH_FAILED',
      500,
      provider,
      'Session refresh failed. Please reconnect your account.'
    );
    this.name = 'TokenRefreshError';
  }
}

/**
 * Token verification failed
 */
export class TokenVerificationError extends OAuthError {
  constructor(provider: OAuthProvider, details?: string) {
    super(
      `Token verification failed for ${provider}: ${details || 'Unknown error'}`,
      'TOKEN_VERIFICATION_FAILED',
      401,
      provider,
      'Your session could not be verified. Please reconnect your account.'
    );
    this.name = 'TokenVerificationError';
  }
}

/**
 * Token is expired
 */
export class TokenExpiredError extends OAuthError {
  constructor(provider: OAuthProvider) {
    super(
      `Access token expired for ${provider}`,
      'TOKEN_EXPIRED',
      401,
      provider,
      'Your session has expired. Please reconnect your account.'
    );
    this.name = 'TokenExpiredError';
  }
}

/**
 * Token was revoked by user or provider
 */
export class TokenRevokedError extends OAuthError {
  constructor(provider: OAuthProvider) {
    super(
      `Access token was revoked for ${provider}`,
      'TOKEN_REVOKED',
      401,
      provider,
      'Access to your account was revoked. Please reconnect.'
    );
    this.name = 'TokenRevokedError';
  }
}

// ============================================
// IDENTITY ERRORS
// ============================================

/**
 * Failed to fetch user identity from provider
 */
export class IdentityFetchError extends OAuthError {
  constructor(provider: OAuthProvider, details?: string) {
    super(
      `Failed to fetch identity from ${provider}: ${details || 'Unknown error'}`,
      'IDENTITY_FETCH_FAILED',
      500,
      provider,
      'Could not retrieve your account information. Please try again.'
    );
    this.name = 'IdentityFetchError';
  }
}

// ============================================
// CONNECTION ERRORS
// ============================================

/**
 * No OAuth connection found for user/provider
 */
export class ConnectionNotFoundError extends OAuthError {
  constructor(provider: OAuthProvider) {
    super(
      `No OAuth connection found for provider: ${provider}`,
      'CONNECTION_NOT_FOUND',
      404,
      provider,
      'Account is not connected. Please connect first.'
    );
    this.name = 'ConnectionNotFoundError';
  }
}

/**
 * Connection already exists (when trying to create duplicate)
 */
export class ConnectionExistsError extends OAuthError {
  constructor(provider: OAuthProvider) {
    super(
      `OAuth connection already exists for provider: ${provider}`,
      'CONNECTION_EXISTS',
      409,
      provider,
      'This account is already connected.'
    );
    this.name = 'ConnectionExistsError';
  }
}

// ============================================
// ENCRYPTION ERRORS
// ============================================

/**
 * Token encryption failed
 */
export class EncryptionError extends OAuthError {
  constructor(operation: 'encrypt' | 'decrypt') {
    super(
      `Token ${operation}ion failed`,
      `${operation.toUpperCase()}_FAILED`,
      500,
      undefined,
      'A security error occurred. Please try again.'
    );
    this.name = 'EncryptionError';
  }
}

// ============================================
// RATE LIMIT ERRORS
// ============================================

/**
 * Provider API rate limit exceeded
 */
export class RateLimitError extends OAuthError {
  /** Seconds until rate limit resets */
  public readonly retryAfter?: number;

  constructor(provider: OAuthProvider, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      provider,
      'Too many requests. Please wait a moment and try again.'
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// ============================================
// AUTHENTICATION ERRORS
// ============================================

/**
 * User is not authenticated
 */
export class NotAuthenticatedError extends OAuthError {
  constructor() {
    super(
      'User is not authenticated',
      'NOT_AUTHENTICATED',
      401,
      undefined,
      'Please log in to continue.'
    );
    this.name = 'NotAuthenticatedError';
  }
}

// ============================================
// PROVIDER API ERRORS
// ============================================

/**
 * Generic provider API error
 */
export class ProviderApiError extends OAuthError {
  /** Original error from provider */
  public readonly providerError?: unknown;

  constructor(provider: OAuthProvider, message: string, providerError?: unknown) {
    super(
      `${provider} API error: ${message}`,
      'PROVIDER_API_ERROR',
      502,
      provider,
      `An error occurred while communicating with ${provider}. Please try again.`
    );
    this.name = 'ProviderApiError';
    this.providerError = providerError;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if an error is an OAuthError
 */
export function isOAuthError(error: unknown): error is OAuthError {
  return error instanceof OAuthError;
}

/**
 * Wrap unknown errors in a generic OAuthError
 * Ensures we never expose raw error details to clients
 */
export function wrapError(error: unknown, provider?: OAuthProvider): OAuthError {
  if (isOAuthError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'Unknown error';

  // Log the actual error server-side for debugging
  console.error('[OAuth Error]', { provider, error });

  return new OAuthError(
    message,
    'INTERNAL_ERROR',
    500,
    provider,
    'An unexpected error occurred. Please try again.'
  );
}

/**
 * Create error response object for API routes
 */
export function createErrorResponse(error: OAuthError) {
  return {
    status: error.httpStatus,
    body: error.toJSON(),
  };
}
