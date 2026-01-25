/**
 * Blog Auto-Share Manual Trigger API
 *
 * POST - Manually trigger blog auto-share processing for testing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { blogAutoShareService } from '@/lib/services/blog-auto-share'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has Blog Auto-Share enabled
    const settings = await prisma.blogAutoShareSettings.findUnique({
      where: { profileId: user.id },
    })

    if (!settings?.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Blog Auto-Share is not enabled. Enable it in settings first.',
      }, { status: 400 })
    }

    if (settings.platforms.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No platforms selected. Select at least one platform in settings.',
      }, { status: 400 })
    }

    // Check if blog URL is configured
    if (!settings.blogUrl) {
      return NextResponse.json({
        success: false,
        error: 'No blog URL configured. Add your blog RSS feed URL in settings.',
      }, { status: 400 })
    }

    // Check for resetDate option in request body
    let body: { resetDate?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // No body or invalid JSON, use defaults
    }

    // If resetDate is true, update enabledAt to now
    if (body.resetDate) {
      await prisma.blogAutoShareSettings.update({
        where: { profileId: user.id },
        data: { enabledAt: new Date() },
      })
      console.log(`[BlogAutoShare] Reset enabledAt date for user ${user.id}`)
    }

    // Get updated settings
    const currentSettings = body.resetDate
      ? await prisma.blogAutoShareSettings.findUnique({ where: { profileId: user.id } })
      : settings

    console.log(`[BlogAutoShare] Manual trigger for user ${user.id} - Blog URL: ${settings.blogUrl}`)
    console.log(`[BlogAutoShare] enabledAt: ${currentSettings?.enabledAt}`)

    // Run processing for this user only
    const result = await blogAutoShareService.processNewItems()

    // Generate appropriate message with more details
    let message = 'Processing complete.'
    if (result.processed === 0) {
      const enabledAtStr = currentSettings?.enabledAt
        ? new Date(currentSettings.enabledAt).toLocaleString()
        : 'not set'
      message = `No new blog posts found. Only posts published after ${enabledAtStr} will be processed. If your post is older, try "Reset Date & Test" button.`
    } else if (result.drafts > 0) {
      message = `Created ${result.drafts} draft(s) for review. Check the Posts tab.`
    } else if (result.published > 0) {
      message = `Published ${result.published} post(s) successfully!`
    } else if (result.failed > 0) {
      message = `Failed to publish ${result.failed} post(s). Check the Posts tab for details.`
    }

    return NextResponse.json({
      success: true,
      message,
      processed: result.processed,
      drafts: result.drafts,
      published: result.published,
      failed: result.failed,
      durationMs: result.durationMs,
      enabledAt: currentSettings?.enabledAt,
      blogUrl: settings.blogUrl,
    })
  } catch (error) {
    console.error('[BlogAutoShare] Manual trigger error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger auto-share'
      },
      { status: 500 }
    )
  }
}
