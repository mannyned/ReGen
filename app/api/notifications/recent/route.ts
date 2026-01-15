/**
 * GET /api/notifications/recent
 *
 * Fetch recent post notifications (published/failed) for the user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

export const runtime = 'nodejs'

export interface PostNotification {
  id: string
  type: 'success' | 'failed' | 'partial'
  platform: string
  platforms?: string[]
  caption?: string
  thumbnail?: string
  timestamp: string
  errorMessage?: string
  isRead: boolean
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get posts from the last 48 hours
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - 48)

    // Fetch recently published posts
    const recentPublished = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: 'POSTED',
        postedAt: { gte: cutoffDate },
      },
      orderBy: { postedAt: 'desc' },
      take: 10,
      include: {
        contentUpload: {
          select: {
            thumbnailUrl: true,
          },
        },
      },
    })

    // Fetch recently failed posts
    const recentFailed = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: 'FAILED',
        createdAt: { gte: cutoffDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        contentUpload: {
          select: {
            thumbnailUrl: true,
          },
        },
      },
    })

    // Fetch recently completed scheduled posts (success or failed)
    const recentScheduledCompleted = await prisma.scheduledPost.findMany({
      where: {
        profileId,
        status: { in: ['COMPLETED', 'PARTIAL_FAILURE', 'FAILED'] },
        processedAt: { gte: cutoffDate },
      },
      orderBy: { processedAt: 'desc' },
      take: 10,
      include: {
        contentUpload: {
          select: {
            thumbnailUrl: true,
            processedUrls: true,
          },
        },
      },
    })

    // Transform to notifications
    const notifications: PostNotification[] = []

    // Add published posts
    for (const post of recentPublished) {
      const metadata = post.metadata as Record<string, unknown> | null
      notifications.push({
        id: `published-${post.id}`,
        type: 'success',
        platform: post.provider,
        caption: (metadata?.caption as string)?.substring(0, 100),
        thumbnail: (metadata?.mediaUrl as string) || post.contentUpload?.thumbnailUrl || undefined,
        timestamp: post.postedAt?.toISOString() || post.createdAt.toISOString(),
        isRead: false,
      })
    }

    // Add failed posts
    for (const post of recentFailed) {
      const metadata = post.metadata as Record<string, unknown> | null
      notifications.push({
        id: `failed-${post.id}`,
        type: 'failed',
        platform: post.provider,
        caption: (metadata?.caption as string)?.substring(0, 100),
        thumbnail: (metadata?.mediaUrl as string) || post.contentUpload?.thumbnailUrl || undefined,
        timestamp: post.createdAt.toISOString(),
        errorMessage: (metadata?.error as string) || 'Failed to publish',
        isRead: false,
      })
    }

    // Add scheduled post completions
    for (const post of recentScheduledCompleted) {
      const platformContent = post.platformContent as Record<string, { caption?: string }> | null
      const firstPlatformCaption = platformContent?.[post.platforms[0]?.toLowerCase()]?.caption ||
                                   platformContent?.[Object.keys(platformContent || {})[0]]?.caption
      const processedUrls = post.contentUpload?.processedUrls as { files?: Array<{ publicUrl: string }> } | null

      notifications.push({
        id: `scheduled-${post.id}`,
        type: post.status === 'COMPLETED' ? 'success' : post.status === 'PARTIAL_FAILURE' ? 'partial' : 'failed',
        platform: post.platforms[0]?.toLowerCase() || 'unknown',
        platforms: post.platforms.map(p => p.toLowerCase()),
        caption: firstPlatformCaption?.substring(0, 100),
        thumbnail: processedUrls?.files?.[0]?.publicUrl || post.contentUpload?.thumbnailUrl || undefined,
        timestamp: post.processedAt?.toISOString() || post.scheduledAt?.toISOString() || '',
        errorMessage: post.errorMessage || undefined,
        isRead: false,
      })
    }

    // Sort by timestamp descending and deduplicate
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Remove duplicates (same content might appear in both outboundPost and scheduledPost)
    const seen = new Set<string>()
    const uniqueNotifications = notifications.filter(n => {
      const key = `${n.platform}-${n.timestamp.substring(0, 16)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Count unread (for now, all are unread - could add persistence later)
    const unreadCount = uniqueNotifications.filter(n => !n.isRead).length

    return NextResponse.json({
      notifications: uniqueNotifications.slice(0, 20),
      unreadCount,
      total: uniqueNotifications.length,
    })
  } catch (error) {
    console.error('[Notifications Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        code: 'FETCH_ERROR',
      },
      { status: 500 }
    )
  }
}
