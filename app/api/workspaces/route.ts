/**
 * Workspaces API Routes
 *
 * GET /api/workspaces - List user's workspaces
 * POST /api/workspaces - Create a new workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireVerifiedIdentity } from '@/lib/security/identity'
import { prisma } from '@/lib/db'
import { isWorkspacesEnabledForUser } from '@/lib/feature-flags/workspaces'
import {
  getUserWorkspaces,
  getWorkspaceLimit,
  countOwnedWorkspaces,
  getOrCreateDefaultWorkspace,
} from '@/lib/workspace/context'

// ============================================
// GET /api/workspaces - List user's workspaces
// ============================================

export async function GET(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request)
  if (response) return response
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if workspaces feature is enabled for this user
  if (!isWorkspacesEnabledForUser(identity.profileId)) {
    return NextResponse.json(
      {
        error: 'Workspaces feature not enabled',
        code: 'FEATURE_DISABLED',
      },
      { status: 403 }
    )
  }

  try {
    // For PRO users, ensure they have a default workspace
    if (identity.tier === 'PRO') {
      await getOrCreateDefaultWorkspace(identity)
    }

    // Get all workspaces user has access to
    const memberships = await getUserWorkspaces(identity)

    // Get workspace limit
    const limit = await getWorkspaceLimit(identity)

    // Transform to response format
    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const memberCount = await prisma.teamMember.count({
          where: { teamId: m.teamId },
        })

        return {
          id: m.team.id,
          name: m.team.name,
          role: m.role,
          memberCount,
          isDefault: m.team.isDefault,
        }
      })
    )

    return NextResponse.json({
      workspaces,
      workspaceLimit: limit,
    })
  } catch (error) {
    console.error('[Workspaces API] Error listing workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to list workspaces', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/workspaces - Create a new workspace
// ============================================

export async function POST(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request)
  if (response) return response
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only PRO users can create workspaces
  if (identity.tier !== 'PRO') {
    return NextResponse.json(
      {
        error: 'PRO plan required to create workspaces',
        code: 'TIER_REQUIRED',
        requiredTier: 'PRO',
      },
      { status: 403 }
    )
  }

  // Check if workspaces feature is enabled
  if (!isWorkspacesEnabledForUser(identity.profileId)) {
    return NextResponse.json(
      {
        error: 'Workspaces feature not enabled',
        code: 'FEATURE_DISABLED',
      },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { name } = body

    // Validate name
    const workspaceName = (name || 'New Workspace').trim().slice(0, 100)

    if (!workspaceName) {
      return NextResponse.json(
        { error: 'Workspace name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check workspace limit
    const [ownedCount, limit] = await Promise.all([
      countOwnedWorkspaces(identity),
      getWorkspaceLimit(identity),
    ])

    if (ownedCount >= limit) {
      return NextResponse.json(
        {
          error: 'Workspace limit reached',
          code: 'LIMIT_REACHED',
          currentCount: ownedCount,
          limit,
        },
        { status: 403 }
      )
    }

    // Create workspace
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.team.create({
        data: {
          name: workspaceName,
          ownerId: identity.profileId,
          isDefault: ownedCount === 0, // First workspace is default
        },
      })

      // Add owner as OWNER member
      await tx.teamMember.create({
        data: {
          teamId: ws.id,
          userId: identity.profileId,
          role: 'OWNER',
        },
      })

      return ws
    })

    return NextResponse.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          role: 'OWNER',
          memberCount: 1,
          isDefault: workspace.isDefault,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Workspaces API] Error creating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
