/**
 * Supabase Client Exports
 *
 * This file provides convenient exports for Supabase clients.
 *
 * Usage:
 * - Server Components/Route Handlers: import { createServerClient } from '@/lib/supabase'
 * - Client Components: import { createBrowserClient } from '@/lib/supabase'
 * - Middleware: import { createMiddlewareClient } from '@/lib/supabase'
 * - React Hooks: import { useAuth } from '@/lib/supabase/hooks'
 */

// Server-side client (for Server Components, Route Handlers, Server Actions)
export { createClient as createServerClient, createAdminClient } from './server';

// Browser-side client (for Client Components)
export { createClient as createBrowserClient } from './client';

// Middleware client (for Next.js middleware)
export { createClient as createMiddlewareClient } from './middleware';

// React Hooks (for Client Components)
export { useAuth, type AuthState, type UseAuthReturn } from './hooks';

// Types
export type { Database, Profile, UserTier, Tables, TablesInsert, TablesUpdate } from './types';
