/**
 * Workspace Context Utilities
 *
 * Provides workspace-aware data access patterns.
 * Handles both workspace-enabled and legacy (profile-scoped) modes.
 */

import 'server-only'

import { prisma } from '@/lib/db'
import type { VerifiedIdentity } from '@/lib/security/identity'
import { isWorkspacesEnabledForUser } from '@/lib/feature-flags/workspaces'
import type { TeamRole } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface WorkspaceContext {
  /** Workspace ID (null if using legacy profile scoping) */
  workspaceId: string | null
  /** Workspace name */
  workspaceName: string | null
  /** User's role in this workspace */
  role: TeamRole
  /** Whether user can manage workspace (Owner or Admin) */
  isAdmin: boolean
  /** Whether this is the user's default workspace */
  isDefault: boolean
}

export interface WorkspaceMembership {
  id: string
  teamId: string
  role: TeamRole
  team: {
    id: string
    name: string
    isDefault: boolean
    ownerId: string
  }
}

// ============================================
// WORKSPACE ACCESS
// ============================================

/**
 * Get the active workspace context for a user
 *
 * If workspaces are disabled, returns null (use legacy profileId scoping).
 * If a specific workspace is requested, verifies access.
 * Otherwise, returns the user's default workspace.
 *
 * @param identity - Verified user identity
 * @param requestedWorkspaceId - Optional specific workspace to access
 * @returns WorkspaceContext or null if workspaces disabled/no access
 */
export async function getActiveWorkspace(
  identity: VerifiedIdentity,
  requestedWorkspaceId?: string | null
): Promise<WorkspaceContext | null> {
  // Check if workspaces are enabled for this user
  if (!isWorkspacesEnabledForUser(identity.profileId)) {
    return null // Use legacy profileId scoping
  }

  // If specific workspace requested, verify access
  if (requestedWorkspaceId) {
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId: identity.profileId,
        teamId: requestedWorkspaceId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            isDefault: true,
            ownerId: true,
          },
        },
      },
    })

    if (!membership) {
      return null // No access to this workspace
    }

    return {
      workspaceId: membership.teamId,
      workspaceName: membership.team.name,
      role: membership.role,
      isAdmin: membership.role === 'OWNER' || membership.role === 'ADMIN',
      isDefault: membership.team.isDefault,
    }
  }

  // Get or create default workspace for PRO users
  if (identity.tier === 'PRO') {
    const defaultWorkspace = await getOrCreateDefaultWorkspace(identity)

    return {
      workspaceId: defaultWorkspace.id,
      workspaceName: defaultWorkspace.name,
      role: 'OWNER',
      isAdmin: true,
      isDefault: true,
    }
  }

  // Non-PRO users don't get workspaces
  return null
}

/**
 * Get all workspaces a user has access to
 *
 * @param identity - Verified user identity
 * @returns Array of workspace memberships
 */
export async function getUserWorkspaces(
  identity: VerifiedIdentity
): Promise<WorkspaceMembership[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId: identity.profileId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          isDefault: true,
          ownerId: true,
        },
      },
    },
    orderBy: [
      { team: { isDefault: 'desc' } }, // Default workspace first
      { joinedAt: 'asc' }, // Then by join date
    ],
  })

  return memberships
}

/**
 * Get the user's workspace limit
 *
 * @param identity - Verified user identity
 * @returns Maximum number of workspaces the user can own
 */
export async function getWorkspaceLimit(identity: VerifiedIdentity): Promise<number> {
  const profile = await prisma.profile.findUnique({
    where: { id: identity.profileId },
    select: { workspaceLimit: true },
  })

  return profile?.workspaceLimit ?? 1
}

/**
 * Count workspaces owned by a user
 *
 * @param identity - Verified user identity
 * @returns Number of workspaces the user owns
 */
export async function countOwnedWorkspaces(identity: VerifiedIdentity): Promise<number> {
  return prisma.team.count({
    where: { ownerId: identity.profileId },
  })
}

// ============================================
// DEFAULT WORKSPACE MANAGEMENT
// ============================================

