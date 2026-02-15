'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SignOutButton } from '@/components/auth'
import { Tooltip } from './Tooltip'
import { useFeedback } from '@/app/context/FeedbackContext'
import { WorkspaceSwitcher } from '@/app/components/WorkspaceSwitcher'
import { WorkspaceBanner } from '@/app/components/WorkspaceBanner'
import { useWorkspaceOptional } from '@/app/context/WorkspaceContext'
import { WORKSPACE_SWITCHER_V2 } from '@/lib/feature-flags'

// Lazy-load V2 switcher — zero cost when flag is off
const WorkspaceSwitcherV2 = dynamic(
  () => import('@/app/components/WorkspaceSwitcherV2'),
  { ssr: false }
)

// ==========================================
// PLATFORM LOGO COMPONENT (RE-EXPORT)
// ==========================================

export {
  PlatformLogo,
  BRAND_COLORS as PLATFORM_BRAND_COLORS,
  PLATFORM_NAMES,
  SIZES as PLATFORM_LOGO_SIZES,
  getPlatformBackground,
  getPlatformDisplayName,
  SUPPORTED_PLATFORMS,
  type LogoSize,
  type LogoVariant,
} from './PlatformLogo'

export { Tooltip, MetricTooltips, MetricInfo } from './Tooltip'

export {
  LockIcon,
  Skeleton,
  BlurredChart,
  LockedValue,
  LockedMetricCard,
  LockedFeatureBanner,
  UpgradeModal,
  TrialCountdownBanner,
  PersonalizedUpgradePrompt
} from './LockedMetric'

// ==========================================
// ICON COMPONENTS
// ==========================================

export const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)

export const ArrowLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
)

export const ArrowRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
)

export const ChevronRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

export const MenuIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export const CloseIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

export const UploadIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
)

export const ChartIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

export const SettingsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

export const CalendarIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

export const HomeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

// ==========================================
// NAVIGATION HEADER COMPONENT
// ==========================================

interface NavItem {
  href: string
  label: string
  icon?: React.ReactNode
  active?: boolean
}

interface AppHeaderProps {
  currentPage: string
  showSchedule?: boolean
  isPro?: boolean
  userInitials?: string
  userName?: string
  userRole?: 'owner' | 'admin' | 'member'  // Team role - billing only shows for owner (auto-fetched if not provided)
  showBackButton?: boolean  // Show back navigation button
}

