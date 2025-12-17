'use client';

/**
 * AuthButton Component
 *
 * Shows login/logout button based on authentication state.
 * Demonstrates useAuth hook usage.
 *
 * @example
 * ```tsx
 * <AuthButton />
 * ```
 */

import { useAuth } from '@/lib/supabase/hooks/useAuth';

export function AuthButton() {
  const { user, loading, signOut, signInWithOAuth } = useAuth();

  if (loading) {
    return (
      <button
        disabled
        className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md"
      >
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user.email}</span>
        <button
          onClick={signOut}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signInWithOAuth('google')}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      Sign In with Google
    </button>
  );
}

export default AuthButton;
