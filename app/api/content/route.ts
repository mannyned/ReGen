import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// ============================================
// POST /api/content
// Create a new ContentUpload record
// ============================================

interface CreateContentRequest {
  files: Array<{
    publicUrl: string
    fileName: string
    fileSize: number
    mimeType: string
  }>
  uploadType: 'video' | 'image' | 'media' | 'text'
  contentType: 'post' | 'story'
  selectedPlatforms: string[]
  contentDescription?: string
  customHashtags?: string
  textContent?: string
  urlContent?: string
  // Platform-specific settings (e.g., Pinterest board ID)
  platformSettings?: {
    pinterest?: {
      boardId?: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: CreateContentRequest = await request.json()
    const {
      files,
      uploadType,
      contentType,
      selectedPlatforms,
      contentDescription,
      customHashtags,
      textContent,
      urlContent,
      platformSettings,
    } = body

    // Validate required fields
    // For 'text' mode: require text/URL content OR files (we now allow media with text)
    // For other modes: require files
    const hasFiles = files && files.length > 0
    const hasTextContent = textContent || urlContent

    if (!hasFiles && !hasTextContent) {
      return NextResponse.json(
        { success: false, error: 'No content provided. Please upload files or enter text/URL.' },
        { status: 400 }
      )
    }

    // Get the primary file (first file) or use placeholder for text content
    const primaryFile = files?.[0] || {
      publicUrl: '',
      fileName: 'text-content',
      fileSize: textContent?.length || urlContent?.length || 0,
      mimeType: 'text/plain',
    }

    // Create ContentUpload record
    const contentUpload = await prisma.contentUpload.create({
      data: {
        profileId: user.id,
        originalUrl: primaryFile.publicUrl,
        fileName: primaryFile.fileName,
        fileSize: primaryFile.fileSize,
        mimeType: primaryFile.mimeType,
        status: 'READY',
        // Store additional data in processedUrls JSON field
        processedUrls: {
          files: files || [],
          uploadType,
          contentType,
          selectedPlatforms,
          contentDescription: contentDescription || '',
          customHashtags: customHashtags || '',
          textContent: textContent || '',
          urlContent: urlContent || '',
          platformSettings: platformSettings || {},
        },
      },
    })

    return NextResponse.json({
      success: true,
      contentId: contentUpload.id,
      content: {
        id: contentUpload.id,
        originalUrl: contentUpload.originalUrl,
        fileName: contentUpload.fileName,
        status: contentUpload.status,
      },
    })
  } catch (error: unknown) {
    console.error('Create content error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create content' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/content?id=xxx
// Delete a draft ContentUpload record
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('id')

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Find the content and verify ownership
    const content = await prisma.contentUpload.findFirst({
      where: {
        id: contentId,
        profileId: user.id,
      },
      include: {
        scheduledPosts: { select: { id: true } },
        outboundPosts: { select: { id: true } },
      },
    })

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    // Check if content has associated posts (shouldn't delete if published/scheduled)
    if (content.scheduledPosts.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete content with scheduled posts. Cancel the scheduled posts first.' },
        { status: 400 }
      )
    }

    if (content.outboundPosts.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete content that has been published.' },
        { status: 400 }
      )
    }

    // Delete the content (this is a draft with no associated posts)
    await prisma.contentUpload.delete({
      where: { id: contentId },
    })

    // Optionally: Delete files from Supabase storage
    // For now, we'll just delete the database record
    // Storage cleanup can be handled by a background job

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    })
  } catch (error: unknown) {
    console.error('Delete content error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete content' },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/content
// Get all content for the authenticated user
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const contents = await prisma.contentUpload.findMany({
      where: {
        profileId: user.id,
        status: { not: 'ARCHIVED' },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      contents,
    })
  } catch (error: unknown) {
    console.error('Get content error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch content' },
      { status: 500 }
    )
  }
}
