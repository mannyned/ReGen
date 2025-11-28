import { NextRequest, NextResponse } from 'next/server'

// Store mock posts in memory (in production, use a database)
let mockPosts: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platforms, content, caption, hashtags, scheduleTime, files } = body

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Create mock post data
    const mockPost = {
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platforms,
      content,
      caption,
      hashtags,
      files: files?.map((f: any) => ({
        name: f.name,
        type: f.type,
        size: f.size
      })),
      scheduleTime: scheduleTime || 'immediate',
      status: 'success',
      postedAt: new Date().toISOString(),
      testMode: true,
      results: platforms.map((platform: string) => ({
        platform,
        status: 'success',
        mockUrl: `https://${platform}.com/mock-post/${Date.now()}`,
        message: `Successfully posted to ${platform} (TEST MODE)`,
        engagement: {
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 100),
          shares: Math.floor(Math.random() * 50),
          views: Math.floor(Math.random() * 5000)
        }
      }))
    }

    // Store in memory
    mockPosts.push(mockPost)

    // Keep only last 50 posts in memory
    if (mockPosts.length > 50) {
      mockPosts = mockPosts.slice(-50)
    }

    return NextResponse.json({
      success: true,
      message: 'Content successfully posted to all platforms (TEST MODE)',
      post: mockPost,
      testMode: true
    })

  } catch (error: any) {
    console.error('Mock publish error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        testMode: true
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve mock posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const recentPosts = mockPosts.slice(-limit).reverse()

    return NextResponse.json({
      success: true,
      posts: recentPosts,
      total: mockPosts.length,
      testMode: true
    })

  } catch (error: any) {
    console.error('Mock fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        testMode: true
      },
      { status: 500 }
    )
  }
}