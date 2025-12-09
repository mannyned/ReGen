import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform } from '@/lib/types/social'
import { analyticsService } from '@/lib/services/analytics/AnalyticsService'
import { validatePlatformParam, validateDateRange, validationErrorResponse } from '@/lib/middleware/validation'
import { createRateLimitMiddleware } from '@/lib/middleware/rateLimit'

// ============================================
// GET /api/analytics
// Get analytics for a user across platforms
// ============================================

export async function GET(request: NextRequest) {
  const rateLimitMiddleware = createRateLimitMiddleware('analytics')

  return rateLimitMiddleware(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('userId')
      const platform = searchParams.get('platform')
      const type = searchParams.get('type') || 'account' // account, post, location, retention, save-rate
      const postId = searchParams.get('postId')
      const startDate = searchParams.get('start')
      const endDate = searchParams.get('end')

      if (!userId) {
        return validationErrorResponse([{ field: 'userId', message: 'userId is required' }])
      }

      // Set default date range (last 30 days)
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const dateRange = {
        start: startDate ? new Date(startDate) : thirtyDaysAgo,
        end: endDate ? new Date(endDate) : now,
      }

      // Validate date range if provided
      if (startDate || endDate) {
        const dateValidation = validateDateRange(startDate || undefined, endDate || undefined)
        if (!dateValidation.valid) {
          return validationErrorResponse(dateValidation.errors)
        }
        if (dateValidation.startDate) dateRange.start = dateValidation.startDate
        if (dateValidation.endDate) dateRange.end = dateValidation.endDate
      }

      // Aggregated analytics (all platforms)
      if (type === 'aggregated' || !platform) {
        const aggregated = await analyticsService.getAggregatedAnalytics(userId, dateRange)
        return NextResponse.json({
          success: true,
          type: 'aggregated',
          data: aggregated,
          dateRange,
        })
      }

      // Validate platform
      const platformValidation = validatePlatformParam(platform)
      if (!platformValidation.valid) {
        return validationErrorResponse(platformValidation.errors)
      }

      const validPlatform = platform as SocialPlatform

      // Handle different analytics types
      switch (type) {
        case 'account': {
          const accountAnalytics = await analyticsService.getAccountAnalytics(
            userId,
            validPlatform,
            dateRange
          )
          return NextResponse.json({
            success: true,
            type: 'account',
            platform: validPlatform,
            data: accountAnalytics,
            dateRange,
          })
        }

        case 'location': {
          const locationData = await analyticsService.getLocationAnalytics(userId, validPlatform)
          return NextResponse.json({
            success: true,
            type: 'location',
            platform: validPlatform,
            data: locationData,
          })
        }

        case 'retention': {
          if (!postId) {
            return validationErrorResponse([
              { field: 'postId', message: 'postId is required for retention analytics' },
            ])
          }
          const retentionData = await analyticsService.getRetentionAnalytics(
            userId,
            validPlatform,
            postId
          )
          return NextResponse.json({
            success: true,
            type: 'retention',
            platform: validPlatform,
            postId,
            data: retentionData,
          })
        }

        case 'save-rate': {
          const saveRateData = await analyticsService.getSaveRateAnalytics(
            userId,
            validPlatform,
            dateRange
          )
          return NextResponse.json({
            success: true,
            type: 'save-rate',
            platform: validPlatform,
            data: saveRateData,
            dateRange,
          })
        }

        default:
          return validationErrorResponse([
            { field: 'type', message: 'Invalid analytics type. Use: account, location, retention, save-rate, aggregated' },
          ])
      }

    } catch (error: unknown) {
      console.error('Analytics error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch analytics',
        },
        { status: 500 }
      )
    }
  })
}
