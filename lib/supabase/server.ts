/**
 * Supabase Server Client
 *
 * Creates a Supabase client for use in:
 * - Server Components
 * - Route Handlers (API routes)
 * - Server Actions
 *
 * This client uses cookies for session management, which is required
 * for server-side authentication in Next.js App Router.
 *
 * SECURITY: This module is server-only. Attempting to import it
 * on the client will throw an error.
 *
 * Why use @supabase/ssr?
 * - Handles cookie-based session storage automatically
 * - Works seamlessly with Next.js middleware
 * - Supports Server Components and Route Handlers
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

// SECURITY: Ensure this module is never imported on the client
import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Create a Supabase client for server-side use
 *
 * Call this function in Server Components, Route Handlers, or Server Actions.
 * Each call creates a fresh client with the current cookies.
 *
 * @example
 * ```ts
 * // In a Route Handler
 * export async function GET() {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 *
 * // In a Server Component
 * export default async function Page() {
 *   const supabase = await createClient();
 *   const { data: profile } = await supabase
 *     .from('profiles')
 *     .select('*')
 *     .single();
 *   // ...
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Get a cookie by name
         */
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        /**
         * Set a cookie
         * Note: This will throw in Server Components (read-only)
         * Works fine in Route Handlers and Server Actions
         */
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },

        /**
         * Remove a cookie
         */
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase admin client with service role key
 *
 * WARNING: Only use this on the server side!
 * The service role key bypasses Row Level Security.
 *
 * Use cases:
 * - Creating users programmatically
 * - Admin operations
 * - Background jobs
 *
 * @example
 * ```ts
 * const adminClient = createAdminClient();
 * const { data, error } = await adminClient.auth.admin.createUser({
 *   email: 'user@example.com',
 *   password: 'securepassword',
 * });
 * ```
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export default createClient;
