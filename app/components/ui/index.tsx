'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

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
  active?: boolean
}

interface AppHeaderProps {
  currentPage: string
  showSchedule?: boolean
  planBadge?: {
    text: string
    className: string
  }
  userIcon?: string
}

export function AppHeader({ currentPage, showSchedule = true, planBadge, userIcon }: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', active: currentPage === 'dashboard' },
    { href: '/upload', label: 'Upload', active: currentPage === 'upload' },
    ...(showSchedule ? [{ href: '/schedule', label: 'Schedule', active: currentPage === 'schedule' }] : []),
    { href: '/analytics', label: 'Analytics', active: currentPage === 'analytics' },
    { href: '/settings', label: 'Settings', active: currentPage === 'settings' },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 backdrop-blur-lg shadow-lg'
        : 'bg-white border-b border-gray-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 lg:w-12 lg:h-12 transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="ReGen Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                ReGen
              </span>
            </Link>
            <span className="text-text-secondary text-sm hidden sm:inline">/ {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}</span>
            {planBadge && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ml-2 hidden sm:inline ${planBadge.className}`}>
                {planBadge.text}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  item.active
                    ? 'text-primary bg-primary/5'
                    : 'text-text-secondary hover:text-primary hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {userIcon && (
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-semibold cursor-pointer ml-2 hover:scale-105 transition-transform">
                {userIcon}
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${
        mobileMenuOpen ? 'max-h-80 border-t border-gray-100' : 'max-h-0'
      }`}>
        <div className="px-4 py-4 space-y-1 bg-white">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                item.active
                  ? 'text-primary bg-primary/5'
                  : 'text-text-secondary hover:text-primary hover:bg-gray-50'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
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
    <div className={`min-h-screen bg-background pt-20 lg:pt-24 ${className}`}>
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
    value: string
    positive?: boolean
  }
  subtitle?: string
}

export function StatCard({ label, value, icon, trend, subtitle }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-secondary text-sm font-medium">{label}</span>
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
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'gray' | 'gradient'
  className?: string
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = {
    primary: 'bg-primary/10 text-primary',
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
