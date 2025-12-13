import { NextRequest, NextResponse } from 'next/server'
import { exportService } from '@/lib/services/export'
import { createProOnlyMiddleware, type UserContext } from '@/lib/middleware/roleGuard'

// ============================================
// GET /api/analytics/export/download/[jobId]
// Download completed export (PRO only)
// ============================================

const proGuard = createProOnlyMiddleware()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return proGuard(request, async (req: NextRequest, user: UserContext) => {
    try {
      const { jobId } = await params

      if (!jobId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Job ID is required',
          },
          { status: 400 }
        )
      }

      // Get export content
      const result = await exportService.downloadExport(user.userId, jobId)

      if (!result) {
        return NextResponse.json(
          {
            success: false,
            error: 'Export not found or not ready for download',
          },
          { status: 404 }
        )
      }

      // Set appropriate headers for file download
      const headers = new Headers()
      headers.set('Content-Type', result.contentType)
      headers.set('Content-Disposition', `attachment; filename="${result.fileName}"`)
      headers.set('Cache-Control', 'private, max-age=3600')

      // For CSV, return text content directly
      if (result.contentType === 'text/csv') {
        headers.set('Content-Type', 'text/csv; charset=utf-8')
        return new NextResponse(result.content, {
          status: 200,
          headers,
        })
      }

      // For PDF (HTML content that needs conversion)
      // In production, you would convert HTML to PDF here
      // For now, return HTML with PDF-like headers
      if (result.contentType === 'application/pdf') {
        // Note: In production, use puppeteer/playwright to convert HTML to PDF
        // const pdfBuffer = await convertHtmlToPdf(result.content)
        // return new NextResponse(pdfBuffer, { status: 200, headers })

        // For now, return HTML content for client-side PDF generation
        headers.set('Content-Type', 'text/html; charset=utf-8')
        headers.set('X-Export-Format', 'pdf')
        headers.set('Content-Disposition', `attachment; filename="${result.fileName.replace('.pdf', '.html')}"`)
        return new NextResponse(result.content, {
          status: 200,
          headers,
        })
      }

      return new NextResponse(result.content, {
        status: 200,
        headers,
      })
    } catch (error: unknown) {
      console.error('Export download error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to download export',
        },
        { status: 500 }
      )
    }
  })
}
