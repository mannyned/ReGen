/**
 * Common Zod Validation Schemas
 *
 * Reusable schemas for validating common data types across the application.
 */

import { z } from 'zod';

// ============================================
// PRIMITIVE SCHEMAS
// ============================================

/**
 * UUID v4 schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email schema with normalization
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .transform((email) => email.toLowerCase().trim());

/**
 * Password schema with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Simple password (less strict, for development)
 */
export const simplePasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be less than 128 characters');

/**
 * URL schema
 */
export const urlSchema = z.string().url('Invalid URL');

/**
 * Non-empty string
 */
export const nonEmptyStringSchema = z.string().min(1, 'This field is required');

/**
 * Trimmed non-empty string
 */
export const trimmedStringSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, 'This field is required'));

/**
 * Optional trimmed string (empty becomes undefined)
 */
export const optionalTrimmedStringSchema = z
  .string()
  .transform((s) => s.trim() || undefined)
  .optional();

// ============================================
// DATE/TIME SCHEMAS
// ============================================

/**
 * ISO date string schema
 */
export const isoDateSchema = z.string().datetime('Invalid date format');

/**
 * Date that must be in the future
 */
export const futureDateSchema = z
  .string()
  .datetime()
  .refine((date) => new Date(date) > new Date(), {
    message: 'Date must be in the future',
  });

/**
 * Date that must be in the past
 */
export const pastDateSchema = z
  .string()
  .datetime()
  .refine((date) => new Date(date) < new Date(), {
    message: 'Date must be in the past',
  });

// ============================================
// PAGINATION SCHEMAS
// ============================================

/**
 * Page number (1-indexed)
 */
export const pageSchema = z.coerce
  .number()
  .int()
  .positive()
  .default(1);

/**
 * Items per page (limit)
 */
export const limitSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(100, 'Maximum 100 items per page')
  .default(20);

/**
 * Offset for cursor-based pagination
 */
export const offsetSchema = z.coerce
  .number()
  .int()
  .nonnegative()
  .default(0);

/**
 * Cursor for cursor-based pagination
 */
export const cursorSchema = z.string().optional();

/**
 * Standard pagination query params
 */
export const paginationSchema = z.object({
  page: pageSchema,
  limit: limitSchema,
});

/**
 * Cursor-based pagination
 */
export const cursorPaginationSchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
});

// ============================================
// SORTING SCHEMAS
// ============================================

/**
 * Sort direction
 */
export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Generic sort schema factory
 */
export function createSortSchema<T extends string>(fields: readonly T[]) {
  return z.object({
    sortBy: z.enum(fields as [T, ...T[]]).optional(),
    sortDirection: sortDirectionSchema,
  });
}

// ============================================
// ID SCHEMAS
// ============================================

/**
 * Database ID (UUID)
 */
export const idSchema = uuidSchema;

/**
 * Array of IDs
 */
export const idsSchema = z.array(uuidSchema).min(1, 'At least one ID is required');

/**
 * ID in path params
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

// ============================================
// USER/AUTH SCHEMAS
// ============================================

/**
 * User tier
 */
export const tierSchema = z.enum(['FREE', 'CREATOR', 'PRO']);

/**
 * Sign up request
 */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: trimmedStringSchema.optional(),
});

/**
 * Sign in request
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Magic link request
 */
export const magicLinkSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset request
 */
export const passwordResetSchema = z.object({
  email: emailSchema,
});

/**
 * Update password request
 */
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

/**
 * Profile update
 */
export const profileUpdateSchema = z.object({
  name: trimmedStringSchema.optional(),
  avatarUrl: urlSchema.optional(),
});

// ============================================
// CONTENT SCHEMAS
// ============================================

/**
 * Post/content title
 */
export const titleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be less than 200 characters')
  .transform((s) => s.trim());

/**
 * Post/content body
 */
export const contentSchema = z
  .string()
  .max(10000, 'Content must be less than 10,000 characters')
  .transform((s) => s.trim());

/**
 * Social media caption
 */
export const captionSchema = z
  .string()
  .max(2200, 'Caption must be less than 2,200 characters') // Instagram limit
  .transform((s) => s.trim());

/**
 * Hashtags array
 */
export const hashtagsSchema = z
  .array(z.string().regex(/^#?[\w]+$/, 'Invalid hashtag format'))
  .max(30, 'Maximum 30 hashtags')
  .transform((tags) => tags.map((t) => (t.startsWith('#') ? t : `#${t}`)));

// ============================================
// FILE/UPLOAD SCHEMAS
// ============================================

/**
 * Supported image MIME types
 */
export const imageMimeTypeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/**
 * Supported video MIME types
 */
export const videoMimeTypeSchema = z.enum([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

/**
 * File size (in bytes)
 */
export const fileSizeSchema = (maxBytes: number) =>
  z.number().max(maxBytes, `File size must be less than ${formatBytes(maxBytes)}`);

/**
 * File upload metadata
 */
export const fileUploadSchema = z.object({
  filename: nonEmptyStringSchema,
  mimeType: z.string(),
  size: z.number().positive(),
});

// ============================================
// PLATFORM SCHEMAS
// ============================================

/**
 * Supported social platforms
 */
export const platformSchema = z.enum([
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'twitter',
  'linkedin',
]);

/**
 * Platform connection request
 */
export const platformConnectSchema = z.object({
  platform: platformSchema,
  returnUrl: urlSchema.optional(),
});

// ============================================
// SCHEDULING SCHEMAS
// ============================================

/**
 * Scheduled post
 */
export const scheduledPostSchema = z.object({
  content: captionSchema,
  platforms: z.array(platformSchema).min(1, 'Select at least one platform'),
  scheduledAt: futureDateSchema,
  mediaIds: z.array(uuidSchema).optional(),
});

// ============================================
// SEARCH/FILTER SCHEMAS
// ============================================

/**
 * Search query
 */
export const searchQuerySchema = z
  .string()
  .min(1, 'Search query is required')
  .max(100, 'Search query too long')
  .transform((s) => s.trim());

/**
 * Date range filter
 */
export const dateRangeSchema = z.object({
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
