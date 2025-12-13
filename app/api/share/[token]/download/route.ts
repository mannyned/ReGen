// ============================================
// SHAREABLE LINK DOWNLOAD API ROUTE
// GET /api/share/[token]/download
// Record download and redirect to file
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { shareableLinkService } from '@/lib/services/export/ShareableLinkService'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/share/[token]/download
 * Download the file associated with this link
 * Must have verified access first via POST /api/share/[token]
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const searchParams = req.nextUrl.searchParams
    const verificationToken = searchParams.get('v') // Verification token from access check

    // Get client info for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Get the link
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
        { error: 'Limit Reached', message: 'Download limit has been reached' },
        { status: 410 }
      )
    }

    // Record the download
    await shareableLinkService.recordDownload(token, ipAddress, userAgent)

    // In production, this would:
    // 1. Generate a signed URL to the actual file in cloud storage
    // 2. Return a redirect to that URL
    // 3. Or stream the file directly

    // For now, redirect to the export download endpoint
    const downloadUrl = new URL(
      `/api/analytics/export/download/${link.exportJobId}`,
      req.nextUrl.origin
    )

    // Add a special header to indicate this is from a share link
    // The download endpoint can use this for audit logging
    return NextResponse.redirect(downloadUrl, {
      status: 302,
      headers: {
        'X-Share-Token': token,
        'X-Share-Link-Id': link.id,
      },
    })
  } catch (error) {
    console.error('[Share Download API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to process download' },
      { status: 500 }
    )
  }
}
