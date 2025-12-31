import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// ============================================
// GET /api/content/[id]
// Get a specific content by ID
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const content = await prisma.contentUpload.findFirst({
      where: {
        id,
        profileId: user.id,
      },
    })

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      content,
    })
  } catch (error: unknown) {
    console.error('Get content error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/content/[id]
// Update content (e.g., add generated captions)
// ============================================

interface UpdateContentRequest {
  generatedCaptions?: Record<string, {
    caption: string
    hashtags: string[]
    usageMode?: string
    appliedAdaptations?: string[]
  }>
  status?: 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify ownership
    const existing = await prisma.contentUpload.findFirst({
      where: {
        id,
        profileId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    const body: UpdateContentRequest = await request.json()
    const { generatedCaptions, status } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (generatedCaptions !== undefined) {
      updateData.generatedCaptions = generatedCaptions
    }

    if (status !== undefined) {
      updateData.status = status
    }

    const content = await prisma.contentUpload.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      content,
    })
  } catch (error: unknown) {
    console.error('Update content error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update content' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/content/[id]
// Archive content (soft delete)
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify ownership
    const existing = await prisma.contentUpload.findFirst({
      where: {
        id,
        profileId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting status to ARCHIVED
    await prisma.contentUpload.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })

    return NextResponse.json({
      success: true,
      message: 'Content archived',
    })
  } catch (error: unknown) {
    console.error('Delete content error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete content' },
      { status: 500 }
    )
  }
}
