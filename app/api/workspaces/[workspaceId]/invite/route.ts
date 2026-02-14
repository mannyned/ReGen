/**
 * Workspace Invite API Routes
 *
 * POST /api/workspaces/[workspaceId]/invite - Send team invite
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedIdentity } from '@/lib/security/identity'
import { prisma } from '@/lib/db'
import { isWorkspaceAdmin } from '@/lib/workspace/context'
import { randomBytes } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { identity, response } = await requireVerifiedIdentity(request)
  if (response) return response
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceId } = await params

  try {
    // Check admin access
    const isAdmin = await isWorkspaceAdmin(identity.profileId, workspaceId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required to invite members', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role = 'MEMBER' } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingUser = await prisma.profile.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existingUser) {
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          teamId: workspaceId,
          userId: existingUser.id,
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace', code: 'ALREADY_MEMBER' },
          { status: 400 }
        )
      }
    }

    // Check for existing pending invite (pending = not expired)
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId: workspaceId,
        email: normalizedEmail,
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email', code: 'ALREADY_INVITED' },
        { status: 400 }
      )
    }

    // Generate invite token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create invite
    const invite = await prisma.teamInvite.create({
      data: {
        teamId: workspaceId,
        email: normalizedEmail,
        role: role as 'ADMIN' | 'MEMBER',
        token,
        expiresAt,
        invitedById: identity.profileId,
      },
    })

    // Get workspace name for email
    const workspace = await prisma.team.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    })

    // TODO: Send invite email
    // For now, just log the invite link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/team/invite?token=${token}`
    console.log(`[Invite] Invite link for ${normalizedEmail}: ${inviteUrl}`)

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error('[Workspace Invite API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send invite', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
