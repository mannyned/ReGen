/**
 * GET /api/posts/recent
 *
 * Fetch recent published and scheduled posts for the dashboard
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
    const platform = searchParams.get('platform') // Optional platform filter

    // Map platform filter to provider values in database
    const getProviderFilter = (platformName: string | null) => {
      if (!platformName || platformName === 'all') return undefined
      const platformMap: Record<string, string[]> = {
        'instagram': ['meta', 'instagram'],
        'youtube': ['google', 'youtube'],
        'facebook': ['facebook', 'meta'],
        'tiktok': ['tiktok'],
        'linkedin': ['linkedin'],
        'twitter': ['twitter', 'x'],
        'snapchat': ['snapchat'],
      }
      return platformMap[platformName.toLowerCase()] || [platformName]
    }

    const providerFilter = getProviderFilter(platform)
    const providerWhere = providerFilter ? { provider: { in: providerFilter } } : {}

    // For drafts filter, fetch content uploads that haven't been scheduled or published
    if (filter === 'drafts') {
      // First, get all thumbnail URLs and media URLs from published posts
      // This helps us exclude content that was published but not properly linked
      const publishedPosts = await prisma.outboundPost.findMany({
        where: {
          profileId,
          status: { in: ['POSTED', 'QUEUED', 'PROCESSING'] },
        },
        select: {
          contentUploadId: true,
          metadata: true,
        },
      })

      // Extract contentUploadIds that are linked AND media URLs from metadata
      const linkedContentUploadIds = publishedPosts
        .filter(p => p.contentUploadId)
        .map(p => p.contentUploadId as string)

      const publishedMediaUrls = publishedPosts
        .map(p => (p.metadata as Record<string, unknown> | null)?.mediaUrl as string | undefined)
        .filter((url): url is string => !!url)

      // Find content uploads that don't have any associated scheduled or outbound posts
      const draftUploads = await prisma.contentUpload.findMany({
        where: {
          profileId,
          status: 'READY', // Only show processed/ready content
          // Exclude uploads that are linked to outbound posts
          id: {
            notIn: linkedContentUploadIds.length > 0 ? linkedContentUploadIds : ['__none__'],
          },
          // Exclude uploads that have scheduled posts
          scheduledPosts: {
            none: {},
          },
          // Exclude uploads that have outbound posts (relation check)
          outboundPosts: {
            none: {},
          },
          // Exclude uploads that have TikTok posts
          tiktokPosts: {
            none: {},
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        select: {
          id: true,
          fileName: true,
          thumbnailUrl: true,
          mimeType: true,
          processedUrls: true,
          generatedCaptions: true,
          createdAt: true,
        },
      })

      // Further filter: exclude uploads whose thumbnailUrl appears in published posts' mediaUrls
      const filteredDraftUploads = draftUploads.filter(upload => {
        if (!upload.thumbnailUrl) return true
        // If this upload's thumbnail was used as media in a published post, it's not a draft
        return !publishedMediaUrls.includes(upload.thumbnailUrl)
      })

      const draftPosts = filteredDraftUploads.map((upload) => {
        const processedUrls = upload.processedUrls as { files?: Array<{ publicUrl: string }> } | null
        const captions = upload.generatedCaptions as Record<string, unknown> | null

        // Extract caption - ensure it's a string
        let captionText: string | undefined
        if (captions) {
          const rawCaption = captions.default || captions.instagram || Object.values(captions)[0]
          captionText = typeof rawCaption === 'string' ? rawCaption : undefined
        }

        return {
          id: upload.id,
          platform: 'draft',
          platformPostId: null,
          platformUrl: undefined as string | undefined,
          caption: captionText,
          postedAt: upload.createdAt.toISOString(),
          status: 'INITIATED', // Use INITIATED to represent drafts in the UI
          deletedAt: undefined as string | undefined,
          thumbnail: processedUrls?.files?.[0]?.publicUrl || upload.thumbnailUrl,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          mediaType: upload.mimeType?.startsWith('video') ? 'video' as const : 'image' as const,
          platforms: [] as string[],
          scheduledAt: undefined as string | undefined,
          isScheduled: false,
          isDraft: true,
        }
      })

      // Use the filtered count for accuracy
      // Note: For totalCount, we use the filtered list length since the additional
      // URL-based filtering can't easily be done in the DB count query
      return NextResponse.json({
        posts: draftPosts,
        count: draftPosts.length,
        totalCount: filteredDraftUploads.length,
      })
    }

    // For scheduled filter, fetch from scheduledPost table
    if (filter === 'scheduled') {
      const scheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          profileId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
        take: limit,
        include: {
          contentUpload: {
            select: {
              id: true,
              fileName: true,
              thumbnailUrl: true,
              mimeType: true,
              processedUrls: true,
            },
          },
        },
      })

      const recentPosts = scheduledPosts.map((post) => {
        const processedUrls = post.contentUpload?.processedUrls as { files?: Array<{ publicUrl: string }> } | null
        const platformContent = post.platformContent as Record<string, { caption?: string }> | null
        const firstPlatformContent = platformContent?.[post.platforms[0]?.toLowerCase()] ||
                                     platformContent?.[Object.keys(platformContent || {})[0]]

        return {
          id: post.id,
          platform: post.platforms[0]?.toLowerCase() || 'unknown',
          platforms: post.platforms.map(p => p.toLowerCase()),
          caption: firstPlatformContent?.caption,
          postedAt: post.scheduledAt?.toISOString(),
          scheduledAt: post.scheduledAt?.toISOString(),
          status: 'SCHEDULED',
          thumbnail: processedUrls?.files?.[0]?.publicUrl || post.contentUpload?.thumbnailUrl,
          fileName: post.contentUpload?.fileName,
          mimeType: post.contentUpload?.mimeType,
        }
      })

      const totalScheduled = await prisma.scheduledPost.count({
        where: {
          profileId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      })

      return NextResponse.json({
        posts: recentPosts,
        count: recentPosts.length,
        totalCount: totalScheduled,
      })
    }

    // Build where clause based on filter for outboundPost
    // Available statuses: QUEUED, PROCESSING, POSTED, FAILED, INITIATED, DELETED
    // Note: 'drafts' filter is handled above separately
    let statusFilter: OutboundPostStatus | OutboundPostStatus[] = OutboundPostStatus.POSTED
    if (filter === 'published') {
      statusFilter = OutboundPostStatus.POSTED
    } else if (filter === 'deleted') {
      statusFilter = OutboundPostStatus.DELETED // Deleted from platform
    } else if (filter === 'all') {
      // Show both posted and deleted posts
      statusFilter = [OutboundPostStatus.POSTED, OutboundPostStatus.DELETED]
    }

    // Fetch recent outbound posts
    const posts = await prisma.outboundPost.findMany({
      where: {
        profileId,
        status: Array.isArray(statusFilter) ? { in: statusFilter } : statusFilter,
        ...providerWhere,
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
    let recentPosts = posts.map((post) => {
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
        status: post.status,
        deletedAt: metadata?.deletedAt as string | undefined,
        thumbnail,
        fileName: post.contentUpload?.fileName,
        mimeType,
        mediaType: metadata?.mediaType as string | undefined,
        // Additional fields for compatibility with scheduled posts
        platforms: [post.provider.toLowerCase()],
        scheduledAt: undefined as string | undefined,
        isScheduled: false,
      }
    })

    // For 'all' filter, also include pending scheduled posts
    if (filter === 'all') {
      const scheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          profileId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
        take: 3, // Limit scheduled posts in 'all' view
        include: {
          contentUpload: {
            select: {
              id: true,
              fileName: true,
              thumbnailUrl: true,
              mimeType: true,
              processedUrls: true,
            },
          },
        },
      })

      const scheduledPostsTransformed = scheduledPosts.map((post) => {
        const processedUrls = post.contentUpload?.processedUrls as { files?: Array<{ publicUrl: string }> } | null
        const platformContent = post.platformContent as Record<string, { caption?: string }> | null
        const firstPlatformContent = platformContent?.[post.platforms[0]?.toLowerCase()] ||
                                     platformContent?.[Object.keys(platformContent || {})[0]]

        return {
          id: post.id,
          platform: post.platforms[0]?.toLowerCase() || 'unknown',
          platformPostId: null,
          platformUrl: undefined as string | undefined,
          caption: firstPlatformContent?.caption,
          postedAt: post.scheduledAt?.toISOString(),
          status: OutboundPostStatus.QUEUED, // Use QUEUED to represent scheduled posts
          deletedAt: undefined as string | undefined,
          thumbnail: processedUrls?.files?.[0]?.publicUrl || post.contentUpload?.thumbnailUrl,
          fileName: post.contentUpload?.fileName,
          mimeType: post.contentUpload?.mimeType,
          mediaType: undefined as string | undefined,
          // Additional scheduled post fields
          platforms: post.platforms.map(p => p.toLowerCase()),
          scheduledAt: post.scheduledAt?.toISOString(),
          isScheduled: true,
        }
      })

      // Prepend scheduled posts to the list
      recentPosts = [...scheduledPostsTransformed, ...recentPosts].slice(0, limit)
    }

    // Get total count of all posted content (not limited)
    const totalCount = await prisma.outboundPost.count({
      where: {
        profileId,
        status: OutboundPostStatus.POSTED,
        ...providerWhere,
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
