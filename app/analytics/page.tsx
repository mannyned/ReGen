'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AppHeader,
  Card,
  StatCard,
  GradientBanner,
  Badge,
  PlatformLogo,
  MetricInfo,
  LockedMetricCard,
  LockedFeatureBanner,
  UpgradeModal,
  TrialCountdownBanner,
  PersonalizedUpgradePrompt,
  BlurredChart,
  LockIcon
} from '../components/ui'
import { ExportAnalytics } from '../components/ExportAnalytics'
import { useUpgradeIntent, LockedMetricId } from '../context/UpgradeIntentContext'
import type { SocialPlatform } from '@/lib/types/social'

type TimeRange = '7' | '30' | '90' | '365'
type PlanType = 'free' | 'creator' | 'pro'
type PlatformFilter = 'all' | SocialPlatform

// Analytics permission types
interface AnalyticsPermissions {
  canViewContentAnalytics: boolean;
  canViewAccountAnalytics: boolean;
  canManageAnalyticsSettings: boolean;
  teamContext: {
    teamId: string;
    teamName: string;
    userRole: 'owner' | 'admin' | 'member';
    allowMemberAccountAnalytics: boolean;
  } | null;
  reason?: string;
}

// Map display names to platform IDs
const PLATFORM_ID_MAP: Record<string, SocialPlatform> = {
  'Instagram': 'instagram',
  'Twitter': 'twitter',
  'LinkedIn': 'linkedin',
  'Facebook': 'facebook',
  'TikTok': 'tiktok',
  'YouTube': 'youtube',
  'Snapchat': 'snapchat',
}

interface AIRecommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  icon: string
}

