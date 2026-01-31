import { NextRequest, NextResponse } from 'next/server'
import { verificationStore } from '@/lib/verification-store'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { UserTier } from '@prisma/client'

export async function POST(request: NextRequest) {
  const debugInfo: Record<string, any> = {}

  try {
    const { email, code } = await request.json()
    debugInfo.email = email
    debugInfo.codeProvided = !!code

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required', debug: debugInfo },
        { status: 400 }
      )
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.', debug: debugInfo },
        { status: 400 }
      )
    }

    // Verify the code from database
    const result = await verificationStore.verifyCode(email, code)
    debugInfo.codeVerification = result

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error, valid: false, debug: debugInfo },
        { status: 400 }
      )
    }

    // Code is valid - confirm the user's email in Supabase and create profile
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      debugInfo.error = 'SUPABASE_SERVICE_ROLE_KEY not set'
      console.warn('[Verify Code] SUPABASE_SERVICE_ROLE_KEY not set')
      return NextResponse.json({
        success: false,
        valid: true,
        error: 'Server configuration error',
        debug: debugInfo,
      }, { status: 500 })
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
      debugInfo.listError = listError.message
      console.error('[Verify Code] Failed to list users:', listError)
      return NextResponse.json(
        { error: 'Failed to verify email', debug: debugInfo },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    debugInfo.userFound = !!user
    debugInfo.userId = user?.id

    if (!user) {
      console.error('[Verify Code] User not found:', email)
      return NextResponse.json(
        { error: 'User not found in auth system', debug: debugInfo },
        { status: 404 }
      )
    }

    // Log user metadata for debugging
    debugInfo.userMetadata = user.user_metadata
    console.log('[Verify Code] User metadata:', user.user_metadata)

    // Update user to mark email as confirmed
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    )

    debugInfo.emailConfirmed = !updateError
    if (updateError) {
      debugInfo.confirmError = updateError.message
      console.error('[Verify Code] Failed to confirm email in Supabase:', updateError)
    } else {
      console.log(`[Verify Code] Email confirmed for user: ${user.id}`)
    }

    // Create or update profile in database
    const normalizedEmail = user.email?.toLowerCase() || ''
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      normalizedEmail.split('@')[0]

    debugInfo.displayNameSource = user.user_metadata?.display_name ? 'display_name' :
      user.user_metadata?.full_name ? 'full_name' :
      user.user_metadata?.name ? 'name' : 'email_fallback'
    debugInfo.displayName = displayName

    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
    })
    debugInfo.existingProfile = !!existingProfile

    // Check for beta invite
    const betaInvite = await prisma.betaInvite.findUnique({
      where: { email: normalizedEmail },
    })
    debugInfo.betaInviteFound = !!betaInvite
    debugInfo.betaInviteUsed = betaInvite?.usedAt ? true : false

    if (!existingProfile) {
      // Create new profile
      let tier: UserTier = UserTier.FREE
      let betaUser = false
      let betaExpiresAt: Date | null = null

      if (betaInvite && !betaInvite.usedAt) {
        tier = UserTier.PRO
        betaUser = true
        betaExpiresAt = new Date()
        betaExpiresAt.setDate(betaExpiresAt.getDate() + betaInvite.durationDays)

        // Mark the invite as used
        await prisma.betaInvite.update({
          where: { id: betaInvite.id },
          data: { usedAt: new Date() },
        })

        debugInfo.betaApplied = true
        debugInfo.betaExpiresAt = betaExpiresAt.toISOString()
        console.log('[Verify Code] Beta invite claimed:', {
          email: normalizedEmail,
          durationDays: betaInvite.durationDays,
        })
      }

      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

      // Create profile
      const newProfile = await prisma.profile.create({
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

      debugInfo.profileCreated = true
      debugInfo.newProfile = {
        id: newProfile.id,
        email: newProfile.email,
        displayName: newProfile.displayName,
        tier: newProfile.tier,
        betaUser: newProfile.betaUser,
      }

      console.log('[Verify Code] Created new profile:', debugInfo.newProfile)

    } else {
      // Profile exists - apply beta if needed
      debugInfo.existingProfileData = {
        id: existingProfile.id,
        displayName: existingProfile.displayName,
        tier: existingProfile.tier,
        betaUser: existingProfile.betaUser,
      }

      if (!existingProfile.betaUser && betaInvite && !betaInvite.usedAt) {
        const betaExpiresAt = new Date()
        betaExpiresAt.setDate(betaExpiresAt.getDate() + betaInvite.durationDays)

        const updatedProfile = await prisma.profile.update({
          where: { id: user.id },
          data: {
            tier: UserTier.PRO,
            betaUser: true,
            betaExpiresAt,
            displayName: existingProfile.displayName || displayName,
          },
        })

        await prisma.betaInvite.update({
          where: { id: betaInvite.id },
          data: { usedAt: new Date() },
        })

        debugInfo.betaAppliedToExisting = true
        debugInfo.updatedProfile = {
          id: updatedProfile.id,
          displayName: updatedProfile.displayName,
          tier: updatedProfile.tier,
          betaUser: updatedProfile.betaUser,
        }

        console.log('[Verify Code] Applied beta to existing profile:', debugInfo.updatedProfile)
      } else {
        debugInfo.noUpdateNeeded = true
        debugInfo.reason = existingProfile.betaUser ? 'already beta' :
          !betaInvite ? 'no invite found' : 'invite already used'
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message: 'Email verified successfully',
      debug: debugInfo,
    })

  } catch (error: any) {
    debugInfo.fatalError = error.message || String(error)
    console.error('[Verify Code] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', debug: debugInfo },
      { status: 500 }
    )
  }
}
