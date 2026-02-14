/**
 * Workspace Team API Routes
 *
 * GET /api/workspaces/[workspaceId]/team - Get team members and pending invites
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedIdentity } from '@/lib/security/identity'
import { prisma } from '@/lib/db'
import { hasWorkspaceAccess, getWorkspaceRole } from '@/lib/workspace/context'

export async function GET(
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
    // Check access
    const hasAccess = await hasWorkspaceAccess(identity.profileId, workspaceId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get user's role
    const userRole = await getWorkspaceRole(identity.profileId, workspaceId)

    // Get workspace with members
    const workspace = await prisma.team.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: [
            { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
            { joinedAt: 'asc' },
          ],
        },
      },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get pending invites (only for admins) - invites without status field, just check expiry
    let pendingInvites: Array<{
      id: string
      email: string
      role: string
      expiresAt: Date
      createdAt: Date
    }> = []

    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      pendingInvites = await prisma.teamInvite.findMany({
        where: {
          teamId: workspaceId,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      isDefault: workspace.isDefault,
      userRole: userRole,
      members: workspace.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
        canRename: m.canRename,
      })),
      pendingInvites: pendingInvites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    })
  } catch (error) {
    console.error('[Workspace Team API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get team', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
