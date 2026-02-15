/**
 * PWA Layout Fix Feature Flag
 *
 * Controls the PWA safe-area and overflow fixes.
 *
 * Environment Variables:
 * - PWA_LAYOUT_FIX_ENABLED: 'true' to enable (default: true)
 *
 * What this flag controls:
 * - viewport-fit: cover (in layout.tsx) — activates safe-area-inset values
 * - Safe-area CSS classes: pwa-header, pwa-below-header, pwa-page-offset, pwa-safe-bottom
 * - overflow-x: hidden on html element
 * - 100vw → 100% fix in NotificationBell
 *
 * Note: The CSS changes are always loaded (they resolve to 0px without viewport-fit: cover).
 * To quickly disable all safe-area fixes, set PWA_LAYOUT_FIX_ENABLED=false and
 * remove viewportFit: 'cover' from app/layout.tsx viewport export.
 */

export const PWA_LAYOUT_FIX_ENABLED = process.env.PWA_LAYOUT_FIX_ENABLED !== 'false'

/**
 * Check if PWA layout fixes are enabled
 */
export function isPwaLayoutFixEnabled(): boolean {
  return PWA_LAYOUT_FIX_ENABLED
}
