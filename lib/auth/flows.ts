/**
 * Authentication Flow Utilities
 *
 * Centralized auth flow logic for sign-up, sign-in, and sign-out.
 * These utilities handle the complete flow including validation,
 * API calls, profile creation, and state management.
 */

import { createClient } from '@/lib/supabase/client';
import type { AuthError, User } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface MagicLinkData {
  email: string;
}

export interface AuthResult {
  success: boolean;
  user?: User | null;
  error?: string;
  requiresConfirmation?: boolean;
  requiresVerification?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate sign-up data
 */
export function validateSignUpData(data: SignUpData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.errors[0];
    }
  }

  if (data.displayName && data.displayName.length > 50) {
    errors.displayName = 'Display name must be less than 50 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate sign-in data
 */
export function validateSignInData(data: SignInData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// SIGN UP FLOW
// ============================================

/**
 * Sign Up Flow
 *
 * 1. Validate input
 * 2. Create user in Supabase Auth
 * 3. Send confirmation email (if enabled)
 * 4. Profile is created via auth callback
 *
 * @param data - Sign up data
 * @returns Auth result
 */
export async function signUp(data: SignUpData): Promise<AuthResult> {
  // Validate input
  const validation = validateSignUpData(data);
  if (!validation.valid) {
    return {
      success: false,
      error: Object.values(validation.errors)[0],
    };
  }

  try {
    const supabase = createClient();
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
        data: {
          display_name: data.displayName || data.email.split('@')[0],
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    // Check if email confirmation is required
    const requiresConfirmation = !authData.session;

    return {
      success: true,
      user: authData.user,
      requiresConfirmation,
    };
  } catch (error) {
    console.error('[SignUp Error]', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Sign Up with Magic Link (passwordless)
 *
 * Sends a magic link email for sign-up.
 *
 * @param data - Email and optional display name
 * @returns Auth result
 */
export async function signUpWithMagicLink(data: MagicLinkData & { displayName?: string }): Promise<AuthResult> {
  if (!data.email || !isValidEmail(data.email)) {
    return {
      success: false,
      error: 'Please enter a valid email address',
    };
  }

  try {
    const supabase = createClient();
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;

    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
        data: {
          display_name: data.displayName || data.email.split('@')[0],
        },
        // This creates a new user if they don't exist
        shouldCreateUser: true,
      },
    });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    return {
      success: true,
      requiresVerification: true,
    };
  } catch (error) {
    console.error('[Magic Link SignUp Error]', error);
    return {
      success: false,
      error: 'Failed to send magic link. Please try again.',
    };
  }
}

// ============================================
// SIGN IN FLOW
// ============================================

/**
 * Sign In with Email/Password
 *
 * 1. Validate input
 * 2. Authenticate with Supabase
 * 3. Session is automatically managed via cookies
 *
 * @param data - Sign in credentials
 * @returns Auth result
 */
export async function signIn(data: SignInData): Promise<AuthResult> {
  // Validate input
  const validation = validateSignInData(data);
  if (!validation.valid) {
    return {
      success: false,
      error: Object.values(validation.errors)[0],
    };
  }

  try {
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    return {
      success: true,
      user: authData.user,
    };
  } catch (error) {
    console.error('[SignIn Error]', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Sign In with Magic Link
 *
 * Sends a magic link for passwordless sign-in.
 *
 * @param data - Email address
 * @returns Auth result
 */
export async function signInWithMagicLink(data: MagicLinkData): Promise<AuthResult> {
  if (!data.email || !isValidEmail(data.email)) {
    return {
      success: false,
      error: 'Please enter a valid email address',
    };
  }

  try {
    const supabase = createClient();
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;

    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
        // Don't create new user for sign-in
        shouldCreateUser: false,
      },
    });

    if (error) {
      // If user doesn't exist, provide helpful message
      if (error.message.includes('not found') || error.message.includes('Signups not allowed')) {
        return {
          success: false,
          error: 'No account found with this email. Please sign up first.',
        };
      }
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    return {
      success: true,
      requiresVerification: true,
    };
  } catch (error) {
    console.error('[Magic Link SignIn Error]', error);
    return {
      success: false,
      error: 'Failed to send magic link. Please try again.',
    };
  }
}

/**
 * Sign In with OAuth Provider
 *
 * Initiates OAuth flow with Google or Apple.
 *
 * @param provider - OAuth provider
 * @param redirectTo - URL to redirect after auth
 * @returns Auth result (always succeeds as it redirects)
 */
export async function signInWithOAuth(
  provider: 'google' | 'apple',
  redirectTo: string = '/dashboard'
): Promise<AuthResult> {
  try {
    const supabase = createClient();
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        scopes: provider === 'google' ? 'openid email profile' : undefined,
      },
    });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    // OAuth redirects, so we won't reach here
    return { success: true };
  } catch (error) {
    console.error('[OAuth SignIn Error]', error);
    return {
      success: false,
      error: 'Failed to initiate sign in. Please try again.',
    };
  }
}

// ============================================
// SIGN OUT FLOW
// ============================================

/**
 * Sign Out
 *
 * 1. Clear Supabase session
 * 2. Clear any local storage data
 * 3. Return success for redirect handling
 *
 * @returns Auth result
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[SignOut Error]', error);
      // Even if there's an error, try to clear local state
    }

    // Clear any application-specific storage
    if (typeof window !== 'undefined') {
      // Clear localStorage items related to auth
      localStorage.removeItem('regen-user-preferences');
      localStorage.removeItem('regen-last-provider');

      // Clear sessionStorage
      sessionStorage.clear();
    }

    return { success: true };
  } catch (error) {
    console.error('[SignOut Error]', error);
    return {
      success: false,
      error: 'Failed to sign out. Please try again.',
    };
  }
}

/**
 * Sign Out from all devices
 *
 * Signs out the user from all sessions across devices.
 *
 * @returns Auth result
 */
export async function signOutAll(): Promise<AuthResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut({ scope: 'global' });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('regen-user-preferences');
      sessionStorage.clear();
    }

    return { success: true };
  } catch (error) {
    console.error('[SignOut All Error]', error);
    return {
      success: false,
      error: 'Failed to sign out from all devices.',
    };
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Refresh the current session
 *
 * Manually refresh the session token.
 * Usually not needed as middleware handles this automatically.
 */
export async function refreshSession(): Promise<AuthResult> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return {
        success: false,
        error: 'Session expired. Please sign in again.',
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('[Refresh Session Error]', error);
    return {
      success: false,
      error: 'Failed to refresh session.',
    };
  }
}

