'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePlan } from '../context/PlanContext'
import { getRemainingUploads } from '../config/plans'
import { AppHeader, Card, StatCard, GradientBanner, Badge, PlatformLogo } from '../components/ui'
import { useBetaStatus } from '../components/BetaProBadge'
import { NotificationBell } from '../components/NotificationBell'
import type { SocialPlatform } from '@/lib/types/social'

// Map display names to platform IDs
const PLATFORM_ID_MAP: Record<string, SocialPlatform> = {
  'Instagram': 'instagram',
  'Twitter': 'twitter',
  'X': 'twitter',
  'LinkedIn': 'linkedin',
  'Facebook': 'facebook',
  'TikTok': 'tiktok',
  'YouTube': 'youtube',
  'Snapchat': 'snapchat',
  'Pinterest': 'pinterest',
  'Discord': 'discord',
}

// Platform display names
const PLATFORM_DISPLAY_NAME: Record<string, string> = {
  instagram: 'Instagram',
  twitter: 'X',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  discord: 'Discord',
  draft: 'Draft',
}

interface RecentPost {
  id: string
  platform: string
  platforms?: string[]
  platformPostId?: string
  platformUrl?: string
  caption?: string
  postedAt?: string
  scheduledAt?: string
  status?: string
  deletedAt?: string
  thumbnail?: string
  fileName?: string
  mimeType?: string
  mediaType?: 'image' | 'video' | 'carousel'
}

