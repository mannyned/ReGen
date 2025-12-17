/**
 * Security Utilities
 *
 * Centralized exports for security-related functionality.
 *
 * IMPORTANT: Most exports from this module are server-only.
 * Attempting to import them on the client will cause an error.
 *
 * @example
 * ```ts
 * // In API routes (server-only)
 * import {
 *   requireVerifiedIdentity,
 *   verifyOwnership,
 *   validateEnvironment,
 * } from '@/lib/security';
 *
 * export async function GET(request: NextRequest) {
 *   const { identity, response } = await requireVerifiedIdentity(request);
 *   if (response) return response;
 *
 *   // identity.profileId is safe - derived from session
 * }
 * ```
 */

// Server-only utilities
export {
  validateEnvironment,
  hasServiceRoleKey,
  getServiceRoleKey,
  getOAuthEncryptionKey,
  checkUntrustedInput,
  logSecurityWarnings,
  SecurityAssertions,
  SECURITY_VIOLATIONS,
} from './server-only';

// Identity derivation (server-only)
export {
  getVerifiedIdentity,
  requireVerifiedIdentity,
  requireVerifiedIdentityWithTier,
  verifyOwnership,
  requireOwnership,
  type VerifiedIdentity,
  type IdentityResult,
} from './identity';

// Environment validation (server-only)
export {
  validateSecurityEnv,
  requireValidEnv,
  isServerOnlyEnvSafe,
  type ValidationResult,
} from './env-check';
