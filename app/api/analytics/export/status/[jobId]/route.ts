import { NextRequest, NextResponse } from 'next/server'
import { exportService } from '@/lib/services/export'
import { createProOnlyMiddleware, type UserContext } from '@/lib/middleware/roleGuard'

// ============================================
// GET /api/analytics/export/status/[jobId]
// Get export job status (PRO only)
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

      // Get job status
      const job = await exportService.getJobStatus(user.userId, jobId)

      if (!job) {
        return NextResponse.json(
          {
            success: false,
            error: 'Export job not found',
          },
          { status: 404 }
        )
      }

      // Build response based on job status
      const response: {
        success: boolean
        job: {
          id: string
          format: string
          status: string
          progress: number
          createdAt: Date
          completedAt?: Date
          error?: string
        }
        downloadUrl?: string
      } = {
        success: true,
        job: {
          id: job.id,
          format: job.format,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error,
        },
      }

      // Add download URL if job is completed
      if (job.status === 'completed') {
        response.downloadUrl = `/api/analytics/export/download/${job.id}`
      }

      return NextResponse.json(response)
    } catch (error: unknown) {
      console.error('Export status error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get export status',
        },
        { status: 500 }
      )
    }
  })
}
