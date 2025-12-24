/**
 * Middleware Route Configuration
 *
 * Centralized configuration for route protection in Next.js middleware.
 * Defines which routes are public, protected, and tier-restricted.
 */

import type { UserTier } from '@prisma/client';

// ============================================
// ROUTE TYPES
// ============================================

export interface RouteConfig {
  /** Route path or pattern */
  path: string;
  /** Whether to match as prefix (default: false for exact match) */
  prefix?: boolean;
}

export interface ProtectedRouteConfig extends RouteConfig {
  /** Minimum tier required (default: any authenticated user) */
  requiredTier?: UserTier;
  /** Whether email verification is required (default: false) */
  requireVerifiedEmail?: boolean;
  /** Custom redirect URL if not authenticated */
  redirectTo?: string;
}

// ============================================
// PUBLIC ROUTES - No authentication required
// ============================================

/**
 * Routes that are accessible without authentication
 */
export const PUBLIC_ROUTES: RouteConfig[] = [
  // Landing pages
  { path: '/' },
  { path: '/about' },
  { path: '/pricing' },
  { path: '/contact' },
  { path: '/terms' },
  { path: '/privacy' },

  // Authentication pages
  { path: '/login' },
  { path: '/signup' },
  { path: '/logout' },
  { path: '/reset-password' },
  { path: '/forgot-password' },
  { path: '/verify-email' },

  // Auth flow pages
  { path: '/auth/callback' },
  { path: '/auth/confirm' },
  { path: '/auth/verify-email' },
  { path: '/auth/error' },

  // Public API routes
  { path: '/api/auth', prefix: true },
  { path: '/api/tiers' }, // Public tier info
  { path: '/api/public', prefix: true },
  { path: '/api/webhooks', prefix: true }, // Webhook endpoints (Meta, etc.)
  { path: '/api/admin', prefix: true }, // Admin endpoints (use API key auth)
  { path: '/api/waitlist', prefix: true }, // Waitlist signup
  { path: '/admin', prefix: true }, // Admin pages (use API key auth)
  { path: '/api/team/invites/validate' }, // Invite validation (no auth needed)
  { path: '/api/team/invites/accept' }, // Invite acceptance (auth handled in route)
  { path: '/api/oauth/connect', prefix: true }, // OAuth initiation (returns auth URL)
  { path: '/api/oauth/callback', prefix: true }, // OAuth callback (handles code exchange)
  { path: '/api/oauth/disconnect', prefix: true }, // OAuth disconnect
  { path: '/api/oauth/status', prefix: true }, // OAuth status check

  // Public share pages
  { path: '/share', prefix: true },

  // Team invite page (needs to be public for new users)
  { path: '/team/invite' },

  // Data deletion status (Meta requirement)
  { path: '/data-deletion-status' },
];

/**
 * Patterns for public routes (regex)
 */
export const PUBLIC_PATTERNS: RegExp[] = [
  // Next.js internals
  /^\/_next\/.*/,

  // Static files
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /^\/manifest\.json$/,
  /^\/site\.webmanifest$/,

  // Static assets
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/,

  // Health check
  /^\/api\/health$/,
];

// ============================================
// PROTECTED ROUTES - Authentication required
// ============================================

/**
 * Routes that require authentication
 */
export const PROTECTED_ROUTES: ProtectedRouteConfig[] = [
  // Dashboard - any authenticated user
  { path: '/dashboard', prefix: true },

  // Content management
  { path: '/upload', prefix: true },
  { path: '/schedule', prefix: true },
  { path: '/posts', prefix: true },

  // Settings - require verified email
  { path: '/settings', prefix: true, requireVerifiedEmail: true },

  // Analytics - any authenticated user
  { path: '/analytics', prefix: true },

  // Generate (AI features) - Creator tier required
  { path: '/generate', prefix: true, requiredTier: 'CREATOR' },

  // Team features - Pro tier required
  { path: '/team', prefix: true, requiredTier: 'PRO' },

  // API routes - Pro tier required
  { path: '/api-keys', prefix: true, requiredTier: 'PRO' },
];

/**
 * API routes that require authentication
 */
export const PROTECTED_API_ROUTES: ProtectedRouteConfig[] = [
  // User profile
  { path: '/api/profile', prefix: true },

  // Tier management (needs auth to see current tier)
  { path: '/api/tiers/current' },
  { path: '/api/tiers/upgrade' },
  { path: '/api/tiers/downgrade' },

  // OAuth management
  { path: '/api/oauth', prefix: true },

  // Platform connections
  { path: '/api/platforms', prefix: true },

  // Content
  { path: '/api/posts', prefix: true },
  { path: '/api/schedule', prefix: true },
  { path: '/api/uploads', prefix: true },

  // Analytics
  { path: '/api/analytics', prefix: true },

  // AI features - Creator+
  { path: '/api/generate', prefix: true, requiredTier: 'CREATOR' },
  { path: '/api/ai', prefix: true, requiredTier: 'CREATOR' },

  // Team - Pro only
  { path: '/api/team', prefix: true, requiredTier: 'PRO' },
];

// ============================================
// ROUTE MATCHING UTILITIES
// ============================================

/**
 * Check if a route matches a config
 */
export function matchRoute(pathname: string, config: RouteConfig): boolean {
  if (config.prefix) {
    return pathname.startsWith(config.path);
  }
  return pathname === config.path;
}

/**
 * Check if pathname is a public route
 */
export function isPublicRoute(pathname: string): boolean {
  // Check exact matches and prefixes
  for (const route of PUBLIC_ROUTES) {
    if (matchRoute(pathname, route)) {
      return true;
    }
  }

  // Check patterns
  for (const pattern of PUBLIC_PATTERNS) {
    if (pattern.test(pathname)) {
      return true;
    }
  }

  return false;
}

/**
 * Find matching protected route config
 */
export function findProtectedRoute(
  pathname: string
): ProtectedRouteConfig | null {
  // Check page routes
  for (const route of PROTECTED_ROUTES) {
    if (matchRoute(pathname, route)) {
      return route;
    }
  }

  // Check API routes
  for (const route of PROTECTED_API_ROUTES) {
    if (matchRoute(pathname, route)) {
      return route;
    }
  }

  return null;
}

/**
 * Check if pathname is an API route
 */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// ============================================
// TIER UTILITIES
// ============================================

const TIER_LEVELS: Record<UserTier, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
};

/**
 * Check if user tier meets requirement
 */
export function hasTierAccess(
  userTier: UserTier,
  requiredTier: UserTier
): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

// ============================================
// REDIRECT URLS
// ============================================

export const REDIRECT_URLS = {
  /** Default login page */
  login: '/login',
  /** Verify email page */
  verifyEmail: '/auth/verify-email',
  /** Auth error page */
  authError: '/auth/error',
  /** Upgrade page for tier restrictions */
  upgrade: '/pricing',
  /** After successful login (if no redirect param) */
  afterLogin: '/dashboard',
} as const;
