/**
 * Workspace Route Utilities
 *
 * Helpers for preserving the current sub-page when switching workspaces.
 * E.g., /w/old-id/team → /w/new-id/team
 */

/**
 * Known sub-routes under /w/[workspaceId]/
 * Extend this list as new workspace-scoped pages are added.
 */
const WORKSPACE_SUB_ROUTES = ['dashboard', 'team'] as const

const DEFAULT_SUB_ROUTE = 'dashboard'

/**
 * Extract workspace ID from a pathname.
 * Returns null if pathname is not workspace-scoped.
 *
 * @example
 * extractWorkspaceId('/w/abc123/dashboard') // 'abc123'
 * extractWorkspaceId('/dashboard') // null
 */
export function extractWorkspaceId(pathname: string): string | null {
  const match = pathname.match(/^\/w\/([^/]+)/)
  return match ? match[1] : null
}

/**
 * Extract the sub-route from a workspace-scoped pathname.
 *
 * @example
 * extractSubRoute('/w/abc123/dashboard') // 'dashboard'
 * extractSubRoute('/w/abc123/team') // 'team'
 * extractSubRoute('/w/abc123') // 'dashboard' (default)
 */
export function extractSubRoute(pathname: string): string {
  const match = pathname.match(/^\/w\/[^/]+\/(.+)$/)
  return match ? match[1] : DEFAULT_SUB_ROUTE
}

/**
 * Build a workspace route, preserving the current sub-route when valid.
 * Falls back to /w/{id}/dashboard if the sub-route is not recognized.
 *
 * @example
 * buildWorkspaceRoute('newId', '/w/oldId/team') // '/w/newId/team'
 * buildWorkspaceRoute('newId', '/w/oldId/unknown') // '/w/newId/dashboard'
 * buildWorkspaceRoute('newId', '/dashboard') // '/w/newId/dashboard'
 */
export function buildWorkspaceRoute(
  workspaceId: string,
  currentPathname: string
): string {
  const subRoute = extractSubRoute(currentPathname)
  const isValid = (WORKSPACE_SUB_ROUTES as readonly string[]).includes(subRoute)
  return `/w/${workspaceId}/${isValid ? subRoute : DEFAULT_SUB_ROUTE}`
}

/**
 * Check if a pathname is workspace-scoped (starts with /w/).
 */
export function isWorkspaceScopedRoute(pathname: string): boolean {
  return pathname.startsWith('/w/')
}
