'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useWorkspaceOptional, type Workspace } from '@/app/context/WorkspaceContext'

// ============================================
// ROLE BADGE STYLING
// ============================================

const ROLE_BADGE_CLASS: Record<string, string> = {
  OWNER: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-600',
}

// ============================================
// WORKSPACE ITEM
// ============================================

function WorkspaceItem({
  workspace,
  isActive,
  isFocused,
  onSelect,
}: {
  workspace: Workspace
  isActive: boolean
  isFocused: boolean
  onSelect: () => void
}) {
  const itemRef = useRef<HTMLButtonElement>(null)

  // Scroll focused item into view
  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [isFocused])

  return (
    <button
      ref={itemRef}
      onClick={onSelect}
      role="option"
      aria-selected={isActive}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
        isActive ? 'bg-primary/5' : ''
      } ${isFocused ? 'bg-gray-50' : ''} hover:bg-gray-50`}
    >
      {/* Workspace initial */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center text-white text-sm font-bold shrink-0">
        {workspace.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {workspace.name}
        </p>
        <span
          className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded mt-0.5 ${
            ROLE_BADGE_CLASS[workspace.role] || ROLE_BADGE_CLASS.MEMBER
          }`}
        >
          {workspace.role}
        </span>
      </div>

      {/* Active checkmark */}
      {isActive && (
        <svg
          className="w-5 h-5 text-primary shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
}

// ============================================
// PANEL CONTENT (shared between desktop & mobile)
// ============================================

function PanelContent({
  filteredWorkspaces,
  currentWorkspace,
  focusedIndex,
  canCreateWorkspace,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  onSelect,
  onClose,
}: {
  filteredWorkspaces: Workspace[]
  currentWorkspace: Workspace | null
  focusedIndex: number
  canCreateWorkspace: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <>
      {/* Search input */}
      <div className="px-3 pb-2">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search workspaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400"
          aria-label="Search workspaces"
          role="searchbox"
        />
      </div>

      {/* Workspace list */}
      <div className="max-h-60 overflow-y-auto px-1" role="listbox" aria-label="Workspaces">
        {filteredWorkspaces.map((workspace, index) => (
          <WorkspaceItem
            key={workspace.id}
            workspace={workspace}
            isActive={workspace.id === currentWorkspace?.id}
            isFocused={focusedIndex === index}
            onSelect={() => onSelect(workspace.id)}
          />
        ))}
        {filteredWorkspaces.length === 0 && (
          <p className="px-3 py-6 text-sm text-gray-400 text-center">
            No workspaces found
          </p>
        )}
      </div>

      {/* Divider + Actions */}
      <div className="border-t border-gray-100 mt-1 pt-1 px-1">
        {canCreateWorkspace && (
          <Link
            href="/workspaces"
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Workspace
          </Link>
        )}
        <Link
          href="/workspaces"
          className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Manage Workspaces
        </Link>
      </div>
    </>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WorkspaceSwitcherV2() {
  const ctx = useWorkspaceOptional()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Don't render if workspace context unavailable or no workspaces
  if (!ctx || !ctx.workspacesEnabled || ctx.workspaces.length === 0) {
    return null
  }

  const { currentWorkspace, workspaces, switchWorkspace, canCreateWorkspace, isLoading } = ctx

  if (isLoading) return null

  return (
    <WorkspaceSwitcherInner
      currentWorkspace={currentWorkspace}
      workspaces={workspaces}
      switchWorkspace={switchWorkspace}
      canCreateWorkspace={canCreateWorkspace}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      focusedIndex={focusedIndex}
      setFocusedIndex={setFocusedIndex}
      isMobile={isMobile}
      setIsMobile={setIsMobile}
      triggerRef={triggerRef}
      panelRef={panelRef}
      searchInputRef={searchInputRef}
    />
  )
}

// Extracted inner component to use hooks unconditionally
function WorkspaceSwitcherInner({
  currentWorkspace,
  workspaces,
  switchWorkspace,
  canCreateWorkspace,
  isOpen,
  setIsOpen,
  searchQuery,
  setSearchQuery,
  focusedIndex,
  setFocusedIndex,
  isMobile,
  setIsMobile,
  triggerRef,
  panelRef,
  searchInputRef,
}: {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  switchWorkspace: (id: string) => void
  canCreateWorkspace: boolean
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  focusedIndex: number
  setFocusedIndex: (i: number) => void
  isMobile: boolean
  setIsMobile: (v: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  panelRef: React.RefObject<HTMLDivElement | null>
  searchInputRef: React.RefObject<HTMLInputElement | null>
}) {
  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [setIsMobile])

  // Filter workspaces by search
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces
    const q = searchQuery.toLowerCase()
    return workspaces.filter((w) => w.name.toLowerCase().includes(q))
  }, [workspaces, searchQuery])

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [searchQuery, setFocusedIndex])

  // Auto-focus search when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    } else {
      setSearchQuery('')
      setFocusedIndex(-1)
    }
  }, [isOpen, searchInputRef, setSearchQuery, setFocusedIndex])

  // Close on click outside (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isMobile, panelRef, triggerRef, setIsOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          triggerRef.current?.focus()
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(
            focusedIndex < filteredWorkspaces.length - 1 ? focusedIndex + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(
            focusedIndex > 0 ? focusedIndex - 1 : filteredWorkspaces.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredWorkspaces.length) {
            handleSelect(filteredWorkspaces[focusedIndex].id)
          }
          break
      }
    },
    [isOpen, focusedIndex, filteredWorkspaces, setIsOpen, setFocusedIndex, triggerRef]
  )

  const handleSelect = useCallback(
    (id: string) => {
      if (id !== currentWorkspace?.id) {
        switchWorkspace(id)
      }
      setIsOpen(false)
    },
    [currentWorkspace, switchWorkspace, setIsOpen]
  )

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, isMobile])

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current workspace: ${currentWorkspace?.name || 'Select workspace'}. Click to switch.`}
      >
        {/* Initial Avatar */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-white text-xs font-bold shrink-0">
          {currentWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
        </div>

        {/* Workspace Name (hidden on small mobile) */}
        <span className="hidden sm:block text-sm font-semibold text-gray-900 max-w-[120px] truncate">
          {currentWorkspace?.name || 'Workspace'}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Desktop Popover */}
      {isOpen && !isMobile && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-[60] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <PanelContent
            filteredWorkspaces={filteredWorkspaces}
            currentWorkspace={currentWorkspace}
            focusedIndex={focusedIndex}
            canCreateWorkspace={canCreateWorkspace}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchInputRef={searchInputRef}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {isOpen && isMobile && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[59] animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            ref={panelRef}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-in-bottom pwa-safe-bottom"
            role="dialog"
            aria-label="Switch workspace"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Title */}
            <div className="px-4 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Workspaces</h2>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto py-2">
              <PanelContent
                filteredWorkspaces={filteredWorkspaces}
                currentWorkspace={currentWorkspace}
                focusedIndex={focusedIndex}
                canCreateWorkspace={canCreateWorkspace}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchInputRef={searchInputRef}
                onSelect={handleSelect}
                onClose={() => setIsOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default WorkspaceSwitcherV2
