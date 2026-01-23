import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { publishingService } from '@/lib/services/publishing'
import { sendPublishedPostNotification } from '@/lib/services/push'
import type { SocialPlatform } from '@/lib/types/social'

// Map Prisma SocialPlatform enum to lowercase string
const platformEnumToString: Record<string, SocialPlatform> = {
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  YOUTUBE: 'youtube',
  TWITTER: 'twitter',
  LINKEDIN: 'linkedin',
  FACEBOOK: 'facebook',
  SNAPCHAT: 'snapchat',
  PINTEREST: 'pinterest',
  DISCORD: 'discord',
  META: 'meta',
}

// GET /api/schedule - Fetch scheduled posts for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'completed', 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {
      profileId: user.id,
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
        contentUploadId: post.contentUpload?.id, // Include for editing captions
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      contentUploadId,
      platforms,
      scheduledAt,
      timezone,
      platformContent,
      discordChannelId,
      tiktokSettings,
      linkedInOrganizationUrn,
    } = body

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
        profileId: user.id,
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

    // Merge platform-specific settings into platformContent for storage
    const enrichedPlatformContent = {
      ...(platformContent || {}),
      // Store platform-specific settings that will be used during publishing
      _settings: {
        discordChannelId,
        tiktokSettings,
        linkedInOrganizationUrn,
      },
    }

    // Create scheduled post
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        profileId: user.id,
        contentUploadId,
        platforms: platformEnums,
        scheduledAt: new Date(scheduledAt),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        platformContent: enrichedPlatformContent,
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
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
        profileId: user.id,
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

// PUT /api/schedule?id=xxx - Publish a scheduled post immediately ("Post Now")
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
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

    // Fetch the scheduled post with content upload
    const scheduledPost = await prisma.scheduledPost.findFirst({
      where: {
        id: postId,
        profileId: user.id,
      },
      include: {
        contentUpload: true,
      },
    })

    if (!scheduledPost) {
      return NextResponse.json(
        { success: false, error: 'Scheduled post not found' },
        { status: 404 }
      )
    }

    // Only allow publishing pending posts
    if (scheduledPost.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot publish a ${scheduledPost.status.toLowerCase()} post` },
        { status: 400 }
      )
    }

    // Mark as processing
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: 'PROCESSING' },
    })

    try {
      // Get the content upload data
      const contentUpload = scheduledPost.contentUpload
      if (!contentUpload) {
        throw new Error('Content upload not found')
      }

      // Parse processed URLs and platform content
      const processedUrls = contentUpload.processedUrls as {
        files?: Array<{
          publicUrl: string
          fileName: string
          fileSize: number
          mimeType: string
        }>
        uploadType?: string
      } | null

      const platformContent = scheduledPost.platformContent as Record<string, {
        caption?: string
        hashtags?: string[]
        settings?: Record<string, unknown>
      }> | null

      // Get media info from content upload
      const firstFile = processedUrls?.files?.[0]
      const mediaUrl = firstFile?.publicUrl || contentUpload.originalUrl
      const isVideo = contentUpload.mimeType?.startsWith('video') || processedUrls?.uploadType === 'video'

      // Convert platform enums to strings
      const platforms = scheduledPost.platforms.map(p => platformEnumToString[p] || p.toLowerCase()) as SocialPlatform[]

      // Get first platform's content for default caption/hashtags
      const firstPlatformContent = platformContent?.[platforms[0]] || platformContent?.[Object.keys(platformContent || {})[0]]

      // Build publish options
      const publishOptions = {
        userId: scheduledPost.profileId,
        content: {
          caption: firstPlatformContent?.caption || '',
          hashtags: firstPlatformContent?.hashtags || [],
          settings: firstPlatformContent?.settings,  // Include platform-specific settings (e.g., Pinterest boardId)
        },
        media: mediaUrl ? {
          mediaUrl,
          mediaType: isVideo ? 'video' as const : 'image' as const,
          mimeType: contentUpload.mimeType || 'image/jpeg',
          fileSize: firstFile?.fileSize || contentUpload.fileSize || 0,
          duration: contentUpload.duration || undefined,
        } : undefined,
        platformContent: platformContent as any,
      }

      console.log(`[Schedule API] Publishing now to platforms:`, platforms)

      // Publish to all platforms
      const publishResults = await publishingService.publishToMultiple(platforms, publishOptions)

      // Check results
      let successCount = 0
      let failCount = 0
      const errors: string[] = []
      const resultsObject: Record<string, any> = {}

      for (const [platform, result] of publishResults) {
        resultsObject[platform] = result

        if (result.success) {
          successCount++

          // Record successful post to database
          try {
            await prisma.outboundPost.create({
              data: {
                profileId: scheduledPost.profileId,
                contentUploadId: contentUpload.id,
                provider: platform,
                status: 'POSTED',
                externalPostId: result.platformPostId || null,
                postedAt: new Date(),
                metadata: {
                  caption: firstPlatformContent?.caption?.substring(0, 500),
                  platformUrl: result.platformUrl,
                  scheduledPostId: scheduledPost.id,
                  publishedEarly: true, // Mark that this was published early via "Post Now"
                  mediaType: isVideo ? 'video' : 'image',
                },
              },
            })
          } catch (recordError) {
            console.warn(`[Schedule API] Failed to record ${platform} post:`, recordError)
          }
        } else {
          failCount++
          errors.push(`${platform}: ${result.error}`)
        }
      }

      // Update scheduled post status
      const finalStatus = failCount === 0 ? 'COMPLETED' : (successCount > 0 ? 'PARTIAL_FAILURE' : 'FAILED')

      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: finalStatus,
          processedAt: new Date(),
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
        },
      })

      // Send push notification
      try {
        const pushStatus = failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed')
        const failedPlatforms = [...publishResults.entries()]
          .filter(([, r]) => !r.success)
          .map(([p]) => p)

        await sendPublishedPostNotification(
          scheduledPost.profileId,
          platforms,
          pushStatus,
          failedPlatforms.length > 0 ? failedPlatforms : undefined
        )
        console.log('[Schedule API] Push notification sent:', pushStatus)
      } catch (pushError) {
        console.warn('[Schedule API] Failed to send push notification:', pushError)
      }

      console.log(`[Schedule API] Post ${postId} published: ${successCount}/${platforms.length} succeeded`)

      return NextResponse.json({
        success: failCount === 0,
        partialSuccess: successCount > 0 && failCount > 0,
        message: failCount === 0
          ? 'Post published successfully'
          : successCount > 0
          ? 'Post partially published'
          : 'Post failed to publish',
        results: resultsObject,
        summary: {
          total: platforms.length,
          succeeded: successCount,
          failed: failCount,
        },
      })

    } catch (publishError) {
      console.error(`[Schedule API] Error publishing post ${postId}:`, publishError)

      const errorMsg = publishError instanceof Error ? publishError.message : 'Unknown error'

      // Mark as failed
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          errorMessage: errorMsg,
        },
      })

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[Schedule API] Error in publish now:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to publish scheduled post' },
      { status: 500 }
    )
  }
}
