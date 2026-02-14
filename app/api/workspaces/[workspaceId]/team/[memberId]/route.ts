/**
 * Workspace Team Member API Routes
 *
 * PATCH /api/workspaces/[workspaceId]/team/[memberId] - Update member permissions
 * DELETE /api/workspaces/[workspaceId]/team/[memberId] - Remove member from workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedIdentity } from '@/lib/security/identity'
import { prisma } from '@/lib/db'

// ============================================
// PATCH /api/workspaces/[workspaceId]/team/[memberId]
// Update member permissions (canRename, etc.)
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const { identity, response } = await requireVerifiedIdentity(request)
  if (response) return response
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceId, memberId } = await params

  try {
    // Only owner can update member permissions
    const workspace = await prisma.team.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (workspace.ownerId !== identity.profileId) {
      return NextResponse.json(
        { error: 'Only the workspace owner can update member permissions', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Get the member to update
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { id: true, teamId: true, role: true },
    })

    if (!member || member.teamId !== workspaceId) {
      return NextResponse.json(
        { error: 'Member not found in this workspace', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Cannot change permissions for owners
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot modify owner permissions', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { canRename } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (typeof canRename === 'boolean') {
      // canRename permission only applies to ADMIN role
      if (member.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Rename permission can only be granted to admins', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updateData.canRename = canRename
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Update the member
    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: updateData,
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
    })

    return NextResponse.json({
      member: {
        id: updatedMember.id,
        userId: updatedMember.user.id,
        email: updatedMember.user.email,
        displayName: updatedMember.user.displayName,
        avatarUrl: updatedMember.user.avatarUrl,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt,
        canRename: updatedMember.canRename,
      },
    })
  } catch (error) {
    console.error('[Workspace Team Member API] Error updating member:', error)
    return NextResponse.json(
      { error: 'Failed to update member', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/workspaces/[workspaceId]/team/[memberId]
// Remove member from workspace
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const { identity, response } = await requireVerifiedIdentity(request)
  if (response) return response
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { workspaceId, memberId } = await params

  try {
    // Get workspace and member details
    const workspace = await prisma.team.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { id: true, teamId: true, userId: true, role: true },
    })

    if (!member || member.teamId !== workspaceId) {
      return NextResponse.json(
        { error: 'Member not found in this workspace', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Cannot remove the owner
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove the workspace owner', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Check permissions: owner can remove anyone, members can only remove themselves
    const isOwner = workspace.ownerId === identity.profileId
    const isSelf = member.userId === identity.profileId

    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this member', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Remove the member
    await prisma.teamMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Workspace Team Member API] Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
