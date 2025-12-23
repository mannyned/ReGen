/**
 * Analytics Permission System
 *
 * Role-based analytics access control for Pro teams.
 *
 * Scopes:
 * - CONTENT_ANALYTICS: Post performance, engagement metrics (all Pro roles)
 * - ACCOUNT_ANALYTICS: Follower growth, account insights, cross-platform (owner/admin, or member if toggle enabled)
 *
 * Rules:
 * - Owners/Admins: Full access to all analytics
 * - Members: Content analytics only by default
 * - If team.allowMemberAccountAnalytics is true, members can view account analytics
 */

import { prisma } from '@/lib/db';
import { TeamRole } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export type AnalyticsScope = 'CONTENT_ANALYTICS' | 'ACCOUNT_ANALYTICS';

export interface TeamContext {
  teamId: string;
  teamName: string;
  userRole: 'owner' | 'admin' | 'member';
  allowMemberAccountAnalytics: boolean;
}

export interface AnalyticsPermission {
  canViewContentAnalytics: boolean;
  canViewAccountAnalytics: boolean;
  canManageAnalyticsSettings: boolean;
  teamContext: TeamContext | null;
  reason?: string;
}

export interface WorkspaceInfo {
  teamId: string;
  teamName: string;
  ownerId: string;
  isOwner: boolean;
  isMember: boolean;
  memberRole: TeamRole | null;
  allowMemberAccountAnalytics: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get workspace/team info for a user
 */
export async function getWorkspaceForUser(userId: string): Promise<WorkspaceInfo | null> {
  // Check if user owns a team
  const ownedTeam = await prisma.team.findUnique({
    where: { ownerId: userId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      allowMemberAccountAnalytics: true,
    },
  });

  if (ownedTeam) {
    return {
      teamId: ownedTeam.id,
      teamName: ownedTeam.name,
      ownerId: ownedTeam.ownerId,
      isOwner: true,
      isMember: false,
      memberRole: null,
      allowMemberAccountAnalytics: ownedTeam.allowMemberAccountAnalytics,
    };
  }

  // Check if user is a team member
  const membership = await prisma.teamMember.findUnique({
    where: { userId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          allowMemberAccountAnalytics: true,
        },
      },
    },
  });

  if (membership) {
    return {
      teamId: membership.team.id,
      teamName: membership.team.name,
      ownerId: membership.team.ownerId,
      isOwner: false,
      isMember: true,
      memberRole: membership.role,
      allowMemberAccountAnalytics: membership.team.allowMemberAccountAnalytics,
    };
  }

  return null;
}

/**
 * Get user's role in a workspace
 */
export async function getUserRoleInWorkspace(
  userId: string,
  workspaceId: string
): Promise<'owner' | 'admin' | 'member' | null> {
  // Check if user is the owner
  const team = await prisma.team.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  if (team?.ownerId === userId) {
    return 'owner';
  }

  // Check membership role
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: workspaceId,
      userId,
    },
    select: { role: true },
  });

  if (membership) {
    return membership.role.toLowerCase() as 'admin' | 'member';
  }

  return null;
}

/**
 * Check if user can view content-level analytics
 * Content analytics are available to all Pro team members
 */
export async function canViewContentAnalytics(userId: string): Promise<boolean> {
  const workspace = await getWorkspaceForUser(userId);

  // Must be part of a team (Pro feature)
  if (!workspace) {
    return false;
  }

  // All team roles can view content analytics
  return true;
}

/**
 * Check if user can view account-level analytics
 * Account analytics require owner/admin role OR the toggle to be enabled
 */
export async function canViewAccountAnalytics(userId: string): Promise<boolean> {
  const workspace = await getWorkspaceForUser(userId);

  if (!workspace) {
    return false;
  }

  // Owners always have access
  if (workspace.isOwner) {
    return true;
  }

  // Admins always have access
  if (workspace.memberRole === 'ADMIN') {
    return true;
  }

  // Members need the toggle to be enabled
  if (workspace.isMember && workspace.memberRole === 'MEMBER') {
    return workspace.allowMemberAccountAnalytics;
  }

  return false;
}

