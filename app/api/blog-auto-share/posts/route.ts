/**
 * Blog Auto-Share Posts API
 *
 * GET - Retrieve auto-share posts (drafts, history)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

// ============================================
// GET - List Posts
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all' // 'all', 'drafts', 'published', 'failed'
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10))

    // Build filter conditions
    let statusFilter = {}
    switch (filter) {
      case 'drafts':
        statusFilter = { status: { in: ['DRAFT', 'QUEUED'] } }
        break
      case 'published':
        statusFilter = { status: 'PUBLISHED' }
        break
      case 'failed':
        statusFilter = { status: { in: ['FAILED', 'PARTIAL'] } }
        break
      case 'pending':
        statusFilter = { status: { in: ['PENDING', 'PROCESSING'] } }
        break
      default:
        statusFilter = {}
    }

    const posts = await prisma.blogAutoSharePost.findMany({
      where: {
        profileId: user.id,
        ...statusFilter,
      },
      include: {
        rssFeedItem: {
          include: {
            feed: {
              select: {
                id: true,
                name: true,
                feedTitle: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Parse platform results for each post
    const postsWithResults = posts.map(post => ({
      ...post,
      platformResults: post.platformResults
        ? JSON.parse(post.platformResults as string)
        : [],
    }))

    // Get counts by status
    const counts = await prisma.blogAutoSharePost.groupBy({
      by: ['status'],
      where: { profileId: user.id },
      _count: true,
    })

    const statusCounts = counts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      posts: postsWithResults,
      counts: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        drafts: (statusCounts.DRAFT || 0) + (statusCounts.QUEUED || 0),
        published: statusCounts.PUBLISHED || 0,
        partial: statusCounts.PARTIAL || 0,
        failed: statusCounts.FAILED || 0,
        skipped: statusCounts.SKIPPED || 0,
      },
    })
  } catch (error) {
    console.error('[BlogAutoShare] Posts GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve posts' },
      { status: 500 }
    )
  }
}
