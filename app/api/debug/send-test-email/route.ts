/**
 * GET /api/debug/send-test-email
 *
 * Debug endpoint to test email sending directly
 * DELETE THIS AFTER DEBUGGING
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { sendScheduledPostNotification } from '@/lib/email'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get profile email
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { email: true },
    })

    if (!profile?.email) {
      return NextResponse.json({ error: 'No email found for profile' }, { status: 400 })
    }

    console.log('[Test Email] Sending test email to:', profile.email)

    // Send a test notification
    const result = await sendScheduledPostNotification({
      email: profile.email,
      name: 'Test User',
      platforms: ['instagram'],
      status: 'COMPLETED',
      successPlatforms: ['instagram'],
      failedPlatforms: [],
      caption: 'This is a test notification to verify email sending works.',
    })

    console.log('[Test Email] Result:', result)

    return NextResponse.json({
      success: result.success,
      emailId: result.id,
      error: result.error,
      sentTo: `${profile.email.substring(0, 3)}...${profile.email.slice(-10)}`,
    })
  } catch (error) {
    console.error('[Test Email] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