/**
 * Get full analytics permissions for a user
 */
export async function getAnalyticsPermissions(userId: string): Promise<AnalyticsPermission> {
  const workspace = await getWorkspaceForUser(userId);

  if (!workspace) {
    return {
      canViewContentAnalytics: false,
      canViewAccountAnalytics: false,
      canManageAnalyticsSettings: false,
      teamContext: null,
      reason: 'Not part of a Pro team',
    };
  }

  const isOwnerOrAdmin = workspace.isOwner || workspace.memberRole === 'ADMIN';
  const canViewAccount = isOwnerOrAdmin || workspace.allowMemberAccountAnalytics;

  return {
    canViewContentAnalytics: true, // All Pro team members
    canViewAccountAnalytics: canViewAccount,
    canManageAnalyticsSettings: isOwnerOrAdmin, // Only owner/admin can toggle settings
    teamContext: {
      teamId: workspace.teamId,
      teamName: workspace.teamName,
      userRole: workspace.isOwner ? 'owner' : (workspace.memberRole?.toLowerCase() as 'admin' | 'member'),
      allowMemberAccountAnalytics: workspace.allowMemberAccountAnalytics,
    },
  };
}

/**
 * Check if user can manage analytics settings (toggle)
 * Only owners and admins can manage settings
 */
export async function canManageAnalyticsSettings(userId: string): Promise<boolean> {
  const workspace = await getWorkspaceForUser(userId);

  if (!workspace) {
    return false;
  }

  return workspace.isOwner || workspace.memberRole === 'ADMIN';
}

/**
 * Update the analytics permission toggle for a team
 */
export async function updateAnalyticsToggle(
  userId: string,
  teamId: string,
  allowMemberAccountAnalytics: boolean
): Promise<{ success: boolean; error?: string }> {
  // Verify user has permission to update
  const role = await getUserRoleInWorkspace(userId, teamId);

  if (role !== 'owner' && role !== 'admin') {
    return {
      success: false,
      error: 'Only team owners and admins can manage analytics settings',
    };
  }

  try {
    await prisma.team.update({
      where: { id: teamId },
      data: { allowMemberAccountAnalytics },
    });

    return { success: true };
  } catch (error) {
    console.error('[Analytics Permission] Failed to update toggle:', error);
    return {
      success: false,
      error: 'Failed to update analytics settings',
    };
  }
}

// ============================================
// PERMISSION ERROR HELPERS
// ============================================

export interface PermissionError {
  code: string;
  message: string;
  scope: AnalyticsScope;
}

export function createPermissionError(scope: AnalyticsScope): PermissionError {
  if (scope === 'ACCOUNT_ANALYTICS') {
    return {
      code: 'ACCOUNT_ANALYTICS_RESTRICTED',
      message: 'Account-level analytics are admin-only.',
      scope,
    };
  }

  return {
    code: 'ANALYTICS_ACCESS_DENIED',
    message: 'Analytics access requires a Pro subscription.',
    scope,
  };
}

// ============================================
// MICROCOPY
// ============================================

export const ANALYTICS_COPY = {
  // Toggle label and helper
  toggleLabel: 'Allow team members to view account-level analytics',
  toggleHelper: 'When off, members can still see content performance.',

  // Member-facing text
  memberReadOnly: 'Your analytics access is managed by the workspace admin.',

  // Locked state
  lockedTitle: 'Account Analytics',
  lockedMessage: 'Account-level analytics are admin-only.',
  lockedCta: 'Request access',

  // 403 error fallback
  errorFallback: 'You don\'t have permission to view this. Contact your team admin.',

  // Success toast
  toggleOnSuccess: 'Team members can now view account analytics',
  toggleOffSuccess: 'Account analytics are now admin-only',
} as const;