export function AppHeader({ currentPage, showSchedule = true, isPro = false, userInitials = 'U', userName = 'User', userRole: userRoleProp, showBackButton = false }: AppHeaderProps) {
  const router = useRouter()
  const workspaceContext = useWorkspaceOptional()
  const activeWorkspace = workspaceContext?.activeWorkspace
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [fetchedUserRole, setFetchedUserRole] = useState<'owner' | 'admin' | 'member'>('owner')
  const [userDataLoaded, setUserDataLoaded] = useState(false)

  // Beta feedback
  const { isBetaUser, openFeedbackModal } = useFeedback()

  // Auto-fetch user's team role if not provided via props
  useEffect(() => {
    if (userRoleProp) {
      setFetchedUserRole(userRoleProp)
      setUserDataLoaded(true)
      return
    }

    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          // teamRole is 'owner' for non-team users, or actual role for team members
          setFetchedUserRole(data.teamRole || 'owner')
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      } finally {
        setUserDataLoaded(true)
      }
    }

    fetchUserRole()
  }, [userRoleProp])

  // Use provided role or fetched role
  const userRole = userRoleProp || fetchedUserRole

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setMoreMenuOpen(false)
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Primary nav items (always visible on desktop)
  const primaryNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', active: currentPage === 'dashboard' },
    { href: '/upload', label: 'Upload', active: currentPage === 'upload' },
    ...(showSchedule ? [{ href: '/schedule', label: 'Schedule', active: currentPage === 'schedule' }] : []),
    { href: '/analytics', label: 'Analytics', active: currentPage === 'analytics' },
  ]

  // Secondary nav items (in "More" dropdown) - Content Sources section
  const moreNavItems: NavItem[] = [
    { href: '/workspaces', label: 'Workspaces', active: currentPage === 'workspaces' || currentPage === 'workspace' },
    { href: '/rss', label: 'Content Feeds', active: currentPage === 'rss' },
    { href: '/help', label: 'Help Center', active: currentPage === 'help' },
  ]

  // Check if any "more" item is active
  const isMoreActive = moreNavItems.some(item => item.active)

  return (
    <>
    <header className={`fixed top-0 left-0 right-0 z-50 pwa-header transition-all duration-300 ${
      scrolled
        ? 'bg-white/98 backdrop-blur-xl shadow-sm'
        : 'bg-white border-b border-gray-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Workspace Switcher V2 + Logo + Nav */}
          <div className="flex items-center gap-6">
            {/* V2 Workspace Switcher — top-left, Notion-style */}
            {WORKSPACE_SWITCHER_V2 && (
              <>
                <WorkspaceSwitcherV2 />
                <div className="hidden sm:block w-px h-6 bg-gray-200" />
              </>
            )}

            {showBackButton && activeWorkspace && (
              <button
                onClick={() => router.push(`/w/${activeWorkspace.id}/dashboard`)}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">
                  <span className="hidden sm:inline">Back to </span>
                  <span className="font-medium">{activeWorkspace.name}</span>
                </span>
              </button>
            )}
            {showBackButton && !activeWorkspace && (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm hidden sm:inline">Back</span>
              </button>
            )}
            {showBackButton && <div className="h-6 w-px bg-gray-200" />}
            <Link href="/dashboard" className="flex items-center group">
              <div className="relative h-7 lg:h-8 transition-transform group-hover:scale-[1.02]">
                <Image
                  src="/logo-regenr-header.svg"
                  alt="ReGenr"
                  width={120}
                  height={32}
                  className="h-full w-auto"
                  priority
                />
              </div>
            </Link>

            {/* Desktop Primary Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    item.active
                      ? 'text-primary bg-primary/8'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {/* More Dropdown */}
              <div className="relative" data-dropdown>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMoreMenuOpen(!moreMenuOpen)
                    setAvatarMenuOpen(false)
                  }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isMoreActive
                      ? 'text-primary bg-primary/8'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  More
                  <svg className={`w-4 h-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* More Dropdown Menu */}
                {moreMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {moreNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2.5 text-sm transition-colors ${
                          item.active
                            ? 'text-primary bg-primary/5'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => setMoreMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {/* Beta Feedback Option */}
                    {isBetaUser && (
                      <>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          onClick={() => {
                            setMoreMenuOpen(false)
                            openFeedbackModal('GENERAL')
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-violet-600 hover:bg-violet-50 transition-colors flex items-center gap-2"
                        >
                          <span className="text-base">💬</span>
                          Give Beta Feedback
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Side: CTA + Avatar */}
          <div className="flex items-center gap-3">
            {/* Workspace Switcher (old) - hidden when V2 is enabled */}
            {!WORKSPACE_SWITCHER_V2 && (
              <div className="hidden sm:block">
                <WorkspaceSwitcher />
              </div>
            )}

            {/* Create New CTA - Desktop */}
            <Link
              href="/upload"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </Link>

            {/* Avatar with Dropdown - Desktop */}
            <div className="hidden lg:block relative" data-dropdown>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAvatarMenuOpen(!avatarMenuOpen)
                  setMoreMenuOpen(false)
                }}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                  {userInitials}
                </div>
                {isPro && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">
                    Pro
                  </span>
                )}
              </button>

              {/* Avatar Dropdown Menu */}
              {avatarMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">{isPro ? 'Pro Plan' : 'Free Plan'}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    {/* Billing - only visible to team owner */}
                    {userRole === 'owner' && (
                      <Link
                        href="/pricing"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setAvatarMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Billing
                      </Link>
                    )}
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-gray-100 py-1">
                    <SignOutButton
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 rounded-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        mobileMenuOpen ? 'max-h-[32rem] border-t border-gray-100' : 'max-h-0'
      }`}>
        <div className="px-4 py-3 bg-white">
          {/* V2 Workspace Switcher - Mobile */}
          {WORKSPACE_SWITCHER_V2 && (
            <div className="pb-3 mb-3 border-b border-gray-100">
              <WorkspaceSwitcherV2 />
            </div>
          )}

          {/* User Info - Mobile */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold">
              {userInitials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{isPro ? 'Pro Plan' : 'Free Plan'}</p>
            </div>
            {isPro && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">
                Pro
              </span>
            )}
          </div>

          {/* Primary Nav - Mobile */}
          <div className="space-y-1 mb-3">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? 'text-primary bg-primary/8'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Secondary Nav - Mobile (Content Sources) */}
          <div className="py-3 border-t border-gray-100 space-y-1">
            <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Content Sources</p>
            {moreNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? 'text-primary bg-primary/8'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Beta Feedback - Mobile */}
          {isBetaUser && (
            <div className="py-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  openFeedbackModal('GENERAL')
                }}
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <span className="text-lg">💬</span>
                Give Beta Feedback
              </button>
            </div>
          )}

          {/* Settings & Billing - Mobile */}
          <div className="py-3 border-t border-gray-100 space-y-1">
            <Link
              href="/settings"
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Settings
            </Link>
            {/* Billing - only visible to team owner */}
            {userRole === 'owner' && (
              <Link
                href="/pricing"
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Billing
              </Link>
            )}
          </div>

          {/* Sign Out - Mobile */}
          <div className="pt-3 border-t border-gray-100">
            <SignOutButton
              variant="ghost"
              size="md"
              className="w-full justify-center text-red-600 hover:bg-red-50"
            />
          </div>
        </div>
      </div>
    </header>
    {/* Workspace Banner - shows active workspace context */}
    <WorkspaceBanner />
    </>
  )
}

// ==========================================
// PAGE WRAPPER COMPONENT
// ==========================================

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`min-h-screen bg-background pwa-page-offset ${className}`}>
      {children}
    </div>
  )
}

// ==========================================
// CARD COMPONENTS
// ==========================================

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function Card({
  children,
  className = '',
  hover = true,
  onClick,
  onMouseEnter,
  onMouseLeave
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${
        hover ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1' : ''
      } ${className}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  )
}

// ==========================================
// STAT CARD COMPONENT
// ==========================================

interface StatCardProps {
  label: string
  value: string | number
  icon: string
  trend?: {
    value: string | number
    positive?: boolean
  }
  subtitle?: string
  tooltip?: string
}

export function StatCard({ label, value, icon, trend, subtitle, tooltip }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-text-secondary text-sm font-medium">{label}</span>
          {tooltip && (
            <Tooltip content={tooltip} title={label} position="top">
              <span className="sr-only">Info</span>
            </Tooltip>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-text-primary mb-1">{value}</p>
      {trend && (
        <p className={`text-sm font-medium ${trend.positive !== false ? 'text-green-600' : 'text-red-600'}`}>
          {trend.value}
        </p>
      )}
      {subtitle && (
        <p className="text-sm text-text-secondary">{subtitle}</p>
      )}
    </Card>
  )
}

// ==========================================
// GRADIENT BANNER COMPONENT
// ==========================================

interface GradientBannerProps {
  children: React.ReactNode
  className?: string
}

export function GradientBanner({ children, className = '' }: GradientBannerProps) {
  return (
    <div className={`bg-gradient-brand rounded-2xl p-6 text-white shadow-lg ${className}`}>
      {children}
    </div>
  )
}

// ==========================================
// BADGE COMPONENT
// ==========================================

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray' | 'gradient'
  className?: string
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ==========================================
// SECTION HEADER COMPONENT
// ==========================================

interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, badge, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {badge && <Badge variant="primary">{badge}</Badge>}
          <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">{title}</h1>
        </div>
        {subtitle && <p className="text-text-secondary text-lg">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ==========================================
// EMPTY STATE COMPONENT
// ==========================================

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  )
}
