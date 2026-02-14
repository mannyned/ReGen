'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import WorkspaceHeader from '@/app/components/WorkspaceHeader'

interface TeamMember {
  id: string
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: string
  canRename?: boolean
}

interface PendingInvite {
  id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  expiresAt: string
  createdAt: string
}

interface WorkspaceTeam {
  id: string
  name: string
  isDefault?: boolean
  members: TeamMember[]
  pendingInvites: PendingInvite[]
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER'
}

export default function TeamManagementPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string

  const [team, setTeam] = useState<WorkspaceTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchTeam()
  }, [workspaceId])

  async function fetchTeam() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/workspaces/${workspaceId}/team`)

      if (!res.ok) {
        if (res.status === 404) {
          router.push('/workspaces?error=not_found')
          return
        }
        if (res.status === 403) {
          setError('You do not have permission to manage this team')
          return
        }
        throw new Error('Failed to fetch team')
      }

      const data = await res.json()
      setTeam(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return

    try {
      setInviting(true)
      setInviteError(null)

      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite')
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setShowInviteModal(false)
      fetchTeam()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleToggleRenamePermission(memberId: string, currentValue: boolean) {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canRename: !currentValue }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update permission')
      }

      // Refresh team data
      fetchTeam()
    } catch (err) {
      console.error('Failed to toggle rename permission:', err)
      // Could show an error toast here
    }
  }

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

  const isOwner = team?.userRole === 'OWNER'
  const isAdmin = team?.userRole === 'OWNER' || team?.userRole === 'ADMIN'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <WorkspaceHeader workspaceName={team?.name} workspaceId={workspaceId} />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <WorkspaceHeader workspaceId={workspaceId} />
        <div className="max-w-4xl mx-auto px-4 py-16 pt-24 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
              {error || 'Team not found'}
            </h2>
            <button
              onClick={() => router.push(`/w/${workspaceId}/dashboard`)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Workspace
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <WorkspaceHeader workspaceName={team.name} workspaceId={workspaceId} />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-20 lg:pt-24">
        {/* Success Message */}
        {inviteSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-green-800 dark:text-green-200">{inviteSuccess}</p>
              <button
                onClick={() => setInviteSuccess(null)}
                className="text-green-600 dark:text-green-400 hover:text-green-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Team Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage members and invitations for {team.name}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite Member
            </button>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Members ({team.members.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {team.members.map((member, index) => (
              <div
                key={member.id}
                className="px-6 py-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.displayName || member.email}
                        className="w-12 h-12 rounded-full ring-2 ring-white dark:ring-gray-800"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 ${
                        index === 0
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                          : index === 1
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <span className="text-sm font-semibold text-white">
                          {(member.displayName || member.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.displayName || member.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClasses(
                      member.role
                    )}`}
                  >
                    {member.role}
                  </span>
                </div>

                {/* Admin Permissions - Only shown to owner for admin members */}
                {isOwner && member.role === 'ADMIN' && (
                  <div className="mt-3 ml-16 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Admin Permissions
                    </p>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Can rename workspace
                      </span>
                      <button
                        onClick={() => handleToggleRenamePermission(member.id, member.canRename || false)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          member.canRename
                            ? 'bg-blue-600'
                            : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            member.canRename ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites */}
        {team.pendingInvites.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pending Invitations ({team.pendingInvites.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {team.pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invite.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClasses(
                      invite.role
                    )}`}
                  >
                    {invite.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Invite Team Member
            </h2>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{inviteError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setInviteError(null)
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                disabled={inviting}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
