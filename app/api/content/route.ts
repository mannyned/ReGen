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
  uploadType: 'video' | 'image' | 'text'
  contentType: 'post' | 'story'
  selectedPlatforms: string[]
  contentDescription?: string
  customHashtags?: string
  textContent?: string
  urlContent?: string
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
    } = body

    // Validate required fields
    if (!files || files.length === 0) {
      if (uploadType !== 'text' || (!textContent && !urlContent)) {
        return NextResponse.json(
          { success: false, error: 'No content provided' },
          { status: 400 }
        )
      }
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
