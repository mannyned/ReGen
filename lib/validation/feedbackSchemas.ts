/**
 * Beta Feedback Validation Schemas
 *
 * Zod schemas for validating beta feedback form inputs.
 */

import { z } from 'zod';

// Feedback type enum matching Prisma schema
export const feedbackTypeSchema = z.enum([
  'FIRST_POST',
  'FIRST_ANALYTICS_VIEW',
  'FIRST_AUTO_SHARE',
  'GENERAL',
  'PRICING',
]);

export type FeedbackType = z.infer<typeof feedbackTypeSchema>;

// Rating validation (1-5 scale)
export const ratingSchema = z
  .number()
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must be at most 5');

// Price input validation (0-999 range)
export const priceInputSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .max(999, 'Price must be less than $1000')
  .optional();

// Main feedback form schema
export const feedbackFormSchema = z.object({
  feedbackType: feedbackTypeSchema,
  usageIntent: z
    .string()
    .max(1000, 'Usage intent must be less than 1000 characters')
    .optional(),
  featureValueRating: ratingSchema.optional(),
  usefulnessRating: ratingSchema.optional(),
  confusionPoints: z
    .string()
    .max(2000, 'Confusion points must be less than 2000 characters')
    .optional(),
  missingFeatures: z
    .string()
    .max(2000, 'Missing features must be less than 2000 characters')
    .optional(),
  creatorPriceInput: priceInputSchema,
  proPriceInput: priceInputSchema,
  additionalWorkspacePriceInput: priceInputSchema,
  additionalSeatPriceInput: priceInputSchema,
  browserInfo: z
    .string()
    .max(500, 'Browser info must be less than 500 characters')
    .optional(),
});

export type FeedbackFormInput = z.input<typeof feedbackFormSchema>;
export type FeedbackFormOutput = z.output<typeof feedbackFormSchema>;

// Dismiss feedback schema
export const dismissFeedbackSchema = z.object({
  trigger: feedbackTypeSchema,
});

export type DismissFeedbackInput = z.infer<typeof dismissFeedbackSchema>;

// Event completion schema
export const eventCompletionSchema = z.object({
  event: z.enum(['first_post', 'first_analytics', 'first_auto_share']),
});

export type EventCompletionInput = z.infer<typeof eventCompletionSchema>;
