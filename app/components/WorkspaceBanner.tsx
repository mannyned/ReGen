'use client'

import Link from 'next/link'
import { useWorkspaceOptional } from '@/app/context/WorkspaceContext'

// Banner height for padding calculations (h-10 = 40px)
export const WORKSPACE_BANNER_HEIGHT = 40

// Hook to check if banner is visible and get extra padding needed
export function useWorkspaceBannerPadding(): string {
  const workspaceContext = useWorkspaceOptional()
  const hasActiveWorkspace = !!workspaceContext?.activeWorkspace
  // Return extra padding class when banner is visible
  return hasActiveWorkspace ? 'pt-10' : ''
}

export function WorkspaceBanner() {
  const workspaceContext = useWorkspaceOptional()
  const activeWorkspace = workspaceContext?.activeWorkspace

  if (!activeWorkspace) {
    return null
  }

  return (
    <div className="fixed pwa-below-header left-0 right-0 z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10">
          {/* Workspace Info */}
          <div className="flex items-center gap-3">
            {/* Workspace Icon */}
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xs font-bold text-white">
                {activeWorkspace.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Workspace Name */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {activeWorkspace.name}
              </span>
              <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                activeWorkspace.role === 'OWNER'
                  ? 'bg-purple-500/20 text-purple-300'
                  : activeWorkspace.role === 'ADMIN'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-slate-500/20 text-slate-300'
              }`}>
                {activeWorkspace.role}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={`/w/${activeWorkspace.id}/dashboard`}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkspaceBanner
