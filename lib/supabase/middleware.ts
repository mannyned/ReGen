/**
 * Supabase Middleware Client
 *
 * Creates a Supabase client for use in Next.js middleware.
 *
 * The middleware client is responsible for:
 * - Refreshing expired sessions automatically
 * - Setting updated session cookies in responses
 * - Protecting routes that require authentication
 *
 * This is crucial for maintaining user sessions across requests.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

/**
 * Create a Supabase client for middleware use
 *
 * This function handles session refresh and updates cookies in the response.
 *
 * @param request - Next.js request object
 * @returns Object containing supabase client and response
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { createClient } from '@/lib/supabase/middleware';
 *
 * export async function middleware(request: NextRequest) {
 *   const { supabase, response } = createClient(request);
 *
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 *   if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
 *     return NextResponse.redirect(new URL('/login', request.url));
 *   }
 *
 *   return response;
 * }
 * ```
 */
export function createClient(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Get a cookie from the request
         */
        get(name: string) {
          return request.cookies.get(name)?.value;
        },

        /**
         * Set a cookie in the response
         *
         * This is called when the session is refreshed.
         * We need to update the response with the new cookie.
         */
        set(name: string, value: string, options: CookieOptions) {
          // Update the request cookies for downstream handlers
          request.cookies.set({
            name,
            value,
            ...options,
          });

          // Create a new response with the updated cookie
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          // Set the cookie in the response
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },

        /**
         * Remove a cookie from the response
         */
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  return { supabase, response };
}

export default createClient;
