/**
 * Workspace Feature Flag
 *
 * Controls gradual rollout of workspace features.
 *
 * Environment Variables:
 * - WORKSPACES_ENABLED: Master switch ('true' to enable)
 * - WORKSPACE_ROLLOUT_PHASE: '1' (beta), '2' (percentage), '3' (all)
 * - WORKSPACE_BETA_USERS: Comma-separated list of user IDs for phase 1
 * - WORKSPACE_ROLLOUT_PERCENTAGE: Percentage of users for phase 2 (0-100)
 */

// Environment-level master switch
export const WORKSPACES_ENABLED = process.env.WORKSPACES_ENABLED === 'true'

// Beta users for phase 1 rollout
const WORKSPACE_BETA_USERS = (process.env.WORKSPACE_BETA_USERS || '').split(',').filter(Boolean)

// Rollout phase: 1 = beta, 2 = percentage, 3 = all
const WORKSPACE_ROLLOUT_PHASE = process.env.WORKSPACE_ROLLOUT_PHASE || '1'

// Percentage for phase 2
const WORKSPACE_ROLLOUT_PERCENTAGE = parseInt(process.env.WORKSPACE_ROLLOUT_PERCENTAGE || '10', 10)

/**
 * Check if workspaces feature is enabled for a specific user
 *
 * @param userId - The user's profile ID
 * @returns boolean - Whether workspaces are enabled for this user
 */
export function isWorkspacesEnabledForUser(userId: string): boolean {
  // Master switch must be on
  if (!WORKSPACES_ENABLED) {
    return false
  }

  // Phase 1: Only beta users
  if (WORKSPACE_ROLLOUT_PHASE === '1') {
    return WORKSPACE_BETA_USERS.includes(userId)
  }

  // Phase 2: Percentage rollout (deterministic based on user ID)
  if (WORKSPACE_ROLLOUT_PHASE === '2') {
    const hash = hashUserId(userId)
    return hash % 100 < WORKSPACE_ROLLOUT_PERCENTAGE
  }

  // Phase 3: All users
  return true
}

/**
 * Check if workspaces feature is globally enabled
 * (useful for showing/hiding UI elements before user context is available)
 */
export function isWorkspacesGloballyEnabled(): boolean {
  return WORKSPACES_ENABLED
}

/**
 * Get the current rollout phase info
 */
export function getWorkspaceRolloutInfo() {
  return {
    enabled: WORKSPACES_ENABLED,
    phase: WORKSPACE_ROLLOUT_PHASE,
    betaUsersCount: WORKSPACE_BETA_USERS.length,
    percentage: WORKSPACE_ROLLOUT_PERCENTAGE,
  }
}

/**
 * Generate a deterministic hash from user ID for percentage rollout
 * Uses a simple hash function that distributes users evenly
 */
function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Add a user to the beta list (for runtime testing)
 * Note: This only affects the current process, not persisted
 */
export function addBetaUser(userId: string): void {
  if (!WORKSPACE_BETA_USERS.includes(userId)) {
    WORKSPACE_BETA_USERS.push(userId)
  }
}
