'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import WorkspaceHeader from '@/app/components/WorkspaceHeader'

// ============================================
// TYPES
// ============================================

interface Workspace {
  id: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  memberCount: number
  isDefault: boolean
}

// ============================================
// COMPONENT
// ============================================

export default function WorkspacesPage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [workspaceLimit, setWorkspaceLimit] = useState(1)
  const [creating, setCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  async function fetchWorkspaces() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/workspaces')

      if (res.status === 403) {
        // Feature not enabled or not PRO
        const data = await res.json()
        if (data.code === 'FEATURE_DISABLED') {
          setError('Workspaces feature is not available yet.')
        } else {
          setError('PRO plan required for workspaces.')
        }
        return
      }

      if (!res.ok) {
        throw new Error('Failed to fetch workspaces')
      }

      const data = await res.json()
      setWorkspaces(data.workspaces || [])
      setWorkspaceLimit(data.workspaceLimit || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function createWorkspace() {
    const ownedCount = workspaces.filter((w) => w.role === 'OWNER').length

    if (ownedCount >= workspaceLimit) {
      setShowPaywall(true)
      return
    }

    setShowCreateModal(true)
  }

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) {
      return
    }

    try {
      setCreating(true)

      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      })

      if (res.status === 403) {
        const data = await res.json()
        if (data.code === 'LIMIT_REACHED') {
          setShowCreateModal(false)
          setShowPaywall(true)
          return
        }
      }

      if (!res.ok) {
        throw new Error('Failed to create workspace')
      }

      const { workspace } = await res.json()
      router.push(`/w/${workspace.id}/dashboard`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  function enterWorkspace(workspaceId: string) {
    router.push(`/w/${workspaceId}/dashboard`)
  }

  // Role badge colors
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
        <WorkspaceHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <WorkspaceHeader />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              {error}
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error.includes('PRO') && (
                <Link
                  href="/settings?tab=billing"
                  className="underline hover:no-underline"
                >
                  Upgrade to PRO
                </Link>
              )}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const ownedCount = workspaces.filter((w) => w.role === 'OWNER').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <WorkspaceHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 pwa-page-offset">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Your Workspaces
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your workspaces and team collaboration
            </p>
          </div>

          <button
            onClick={createWorkspace}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        </div>

        {/* Workspace limit info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            You own {ownedCount} of {workspaceLimit} workspace{workspaceLimit !== 1 ? 's' : ''}.
            {ownedCount >= workspaceLimit && (
              <span className="ml-2 text-blue-600 dark:text-blue-300">
                Additional workspaces will be available after the beta period for an additional monthly fee.
              </span>
            )}
          </p>
        </div>

        {/* Workspaces grid */}
        {workspaces.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No workspaces yet
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create your first workspace to get started.
            </p>
            <button
              onClick={createWorkspace}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => enterWorkspace(workspace.id)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-2">
                    {workspace.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeClasses(
                      workspace.role
                    )}`}
                  >
                    {workspace.role}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                </p>

                {workspace.isDefault && (
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create New Workspace
            </h2>

            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateWorkspace()
                }
              }}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewWorkspaceName('')
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={creating || !newWorkspaceName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Workspace Limit Reached
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              During the beta period, Pro users are limited to {workspaceLimit} default workspace{workspaceLimit !== 1 ? 's' : ''}.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              After the beta testing period, additional workspaces will be available for an additional monthly fee. Pricing will be announced soon.
            </p>
            <button
              onClick={() => setShowPaywall(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
