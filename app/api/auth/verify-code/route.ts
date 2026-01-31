import { NextRequest, NextResponse } from 'next/server'
import { verificationStore } from '@/lib/verification-store'
import { createClient } from '@supabase/supabase-js'

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

    // Code is valid - confirm the user's email in Supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      // Find the user by email
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (!listError && users) {
        const user = users.users.find(u => u.email === email)

        if (user) {
          // Update user to mark email as confirmed
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
          )

          if (updateError) {
            console.error('[Verify Code] Failed to confirm email in Supabase:', updateError)
          } else {
            console.log(`[Verify Code] Email confirmed for user: ${user.id}`)
          }
        }
      }
    } else {
      console.warn('[Verify Code] SUPABASE_SERVICE_ROLE_KEY not set - email not confirmed in Supabase')
    }

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
