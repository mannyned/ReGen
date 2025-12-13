// ============================================
// SCHEDULED REPORTS API ROUTES - Individual Report
// GET/PATCH/DELETE /api/analytics/scheduled-reports/[id]
// PRO-Only Feature
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { scheduledReportService } from '@/lib/services/export/ScheduledReportService'
import { createProOnlyMiddleware } from '@/lib/middleware/roleGuard'
import type { PlanTier } from '@prisma/client'

// Mock function to get user from session
async function getCurrentUser(req: NextRequest): Promise<{
  id: string
  email: string
  plan: PlanTier
} | null> {
  return {
    id: 'user_123',
    email: 'test@example.com',
    plan: 'PRO',
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/analytics/scheduled-reports/[id]
 * Get a specific scheduled report
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      )
    }

    const report = await scheduledReportService.getScheduledReport(id, user.id)

    if (!report) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Scheduled report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('[Scheduled Reports API] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch scheduled report' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/analytics/scheduled-reports/[id]
 * Update a scheduled report
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Handle toggle action
    if (body.action === 'toggle') {
      const report = await scheduledReportService.toggleReportStatus(id, user.id)

      if (!report) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Scheduled report not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        report,
        message: report.isActive ? 'Report activated' : 'Report paused',
      })
    }

    // Handle run now action
    if (body.action === 'run_now') {
      const success = await scheduledReportService.runReportNow(id, user.id)

      if (!success) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Scheduled report not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Report execution started',
      })
    }

    // Regular update
    const report = await scheduledReportService.updateScheduledReport(id, user.id, body)

    if (!report) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Scheduled report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('[Scheduled Reports API] PATCH Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update scheduled report' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/analytics/scheduled-reports/[id]
 * Delete a scheduled report
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      )
    }

    const success = await scheduledReportService.deleteScheduledReport(id, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Scheduled report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled report deleted',
    })
  } catch (error) {
    console.error('[Scheduled Reports API] DELETE Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete scheduled report' },
      { status: 500 }
    )
  }
}
