import { NextRequest, NextResponse } from 'next/server'
import { verificationStore } from '@/lib/verification-store'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { UserTier } from '@prisma/client'

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

    // Verify the code from database
    const result = await verificationStore.verifyCode(email, code)

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error, valid: false },
        { status: 400 }
      )
    }

    // Code is valid - confirm the user's email in Supabase and create profile
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Verify Code] SUPABASE_SERVICE_ROLE_KEY not set')
      return NextResponse.json({
        success: true,
        valid: true,
        message: 'Email verified successfully',
      })
    }

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

    if (listError) {
      console.error('[Verify Code] Failed to list users:', listError)
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      console.error('[Verify Code] User not found:', email)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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

    // Create or update profile in database (same logic as auth callback)
    try {
      const existingProfile = await prisma.profile.findUnique({
        where: { id: user.id },
      })

      if (!existingProfile) {
        // Extract user info from metadata
        const normalizedEmail = user.email?.toLowerCase() || ''
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          normalizedEmail.split('@')[0]
        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null

        // Check if there's a beta invite for this email
        const betaInvite = await prisma.betaInvite.findUnique({
          where: { email: normalizedEmail },
        })

        let tier: UserTier = UserTier.FREE
        let betaUser = false
        let betaExpiresAt: Date | null = null

        if (betaInvite && !betaInvite.usedAt) {
          // User has a beta invite - upgrade to PRO with expiration
          tier = UserTier.PRO
          betaUser = true
          betaExpiresAt = new Date()
          betaExpiresAt.setDate(betaExpiresAt.getDate() + betaInvite.durationDays)

          // Mark the invite as used
          await prisma.betaInvite.update({
            where: { id: betaInvite.id },
            data: { usedAt: new Date() },
          })

          console.log('[Verify Code] Beta invite claimed:', {
            email: normalizedEmail,
            durationDays: betaInvite.durationDays,
            expiresAt: betaExpiresAt.toISOString(),
          })
        }

        // Create new profile
        await prisma.profile.create({
          data: {
            id: user.id,
            email: normalizedEmail,
            displayName,
            avatarUrl,
            tier,
            betaUser,
            betaExpiresAt,
          },
        })

        console.log('[Verify Code] Created new profile for user:', user.id, {
          displayName,
          tier,
          betaUser
        })
      } else {
        console.log('[Verify Code] Profile already exists for user:', user.id)
      }
    } catch (profileError) {
      console.error('[Verify Code] Profile creation error:', profileError)
      // Don't fail the verification - user can still log in
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
