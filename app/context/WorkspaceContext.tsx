'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// ============================================
// TYPES
// ============================================

export interface Workspace {
  id: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  memberCount: number
  isDefault: boolean
}

interface WorkspaceContextValue {
  /** Currently active workspace (null if not in workspace mode) */
  currentWorkspace: Workspace | null
  /** Active workspace that persists across pages (for showing brand context) */
  activeWorkspace: Workspace | null
  /** All workspaces the user has access to */
  workspaces: Workspace[]
  /** User's workspace limit */
  workspaceLimit: number
  /** Whether workspaces feature is enabled for this user */
  workspacesEnabled: boolean
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
  /** Switch to a different workspace */
  switchWorkspace: (workspaceId: string) => void
  /** Set active workspace (persists across pages) */
  setActiveWorkspace: (workspace: Workspace | null) => void
  /** Refresh workspaces list */
  refreshWorkspaces: () => Promise<void>
  /** Check if user can create more workspaces */
  canCreateWorkspace: boolean
  /** Check if user is admin in current workspace */
  isAdmin: boolean
}

// ============================================
// CONTEXT
// ============================================

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

interface WorkspaceProviderProps {
  children: ReactNode
  /** Initial workspace ID (from route param) */
  initialWorkspaceId?: string
  /** Initial workspace name (from server) */
  initialWorkspaceName?: string
  /** Initial role (from server) */
  initialRole?: 'OWNER' | 'ADMIN' | 'MEMBER'
}

export function WorkspaceProvider({
  children,
  initialWorkspaceId,
  initialWorkspaceName,
  initialRole,
}: WorkspaceProviderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceLimit, setWorkspaceLimit] = useState(1)
  const [workspacesEnabled, setWorkspacesEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Current workspace derived from route or initial props
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    initialWorkspaceId || null
  )

  // Active workspace that persists across pages (stored in sessionStorage)
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null)

  // Load active workspace from sessionStorage on mount (client-side only)
  useEffect(() => {
    const stored = sessionStorage.getItem('activeWorkspace')
    if (stored) {
      try {
        setActiveWorkspaceState(JSON.parse(stored) as Workspace)
      } catch {
        // Invalid stored data
      }
    }
  }, [])

  // Find current workspace from list
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || null

  // Set active workspace and persist to sessionStorage
  const setActiveWorkspace = useCallback((workspace: Workspace | null) => {
    if (workspace) {
      setActiveWorkspaceState(workspace)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('activeWorkspace', JSON.stringify(workspace))
      }
    } else {
      setActiveWorkspaceState(null)
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('activeWorkspace')
      }
    }
  }, [])

  // Fetch workspaces on mount
  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/workspaces')

      if (!response.ok) {
        if (response.status === 403) {
          // Workspaces not enabled for user
          setWorkspacesEnabled(false)
          setWorkspaces([])
          return
        }
        throw new Error('Failed to fetch workspaces')
      }

      const data = await response.json()

      setWorkspaces(data.workspaces || [])
      setWorkspaceLimit(data.workspaceLimit || 1)
      setWorkspacesEnabled(true)

      // If we have initial workspace info but no workspaces list yet,
      // add it temporarily
      if (initialWorkspaceId && data.workspaces?.length === 0) {
        setWorkspaces([
          {
            id: initialWorkspaceId,
            name: initialWorkspaceName || 'Workspace',
            role: initialRole || 'MEMBER',
            memberCount: 1,
            isDefault: true,
          },
        ])
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err)
      setError(err instanceof Error ? err.message : 'Failed to load workspaces')
    } finally {
      setIsLoading(false)
    }
  }, [initialWorkspaceId, initialWorkspaceName, initialRole])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  // Update current workspace when route changes
  useEffect(() => {
    const match = pathname.match(/^\/w\/([^/]+)/)
    if (match) {
      setCurrentWorkspaceId(match[1])
    } else {
      setCurrentWorkspaceId(null)
    }
  }, [pathname])

  // Switch workspace
  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((w) => w.id === workspaceId)
      if (workspace) {
        setCurrentWorkspaceId(workspaceId)
        router.push(`/w/${workspaceId}/dashboard`)
      }
    },
    [workspaces, router]
  )

  // Computed values
  const ownedCount = workspaces.filter((w) => w.role === 'OWNER').length
  const canCreateWorkspace = ownedCount < workspaceLimit
  const isAdmin = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'

  const value: WorkspaceContextValue = {
    currentWorkspace,
    activeWorkspace,
    workspaces,
    workspaceLimit,
    workspacesEnabled,
    isLoading,
    error,
    switchWorkspace,
    setActiveWorkspace,
    refreshWorkspaces: fetchWorkspaces,
    canCreateWorkspace,
    isAdmin,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

/**
 * Use workspace context
 *
 * @returns Workspace context value
 * @throws Error if used outside WorkspaceProvider
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }

  return context
}

/**
 * Use workspace context (optional)
 *
 * Returns null if not inside a WorkspaceProvider.
 * Use this in components that work both inside and outside workspace context.
 */
export function useWorkspaceOptional(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext)
}
