// ============================================
// EXCEL EXPORT API ROUTE
// POST /api/analytics/export/excel
// PRO-Only Feature
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { ExcelExportService } from '@/lib/services/export/ExcelExportService'
import { isProUser } from '@/lib/middleware/roleGuard'
import type { ExportOptions, NormalizedPostAnalytics } from '@/lib/types/export'
import type { PlanTier } from '@prisma/client'

// Mock function to get user from session - replace with actual auth
async function getCurrentUser(req: NextRequest): Promise<{
  id: string
  email: string
  plan: PlanTier
} | null> {
  // In production, implement actual authentication
  // For now, return a mock PRO user for testing
  return {
    id: 'user_123',
    email: 'test@example.com',
    plan: 'PRO',
  }
}

// Mock function to fetch analytics data - replace with actual data fetching
async function fetchAnalyticsData(
  userId: string,
  options: ExportOptions
): Promise<NormalizedPostAnalytics[]> {
  // In production, fetch from database based on filters
  // Return mock data for testing
  return [
    {
      postId: 'post_1',
      platform: 'instagram',
      platformPostId: 'ig_123456',
      title: 'Summer vibes ☀️',
      caption: 'Enjoying the beautiful weather! #summer #vibes',
      publishedAt: new Date('2024-12-01'),
      views: 15000,
      impressions: 20000,
      reach: 12000,
      likes: 1500,
      comments: 120,
      shares: 45,
      saves: 230,
      engagementRate: 12.5,
      saveRate: 1.53,
      avgWatchTime: 28,
      completionRate: 75,
      topLocations: [
        { country: 'United States', percentage: 45, engagement: 6750 },
        { country: 'United Kingdom', percentage: 20, engagement: 3000 },
        { country: 'Canada', percentage: 15, engagement: 2250 },
      ],
      deviceBreakdown: { mobile: 75, desktop: 20, tablet: 5 },
    },
    {
      postId: 'post_2',
      platform: 'tiktok',
      platformPostId: 'tt_789012',
      title: 'Dance challenge 💃',
      publishedAt: new Date('2024-12-05'),
      views: 50000,
      impressions: 65000,
      reach: 45000,
      likes: 8000,
      comments: 500,
      shares: 1200,
      saves: 890,
      engagementRate: 21.2,
      saveRate: 1.78,
      avgWatchTime: 15,
      completionRate: 60,
      topLocations: [
        { country: 'United States', percentage: 55, engagement: 27500 },
        { country: 'Brazil', percentage: 15, engagement: 7500 },
        { country: 'Mexico', percentage: 10, engagement: 5000 },
      ],
      deviceBreakdown: { mobile: 90, desktop: 8, tablet: 2 },
    },
  ]
}

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to export analytics' },
        { status: 401 }
      )
    }

    // Check PRO access
    if (!isProUser(user.plan)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Excel export requires PRO plan',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const options: ExportOptions = {
      format: 'excel',
      aggregation: body.aggregation || 'per_post',
      filters: {
        platforms: body.platforms,
        postIds: body.postIds,
        dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
        dateTo: body.dateTo ? new Date(body.dateTo) : undefined,
      },
      includeRetention: body.includeRetention ?? true,
      includeLocationData: body.includeLocationData ?? true,
    }

    // Fetch analytics data
    const analyticsData = await fetchAnalyticsData(user.id, options)

    if (analyticsData.length === 0) {
      return NextResponse.json(
        { error: 'No Data', message: 'No analytics data found for the specified filters' },
        { status: 404 }
      )
    }

    // Generate Excel export
    const excelService = new ExcelExportService()
    const result = await excelService.generateExcelExport(
      user.id,
      user.plan,
      options,
      analyticsData
    )

    // Return the Excel file
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Length': result.fileSize.toString(),
        'X-Row-Count': result.rowCount.toString(),
      },
    })
  } catch (error) {
    console.error('[Excel Export API] Error:', error)

    if (error instanceof Error && error.message.includes('PRO')) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to generate Excel export' },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
