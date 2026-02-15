'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import WorkspaceHeader from '@/app/components/WorkspaceHeader'
import { SectionHeader, Badge } from '@/app/components/ui'

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
// GRADIENT UTILITY
// ============================================

const WORKSPACE_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
]

const WORKSPACE_BORDER_COLORS = [
  'border-t-violet-500',
  'border-t-blue-500',
  'border-t-emerald-500',
  'border-t-orange-500',
  'border-t-rose-500',
  'border-t-indigo-500',
]

function getWorkspaceGradientIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % WORKSPACE_GRADIENTS.length
}

// ============================================
// ROLE BADGE VARIANT
// ============================================

function getRoleBadgeVariant(role: string): 'primary' | 'secondary' | 'gray' {
  switch (role) {
    case 'OWNER': return 'primary'
    case 'ADMIN': return 'secondary'
    default: return 'gray'
  }
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <WorkspaceHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <WorkspaceHeader />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-red-50 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              {error}
            </h2>
            <p className="text-red-600 mb-4">
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
  const canCreate = ownedCount < workspaceLimit

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkspaceHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 pwa-page-offset">
        {/* Header */}
        <SectionHeader
          title="Your Workspaces"
          subtitle="Manage your brands and team collaboration"
          badge={`${ownedCount} / ${workspaceLimit}`}
        />

        {/* Workspaces grid */}
        {workspaces.length === 0 && !canCreate ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">
              No workspaces yet
            </h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Create your first workspace to start collaborating with your team.
            </p>
            <button
              onClick={createWorkspace}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors"
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Workspace Cards */}
            {workspaces.map((workspace) => {
              const gradientIdx = getWorkspaceGradientIndex(workspace.name)
              return (
                <div
                  key={workspace.id}
                  onClick={() => router.push(`/w/${workspace.id}/dashboard`)}
                  className={`bg-white rounded-2xl shadow-lg border border-gray-100 border-t-[3px] ${WORKSPACE_BORDER_COLORS[gradientIdx]} p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Gradient Avatar */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${WORKSPACE_GRADIENTS[gradientIdx]} flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md`}>
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-text-primary truncate">
                        {workspace.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={getRoleBadgeVariant(workspace.role)}>
                          {workspace.role}
                        </Badge>
                        {workspace.isDefault && (
                          <Badge variant="gray">Default</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Member count */}
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}

            {/* Create Workspace Card */}
            <div
              onClick={canCreate ? createWorkspace : () => setShowPaywall(true)}
              className={`rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[160px] ${
                canCreate
                  ? 'border-gray-300 hover:border-primary hover:bg-primary/5 group'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {canCreate ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 group-hover:text-primary transition-colors">
                    Create Workspace
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-400">
                    Limit Reached
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Upgrade for more workspaces
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Create New Workspace
            </h2>

            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="e.g. My Brand, Agency Name..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-text-primary transition-all placeholder:text-gray-400 mb-4"
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
                className="px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={creating || !newWorkspaceName.trim()}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Workspace Limit Reached
              </h2>
            </div>
            <p className="text-text-secondary mb-4 text-center">
              During the beta period, Pro users are limited to {workspaceLimit} default workspace{workspaceLimit !== 1 ? 's' : ''}.
            </p>
            <p className="text-text-secondary mb-6 text-center text-sm">
              After the beta testing period, additional workspaces will be available for an additional monthly fee. Pricing will be announced soon.
            </p>
            <button
              onClick={() => setShowPaywall(false)}
              className="w-full px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
