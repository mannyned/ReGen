import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default-user'
    const { platform } = await params

    // In production, this would:
    // 1. Remove tokens from database
    // 2. Optionally revoke tokens with the platform
    // 3. Log the disconnection

    console.log(`Disconnecting ${platform} for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `${platform} disconnected successfully`,
      platform
    })

  } catch (error: any) {
    console.error('OAuth disconnect error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
