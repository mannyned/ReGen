import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const { platform } = await params

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings?error=${encodeURIComponent(error)}`
      )
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings?error=no_code`
      )
    }

    // Decode and validate state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state || '', 'base64').toString())
    } catch (e) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings?error=invalid_state`
      )
    }

    // In production, this would:
    // 1. Exchange authorization code for access token
    // 2. Fetch user profile from the platform
    // 3. Store tokens securely in database
    // 4. Associate account with user

    console.log(`OAuth callback received for ${platform}`)
    console.log('Authorization code:', code.substring(0, 10) + '...')
    console.log('State:', stateData)

    // For demo purposes, simulate a successful connection
    const mockUsername = `demo_${platform}_user`

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings?connected=${platform}&username=${mockUsername}`
    )

  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings?error=${encodeURIComponent(error.message)}`
    )
  }
}
