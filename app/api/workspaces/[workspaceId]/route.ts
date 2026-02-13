/**
 * Individual Workspace API Routes
 *
 * GET /api/workspaces/[workspaceId] - Get workspace details
 * PATCH /api/workspaces/[workspaceId] - Update workspace
 * DELETE /api/workspaces/[workspaceId] - Delete workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedIdentity } from '@/lib/security/identity'
import { prisma } from '@/lib/db'
import { hasWorkspaceAccess, isWorkspaceAdmin } from '@/lib/workspace/context'

// ============================================
// GET /api/workspaces/[workspaceId]
// ============================================

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
        },
        _count: {
          select: {
            socialConnections: true,
            contentUploads: true,
            scheduledPosts: true,
          },
        },
      },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get user's role
    const membership = workspace.members.find((m) => m.userId === identity.profileId)

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        isDefault: workspace.isDefault,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        settings: workspace.settings,
        allowMemberAccountAnalytics: workspace.allowMemberAccountAnalytics,
        role: membership?.role || 'MEMBER',
        members: workspace.members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          email: m.user.email,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        stats: {
          socialConnections: workspace._count.socialConnections,
          contentUploads: workspace._count.contentUploads,
          scheduledPosts: workspace._count.scheduledPosts,
        },
      },
    })
  } catch (error) {
    console.error('[Workspace API] Error getting workspace:', error)
    return NextResponse.json(
      { error: 'Failed to get workspace', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/workspaces/[workspaceId]
// ============================================

export async function PATCH(
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
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, settings, allowMemberAccountAnalytics } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      const trimmedName = String(name).trim().slice(0, 100)
      if (!trimmedName) {
        return NextResponse.json(
          { error: 'Workspace name cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updateData.name = trimmedName
    }

    if (settings !== undefined) {
      updateData.settings = settings
    }

    if (allowMemberAccountAnalytics !== undefined) {
      updateData.allowMemberAccountAnalytics = Boolean(allowMemberAccountAnalytics)
    }

    // Update workspace
    const workspace = await prisma.team.update({
      where: { id: workspaceId },
      data: updateData,
    })

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        isDefault: workspace.isDefault,
        settings: workspace.settings,
        allowMemberAccountAnalytics: workspace.allowMemberAccountAnalytics,
      },
    })
  } catch (error) {
    console.error('[Workspace API] Error updating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to update workspace', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/workspaces/[workspaceId]
// ============================================

export async function DELETE(
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
    // Only owner can delete workspace
    const workspace = await prisma.team.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true, isDefault: true },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (workspace.ownerId !== identity.profileId) {
      return NextResponse.json(
        { error: 'Only the workspace owner can delete it', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (workspace.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default workspace', code: 'DEFAULT_WORKSPACE' },
        { status: 400 }
      )
    }

    // Delete workspace (cascades to members and invites)
    // Note: Content is NOT deleted - workspaceId becomes null
    await prisma.$transaction(async (tx) => {
      // Clear workspace references from content
      await Promise.all([
        tx.socialConnection.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.oAuthConnection.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.contentUpload.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.scheduledPost.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.analyticsSnapshot.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.exportJob.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.rssFeed.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.outboundPost.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
        tx.blogAutoShareSettings.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        }),
      ])

      // Delete the workspace
      await tx.team.delete({
        where: { id: workspaceId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Workspace API] Error deleting workspace:', error)
    return NextResponse.json(
      { error: 'Failed to delete workspace', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
