'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useWorkspace } from '@/app/context/WorkspaceContext'
import { WorkspaceHeader } from '@/app/components/WorkspaceHeader'
import { StatCard, Badge, GradientBanner } from '@/app/components/ui'

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
  canRename?: boolean
}

interface WorkspaceDetails {
  id: string
  name: string
  isDefault: boolean
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  canRename: boolean
  members: WorkspaceMember[]
  stats: WorkspaceStats
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

function getWorkspaceGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return WORKSPACE_GRADIENTS[Math.abs(hash) % WORKSPACE_GRADIENTS.length]
}

// ============================================
// MEMBER AVATAR COLORS
// ============================================

const AVATAR_GRADIENTS = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-orange-500 to-amber-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-red-500',
]

// ============================================
// COMPONENT
// ============================================

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string

  const { setActiveWorkspace } = useWorkspace()
  const [details, setDetails] = useState<WorkspaceDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'settings'>('overview')

  // Rename state
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isAdmin = details?.role === 'OWNER' || details?.role === 'ADMIN'

  useEffect(() => {
    fetchWorkspaceDetails()
  }, [workspaceId])

  async function handleRename() {
    if (!newWorkspaceName.trim()) return

    try {
      setRenaming(true)
      setRenameError(null)

      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to rename workspace')
      }

      setShowRenameModal(false)
      setNewWorkspaceName('')
      fetchWorkspaceDetails()
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename workspace')
    } finally {
      setRenaming(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== details?.name) return

    try {
      setDeleting(true)
      setDeleteError(null)

      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete workspace')
      }

      router.push('/workspaces')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete workspace')
    } finally {
      setDeleting(false)
    }
  }

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <WorkspaceHeader workspaceName={details?.name} workspaceId={workspaceId} />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !details) {
    return (
      <div className="min-h-screen bg-gray-50">
        <WorkspaceHeader workspaceName={details?.name} workspaceId={workspaceId} />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-red-50 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-red-800 mb-4">
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

  const gradient = getWorkspaceGradient(details.name)

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkspaceHeader workspaceName={details.name} workspaceId={workspaceId} />

      <main className="max-w-6xl mx-auto px-4 py-8 pwa-page-offset">
        {/* Hero Banner */}
        <GradientBanner className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Workspace Avatar */}
              <div className={`w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg`}>
                {details.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">
                    {details.name}
                  </h1>
                  <Badge variant="gradient">{details.role}</Badge>
                  {details.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded-full">
                      Default
                    </span>
                  )}
                </div>

                {/* Stacked member avatars + count */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex -space-x-2">
                    {details.members.slice(0, 3).map((member, i) => (
                      member.avatarUrl ? (
                        <img
                          key={member.id}
                          src={member.avatarUrl}
                          alt={member.displayName || member.email}
                          className="w-7 h-7 rounded-full ring-2 ring-white/50"
                        />
                      ) : (
                        <div
                          key={member.id}
                          className={`w-7 h-7 rounded-full ring-2 ring-white/50 bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center`}
                        >
                          <span className="text-[10px] font-bold text-white">
                            {(member.displayName || member.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                  <span className="text-white/80 text-sm">
                    {details.members.length} member{details.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Dashboard link */}
            <button
              onClick={() => {
                setActiveWorkspace({
                  id: details.id,
                  name: details.name,
                  role: details.role,
                  memberCount: details.members.length,
                  isDefault: details.isDefault,
                })
                router.push('/dashboard')
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur-sm"
            >
              Open Content Dashboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </GradientBanner>

        {/* Tab Navigation */}
        <div className="bg-gray-100 rounded-xl p-1 flex gap-1 mb-8">
          {(['overview', 'team', ...(isAdmin ? ['settings'] : [])] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white text-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'overview' && '📊 '}
              {tab === 'team' && '👥 '}
              {tab === 'settings' && '⚙️ '}
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <StatCard
                label="Team Members"
                value={details.members.length}
                icon="👥"
                subtitle={`${details.members.filter(m => m.role === 'OWNER' || m.role === 'ADMIN').length} admin${details.members.filter(m => m.role === 'OWNER' || m.role === 'ADMIN').length !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="Content Uploads"
                value={details.stats.contentUploads}
                icon="📁"
              />
              <StatCard
                label="Scheduled Posts"
                value={details.stats.scheduledPosts}
                icon="📅"
              />
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href={`/w/${workspaceId}/team`}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex items-center gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Manage Team</h3>
                  <p className="text-sm text-text-secondary">Invite members and manage roles</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/dashboard"
                onClick={() => {
                  setActiveWorkspace({
                    id: details.id,
                    name: details.name,
                    role: details.role,
                    memberCount: details.members.length,
                    isDefault: details.isDefault,
                  })
                }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex items-center gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Content Dashboard</h3>
                  <p className="text-sm text-text-secondary">Upload, schedule, and manage content</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div>
            {/* Team header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Team Members</h2>
                <p className="text-sm text-text-secondary">
                  {details.members.length} {details.members.length === 1 ? 'member' : 'members'} in this workspace
                </p>
              </div>
              {isAdmin && (
                <Link
                  href={`/w/${workspaceId}/team`}
                  className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Manage Team
                </Link>
              )}
            </div>

            {/* Member List */}
            {details.members.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-text-primary mb-2">No team members yet</h3>
                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                  Invite your first team member to start collaborating.
                </p>
                {isAdmin && (
                  <Link
                    href={`/w/${workspaceId}/team`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors"
                  >
                    Invite Member
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {details.members.map((member, index) => (
                    <div
                      key={member.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.displayName || member.email}
                            className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm bg-gradient-to-br ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}`}>
                            <span className="text-sm font-semibold text-white">
                              {(member.displayName || member.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-text-primary">
                            {member.displayName || member.email}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {member.displayName ? member.email : 'No display name set'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          member.role === 'OWNER' ? 'primary'
                          : member.role === 'ADMIN' ? 'secondary'
                          : 'gray'
                        }
                      >
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            {!isAdmin ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-4xl mb-3">🔒</div>
                <p className="text-text-secondary">You don&apos;t have permission to manage settings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Rename */}
                {details.canRename && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary">Rename Workspace</h3>
                          <p className="text-sm text-text-secondary">Change the name of this workspace</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewWorkspaceName(details.name)
                          setShowRenameModal(true)
                        }}
                        className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete */}
                {details.role === 'OWNER' && (
                  <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-red-800">Delete Workspace</h3>
                          <p className="text-sm text-red-600">Permanently delete this workspace and remove all members</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Rename Workspace
            </h2>

            {renameError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{renameError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="My Workspace"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-text-primary transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newWorkspaceName.trim()) {
                    handleRename()
                  }
                }}
              />
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowRenameModal(false)
                  setNewWorkspaceName('')
                  setRenameError(null)
                }}
                className="px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                disabled={renaming}
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={renaming || !newWorkspaceName.trim()}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {renaming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && details && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                Delete Workspace
              </h2>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{deleteError}</p>
              </div>
            )}

            <p className="text-text-secondary mb-4">
              This action cannot be undone. This will permanently delete the workspace
              <span className="font-semibold text-text-primary"> {details.name}</span> and
              remove all team members.
            </p>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Type <span className="font-semibold text-text-primary">{details.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={details.name}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-text-primary transition-all"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                  setDeleteError(null)
                }}
                className="px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== details.name}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
