/**
 * Authentication Utilities
 *
 * Exports for authentication and authorization.
 *
 * @example
 * ```ts
 * // In API routes
 * import { withAuth, requireAuth, withAuthHandler } from '@/lib/auth';
 *
 * // Get user utilities
 * import { getUser, requireUser, getUserId } from '@/lib/auth';
 *
 * // Auth flows (client-side)
 * import { signUp, signIn, signOut } from '@/lib/auth/flows';
 * ```
 */

// User utilities (legacy, still useful)
export {
  getUser,
  requireUser,
  getUserId,
  requireUserId,
  getSession,
  refreshSession,
  signOut,
  updateProfile,
  upgradeTier,
  type AuthenticatedUser,
  DEVELOPMENT_USER,
} from './getUser';

// Auth guards for API routes
export {
  withAuth,
  requireAuth,
  getAuthUser,
  withAuthHandler,
  unauthorizedResponse,
  forbiddenResponse,
  tierRequiredResponse,
  hasTierAccess,
  TIER_LEVELS,
  type AuthenticatedRequest,
  type AuthGuardOptions,
  type AuthGuardResult,
} from './guards';

// Auth flows (client-side)
export {
  signUp,
  signUpWithMagicLink,
  signIn,
  signInWithMagicLink,
  signInWithOAuth,
  signOut as clientSignOut,
  signOutAll,
  refreshSession as clientRefreshSession,
  getCurrentUser,
  isAuthenticated,
  requestPasswordReset,
  updatePassword,
  resendVerificationEmail,
  validatePassword,
  validateSignUpData,
  validateSignInData,
  isValidEmail,
  type SignUpData,
  type SignInData,
  type MagicLinkData,
  type AuthResult,
  type ValidationResult,
} from './flows';
