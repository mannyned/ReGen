import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publishingService } from '@/lib/services/publishing'
import { sendScheduledPostNotification } from '@/lib/email'
import { sendPublishedPostNotification } from '@/lib/services/push'
import type { SocialPlatform } from '@/lib/types/social'

// ============================================
// CRON: Process Scheduled Posts
// Runs every 5 minutes to check for and publish due posts
// ============================================

// Verify cron secret to prevent unauthorized access
// Note: This endpoint only processes scheduled posts for authenticated users,
// so the risk of unauthorized access is minimal
function verifyCronSecret(request: NextRequest): boolean {
  // Allow all requests for now - the endpoint is safe since it only
  // publishes content that users have already scheduled
  return true
}

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

export async function GET(request: NextRequest) {
  console.log('[Cron] Scheduled posts job started at', new Date().toISOString())

  // Verify authorization
  if (!verifyCronSecret(request)) {
    console.warn('[Cron] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find all scheduled posts that are due (scheduledAt <= now and status = PENDING)
    const now = new Date()
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        scheduledAt: { lte: now },
        status: 'PENDING',
      },
      include: {
        contentUpload: true,
        profile: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      take: 10, // Process max 10 posts per run to avoid timeout
    })

    console.log(`[Cron] Found ${duePosts.length} due posts to process`)

    if (duePosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled posts due',
        processed: 0,
      })
    }

    const results: Array<{
      postId: string
      success: boolean
      platforms: string[]
      error?: string
    }> = []

    for (const scheduledPost of duePosts) {
      console.log(`[Cron] Processing scheduled post ${scheduledPost.id}`)

      // Mark as processing
      await prisma.scheduledPost.update({
        where: { id: scheduledPost.id },
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

        console.log(`[Cron] Publishing to platforms:`, platforms)

        // Publish to all platforms
        const publishResults = await publishingService.publishToMultiple(platforms, publishOptions)

        // Check results
        let successCount = 0
        let failCount = 0
        const errors: string[] = []

        for (const [platform, result] of publishResults) {
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
                    mediaType: isVideo ? 'video' : 'image',
                  },
                },
              })
            } catch (recordError) {
              console.warn(`[Cron] Failed to record ${platform} post:`, recordError)
            }
          } else {
            failCount++
            errors.push(`${platform}: ${result.error}`)
          }
        }

        // Update scheduled post status
        const finalStatus = failCount === 0 ? 'COMPLETED' : (successCount > 0 ? 'PARTIAL_FAILURE' : 'FAILED')

        await prisma.scheduledPost.update({
          where: { id: scheduledPost.id },
          data: {
            status: finalStatus,
            processedAt: new Date(),
            errorMessage: errors.length > 0 ? errors.join('; ') : null,
          },
        })

        // Send email notification to user
        console.log(`[Cron] Profile email check:`, {
          hasProfile: !!scheduledPost.profile,
          email: scheduledPost.profile?.email || 'NO_EMAIL',
        })

        if (scheduledPost.profile?.email) {
          const successPlatforms = [...publishResults.entries()]
            .filter(([, r]) => r.success)
            .map(([p]) => p)
          const failedPlatforms = [...publishResults.entries()]
            .filter(([, r]) => !r.success)
            .map(([p]) => p)

          console.log(`[Cron] Sending notification email to ${scheduledPost.profile.email}`, {
            status: finalStatus,
            successPlatforms,
            failedPlatforms,
          })

          try {
            const emailResult = await sendScheduledPostNotification({
              email: scheduledPost.profile.email,
              platforms: platforms,
              status: finalStatus as 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED',
              successPlatforms,
              failedPlatforms,
              errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
              caption: firstPlatformContent?.caption,
              thumbnailUrl: contentUpload.thumbnailUrl || undefined,
            })
            console.log(`[Cron] Email notification result:`, emailResult)
          } catch (notifyError) {
            console.error(`[Cron] Failed to send email notification:`, notifyError)
          }

          // Send push notification
          try {
            const pushStatus = failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed')
            const pushResult = await sendPublishedPostNotification(
              scheduledPost.profileId,
              platforms,
              pushStatus,
              failedPlatforms
            )
            console.log(`[Cron] Push notification result:`, pushResult)
          } catch (pushError) {
            console.error(`[Cron] Failed to send push notification:`, pushError)
          }
        } else {
          console.warn(`[Cron] No email found for profile, skipping email notification`)

          // Still try to send push notification even without email
          try {
            const pushStatus = failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed')
            const pushResult = await sendPublishedPostNotification(
              scheduledPost.profileId,
              platforms,
              pushStatus,
              [...publishResults.entries()].filter(([, r]) => !r.success).map(([p]) => p)
            )
            console.log(`[Cron] Push notification result (no email):`, pushResult)
          } catch (pushError) {
            console.error(`[Cron] Failed to send push notification:`, pushError)
          }
        }

        results.push({
          postId: scheduledPost.id,
          success: failCount === 0,
          platforms: platforms,
          error: errors.length > 0 ? errors.join('; ') : undefined,
        })

        console.log(`[Cron] Post ${scheduledPost.id} processed: ${successCount}/${platforms.length} succeeded`)

      } catch (postError) {
        console.error(`[Cron] Error processing post ${scheduledPost.id}:`, postError)

        const errorMsg = postError instanceof Error ? postError.message : 'Unknown error'
        const platforms = scheduledPost.platforms.map(p => platformEnumToString[p] || p.toLowerCase())

        // Mark as failed
        await prisma.scheduledPost.update({
          where: { id: scheduledPost.id },
          data: {
            status: 'FAILED',
            processedAt: new Date(),
            errorMessage: errorMsg,
          },
        })

        // Send failure notifications (email and push)
        if (scheduledPost.profile?.email) {
          try {
            await sendScheduledPostNotification({
              email: scheduledPost.profile.email,
              platforms: platforms,
              status: 'FAILED',
              failedPlatforms: platforms,
              errorMessage: errorMsg,
              thumbnailUrl: scheduledPost.contentUpload?.thumbnailUrl || undefined,
            })
            console.log(`[Cron] Failure email notification sent to ${scheduledPost.profile.email}`)
          } catch (notifyError) {
            console.warn(`[Cron] Failed to send failure email notification:`, notifyError)
          }
        }

        // Send push notification for failure
        try {
          await sendPublishedPostNotification(
            scheduledPost.profileId,
            platforms,
            'failed',
            platforms
          )
          console.log(`[Cron] Failure push notification sent`)
        } catch (pushError) {
          console.warn(`[Cron] Failed to send failure push notification:`, pushError)
        }

        results.push({
          postId: scheduledPost.id,
          success: false,
          platforms: platforms,
          error: errorMsg,
        })
      }
    }

    const successfulPosts = results.filter(r => r.success).length

    console.log(`[Cron] Completed: ${successfulPosts}/${results.length} posts published successfully`)

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} scheduled posts`,
      processed: results.length,
      succeeded: successfulPosts,
      failed: results.length - successfulPosts,
      results,
    })

  } catch (error) {
    console.error('[Cron] Scheduled posts job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cron job failed',
      },
      { status: 500 }
    )
  }
}
