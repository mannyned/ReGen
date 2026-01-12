import { NextRequest, NextResponse } from 'next/server'
import type { SocialPlatform, PlatformContent, PublishResult } from '@/lib/types/social'
import { publishingService } from '@/lib/services/publishing'
import { validatePlatformParam, validatePublishContent, validationErrorResponse } from '@/lib/middleware/validation'
import { createRateLimitMiddleware } from '@/lib/middleware/rateLimit'
import { prisma } from '@/lib/db'

// ============================================
// POST /api/publish
// Publish content to one or multiple platforms
// ============================================

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitMiddleware = createRateLimitMiddleware('publish')

  return rateLimitMiddleware(request, async () => {
    // Parse request body with error handling for large payloads
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Publish] JSON parse error:', parseError)
      return NextResponse.json(
        {
          success: false,
          error: 'Request body too large or invalid. Try with smaller media files or use a URL instead of base64.',
          code: 'PAYLOAD_TOO_LARGE',
        },
        { status: 413 }
      )
    }

    try {
      const {
        userId,
        platforms,
        content,
        media,
        platformContent,
        scheduleAt,
        contentType,
      } = body as {
        userId: string
        platforms: SocialPlatform[]
        content: PlatformContent
        media: {
          mediaUrl: string
          mediaType: 'image' | 'video' | 'carousel'
          mimeType: string
          fileSize: number
          duration?: number
        }
        platformContent?: Record<SocialPlatform, PlatformContent>
        scheduleAt?: string
        contentType?: 'post' | 'story'
      }

      // Validate required fields
      if (!userId) {
        return validationErrorResponse([{ field: 'userId', message: 'userId is required' }])
      }

      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return validationErrorResponse([{ field: 'platforms', message: 'At least one platform is required' }])
      }

      // Validate each platform
      for (const platform of platforms) {
        const validation = validatePlatformParam(platform)
        if (!validation.valid) {
          return validationErrorResponse(validation.errors)
        }

        // Validate content for this platform
        const platformSpecificContent = platformContent?.[platform] || content
        const contentValidation = validatePublishContent(platform, {
          caption: platformSpecificContent.caption,
          hashtags: platformSpecificContent.hashtags,
          mediaUrl: media?.mediaUrl,
          fileSize: media?.fileSize,
          duration: media?.duration,
        })

        if (!contentValidation.valid) {
          return validationErrorResponse(
            contentValidation.errors.map(e => ({
              ...e,
              field: `${platform}.${e.field}`,
            }))
          )
        }
      }

      // Handle scheduled publishing
      if (scheduleAt) {
        const scheduledTime = new Date(scheduleAt)

        if (isNaN(scheduledTime.getTime())) {
          return validationErrorResponse([{ field: 'scheduleAt', message: 'Invalid schedule time' }])
        }

        if (scheduledTime < new Date()) {
          return validationErrorResponse([{ field: 'scheduleAt', message: 'Schedule time must be in the future' }])
        }

        const scheduledPost = await publishingService.schedulePost(
          `scheduled-${Date.now()}`,
          platforms,
          { userId, content, media, platformContent, contentType },
          scheduledTime
        )

        return NextResponse.json({
          success: true,
          scheduled: true,
          post: scheduledPost,
          message: `Content scheduled for ${scheduledTime.toISOString()}`,
        })
      }

      // Immediate publishing
      const results = await publishingService.publishToMultiple(platforms, {
        userId,
        content,
        media,
        platformContent,
        contentType,
      })

      // Convert Map to object for JSON response and record successful posts
      const resultsObject: Record<string, unknown> = {}
      let successCount = 0
      let failCount = 0

      for (const [platform, result] of results) {
        resultsObject[platform] = result
        if (result.success) {
          successCount++

          // Record successful post to database
          try {
            await prisma.outboundPost.create({
              data: {
                profileId: userId,
                provider: platform,
                status: 'POSTED',
                externalPostId: (result as PublishResult).platformPostId || null,
                postedAt: new Date(),
                metadata: {
                  caption: content.caption?.substring(0, 500),
                  platformUrl: (result as PublishResult).platformUrl,
                  mediaType: media?.mediaType,
                  mediaUrl: media?.mediaUrl,
                  mimeType: media?.mimeType,
                },
              },
            })
          } catch (recordError) {
            console.warn(`[Publish] Failed to record ${platform} post:`, recordError)
            // Don't fail the response if recording fails
          }
        } else {
          failCount++
        }
      }

      return NextResponse.json({
        success: failCount === 0,
        partialSuccess: successCount > 0 && failCount > 0,
        results: resultsObject,
        summary: {
          total: platforms.length,
          succeeded: successCount,
          failed: failCount,
        },
      })

    } catch (error: unknown) {
      console.error('Publish error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to publish content',
        },
        { status: 500 }
      )
    }
  })
}

// ============================================
// DELETE /api/publish
// Delete a post from a platform
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const platform = searchParams.get('platform')
    const postId = searchParams.get('postId')

    if (!userId || !platform || !postId) {
      return validationErrorResponse([
        { field: 'params', message: 'userId, platform, and postId are required' },
      ])
    }

    const validation = validatePlatformParam(platform)
    if (!validation.valid) {
      return validationErrorResponse(validation.errors)
    }

    const deleted = await publishingService.deletePost(
      platform as SocialPlatform,
      postId,
      userId
    )

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Post deleted successfully' : 'Failed to delete post',
    })

  } catch (error: unknown) {
    console.error('Delete error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete post',
      },
      { status: 500 }
    )
  }
}
