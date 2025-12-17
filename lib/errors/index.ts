/**
 * Custom Error Classes and Error Handling Utilities
 *
 * Provides structured error handling across the application:
 * - Custom error classes with HTTP status codes
 * - Error serialization for API responses
 * - Error logging integration
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ============================================
// ERROR CODES
// ============================================

export const ErrorCode = {
  // Authentication (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization (403)
  FORBIDDEN: 'FORBIDDEN',
  TIER_REQUIRED: 'TIER_REQUIRED',
  FEATURE_UNAVAILABLE: 'FEATURE_UNAVAILABLE',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Not Found (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Bad Request (400)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Conflict (409)
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Server Errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  OAUTH_ERROR: 'OAUTH_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',

  // Service Unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

// ============================================
// BASE APP ERROR
// ============================================

export interface AppErrorOptions {
  /** HTTP status code */
  statusCode?: number;
  /** Error code for client identification */
  code?: ErrorCode;
  /** Additional details to include in response */
  details?: Record<string, unknown>;
  /** Original error that caused this */
  cause?: Error | unknown;
  /** Whether to log this error */
  shouldLog?: boolean;
}

/**
 * Base application error class
 *
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error | unknown;
  public readonly shouldLog: boolean;
  public readonly timestamp: string;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = options.statusCode || 500;
    this.code = options.code || ErrorCode.INTERNAL_ERROR;
    this.details = options.details;
    this.cause = options.cause;
    this.shouldLog = options.shouldLog ?? true;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      error: this.message,
      code: this.code,
      timestamp: this.timestamp,
    };

    if (this.details) {
      Object.assign(json, this.details);
    }

    return json;
  }

  /**
   * Convert error to NextResponse
   */
  toResponse(): NextResponse {
    return NextResponse.json(this.toJSON(), { status: this.statusCode });
  }
}

// ============================================
// SPECIFIC ERROR CLASSES
// ============================================

/**
 * Authentication error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', options?: Omit<AppErrorOptions, 'statusCode'>) {
    super(message, {
      ...options,
      statusCode: 401,
      code: options?.code || ErrorCode.UNAUTHORIZED,
    });
    this.name = 'UnauthorizedError';
  }
}

/**
 * Authorization error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', options?: Omit<AppErrorOptions, 'statusCode'>) {
    super(message, {
      ...options,
      statusCode: 403,
      code: options?.code || ErrorCode.FORBIDDEN,
    });
    this.name = 'ForbiddenError';
  }
}

/**
 * Tier requirement error (403)
 */
export class TierRequiredError extends AppError {
  constructor(
    requiredTier: string,
    currentTier?: string,
    options?: Omit<AppErrorOptions, 'statusCode' | 'code'>
  ) {
    super(`This feature requires ${requiredTier} tier or higher`, {
      ...options,
      statusCode: 403,
      code: ErrorCode.TIER_REQUIRED,
      details: {
        requiredTier,
        currentTier,
        upgradeUrl: '/pricing',
        ...options?.details,
      },
    });
    this.name = 'TierRequiredError';
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', options?: Omit<AppErrorOptions, 'statusCode'>) {
    super(`${resource} not found`, {
      ...options,
      statusCode: 404,
      code: options?.code || ErrorCode.NOT_FOUND,
      shouldLog: false, // Don't log 404s by default
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(
    message = 'Validation failed',
    fields?: Record<string, string>,
    options?: Omit<AppErrorOptions, 'statusCode' | 'code'>
  ) {
    super(message, {
      ...options,
      statusCode: 400,
      code: ErrorCode.VALIDATION_ERROR,
      details: { fields, ...options?.details },
      shouldLog: false, // Don't log validation errors
    });
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', options?: Omit<AppErrorOptions, 'statusCode'>) {
    super(message, {
      ...options,
      statusCode: 400,
      code: options?.code || ErrorCode.BAD_REQUEST,
      shouldLog: false,
    });
    this.name = 'BadRequestError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', options?: Omit<AppErrorOptions, 'statusCode'>) {
    super(message, {
      ...options,
      statusCode: 409,
      code: options?.code || ErrorCode.CONFLICT,
      shouldLog: false,
    });
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(
    retryAfter: number,
    limit?: number,
    options?: Omit<AppErrorOptions, 'statusCode' | 'code'>
  ) {
    super('Too many requests', {
      ...options,
      statusCode: 429,
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      details: { retryAfter, limit, ...options?.details },
      shouldLog: false,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * External service error (502/503)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message?: string,
    options?: Omit<AppErrorOptions, 'statusCode' | 'code'>
  ) {
    super(message || `${service} service error`, {
      ...options,
      statusCode: 502,
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      details: { service, ...options?.details },
    });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database error', options?: Omit<AppErrorOptions, 'statusCode' | 'code'>) {
    super(message, {
      ...options,
      statusCode: 500,
      code: ErrorCode.DATABASE_ERROR,
    });
    this.name = 'DatabaseError';
  }
}

// ============================================
// ERROR HANDLING UTILITIES
// ============================================

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, {
      cause: error,
      code: ErrorCode.INTERNAL_ERROR,
    });
  }

  return new AppError('An unexpected error occurred', {
    cause: error,
    code: ErrorCode.INTERNAL_ERROR,
  });
}

/**
 * Handle error and return appropriate response
 */
export function handleError(error: unknown, context?: Record<string, unknown>): NextResponse {
  const appError = toAppError(error);

  // Log error if configured
  if (appError.shouldLog) {
    logger.logError(appError.message, appError, {
      code: appError.code,
      statusCode: appError.statusCode,
      ...context,
    });
  }

  return appError.toResponse();
}

/**
 * Create a safe error handler wrapper for route handlers
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  }) as T;
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Create an error response from code and message
 */
export function errorResponse(
  message: string,
  code: ErrorCode = ErrorCode.INTERNAL_ERROR,
  status = 500,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      timestamp: new Date().toISOString(),
      ...details,
    },
    { status }
  );
}
