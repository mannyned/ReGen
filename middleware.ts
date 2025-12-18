/**
 * Next.js Middleware
 *
 * Handles authentication and route protection using Supabase Auth.
 *
 * Security responsibilities:
 * 1. Refresh expired sessions automatically
 * 2. Protect routes that require authentication
 * 3. Enforce tier-based access control
 * 4. Require email verification for sensitive routes
 * 5. Redirect unauthenticated users to login
 *
 * SECURITY NOTE: This middleware provides the first line of defense.
 * API routes should still use requireVerifiedIdentity() for defense-in-depth.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import {
  isPublicRoute,
  findProtectedRoute,
  isApiRoute,
  hasTierAccess,
  REDIRECT_URLS,
  type ProtectedRouteConfig,
} from '@/lib/middleware/config';
import type { UserTier } from '@prisma/client';

// ============================================
// ERROR RESPONSES
// ============================================

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

function unauthorizedResponse() {
  return jsonError('Authentication required', 'UNAUTHORIZED', 401);
}

function forbiddenResponse(message: string) {
  return jsonError(message, 'FORBIDDEN', 403);
}

function tierRequiredResponse(requiredTier: UserTier, currentTier: UserTier) {
  return NextResponse.json(
    {
      error: `This feature requires ${requiredTier} tier or higher`,
      code: 'TIER_REQUIRED',
      requiredTier,
      currentTier,
      upgradeUrl: REDIRECT_URLS.upgrade,
    },
    { status: 403 }
  );
}

function emailVerificationRequired() {
  return NextResponse.json(
    {
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      verifyUrl: REDIRECT_URLS.verifyEmail,
    },
    { status: 403 }
  );
}

// ============================================
// REDIRECT HELPERS
// ============================================

function redirectToLogin(request: NextRequest, redirectTo?: string) {
  const loginUrl = new URL(REDIRECT_URLS.login, request.url);
  loginUrl.searchParams.set('redirectTo', redirectTo || request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectToVerifyEmail(request: NextRequest) {
  const verifyUrl = new URL(REDIRECT_URLS.verifyEmail, request.url);
  verifyUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
  return NextResponse.redirect(verifyUrl);
}

function redirectToUpgrade(request: NextRequest, requiredTier: UserTier) {
  const upgradeUrl = new URL(REDIRECT_URLS.upgrade, request.url);
  upgradeUrl.searchParams.set('requiredTier', requiredTier);
  upgradeUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
  return NextResponse.redirect(upgradeUrl);
}

// ============================================
// MIDDLEWARE
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Create Supabase client and refresh session
  const { supabase, response } = createClient(request);

  // Get current user - this also refreshes the session
  // SECURITY: getUser() validates the JWT with Supabase server
  // This is more secure than getSession() which only reads cookies
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Check if route requires protection
  const routeConfig = findProtectedRoute(pathname);

  // If no specific config, check if it's a protected API route
  const requiresAuth = routeConfig !== null || pathname.startsWith('/api/');

  // Handle unauthenticated requests
  if (error || !user) {
    if (!requiresAuth) {
      // Route doesn't require auth, continue
      return response;
    }

    // API routes return JSON error
    if (isApiRoute(pathname)) {
      return unauthorizedResponse();
    }

    // Page routes redirect to login
    return redirectToLogin(request);
  }

  // User is authenticated - check additional requirements
  if (routeConfig) {
    // Check email verification requirement
    if (routeConfig.requireVerifiedEmail && !user.email_confirmed_at) {
      if (isApiRoute(pathname)) {
        return emailVerificationRequired();
      }
      return redirectToVerifyEmail(request);
    }

    // Check tier requirement
    if (routeConfig.requiredTier) {
      // Get user's tier from profile
      // Note: In middleware we can't use Prisma directly, so we check via a lightweight query
      // The tier check here is a first-pass; API routes should double-check with requireVerifiedIdentity()
      const userTier = await getUserTier(supabase, user.id);

      if (!hasTierAccess(userTier, routeConfig.requiredTier)) {
        if (isApiRoute(pathname)) {
          return tierRequiredResponse(routeConfig.requiredTier, userTier);
        }
        return redirectToUpgrade(request, routeConfig.requiredTier);
      }
    }
  }

  // All checks passed - continue with request
  return response;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get user's tier from profile
 *
 * Uses Supabase client to fetch tier directly (works in edge runtime)
 */
async function getUserTier(
  supabase: Awaited<ReturnType<typeof createClient>>['supabase'],
  userId: string
): Promise<UserTier> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single<{ tier: string }>();

    if (error || !data) {
      return 'FREE';
    }

    return data.tier as UserTier;
  } catch {
    return 'FREE';
  }
}

// ============================================
// MATCHER CONFIG
// ============================================

/**
 * Configure which routes the middleware runs on
 *
 * Excludes static files and images for performance
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$).*)',
  ],
};
