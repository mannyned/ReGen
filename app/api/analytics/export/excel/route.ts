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
import type { SocialPlatform } from '@/lib/types/social'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

// Get current user from session
async function getCurrentUser(req: NextRequest): Promise<{
  id: string
  email: string
  plan: PlanTier
} | null> {
  try {
    const profileId = await getUserId(req)
    if (!profileId) return null

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        email: true,
        tier: true,
      },
    })

    if (!profile) return null

    // Map UserTier to PlanTier
    const tierToPlan: Record<string, PlanTier> = {
      'FREE': 'FREE',
      'CREATOR': 'CREATOR',
      'PRO': 'PRO',
    }

    return {
      id: profile.id,
      email: profile.email || '',
      plan: tierToPlan[profile.tier] || 'FREE',
    }
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

// Validate if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Map database provider to platform name
function providerToPlatform(provider: string): SocialPlatform {
  const mapping: Record<string, SocialPlatform> = {
    'meta': 'instagram',
    'instagram': 'instagram',
    'google': 'youtube',
    'youtube': 'youtube',
    'facebook': 'facebook',
    'tiktok': 'tiktok',
    'linkedin': 'linkedin',
    'twitter': 'twitter',
    'x': 'twitter',
    'snapchat': 'snapchat',
  }
  return mapping[provider.toLowerCase()] || provider as SocialPlatform
}

// Fetch real analytics data - matches working stats API pattern
async function fetchAnalyticsData(
  userId: string,
  options: ExportOptions
): Promise<NormalizedPostAnalytics[]> {
  // Validate userId is a valid UUID before querying
  if (!isValidUUID(userId)) {
    console.warn(`[Excel Export] Invalid UUID format for userId: ${userId}`)
    return []
  }

  const { filters } = options || {}

  // Date range - only use start date like working stats API
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30) // Default 30 days
  const dateFrom = filters?.dateFrom || startDate

  // Build provider filter (matches stats API pattern)
  const getProviderFilter = (platforms?: string[]) => {
    if (!platforms || platforms.length === 0) return undefined
    const platformMap: Record<string, string[]> = {
      'instagram': ['meta', 'instagram'],
      'youtube': ['google', 'youtube'],
      'facebook': ['facebook', 'meta'],
      'tiktok': ['tiktok'],
      'linkedin': ['linkedin'],
      'twitter': ['twitter', 'x'],
      'snapchat': ['snapchat'],
    }
    const allProviders: string[] = []
    for (const platform of platforms) {
      const providers = platformMap[platform.toLowerCase()] || [platform]
      allProviders.push(...providers)
    }
    return { in: allProviders }
  }

  const providerFilter = getProviderFilter(filters?.platforms as string[] | undefined)
  const providerWhere = providerFilter ? { provider: providerFilter } : {}

  console.log(`[Excel Export] Fetching posts for userId: ${userId}`)

  // Single optimized query matching working stats API
  const posts = await prisma.outboundPost.findMany({
    where: {
      profileId: userId,
      status: 'POSTED',
      postedAt: { gte: dateFrom },
      ...providerWhere,
      ...(filters?.postIds?.length ? { id: { in: filters.postIds } } : {}),
    },
    select: {
      id: true,
      provider: true,
      externalPostId: true,
      metadata: true,
      postedAt: true,
      createdAt: true,
      contentUpload: {
        select: {
          fileName: true,
        },
      },
    },
    orderBy: {
      postedAt: 'desc',
    },
  })

  console.log(`[Excel Export] Found ${posts.length} posts`)

  // Transform to NormalizedPostAnalytics (matches stats API data extraction)
  return posts.map(post => {
    const metadata = post.metadata as Record<string, unknown> | null
    const analytics = metadata?.analytics as Record<string, unknown> | null
    const platform = providerToPlatform(post.provider)

    // Extract metrics matching stats API pattern
    const views = Number(analytics?.views) || 0
    const likes = Number(analytics?.likes) || 0
    const comments = Number(analytics?.comments) || 0
    const shares = Number(analytics?.shares) || 0
    const saves = Number(analytics?.saved || analytics?.saves) || 0
    const reach = Number(analytics?.reach) || 0
    const impressions = Number(analytics?.impressions) || reach || views

    // Calculate engagement rate
    const totalEngagement = likes + comments + shares
    const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0
    const saveRate = reach > 0 ? (saves / reach) * 100 : 0

    // Get title and caption
    const title = String(metadata?.title || post.contentUpload?.fileName || `${platform} post`)
    const caption = String(metadata?.caption || metadata?.description || '')

    return {
      postId: post.id,
      platform,
      platformPostId: post.externalPostId || post.id,
      title,
      caption,
      publishedAt: post.postedAt || post.createdAt,
      views,
      impressions,
      reach,
      likes,
      comments,
      shares,
      saves,
      engagementRate,
      saveRate,
      avgWatchTime: analytics?.avgWatchTime ? Number(analytics.avgWatchTime) : undefined,
      completionRate: analytics?.completionRate ? Number(analytics.completionRate) : undefined,
      topLocations: Array.isArray(analytics?.topLocations) ? analytics.topLocations as Array<{
        country: string
        city?: string
        percentage: number
        engagement: number
      }> : [],
    }
  })
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
      user.plan.toLowerCase() as 'free' | 'creator' | 'pro',
      options,
      analyticsData
    )

    // Return the Excel file
    return new NextResponse(new Uint8Array(result.buffer), {
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