// Real analytics stats interface
interface AnalyticsStats {
  totalPosts: number
  postsThisWeek: number
  postsInRange: number
  deletedPosts: number
  queuedPosts: number
  failedPosts: number
  aiGenerated: number
  platformStats: Record<string, number>
  timeRange: number
  engagement: {
    totalLikes: number
    totalComments: number
    totalShares: number
    totalSaves: number
    totalViews: number
    totalReach: number
    totalImpressions: number
    avgEngagementRate: string | null
    postsWithMetrics: number
  }
  platformEngagement: Record<string, {
    posts: number
    likes: number
    comments: number
    shares: number
    reach: number
    impressions: number
    saves: number
    views: number
  }>
  advancedMetrics: {
    contentVelocity: number
    viralityScore: number
    crossPlatformSynergy: number
    hashtagPerformance: number
    sentimentScore: number
    audienceRetention: number
    postsPerWeek: number
    avgReachPerPost: number
  }
  benchmarks: {
    sentiment: { industry: number; userAvg: number; trend: 'up' | 'down' | 'stable'; trendValue: number }
    retention: { industry: number; userAvg: number; trend: 'up' | 'down' | 'stable'; trendValue: number }
    virality: { industry: number; userAvg: number; trend: 'up' | 'down' | 'stable'; trendValue: number }
    velocity: { industry: number; userAvg: number; trend: 'up' | 'down' | 'stable'; trendValue: number }
    crossPlatform: { industry: number; userAvg: number; trend: 'up' | 'down' | 'stable'; trendValue: number }
    hashtags: { industry: number; userAvg: number; trend: 'up' | 'down' | 'stable'; trendValue: number }
  }
  // New analytics features
  topFormats: Array<{
    format: string
    count: number
    percentage: number
    engagementRate: number
    totalEngagement: number
  }>
  aiImpact: {
    aiCaptions: {
      count: number
      totalEngagement: number
      avgEngagement: number
      engagementRate: number
    }
    manualCaptions: {
      count: number
      totalEngagement: number
      avgEngagement: number
      engagementRate: number
    }
    improvement: number | null
  }
  captionUsage: Array<{
    mode: string
    count: number
    percentage: number
    avgEngagement: number
    engagementRate: number
  }>
  calendarInsights: {
    bestDays: Array<{
      day: string
      dayIndex: number
      posts: number
      avgEngagement: number
      engagementRate: number
    }>
    bestHours: Array<{
      hour: string
      hourIndex: number
      posts: number
      avgEngagement: number
      engagementRate: number
    }>
    allDays: Array<{
      day: string
      dayIndex: number
      posts: number
      avgEngagement: number
      engagementRate: number
    }>
    allHours: Array<{
      hour: string
      hourIndex: number
      posts: number
      avgEngagement: number
      engagementRate: number
    }>
    totalPostsAnalyzed: number
  }
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30')
  const [userPlan, setUserPlan] = useState<PlanType>('free')
  const [mounted, setMounted] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('all')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeModalMetric, setUpgradeModalMetric] = useState<LockedMetricId | null>(null)
  const [activeTrialMetric, setActiveTrialMetric] = useState<LockedMetricId | null>(null)
  const [analyticsPermissions, setAnalyticsPermissions] = useState<AnalyticsPermissions | null>(null)
  const [isTeamMember, setIsTeamMember] = useState(false)
  const [realStats, setRealStats] = useState<AnalyticsStats | null>(null)
  const [platformData, setPlatformData] = useState<Array<{
    platform: string
    posts: number
    engagement: number
    reach: number
    growth: number
    bestTime: string
    totalEngagement?: number
    likes?: number
    comments?: number
  }> | null>(null)
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string
    action: string
    time: string
    icon: string
    platform: string
    status: string
  }> | null>(null)
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)

  // Upgrade intent tracking
  const upgradeIntent = useUpgradeIntent()

  const isProduction = process.env.NODE_ENV === 'production'

  const [isSyncing, setIsSyncing] = useState(false)

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Recently'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  // Get icon based on platform and media type
  const getActivityIcon = (platform: string, mediaType?: string): string => {
    const platformIcons: Record<string, string> = {
      instagram: '📷',
      meta: '📷',
      tiktok: '🎵',
      youtube: '🎬',
      twitter: '🐦',
      linkedin: '💼',
      facebook: '📘',
      snapchat: '👻',
    }
    if (mediaType === 'VIDEO' || mediaType === 'REELS') return '🎬'
    return platformIcons[platform.toLowerCase()] || '📝'
  }

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/posts/recent?limit=10&filter=all')
      if (response.ok) {
        const data = await response.json()
        const activities = data.posts.map((post: {
          id: string
          platform: string
          postedAt?: string
          status: string
          mediaType?: string
        }) => ({
          id: post.id,
          action: post.status === 'DELETED'
            ? `Post deleted from ${post.platform}`
            : `Post published on ${post.platform}`,
          time: formatRelativeTime(post.postedAt),
          icon: getActivityIcon(post.platform, post.mediaType),
          platform: post.platform,
          status: post.status,
        }))
        setRecentActivity(activities)
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
      setRecentActivity([])
    }
  }

  // Fetch AI-powered recommendations
  const fetchRecommendations = async (platform: PlatformFilter = 'all') => {
    try {
      setIsLoadingRecommendations(true)
      const url = platform && platform !== 'all'
        ? `/api/analytics/recommendations?platform=${platform}`
        : '/api/analytics/recommendations'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.recommendations && data.recommendations.length > 0) {
          setAiRecommendations(data.recommendations)
        } else {
          setAiRecommendations([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  // Sync analytics from connected platforms (Meta, YouTube)
  const syncAnalytics = async () => {
    try {
      setIsSyncing(true)
      const response = await fetch('/api/analytics/sync', { method: 'POST' })
      const result = await response.json()
      if (response.ok) {
        console.log('[Analytics] Sync completed:', result)
      } else {
        console.warn('[Analytics] Sync failed:', result)
        // Don't block on sync errors - still load stats
      }
    } catch (error) {
      console.error('Failed to sync analytics:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Fetch real analytics stats
  const fetchAnalyticsStats = async (days: string, platform: string = 'all') => {
    try {
      const platformParam = platform !== 'all' ? `&platform=${platform}` : ''
      const response = await fetch(`/api/analytics/stats?days=${days}${platformParam}`, {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        setRealStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics stats:', error)
    }
  }

  useEffect(() => {
    setMounted(true)

    // Sync analytics first, then fetch stats, recommendations, and recent activity
    const loadAnalytics = async () => {
      await syncAnalytics()
      await fetchAnalyticsStats(timeRange, selectedPlatform)
      await fetchRecommendations(selectedPlatform)
      await fetchRecentActivity()
    }
    loadAnalytics()

    // In production, fetch actual user tier from API
    if (isProduction) {
      fetch('/api/auth/me')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          // Use effectiveTier which includes team member PRO access
          const effectiveTier = data?.tierInfo?.effectiveTier || data?.tier
          if (effectiveTier) {
            const tier = effectiveTier.toLowerCase() as PlanType
            setUserPlan(tier === 'pro' ? 'pro' : tier === 'creator' ? 'creator' : 'free')
          }
          // Check if user is a team member (not owner)
          if (data?.tierInfo?.isTeamMember) {
            setIsTeamMember(true)
          }
        })
        .catch(() => setUserPlan('free'))

      // Fetch analytics permissions for team members
      fetch('/api/analytics/permissions')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && !data.error) {
            setAnalyticsPermissions(data)
          }
        })
        .catch(() => {})
    } else {
      // In development, use localStorage for testing
      const savedPlan = localStorage.getItem('userPlan')
      if (savedPlan === 'pro') {
        setUserPlan('pro')
      } else if (savedPlan === 'creator') {
        setUserPlan('creator')
      } else {
        setUserPlan('free')
      }
    }
  }, [isProduction, timeRange])

  // Refetch stats and recommendations when platform selection changes
  useEffect(() => {
    if (mounted) {
      fetchAnalyticsStats(timeRange, selectedPlatform)
      if (userPlan === 'pro') {
        fetchRecommendations(selectedPlatform)
      }
    }
  }, [selectedPlatform, mounted, userPlan, timeRange])

  // Handle opening the upgrade modal
  const handleOpenUpgradeModal = (metricId: LockedMetricId) => {
    setUpgradeModalMetric(metricId)
    setShowUpgradeModal(true)
    upgradeIntent.trackInteraction({
      metricId,
      interactionType: 'click',
      source: 'card'
    })
  }

  // Handle starting a trial
  const handleStartTrial = (metricId: LockedMetricId) => {
    upgradeIntent.startTrial(metricId, 5 * 60 * 1000) // 5 minutes
    setActiveTrialMetric(metricId)
    setShowUpgradeModal(false)
  }

  // Build platform data from real API response when available
  // Use platformStats for post counts, enrich with platformEngagement for metrics
  useEffect(() => {
    const platformNameMap: Record<string, string> = {
      instagram: 'Instagram',
      meta: 'Instagram', // Meta provider maps to Instagram
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
      facebook: 'Facebook',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      google: 'YouTube', // Google provider maps to YouTube
      snapchat: 'Snapchat',
    }

    // First check if we have platformStats (post counts by platform)
    if (realStats?.platformStats && Object.keys(realStats.platformStats).length > 0) {
      const data = Object.entries(realStats.platformStats).map(([provider, postCount]) => {
        // Normalize provider name
        const normalizedProvider = provider === 'meta' ? 'instagram' : provider === 'google' ? 'youtube' : provider

        // Get engagement data if available
        const engagementData = realStats.platformEngagement?.[normalizedProvider] ||
                               realStats.platformEngagement?.[provider]

        const totalEngagement = engagementData
          ? engagementData.likes + engagementData.comments + engagementData.shares + engagementData.saves
          : 0
        const engagementRate = engagementData && engagementData.reach > 0
          ? ((totalEngagement / engagementData.reach) * 100)
          : 0

        return {
          platform: platformNameMap[provider] || provider,
          posts: postCount as number,
          engagement: parseFloat(engagementRate.toFixed(1)),
          reach: engagementData?.reach || 0,
          growth: 0, // Would need historical data to calculate
          bestTime: '—', // Would need time-based analysis
          // Include total engagement count for display when reach is unavailable
          totalEngagement,
          likes: engagementData?.likes || 0,
          comments: engagementData?.comments || 0,
        }
      })
      setPlatformData(data)
      return
    }

    // Fallback to platformEngagement if platformStats is empty
    if (realStats?.platformEngagement && Object.keys(realStats.platformEngagement).length > 0) {
      const data = Object.entries(realStats.platformEngagement).map(([platform, engData]) => {
        const totalEngagement = engData.likes + engData.comments + engData.shares + engData.saves
        const engagementRate = engData.reach > 0 ? ((totalEngagement / engData.reach) * 100) : 0
        return {
          platform: platformNameMap[platform] || platform,
          posts: engData.posts,
          engagement: parseFloat(engagementRate.toFixed(1)),
          reach: engData.reach,
          growth: 0,
          bestTime: '—',
          // Include total engagement count for display when reach is unavailable
          totalEngagement,
          likes: engData.likes,
          comments: engData.comments,
        }
      })
      setPlatformData(data)
      return
    }

    // If realStats exists but no platform data, set empty array
    if (realStats) {
      setPlatformData([])
    }
  }, [realStats])

  // Use real topFormats data from API when available
  const topFormats = (() => {
    if (realStats?.topFormats && realStats.topFormats.length > 0) {
      return realStats.topFormats.map(f => ({
        type: f.format,
        count: f.count,
        percentage: f.percentage, // Percentage of total posts
        engagementRate: f.engagementRate, // Engagement rate (when reach data available)
        trend: 'stable' as const // Would need historical data for trends
      }))
    }
    return isProduction ? [] : [
      { type: 'Video', count: 42, percentage: 39, engagementRate: 14.2, trend: 'up' as const },
      { type: 'Image', count: 38, percentage: 35, engagementRate: 11.5, trend: 'stable' as const },
      { type: 'Text', count: 27, percentage: 26, engagementRate: 8.9, trend: 'down' as const }
    ]
  })()

  // Use real advanced metrics from API when available
  const advancedMetrics = (() => {
    if (realStats?.advancedMetrics) {
      return {
        sentimentScore: realStats.advancedMetrics.sentimentScore || 0,
        audienceRetention: realStats.advancedMetrics.audienceRetention || 0,
        viralityScore: realStats.advancedMetrics.viralityScore || 0,
        contentVelocity: realStats.advancedMetrics.contentVelocity || 0,
        crossPlatformSynergy: realStats.advancedMetrics.crossPlatformSynergy || 0,
        hashtagPerformance: realStats.advancedMetrics.hashtagPerformance || 0
      }
    }
    return isProduction ? {
      sentimentScore: 0,
      audienceRetention: 0,
      viralityScore: 0,
      contentVelocity: 0,
      crossPlatformSynergy: 0,
      hashtagPerformance: 0
    } : {
      sentimentScore: 78,
      audienceRetention: 65,
      viralityScore: 42,
      contentVelocity: 3.2,
      crossPlatformSynergy: 85,
      hashtagPerformance: 72
    }
  })()

  // Stats using real data from API
  // Calculate total engagement for fallback display
  const globalTotalEngagement = realStats?.engagement
    ? (realStats.engagement.totalLikes || 0) + (realStats.engagement.totalComments || 0) +
      (realStats.engagement.totalShares || 0) + (realStats.engagement.totalSaves || 0)
    : 0

  // Only show engagement rate if it's realistic (under 50%)
  // Rates above 50% indicate insufficient reach data - show raw count instead
  const globalEngagementRate = realStats?.engagement?.avgEngagementRate
    ? parseFloat(realStats.engagement.avgEngagementRate)
    : null

  let globalEngagementDisplay = '—'
  let globalEngagementIsRate = false
  if (globalEngagementRate !== null && globalEngagementRate <= 50) {
    globalEngagementDisplay = globalEngagementRate.toFixed(1) + '%'
    globalEngagementIsRate = true
  } else if (globalTotalEngagement > 0) {
    globalEngagementDisplay = globalTotalEngagement.toLocaleString()
  }

  const stats = {
    totalPosts: realStats?.totalPosts?.toString() || '0',
    totalReach: realStats?.engagement?.totalReach ? realStats.engagement.totalReach.toLocaleString() : '—',
    avgEngagement: globalEngagementDisplay,
    engagementIsRate: globalEngagementIsRate,
    aiGenerated: realStats?.aiGenerated?.toString() || '0'
  }

  // Filtered stats based on selected platform
  const filteredStats = (() => {
    if (selectedPlatform === 'all' || !realStats) {
      return stats
    }

    // Map display names to platform keys for filtering
    // Note: 'meta' is used for Instagram, 'facebook' is used for Facebook
    // Include both in case of legacy data stored with different provider names
    const platformKeyMap: Record<string, string[]> = {
      instagram: ['instagram', 'meta'],
      youtube: ['youtube', 'google'],
      tiktok: ['tiktok'],
      twitter: ['twitter'],
      linkedin: ['linkedin'],
      facebook: ['facebook', 'meta'], // Include 'meta' as fallback for legacy data
      snapchat: ['snapchat'],
    }

    const platformKeys = platformKeyMap[selectedPlatform] || [selectedPlatform]

    // Calculate filtered post count from platformStats
    const filteredPostCount = platformKeys.reduce((total, key) => {
      return total + (realStats.platformStats?.[key] || 0)
    }, 0)

    // Calculate filtered engagement from platformEngagement
    const filteredEngagement = platformKeys.reduce((acc, key) => {
      const engData = realStats.platformEngagement?.[key]
      if (engData) {
        return {
          reach: acc.reach + engData.reach,
          likes: acc.likes + engData.likes,
          comments: acc.comments + engData.comments,
          shares: acc.shares + engData.shares,
          saves: acc.saves + engData.saves,
        }
      }
      return acc
    }, { reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 })

    const totalEngagement = filteredEngagement.likes + filteredEngagement.comments + filteredEngagement.shares + filteredEngagement.saves
    const engagementRateRaw = filteredEngagement.reach > 0
      ? (totalEngagement / filteredEngagement.reach) * 100
      : null

    // Show reach if available, otherwise show —
    const reachDisplay = filteredEngagement.reach > 0
      ? filteredEngagement.reach.toLocaleString()
      : '—'

    // Show engagement rate only if it's realistic (under 50%)
    // Rates above 50% indicate insufficient reach data - show raw count instead
    let engagementDisplay = '—'
    let engagementIsRate = false
    if (engagementRateRaw !== null && engagementRateRaw <= 50) {
      engagementDisplay = engagementRateRaw.toFixed(1) + '%'
      engagementIsRate = true
    } else if (totalEngagement > 0) {
      // Show raw engagement count when rate is unrealistic or reach is missing
      engagementDisplay = totalEngagement.toLocaleString()
    }

    return {
      totalPosts: filteredPostCount.toString(),
      totalReach: reachDisplay,
      avgEngagement: engagementDisplay,
      engagementIsRate,
      aiGenerated: realStats?.aiGenerated?.toString() || '0'
    }
  })()

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="analytics" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* FREE USER - Full Page Upgrade Gate */}
        {userPlan === 'free' ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in">
            {/* Lock Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent-purple/20 rounded-full flex items-center justify-center mb-8 animate-float">
              <span className="text-5xl">🔒</span>
            </div>

            <h1 className="text-4xl font-bold text-text-primary mb-4 text-center">Unlock Analytics</h1>
            <p className="text-text-secondary text-lg mb-12 text-center max-w-xl">
              Get detailed insights into your content performance, audience engagement, and AI-powered recommendations.
            </p>

            {/* Plan Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mb-12">
              {/* Creator Plan */}
              <Card className="p-8 border-2 border-gray-200 hover:border-primary transition-colors" hover={false}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🌟</span>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">Creator Plan</h3>
                    <p className="text-primary font-semibold">$9/month</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {['Save Rate Analytics', 'Platform Performance', 'Top Formats Analysis', 'AI Impact Insights', 'Unlimited Uploads'].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-text-secondary">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/settings" className="block w-full py-3 btn-primary text-center">
                  Upgrade to Creator
                </Link>
              </Card>

              {/* Pro Plan */}
              <Card className="p-8 border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 relative" hover={false}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                  BEST VALUE
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">Pro Plan</h3>
                    <p className="text-purple-600 font-semibold">$29/month</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3 text-text-secondary">
                    <span className="text-green-500 text-lg">✓</span>
                    <span>Everything in Creator, plus:</span>
                  </li>
                  {['Location Analytics', 'Retention Graphs & Hook Scoring', 'AI-Powered Recommendations', 'Advanced Metrics & Calendar'].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-text-secondary">
                      <span className="text-purple-500 text-lg">⭐</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/settings" className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  Upgrade to Pro
                </Link>
              </Card>
            </div>

            {/* Preview Tags */}
            <div className="text-center">
              <p className="text-text-secondary text-sm mb-4">See what you're missing:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { icon: '📊', text: 'Performance Tracking' },
                  { icon: '📌', text: 'Save Rate Analysis' },
                  { icon: '🌍', text: 'Location Insights' },
                  { icon: '🤖', text: 'AI Recommendations' }
                ].map(({ icon, text }) => (
                  <Badge key={text} variant="gray" className="px-4 py-2">
                    {icon} {text}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Plan Switcher for Testing - Development Only */}
            {!isProduction && (
              <div className="mt-16 p-6 bg-gray-100 rounded-xl w-full max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Test Different Plans (Development Only)</p>
                    <p className="text-xs text-text-secondary/70">This switcher is for testing purposes only</p>
                  </div>
                  <div className="flex gap-2">
                    {(['free', 'creator', 'pro'] as PlanType[]).map((plan) => {
                      const isActive = userPlan === plan
                      const activeClass = plan === 'pro'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : plan === 'creator'
                        ? 'bg-primary text-white'
                        : 'bg-blue-500 text-white'
                      return (
                        <button
                          key={plan}
                          onClick={() => {
                            setUserPlan(plan)
                            localStorage.setItem('userPlan', plan)
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                            isActive ? activeClass : 'bg-white text-text-secondary hover:bg-gray-50'
                          }`}
                        >
                          {plan}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 animate-fade-in">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">Analytics Dashboard</h1>
                  <Badge variant={userPlan === 'pro' ? 'primary' : 'gray'} className={userPlan === 'pro' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}>
                    {userPlan === 'pro' ? '⭐ PRO' : '🌟 CREATOR'}
                  </Badge>
                </div>
                <p className="text-text-secondary text-lg">
                  {userPlan === 'pro'
                    ? 'Advanced analytics with AI-powered recommendations'
                    : 'Track your content performance across platforms'}
                </p>
              </div>

              {/* Time Range Selector, Platform Filter, and Export Button */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Platform Context Filter */}
                <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-3 py-1.5">
                  <span className="text-xs text-text-secondary font-medium">Platform:</span>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as PlatformFilter)}
                    className="text-sm px-2 py-1.5 border-0 bg-transparent text-text-primary font-medium focus:outline-none focus:ring-0 cursor-pointer"
                  >
                    <option value="all">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="facebook">Facebook</option>
                    <option value="snapchat">Snapchat</option>
                  </select>
                </div>

                {/* Time Range Selector */}
                <div className="flex gap-2 bg-white rounded-xl shadow-sm p-1.5">
                  {[
                    { value: '7' as TimeRange, label: '7 Days' },
                    { value: '30' as TimeRange, label: '30 Days' },
                    { value: '90' as TimeRange, label: '90 Days' },
                    { value: '365' as TimeRange, label: '1 Year' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTimeRange(value)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        timeRange === value
                          ? 'bg-primary text-white shadow-md'
                          : 'text-text-secondary hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Sync Analytics Button */}
                <button
                  onClick={async () => {
                    await syncAnalytics()
                    await fetchAnalyticsStats(timeRange, selectedPlatform)
                  }}
                  disabled={isSyncing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-sm ${
                    isSyncing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-text-secondary hover:bg-gray-50 hover:text-primary'
                  }`}
                  title="Sync engagement data from connected platforms"
                >
                  {isSyncing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync
                    </>
                  )}
                </button>

                {/* Export Analytics Button - PRO Only */}
                <ExportAnalytics
                  userId="demo-user-id"
                  userPlan={userPlan}
                  onExportComplete={(jobId, format) => {
                    console.log(`Export completed: ${jobId} (${format})`)
                  }}
                />
              </div>
            </div>

            {/* AI Recommendations - Pro Plan Only */}
            {userPlan === 'pro' && (
              <GradientBanner className="mb-8 animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span>🤖</span>
                      AI-Powered Recommendations
                      {selectedPlatform !== 'all' && (
                        <span className="text-base font-normal bg-white/20 px-2 py-0.5 rounded-full ml-2">
                          for {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                        </span>
                      )}
                    </h2>
                    <p className="text-white/90 mt-1">
                      {selectedPlatform !== 'all'
                        ? `Platform-specific insights for ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}`
                        : 'Personalized insights to boost your performance'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {aiRecommendations.length} insight{aiRecommendations.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {isLoadingRecommendations ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
                    <p className="text-white/80">
                      {selectedPlatform !== 'all'
                        ? `Analyzing your ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} performance...`
                        : 'Analyzing your performance data...'}
                    </p>
                  </div>
                ) : aiRecommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-3 block">📊</span>
                    <p className="text-white/90 font-medium">
                      {selectedPlatform !== 'all'
                        ? `No ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} recommendations yet`
                        : 'No recommendations yet'}
                    </p>
                    <p className="text-white/70 text-sm mt-1">
                      {selectedPlatform !== 'all'
                        ? `Post more content on ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} to receive platform-specific insights`
                        : 'Post more content to receive personalized AI insights'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiRecommendations.map((rec) => (
                      <div key={rec.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{rec.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{rec.title}</h3>
                            <p className="text-sm text-white/80 mb-2">{rec.description}</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              rec.impact === 'high'
                                ? 'bg-red-500/30 text-white'
                                : rec.impact === 'medium'
                                ? 'bg-yellow-500/30 text-white'
                                : 'bg-green-500/30 text-white'
                            }`}>
                              {rec.impact.toUpperCase()} IMPACT
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GradientBanner>
            )}

            {/* CREATOR PLAN: Polished Advanced Analytics Section */}
            {userPlan === 'creator' && (
              <>
                {/* Section Header - Clear separation */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-text-primary">Advanced Analytics</h2>
                      <Badge variant="gradient" className="flex items-center gap-1">
                        <LockIcon size="sm" className="text-white" />
                        Pro Feature
                      </Badge>
                    </div>
                    <Link
                      href="/settings"
                      className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                    >
                      <span>⭐</span>
                      Upgrade to Pro
                    </Link>
                  </div>
                  <p className="text-text-secondary">
                    Unlock deep insights with sentiment analysis, retention tracking, and AI-powered recommendations.
                  </p>
                </div>

                {/* Personalized Upgrade Prompt - Shows based on interaction */}
                <PersonalizedUpgradePrompt className="mb-6" />

                {/* Locked Feature Banners */}
                <div className="space-y-4 mb-8">
                  <LockedFeatureBanner
                    metricId="locationAnalytics"
                    icon="🌍"
                    title="Location of Engagement"
                    description="See where your audience engages the most — by country, region, and city"
                    previewStats={[
                      { label: 'Countries', value: '47' },
                      { label: 'Cities', value: '234' }
                    ]}
                    gradientFrom="from-blue-500"
                    gradientTo="to-purple-600"
                  />

                  <LockedFeatureBanner
                    metricId="retentionGraphs"
                    icon="📊"
                    title="Retention Graph Analytics"
                    description="See exactly where viewers drop off and optimize your video hooks"
                    previewStats={[
                      { label: 'Hook Score', value: '82%' },
                      { label: 'Completion', value: '28%' }
                    ]}
                    gradientFrom="from-orange-500"
                    gradientTo="to-red-500"
                  />

                  <LockedFeatureBanner
                    metricId="aiRecommendations"
                    icon="🤖"
                    title="AI-Powered Recommendations"
                    description="Get personalized insights and actionable tips to boost your performance"
                    previewStats={[
                      { label: 'Tips', value: '12' },
                      { label: 'Impact', value: '+32%' }
                    ]}
                    gradientFrom="from-emerald-500"
                    gradientTo="to-teal-600"
                  />
                </div>

                {/* Advanced Metrics Grid - Locked Cards */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      Advanced Metrics
                      <span className="text-xs font-normal text-text-secondary">(Click to preview)</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <LockedMetricCard
                      metricId="sentiment"
                      icon="😊"
                      label="Sentiment"
                      sublabel="Audience mood"
                      chartType="line"
                      onUpgradeClick={() => handleOpenUpgradeModal('sentiment')}
                      previewValue="78%"
                      previewTrend={{ value: 8, positive: true }}
                      userPlan={userPlan}
                    />
                    <LockedMetricCard
                      metricId="retention"
                      icon="👁️"
                      label="Retention"
                      sublabel="Avg watch"
                      chartType="area"
                      onUpgradeClick={() => handleOpenUpgradeModal('retention')}
                      previewValue="65%"
                      previewTrend={{ value: 12, positive: true }}
                      userPlan={userPlan}
                    />
                    <LockedMetricCard
                      metricId="virality"
                      icon="🔥"
                      label="Virality"
                      sublabel="Share potential"
                      chartType="bar"
                      onUpgradeClick={() => handleOpenUpgradeModal('virality')}
                      previewValue="42"
                      previewTrend={{ value: 2, positive: true }}
                      userPlan={userPlan}
                    />
                    <LockedMetricCard
                      metricId="velocity"
                      icon="⚡"
                      label="Velocity"
                      sublabel="Posts/day"
                      chartType="line"
                      onUpgradeClick={() => handleOpenUpgradeModal('velocity')}
                      previewValue="3.2"
                      previewTrend={{ value: 15, positive: true }}
                      userPlan={userPlan}
                    />
                    <LockedMetricCard
                      metricId="crossPlatform"
                      icon="🔗"
                      label="Cross-Platform"
                      sublabel="Synergy score"
                      chartType="pie"
                      onUpgradeClick={() => handleOpenUpgradeModal('crossPlatform')}
                      previewValue="85%"
                      previewTrend={{ value: 22, positive: true }}
                      userPlan={userPlan}
                    />
                    <LockedMetricCard
                      metricId="bestPostingTimes"
                      icon="#️⃣"
                      label="Hashtags"
                      sublabel="Performance"
                      chartType="bar"
                      onUpgradeClick={() => handleOpenUpgradeModal('bestPostingTimes')}
                      previewValue="72%"
                      previewTrend={{ value: 3, positive: false }}
                      userPlan={userPlan}
                    />
                  </div>
                </div>

                {/* Pro Benefits Summary Card */}
                <Card className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-2 border-purple-200 mb-8" hover={false}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <h3 className="font-bold text-text-primary text-xl mb-2 flex items-center gap-2">
                        <span className="text-2xl">⭐</span>
                        Unlock All Pro Features
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {[
                          '📍 Location Analytics',
                          '📊 Retention Graphs',
                          '🤖 AI Recommendations',
                          '😊 Sentiment Analysis',
                          '🔥 Virality Scoring',
                          '⏰ Best Posting Times',
                          '📅 Calendar Insights',
                          '📝 Caption Analytics'
                        ].map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                            <span className="text-green-500">✓</span>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center lg:items-end gap-3">
                      <div className="text-center lg:text-right">
                        <p className="text-3xl font-bold text-purple-600">$29<span className="text-lg font-normal text-text-secondary">/mo</span></p>
                        <p className="text-xs text-text-secondary">Cancel anytime</p>
                      </div>
                      <Link
                        href="/settings"
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                      >
                        Upgrade to Pro
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard label="Total Posts" value={filteredStats.totalPosts} icon="📊" trend={isProduction ? undefined : { value: 12, positive: true }} tooltip="The total number of posts published to this platform. Use the platform filter above to see platform-specific counts." />
              <StatCard label="Total Reach" value={filteredStats.totalReach} icon="👥" trend={isProduction ? undefined : { value: 24, positive: true }} tooltip="The total number of unique accounts that saw your posts. Sync analytics for each platform to update this metric." />
              <StatCard
                label={filteredStats.engagementIsRate ? "Eng. Rate" : "Total Engagement"}
                value={filteredStats.avgEngagement}
                icon="❤️"
                trend={isProduction ? undefined : { value: 5.2, positive: true }}
                subtitle={filteredStats.engagementIsRate ? "Of reach" : "Sync for rate"}
                tooltip={filteredStats.engagementIsRate
                  ? "Engagement rate = (likes + comments + shares + saves) ÷ reach × 100. A rate of 3-6% is considered good."
                  : "Total interactions (likes + comments + shares + saves). Sync analytics to see engagement rate percentage."
                }
              />
              <StatCard label="AI Generated" value={filteredStats.aiGenerated} icon="✨" subtitle={isProduction ? undefined : "60% of total posts"} tooltip="The number of posts that used AI-generated captions. This helps track how AI assistance impacts your content strategy." />
            </div>

            {/* Feature Cards */}
            {/* Location Analytics - Account-level, requires permission */}
            {userPlan === 'pro' && (
              analyticsPermissions?.canViewAccountAnalytics === false && isTeamMember ? (
                // Locked state for team members without account analytics access
                <div className="block mb-6">
                  <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-5xl opacity-50">🌍</div>
                        <div>
                          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                            Location of Engagement
                            <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">🔒 Admin Only</span>
                          </h3>
                          <p className="text-white/70 text-sm">Account-level analytics are admin-only.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center px-4 py-2 bg-white/10 rounded-xl">
                          <p className="text-xs text-white/70 mb-1">Your analytics access is managed by</p>
                          <p className="text-sm font-medium">the workspace admin</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/analytics/location" className="block mb-6 group">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-6 hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl group-hover:scale-[1.01] transform">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-5xl">🌍</div>
                        <div>
                          <h3 className="text-xl font-bold mb-1">Location of Engagement</h3>
                          <p className="text-white/90 text-sm">See where your audience engages the most — by country, region, and city</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!isProduction && (
                          <>
                            <div className="text-right hidden md:block">
                              <p className="text-2xl font-bold">47</p>
                              <p className="text-xs text-white/80">Countries</p>
                            </div>
                            <div className="text-right hidden md:block">
                              <p className="text-2xl font-bold">234</p>
                              <p className="text-xs text-white/80">Cities</p>
                            </div>
                          </>
                        )}
                        <div className="ml-4 bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            )}

            {(userPlan === 'creator' || userPlan === 'pro') && (
              <Link href="/analytics/save-rate" className="block mb-6 group">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-6 hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl group-hover:scale-[1.01] transform">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">📌</div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">Save Rate Analytics</h3>
                        <p className="text-white/90 text-sm">Track how often your content gets saved — by format and platform</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isProduction && (
                        <>
                          <div className="text-right hidden md:block">
                            <p className="text-2xl font-bold">2.9%</p>
                            <p className="text-xs text-white/80">Avg Save Rate</p>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-2xl font-bold">4,520</p>
                            <p className="text-xs text-white/80">Total Saves</p>
                          </div>
                        </>
                      )}
                      <div className="ml-4 bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Retention Analytics - Account-level, requires permission */}
            {userPlan === 'pro' && (
              analyticsPermissions?.canViewAccountAnalytics === false && isTeamMember ? (
                // Locked state for team members without account analytics access
                <div className="block mb-8">
                  <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-5xl opacity-50">📊</div>
                        <div>
                          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                            Retention Graph Analytics
                            <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">🔒 Admin Only</span>
                          </h3>
                          <p className="text-white/70 text-sm">Account-level analytics are admin-only.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center px-4 py-2 bg-white/10 rounded-xl">
                          <p className="text-xs text-white/70 mb-1">Your analytics access is managed by</p>
                          <p className="text-sm font-medium">the workspace admin</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <Link href="/analytics/retention" className="block mb-8 group">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-6 hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl group-hover:scale-[1.01] transform">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">📊</div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">Retention Graph Analytics</h3>
                        <p className="text-white/90 text-sm">See exactly where viewers drop off and optimize your hooks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isProduction && (
                        <>
                          <div className="text-right hidden md:block">
                            <p className="text-2xl font-bold">82%</p>
                            <p className="text-xs text-white/80">Hook Score</p>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-2xl font-bold">28%</p>
                            <p className="text-xs text-white/80">Completion</p>
                          </div>
                        </>
                      )}
                      <div className="ml-4 bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
              )
            )}

            {/* Advanced Metrics - Pro Plan Only */}
            {userPlan === 'pro' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">Advanced Metrics</h3>
                  {selectedPlatform !== 'all' && (
                    <span className="text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full">
                      Filtered by {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    {
                      icon: '😊',
                      label: 'Sentiment',
                      value: advancedMetrics.sentimentScore,
                      suffix: '%',
                      color: 'text-green-600',
                      sublabel: 'Positive',
                      metricKey: 'sentiment' as const,
                      benchmark: realStats?.benchmarks?.sentiment || { industry: 65, userAvg: 0, trend: 'stable' as const, trendValue: 0 }
                    },
                    {
                      icon: '👁️',
                      label: 'Retention',
                      value: advancedMetrics.audienceRetention,
                      suffix: '%',
                      color: 'text-text-secondary',
                      sublabel: 'Avg watch',
                      metricKey: 'retention' as const,
                      benchmark: realStats?.benchmarks?.retention || { industry: 45, userAvg: 0, trend: 'stable' as const, trendValue: 0 }
                    },
                    {
                      icon: '🔥',
                      label: 'Virality',
                      value: advancedMetrics.viralityScore,
                      suffix: '',
                      color: 'text-orange-600',
                      sublabel: 'Score',
                      metricKey: 'virality' as const,
                      benchmark: realStats?.benchmarks?.virality || { industry: 25, userAvg: 0, trend: 'stable' as const, trendValue: 0 }
                    },
                    {
                      icon: '⚡',
                      label: 'Velocity',
                      value: advancedMetrics.contentVelocity,
                      suffix: '',
                      color: 'text-text-secondary',
                      sublabel: 'Posts/day',
                      metricKey: 'velocity' as const,
                      benchmark: realStats?.benchmarks?.velocity || { industry: 1.5, userAvg: 0, trend: 'stable' as const, trendValue: 0 }
                    },
                    {
                      icon: '🔗',
                      label: 'Cross-Platform',
                      value: advancedMetrics.crossPlatformSynergy,
                      suffix: '%',
                      color: 'text-blue-600',
                      sublabel: 'Synergy',
                      metricKey: 'crossPlatform' as const,
                      benchmark: realStats?.benchmarks?.crossPlatform || { industry: 55, userAvg: 0, trend: 'stable' as const, trendValue: 0 }
                    },
                    {
                      icon: '#️⃣',
                      label: 'Hashtags',
                      value: advancedMetrics.hashtagPerformance,
                      suffix: '%',
                      color: 'text-purple-600',
                      sublabel: 'Performance',
                      metricKey: 'hashtags' as const,
                      benchmark: realStats?.benchmarks?.hashtags || { industry: 40, userAvg: 0, trend: 'stable' as const, trendValue: 0 }
                    }
                  ].map((metric) => (
                    <Card key={metric.label} className="p-4 group hover:shadow-lg transition-shadow" hover={false}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl group-hover:scale-110 transition-transform">{metric.icon}</span>
                        <MetricInfo
                          metric={metric.metricKey}
                          platform={selectedPlatform === 'all' ? 'instagram' : selectedPlatform}
                          userPlan={userPlan}
                          currentValue={metric.value}
                          benchmark={metric.benchmark}
                        >
                          <span className="text-xs text-text-secondary font-medium">{metric.label}</span>
                        </MetricInfo>
                      </div>
                      <p className="text-2xl font-bold text-text-primary">{metric.value}{metric.suffix}</p>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${metric.color}`}>{metric.sublabel}</p>
                        <span className={`text-xs font-medium ${
                          metric.benchmark.trend === 'up' ? 'text-green-500' :
                          metric.benchmark.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {metric.benchmark.trend === 'up' ? '↑' : metric.benchmark.trend === 'down' ? '↓' : '→'}
                          {Math.abs(metric.benchmark.trendValue)}%
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Performing Formats */}
              <Card className="p-6 lg:p-8" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-text-primary">Top Formats</h2>
                    {selectedPlatform !== 'all' && (
                      <span className="text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full">
                        {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                      </span>
                    )}
                  </div>
                  {userPlan === 'creator' && (
                    <Badge variant="primary" className="bg-purple-100 text-purple-700">
                      🔒 Pro: See trends
                    </Badge>
                  )}
                </div>
                {topFormats.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">🎬</span>
                    <p className="text-text-secondary">No format data yet.</p>
                    <p className="text-sm text-text-secondary/70">Upload content to see which formats perform best.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {topFormats.map((format, index) => (
                      <div key={format.type} className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-text-primary">{format.type}</span>
                            <span className="text-sm font-medium text-primary">{format.percentage}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${format.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-secondary w-16">{format.count} posts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* AI Impact */}
              <Card className="p-6 lg:p-8" hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-text-primary">AI Impact</h2>
                  {selectedPlatform !== 'all' && (
                    <span className="text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full">
                      {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                    </span>
                  )}
                </div>
                {(() => {
                  const aiData = realStats?.aiImpact
                  const hasData = aiData && (aiData.aiCaptions.count > 0 || aiData.manualCaptions.count > 0)

                  if (!hasData && isProduction) {
                    return (
                      <div className="text-center py-12">
                        <span className="text-5xl mb-4 block">✨</span>
                        <p className="text-text-secondary">No AI data yet.</p>
                        <p className="text-sm text-text-secondary/70">Use AI captions to see their impact on engagement.</p>
                      </div>
                    )
                  }

                  // Use real data if available, otherwise mock data in dev
                  const aiRate = hasData ? aiData.aiCaptions.engagementRate : 14.8
                  const manualRate = hasData ? aiData.manualCaptions.engagementRate : 11.2
                  const improvement = hasData
                    ? aiData.improvement
                    : 32
                  const aiCount = hasData ? aiData.aiCaptions.count : 0
                  const manualCount = hasData ? aiData.manualCaptions.count : 0

                  return (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-text-primary font-medium">With AI Captions</span>
                          <span className="text-3xl">✨</span>
                        </div>
                        <p className="text-4xl font-bold text-primary mb-2">{aiRate}%</p>
                        <p className="text-sm text-text-secondary">
                          Average engagement rate {hasData && <span className="text-xs">({aiCount} posts)</span>}
                        </p>
                      </div>

                      <div className="bg-gray-100 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-text-primary font-medium">Without AI Captions</span>
                          <span className="text-3xl">📝</span>
                        </div>
                        <p className="text-4xl font-bold text-text-secondary mb-2">{manualRate}%</p>
                        <p className="text-sm text-text-secondary">
                          Average engagement rate {hasData && <span className="text-xs">({manualCount} posts)</span>}
                        </p>
                      </div>

                      {improvement !== null && (
                        <GradientBanner className="!p-6">
                          <p className="text-sm font-medium mb-1">Performance Improvement</p>
                          <p className="text-5xl font-bold">{improvement > 0 ? '+' : ''}{improvement}%</p>
                          <p className="text-sm mt-2 opacity-90">
                            {improvement > 0
                              ? 'AI captions perform significantly better'
                              : improvement < 0
                                ? 'Manual captions performing better currently'
                                : 'Similar performance between AI and manual captions'}
                          </p>
                        </GradientBanner>
                      )}
                    </div>
                  )
                })()}
              </Card>
            </div>

            {/* Caption Usage Analytics Teaser - Creator Plan Only */}
            {userPlan === 'creator' && (
              <Card
                className="p-6 lg:p-8 mt-8 relative overflow-hidden group cursor-pointer border-2 border-transparent hover:border-purple-300 transition-all"
                hover={false}
                onClick={() => handleOpenUpgradeModal('captionUsage')}
                onMouseEnter={() => upgradeIntent.trackHoverStart('captionUsage', 'card')}
                onMouseLeave={() => upgradeIntent.trackHoverEnd('captionUsage')}
              >
                {/* Gradient border effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                {/* Lock overlay that appears on hover */}
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform">
                    <LockIcon size="lg" className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Caption Usage Analytics</h3>
                  <p className="text-text-secondary mb-4 max-w-md text-center px-4">
                    See how your identical vs adapted captions perform. Pro users see <span className="font-semibold text-green-600">+32% better engagement</span> with adapted captions.
                  </p>
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>⭐</span>
                    Upgrade to Pro
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartTrial('captionUsage')
                    }}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    👁️ Preview for 5 minutes (Free)
                  </button>
                </div>

                {/* Preview content with sophisticated blur */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📝</span>
                      <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                          Caption Usage Analytics
                          <Badge variant="gradient" className="text-xs">Pro</Badge>
                        </h2>
                        <p className="text-sm text-text-secondary">Compare performance of identical vs adapted captions</p>
                      </div>
                    </div>
                  </div>

                  {/* Usage Mode Distribution - Blurred */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 opacity-60 blur-[1px]">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">42</p>
                      <p className="text-sm text-green-700 font-medium">Identical</p>
                      <p className="text-xs text-green-600/70">Same across platforms</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-purple-600">28</p>
                      <p className="text-sm text-purple-700 font-medium">Adapted</p>
                      <p className="text-xs text-purple-600/70">Rule-based changes</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">18</p>
                      <p className="text-sm text-blue-700 font-medium">Edited</p>
                      <p className="text-xs text-blue-600/70">Manual modifications</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-orange-600">9</p>
                      <p className="text-sm text-orange-700 font-medium">Rewritten</p>
                      <p className="text-xs text-orange-600/70">Full AI rewrites</p>
                    </div>
                  </div>

                  {/* Blurred Chart Preview */}
                  <div className="opacity-50">
                    <BlurredChart type="bar" height={100} />
                  </div>
                </div>
              </Card>
            )}

            {/* Caption Usage Analytics - Pro Plan Only */}
            {userPlan === 'pro' && (
              <Card className="p-6 lg:p-8 mt-8" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-text-primary">📝 Caption Usage Analytics</h2>
                      {selectedPlatform !== 'all' && (
                        <span className="text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full">
                          {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-1">Compare performance of different caption modes</p>
                  </div>
                  <Badge variant="primary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Caption Workflow Insights
                  </Badge>
                </div>

                {(() => {
                  const captionData = realStats?.captionUsage
                  const hasData = captionData && captionData.length > 0

                  if (!hasData && isProduction) {
                    return (
                      <div className="text-center py-12">
                        <span className="text-5xl mb-4 block">📝</span>
                        <p className="text-text-secondary">No caption data yet.</p>
                        <p className="text-sm text-text-secondary/70">Start posting with captions to see usage analytics.</p>
                      </div>
                    )
                  }

                  // Color mapping for caption modes
                  const modeColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
                    'Manual': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', accent: 'bg-gray-500' },
                    'AI Generated': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', accent: 'bg-purple-500' },
                    'Adapted': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', accent: 'bg-green-500' },
                    'Identical': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', accent: 'bg-blue-500' },
                  }

                  const getColors = (mode: string) => modeColors[mode] || modeColors['Manual']

                  // Use real data if available, otherwise mock data in dev
                  const displayData = hasData ? captionData : [
                    { mode: 'AI Generated', count: 42, percentage: 43, avgEngagement: 198, engagementRate: 14.8 },
                    { mode: 'Manual', count: 28, percentage: 29, avgEngagement: 142, engagementRate: 11.2 },
                    { mode: 'Adapted', count: 18, percentage: 18, avgEngagement: 172, engagementRate: 13.2 },
                    { mode: 'Identical', count: 9, percentage: 10, avgEngagement: 156, engagementRate: 12.1 },
                  ]

                  // Find max engagement rate for bar width calculation
                  const maxRate = Math.max(...displayData.map(d => d.engagementRate))

                  return (
                    <>
                      {/* Usage Mode Distribution */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {displayData.slice(0, 4).map((mode) => {
                          const colors = getColors(mode.mode)
                          return (
                            <div key={mode.mode} className={`${colors.bg} border ${colors.border} rounded-xl p-4 text-center`}>
                              <p className={`text-3xl font-bold ${colors.text}`}>{mode.count}</p>
                              <p className={`text-sm font-medium ${colors.text}`}>{mode.mode}</p>
                              <p className={`text-xs ${colors.text}/70`}>{mode.percentage}% of posts</p>
                            </div>
                          )
                        })}
                      </div>

                      {/* Performance Comparison Chart */}
                      <div className="bg-gray-50 rounded-xl p-6 mb-6">
                        <h3 className="font-semibold text-text-primary mb-4">Performance by Caption Mode</h3>
                        <div className="space-y-4">
                          {displayData.map((mode) => {
                            const colors = getColors(mode.mode)
                            const barWidth = maxRate > 0 ? (mode.engagementRate / maxRate) * 100 : 0
                            return (
                              <div key={mode.mode} className="flex items-center gap-4">
                                <div className="w-28 text-sm font-medium text-text-primary">{mode.mode}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                                      <div className={`h-full ${colors.accent} rounded-full`} style={{ width: `${barWidth}%` }}></div>
                                    </div>
                                    <span className={`text-sm font-bold ${colors.text} w-16`}>{mode.engagementRate}%</span>
                                  </div>
                                  <p className="text-xs text-text-secondary">
                                    Avg engagement rate • {mode.count} posts • {mode.avgEngagement} avg engagement
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Best Performing Mode */}
                      {displayData.length > 0 && (() => {
                        // Find the actual best performer by engagement rate
                        const sortedByEngagement = [...displayData].sort((a, b) => b.engagementRate - a.engagementRate)
                        const bestMode = sortedByEngagement[0]
                        const worstMode = sortedByEngagement[sortedByEngagement.length - 1]

                        return (
                          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-5 mb-6">
                            <div className="flex items-start gap-4">
                              <div className="text-4xl">🏆</div>
                              <div>
                                <h4 className="font-bold text-lg mb-1">Best Performing Mode</h4>
                                <p className="text-white/90 text-sm">
                                  <strong>{bestMode.mode}</strong> captions have the highest engagement rate at{' '}
                                  <strong>{bestMode.engagementRate}%</strong>.
                                  {sortedByEngagement.length > 1 && worstMode.engagementRate > 0 && (
                                    <> That&apos;s {((bestMode.engagementRate / worstMode.engagementRate - 1) * 100).toFixed(0)}% better than {worstMode.mode}.</>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )
                })()}
              </Card>
            )}

            {/* Content Calendar Insights - Pro Plan Only */}
            {userPlan === 'pro' && (
              <Card className="p-6 lg:p-8 mt-8" hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-text-primary">📅 Content Calendar Insights</h2>
                  {selectedPlatform !== 'all' && (
                    <span className="text-xs text-text-secondary bg-primary/10 px-2 py-1 rounded-full">
                      {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                    </span>
                  )}
                </div>
                {(() => {
                  const calendarData = realStats?.calendarInsights
                  const hasData = calendarData && calendarData.totalPostsAnalyzed > 0

                  if (!hasData && isProduction) {
                    return (
                      <div className="text-center py-12">
                        <span className="text-5xl mb-4 block">📅</span>
                        <p className="text-text-secondary">No calendar insights yet.</p>
                        <p className="text-sm text-text-secondary/70">Post content regularly to discover your optimal schedule.</p>
                      </div>
                    )
                  }

                  // Use real data if available, otherwise mock data in dev
                  const bestDays = hasData && calendarData.bestDays.length > 0
                    ? calendarData.bestDays
                    : [
                        { day: 'Tuesday', avgEngagement: 245, posts: 12 },
                        { day: 'Thursday', avgEngagement: 232, posts: 10 },
                        { day: 'Wednesday', avgEngagement: 198, posts: 8 },
                      ]

                  const bestHours = hasData && calendarData.bestHours.length > 0
                    ? calendarData.bestHours
                    : [
                        { hour: '10 AM', avgEngagement: 312, posts: 15 },
                        { hour: '2 PM', avgEngagement: 287, posts: 12 },
                        { hour: '7 PM', avgEngagement: 265, posts: 18 },
                      ]

                  const postsAnalyzed = hasData ? calendarData.totalPostsAnalyzed : 97

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Best Days */}
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                            <span>📆</span> Best Days to Post
                          </h3>
                          <div className="space-y-3">
                            {bestDays.slice(0, 3).map((day, index) => (
                              <div key={day.day} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0 ? 'bg-green-500 text-white' : 'bg-green-200 text-green-700'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <span className="text-sm font-medium text-green-900">{day.day}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-bold text-green-600">{day.avgEngagement} avg</span>
                                  <p className="text-xs text-green-600/70">{day.posts} posts</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Best Hours */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                            <span>🕐</span> Best Times to Post
                          </h3>
                          <div className="space-y-3">
                            {bestHours.slice(0, 3).map((hour, index) => (
                              <div key={hour.hour} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0 ? 'bg-blue-500 text-white' : 'bg-blue-200 text-blue-700'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <span className="text-sm font-medium text-blue-900">{hour.hour}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-bold text-blue-600">{hour.avgEngagement} avg</span>
                                  <p className="text-xs text-blue-600/70">{hour.posts} posts</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-purple-900 mb-1">Optimal Posting Schedule</h3>
                            <p className="text-sm text-purple-700">
                              Based on {postsAnalyzed} posts analyzed, your best performance comes from posting on{' '}
                              <strong>{bestDays[0]?.day || 'weekdays'}</strong> around{' '}
                              <strong>{bestHours[0]?.hour || 'morning'}</strong>.
                            </p>
                          </div>
                          <Link
                            href="/schedule"
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors whitespace-nowrap"
                          >
                            Schedule Posts →
                          </Link>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </Card>
            )}

            {/* Platform Performance - NOT affected by Platform Context filter */}
            <Card className="p-6 lg:p-8 mt-8" hover={false}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Platform Performance</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded-full">
                    All platforms
                  </span>
                  {userPlan === 'creator' && (
                    <Badge variant="primary" className="bg-purple-100 text-purple-700">
                      🔒 Pro: Unlock best posting times
                    </Badge>
                  )}
                </div>
              </div>
              {platformData === null ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-text-secondary">
                    {isSyncing ? 'Syncing engagement data from platforms...' : 'Loading platform data...'}
                  </p>
                </div>
              ) : platformData.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl mb-4 block">📊</span>
                  <p className="text-text-secondary">No platform data yet.</p>
                  <p className="text-sm text-text-secondary/70">Start posting to see your performance across platforms.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {platformData.map((platform) => (
                    <div key={platform.platform}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <PlatformLogo
                            platform={PLATFORM_ID_MAP[platform.platform]}
                            size="sm"
                            variant="color"
                          />
                          <span className="font-semibold text-text-primary">{platform.platform}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {userPlan === 'pro' && (
                            <>
                              <span className="text-xs text-text-secondary">
                                Best time: <span className="font-medium text-primary">{platform.bestTime}</span>
                              </span>
                              <span className={`text-xs font-medium ${platform.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {platform.growth > 0 ? '↑' : '↓'} {Math.abs(platform.growth)}%
                              </span>
                            </>
                          )}
                          <span className="text-sm text-text-secondary">{platform.posts} posts</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-text-secondary mb-1">
                            {platform.reach > 0 ? 'Engagement Rate' : 'Engagement'}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {platform.reach > 0
                              ? `${platform.engagement}%`
                              : platform.totalEngagement > 0
                                ? platform.totalEngagement.toLocaleString()
                                : '—'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary mb-1">
                            {platform.reach > 0 ? 'Reach' : 'Likes'}
                          </p>
                          <p className="text-lg font-bold text-text-primary">
                            {platform.reach > 0
                              ? platform.reach.toLocaleString()
                              : platform.likes?.toLocaleString() || '—'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary mb-1">
                            {platform.reach > 0 ? 'Avg per Post' : 'Comments'}
                          </p>
                          <p className="text-lg font-bold text-text-primary">
                            {platform.reach > 0
                              ? Math.round(platform.reach / platform.posts)
                              : platform.comments?.toLocaleString() || '—'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-primary h-3 rounded-full transition-all duration-500"
                          style={{
                            width: platform.reach > 0
                              ? `${Math.min(platform.engagement * 5, 100)}%`
                              : `${Math.min((platform.totalEngagement || 0) * 2, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Activity */}
            <Card className="p-6 lg:p-8 mt-8" hover={false}>
              <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Activity</h2>
              {recentActivity === null ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-text-secondary">Loading recent activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl mb-4 block">📋</span>
                  <p className="text-text-secondary">No recent activity.</p>
                  <p className="text-sm text-text-secondary/70">Your activity will appear here once you start creating content.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-background rounded-xl transition-colors">
                      <span className="text-3xl">{activity.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{activity.action}</p>
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-text-secondary">{activity.time}</p>
                          {activity.status === 'DELETED' && (
                            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Deleted</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Plan Switcher for Testing - Development Only */}
            {!isProduction && (
              <div className="mt-12 p-6 bg-gray-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Test Different Plans (Development Only)</p>
                    <p className="text-xs text-text-secondary/70">This switcher is for testing purposes only</p>
                  </div>
                  <div className="flex gap-2">
                    {(['free', 'creator', 'pro'] as PlanType[]).map((plan) => {
                      const isActive = userPlan === plan
                      const activeClass = plan === 'pro'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : plan === 'creator'
                        ? 'bg-primary text-white'
                        : 'bg-blue-500 text-white'
                      return (
                        <button
                          key={plan}
                          onClick={() => {
                            setUserPlan(plan)
                            localStorage.setItem('userPlan', plan)
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                            isActive ? activeClass : 'bg-white text-text-secondary hover:bg-gray-50'
                          }`}
                        >
                          {plan} Plan
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          metricId={upgradeModalMetric}
          onStartTrial={handleStartTrial}
        />

        {/* Trial Countdown Banner */}
        {activeTrialMetric && (
          <TrialCountdownBanner
            metricId={activeTrialMetric}
            label={
              activeTrialMetric === 'captionUsage' ? 'Caption Analytics' :
              activeTrialMetric === 'sentiment' ? 'Sentiment Score' :
              activeTrialMetric === 'retention' ? 'Retention Rate' :
              activeTrialMetric === 'virality' ? 'Virality Score' :
              activeTrialMetric === 'velocity' ? 'Content Velocity' :
              activeTrialMetric === 'crossPlatform' ? 'Cross-Platform' :
              'Advanced Metrics'
            }
            onExpired={() => setActiveTrialMetric(null)}
          />
        )}
      </main>
    </div>
  )
}
