'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function DashboardPage() {
  // Mock data - would come from API in production
  const stats = {
    repurposesDone: 47,
    totalEngagement: '12.5K',
    averageReach: '2.3K',
    postsThisWeek: 8
  }

  const recentPosts = [
    { id: 1, title: 'Product Launch Video', platforms: ['TikTok', 'Instagram', 'YouTube'], date: '2 hours ago', thumbnail: '🎬', status: 'published' },
    { id: 2, title: 'Behind the Scenes', platforms: ['Instagram', 'Facebook'], date: '5 hours ago', thumbnail: '📸', status: 'published' },
    { id: 3, title: 'Tutorial: Getting Started', platforms: ['YouTube', 'LinkedIn'], date: '1 day ago', thumbnail: '🎓', status: 'scheduled' },
    { id: 4, title: 'Customer Testimonial', platforms: ['TikTok', 'X', 'LinkedIn'], date: '2 days ago', thumbnail: '💬', status: 'published' },
    { id: 5, title: 'Weekly Tips & Tricks', platforms: ['Instagram', 'Facebook', 'X'], date: '3 days ago', thumbnail: '✨', status: 'published' },
    { id: 6, title: 'Product Demo', platforms: ['YouTube', 'LinkedIn'], date: '4 days ago', thumbnail: '🚀', status: 'published' },
  ]

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
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-primary font-semibold">Dashboard</Link>
              <Link href="/upload" className="text-text-secondary hover:text-primary transition-colors">Upload</Link>
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-semibold cursor-pointer">
                JD
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Welcome back! 👋</h1>
              <p className="text-text-secondary mt-1">Here's your content performance overview</p>
            </div>
            <Link
              href="/upload"
              className="btn-primary flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Create New
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm font-medium">Repurposes Done</span>
                <span className="text-2xl">🔄</span>
              </div>
              <p className="text-3xl font-bold text-text-primary">{stats.repurposesDone}</p>
              <p className="text-sm text-primary mt-1">+12 this week</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-sm font-medium">Total Engagement</span>
                <span className="text-2xl">❤️</span>
              </div>
              <p className="text-3xl font-bold text-text-primary">{stats.totalEngagement}</p>
              <p className="text-sm text-primary mt-1">+24% vs last week</p>
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
                <span className="text-text-secondary text-sm font-medium">Posts This Week</span>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold text-text-primary">{stats.postsThisWeek}</p>
              <p className="text-sm text-text-secondary mt-1">Across all platforms</p>
            </div>
          </div>
        </div>

        {/* Recent Posts Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Recent Posts</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                All
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Published
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Scheduled
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Drafts
              </button>
            </div>
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
              <h3 className="text-xl font-bold mb-2">Ready to create more content?</h3>
              <p className="text-white/90">Upload a video, image, or paste a link to get started</p>
            </div>
            <Link href="/upload" className="btn-secondary bg-white text-primary border-0 hover:bg-gray-100">
              Start Creating →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
