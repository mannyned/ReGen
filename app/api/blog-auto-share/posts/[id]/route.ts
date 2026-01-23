/**
 * Blog Auto-Share Post Actions API
 *
 * GET    - Get single post details
 * POST   - Approve draft and publish
 * DELETE - Dismiss/skip draft
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { blogAutoShareService } from '@/lib/services/blog-auto-share'

type RouteParams = { params: Promise<{ id: string }> }

// ============================================
// GET - Get Post Details
// ============================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await prisma.blogAutoSharePost.findFirst({
      where: {
        id,
        profileId: user.id,
      },
      include: {
        rssFeedItem: {
          include: {
            feed: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        platformResults: post.platformResults
          ? JSON.parse(post.platformResults as string)
          : [],
      },
    })
  } catch (error) {
    console.error('[BlogAutoShare] Post GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve post' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Approve Draft and Publish
// ============================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optionally accept custom caption in body
    const body = await request.json().catch(() => ({}))
    const customCaption = body.caption

    // If custom caption provided, update the post first
    if (customCaption) {
      await prisma.blogAutoSharePost.updateMany({
        where: {
          id,
          profileId: user.id,
          status: { in: ['DRAFT', 'QUEUED'] },
        },
        data: {
          generatedCaption: customCaption,
        },
      })
    }

    // Approve and publish
    const result = await blogAutoShareService.approveDraft(id, user.id)

    console.log(`[BlogAutoShare] Draft approved and published: ${id}`)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('[BlogAutoShare] Post approve error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to approve post',
      },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - Dismiss/Skip Draft
// ============================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await blogAutoShareService.dismissDraft(id, user.id)

    console.log(`[BlogAutoShare] Draft dismissed: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Post dismissed',
    })
  } catch (error) {
    console.error('[BlogAutoShare] Post dismiss error:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss post' },
      { status: 500 }
    )
  }
}
