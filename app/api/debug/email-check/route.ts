/**
 * GET /api/debug/email-check
 *
 * Debug endpoint to check if the user's profile has an email address
 * DELETE THIS AFTER DEBUGGING
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get profile with email
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    })

    // Check recent scheduled posts
    const recentScheduledPosts = await prisma.scheduledPost.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        profile: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    // Check if RESEND_API_KEY is configured
    const hasResendKey = !!process.env.RESEND_API_KEY

    return NextResponse.json({
      profileId,
      profile: {
        id: profile?.id,
        hasEmail: !!profile?.email,
        email: profile?.email ? `${profile.email.substring(0, 3)}...${profile.email.slice(-10)}` : null,
      },
      recentScheduledPosts: recentScheduledPosts.map(p => ({
        id: p.id,
        status: p.status,
        profileHasEmail: !!p.profile?.email,
        scheduledAt: p.scheduledAt,
        processedAt: p.processedAt,
      })),
      config: {
        hasResendKey,
        emailFrom: process.env.EMAIL_FROM || 'ReGenr <noreply@regenr.app> (default)',
      },
    })
  } catch (error) {
    console.error('[Debug] Email check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check failed' },
      { status: 500 }
    )
  }
}
