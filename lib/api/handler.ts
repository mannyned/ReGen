/**
 * API Route Handler Utilities
 *
 * Provides wrappers for API routes that include:
 * - Request logging
 * - Error handling
 * - Authentication
 * - Rate limiting
 * - Request timing
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, createRequestLogger, generateRequestId, type LogContext } from '@/lib/logger';
import { handleError, isAppError, type AppError } from '@/lib/errors';
import { requireVerifiedIdentity, type VerifiedIdentity } from '@/lib/security';
import { rateLimitByTier, DEFAULT_TIER_LIMITS, type TierRateLimits } from '@/lib/rate-limit';
import type { UserTier } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

export type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: RouteContext,
  user: VerifiedIdentity
) => Promise<NextResponse>;

export interface HandlerOptions {
  /** Enable request logging (default: true) */
  logging?: boolean;
  /** Enable error handling wrapper (default: true) */
  errorHandling?: boolean;
  /** Require authentication (default: false) */
  auth?: boolean;
  /** Required tier (implies auth: true) */
  requiredTier?: UserTier;
  /** Enable rate limiting (default: false) */
  rateLimit?: boolean | TierRateLimits;
  /** Skip logging for certain status codes */
  skipLogStatuses?: number[];
}

// ============================================
// REQUEST CONTEXT
// ============================================

/**
 * Extract request context for logging
 */
function getRequestContext(request: NextRequest): LogContext {
  const url = new URL(request.url);
  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        undefined,
  };
}

// ============================================
// CREATE API HANDLER
// ============================================

/**
 * Create an API route handler with logging, error handling, and optional auth
 *
 * @example
 * ```ts
 * // Simple handler with logging and error handling
 * export const GET = createHandler(async (request) => {
 *   return NextResponse.json({ hello: 'world' });
 * });
 *
 * // With authentication
 * export const POST = createHandler(
 *   async (request, context, user) => {
 *     return NextResponse.json({ userId: user.profileId });
 *   },
 *   { auth: true }
 * );
 *
 * // With rate limiting
 * export const POST = createHandler(
 *   async (request, context, user) => {
 *     return NextResponse.json({ success: true });
 *   },
 *   { auth: true, rateLimit: true }
 * );
 * ```
 */
export function createHandler(
  handler: RouteHandler | AuthenticatedRouteHandler,
  options: HandlerOptions = {}
): RouteHandler {
  const {
    logging = true,
    errorHandling = true,
    auth = false,
    requiredTier,
    rateLimit = false,
    skipLogStatuses = [404],
  } = options;

  // If tier required, auth is also required
  const requireAuth = auth || !!requiredTier || !!rateLimit;

  return async (request: NextRequest, context: RouteContext): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Create request-scoped logger
    const requestContext = getRequestContext(request);
    const log = createRequestLogger(requestId, requestContext);

    // Log request start
    if (logging) {
      log.info(`${request.method} ${requestContext.path}`);
    }

    let response: NextResponse;
    let user: VerifiedIdentity | undefined;

    try {
      // Authentication check
      if (requireAuth) {
        const authResult = await requireVerifiedIdentity(request);

        if (authResult.response) {
          response = authResult.response;
          return finalizeResponse(response);
        }

        user = authResult.identity!;

        // Check tier requirement
        if (requiredTier) {
          const tierLevels: Record<UserTier, number> = { FREE: 0, CREATOR: 1, PRO: 2 };
          if (tierLevels[user.tier] < tierLevels[requiredTier]) {
            response = NextResponse.json(
              {
                error: `This feature requires ${requiredTier} tier or higher`,
                code: 'TIER_REQUIRED',
                requiredTier,
                currentTier: user.tier,
              },
              { status: 403 }
            );
            return finalizeResponse(response);
          }
        }

        // Rate limiting
        if (rateLimit) {
          const rateLimitConfig = typeof rateLimit === 'object' ? rateLimit : DEFAULT_TIER_LIMITS;
          const { response: rateLimitResponse } = await rateLimitByTier(
            request,
            user.tier,
            user.profileId,
            rateLimitConfig
          );

          if (rateLimitResponse) {
            response = rateLimitResponse;
            return finalizeResponse(response);
          }
        }
      }

      // Execute handler
      response = await (handler as AuthenticatedRouteHandler)(request, context, user!);

    } catch (error) {
      if (errorHandling) {
        response = handleError(error, { requestId });
      } else {
        throw error;
      }
    }

    return finalizeResponse(response);

    // Helper to finalize response with logging
    function finalizeResponse(res: NextResponse): NextResponse {
      const durationMs = Date.now() - startTime;
      const statusCode = res.status;

      // Add request ID header
      res.headers.set('X-Request-Id', requestId);

      // Log response
      if (logging && !skipLogStatuses.includes(statusCode)) {
        const logMethod = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        log[logMethod](`${request.method} ${requestContext.path} ${statusCode}`, {
          statusCode,
          durationMs,
          userId: user?.profileId,
        });
      }

      return res;
    }
  };
}

// ============================================
// CONVENIENCE HANDLERS
// ============================================

/**
 * Create a public handler (no auth required)
 */
