/**
 * Supabase Browser Client
 *
 * Creates a Supabase client for use in:
 * - Client Components (components with 'use client')
 * - Browser-side JavaScript
 *
 * This client uses the browser's localStorage for session management,
 * which is the standard approach for client-side auth.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Create a Supabase client for browser-side use
 *
 * This function can be called multiple times - Supabase SDK handles
 * singleton behavior internally to prevent multiple GoTrue instances.
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { createClient } from '@/lib/supabase/client';
 *
 * export function LoginButton() {
 *   const supabase = createClient();
 *
 *   const handleLogin = async () => {
 *     await supabase.auth.signInWithOAuth({
 *       provider: 'google',
 *       options: {
 *         redirectTo: `${window.location.origin}/auth/callback`,
 *       },
 *     });
 *   };
 *
 *   return <button onClick={handleLogin}>Sign in with Google</button>;
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default createClient;
