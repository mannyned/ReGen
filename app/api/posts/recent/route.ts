/**
 * GET /api/posts/recent
 *
 * Fetch recent published posts for the dashboard
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

    // Get limit from query params (default 10)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    // Fetch recent outbound posts
    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: 'POSTED',
      },
      orderBy: {
        postedAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        provider: true,
        externalPostId: true,
        postedAt: true,
        metadata: true,
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

    return NextResponse.json({
      posts: recentPosts,
      count: recentPosts.length,
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
