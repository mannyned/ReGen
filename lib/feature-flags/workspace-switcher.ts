/**
 * Workspace Switcher V2 Feature Flag
 *
 * Controls the Notion-style workspace switcher in the header-left.
 *
 * Environment Variables:
 * - NEXT_PUBLIC_WORKSPACE_SWITCHER_V2: 'false' to disable (default: true)
 *   Must use NEXT_PUBLIC_ prefix because this flag is consumed in client components.
 *
 * When enabled:
 * - WorkspaceSwitcherV2 renders in the top-left of the AppHeader
 * - Old WorkspaceSwitcher in header-right is hidden
 * - Desktop: dropdown popover with search, roles, create, manage
 * - Mobile: bottom sheet with same functionality
 *
 * When disabled:
 * - WorkspaceSwitcherV2 is never loaded (dynamic import)
 * - Old WorkspaceSwitcher continues working as-is
 * - Zero runtime cost
 */

export const WORKSPACE_SWITCHER_V2 = process.env.NEXT_PUBLIC_WORKSPACE_SWITCHER_V2 !== 'false'