export function publicHandler(handler: RouteHandler): RouteHandler {
  return createHandler(handler, { auth: false });
}

/**
 * Create an authenticated handler
 */
export function authHandler(handler: AuthenticatedRouteHandler): RouteHandler {
  return createHandler(handler, { auth: true });
}

/**
 * Create an authenticated handler with rate limiting
 */
export function rateLimitedHandler(
  handler: AuthenticatedRouteHandler,
  config?: TierRateLimits
): RouteHandler {
  return createHandler(handler, { auth: true, rateLimit: config || true });
}

/**
 * Create a tier-restricted handler
 */
export function tierHandler(
  requiredTier: UserTier,
  handler: AuthenticatedRouteHandler
): RouteHandler {
  return createHandler(handler, { requiredTier, rateLimit: true });
}

// ============================================
// HANDLER COMPOSITION
// ============================================

/**
 * Compose multiple middleware functions
 */
export function compose(
  ...middlewares: Array<(handler: RouteHandler) => RouteHandler>
): (handler: RouteHandler) => RouteHandler {
  return (handler: RouteHandler) => {
    return middlewares.reduceRight((h, middleware) => middleware(h), handler);
  };
}

// ============================================
// ERROR BOUNDARY
// ============================================

/**
 * Wrap a handler with error boundary (no logging, just error conversion)
 */
export function withErrorBoundary(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

// ============================================
// REQUEST PARSING HELPERS
// ============================================

/**
 * Safely parse JSON body
 */
export async function parseBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

/**
 * Parse and validate JSON body, throw on error
 */
export async function requireBody<T>(request: NextRequest): Promise<T> {
  const body = await parseBody<T>(request);
  if (body === null) {
    throw new (await import('@/lib/errors')).BadRequestError('Invalid JSON body');
  }
  return body;
}

/**
 * Get path parameters
 */
export async function getParams(context: RouteContext): Promise<Record<string, string>> {
  return context.params;
}

/**
 * Get a specific path parameter
 */
export async function getParam(context: RouteContext, name: string): Promise<string | undefined> {
  const params = await getParams(context);
  return params[name];
}

/**
 * Require a specific path parameter
 */
export async function requireParam(context: RouteContext, name: string): Promise<string> {
  const value = await getParam(context, name);
  if (!value) {
    throw new (await import('@/lib/errors')).BadRequestError(`Missing required parameter: ${name}`);
  }
  return value;
}

// ============================================
// VALIDATED HANDLERS
// ============================================

import type { ZodSchema } from 'zod';

export type ValidatedRouteHandler<TBody, TQuery = unknown> = (
  request: NextRequest,
  context: RouteContext,
  data: { body: TBody; query: TQuery; user?: VerifiedIdentity }
) => Promise<NextResponse>;

export interface ValidatedHandlerOptions<TBody, TQuery> extends HandlerOptions {
  /** Schema for request body validation */
  body?: ZodSchema<TBody>;
  /** Schema for query params validation */
  query?: ZodSchema<TQuery>;
}

/**
 * Create a handler with automatic validation
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 *
 * const bodySchema = z.object({
 *   title: z.string().min(1),
 *   content: z.string(),
 * });
 *
 * export const POST = createValidatedHandler(
 *   async (request, context, { body, user }) => {
 *     // body is typed as { title: string; content: string }
 *     return NextResponse.json({ id: '123', ...body });
 *   },
 *   { auth: true, body: bodySchema }
 * );
 * ```
 */
export function createValidatedHandler<TBody = unknown, TQuery = unknown>(
  handler: ValidatedRouteHandler<TBody, TQuery>,
  options: ValidatedHandlerOptions<TBody, TQuery>
): RouteHandler {
  const { body: bodySchema, query: querySchema, ...handlerOptions } = options;

  return createHandler(
    async (request, context, user) => {
      const { validateBody, validateQuery } = await import('@/lib/validation');

      let body: TBody = undefined as TBody;
      let query: TQuery = undefined as TQuery;

      // Validate body if schema provided
      if (bodySchema) {
        body = await validateBody(request, bodySchema);
      }

      // Validate query if schema provided
      if (querySchema) {
        query = validateQuery(request, querySchema);
      }

      return handler(request, context, { body, query, user });
    },
    handlerOptions
  );
}

/**
 * Create an authenticated handler with body validation
 */
export function validatedAuthHandler<TBody>(
  bodySchema: ZodSchema<TBody>,
  handler: (
    request: NextRequest,
    context: RouteContext,
    data: { body: TBody; user: VerifiedIdentity }
  ) => Promise<NextResponse>
): RouteHandler {
  return createValidatedHandler(
    async (request, context, { body, user }) => {
      return handler(request, context, { body, user: user! });
    },
    { auth: true, body: bodySchema }
  );
}

/**
 * Create a public handler with body validation
 */
export function validatedPublicHandler<TBody>(
  bodySchema: ZodSchema<TBody>,
  handler: (
    request: NextRequest,
    context: RouteContext,
    body: TBody
  ) => Promise<NextResponse>
): RouteHandler {
  return createValidatedHandler(
    async (request, context, { body }) => {
      return handler(request, context, body);
    },
    { auth: false, body: bodySchema }
  );
}
