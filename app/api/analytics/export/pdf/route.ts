import { NextRequest, NextResponse } from 'next/server'
import { exportService } from '@/lib/services/export'
import { createRoleGuardMiddleware, type UserContext } from '@/lib/middleware/roleGuard'
import { validateDateRange, validationErrorResponse, type ValidationError } from '@/lib/middleware/validation'
import type { SocialPlatform } from '@/lib/types/social'
import type { ExportOptions, ExportFilters } from '@/lib/types/export'

// ============================================
// GET /api/analytics/export/pdf
// Export analytics data as PDF (PRO only)
// ============================================

const roleGuard = createRoleGuardMiddleware('analytics_export_pdf')

export async function GET(request: NextRequest) {
  return roleGuard(request, async (req: NextRequest, user: UserContext) => {
    try {
      const { searchParams } = new URL(req.url)

      // Parse and validate filters
      const validationResult = validateExportParams(searchParams)
      if (!validationResult.valid) {
        return validationErrorResponse(validationResult.errors)
      }

      const filters: ExportFilters = validationResult.filters!

      // Build export options
      const options: ExportOptions = {
        format: 'pdf',
        filters,
        includeCharts: searchParams.get('includeCharts') !== 'false', // Default true
        includeRetention: searchParams.get('includeRetention') === 'true',
        includeLocationData: searchParams.get('includeLocationData') !== 'false', // Default true
      }

      // Create export job
      const result = await exportService.createExport(user.userId, user.plan, options)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 429 } // Rate limited
        )
      }

      return NextResponse.json({
        success: true,
        message: 'PDF export job created',
        jobId: result.jobId,
        estimatedTime: result.estimatedTime,
        statusUrl: `/api/analytics/export/status/${result.jobId}`,
      })
    } catch (error: unknown) {
      console.error('PDF export error:', error)

      // Check for PRO_REQUIRED error
      if (error instanceof Error && (error as Error & { code?: string }).code === 'PRO_REQUIRED') {
        return NextResponse.json(
          {
            success: false,
            error: 'PRO plan required for PDF export',
            code: 'PRO_REQUIRED',
            upgradeUrl: '/settings',
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create PDF export',
        },
        { status: 500 }
      )
    }
  })
}

// ============================================
// POST /api/analytics/export/pdf
// Create PDF export with body parameters (for more complex filters)
// ============================================

export async function POST(request: NextRequest) {
  return roleGuard(request, async (req: NextRequest, user: UserContext) => {
    try {
      const body = await req.json()

      // Validate request body
      const errors: ValidationError[] = []

      // Validate date range if provided
      if (body.dateFrom || body.dateTo) {
        const dateValidation = validateDateRange(body.dateFrom, body.dateTo)
        if (!dateValidation.valid) {
          errors.push(...dateValidation.errors)
        }
      }

      // Validate platforms
      if (body.platforms) {
        const validPlatforms: SocialPlatform[] = [
          'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook', 'snapchat'
        ]
        for (const platform of body.platforms) {
          if (!validPlatforms.includes(platform)) {
            errors.push({
              field: 'platforms',
              message: `Invalid platform: ${platform}`,
            })
          }
        }
      }

      if (errors.length > 0) {
        return validationErrorResponse(errors)
      }

      // Build filters
      const filters: ExportFilters = {
        platforms: body.platforms,
        postIds: body.postIds,
        dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
        dateTo: body.dateTo ? new Date(body.dateTo) : undefined,
      }

      // Build export options
      const options: ExportOptions = {
        format: 'pdf',
        filters,
        includeCharts: body.includeCharts ?? true,
        includeRetention: body.includeRetention ?? true,
        includeLocationData: body.includeLocationData ?? true,
      }

      // Create export job
      const result = await exportService.createExport(user.userId, user.plan, options)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 429 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'PDF export job created',
        jobId: result.jobId,
        estimatedTime: result.estimatedTime,
        statusUrl: `/api/analytics/export/status/${result.jobId}`,
      })
    } catch (error: unknown) {
      console.error('PDF export error:', error)

      if (error instanceof Error && (error as Error & { code?: string }).code === 'PRO_REQUIRED') {
        return NextResponse.json(
          {
            success: false,
            error: 'PRO plan required for PDF export',
            code: 'PRO_REQUIRED',
            upgradeUrl: '/settings',
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create PDF export',
        },
        { status: 500 }
      )
    }
  })
}

// ============================================
// VALIDATION HELPER
// ============================================

function validateExportParams(searchParams: URLSearchParams): {
  valid: boolean
  errors: ValidationError[]
  filters?: ExportFilters
} {
  const errors: ValidationError[] = []

  // Parse platforms
  const platformsParam = searchParams.get('platforms')
  let platforms: SocialPlatform[] | undefined
  if (platformsParam) {
    platforms = platformsParam.split(',') as SocialPlatform[]
    const validPlatforms: SocialPlatform[] = [
      'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook', 'snapchat'
    ]
    for (const platform of platforms) {
      if (!validPlatforms.includes(platform)) {
        errors.push({
          field: 'platforms',
          message: `Invalid platform: ${platform}`,
        })
      }
    }
  }

  // Parse post IDs
  const postIdsParam = searchParams.get('postIds')
  const postIds = postIdsParam ? postIdsParam.split(',') : undefined

  // Parse and validate dates
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  let dateFromParsed: Date | undefined
  let dateToParsed: Date | undefined

  if (dateFrom) {
    dateFromParsed = new Date(dateFrom)
    if (isNaN(dateFromParsed.getTime())) {
      errors.push({ field: 'dateFrom', message: 'Invalid dateFrom format' })
    }
  }

  if (dateTo) {
    dateToParsed = new Date(dateTo)
    if (isNaN(dateToParsed.getTime())) {
      errors.push({ field: 'dateTo', message: 'Invalid dateTo format' })
    }
  }

  if (dateFromParsed && dateToParsed && dateFromParsed > dateToParsed) {
    errors.push({ field: 'dateRange', message: 'dateFrom must be before dateTo' })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    filters: {
      platforms,
      postIds,
      dateFrom: dateFromParsed,
      dateTo: dateToParsed,
    },
  }
}
