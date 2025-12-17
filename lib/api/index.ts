/**
 * API Utilities
 *
 * Provides utilities for building API routes:
 * - Handler wrappers with logging and error handling
 * - Request parsing helpers
 * - Response helpers
 * - Validation integration
 */

export {
  // Handler creators
  createHandler,
  publicHandler,
  authHandler,
  rateLimitedHandler,
  tierHandler,

  // Validated handlers
  createValidatedHandler,
  validatedAuthHandler,
  validatedPublicHandler,

  // Utilities
  compose,
  withErrorBoundary,

  // Request parsing
  parseBody,
  requireBody,
  getParams,
  getParam,
  requireParam,

  // Types
  type RouteContext,
  type RouteHandler,
  type AuthenticatedRouteHandler,
  type HandlerOptions,
  type ValidatedRouteHandler,
  type ValidatedHandlerOptions,
} from './handler';

// Re-export error helpers for convenience
export {
  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
} from '@/lib/errors';

// Re-export validation for convenience
export {
  validateBody,
  validateQuery,
  validateParams,
  z,
} from '@/lib/validation';
