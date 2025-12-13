// ============================================
// SHAREABLE LINKS API ROUTES
// GET/POST /api/share
// PRO-Only Feature
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { shareableLinkService } from '@/lib/services/export/ShareableLinkService'
import { createProOnlyMiddleware } from '@/lib/middleware/roleGuard'
import type { ShareableLinkCreateInput } from '@/lib/types/export'
import type { PlanTier } from '@prisma/client'

// Mock function to get user from session
async function getCurrentUser(req: NextRequest): Promise<{
  id: string
  email: string
  plan: PlanTier
} | null> {
  return {
    id: 'user_123',
    email: 'test@example.com',
    plan: 'PRO',
  }
}

/**
 * GET /api/share
 * List all shareable links for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      )
    }

    // Check PRO access
    const middleware = createProOnlyMiddleware()
    const accessCheck = middleware({ user })

    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Shareable links require PRO plan',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    const links = await shareableLinkService.getUserShareableLinks(user.id)

    // Enrich with stats
    const linksWithStats = await Promise.all(
      links.map(async (link) => {
        const stats = await shareableLinkService.getLinkStats(link.id, user.id)
        return {
          ...link,
          stats,
          // Don't expose password hash
          password: link.password ? true : false,
        }
      })
    )

    return NextResponse.json({
      success: true,
      links: linksWithStats,
      count: links.length,
    })
  } catch (error) {
    console.error('[Shareable Links API] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch shareable links' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/share
 * Create a new shareable link
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      )
    }

    // Check PRO access
    const middleware = createProOnlyMiddleware()
    const accessCheck = middleware({ user })

    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Shareable links require PRO plan',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    // Validate required fields
    if (!body.exportJobId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required field: exportJobId' },
        { status: 400 }
      )
    }

    // Validate expiration
    if (body.expiresInHours !== undefined) {
      if (typeof body.expiresInHours !== 'number' || body.expiresInHours < 1 || body.expiresInHours > 720) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'expiresInHours must be between 1 and 720 (30 days)' },
          { status: 400 }
        )
      }
    }

    // Validate max downloads
    if (body.maxDownloads !== undefined) {
      if (typeof body.maxDownloads !== 'number' || body.maxDownloads < 1 || body.maxDownloads > 1000) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'maxDownloads must be between 1 and 1000' },
          { status: 400 }
        )
      }
    }

    // Validate allowed emails
    if (body.allowedEmails !== undefined) {
      if (!Array.isArray(body.allowedEmails)) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'allowedEmails must be an array' },
          { status: 400 }
        )
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const email of body.allowedEmails) {
        if (!emailRegex.test(email)) {
          return NextResponse.json(
            { error: 'Bad Request', message: `Invalid email format: ${email}` },
            { status: 400 }
          )
        }
      }
    }

    const input: ShareableLinkCreateInput = {
      userId: user.id,
      exportJobId: body.exportJobId,
      expiresInHours: body.expiresInHours,
      password: body.password,
      maxDownloads: body.maxDownloads,
      allowedEmails: body.allowedEmails,
    }

    const result = await shareableLinkService.createShareableLink(input, user.plan)

    return NextResponse.json({
      success: true,
      link: {
        ...result.link,
        password: result.link.password ? true : false,
      },
      urls: {
        full: result.fullUrl,
        short: result.shortUrl,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Shareable Links API] POST Error:', error)

    if (error instanceof Error && error.message.includes('PRO')) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create shareable link' },
      { status: 500 }
    )
  }
}
