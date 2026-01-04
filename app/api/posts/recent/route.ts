/**
 * GET /api/posts/recent
 *
 * Fetch recent published posts for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { OutboundPostStatus } from '@prisma/client'

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

    // Get query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const filter = searchParams.get('filter') || 'all' // all, published, scheduled, drafts

    // Build where clause based on filter
    // Available statuses: QUEUED, PROCESSING, POSTED, FAILED, INITIATED
    let statusFilter: OutboundPostStatus = OutboundPostStatus.POSTED
    if (filter === 'published') {
      statusFilter = OutboundPostStatus.POSTED
    } else if (filter === 'scheduled') {
      statusFilter = OutboundPostStatus.QUEUED // Scheduled posts are queued
    } else if (filter === 'drafts') {
      statusFilter = OutboundPostStatus.INITIATED // Drafts are initiated but not submitted
    }
    // 'all' returns POSTED only for now

    // Fetch recent outbound posts
    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: statusFilter,
      },
      orderBy: {
        postedAt: 'desc',
      },
      take: limit,
      include: {
        contentUpload: {
          select: {
            id: true,
            fileName: true,
            thumbnailUrl: true,
            mimeType: true,
          },
        },
      },
    })

    // Transform for frontend
    const recentPosts = posts.map((post) => {
      const metadata = post.metadata as Record<string, unknown> | null

      // Use mediaUrl from metadata as thumbnail, fallback to contentUpload
      const thumbnail = (metadata?.mediaUrl as string | undefined) ||
                        post.contentUpload?.thumbnailUrl

      // Get mimeType from metadata or contentUpload
      const mimeType = (metadata?.mimeType as string | undefined) ||
                       post.contentUpload?.mimeType

      return {
        id: post.id,
        platform: post.provider,
        platformPostId: post.externalPostId,
        platformUrl: metadata?.platformUrl as string | undefined,
        caption: metadata?.caption as string | undefined,
        postedAt: post.postedAt?.toISOString(),
        thumbnail,
        fileName: post.contentUpload?.fileName,
        mimeType,
        mediaType: metadata?.mediaType as string | undefined,
      }
    })

    // Get total count of all posted content (not limited)
    const totalCount = await prisma.outboundPost.count({
      where: {
        profileId,
        status: OutboundPostStatus.POSTED,
      },
    })

    return NextResponse.json({
      posts: recentPosts,
      count: recentPosts.length,
      totalCount,
    })
  } catch (error) {
    console.error('[Recent Posts Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    )
  }
}
