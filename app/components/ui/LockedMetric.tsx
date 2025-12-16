'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLockedMetric, useUpgradeIntent, LockedMetricId } from '@/app/context/UpgradeIntentContext'

// ============================================================================
// LOCK ICON COMPONENT
// ============================================================================

interface LockIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  className?: string
}

export function LockIcon({ size = 'md', animated = true, className = '' }: LockIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <svg
      className={`${sizeClasses[size]} ${animated ? 'transition-transform group-hover:scale-110' : ''} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// ============================================================================
// SKELETON PLACEHOLDER
// ============================================================================

interface SkeletonProps {
  variant?: 'text' | 'chart' | 'card' | 'circular'
  width?: string
  height?: string
  className?: string
  animate?: boolean
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  animate = true
}: SkeletonProps) {
  const baseClasses = `bg-gray-200 rounded ${animate ? 'animate-pulse' : ''}`

  const variantStyles: Record<string, string> = {
    text: 'h-4 w-full',
    chart: 'h-32 w-full rounded-lg',
    card: 'h-24 w-full rounded-xl',
    circular: 'rounded-full'
  }

  return (
    <div
      className={`${baseClasses} ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
    />
  )
}

// ============================================================================
// BLURRED CHART PLACEHOLDER
// ============================================================================

interface BlurredChartProps {
  type?: 'line' | 'bar' | 'pie' | 'area'
  height?: number
  className?: string
}

export function BlurredChart({ type = 'line', height = 120, className = '' }: BlurredChartProps) {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <svg viewBox="0 0 200 80" className="w-full h-full">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d="M 10 60 Q 30 40, 50 50 T 90 30 T 130 45 T 170 25 T 190 35"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 10 60 Q 30 40, 50 50 T 90 30 T 130 45 T 170 25 T 190 35 L 190 80 L 10 80 Z"
              fill="url(#lineGrad)"
              opacity="0.2"
            />
          </svg>
        )
      case 'bar':
        return (
          <svg viewBox="0 0 200 80" className="w-full h-full">
            {[20, 45, 60, 35, 50, 70, 40, 55].map((h, i) => (
              <rect
                key={i}
                x={10 + i * 24}
                y={80 - h}
                width="18"
                height={h}
                fill="#6366F1"
                opacity="0.3"
                rx="2"
              />
            ))}
          </svg>
        )
      case 'pie':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="40" fill="#6366F1" opacity="0.2" />
            <path d="M 50 50 L 50 10 A 40 40 0 0 1 90 50 Z" fill="#6366F1" opacity="0.3" />
            <path d="M 50 50 L 90 50 A 40 40 0 0 1 50 90 Z" fill="#A855F7" opacity="0.3" />
          </svg>
        )
      case 'area':
        return (
          <svg viewBox="0 0 200 80" className="w-full h-full">
            <defs>
              <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path
              d="M 0 70 Q 25 50, 50 55 T 100 35 T 150 45 T 200 30 L 200 80 L 0 80 Z"
              fill="url(#areaGrad)"
            />
          </svg>
        )
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-50 ${className}`}
      style={{ height }}
    >
      <div className="absolute inset-0 blur-[2px] opacity-60">
        {renderChart()}
      </div>
      <div className="absolute inset-0 bg-white/40" />
    </div>
  )
}

// ============================================================================
// LOCKED VALUE DISPLAY
// ============================================================================

interface LockedValueProps {
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function LockedValue({ size = 'md', showIcon = true, className = '' }: LockedValueProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`font-bold text-gray-300 ${sizeClasses[size]}`}>--</span>
      {showIcon && <LockIcon size="sm" className="text-gray-400" />}
    </div>
  )
}

// ============================================================================
// LOCKED METRIC CARD (Main Component)
// ============================================================================

interface LockedMetricCardProps {
  metricId: LockedMetricId
  icon: string
  label: string
  sublabel?: string
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'none'
  showChart?: boolean
  showTrend?: boolean
  className?: string
  onUpgradeClick?: () => void
  // For trial preview
  previewValue?: string | number
  previewTrend?: { value: number; positive: boolean }
  userPlan?: 'free' | 'creator' | 'pro'
}

export function LockedMetricCard({
  metricId,
  icon,
  label,
  sublabel,
  chartType = 'line',
  showChart = false,
  showTrend = true,
  className = '',
  onUpgradeClick,
  previewValue,
  previewTrend,
  userPlan = 'creator'
}: LockedMetricCardProps) {
  const {
    onMouseEnter,
    onMouseLeave,
    onTap,
    onClick,
    isTrialActive,
    trialTimeRemaining
  } = useLockedMetric(metricId)

  const [touchStart, setTouchStart] = useState<number | null>(null)

  const handleTouchStart = () => {
    setTouchStart(Date.now())
  }

  const handleTouchEnd = () => {
    if (touchStart && Date.now() - touchStart < 300) {
      onTap()
    }
    setTouchStart(null)
  }

  const handleClick = () => {
    onClick()
    onUpgradeClick?.()
  }

  // Format trial time remaining
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Show unlocked preview during trial
  if (isTrialActive && previewValue !== undefined) {
    return (
      <div
        className={`group relative bg-white rounded-xl p-4 border-2 border-green-300 shadow-lg transition-all animate-fade-in ${className}`}
      >
        {/* Trial Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <span>👁️</span>
          <span>Preview: {trialTimeRemaining ? formatTimeRemaining(trialTimeRemaining) : '...'}</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl transition-transform group-hover:scale-110">{icon}</span>
          <span className="text-xs text-text-secondary font-medium">{label}</span>
        </div>

        <p className="text-2xl font-bold text-text-primary">{previewValue}</p>

        {showTrend && previewTrend && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-text-secondary">{sublabel}</p>
            <span className={`text-xs font-medium ${previewTrend.positive ? 'text-green-500' : 'text-red-500'}`}>
              {previewTrend.positive ? '↑' : '↓'} {Math.abs(previewTrend.value)}%
            </span>
          </div>
        )}

        {showChart && chartType !== 'none' && (
          <div className="mt-3">
            <BlurredChart type={chartType} height={60} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`group relative bg-white rounded-xl p-4 border border-gray-200 transition-all duration-300 hover:border-purple-300 hover:shadow-lg cursor-pointer ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`${label} - Locked. Click to learn about Pro features`}
    >
      {/* Lock Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-gray-50/90 rounded-xl z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2 transform group-hover:scale-110 transition-transform">
          <LockIcon size="md" className="text-purple-600" />
        </div>
        <p className="text-xs font-medium text-purple-600">Pro Feature</p>
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl opacity-50 transition-transform">{icon}</span>
          <span className="text-xs text-text-secondary font-medium opacity-70">{label}</span>
        </div>

        <LockedValue size="md" showIcon={false} />

        {showTrend && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-text-secondary opacity-50">{sublabel || 'Upgrade to Pro'}</p>
            <Skeleton variant="text" width="40px" height="12px" animate={false} />
          </div>
        )}

        {showChart && chartType !== 'none' && (
          <div className="mt-3 opacity-40">
            <BlurredChart type={chartType} height={60} />
          </div>
        )}
      </div>

      {/* Mobile tap indicator */}
      <div className="absolute bottom-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
        <span className="text-xs">Tap for details</span>
      </div>
    </div>
  )
}

