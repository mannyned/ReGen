/**
 * GET /api/cron/blog-auto-share
 *
 * Cron endpoint for automatically processing blog auto-share.
 * Checks RSS feeds for new blog posts and shares them to social platforms.
 * Runs every 15 minutes.
 *
 * Authentication:
 * - Vercel Cron: Automatically authenticated via CRON_SECRET header
 * - External: Requires Authorization header with Bearer token matching CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { blogAutoShareService } from '@/lib/services/blog-auto-share'

// Vercel Cron jobs run for up to 5 minutes on Pro plan
export const maxDuration = 300

/**
 * Verify the cron request is authorized
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET

  // If no secret configured, deny all requests
  if (!cronSecret) {
    console.warn('[BlogAutoShare Cron] CRON_SECRET not configured - cron endpoint disabled')
    return false
  }

  // Check for Vercel Cron header (Vercel automatically sends this)
  const vercelCronHeader = request.headers.get('x-vercel-cron')
  if (vercelCronHeader === cronSecret) {
    return true
  }

  // Check for Authorization header (for external schedulers or manual triggers)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return token === cronSecret
  }

  return false
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!isAuthorized(request)) {
    console.warn('[BlogAutoShare Cron] Unauthorized request', {
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const startTime = Date.now()

  try {
    console.log('[BlogAutoShare Cron] Starting blog auto-share cron job')

    const result = await blogAutoShareService.processNewItems()

    console.log('[BlogAutoShare Cron] Job completed', {
      processed: result.processed,
      published: result.published,
      drafts: result.drafts,
      failed: result.failed,
      durationMs: result.durationMs,
    })

    return NextResponse.json({
      success: true,
      processed: result.processed,
      published: result.published,
      drafts: result.drafts,
      failed: result.failed,
      skipped: result.skipped,
      durationMs: result.durationMs,
    })
  } catch (error) {
    const duration = Date.now() - startTime

    console.error('[BlogAutoShare Cron] Job failed', {
      error,
      duration,
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility with different schedulers
export const POST = GET
