/**
 * Blog Auto-Share Settings API
 *
 * GET  - Retrieve user's auto-share settings
 * POST - Create or update auto-share settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { BLOG_AUTO_SHARE_V1_PLATFORMS } from '@/lib/config/platformCapabilities'

// ============================================
// GET - Retrieve Settings
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.blogAutoShareSettings.findUnique({
      where: { profileId: user.id },
    })

    // Return settings or defaults
    const response = settings || {
      enabled: false,
      platforms: [],
      autoPublish: false,
      defaultImageUrl: null,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      postingWindowEnabled: false,
      postingWindowStart: null,
      postingWindowEnd: null,
      captionTemplates: null,
      feedIds: [],
      onlyNewPosts: true,
      enabledAt: null,
      discordChannelId: null,
      pinterestBoardId: null,
      linkedinOrgUrn: null,
    }

    // Include available platforms for reference
    return NextResponse.json({
      success: true,
      settings: response,
      availablePlatforms: BLOG_AUTO_SHARE_V1_PLATFORMS,
    })
  } catch (error) {
    console.error('[BlogAutoShare] Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve settings' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Create/Update Settings
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate platforms - only allow V1 platforms
    const platforms = (body.platforms || []).filter((p: string) =>
      BLOG_AUTO_SHARE_V1_PLATFORMS.includes(p as any)
    )

    // Validate quiet hours
    let quietHoursStart = body.quietHoursStart
    let quietHoursEnd = body.quietHoursEnd
    if (quietHoursStart !== null && quietHoursStart !== undefined) {
      quietHoursStart = Math.max(0, Math.min(23, parseInt(quietHoursStart, 10)))
    }
    if (quietHoursEnd !== null && quietHoursEnd !== undefined) {
      quietHoursEnd = Math.max(0, Math.min(23, parseInt(quietHoursEnd, 10)))
    }

    // Validate posting window
    let postingWindowStart = body.postingWindowStart
    let postingWindowEnd = body.postingWindowEnd
    if (postingWindowStart !== null && postingWindowStart !== undefined) {
      postingWindowStart = Math.max(0, Math.min(23, parseInt(postingWindowStart, 10)))
    }
    if (postingWindowEnd !== null && postingWindowEnd !== undefined) {
      postingWindowEnd = Math.max(0, Math.min(23, parseInt(postingWindowEnd, 10)))
    }

    // Check if we need to set enabledAt (when enabling for first time or re-enabling with onlyNewPosts)
    const existingSettings = await prisma.blogAutoShareSettings.findUnique({
      where: { profileId: user.id },
    })

    // Set enabledAt when:
    // 1. Enabling for the first time
    // 2. Re-enabling after being disabled (if onlyNewPosts is true)
    const shouldSetEnabledAt = body.enabled && (body.onlyNewPosts ?? true) && (
      !existingSettings?.enabled || // Was disabled or new
      !existingSettings?.enabledAt   // Never had enabledAt set
    )

    const enabledAt = shouldSetEnabledAt ? new Date() : (existingSettings?.enabledAt || null)

    // Upsert settings
    const settings = await prisma.blogAutoShareSettings.upsert({
      where: { profileId: user.id },
      create: {
        profileId: user.id,
        enabled: body.enabled ?? false,
        platforms,
        autoPublish: body.autoPublish ?? false,
        defaultImageUrl: body.defaultImageUrl || null,
        quietHoursEnabled: body.quietHoursEnabled ?? false,
        quietHoursStart,
        quietHoursEnd,
        postingWindowEnabled: body.postingWindowEnabled ?? false,
        postingWindowStart,
        postingWindowEnd,
        captionTemplates: body.captionTemplates || null,
        feedIds: body.feedIds || [],
        onlyNewPosts: body.onlyNewPosts ?? true,
        enabledAt: body.enabled ? new Date() : null,
        discordChannelId: body.discordChannelId || null,
        pinterestBoardId: body.pinterestBoardId || null,
        linkedinOrgUrn: body.linkedinOrgUrn || null,
      },
      update: {
        enabled: body.enabled,
        platforms,
        autoPublish: body.autoPublish,
        defaultImageUrl: body.defaultImageUrl,
        quietHoursEnabled: body.quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        postingWindowEnabled: body.postingWindowEnabled,
        postingWindowStart,
        postingWindowEnd,
        captionTemplates: body.captionTemplates,
        feedIds: body.feedIds,
        onlyNewPosts: body.onlyNewPosts ?? true,
        enabledAt,
        discordChannelId: body.discordChannelId,
        pinterestBoardId: body.pinterestBoardId,
        linkedinOrgUrn: body.linkedinOrgUrn,
      },
    })

    console.log(`[BlogAutoShare] Settings updated for user ${user.id}`)

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('[BlogAutoShare] Settings POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
