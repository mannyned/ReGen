import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform } from '../types/social'
import { validatePlatform, CONTENT_LIMITS } from '../config/oauth'

// ============================================
// INPUT VALIDATION UTILITIES
// ============================================

export type ValidationError = {
  field: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

// ============================================
// PLATFORM VALIDATION
// ============================================

export function validatePlatformParam(platform: string): ValidationResult {
  const errors: ValidationError[] = []

  if (!platform) {
    errors.push({ field: 'platform', message: 'Platform is required' })
  } else if (!validatePlatform(platform)) {
    errors.push({
      field: 'platform',
      message: `Invalid platform. Must be one of: instagram, tiktok, youtube, twitter, linkedin, linkedin-org, facebook, snapchat`,
    })
  }

  return { valid: errors.length === 0, errors }
}

// ============================================
// CONTENT VALIDATION
// ============================================

export function validatePublishContent(
  platform: SocialPlatform,
  content: {
    caption?: string
    hashtags?: string[]
    mediaUrl?: string
    mediaType?: string
    fileSize?: number
    duration?: number
  }
): ValidationResult {
  const errors: ValidationError[] = []
  const limits = CONTENT_LIMITS[platform]

  // Validate caption length (skip for Twitter - it auto-truncates to 280 chars)
  if (platform !== 'twitter' && content.caption && content.caption.length > limits.maxCaptionLength) {
    errors.push({
      field: 'caption',
      message: `Caption exceeds maximum length of ${limits.maxCaptionLength} characters`,
    })
  }

  // Validate hashtags
  if (content.hashtags && content.hashtags.length > limits.maxHashtags) {
    errors.push({
      field: 'hashtags',
      message: `Too many hashtags. Maximum is ${limits.maxHashtags}`,
    })
  }

  // Validate file size
  if (content.fileSize) {
    const fileSizeMb = content.fileSize / (1024 * 1024)
    if (fileSizeMb > limits.maxFileSizeMb) {
      errors.push({
        field: 'fileSize',
        message: `File exceeds maximum size of ${limits.maxFileSizeMb}MB`,
      })
    }
  }

  // Validate video duration
  if (content.duration && content.duration > limits.maxVideoLengthSeconds) {
    errors.push({
      field: 'duration',
      message: `Video exceeds maximum duration of ${limits.maxVideoLengthSeconds} seconds`,
    })
  }

  // Validate media format
  if (content.mediaUrl) {
    // Extract extension from URL, handling query parameters
    // e.g., "https://example.com/file.mp4?token=abc" -> "mp4"
    try {
      const urlPath = new URL(content.mediaUrl).pathname
      const extension = urlPath.split('.').pop()?.toLowerCase()
      // Only validate if we found a recognizable extension
      if (extension && extension.length <= 5 && !limits.supportedFormats.includes(extension)) {
        errors.push({
          field: 'mediaUrl',
          message: `File format .${extension} is not supported. Supported: ${limits.supportedFormats.join(', ')}`,
        })
      }
    } catch {
      // If URL parsing fails, skip format validation (will be caught by platform API)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ============================================
// REQUEST BODY VALIDATION
// ============================================

export async function validateRequestBody<T>(
  request: NextRequest,
  schema: {
    required: (keyof T)[]
    optional?: (keyof T)[]
    validators?: Partial<Record<keyof T, (value: unknown) => string | null>>
  }
): Promise<{ valid: boolean; data?: T; errors: ValidationError[] }> {
  const errors: ValidationError[] = []

  let body: T
  try {
    body = await request.json()
  } catch {
    return {
      valid: false,
      errors: [{ field: 'body', message: 'Invalid JSON body' }],
    }
  }

  // Check required fields
  for (const field of schema.required) {
    if (body[field] === undefined || body[field] === null) {
      errors.push({
        field: String(field),
        message: `${String(field)} is required`,
      })
    }
  }

  // Run custom validators
  if (schema.validators) {
    for (const [field, validator] of Object.entries(schema.validators)) {
      const validatorFn = validator as ((value: unknown) => string | null) | undefined
      if (validatorFn && body[field as keyof T] !== undefined) {
        const error = validatorFn(body[field as keyof T])
        if (error) {
          errors.push({ field, message: error })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    data: body,
    errors,
  }
}

// ============================================
// QUERY PARAMS VALIDATION
// ============================================

export function validateQueryParams(
  searchParams: URLSearchParams,
  required: string[]
): ValidationResult {
  const errors: ValidationError[] = []

  for (const param of required) {
    const value = searchParams.get(param)
    if (!value) {
      errors.push({
        field: param,
        message: `Query parameter ${param} is required`,
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

// ============================================
// DATE RANGE VALIDATION
// ============================================

export function validateDateRange(
  start?: string,
  end?: string
): {
  valid: boolean
  startDate?: Date
  endDate?: Date
  errors: ValidationError[]
} {
  const errors: ValidationError[] = []
  let startDate: Date | undefined
  let endDate: Date | undefined

  if (start) {
    startDate = new Date(start)
    if (isNaN(startDate.getTime())) {
      errors.push({ field: 'start', message: 'Invalid start date' })
    }
  }

  if (end) {
    endDate = new Date(end)
    if (isNaN(endDate.getTime())) {
      errors.push({ field: 'end', message: 'Invalid end date' })
    }
  }

  if (startDate && endDate && startDate > endDate) {
    errors.push({
      field: 'dateRange',
      message: 'Start date must be before end date',
    })
  }

  return {
    valid: errors.length === 0,
    startDate,
    endDate,
    errors,
  }
}

// ============================================
// RESPONSE HELPERS
// ============================================

export function validationErrorResponse(
  errors: ValidationError[]
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      details: errors,
    },
    { status: 400 }
  )
}
