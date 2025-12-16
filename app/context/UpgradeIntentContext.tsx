'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

// Types for tracking upgrade intent
export type LockedMetricId =
  | 'sentiment'
  | 'retention'
  | 'virality'
  | 'velocity'
  | 'crossPlatform'
  | 'locationAnalytics'
  | 'retentionGraphs'
  | 'aiRecommendations'
  | 'captionUsage'
  | 'calendarInsights'
  | 'bestPostingTimes'

export interface MetricInteraction {
  metricId: LockedMetricId
  interactionType: 'hover' | 'tap' | 'click' | 'longHover'
  timestamp: number
  duration?: number // For hover duration tracking
  source?: 'card' | 'tooltip' | 'banner' | 'teaser'
}

export interface UpgradePromptConfig {
  title: string
  description: string
  cta: string
  urgency: 'low' | 'medium' | 'high'
  discount?: string
  expiresIn?: number // hours
}

interface TrialUnlock {
  metricId: LockedMetricId
  startTime: number
  duration: number // milliseconds
  isActive: boolean
}

interface UpgradeIntentState {
  // Interaction tracking
  interactions: MetricInteraction[]
  totalInteractions: number
  mostInteractedMetrics: { metricId: LockedMetricId; count: number }[]

  // Trial unlocks
  activeTrials: TrialUnlock[]

  // Personalization
  personalizedPrompt: UpgradePromptConfig | null
  showUpgradeModal: boolean
  upgradeModalMetric: LockedMetricId | null

  // Session data
  sessionStartTime: number
  timeSpentOnLockedMetrics: number
}

interface UpgradeIntentContextValue extends UpgradeIntentState {
  // Tracking methods
  trackInteraction: (interaction: Omit<MetricInteraction, 'timestamp'>) => void
  trackHoverStart: (metricId: LockedMetricId, source?: MetricInteraction['source']) => void
  trackHoverEnd: (metricId: LockedMetricId) => void

  // Trial methods
  startTrial: (metricId: LockedMetricId, durationMs?: number) => void
  isTrialActive: (metricId: LockedMetricId) => boolean
  getTrialTimeRemaining: (metricId: LockedMetricId) => number | null

  // Modal methods
  openUpgradeModal: (metricId?: LockedMetricId) => void
  closeUpgradeModal: () => void

  // Personalization
  getPersonalizedPrompt: (metricId?: LockedMetricId) => UpgradePromptConfig

  // Analytics
  getInteractionSummary: () => {
    topMetrics: { metricId: LockedMetricId; count: number }[]
    totalHoverTime: number
    upgradeIntentScore: number
  }
}

const defaultPrompts: Record<LockedMetricId, UpgradePromptConfig> = {
  sentiment: {
    title: 'Unlock Sentiment Analysis',
    description: 'Understand how your audience feels about your content with AI-powered sentiment scoring.',
    cta: 'Start Analyzing Sentiment',
    urgency: 'medium'
  },
  retention: {
    title: 'See Your Retention Curves',
    description: 'Discover exactly where viewers drop off and optimize your content hooks.',
    cta: 'View Retention Data',
    urgency: 'high'
  },
  virality: {
    title: 'Track Your Virality Score',
    description: 'Measure how shareable your content is and what makes it spread.',
    cta: 'Unlock Virality Insights',
    urgency: 'medium'
  },
  velocity: {
    title: 'Monitor Content Velocity',
    description: 'Track your posting pace and optimize for maximum reach.',
    cta: 'See Velocity Metrics',
    urgency: 'low'
  },
  crossPlatform: {
    title: 'Cross-Platform Analytics',
    description: 'See how your content performs across all platforms in one view.',
    cta: 'Unlock Cross-Platform View',
    urgency: 'high'
  },
  locationAnalytics: {
    title: 'Geographic Insights',
    description: 'See where your audience engages from by country, region, and city.',
    cta: 'Explore Location Data',
    urgency: 'medium'
  },
  retentionGraphs: {
    title: 'Retention Graph Analytics',
    description: 'Visual retention curves, hook scoring, and drop-off detection.',
    cta: 'View Retention Graphs',
    urgency: 'high'
  },
  aiRecommendations: {
    title: 'AI-Powered Recommendations',
    description: 'Get personalized insights to boost your content performance.',
    cta: 'Get AI Recommendations',
    urgency: 'high'
  },
  captionUsage: {
    title: 'Caption Usage Analytics',
    description: 'Compare how identical vs adapted captions perform across platforms.',
    cta: 'Analyze Caption Performance',
    urgency: 'medium'
  },
  calendarInsights: {
    title: 'Calendar Insights',
    description: 'Discover peak days, optimal frequency, and ideal content mix.',
    cta: 'See Calendar Insights',
    urgency: 'low'
  },
  bestPostingTimes: {
    title: 'Best Posting Times',
    description: 'Know exactly when to post for maximum engagement on each platform.',
    cta: 'Reveal Best Times',
    urgency: 'high'
  }
}

