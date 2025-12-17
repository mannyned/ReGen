/**
 * Validation Module
 *
 * Provides Zod-based validation for API routes.
 *
 * @example
 * ```ts
 * import { validateBody, createPostSchema } from '@/lib/validation';
 *
 * export async function POST(request: NextRequest) {
 *   const data = await validateBody(request, createPostSchema);
 *   // data is typed and validated
 * }
 * ```
 */

// Re-export Zod for convenience
export { z } from 'zod';
export type { ZodSchema, ZodError, ZodIssue } from 'zod';

// Validation functions
export {
  // Core validation
  validate,
  validateSafe,
  validateOrNull,

  // Request validation
  validateBody,
  validateBodySafe,
  validateQuery,
  validateQuerySafe,
  validateParams,

  // Error formatting
  formatZodErrors,
  zodToValidationError,

  // Higher-order handlers
  withValidation,
  withQueryValidation,

  // Schema helpers
  booleanFromString,
  arrayFromString,
  jsonString,
  partialUpdate,
  enumFromArray,

  // Types
  type ValidationResult,
  type ValidateOptions,
} from './validate';

// Common schemas
export {
  // Primitives
  uuidSchema,
  emailSchema,
  passwordSchema,
  simplePasswordSchema,
  urlSchema,
  nonEmptyStringSchema,
  trimmedStringSchema,
  optionalTrimmedStringSchema,

  // Date/time
  isoDateSchema,
  futureDateSchema,
  pastDateSchema,

  // Pagination
  pageSchema,
  limitSchema,
  offsetSchema,
  cursorSchema,
  paginationSchema,
  cursorPaginationSchema,

  // Sorting
  sortDirectionSchema,
  createSortSchema,

  // IDs
  idSchema,
  idsSchema,
  idParamSchema,

  // User/Auth
  tierSchema,
  signUpSchema,
  signInSchema,
  magicLinkSchema,
  passwordResetSchema,
  updatePasswordSchema,
  profileUpdateSchema,

  // Content
  titleSchema,
  contentSchema,
  captionSchema,
  hashtagsSchema,

  // Files
  imageMimeTypeSchema,
  videoMimeTypeSchema,
  fileSizeSchema,
  fileUploadSchema,

  // Platform
  platformSchema,
  platformConnectSchema,

  // Scheduling
  scheduledPostSchema,

  // Search/Filter
  searchQuerySchema,
  dateRangeSchema,
} from './schemas';
