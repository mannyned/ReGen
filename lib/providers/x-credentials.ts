/**
 * X (Twitter) BYOK Credentials Management
 *
 * This module is separated from the main x.ts provider to avoid
 * circular dependencies with the OAuth engine.
 */

/**
 * User-provided credentials for BYOK support
 */
export interface XUserCredentials {
  clientId: string;
  clientSecret: string;
}

// Thread-local storage for user credentials during OAuth flow
let currentUserCredentials: XUserCredentials | null = null;

/**
 * Set user credentials for the current request
 * Call this before initiating OAuth or making API calls
 */
export function setUserCredentials(credentials: XUserCredentials | null): void {
  currentUserCredentials = credentials;
}

/**
 * Get current user credentials (if set)
 */
export function getUserCredentials(): XUserCredentials | null {
  return currentUserCredentials;
}

/**
 * Check if BYOK credentials are required (no env vars configured)
 */
export function isXByokRequired(): boolean {
  const clientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET;
  return !clientId || !clientSecret;
}