const highIntentPrompt: UpgradePromptConfig = {
  title: 'You\'re Ready for Pro!',
  description: 'Based on your interest in advanced metrics, Pro would be perfect for your needs.',
  cta: 'Upgrade to Pro Now',
  urgency: 'high',
  discount: '20% off first month',
  expiresIn: 24
}

const UpgradeIntentContext = createContext<UpgradeIntentContextValue | null>(null)

const STORAGE_KEY = 'regen_upgrade_intent'
const TRIAL_DURATION_DEFAULT = 5 * 60 * 1000 // 5 minutes default trial

export function UpgradeIntentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UpgradeIntentState>({
    interactions: [],
    totalInteractions: 0,
    mostInteractedMetrics: [],
    activeTrials: [],
    personalizedPrompt: null,
    showUpgradeModal: false,
    upgradeModalMetric: null,
    sessionStartTime: Date.now(),
    timeSpentOnLockedMetrics: 0
  })

  const hoverStartTimes = useRef<Map<LockedMetricId, number>>(new Map())
  const hoverSources = useRef<Map<LockedMetricId, MetricInteraction['source']>>(new Map())

  // Load saved interactions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Only keep interactions from the last 7 days
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const recentInteractions = parsed.interactions?.filter(
          (i: MetricInteraction) => i.timestamp > sevenDaysAgo
        ) || []

        setState(prev => ({
          ...prev,
          interactions: recentInteractions,
          totalInteractions: recentInteractions.length
        }))
      }
    } catch (e) {
      console.warn('Failed to load upgrade intent data:', e)
    }
  }, [])

  // Save interactions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        interactions: state.interactions,
        lastUpdated: Date.now()
      }))
    } catch (e) {
      console.warn('Failed to save upgrade intent data:', e)
    }
  }, [state.interactions])

  // Update most interacted metrics
  useEffect(() => {
    const counts = new Map<LockedMetricId, number>()
    state.interactions.forEach(interaction => {
      const current = counts.get(interaction.metricId) || 0
      counts.set(interaction.metricId, current + 1)
    })

    const sorted = Array.from(counts.entries())
      .map(([metricId, count]) => ({ metricId, count }))
      .sort((a, b) => b.count - a.count)

    setState(prev => ({
      ...prev,
      mostInteractedMetrics: sorted
    }))
  }, [state.interactions])

  // Check and update active trials
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        activeTrials: prev.activeTrials.map(trial => ({
          ...trial,
          isActive: Date.now() < trial.startTime + trial.duration
        })).filter(trial => trial.isActive)
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const trackInteraction = useCallback((interaction: Omit<MetricInteraction, 'timestamp'>) => {
    const fullInteraction: MetricInteraction = {
      ...interaction,
      timestamp: Date.now()
    }

    setState(prev => ({
      ...prev,
      interactions: [...prev.interactions, fullInteraction],
      totalInteractions: prev.totalInteractions + 1
    }))
  }, [])

  const trackHoverStart = useCallback((metricId: LockedMetricId, source?: MetricInteraction['source']) => {
    hoverStartTimes.current.set(metricId, Date.now())
    if (source) {
      hoverSources.current.set(metricId, source)
    }
  }, [])

  const trackHoverEnd = useCallback((metricId: LockedMetricId) => {
    const startTime = hoverStartTimes.current.get(metricId)
    if (startTime) {
      const duration = Date.now() - startTime
      const source = hoverSources.current.get(metricId)

      // Only track if hover was longer than 500ms (intentional)
      if (duration > 500) {
        trackInteraction({
          metricId,
          interactionType: duration > 2000 ? 'longHover' : 'hover',
          duration,
          source
        })
      }

      hoverStartTimes.current.delete(metricId)
      hoverSources.current.delete(metricId)
    }
  }, [trackInteraction])

  const startTrial = useCallback((metricId: LockedMetricId, durationMs = TRIAL_DURATION_DEFAULT) => {
    setState(prev => ({
      ...prev,
      activeTrials: [
        ...prev.activeTrials.filter(t => t.metricId !== metricId),
        {
          metricId,
          startTime: Date.now(),
          duration: durationMs,
          isActive: true
        }
      ]
    }))

    trackInteraction({
      metricId,
      interactionType: 'click',
      source: 'teaser'
    })
  }, [trackInteraction])

  const isTrialActive = useCallback((metricId: LockedMetricId) => {
    return state.activeTrials.some(t => t.metricId === metricId && t.isActive)
  }, [state.activeTrials])

  const getTrialTimeRemaining = useCallback((metricId: LockedMetricId) => {
    const trial = state.activeTrials.find(t => t.metricId === metricId && t.isActive)
    if (!trial) return null
    return Math.max(0, trial.startTime + trial.duration - Date.now())
  }, [state.activeTrials])

  const openUpgradeModal = useCallback((metricId?: LockedMetricId) => {
    if (metricId) {
      trackInteraction({
        metricId,
        interactionType: 'click',
        source: 'card'
      })
    }

    setState(prev => ({
      ...prev,
      showUpgradeModal: true,
      upgradeModalMetric: metricId || null
    }))
  }, [trackInteraction])

  const closeUpgradeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showUpgradeModal: false,
      upgradeModalMetric: null
    }))
  }, [])

  const getPersonalizedPrompt = useCallback((metricId?: LockedMetricId): UpgradePromptConfig => {
    // High intent users (5+ interactions) get special prompt
    if (state.totalInteractions >= 5) {
      return highIntentPrompt
    }

    // If specific metric requested, use that
    if (metricId) {
      return defaultPrompts[metricId]
    }

    // Otherwise, use the most interacted metric
    if (state.mostInteractedMetrics.length > 0) {
      return defaultPrompts[state.mostInteractedMetrics[0].metricId]
    }

    // Default to AI recommendations
    return defaultPrompts.aiRecommendations
  }, [state.totalInteractions, state.mostInteractedMetrics])

  const getInteractionSummary = useCallback(() => {
    const totalHoverTime = state.interactions
      .filter(i => i.duration)
      .reduce((sum, i) => sum + (i.duration || 0), 0)

    // Calculate upgrade intent score (0-100)
    let score = 0
    score += Math.min(state.totalInteractions * 5, 30) // Up to 30 points for interactions
    score += Math.min(totalHoverTime / 10000, 30) // Up to 30 points for hover time
    score += state.interactions.filter(i => i.interactionType === 'click').length * 10 // 10 points per click
    score += state.interactions.filter(i => i.interactionType === 'longHover').length * 5 // 5 points per long hover
    score = Math.min(score, 100)

    return {
      topMetrics: state.mostInteractedMetrics.slice(0, 3),
      totalHoverTime,
      upgradeIntentScore: Math.round(score)
    }
  }, [state.interactions, state.totalInteractions, state.mostInteractedMetrics])

  const value: UpgradeIntentContextValue = {
    ...state,
    trackInteraction,
    trackHoverStart,
    trackHoverEnd,
    startTrial,
    isTrialActive,
    getTrialTimeRemaining,
    openUpgradeModal,
    closeUpgradeModal,
    getPersonalizedPrompt,
    getInteractionSummary
  }

  return (
    <UpgradeIntentContext.Provider value={value}>
      {children}
    </UpgradeIntentContext.Provider>
  )
}

