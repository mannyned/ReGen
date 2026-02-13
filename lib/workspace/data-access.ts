/**
 * Workspace-Aware Data Access Layer
 *
 * Provides backwards-compatible data access that works with or without workspaces.
 * Use these utilities in API routes to build queries that respect workspace scoping.
 */

import 'server-only'

import type { VerifiedIdentity } from '@/lib/security/identity'
import type { WorkspaceContext } from './context'

// ============================================
// QUERY BUILDERS
// ============================================

/**
 * Build a where clause that works with or without workspaces
 *
 * If workspace context is available, scopes by workspaceId.
 * Otherwise, falls back to profileId scoping (legacy mode).
 *
 * @param identity - Verified user identity
 * @param workspace - Workspace context (null for legacy mode)
 * @param additionalWhere - Additional where conditions
 * @returns Where clause object for Prisma queries
 *
 * @example
 * ```ts
 * const posts = await prisma.scheduledPost.findMany({
 *   where: buildWhereClause(identity, workspace, { status: 'PENDING' }),
 * })
 * ```
 */
export function buildWhereClause(
  identity: VerifiedIdentity,
  workspace: WorkspaceContext | null,
  additionalWhere: Record<string, unknown> = {}
): Record<string, unknown> {
  if (workspace?.workspaceId) {
    // Workspace-scoped query
    return {
      workspaceId: workspace.workspaceId,
      ...additionalWhere,
    }
  }

  // Legacy profileId-scoped query (or workspace feature disabled)
  return {
    profileId: identity.profileId,
    ...additionalWhere,
  }
}

/**
 * Build a where clause that includes both workspace and profile scoping
 *
 * Use this when you need to filter by both workspace AND the creating user.
 *
 * @param identity - Verified user identity
 * @param workspace - Workspace context (null for legacy mode)
 * @param additionalWhere - Additional where conditions
 * @returns Where clause object for Prisma queries
 */
export function buildWhereClauseWithProfile(
  identity: VerifiedIdentity,
  workspace: WorkspaceContext | null,
  additionalWhere: Record<string, unknown> = {}
): Record<string, unknown> {
  if (workspace?.workspaceId) {
    return {
      workspaceId: workspace.workspaceId,
      profileId: identity.profileId,
      ...additionalWhere,
    }
  }

  return {
    profileId: identity.profileId,
    ...additionalWhere,
  }
}

/**
 * Build data object for creating resources
 *
 * Includes both profileId and workspaceId (if available).
 * Always includes profileId for audit/ownership tracking.
 *
 * @param identity - Verified user identity
 * @param workspace - Workspace context (null for legacy mode)
 * @param data - Additional data fields
 * @returns Data object for Prisma create operations
 *
 * @example
 * ```ts
 * const post = await prisma.scheduledPost.create({
 *   data: buildCreateData(identity, workspace, {
 *     platforms: ['instagram'],
 *     scheduledAt: new Date(),
 *     // ...
 *   }),
 * })
 * ```
 */
export function buildCreateData<T extends Record<string, unknown>>(
  identity: VerifiedIdentity,
  workspace: WorkspaceContext | null,
  data: T
): T & { profileId: string; workspaceId: string | null } {
  return {
    ...data,
    profileId: identity.profileId,
    workspaceId: workspace?.workspaceId || null,
  }
}

/**
 * Build an update data object that preserves workspace association
 *
 * Use this when updating resources to ensure workspaceId isn't accidentally cleared.
 *
 * @param data - Update data fields
 * @returns Data object for Prisma update operations
 */
export function buildUpdateData<T extends Record<string, unknown>>(
  data: T
): T {
  // Simply pass through - workspaceId should not change on updates
  return data
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if the workspace context allows admin operations
 *
 * @param workspace - Workspace context
 * @returns true if user can perform admin operations
 */
export function canPerformAdminAction(workspace: WorkspaceContext | null): boolean {
  // In legacy mode (no workspace), user owns their own data
  if (!workspace) {
    return true
  }

  return workspace.isAdmin
}

/**
 * Check if the workspace context allows member operations
 *
 * @param workspace - Workspace context
 * @returns true if user can perform member operations (view, create)
 */
export function canPerformMemberAction(workspace: WorkspaceContext | null): boolean {
  // In legacy mode, user owns their own data
  if (!workspace) {
    return true
  }

  // Any role can perform member actions
  return workspace.role === 'OWNER' || workspace.role === 'ADMIN' || workspace.role === 'MEMBER'
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Enrich API response with workspace context
 *
 * Use this to include workspace info in API responses for the client.
 *
 * @param data - Response data
 * @param workspace - Workspace context
 * @returns Enriched response data
 */
export function enrichResponseWithWorkspace<T extends object>(
  data: T,
  workspace: WorkspaceContext | null
): T & { workspace?: { id: string; name: string; role: string } } {
  if (!workspace?.workspaceId) {
    return data as T & { workspace?: { id: string; name: string; role: string } }
  }

  return {
    ...data,
    workspace: {
      id: workspace.workspaceId,
      name: workspace.workspaceName || 'Workspace',
      role: workspace.role,
    },
  }
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Check if a resource needs workspace migration
 *
 * Returns true if workspaces are enabled but the resource has no workspaceId.
 *
 * @param resource - Resource with optional workspaceId
 * @param workspace - Current workspace context
 * @returns true if resource should be migrated
 */
export function needsWorkspaceMigration(
  resource: { workspaceId?: string | null },
  workspace: WorkspaceContext | null
): boolean {
  return workspace?.workspaceId !== null && resource.workspaceId === null
}