/**
 * Get or create the default workspace for a PRO user
 *
 * This is called lazily when a PRO user first accesses workspace features.
 * It's idempotent - safe to call multiple times.
 *
 * @param identity - Verified user identity
 * @returns The default workspace
 */
export async function getOrCreateDefaultWorkspace(identity: VerifiedIdentity) {
  console.log('[Workspace] getOrCreateDefaultWorkspace called for:', identity.profileId)

  // Check if user already has a default workspace
  let workspace = await prisma.team.findFirst({
    where: {
      ownerId: identity.profileId,
      isDefault: true,
    },
  })

  if (workspace) {
    console.log('[Workspace] Found existing default workspace:', workspace.id)
    // Ensure owner is in team_members (fix for orphaned workspaces)
    const membership = await prisma.teamMember.findFirst({
      where: { teamId: workspace.id, userId: identity.profileId },
    })
    if (!membership) {
      console.log('[Workspace] Adding missing team membership for owner')
      await prisma.teamMember.create({
        data: {
          teamId: workspace.id,
          userId: identity.profileId,
          role: 'OWNER',
        },
      })
    }
    return workspace
  }

  // Check if user has any workspace at all
  workspace = await prisma.team.findFirst({
    where: { ownerId: identity.profileId },
  })

  if (workspace) {
    console.log('[Workspace] Found existing workspace, marking as default:', workspace.id)
    // Mark existing workspace as default
    await prisma.team.update({
      where: { id: workspace.id },
      data: { isDefault: true },
    })
    return workspace
  }

  console.log('[Workspace] Creating new default workspace for:', identity.profileId)

  // Create new default workspace with content migration
  try {
    const result = await prisma.$transaction(async (tx) => {
      const newWorkspace = await tx.team.create({
        data: {
          name: 'My Workspace',
          ownerId: identity.profileId,
          isDefault: true,
        },
      })
      console.log('[Workspace] Created workspace:', newWorkspace.id)

      // Add owner as OWNER member
      await tx.teamMember.create({
        data: {
          teamId: newWorkspace.id,
          userId: identity.profileId,
          role: 'OWNER',
        },
      })
      console.log('[Workspace] Added owner as member')

      // Migrate existing content to this workspace
      await migrateUserContentToWorkspace(tx, identity.profileId, newWorkspace.id)
      console.log('[Workspace] Migrated content')

      return newWorkspace
    })
    console.log('[Workspace] Transaction complete:', result.id)
    return result
  } catch (error) {
    console.error('[Workspace] Error creating workspace:', error)
    throw error
  }
}

/**
 * Migrate a user's existing content to a workspace
 *
 * Only migrates content that doesn't already have a workspace_id.
 * This is called during default workspace creation.
 */
async function migrateUserContentToWorkspace(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  profileId: string,
  workspaceId: string
) {
  // Migrate all content tables
  await Promise.all([
    tx.socialConnection.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.oAuthConnection.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.contentUpload.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.scheduledPost.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.analyticsSnapshot.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.exportJob.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.rssFeed.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.outboundPost.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
    tx.blogAutoShareSettings.updateMany({
      where: { profileId, workspaceId: null },
      data: { workspaceId },
    }),
  ])
}

// ============================================
// WORKSPACE MEMBERSHIP
// ============================================

/**
 * Check if a user has access to a specific workspace
 *
 * @param userId - User's profile ID
 * @param workspaceId - Workspace ID to check
 * @returns true if user has access
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId: workspaceId,
    },
  })

  return membership !== null
}

/**
 * Check if a user is an admin (Owner or Admin) in a workspace
 *
 * @param userId - User's profile ID
 * @param workspaceId - Workspace ID to check
 * @returns true if user is admin
 */
export async function isWorkspaceAdmin(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId: workspaceId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  })

  return membership !== null
}

/**
 * Get a user's role in a workspace
 *
 * @param userId - User's profile ID
 * @param workspaceId - Workspace ID
 * @returns The user's role or null if not a member
 */
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<TeamRole | null> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId: workspaceId,
    },
    select: { role: true },
  })

  return membership?.role ?? null
}
