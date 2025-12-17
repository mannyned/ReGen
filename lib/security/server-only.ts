/**
 * Server-Only Security Utilities
 *
 * CRITICAL: This module must ONLY be imported on the server.
 * Importing on the client will throw an error.
 *
 * Security principles:
 * 1. Never trust frontend user IDs
 * 2. Always derive identity from Supabase session
 * 3. Never expose tokens to frontend
 * 4. Service role key is server-only
 */

import 'server-only';

// ============================================
// ENVIRONMENT VALIDATION
// ============================================

/**
 * Required environment variables for security
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const SERVER_ONLY_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OAUTH_ENCRYPTION_KEY',
  'DATABASE_URL',
] as const;

/**
 * Validate that all required environment variables are set
 * @throws Error if any required variable is missing
 */
export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Check if service role key is available (for admin operations)
 */
export function hasServiceRoleKey(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Get service role key (throws if not available)
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for this operation. ' +
      'This key must never be exposed to the client.'
    );
  }
  return key;
}

/**
 * Get OAuth encryption key (throws if not available)
 * @throws Error if OAUTH_ENCRYPTION_KEY is not set
 */
export function getOAuthEncryptionKey(): string {
  const key = process.env.OAUTH_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'OAUTH_ENCRYPTION_KEY is required for OAuth token encryption. ' +
      'Generate with: openssl rand -hex 32'
    );
  }
  return key;
}

// ============================================
// BLOCKED PATTERNS - Things that should NEVER happen
// ============================================

/**
 * Patterns that indicate security violations
 */
export const SECURITY_VIOLATIONS = {
  /** User ID from request body - NEVER trust this */
  USER_ID_IN_BODY: 'userId',
  /** User ID from query params - NEVER trust this */
  USER_ID_IN_QUERY: 'userId',
  /** Profile ID from request - NEVER trust this */
  PROFILE_ID_IN_REQUEST: 'profileId',
} as const;

/**
 * Check if a request contains untrusted user identification
 * This should be called in development to catch security issues
 *
 * @param body - Request body object
 * @returns Array of security warnings
 */
export function checkUntrustedInput(body: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  if ('userId' in body) {
    warnings.push(
      'SECURITY: Request body contains "userId". ' +
      'User identity should be derived from session, not request body.'
    );
  }

  if ('profileId' in body) {
    warnings.push(
      'SECURITY: Request body contains "profileId". ' +
      'Profile identity should be derived from session, not request body.'
    );
  }

  if ('user_id' in body) {
    warnings.push(
      'SECURITY: Request body contains "user_id". ' +
      'User identity should be derived from session, not request body.'
    );
  }

  return warnings;
}

/**
 * Log security warnings in development
 */
export function logSecurityWarnings(warnings: string[]): void {
  if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
    console.warn('\n========== SECURITY WARNINGS ==========');
    warnings.forEach((w) => console.warn(`  ${w}`));
    console.warn('========================================\n');
  }
}

// ============================================
// SECURE PATTERNS
// ============================================

/**
 * Assertions for secure patterns
 */
export const SecurityAssertions = {
  /**
   * Assert that we're running on the server
   * @throws Error if called from client
   */
  assertServer(): void {
    if (typeof window !== 'undefined') {
      throw new Error(
        'SECURITY: This code must only run on the server. ' +
        'Client-side execution is forbidden.'
      );
    }
  },

  /**
   * Assert that a value was derived from session, not user input
   * Use this to document security-critical code paths
   */
  assertFromSession(value: string, name: string): void {
    if (!value) {
      throw new Error(
        `SECURITY: ${name} must be derived from authenticated session, ` +
        'not from user input or request parameters.'
      );
    }
  },
};
