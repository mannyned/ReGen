'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePlan } from '../context/PlanContext'
import { getRemainingUploads } from '../config/plans'
import { AppHeader, Card, StatCard, GradientBanner, Badge, PlatformLogo } from '../components/ui'
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
}

interface RecentPost {
  id: string
  platform: string
  platformPostId?: string
  platformUrl?: string
  caption?: string
  postedAt?: string
  thumbnail?: string
  fileName?: string
  mimeType?: string
}

export default function DashboardPage() {
  const { currentPlan, planFeatures, usedUploads } = usePlan()
  const [mounted, setMounted] = useState(false)
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  useEffect(() => {
    setMounted(true)

    // Fetch recent posts
    async function fetchRecentPosts() {
      try {
        const response = await fetch('/api/posts/recent?limit=6')
        if (response.ok) {
          const data = await response.json()
          setRecentPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Failed to fetch recent posts:', error)
      } finally {
        setLoadingPosts(false)
      }
    }

    fetchRecentPosts()
  }, [])

  // Stats based on actual posts
  const stats = {
    repurposesDone: recentPosts.length,
    totalEngagement: '—',
    averageReach: '—',
    postsThisWeek: recentPosts.filter(p => {
      if (!p.postedAt) return false
      const postDate = new Date(p.postedAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return postDate >= weekAgo
    }).length
  }

  // Helper to format relative time
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

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
            />
            <StatCard
              label="Average Reach"
              value={stats.averageReach}
              icon="👥"
              subtitle="Per post"
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
            {currentPlan !== 'free' && (
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium shadow-sm">
                  All
                </button>
                <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200">
                  Published
                </button>
                {planFeatures.scheduling && (
                  <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200">
                    Scheduled
                  </button>
                )}
                <button className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200">
                  Drafts
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
                  className="overflow-hidden group cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="h-48 bg-gradient-to-br from-primary/10 to-accent-purple/20 flex items-center justify-center text-6xl relative overflow-hidden">
                    {post.thumbnail ? (
                      <Image
                        src={post.thumbnail}
                        alt={post.caption || 'Post thumbnail'}
                        fill
                        className="object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <span className="transition-transform group-hover:scale-110">
                        {post.mimeType?.startsWith('video') ? '🎬' : '📸'}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-text-primary text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {post.caption?.substring(0, 40) || post.fileName || 'Untitled Post'}
                        {post.caption && post.caption.length > 40 ? '...' : ''}
                      </h3>
                      <Badge variant="success">published</Badge>
                    </div>

                    {/* Platform */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/5 rounded-lg">
                        <PlatformLogo
                          platform={post.platform as SocialPlatform}
                          size="xs"
                          variant="color"
                        />
                        <span className="text-primary text-xs font-medium">
                          {PLATFORM_DISPLAY_NAME[post.platform] || post.platform}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-text-secondary">
                        {formatRelativeTime(post.postedAt)}
                      </span>
                      <div className="flex gap-3">
                        {post.platformUrl && (
                          <a
                            href={post.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                          >
                            View
                          </a>
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
    </div>
  )
}