interface AnalyticsStats {
  totalPosts: number
  postsThisWeek: number
  deletedPosts: number
  queuedPosts: number
  failedPosts: number
  platformStats: Record<string, number>
  engagement?: {
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
}

export default function DashboardPage() {
  const { currentPlan, planFeatures, usedUploads } = usePlan()
  const { isBetaPro, daysRemaining, isLoading: betaLoading } = useBetaStatus()
  const [mounted, setMounted] = useState(false)
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [totalPosts, setTotalPosts] = useState(0)
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'scheduled' | 'drafts' | 'deleted'>('all')
  const [checkingPostId, setCheckingPostId] = useState<string | null>(null)

  // Fetch analytics stats from API
  const fetchAnalyticsStats = async () => {
    try {
      const response = await fetch('/api/analytics/stats')
      if (response.ok) {
        const data = await response.json()
        setAnalyticsStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics stats:', error)
    }
  }

  // Fetch posts with filter
  const fetchPosts = async (filter: string) => {
    setLoadingPosts(true)
    try {
      const response = await fetch(`/api/posts/recent?limit=6&filter=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setRecentPosts(data.posts || [])
        setTotalPosts(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch recent posts:', error)
    } finally {
      setLoadingPosts(false)
    }
  }

  // Refresh all data (posts and stats)
  const refreshData = async () => {
    await Promise.all([
      fetchPosts(activeFilter),
      fetchAnalyticsStats()
    ])
  }

  useEffect(() => {
    setMounted(true)
    fetchPosts(activeFilter)
    fetchAnalyticsStats()
  }, [])

  // Handle filter change
  const handleFilterChange = (filter: 'all' | 'published' | 'scheduled' | 'drafts' | 'deleted') => {
    setActiveFilter(filter)
    fetchPosts(filter)
  }

  // Mark a post as deleted
  const markPostAsDeleted = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELETED' }),
      })

      if (response.ok) {
        // Update local state to reflect deletion
        setRecentPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, status: 'DELETED', deletedAt: new Date().toISOString() }
              : post
          )
        )
        // Refresh analytics stats to update counts
        fetchAnalyticsStats()
      }
    } catch (error) {
      console.error('Failed to mark post as deleted:', error)
    }
  }

  // Handle View click - open URL and show confirmation prompt
  const handleViewClick = (postId: string, platformUrl: string) => {
    // Open the platform URL in a new tab
    window.open(platformUrl, '_blank', 'noopener,noreferrer')
    // Show the confirmation prompt for this post
    setCheckingPostId(postId)
  }

  // Handle user confirming post was deleted
  const handleConfirmDeleted = (postId: string) => {
    markPostAsDeleted(postId)
    setCheckingPostId(null)
  }

  // Handle user confirming post still exists
  const handleConfirmExists = () => {
    setCheckingPostId(null)
  }

  // Stats from API (real-time database counts)
  const engagement = analyticsStats?.engagement
  const totalEngagementValue = engagement
    ? engagement.totalLikes + engagement.totalComments + engagement.totalShares + engagement.totalSaves
    : 0

  // Calculate average reach per post, fall back to total reach if no average available
  const totalReachValue = engagement?.totalReach || 0
  const averageReachValue = engagement && engagement.postsWithMetrics > 0
    ? Math.round(engagement.totalReach / engagement.postsWithMetrics)
    : 0

  // Display average reach if available, otherwise show total reach
  const reachDisplay = averageReachValue > 0
    ? averageReachValue.toLocaleString()
    : totalReachValue > 0
      ? totalReachValue.toLocaleString()
      : '—'

  const stats = {
    repurposesDone: analyticsStats?.totalPosts ?? totalPosts,
    totalEngagement: totalEngagementValue > 0 ? totalEngagementValue.toLocaleString() : '—',
    averageReach: reachDisplay,
    postsThisWeek: analyticsStats?.postsThisWeek ?? 0,
    deletedPosts: analyticsStats?.deletedPosts ?? 0,
    queuedPosts: analyticsStats?.queuedPosts ?? 0,
    failedPosts: analyticsStats?.failedPosts ?? 0,
  }

  // Helper to format relative time
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently'
    const date = new Date(dateStr)

    // Handle invalid dates
    if (isNaN(date.getTime())) return 'Recently'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()

    // Handle future dates (e.g., timezone issues) - show "Just now" instead of negative
    if (diffMs < 0) return 'Just now'

    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const remainingUploads = getRemainingUploads(currentPlan, usedUploads)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader
        currentPage="dashboard"
        showSchedule={planFeatures.scheduling}
        isPro={currentPlan === 'pro'}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Plan Status Banner */}
        {currentPlan === 'free' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">You're on the Free Plan</h3>
                  <p className="text-sm text-gray-600">
                    {remainingUploads !== null ? `${remainingUploads} uploads remaining` : 'Unlimited uploads'} • {planFeatures.maxPlatforms} platforms • {planFeatures.maxFilesPerUpload} file/post
                  </p>
                </div>
              </div>
              <Link href="/settings" className="btn-primary text-sm whitespace-nowrap">
                Upgrade Now
              </Link>
            </div>
          </div>
        )}

        {currentPlan === 'creator' && remainingUploads !== null && remainingUploads < 5 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Running low on uploads</h3>
                  <p className="text-sm text-blue-700">
                    You have {remainingUploads} uploads remaining. Upgrade to Pro for unlimited.
                  </p>
                </div>
              </div>
              <Link href="/settings" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        )}

        {/* Beta Pro Trial Banner */}
        {!betaLoading && isBetaPro && daysRemaining !== null && (
          <div className={`rounded-2xl p-5 mb-6 animate-fade-in ${
            daysRemaining <= 7
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200'
              : 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  daysRemaining <= 7 ? 'bg-orange-100' : 'bg-violet-100'
                }`}>
                  <span className="text-xl">{daysRemaining <= 7 ? '⏰' : '🧪'}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${daysRemaining <= 7 ? 'text-orange-900' : 'text-violet-900'}`}>
                      Beta Pro Access
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      daysRemaining <= 7
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          daysRemaining <= 7 ? 'bg-orange-400' : 'bg-violet-400'
                        }`} />
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                          daysRemaining <= 7 ? 'bg-orange-500' : 'bg-violet-500'
                        }`} />
                      </span>
                      {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                    </span>
                  </div>
                  <p className={`text-sm ${daysRemaining <= 7 ? 'text-orange-700' : 'text-violet-700'}`}>
                    {daysRemaining <= 7
                      ? 'Your beta trial is ending soon. Upgrade to keep Pro features!'
                      : 'Enjoy full Pro features during your beta trial period.'}
                  </p>
                </div>
              </div>
              <Link
                href="/settings"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-opacity shadow-lg whitespace-nowrap ${
                  daysRemaining <= 7
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90'
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:opacity-90'
                }`}
              >
                View Plans
              </Link>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
                Welcome back! {currentPlan === 'pro' ? '⭐' : currentPlan === 'creator' ? '🌟' : '👋'}
              </h1>
              <p className="text-text-secondary mt-1 text-lg">
                {currentPlan === 'pro'
                  ? "You're crushing it with Pro features!"
                  : currentPlan === 'creator'
                  ? "Create amazing content with Creator tools"
                  : "Get started with your content journey"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell />

              {/* Create New Button */}
              {(remainingUploads === null || remainingUploads > 0) ? (
                <Link
                  href="/upload"
                  className="group btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New</span>
                  <svg className="w-4 h-4 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              ) : (
                <button
                  disabled
                  className="px-6 py-3 bg-gray-100 text-gray-400 rounded-xl font-medium cursor-not-allowed"
                >
                  Upload Limit Reached
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <StatCard
              label="Repurposes Done"
              value={stats.repurposesDone}
              icon="🔄"
              trend={currentPlan !== 'free' ? {
                value: currentPlan === 'creator' ? '+12 this week' : '+45 this week',
                positive: true
              } : undefined}
              subtitle={currentPlan === 'free' ? 'Free tier' : undefined}
            />
            <StatCard
              label="Total Engagement"
              value={stats.totalEngagement}
              icon="❤️"
              trend={{
                value: currentPlan === 'pro' ? '+52% vs last week' : '+24% vs last week',
                positive: true
              }}
              tooltip="The sum of all likes, comments, shares, and saves across your published posts. Sync your analytics from the Analytics page to update this metric."
            />
            <StatCard
              label="Average Reach"
              value={stats.averageReach}
              icon="👥"
              subtitle={averageReachValue > 0 ? "Per post" : totalReachValue > 0 ? "Total reach" : undefined}
              tooltip="The average number of unique accounts that saw your posts. Shows average per post when available, or total reach otherwise. Sync analytics from the Analytics page to update."
            />
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-secondary text-sm font-medium">
                  {currentPlan === 'free' ? 'Uploads Used' : 'Posts This Week'}
                </span>
                <span className="text-2xl">📊</span>
              </div>
              {currentPlan === 'free' ? (
                <>
                  <p className="text-3xl font-bold text-text-primary mb-1">
                    {usedUploads}/{planFeatures.maxUploadsPerMonth}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(usedUploads / (planFeatures.maxUploadsPerMonth || 1)) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-text-primary mb-1">{stats.postsThisWeek}</p>
                  <p className="text-sm text-text-secondary">Across all platforms</p>
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Feature Cards - Show locked features for Free/Creator */}
        {currentPlan !== 'pro' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {currentPlan === 'free' && (
              <>
                <div className="group bg-gray-50 border border-gray-200 rounded-2xl p-5 relative overflow-hidden hover:border-gray-300 transition-colors">
                  <div className="absolute top-3 right-3">
                    <Badge variant="gray">🔒 CREATOR</Badge>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center mb-3">
                    <span className="text-xl grayscale">📅</span>
                  </div>
                  <h3 className="font-semibold text-gray-400 mb-1">Schedule Posts</h3>
                  <p className="text-sm text-gray-400">Plan and schedule your content in advance</p>
                </div>
                <div className="group bg-gray-50 border border-gray-200 rounded-2xl p-5 relative overflow-hidden hover:border-gray-300 transition-colors">
                  <div className="absolute top-3 right-3">
                    <Badge variant="gray">🔒 CREATOR</Badge>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center mb-3">
                    <span className="text-xl grayscale">🌐</span>
                  </div>
                  <h3 className="font-semibold text-gray-400 mb-1">Multi-Platform</h3>
                  <p className="text-sm text-gray-400">Post to 5+ platforms simultaneously</p>
                </div>
                <div className="group bg-purple-50 border border-purple-200 rounded-2xl p-5 relative overflow-hidden hover:border-purple-300 transition-colors">
                  <div className="absolute top-3 right-3">
                    <Badge variant="gradient">🔒 PRO</Badge>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                    <span className="text-xl">🤖</span>
                  </div>
                  <h3 className="font-semibold text-purple-900 mb-1">AI Recommendations</h3>
                  <p className="text-sm text-purple-700">Get AI-powered content insights</p>
                </div>
              </>
            )}
            {currentPlan === 'creator' && (
              <>
                <div className="group bg-purple-50 border border-purple-200 rounded-2xl p-5 relative overflow-hidden hover:border-purple-300 transition-colors">
                  <div className="absolute top-3 right-3">
                    <Badge variant="gradient">🔒 PRO</Badge>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                    <span className="text-xl">📊</span>
                  </div>
                  <h3 className="font-semibold text-purple-900 mb-1">Advanced Analytics</h3>
                  <p className="text-sm text-purple-700">Sentiment analysis & virality scores</p>
                </div>
                <div className="group bg-purple-50 border border-purple-200 rounded-2xl p-5 relative overflow-hidden hover:border-purple-300 transition-colors">
                  <div className="absolute top-3 right-3">
                    <Badge variant="gradient">🔒 PRO</Badge>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                    <span className="text-xl">👥</span>
                  </div>
                  <h3 className="font-semibold text-purple-900 mb-1">Team Collaboration</h3>
                  <p className="text-sm text-purple-700">Add up to 5 team members</p>
                </div>
                <div className="group bg-purple-50 border border-purple-200 rounded-2xl p-5 relative overflow-hidden hover:border-purple-300 transition-colors">
                  <div className="absolute top-3 right-3">
                    <Badge variant="gradient">🔒 PRO</Badge>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                    <span className="text-xl">⚡</span>
                  </div>
                  <h3 className="font-semibold text-purple-900 mb-1">Priority Support</h3>
                  <p className="text-sm text-purple-700">Get help within 2 hours</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Recent Posts Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Recent Posts</h2>
            {(currentPlan !== 'free' || isBetaPro) && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleFilterChange('published')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === 'published'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Published
                </button>
                {(planFeatures.scheduling || isBetaPro) && (
                  <button
                    onClick={() => handleFilterChange('scheduled')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === 'scheduled'
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    Scheduled
                  </button>
                )}
                <button
                  onClick={() => handleFilterChange('drafts')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === 'drafts'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Drafts
                </button>
                <button
                  onClick={() => handleFilterChange('deleted')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === 'deleted'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Deleted
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingPosts ? (
              // Loading skeleton
              [...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-5">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-gray-100 rounded w-full" />
                  </div>
                </Card>
              ))
            ) : (
              recentPosts.map((post) => (
                <Card
                  key={post.id}
                  className={`overflow-hidden group cursor-pointer ${post.status === 'DELETED' ? 'opacity-75' : ''}`}
                >
                  {/* Thumbnail */}
                  <div className="h-48 bg-gradient-to-br from-primary/10 to-accent-purple/20 flex items-center justify-center text-6xl relative overflow-hidden">
                    {/* Deleted overlay */}
                    {post.status === 'DELETED' && (
                      <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                        <div className="bg-red-500/90 text-white text-sm font-medium px-3 py-1.5 rounded-full">
                          Deleted from platform
                        </div>
                      </div>
                    )}
                    {/* Scheduled overlay */}
                    {post.status === 'SCHEDULED' && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-amber-500/90 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                          <span>🕐</span>
                          <span>Scheduled</span>
                        </div>
                      </div>
                    )}
                    {/* Draft overlay */}
                    {post.status === 'INITIATED' && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-gray-500/90 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                          <span>📝</span>
                          <span>Draft</span>
                        </div>
                      </div>
                    )}
                    {post.thumbnail ? (
                      <>
                        {post.mediaType === 'video' || post.mimeType?.startsWith('video') ? (
                          <video
                            src={post.thumbnail}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            muted
                            playsInline
                          />
                        ) : (
                          <Image
                            src={post.thumbnail}
                            alt={post.caption || 'Post thumbnail'}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        )}
                        {/* Video play indicator */}
                        {(post.mediaType === 'video' || post.mimeType?.startsWith('video')) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <span className="text-2xl ml-1">▶️</span>
                            </div>
                          </div>
                        )}
                        {/* Carousel indicator */}
                        {post.mediaType === 'carousel' && (
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span>📷</span>
                            <span>+</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="transition-transform group-hover:scale-110 text-gray-300">
                        {post.mediaType === 'video' || post.mimeType?.startsWith('video') ? '🎬' :
                         post.mediaType === 'carousel' ? '📷' : '📝'}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-text-primary text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {(typeof post.caption === 'string' ? post.caption.substring(0, 40) : null) || post.fileName || 'Untitled Post'}
                        {typeof post.caption === 'string' && post.caption.length > 40 ? '...' : ''}
                      </h3>
                      <Badge variant={
                        post.status === 'DELETED' ? 'error' :
                        post.status === 'SCHEDULED' ? 'warning' :
                        post.status === 'INITIATED' ? 'gray' : 'success'
                      }>
                        {post.status === 'DELETED' ? 'deleted' :
                         post.status === 'SCHEDULED' ? 'scheduled' :
                         post.status === 'INITIATED' ? 'draft' : 'published'}
                      </Badge>
                    </div>

                    {/* Platform(s) */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(post.platforms && post.platforms.length > 0 ? post.platforms : [post.platform]).map((platform, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-primary/5 rounded-lg">
                          <PlatformLogo
                            platform={platform as SocialPlatform}
                            size="xs"
                            variant="color"
                          />
                          <span className="text-primary text-xs font-medium">
                            {PLATFORM_DISPLAY_NAME[platform] || platform}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-text-secondary">
                        {post.status === 'DELETED' && post.deletedAt
                          ? `Deleted ${formatRelativeTime(post.deletedAt)}`
                          : post.status === 'SCHEDULED' && post.scheduledAt
                          ? `Scheduled for ${new Date(post.scheduledAt).toLocaleDateString()} at ${new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : post.status === 'INITIATED'
                          ? `Started ${formatRelativeTime(post.postedAt)}`
                          : formatRelativeTime(post.postedAt)}
                      </span>
                      <div className="flex gap-3">
                        {post.status === 'DELETED' ? (
                          <span className="text-gray-400 text-sm">
                            No longer available
                          </span>
                        ) : post.status === 'SCHEDULED' ? (
                          <Link
                            href="/schedule"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                          >
                            Manage
                          </Link>
                        ) : post.status === 'INITIATED' ? (
                          <Link
                            href={`/upload?draft=${post.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                          >
                            Continue
                          </Link>
                        ) : (
                          post.platformUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewClick(post.id, post.platformUrl!)
                              }}
                              className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                            >
                              View
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Empty State */}
          {!loadingPosts && recentPosts.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">No posts yet</h3>
              <p className="text-text-secondary mb-6">Get started by uploading your first piece of content</p>
              <Link href="/upload" className="btn-primary inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Post
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions CTA */}
        <GradientBanner className="mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">
                {currentPlan === 'pro'
                  ? 'Maximize your Pro features!'
                  : currentPlan === 'creator'
                  ? 'Ready to create more content?'
                  : 'Start your content journey'}
              </h3>
              <p className="text-white/90">
                {currentPlan === 'pro'
                  ? 'Unlimited uploads, advanced analytics, and AI recommendations await'
                  : currentPlan === 'creator'
                  ? 'Upload a video, image, or paste a link to get started'
                  : `You have ${remainingUploads} uploads remaining this month`}
              </p>
            </div>
            {(remainingUploads === null || remainingUploads > 0) ? (
              <Link href="/upload" className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg whitespace-nowrap">
                Start Creating
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            ) : (
              <Link href="/settings" className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg whitespace-nowrap">
                Upgrade Plan
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
          </div>
        </GradientBanner>
      </main>

      {/* Post Status Check Toast */}
      {checkingPostId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center gap-4 max-w-md">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">❓</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Was this post still available on the platform?
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Help us keep your dashboard accurate
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleConfirmExists}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
              >
                Yes ✓
              </button>
              <button
                onClick={() => handleConfirmDeleted(checkingPostId)}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
              >
                No ✗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
