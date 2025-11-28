import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'

    // For now, return empty connected platforms
    // In production, this would query a database for connected accounts
    return NextResponse.json({
      success: true,
      connectedPlatforms: [],
      message: 'OAuth is not fully configured. See OAUTH_SETUP_GUIDE.md for setup instructions.'
    })

  } catch (error: any) {
    console.error('OAuth status error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
