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
interface EngagementMetrics {
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

interface PlatformEngagement {
  posts: number
  likes: number
  comments: number
  shares: number
  reach: number
  impressions: number
  saves: number
  views: number
}

interface AdvancedMetrics {
  contentVelocity: number
  viralityScore: number
  crossPlatformSynergy: number
  hashtagPerformance: number
  postsPerWeek: number
  avgReachPerPost: number
}

interface AnalyticsStats {
  totalPosts: number
  postsThisWeek: number
  postsInRange: number
  deletedPosts: number
  queuedPosts: number
  failedPosts: number
  aiGenerated: number
  platformStats: Record<string, number>
  engagement?: EngagementMetrics
  platformEngagement?: Record<string, PlatformEngagement>
  advancedMetrics?: AdvancedMetrics
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30')
  const [userPlan, setUserPlan] = useState<PlanType>('free')
  const [mounted, setMounted] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeModalMetric, setUpgradeModalMetric] = useState<LockedMetricId | null>(null)
  const [activeTrialMetric, setActiveTrialMetric] = useState<LockedMetricId | null>(null)
  const [analyticsPermissions, setAnalyticsPermissions] = useState<AnalyticsPermissions | null>(null)
  const [isTeamMember, setIsTeamMember] = useState(false)
  const [realStats, setRealStats] = useState<AnalyticsStats | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; total: number } | null>(null)

  // Upgrade intent tracking
  const upgradeIntent = useUpgradeIntent()

  const isProduction = process.env.NODE_ENV === 'production'

  // Fetch real analytics stats
  const fetchAnalyticsStats = async (days: string, showRefreshState = false) => {
    try {
      if (showRefreshState) setIsRefreshing(true)
      const response = await fetch(`/api/analytics/stats?days=${days}`)
      if (response.ok) {
        const data = await response.json()
        setRealStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics stats:', error)
    } finally {
      if (showRefreshState) setIsRefreshing(false)
    }
  }

  // Combined refresh handler - syncs from platforms then refreshes display
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setLastSyncResult(null)

    try {
      // Step 1: Sync analytics from connected platforms
      const syncResponse = await fetch('/api/analytics/sync', {
        method: 'POST',
      })

      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        if (syncData.synced > 0) {
          setLastSyncResult({ synced: syncData.synced, total: syncData.total })
        }
      }

      // Step 2: Refresh stats from database
      await fetchAnalyticsStats(timeRange, false)
    } catch (error) {
      console.error('Failed to refresh analytics:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setMounted(true)

    // Fetch real analytics stats
    fetchAnalyticsStats(timeRange)

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

  // In production, show empty state. In development, show mock data for testing.
  const platformData = isProduction ? [] : [
    { platform: 'Instagram', posts: 24, engagement: 12.5, reach: 5200, growth: 2.3, bestTime: '6PM-8PM' },
    { platform: 'Twitter', posts: 45, engagement: 8.3, reach: 3800, growth: -1.2, bestTime: '12PM-2PM' },
    { platform: 'LinkedIn', posts: 18, engagement: 15.2, reach: 2900, growth: 5.7, bestTime: '9AM-11AM' },
    { platform: 'Facebook', posts: 32, engagement: 6.8, reach: 4100, growth: 0.8, bestTime: '7PM-9PM' },
    { platform: 'TikTok', posts: 28, engagement: 18.7, reach: 6500, growth: 8.9, bestTime: '5PM-7PM' }
  ]

  const topFormats = isProduction ? [] : [
    { type: 'Video', count: 42, avgEngagement: 14.2, trend: 'up' },
    { type: 'Image', count: 38, avgEngagement: 11.5, trend: 'stable' },
    { type: 'Text', count: 27, avgEngagement: 8.9, trend: 'down' }
  ]

  const aiRecommendations: AIRecommendation[] = isProduction ? [] : [
    {
      id: '1',
      title: 'Post More Videos on TikTok',
      description: 'Your TikTok videos get 3x more engagement than other formats. Consider increasing video content to 60% of your posts.',
      impact: 'high',
      icon: '🎬'
    },
    {
      id: '2',
      title: 'Optimize LinkedIn Posting Time',
      description: 'Your LinkedIn posts at 9-11AM get 45% more engagement. Schedule more content during this window.',
      impact: 'high',
      icon: '⏰'
    },
    {
      id: '3',
      title: 'Leverage Trending Hashtags',
      description: 'Posts with trending hashtags show 28% higher reach. Use our AI to suggest relevant trending tags.',
      impact: 'medium',
      icon: '#️⃣'
    },
    {
      id: '4',
      title: 'Diversify Facebook Content',
      description: 'Your Facebook engagement is below average. Try mixing in more carousel posts and live videos.',
      impact: 'medium',
      icon: '🎯'
    },
    {
      id: '5',
      title: 'Increase Story Frequency',
      description: 'Accounts posting 5+ stories/week see 2x profile visits. You\'re currently at 2 stories/week.',
      impact: 'low',
      icon: '📱'
    }
  ]

  // Use real advanced metrics from API, with fallback to 0
  const advancedMetrics = {
    sentimentScore: 0, // Not implemented yet - needs AI/NLP
    audienceRetention: 0, // Not implemented yet - needs YouTube Analytics API
    viralityScore: realStats?.advancedMetrics?.viralityScore ?? 0,
    contentVelocity: realStats?.advancedMetrics?.contentVelocity ?? 0,
    crossPlatformSynergy: realStats?.advancedMetrics?.crossPlatformSynergy ?? 0,
    hashtagPerformance: realStats?.advancedMetrics?.hashtagPerformance ?? 0,
  }

  // Stats using real data from API
  const stats = {
    totalPosts: realStats?.totalPosts?.toString() || '0',
    totalReach: realStats?.engagement?.totalReach
      ? realStats.engagement.totalReach.toLocaleString()
      : '—',
    avgEngagement: realStats?.engagement?.avgEngagementRate
      ? `${realStats.engagement.avgEngagementRate}%`
      : '—',
    aiGenerated: realStats?.aiGenerated?.toString() || '0'
  }

  // Build real platform data from API
  const realPlatformData = realStats?.platformEngagement
    ? Object.entries(realStats.platformEngagement).map(([platform, data]) => {
        // For YouTube, use views as reach
        const effectiveReach = platform === 'youtube' ? data.views : data.reach
        const engagementRate = effectiveReach > 0
          ? ((data.likes + data.comments + data.shares + data.saves) / effectiveReach * 100).toFixed(1)
          : '0'
        return {
          platform: platform.charAt(0).toUpperCase() + platform.slice(1),
          posts: data.posts,
          engagement: parseFloat(engagementRate),
          reach: effectiveReach,
          likes: data.likes,
          comments: data.comments,
          saves: data.saves,
          views: data.views,
        }
      })
    : []

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

              {/* Time Range Selector and Export Button */}
              <div className="flex items-center gap-4">
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

                {/* Refresh Button - Syncs from platforms & refreshes display */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 border border-gray-200"
                  title="Refresh analytics from all connected platforms"
                >
                  <svg
                    className={`w-4 h-4 text-text-secondary ${isRefreshing ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="text-sm font-medium text-text-secondary">
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </span>
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

            {/* Sync Result Notification */}
            {lastSyncResult && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-medium text-green-800">
                      Analytics synced successfully
                    </p>
                    <p className="text-sm text-green-600">
                      {lastSyncResult.synced} of {lastSyncResult.total} posts updated with latest metrics
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLastSyncResult(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* AI Recommendations - Pro Plan Only */}
            {userPlan === 'pro' && (
              <GradientBanner className="mb-8 animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span>🤖</span>
                      AI-Powered Recommendations
                    </h2>
                    <p className="text-white/90 mt-1">Personalized insights to boost your performance</p>
                  </div>
                  <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm">
                    View All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiRecommendations.slice(0, 3).map((rec) => (
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
              <StatCard label="Total Posts" value={stats.totalPosts} icon="📊" trend={isProduction ? undefined : { value: 12, positive: true }} />
              <StatCard label="Total Reach" value={stats.totalReach} icon="👥" trend={isProduction ? undefined : { value: 24, positive: true }} />
              <StatCard label="Avg Engagement" value={stats.avgEngagement} icon="❤️" trend={isProduction ? undefined : { value: 5.2, positive: true }} />
              <StatCard label="AI Generated" value={stats.aiGenerated} icon="✨" subtitle={isProduction ? undefined : "60% of total posts"} />
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
                {/* Platform Filter for Tooltips */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">Advanced Metrics</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">Platform context:</span>
                    <select
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value as SocialPlatform)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter</option>
                      <option value="facebook">Facebook</option>
                    </select>
                  </div>
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
                      benchmark: { industry: 72, userAvg: 78, trend: 'up' as const, trendValue: 8 }
                    },
                    {
                      icon: '👁️',
                      label: 'Retention',
                      value: advancedMetrics.audienceRetention,
                      suffix: '%',
                      color: 'text-text-secondary',
                      sublabel: 'Avg watch',
                      metricKey: 'retention' as const,
                      benchmark: { industry: 55, userAvg: 65, trend: 'up' as const, trendValue: 12 }
                    },
                    {
                      icon: '🔥',
                      label: 'Virality',
                      value: advancedMetrics.viralityScore,
                      suffix: '',
                      color: 'text-orange-600',
                      sublabel: 'Score',
                      metricKey: 'virality' as const,
                      benchmark: { industry: 38, userAvg: 42, trend: 'stable' as const, trendValue: 2 }
                    },
                    {
                      icon: '⚡',
                      label: 'Velocity',
                      value: advancedMetrics.contentVelocity,
                      suffix: '',
                      color: 'text-text-secondary',
                      sublabel: 'Posts/day',
                      metricKey: 'velocity' as const,
                      benchmark: { industry: 2.8, userAvg: 3.2, trend: 'up' as const, trendValue: 15 }
                    },
                    {
                      icon: '🔗',
                      label: 'Cross-Platform',
                      value: advancedMetrics.crossPlatformSynergy,
                      suffix: '%',
                      color: 'text-blue-600',
                      sublabel: 'Synergy',
                      metricKey: 'crossPlatform' as const,
                      benchmark: { industry: 65, userAvg: 85, trend: 'up' as const, trendValue: 22 }
                    },
                    {
                      icon: '#️⃣',
                      label: 'Hashtags',
                      value: advancedMetrics.hashtagPerformance,
                      suffix: '%',
                      color: 'text-purple-600',
                      sublabel: 'Performance',
                      metricKey: 'hashtags' as const,
                      benchmark: { industry: 58, userAvg: 72, trend: 'down' as const, trendValue: -3 }
                    }
                  ].map((metric) => (
                    <Card key={metric.label} className="p-4 group hover:shadow-lg transition-shadow" hover={false}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl group-hover:scale-110 transition-transform">{metric.icon}</span>
                        <MetricInfo
                          metric={metric.metricKey}
                          platform={selectedPlatform}
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


            {/* Platform Performance */}
            <Card className="p-6 lg:p-8 mb-8" hover={false}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Platform Performance</h2>
                {userPlan === 'creator' && (
                  <Badge variant="primary" className="bg-purple-100 text-purple-700">
                    🔒 Pro: Unlock best posting times
                  </Badge>
                )}
              </div>
              {/* Use real data in production, mock data in development */}
              {(isProduction ? realPlatformData : platformData).length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl mb-4 block">📊</span>
                  <p className="text-text-secondary">No platform data yet.</p>
                  <p className="text-sm text-text-secondary/70">
                    {isProduction
                      ? 'Click "Sync" to fetch analytics from your connected platforms.'
                      : 'Start posting to see your performance across platforms.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(isProduction ? realPlatformData : platformData).map((platform) => (
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
                          {userPlan === 'pro' && 'bestTime' in platform && (
                            <>
                              <span className="text-xs text-text-secondary">
                                Best time: <span className="font-medium text-primary">{platform.bestTime}</span>
                              </span>
                            </>
                          )}
                          {'growth' in platform && userPlan === 'pro' && (
                            <span className={`text-xs font-medium ${platform.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {platform.growth > 0 ? '↑' : '↓'} {Math.abs(platform.growth)}%
                            </span>
                          )}
                          <span className="text-sm text-text-secondary">{platform.posts} posts</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-text-secondary mb-1">Engagement</p>
                          <p className="text-lg font-bold text-primary">{platform.engagement}%</p>
                        </div>
                        {'views' in platform && platform.views > 0 ? (
                          <div>
                            <p className="text-xs text-text-secondary mb-1">Views</p>
                            <p className="text-lg font-bold text-text-primary">{platform.views.toLocaleString()}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-text-secondary mb-1">Reach</p>
                            <p className="text-lg font-bold text-text-primary">{platform.reach.toLocaleString()}</p>
                          </div>
                        )}
                        {'likes' in platform && (
                          <div>
                            <p className="text-xs text-text-secondary mb-1">Likes</p>
                            <p className="text-lg font-bold text-text-primary">{platform.likes.toLocaleString()}</p>
                          </div>
                        )}
                        {'saves' in platform && platform.saves > 0 ? (
                          <div>
                            <p className="text-xs text-text-secondary mb-1">Saves</p>
                            <p className="text-lg font-bold text-text-primary">{platform.saves.toLocaleString()}</p>
                          </div>
                        ) : 'comments' in platform ? (
                          <div>
                            <p className="text-xs text-text-secondary mb-1">Comments</p>
                            <p className="text-lg font-bold text-text-primary">{platform.comments.toLocaleString()}</p>
                          </div>
                        ) : null}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-primary h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(platform.engagement * 5, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Performing Formats */}
              <Card className="p-6 lg:p-8" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-text-primary">Top Formats</h2>
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
                  <div className="space-y-6">
                    {topFormats.map((format, index) => (
                      <div key={format.type} className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-text-primary">{format.type}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary">{format.avgEngagement}%</span>
                              {userPlan === 'pro' && (
                                <span className={`text-xs ${
                                  format.trend === 'up' ? 'text-green-600' :
                                  format.trend === 'down' ? 'text-red-600' : 'text-text-secondary'
                                }`}>
                                  {format.trend === 'up' ? '↑' : format.trend === 'down' ? '↓' : '→'}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-text-secondary">{format.count} posts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* AI Impact */}
              <Card className="p-6 lg:p-8" hover={false}>
                <h2 className="text-2xl font-bold text-text-primary mb-6">AI Impact</h2>
                {isProduction ? (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">✨</span>
                    <p className="text-text-secondary">No AI data yet.</p>
                    <p className="text-sm text-text-secondary/70">Use AI captions to see their impact on engagement.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-text-primary font-medium">With AI Captions</span>
                        <span className="text-3xl">✨</span>
                      </div>
                      <p className="text-4xl font-bold text-primary mb-2">14.8%</p>
                      <p className="text-sm text-text-secondary">Average engagement rate</p>
                    </div>

                    <div className="bg-gray-100 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-text-primary font-medium">Without AI Captions</span>
                        <span className="text-3xl">📝</span>
                      </div>
                      <p className="text-4xl font-bold text-text-secondary mb-2">11.2%</p>
                      <p className="text-sm text-text-secondary">Average engagement rate</p>
                    </div>

                    <GradientBanner className="!p-6">
                      <p className="text-sm font-medium mb-1">Performance Improvement</p>
                      <p className="text-5xl font-bold">+32%</p>
                      <p className="text-sm mt-2 opacity-90">AI captions perform significantly better</p>
                    </GradientBanner>
                  </div>
                )}
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
                    <h2 className="text-2xl font-bold text-text-primary">📝 Caption Usage Analytics</h2>
                    <p className="text-sm text-text-secondary mt-1">Compare performance of identical vs adapted captions</p>
                  </div>
                  <Badge variant="primary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Caption Workflow Insights
                  </Badge>
                </div>

                {isProduction ? (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">📝</span>
                    <p className="text-text-secondary">No caption data yet.</p>
                    <p className="text-sm text-text-secondary/70">Start posting with captions to see usage analytics.</p>
                  </div>
                ) : (
                  <>
                    {/* Usage Mode Distribution */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

                {/* Performance Comparison Chart */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-text-primary mb-4">Performance by Caption Mode</h3>
                  <div className="space-y-4">
                    {/* Identical */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Identical</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '68%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-green-600 w-16">11.2%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 3,240 avg reach • 142 avg likes</p>
                      </div>
                    </div>
                    {/* Adapted */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Adapted</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-purple-600 w-16">14.8%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 4,120 avg reach • 198 avg likes</p>
                      </div>
                    </div>
                    {/* Manual Edit */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Edited</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '72%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-blue-600 w-16">12.1%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 3,480 avg reach • 156 avg likes</p>
                      </div>
                    </div>
                    {/* Full Rewrite */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Rewritten</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: '78%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-orange-600 w-16">13.2%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 3,890 avg reach • 172 avg likes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Adaptation Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <span>🏆</span> Top Performing Adaptations
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>✂️</span>
                          <span className="text-sm">Shorten</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+18% engagement</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>📢</span>
                          <span className="text-sm">Add CTA</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+15% engagement</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>↵</span>
                          <span className="text-sm">Add Line Breaks</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+12% engagement</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>👔</span>
                          <span className="text-sm">Professional Tone</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+9% engagement</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <span>📊</span> Platform Comparison
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="twitter" size="sm" variant="color" />
                          <span className="text-sm">Twitter</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-purple-600">Adapted +32%</span>
                          <p className="text-xs text-text-secondary">Shorten works best</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="linkedin" size="sm" variant="color" />
                          <span className="text-sm">LinkedIn</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-purple-600">Adapted +28%</span>
                          <p className="text-xs text-text-secondary">Professional tone wins</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="instagram" size="sm" variant="color" />
                          <span className="text-sm">Instagram</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-green-600">Identical +5%</span>
                          <p className="text-xs text-text-secondary">Full captions perform well</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="tiktok" size="sm" variant="color" />
                          <span className="text-sm">TikTok</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-purple-600">Adapted +22%</span>
                          <p className="text-xs text-text-secondary">Casual tone preferred</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                    {/* Key Insight Banner */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">💡</div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">Key Insight</h4>
                          <p className="text-white/90 text-sm mb-2">
                            <strong>Adapted captions outperform identical by 32%</strong> on average.
                            The "Shorten" adaptation shows the highest impact, especially on Twitter where
                            character limits matter. Consider using platform-specific adaptations for all your posts.
                          </p>
                          <div className="flex gap-3 mt-3">
                            <Link
                              href="/generate"
                              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                            >
                              Try Caption Workflow →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Content Calendar Insights - Pro Plan Only */}
            {userPlan === 'pro' && (
              <Card className="p-6 lg:p-8 mt-8" hover={false}>
                <h2 className="text-2xl font-bold text-text-primary mb-6">📅 Content Calendar Insights</h2>
                {isProduction ? (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">📅</span>
                    <p className="text-text-secondary">No calendar insights yet.</p>
                    <p className="text-sm text-text-secondary/70">Post content regularly to discover your optimal schedule.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <h3 className="font-semibold text-green-900 mb-2">Peak Performance Days</h3>
                      <p className="text-sm text-green-700">Tuesday & Thursday show 40% higher engagement</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Optimal Frequency</h3>
                      <p className="text-sm text-blue-700">3-4 posts per platform per week maximizes reach</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                      <h3 className="font-semibold text-purple-900 mb-2">Content Mix</h3>
                      <p className="text-sm text-purple-700">60% educational, 30% entertaining, 10% promotional</p>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="p-6 lg:p-8 mt-8" hover={false}>
              <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Activity</h2>
              {isProduction ? (
                <div className="text-center py-12">
                  <span className="text-5xl mb-4 block">📋</span>
                  <p className="text-text-secondary">No recent activity.</p>
                  <p className="text-sm text-text-secondary/70">Your activity will appear here once you start creating content.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { action: 'Post published on Instagram', time: '2 hours ago', icon: '📷', performance: userPlan === 'pro' ? '+15% above average' : null },
                    { action: 'AI caption generated', time: '4 hours ago', icon: '✨', performance: userPlan === 'pro' ? 'Predicted engagement: 14.2%' : null },
                    { action: 'Post scheduled for LinkedIn', time: '6 hours ago', icon: '💼', performance: userPlan === 'pro' ? 'Optimal time selected' : null },
                    { action: 'Video uploaded', time: '1 day ago', icon: '🎬', performance: userPlan === 'pro' ? '92% quality score' : null }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 hover:bg-background rounded-xl transition-colors">
                      <span className="text-3xl">{activity.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{activity.action}</p>
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-text-secondary">{activity.time}</p>
                          {activity.performance && (
                            <p className="text-sm text-primary font-medium">{activity.performance}</p>
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