export function useUpgradeIntent() {
  const context = useContext(UpgradeIntentContext)
  if (!context) {
    throw new Error('useUpgradeIntent must be used within UpgradeIntentProvider')
  }
  return context
}

// Hook for tracking individual locked metrics
export function useLockedMetric(metricId: LockedMetricId) {
  const {
    trackHoverStart,
    trackHoverEnd,
    trackInteraction,
    isTrialActive,
    getTrialTimeRemaining,
    startTrial,
    openUpgradeModal,
    getPersonalizedPrompt
  } = useUpgradeIntent()

  const onMouseEnter = useCallback(() => {
    trackHoverStart(metricId, 'card')
  }, [metricId, trackHoverStart])

  const onMouseLeave = useCallback(() => {
    trackHoverEnd(metricId)
  }, [metricId, trackHoverEnd])

  const onTap = useCallback(() => {
    trackInteraction({
      metricId,
      interactionType: 'tap',
      source: 'card'
    })
  }, [metricId, trackInteraction])

  const onClick = useCallback(() => {
    openUpgradeModal(metricId)
  }, [metricId, openUpgradeModal])

  const onStartTrial = useCallback((durationMs?: number) => {
    startTrial(metricId, durationMs)
  }, [metricId, startTrial])

  return {
    onMouseEnter,
    onMouseLeave,
    onTap,
    onClick,
    onStartTrial,
    isTrialActive: isTrialActive(metricId),
    trialTimeRemaining: getTrialTimeRemaining(metricId),
    personalizedPrompt: getPersonalizedPrompt(metricId)
  }
}
