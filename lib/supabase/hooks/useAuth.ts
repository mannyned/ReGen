'use client';

/**
 * useAuth Hook - Client-side authentication state management
 *
 * Provides real-time authentication state for React components.
 * Automatically subscribes to auth changes and updates state.
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useAuth } from '@/lib/supabase/hooks/useAuth';
 *
 * export function ProfileButton() {
 *   const { user, loading, signOut } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *   if (!user) return <LoginButton />;
 *
 *   return (
 *     <div>
 *       <span>{user.email}</span>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthState {
  /** Current authenticated user, or null if not authenticated */
  user: User | null;
  /** Current session, or null if not authenticated */
  session: Session | null;
  /** Whether auth state is still loading */
  loading: boolean;
  /** Any auth error that occurred */
  error: AuthError | null;
}

export interface UseAuthReturn extends AuthState {
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Sign in with email and password */
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /** Sign in with magic link */
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  /** Sign in with OAuth provider */
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: AuthError | null }>;
  /** Sign up with email and password */
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
  /** Refresh the current session */
  refreshSession: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  // Initialize auth state and subscribe to changes
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setState(prev => ({ ...prev, loading: false, error }));
          return;
        }

        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as AuthError,
        }));
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        }));

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          // Clear any app-specific state here if needed
        }
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
    }
  }, []);

  // Sign in with email/password
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
    }
    return { error };
  }, []);

  // Sign in with magic link
  const signInWithMagicLink = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setState(prev => ({ ...prev, loading: false, error: error || null }));
    return { error };
  }, []);

  // Sign in with OAuth
  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'google' ? 'openid email profile' : undefined,
      },
    });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
    }
    return { error };
  }, []);

  // Sign up
  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: metadata,
      },
    });
    setState(prev => ({ ...prev, loading: false, error: error || null }));
    return { error };
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      setState(prev => ({ ...prev, error }));
    } else {
      setState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
      }));
    }
  }, []);

  return {
    ...state,
    signOut,
    signInWithPassword,
    signInWithMagicLink,
    signInWithOAuth,
    signUp,
    refreshSession,
  };
}

export default useAuth;
