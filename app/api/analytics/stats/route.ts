/**
 * GET /api/analytics/stats
 *
 * Fetch basic analytics stats for the user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get time range from query params (default 30 days)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Count total posts
    const totalPosts = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'POSTED',
      },
    })

    // Count posts in time range
    const postsInRange = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: {
          gte: startDate,
        },
      },
    })

    // Count posts by platform
    const postsByPlatform = await prisma.outboundPost.groupBy({
      by: ['provider'],
      where: {
        profileId,
        status: 'POSTED',
      },
      _count: {
        id: true,
      },
    })

    // Count AI-generated captions (posts with captions)
    const aiGenerated = await prisma.outboundPost.count({
      where: {
        profileId,
        status: 'POSTED',
        metadata: {
          path: ['caption'],
          not: null,
        },
      },
    })

    // Transform platform stats
    const platformStats: Record<string, number> = {}
    for (const stat of postsByPlatform) {
      platformStats[stat.provider] = stat._count.id
    }

    return NextResponse.json({
      totalPosts,
      postsInRange,
      aiGenerated,
      platformStats,
      timeRange: days,
    })
  } catch (error) {
    console.error('[Analytics Stats Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    )
  }
}
