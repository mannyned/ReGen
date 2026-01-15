'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PermissionStatus {
  platform: string
  connected: boolean
  permissions: string[]
  missingPermissions: string[]
  hasAllPermissions: boolean
}

interface PermissionsBannerProps {
  platforms?: string[]
  className?: string
}

// Human-readable names for permissions
const PERMISSION_LABELS: Record<string, string> = {
  instagram_manage_insights: 'Instagram Insights (reach, impressions, saves)',
  pages_read_engagement: 'Facebook Page Engagement (reach, impressions)',
  instagram_basic: 'Instagram Basic',
  instagram_content_publish: 'Instagram Publishing',
  pages_show_list: 'Facebook Pages List',
  pages_manage_posts: 'Facebook Page Posts',
  pages_read_user_content: 'Facebook Page Content',
}

// Permissions needed for analytics
const ANALYTICS_PERMISSIONS = [
  'instagram_manage_insights',
  'pages_read_engagement',
]

export function PermissionsBanner({
  platforms = ['meta'],
  className = ''
}: PermissionsBannerProps) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      setIsLoading(true)
      try {
        // Check Meta permissions (covers both Instagram and Facebook)
        const response = await fetch('/api/oauth/permissions?platform=meta')

        if (response.ok) {
          const data = await response.json()
          setPermissionStatus(data)
        } else {
          // Not connected or error
          const data = await response.json().catch(() => ({}))
          setPermissionStatus({
            platform: 'meta',
            connected: false,
            permissions: [],
            missingPermissions: ANALYTICS_PERMISSIONS,
            hasAllPermissions: false,
            ...data,
          })
        }
      } catch (error) {
        console.error('Failed to check permissions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermissions()
  }, [platforms])

  // Don't show if dismissed, loading, or all permissions are granted
  if (isDismissed || isLoading) return null

  // Check if analytics-specific permissions are missing
  const missingAnalyticsPermissions = permissionStatus?.missingPermissions?.filter(
    p => ANALYTICS_PERMISSIONS.includes(p)
  ) || []

  // If connected and has all analytics permissions, don't show banner
  if (permissionStatus?.connected && missingAnalyticsPermissions.length === 0) {
    return null
  }

  // If not connected at all
  if (!permissionStatus?.connected) {
    return (
      <div className={`rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">
            <span role="img" aria-label="warning">&#x26A0;&#xFE0F;</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Connect Meta to see full analytics
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Connect your Instagram or Facebook account to see reach, impressions, and engagement data.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Link
                href="/settings/integrations"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                Connect Account
              </Link>
              <button
                onClick={() => setIsDismissed(true)}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Connected but missing analytics permissions
  return (
    <div className={`rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">
          <span role="img" aria-label="warning">&#x26A0;&#xFE0F;</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">
            Missing permissions for full analytics
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Your Meta connection is missing permissions needed to fetch reach, impressions, and saves.
            Reconnect your account to grant the new permissions.
          </p>

          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            <span className="font-medium">Missing:</span>
            <ul className="mt-1 ml-4 list-disc">
              {missingAnalyticsPermissions.map(perm => (
                <li key={perm}>{PERMISSION_LABELS[perm] || perm}</li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/settings/integrations"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              Reconnect Account
            </Link>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PermissionsBanner
