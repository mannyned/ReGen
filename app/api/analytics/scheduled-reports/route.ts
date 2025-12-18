// ============================================
// SCHEDULED REPORTS API ROUTES
// GET/POST /api/analytics/scheduled-reports
// PRO-Only Feature
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { scheduledReportService } from '@/lib/services/export/ScheduledReportService'
import { isProUser } from '@/lib/middleware/roleGuard'
import type { ScheduledReportCreateInput } from '@/lib/types/export'
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

/**
 * GET /api/analytics/scheduled-reports
 * List all scheduled reports for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      )
    }

    // Check PRO access
    if (!isProUser(user.plan)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Scheduled reports require PRO plan',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    const reports = await scheduledReportService.getUserScheduledReports(user.id)

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
    })
  } catch (error) {
    console.error('[Scheduled Reports API] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch scheduled reports' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/analytics/scheduled-reports
 * Create a new scheduled report
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      )
    }

    // Check PRO access
    if (!isProUser(user.plan)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Scheduled reports require PRO plan',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    // Validate required fields
    const requiredFields = ['name', 'frequency', 'hour', 'minute', 'timezone', 'format', 'deliveryMethod']
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: 'Bad Request', message: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly']
    if (!validFrequencies.includes(body.frequency)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate delivery method
    const validDeliveryMethods = ['email', 'download', 'google_drive', 'webhook']
    if (!validDeliveryMethods.includes(body.deliveryMethod)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid delivery method. Must be one of: ${validDeliveryMethods.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate delivery config based on method
    if (body.deliveryMethod === 'email' && (!body.deliveryConfig?.emails || body.deliveryConfig.emails.length === 0)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Email delivery requires at least one email address' },
        { status: 400 }
      )
    }

    if (body.deliveryMethod === 'webhook' && !body.deliveryConfig?.webhookUrl) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Webhook delivery requires a webhook URL' },
        { status: 400 }
      )
    }

    const input: ScheduledReportCreateInput = {
      userId: user.id,
      name: body.name,
      description: body.description,
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      hour: body.hour,
      minute: body.minute,
      timezone: body.timezone,
      format: body.format,
      options: body.options || {
        format: body.format,
        filters: {},
      },
      deliveryMethod: body.deliveryMethod,
      deliveryConfig: body.deliveryConfig || {},
    }

    const report = await scheduledReportService.createScheduledReport(input, user.plan)

    return NextResponse.json({
      success: true,
      report,
    }, { status: 201 })
  } catch (error) {
    console.error('[Scheduled Reports API] POST Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Maximum')) {
        return NextResponse.json(
          { error: 'Limit Reached', message: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('PRO')) {
        return NextResponse.json(
          { error: 'Forbidden', message: error.message },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create scheduled report' },
      { status: 500 }
    )
  }
}
