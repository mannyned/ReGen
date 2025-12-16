'use client'

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'

interface TooltipProps {
  /** The content to display in the tooltip */
  content: string
  /** Optional title for the tooltip */
  title?: string
  /** The element that triggers the tooltip */
  children?: ReactNode
  /** Position preference (will auto-adjust if near viewport edge) */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Delay before showing tooltip (ms) */
  showDelay?: number
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number
  /** Whether to show an info icon trigger */
  showIcon?: boolean
  /** Custom icon to use instead of default */
  icon?: ReactNode
  /** Additional CSS classes for the tooltip container */
  className?: string
}

interface TooltipPosition {
  top: number
  left: number
  actualPosition: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({
  content,
  title,
  children,
  position = 'top',
  showDelay = 200,
  hideDelay = 100,
  showIcon = true,
  icon,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate optimal position based on viewport
  const calculatePosition = useCallback((): TooltipPosition | null => {
    if (!triggerRef.current || !tooltipRef.current) return null

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 12 // Padding from viewport edges
    const offset = 8 // Gap between trigger and tooltip

    let actualPosition = position
    let top = 0
    let left = 0

    // Calculate initial position based on preference
    const positions = {
      top: {
        top: triggerRect.top - tooltipRect.height - offset,
        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
      },
      bottom: {
        top: triggerRect.bottom + offset,
        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
      },
      left: {
        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
        left: triggerRect.left - tooltipRect.width - offset,
      },
      right: {
        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
        left: triggerRect.right + offset,
      },
    }

    // Try preferred position first, then fallback to others
    const positionOrder: Array<'top' | 'bottom' | 'left' | 'right'> = [position]
    if (position === 'top' || position === 'bottom') {
      positionOrder.push(position === 'top' ? 'bottom' : 'top', 'right', 'left')
    } else {
      positionOrder.push(position === 'left' ? 'right' : 'left', 'top', 'bottom')
    }

    for (const pos of positionOrder) {
      const { top: testTop, left: testLeft } = positions[pos]

      // Check if this position fits within viewport
      const fitsTop = testTop >= padding
      const fitsBottom = testTop + tooltipRect.height <= viewportHeight - padding
      const fitsLeft = testLeft >= padding
      const fitsRight = testLeft + tooltipRect.width <= viewportWidth - padding

      if (fitsTop && fitsBottom && fitsLeft && fitsRight) {
        actualPosition = pos
        top = testTop
        left = testLeft
        break
      }
    }

    // If no position fits perfectly, use the preferred position and clamp to viewport
    if (top === 0 && left === 0) {
      const preferred = positions[position]
      top = Math.max(padding, Math.min(preferred.top, viewportHeight - tooltipRect.height - padding))
      left = Math.max(padding, Math.min(preferred.left, viewportWidth - tooltipRect.width - padding))
      actualPosition = position
    }

    return { top, left, actualPosition }
  }, [position])

  // Show tooltip
  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, showDelay)
  }, [showDelay])

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setTooltipPosition(null)
    }, hideDelay)
  }, [hideDelay])

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      // Use requestAnimationFrame to ensure tooltip is rendered before calculating position
      requestAnimationFrame(() => {
        const pos = calculatePosition()
        setTooltipPosition(pos)
      })
    }
  }, [isVisible, calculatePosition])

  // Handle click outside to close on mobile
  useEffect(() => {
    if (!isVisible || !isMobile) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false)
        setTooltipPosition(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible, isMobile])

  // Handle escape key to close tooltip
  useEffect(() => {
    if (!isVisible) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisible(false)
        setTooltipPosition(null)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Handle mobile tap
  const handleTap = () => {
    if (isMobile) {
      setIsVisible(!isVisible)
    }
  }

  // Get arrow position class based on actual position
  const getArrowClass = () => {
    const pos = tooltipPosition?.actualPosition || position
    switch (pos) {
      case 'top':
        return 'after:top-full after:left-1/2 after:-translate-x-1/2 after:border-t-gray-800 after:border-x-transparent after:border-b-transparent'
      case 'bottom':
        return 'after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-b-gray-800 after:border-x-transparent after:border-t-transparent'
      case 'left':
        return 'after:left-full after:top-1/2 after:-translate-y-1/2 after:border-l-gray-800 after:border-y-transparent after:border-r-transparent'
      case 'right':
        return 'after:right-full after:top-1/2 after:-translate-y-1/2 after:border-r-gray-800 after:border-y-transparent after:border-l-transparent'
      default:
        return ''
    }
  }

  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {children}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 text-text-secondary/60 hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 rounded-full"
        onMouseEnter={!isMobile ? showTooltip : undefined}
        onMouseLeave={!isMobile ? hideTooltip : undefined}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={handleTap}
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-expanded={isVisible}
        aria-label={`More information about ${title || 'this metric'}`}
      >
        {icon || (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
          </svg>
        )}
      </button>

      {/* Tooltip Portal */}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`
            fixed z-[100] max-w-[240px] px-3 py-2
            bg-gray-800 text-white text-sm rounded-lg shadow-lg
            transform transition-opacity duration-150
            ${tooltipPosition ? 'opacity-100' : 'opacity-0'}
            after:content-[''] after:absolute after:border-[6px]
            ${getArrowClass()}
          `}
          style={{
            top: tooltipPosition?.top ?? -9999,
            left: tooltipPosition?.left ?? -9999,
          }}
          onMouseEnter={!isMobile ? showTooltip : undefined}
          onMouseLeave={!isMobile ? hideTooltip : undefined}
        >
          {title && (
            <p className="font-semibold text-white mb-1">{title}</p>
          )}
          <p className="text-gray-200 leading-relaxed">{content}</p>
        </div>
      )}
    </span>
  )
}

// Pre-built metric tooltips for analytics
export const MetricTooltips = {
  sentiment: {
    title: 'Sentiment Score',
    content: 'Shows how positively your audience responds. Higher scores mean happier followers who are more likely to engage and share.',
  },
  retention: {
    title: 'Audience Retention',
    content: 'The average percentage of your videos viewers watch. Improve this by making your first 3 seconds more compelling.',
  },
  virality: {
    title: 'Virality Score',
    content: 'Measures how often your content gets shared beyond your followers. High scores mean your content is reaching new audiences.',
  },
  velocity: {
    title: 'Content Velocity',
    content: 'Your posting frequency. Consistent posting (3-4x per week) typically performs better than sporadic bursts.',
  },
  crossPlatform: {
    title: 'Cross-Platform Synergy',
    content: 'How well your content performs when shared across multiple platforms. Higher scores mean better multi-platform strategy.',
  },
  hashtags: {
    title: 'Hashtag Performance',
    content: 'How effectively your hashtags help people discover your content. Try mixing popular and niche tags for best results.',
  },
  engagement: {
    title: 'Engagement Rate',
    content: 'The percentage of viewers who interact with your content through likes, comments, or shares. Industry average is 3-6%.',
  },
  reach: {
    title: 'Reach',
    content: 'The total number of unique accounts that saw your content. Growing reach means expanding your audience.',
  },
  saveRate: {
    title: 'Save Rate',
    content: 'How often viewers save your posts for later. High save rates signal valuable content that algorithms favor.',
  },
  hookScore: {
    title: 'Hook Score',
    content: 'How well your video opening captures attention. The first 3 seconds are critical for keeping viewers watching.',
  },
  completionRate: {
    title: 'Completion Rate',
    content: 'The percentage of viewers who watch your entire video. Higher completion rates boost your content in algorithms.',
  },
}

export default Tooltip
