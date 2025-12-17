/**
 * Middleware Utilities
 *
 * Centralized exports for middleware configuration and helpers.
 */

export {
  // Route configuration
  PUBLIC_ROUTES,
  PUBLIC_PATTERNS,
  PROTECTED_ROUTES,
  PROTECTED_API_ROUTES,
  REDIRECT_URLS,

  // Route matching
  matchRoute,
  isPublicRoute,
  findProtectedRoute,
  isApiRoute,

  // Tier utilities
  hasTierAccess,

  // Types
  type RouteConfig,
  type ProtectedRouteConfig,
} from './config';
