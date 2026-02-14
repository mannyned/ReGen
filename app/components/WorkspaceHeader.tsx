'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface WorkspaceHeaderProps {
  workspaceName?: string
  workspaceId?: string
}

export function WorkspaceHeader({ workspaceName, workspaceId }: WorkspaceHeaderProps) {
  const router = useRouter()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Left: Back + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm hidden sm:inline">Back</span>
            </button>

            <div className="h-6 w-px bg-gray-200" />

            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/logo-regenr-header.svg"
                alt="ReGenr"
                width={100}
                height={28}
                className="h-6 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Center: Workspace Name */}
          {workspaceName && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="font-medium text-gray-900">{workspaceName}</span>
            </div>
          )}

          {/* Right: Navigation Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/workspaces"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              All Workspaces
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default WorkspaceHeader
