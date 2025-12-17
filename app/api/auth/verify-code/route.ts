import { NextRequest, NextResponse } from 'next/server'
import { verificationStore } from '@/lib/verification-store'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 }
      )
    }

    // Verify the code
    const result = verificationStore.verifyCode(email, code)

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error, valid: false },
        { status: 400 }
      )
    }

    // Code is valid - in a real app, you would:
    // 1. Mark the user's email as verified in the database
    // 2. Create a session or return a JWT token
    // 3. Redirect to onboarding or dashboard

    return NextResponse.json({
      success: true,
      valid: true,
      message: 'Email verified successfully',
    })
  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
