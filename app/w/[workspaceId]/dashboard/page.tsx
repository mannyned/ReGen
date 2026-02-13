'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useWorkspace } from '@/app/context/WorkspaceContext'
import { AppHeader } from '@/app/components/ui'

// ============================================
// TYPES
// ============================================

interface WorkspaceStats {
  socialConnections: number
  contentUploads: number
  scheduledPosts: number
}

interface WorkspaceMember {
  id: string
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: string
}

interface WorkspaceDetails {
  id: string
  name: string
  isDefault: boolean
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  members: WorkspaceMember[]
  stats: WorkspaceStats
}

// ============================================
// COMPONENT
// ============================================

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string

  const { currentWorkspace, workspaces, switchWorkspace, isAdmin } = useWorkspace()
  const [details, setDetails] = useState<WorkspaceDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkspaceDetails()
  }, [workspaceId])

  async function fetchWorkspaceDetails() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/workspaces/${workspaceId}`)

      if (!res.ok) {
        if (res.status === 404) {
          router.push('/workspaces?error=not_found')
          return
        }
        throw new Error('Failed to fetch workspace details')
      }

      const data = await res.json()
      setDetails(data.workspace)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Get role badge color
  function getRoleBadgeClasses(role: string) {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader currentPage="workspace" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !details) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader currentPage="workspace" />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
              {error || 'Workspace not found'}
            </h2>
            <button
              onClick={() => router.push('/workspaces')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Workspaces
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader currentPage="workspace" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Workspace Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {details.name}
                </h1>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeClasses(
                    details.role
                  )}`}
                >
                  {details.role}
                </span>
                {details.isDefault && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {details.members.length} member{details.members.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Workspace Switcher */}
            {workspaces.length > 1 && (
              <select
                value={workspaceId}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/upload"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Upload Content</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add new media</p>
              </div>
            </div>
          </Link>

          <Link
            href="/schedule"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Schedule Post</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plan your content</p>
              </div>
            </div>
          </Link>

          <Link
            href="/analytics"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">View performance</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Connected Platforms</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {details.stats.socialConnections}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Content Uploads</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {details.stats.contentUploads}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled Posts</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {details.stats.scheduledPosts}
            </p>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Team Members
            </h2>
            {isAdmin && (
              <Link
                href="/team"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Manage Team
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {details.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.displayName || member.email}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {(member.displayName || member.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.displayName || member.email}
                    </p>
                    {member.displayName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeClasses(
                    member.role
                  )}`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
