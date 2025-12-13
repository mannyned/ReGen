// ============================================
// SHAREABLE LINK ACCESS API ROUTES
// GET/POST /api/share/[token]
// Public access for link verification and download
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { shareableLinkService } from '@/lib/services/export/ShareableLinkService'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/share/[token]
 * Get link info and check if access is allowed
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    // Get the link by token
    const link = await shareableLinkService.getShareableLinkByToken(token)

    if (!link) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Link not found or has been deleted' },
        { status: 404 }
      )
    }

    // Check if expired
    if (link.isExpired) {
      return NextResponse.json(
        { error: 'Expired', message: 'This link has expired' },
        { status: 410 }
      )
    }

    // Check download limit
    if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
      return NextResponse.json(
        { error: 'Limit Reached', message: 'Download limit has been reached for this link' },
        { status: 410 }
      )
    }

    // Return link info (public view)
    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        hasPassword: !!link.password,
        requiresEmail: link.allowedEmails && link.allowedEmails.length > 0,
        expiresAt: link.expiresAt,
        remainingDownloads: link.maxDownloads
          ? link.maxDownloads - link.downloadCount
          : null,
      },
    })
  } catch (error) {
    console.error('[Share Access API] GET Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch link info' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/share/[token]
 * Verify access and get download URL
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const body = await req.json()

    // Get client info for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Verify access
    const verification = await shareableLinkService.verifyAccess(
      token,
      body.password,
      body.email,
      ipAddress,
      userAgent
    )

    if (!verification.allowed) {
      // Determine appropriate status code
      let statusCode = 403
      if (verification.reason === 'Link not found') {
        statusCode = 404
      } else if (verification.reason === 'Link has expired') {
        statusCode = 410
      } else if (verification.reason === 'Password required') {
        statusCode = 401
      }

      return NextResponse.json(
        {
          error: 'Access Denied',
          message: verification.reason,
          requiresPassword: verification.reason === 'Password required',
          requiresEmail: verification.reason === 'Email verification required',
        },
        { status: statusCode }
      )
    }

    // Access granted - return download info
    // In production, this would return a signed URL to the actual file
    const link = verification.link!

    return NextResponse.json({
      success: true,
      message: 'Access granted',
      download: {
        // This would be the actual file download URL in production
        url: `/api/analytics/export/download/${link.exportJobId}?shareToken=${token}`,
        expiresIn: 300, // URL valid for 5 minutes
      },
    })
  } catch (error) {
    console.error('[Share Access API] POST Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to verify access' },
      { status: 500 }
    )
  }
}