// ============================================================================
// LOCKED FEATURE BANNER
// ============================================================================

interface LockedFeatureBannerProps {
  metricId: LockedMetricId
  icon: string
  title: string
  description: string
  previewStats?: { label: string; value: string }[]
  gradientFrom?: string
  gradientTo?: string
  className?: string
}

export function LockedFeatureBanner({
  metricId,
  icon,
  title,
  description,
  previewStats,
  gradientFrom = 'from-purple-500',
  gradientTo = 'to-pink-500',
  className = ''
}: LockedFeatureBannerProps) {
  const { onMouseEnter, onMouseLeave, onClick, personalizedPrompt } = useLockedMetric(metricId)

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradientFrom} ${gradientTo} opacity-20`} />

      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl opacity-50">{icon}</div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-text-primary">{title}</h3>
              <LockIcon size="sm" className="text-purple-600" />
            </div>
            <p className="text-sm text-text-secondary max-w-md">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Blurred Stats Preview */}
          {previewStats && (
            <div className="hidden md:flex items-center gap-4 mr-4">
              {previewStats.map((stat, i) => (
                <div key={i} className="text-right opacity-40 blur-[1px]">
                  <p className="text-xl font-bold text-gray-400">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Upgrade Button */}
          <Link
            href="/settings"
            className={`px-5 py-2.5 bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl group-hover:scale-105 flex items-center gap-2`}
            onClick={(e) => e.stopPropagation()}
          >
            <span>⭐</span>
            <span className="hidden sm:inline">Upgrade to Pro</span>
            <span className="sm:hidden">Pro</span>
          </Link>
        </div>
      </div>

      {/* Hover CTA */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 to-pink-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
        <div className="text-center text-white">
          <p className="text-lg font-bold mb-1">{personalizedPrompt.title}</p>
          <p className="text-sm opacity-90 mb-3">{personalizedPrompt.description}</p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {personalizedPrompt.cta}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// UPGRADE MODAL
// ============================================================================

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  metricId?: LockedMetricId | null
  onUpgrade?: () => void
  onStartTrial?: (metricId: LockedMetricId) => void
}

export function UpgradeModal({
  isOpen,
  onClose,
  metricId,
  onUpgrade,
  onStartTrial
}: UpgradeModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const metricInfo: Record<LockedMetricId, { icon: string; benefits: string[] }> = {
    sentiment: {
      icon: '😊',
      benefits: ['Understand audience emotions', 'Optimize content tone', 'Track sentiment trends']
    },
    retention: {
      icon: '👁️',
      benefits: ['See exact drop-off points', 'Improve video hooks', 'Boost completion rates']
    },
    virality: {
      icon: '🔥',
      benefits: ['Identify viral potential', 'Track share velocity', 'Optimize for shares']
    },
    velocity: {
      icon: '⚡',
      benefits: ['Optimize posting frequency', 'Balance quality & quantity', 'Maximize reach']
    },
    crossPlatform: {
      icon: '🔗',
      benefits: ['Compare all platforms', 'Find synergies', 'Unified view']
    },
    locationAnalytics: {
      icon: '🌍',
      benefits: ['Geographic insights', 'Target new markets', 'Local optimization']
    },
    retentionGraphs: {
      icon: '📊',
      benefits: ['Visual retention curves', 'Hook score analysis', 'Drop-off detection']
    },
    aiRecommendations: {
      icon: '🤖',
      benefits: ['Personalized insights', 'AI-powered tips', 'Growth strategies']
    },
    captionUsage: {
      icon: '📝',
      benefits: ['Compare caption styles', 'A/B test results', 'Optimization insights']
    },
    calendarInsights: {
      icon: '📅',
      benefits: ['Peak performance days', 'Optimal frequency', 'Content mix analysis']
    },
    bestPostingTimes: {
      icon: '⏰',
      benefits: ['Platform-specific times', 'Audience activity', 'Schedule optimization']
    }
  }

  const info = metricId ? metricInfo[metricId] : metricInfo.aiRecommendations

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-4xl">{info.icon}</span>
            <div>
              <h2 id="upgrade-modal-title" className="text-xl font-bold">Unlock Pro Analytics</h2>
              <p className="text-white/90 text-sm">Advanced insights for serious creators</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="font-semibold text-text-primary mb-3">What you'll get:</h3>
          <ul className="space-y-2 mb-6">
            {info.benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-text-secondary">
                <span className="text-green-500">✓</span>
                {benefit}
              </li>
            ))}
          </ul>

          {/* Trial Button */}
          {metricId && onStartTrial && (
            <button
              onClick={() => {
                onStartTrial(metricId)
                onClose()
              }}
              className="w-full py-3 mb-3 border-2 border-purple-500 text-purple-600 rounded-xl font-medium hover:bg-purple-50 transition-colors"
            >
              👁️ Preview for 5 minutes (Free)
            </button>
          )}

          {/* Upgrade Button */}
          <Link
            href="/settings"
            onClick={() => {
              onUpgrade?.()
              onClose()
            }}
            className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Upgrade to Pro - $29/mo
          </Link>

          <p className="text-center text-xs text-text-secondary mt-3">
            Cancel anytime • 7-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TRIAL COUNTDOWN BANNER
// ============================================================================

interface TrialCountdownBannerProps {
  metricId: LockedMetricId
  label: string
  onExpired?: () => void
}

export function TrialCountdownBanner({ metricId, label, onExpired }: TrialCountdownBannerProps) {
  const { isTrialActive, trialTimeRemaining } = useLockedMetric(metricId)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!isTrialActive) {
      onExpired?.()
      return
    }

    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [isTrialActive, onExpired])

  if (!isTrialActive || !trialTimeRemaining) return null

  const minutes = Math.floor(trialTimeRemaining / 60000)
  const seconds = Math.floor((trialTimeRemaining % 60000) / 1000)

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
        <span className="text-lg">👁️</span>
        <div>
          <p className="font-semibold text-sm">{label} Preview Active</p>
          <p className="text-xs text-white/90">
            {minutes}:{seconds.toString().padStart(2, '0')} remaining
          </p>
        </div>
        <Link
          href="/settings"
          className="ml-2 px-4 py-1.5 bg-white text-green-600 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          Keep Forever →
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// PERSONALIZED UPGRADE PROMPT
// ============================================================================

interface PersonalizedUpgradePromptProps {
  className?: string
}

export function PersonalizedUpgradePrompt({ className = '' }: PersonalizedUpgradePromptProps) {
  const { getInteractionSummary, getPersonalizedPrompt, mostInteractedMetrics, totalInteractions } = useUpgradeIntent()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || dismissed) return null

  const summary = getInteractionSummary()

  // Only show if user has shown interest (at least 3 interactions)
  if (summary.upgradeIntentScore < 15 || totalInteractions < 3) return null

  const prompt = getPersonalizedPrompt()

  return (
    <div className={`relative bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 ${className}`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">⭐</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-text-primary mb-1">{prompt.title}</h3>
          <p className="text-sm text-text-secondary mb-3">{prompt.description}</p>

          {prompt.discount && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mb-3">
              <span>🎁</span>
              {prompt.discount}
              {prompt.expiresIn && <span> - Expires in {prompt.expiresIn}h</span>}
            </div>
          )}

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
          >
            {prompt.cta}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
