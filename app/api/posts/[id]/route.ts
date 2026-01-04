/**
 * API routes for individual post operations
 * PATCH /api/posts/[id] - Update post status (e.g., mark as deleted)
 * GET /api/posts/[id] - Get single post details
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { OutboundPostStatus } from '@prisma/client'

export const runtime = 'nodejs'

// GET /api/posts/[id] - Get single post details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id } = await params

    const post = await prisma.outboundPost.findFirst({
      where: {
        id,
        profileId,
      },
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

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const metadata = post.metadata as Record<string, unknown> | null

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        platform: post.provider,
        platformPostId: post.externalPostId,
        platformUrl: metadata?.platformUrl as string | undefined,
        caption: metadata?.caption as string | undefined,
        postedAt: post.postedAt?.toISOString(),
        status: post.status,
        thumbnail: (metadata?.mediaUrl as string | undefined) || post.contentUpload?.thumbnailUrl,
        fileName: post.contentUpload?.fileName,
        mimeType: (metadata?.mimeType as string | undefined) || post.contentUpload?.mimeType,
        mediaType: metadata?.mediaType as string | undefined,
      },
    })
  } catch (error) {
    console.error('[Get Post Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch post',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    )
  }
}

// PATCH /api/posts/[id] - Update post status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body as { status?: string }

    // Validate status
    if (status && !Object.values(OutboundPostStatus).includes(status as OutboundPostStatus)) {
      return NextResponse.json(
        { error: 'Invalid status', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // Verify post belongs to user
    const existingPost = await prisma.outboundPost.findFirst({
      where: {
        id,
        profileId,
      },
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Update the post
    const updatedPost = await prisma.outboundPost.update({
      where: { id },
      data: {
        status: status as OutboundPostStatus,
        // Store deletion timestamp in metadata if marking as deleted
        ...(status === 'DELETED' && {
          metadata: {
            ...(existingPost.metadata as Record<string, unknown> || {}),
            deletedAt: new Date().toISOString(),
          },
        }),
      },
    })

    return NextResponse.json({
      success: true,
      post: {
        id: updatedPost.id,
        status: updatedPost.status,
      },
    })
  } catch (error) {
    console.error('[Update Post Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update post',
        code: 'UPDATE_ERROR',
      },
      { status: 500 }
    )
  }
}