/**
 * Get current user
 *
 * Returns the currently authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// ============================================
// PASSWORD MANAGEMENT
// ============================================

/**
 * Request password reset email
 *
 * @param email - User's email address
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!email || !isValidEmail(email)) {
    return {
      success: false,
      error: 'Please enter a valid email address',
    };
  }

  try {
    const supabase = createClient();
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/reset-password`,
    });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Password Reset Error]', error);
    return {
      success: false,
      error: 'Failed to send reset email. Please try again.',
    };
  }
}

/**
 * Update password (after reset)
 *
 * @param newPassword - New password
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors[0],
    };
  }

  try {
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Update Password Error]', error);
    return {
      success: false,
      error: 'Failed to update password. Please try again.',
    };
  }
}

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Resend verification email
 *
 * @param email - User's email address
 */
export async function resendVerificationEmail(email: string): Promise<AuthResult> {
  if (!email || !isValidEmail(email)) {
    return {
      success: false,
      error: 'Please enter a valid email address',
    };
  }

  try {
    const supabase = createClient();
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Resend Verification Error]', error);
    return {
      success: false,
      error: 'Failed to resend verification email.',
    };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Map Supabase auth errors to user-friendly messages
 */
function mapAuthError(error: AuthError): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please verify your email address before signing in.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 8 characters long.',
    'Email rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
    'User not found': 'No account found with this email address.',
    'Invalid email or password': 'Invalid email or password. Please try again.',
  };

  // Check for partial matches
  for (const [key, message] of Object.entries(errorMap)) {
    if (error.message.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }

  // Default message
  return error.message || 'An error occurred. Please try again.';
}

// ============================================
// EXPORTS
// ============================================

export {
  mapAuthError,
};
