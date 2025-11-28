'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePlan } from '../context/PlanContext'
import { formatPlanBadge, getRemainingUploads } from '../config/plans'

export default function DashboardPage() {
  const { currentPlan, planFeatures, usedUploads } = usePlan()

  // Mock data - would come from API in production
  const stats = {
    repurposesDone: currentPlan === 'free' ? 3 : currentPlan === 'creator' ? 47 : 238,
    totalEngagement: currentPlan === 'free' ? '1.2K' : currentPlan === 'creator' ? '12.5K' : '148.7K',
    averageReach: currentPlan === 'free' ? '450' : currentPlan === 'creator' ? '2.3K' : '15.8K',
    postsThisWeek: currentPlan === 'free' ? 2 : currentPlan === 'creator' ? 8 : 32
  }

  const recentPosts = currentPlan === 'free'
    ? [
        { id: 1, title: 'Welcome Post', platforms: ['Instagram'], date: '2 hours ago', thumbnail: '📸', status: 'published' },
        { id: 2, title: 'First TikTok', platforms: ['TikTok'], date: '1 day ago', thumbnail: '🎵', status: 'published' },
      ]
    : currentPlan === 'creator'
    ? [
        { id: 1, title: 'Product Launch Video', platforms: ['TikTok', 'Instagram', 'YouTube'], date: '2 hours ago', thumbnail: '🎬', status: 'published' },
        { id: 2, title: 'Behind the Scenes', platforms: ['Instagram', 'Facebook'], date: '5 hours ago', thumbnail: '📸', status: 'published' },
        { id: 3, title: 'Tutorial: Getting Started', platforms: ['YouTube', 'LinkedIn'], date: '1 day ago', thumbnail: '🎓', status: 'scheduled' },
        { id: 4, title: 'Customer Testimonial', platforms: ['TikTok', 'X', 'LinkedIn'], date: '2 days ago', thumbnail: '💬', status: 'published' },
      ]
    : [
        { id: 1, title: 'Product Launch Video', platforms: ['TikTok', 'Instagram', 'YouTube', 'LinkedIn', 'X'], date: '2 hours ago', thumbnail: '🎬', status: 'published' },
        { id: 2, title: 'Behind the Scenes', platforms: ['Instagram', 'Facebook', 'Snapchat'], date: '5 hours ago', thumbnail: '📸', status: 'published' },
        { id: 3, title: 'Tutorial: Getting Started', platforms: ['YouTube', 'LinkedIn', 'Facebook'], date: '1 day ago', thumbnail: '🎓', status: 'scheduled' },
        { id: 4, title: 'Customer Testimonial', platforms: ['TikTok', 'X', 'LinkedIn'], date: '2 days ago', thumbnail: '💬', status: 'published' },
        { id: 5, title: 'Weekly Tips & Tricks', platforms: ['Instagram', 'Facebook', 'X', 'YouTube'], date: '3 days ago', thumbnail: '✨', status: 'published' },
        { id: 6, title: 'Product Demo', platforms: ['YouTube', 'LinkedIn', 'X'], date: '4 days ago', thumbnail: '🚀', status: 'published' },
      ]

  const remainingUploads = getRemainingUploads(currentPlan, usedUploads)
  const badge = formatPlanBadge(currentPlan)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/logo.png" alt="ReGen Logo" width={168} height={168} className="object-contain" />
                <span className="text-2xl font-bold text-primary">ReGen</span>
              </Link>
              <span className="text-text-secondary text-sm">/ Dashboard</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ml-2 ${badge.className}`}>
                {badge.text}
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-primary font-semibold">Dashboard</Link>
              <Link href="/upload" className="text-text-secondary hover:text-primary transition-colors">Upload</Link>
              {planFeatures.scheduling && (
                <Link href="/schedule" className="text-text-secondary hover:text-primary transition-colors">Schedule</Link>
              )}
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
              <Link href="/settings" className="text-text-secondary hover:text-primary transition-colors">Settings</Link>
              <Link href="/test-results" className="text-text-secondary hover:text-primary transition-colors">Test Mode</Link>
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-semibold cursor-pointer">
                {currentPlan === 'pro' ? '⭐' : currentPlan === 'creator' ? '🌟' : '🎯'}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Plan Status Banner */}
        {currentPlan === 'free' && (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-orange-300 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">You're on the Free Plan</h3>
                <p className="text-sm text-gray-700">
                  {remainingUploads !== null ? `${remainingUploads} uploads remaining this month` : 'Unlimited uploads'} •
                  Limited to {planFeatures.maxPlatforms} platforms •
                  {planFeatures.maxFilesPerUpload} file per post
                </p>
              </div>
              <Link href="/settings" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">
                Upgrade Now
              </Link>
            </div>
          </div>
        )}

        {currentPlan === 'creator' && remainingUploads !== null && remainingUploads < 5 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-blue-900">Running low on uploads</h3>
                <p className="text-sm text-blue-700">
                  You have {remainingUploads} uploads remaining this month. Upgrade to Pro for unlimited uploads.
                </p>
              </div>
              <Link href="/settings" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                Welcome back! {currentPlan === 'pro' ? '⭐' : currentPlan === 'creator' ? '🌟' : '👋'}
              </h1>
              <p className="text-text-secondary mt-1">
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
                className="btn-primary flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                Create New
              </Link>
            ) : (
              <button
                disabled
                className="px-6 py-3 bg-gray-200 text-gray-500 rounded-lg font-medium cursor-not-allowed"
              >
                Upload Limit Reached
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm font-medium">Repurposes Done</span>
                <span className="text-2xl">🔄</span>
              </div>
              <p className="text-3xl font-bold text-text-primary">{stats.repurposesDone}</p>
              <p className="text-sm text-primary mt-1">
                {currentPlan === 'free' ? 'Free tier' : currentPlan === 'creator' ? '+12 this week' : '+45 this week'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm font-medium">Total Engagement</span>
                <span className="text-2xl">❤️</span>
              </div>
              <p className="text-3xl font-bold text-text-primary">{stats.totalEngagement}</p>
              <p className="text-sm text-primary mt-1">
                {currentPlan === 'pro' ? '+52% vs last week' : '+24% vs last week'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm font-medium">Average Reach</span>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-3xl font-bold text-text-primary">{stats.averageReach}</p>
              <p className="text-sm text-primary mt-1">Per post</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm font-medium">
                  {currentPlan === 'free' ? 'Uploads Used' : 'Posts This Week'}
                </span>
                <span className="text-2xl">📊</span>
              </div>
              {currentPlan === 'free' ? (
                <>
                  <p className="text-3xl font-bold text-text-primary">
                    {usedUploads}/{planFeatures.maxUploadsPerMonth}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">This month</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-text-primary">{stats.postsThisWeek}</p>
                  <p className="text-sm text-text-secondary mt-1">Across all platforms</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Feature Cards - Show locked features for Free/Creator */}
        {currentPlan !== 'pro' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {currentPlan === 'free' && (
              <>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
                      🔒 CREATOR
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-400 mb-1">Schedule Posts</h3>
                  <p className="text-sm text-gray-400">Plan and schedule your content in advance</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
                      🔒 CREATOR
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-400 mb-1">Multi-Platform</h3>
                  <p className="text-sm text-gray-400">Post to 5+ platforms simultaneously</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-full text-xs font-bold">
                      🔒 PRO
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-400 mb-1">AI Recommendations</h3>
                  <p className="text-sm text-gray-400">Get AI-powered content insights</p>
                </div>
              </>
            )}
            {currentPlan === 'creator' && (
              <>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 relative">
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-full text-xs font-bold">
                      🔒 PRO
                    </span>
                  </div>
                  <h3 className="font-semibold text-purple-900 mb-1">Advanced Analytics</h3>
                  <p className="text-sm text-purple-700">Sentiment analysis & virality scores</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 relative">
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-full text-xs font-bold">
                      🔒 PRO
                    </span>
                  </div>
                  <h3 className="font-semibold text-purple-900 mb-1">Team Collaboration</h3>
                  <p className="text-sm text-purple-700">Add up to 5 team members</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 relative">
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-full text-xs font-bold">
                      🔒 PRO
                    </span>
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
                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                  All
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  Published
                </button>
                {planFeatures.scheduling && (
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Scheduled
                  </button>
                )}
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  Drafts
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-6xl">
                  {post.thumbnail}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-text-primary text-lg">{post.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      post.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {post.status}
                    </span>
                  </div>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="badge-primary text-xs"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm text-text-secondary">{post.date}</span>
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary-hover text-sm font-medium">
                        View
                      </button>
                      <button className="text-text-secondary hover:text-primary text-sm font-medium">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State (shown when no posts) */}
          {recentPosts.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">No posts yet</h3>
              <p className="text-text-secondary mb-6">Get started by uploading your first piece of content</p>
              <Link href="/upload" className="btn-primary inline-flex items-center gap-2">
                <span className="text-xl">+</span>
                Create Your First Post
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-brand rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
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
              <Link href="/upload" className="btn-secondary bg-white text-primary border-0 hover:bg-gray-100">
                Start Creating →
              </Link>
            ) : (
              <Link href="/settings" className="btn-secondary bg-white text-primary border-0 hover:bg-gray-100">
                Upgrade Plan →
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}