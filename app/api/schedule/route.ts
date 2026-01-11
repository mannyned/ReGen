import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from '@/lib/supabase/server'

// GET /api/schedule - Fetch scheduled posts for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'completed', 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {
      profileId: session.user.id,
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    } else {
      // Default: show pending and processing (upcoming posts)
      where.status = { in: ['PENDING', 'PROCESSING'] }
    }

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      include: {
        contentUpload: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            thumbnailUrl: true,
            processedUrls: true,
          },
        },
      },
    })

    // Transform for frontend
    const posts = scheduledPosts.map((post) => {
      const processedUrls = post.contentUpload?.processedUrls as any
      const platformContent = post.platformContent as Record<string, any>

      return {
        id: post.id,
        platforms: post.platforms,
        scheduledAt: post.scheduledAt,
        timezone: post.timezone,
        status: post.status.toLowerCase(),
        content: platformContent,
        media: {
          fileName: post.contentUpload?.fileName,
          mimeType: post.contentUpload?.mimeType,
          thumbnailUrl: post.contentUpload?.thumbnailUrl,
          publicUrl: processedUrls?.files?.[0]?.publicUrl,
        },
        createdAt: post.createdAt,
      }
    })

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    })
  } catch (error) {
    console.error('[Schedule API] Error fetching scheduled posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    )
  }
}

// POST /api/schedule - Create a new scheduled post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentUploadId, platforms, scheduledAt, timezone, platformContent } = body

    // Validate required fields
    if (!contentUploadId) {
      return NextResponse.json(
        { success: false, error: 'contentUploadId is required' },
        { status: 400 }
      )
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one platform is required' },
        { status: 400 }
      )
    }

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'scheduledAt is required' },
        { status: 400 }
      )
    }

    // Verify content upload exists and belongs to user
    const contentUpload = await prisma.contentUpload.findFirst({
      where: {
        id: contentUploadId,
        profileId: session.user.id,
      },
    })

    if (!contentUpload) {
      return NextResponse.json(
        { success: false, error: 'Content upload not found' },
        { status: 404 }
      )
    }

    // Map platform names to enum values
    const platformEnumMap: Record<string, string> = {
      instagram: 'INSTAGRAM',
      tiktok: 'TIKTOK',
      youtube: 'YOUTUBE',
      twitter: 'TWITTER',
      x: 'TWITTER',
      linkedin: 'LINKEDIN',
      facebook: 'FACEBOOK',
      snapchat: 'SNAPCHAT',
      pinterest: 'PINTEREST',
      discord: 'DISCORD',
    }

    const platformEnums = platforms.map((p: string) => platformEnumMap[p.toLowerCase()] || p.toUpperCase())

    // Create scheduled post
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        profileId: session.user.id,
        contentUploadId,
        platforms: platformEnums,
        scheduledAt: new Date(scheduledAt),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        platformContent: platformContent || {},
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      post: {
        id: scheduledPost.id,
        platforms: scheduledPost.platforms,
        scheduledAt: scheduledPost.scheduledAt,
        status: scheduledPost.status.toLowerCase(),
      },
    })
  } catch (error) {
    console.error('[Schedule API] Error creating scheduled post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create scheduled post' },
      { status: 500 }
    )
  }
}

// DELETE /api/schedule?id=xxx - Cancel a scheduled post
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('id')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Verify post exists and belongs to user
    const existingPost = await prisma.scheduledPost.findFirst({
      where: {
        id: postId,
        profileId: session.user.id,
      },
    })

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Scheduled post not found' },
        { status: 404 }
      )
    }

    // Only allow cancelling pending posts
    if (existingPost.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Can only cancel pending posts' },
        { status: 400 }
      )
    }

    // Update status to cancelled
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({
      success: true,
      message: 'Scheduled post cancelled',
    })
  } catch (error) {
    console.error('[Schedule API] Error cancelling scheduled post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel scheduled post' },
      { status: 500 }
    )
  }
}
