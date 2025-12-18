/**
 * Validation Utilities
 *
 * Provides validation functions and middleware for API routes
 * using Zod schemas with integration into the error handling system.
 */

import { z, type ZodSchema, type ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, BadRequestError } from '@/lib/errors';

// ============================================
// TYPES
// ============================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

export interface ValidateOptions {
  /** Strip unknown keys from the output (default: true) */
  stripUnknown?: boolean;
  /** Custom error message prefix */
  errorMessage?: string;
}

// ============================================
// ERROR FORMATTING
// ============================================

/**
 * Format Zod errors into a field -> message map
 */
export function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    // Only keep first error per field
    if (!formatted[path]) {
      formatted[path] = issue.message;
    }
  }

  return formatted;
}

/**
 * Convert Zod error to ValidationError
 */
export function zodToValidationError(
  error: ZodError,
  message = 'Validation failed'
): ValidationError {
  const fields = formatZodErrors(error);
  return new ValidationError(message, fields);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate data against a schema
 *
 * @returns Validated data or throws ValidationError
 *
 * @example
 * ```ts
 * const data = validate(userInput, userSchema);
 * // data is typed according to schema
 * ```
 */
export function validate<T>(
  data: unknown,
  schema: ZodSchema<T>,
  options: ValidateOptions = {}
): T {
  const { stripUnknown = true, errorMessage } = options;

  const parseMethod = stripUnknown ? 'safeParse' : 'safeParse';
  const result = schema.safeParse(data);

  if (!result.success) {
    throw zodToValidationError(result.error, errorMessage);
  }

  return result.data;
}

/**
 * Validate data and return result object (doesn't throw)
 *
 * @example
 * ```ts
 * const result = validateSafe(userInput, userSchema);
 * if (!result.success) {
 *   return result.error.toResponse();
 * }
 * // result.data is validated
 * ```
 */
export function validateSafe<T>(
  data: unknown,
  schema: ZodSchema<T>,
  options: ValidateOptions = {}
): ValidationResult<T> {
  try {
    const validData = validate(data, schema, options);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Validate and return data or null (doesn't throw)
 */
export function validateOrNull<T>(
  data: unknown,
  schema: ZodSchema<T>
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate request JSON body against a schema
 *
 * @throws ValidationError if body is invalid
 * @throws BadRequestError if body is not valid JSON
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const data = await validateBody(request, createPostSchema);
 *   // data is typed and validated
 * }
 * ```
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options: ValidateOptions = {}
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }

  return validate(body, schema, options);
}

/**
 * Validate request body and return result object
 */
export async function validateBodySafe<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options: ValidateOptions = {}
): Promise<ValidationResult<T>> {
  try {
    const data = await validateBody(request, schema, options);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    if (error instanceof BadRequestError) {
      return {
        success: false,
        error: new ValidationError('Invalid request body', { body: error.message }),
      };
    }
    throw error;
  }
}

/**
 * Validate URL search params against a schema
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const params = validateQuery(request, paginationSchema);
 *   // params.page, params.limit are validated
 * }
 * ```
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options: ValidateOptions = {}
): T {
  const { searchParams } = new URL(request.url);
  const queryObject: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    const existing = queryObject[key];
    if (existing) {
      // Multiple values for same key -> array
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        queryObject[key] = [existing, value];
      }
    } else {
      queryObject[key] = value;
    }
  });

  return validate(queryObject, schema, options);
}

/**
 * Validate query params and return result object
 */
export function validateQuerySafe<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options: ValidateOptions = {}
): ValidationResult<T> {
  try {
    const data = validateQuery(request, schema, options);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Validate path params against a schema
 *
 * @example
 * ```ts
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: Promise<{ id: string }> }
 * ) {
 *   const { id } = await validateParams(params, idParamSchema);
 * }
 * ```
 */
export async function validateParams<T>(
  params: Promise<Record<string, string>>,
  schema: ZodSchema<T>,
  options: ValidateOptions = {}
): Promise<T> {
  const resolvedParams = await params;
  return validate(resolvedParams, schema, options);
}

// ============================================
// HIGHER-ORDER ROUTE HANDLERS
// ============================================

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (request: NextRequest, context: RouteContext) => Promise<NextResponse>;

/**
 * Create a route handler with automatic body validation
 *
 * @example
 * ```ts
 * export const POST = withValidation(
 *   createPostSchema,
 *   async (request, context, data) => {
 *     // data is typed and validated
 *     return NextResponse.json({ success: true });
 *   }
 * );
 * ```
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (
    request: NextRequest,
    context: RouteContext,
    data: T
  ) => Promise<NextResponse>
): RouteHandler {
  return async (request, context) => {
    const result = await validateBodySafe(request, schema);

    if (!result.success) {
      return result.error.toResponse();
    }

    return handler(request, context, result.data);
  };
}

/**
 * Create a route handler with query validation
 */
export function withQueryValidation<T>(
  schema: ZodSchema<T>,
  handler: (
    request: NextRequest,
    context: RouteContext,
    query: T
  ) => Promise<NextResponse>
): RouteHandler {
  return async (request, context) => {
    const result = validateQuerySafe(request, schema);

    if (!result.success) {
      return result.error.toResponse();
    }

    return handler(request, context, result.data);
  };
}

// ============================================
// CUSTOM SCHEMA HELPERS
// ============================================

/**
 * Create a schema that transforms string 'true'/'false' to boolean
 */
export const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val.toLowerCase() === 'true';
  });

/**
 * Create a schema that accepts comma-separated string as array
 */
export function arrayFromString<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .union([z.array(itemSchema), z.string()])
    .transform((val) => {
      if (Array.isArray(val)) return val as z.infer<typeof itemSchema>[];
      return val.split(',').map((s) => s.trim()).filter(Boolean) as z.infer<typeof itemSchema>[];
    });
}

/**
 * Create a schema for JSON string that parses to object
 */
export function jsonString<T extends z.ZodTypeAny>(schema: T) {
  return z.string().transform((str, ctx) => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON string',
      });
      return z.NEVER;
    }
  }).pipe(schema);
}

/**
 * Make all fields in schema optional for partial updates
 */
export function partialUpdate<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field is required' }
  );
}

/**
 * Create enum schema from string array
 */
export function enumFromArray<T extends string>(values: readonly T[]) {
  return z.enum(values as [T, ...T[]]);
}
