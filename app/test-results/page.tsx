'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface MockPost {
  id: string
  platforms: string[]
  caption: string
  hashtags: string[]
  files?: Array<{
    name: string
    type: string
    size: number
  }>
  scheduleTime: string
  status: string
  postedAt: string
  results: Array<{
    platform: string
    status: string
    mockUrl: string
    message: string
    engagement: {
      likes: number
      comments: number
      shares: number
      views: number
    }
  }>
}

export default function TestResultsPage() {
  const [mockPosts, setMockPosts] = useState<MockPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<MockPost | null>(null)

  // Platform icons
  const platformIcons: Record<string, string> = {
    instagram: '📷',
    tiktok: '🎵',
    youtube: '▶️',
    facebook: '👥',
    x: '🐦',
    twitter: '🐦',
    linkedin: '💼',
    snapchat: '👻'
  }

  // Load mock posts
  useEffect(() => {
    fetchMockPosts()
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchMockPosts, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchMockPosts = async () => {
    try {
      const response = await fetch('/api/publish/mock?limit=20')
      const data = await response.json()
      if (data.success) {
        setMockPosts(data.posts)
      }
    } catch (error) {
      console.error('Error fetching mock posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/logo.png" alt="ReGenr Logo" width={168} height={168} className="object-contain" />
                <span className="text-2xl font-bold text-primary">ReGenr</span>
              </Link>
              <span className="text-text-secondary text-sm">/ Test Results</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/upload" className="text-text-secondary hover:text-primary transition-colors">Upload</Link>
              <Link href="/schedule" className="text-text-secondary hover:text-primary transition-colors">Schedule</Link>
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
              <Link href="/test-results" className="text-primary font-semibold">Test Results</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Test Mode Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🧪 Test Mode Results</h1>
              <p className="text-white/90">
                View your mock posts here. Nothing is actually posted to social media.
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl">🚀</div>
              <p className="text-sm mt-2">Safe Testing Environment</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-text-primary">{mockPosts.length}</div>
            <div className="text-sm text-text-secondary">Total Test Posts</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-600">
              {mockPosts.filter(p => p.status === 'success').length}
            </div>
            <div className="text-sm text-text-secondary">Successful</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-primary">
              {mockPosts.reduce((acc, post) => acc + post.platforms.length, 0)}
            </div>
            <div className="text-sm text-text-secondary">Platform Posts</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-2xl font-bold text-purple-600">
              {mockPosts.reduce((acc, post) =>
                acc + post.results.reduce((sum, r) => sum + r.engagement.views, 0), 0
              ).toLocaleString()}
            </div>
            <div className="text-sm text-text-secondary">Mock Views</div>
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-text-primary">Recent Test Posts</h2>
            <p className="text-sm text-text-secondary mt-1">
              Click on a post to see detailed results
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading test results...</p>
            </div>
          ) : mockPosts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">No Test Posts Yet</h3>
              <p className="text-text-secondary mb-6">
                Create your first test post to see it here
              </p>
              <Link href="/upload" className="btn-primary">
                Start Testing
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {mockPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {post.platforms.map(platform => (
                          <span
                            key={platform}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                          >
                            {platformIcons[platform] || '📱'} {platform}
                          </span>
                        ))}
                        <span className="text-xs text-text-secondary">
                          {formatDate(post.postedAt)}
                        </span>
                      </div>

                      <p className="text-text-primary line-clamp-2 mb-2">
                        {post.caption}
                      </p>

                      <div className="flex items-center gap-4 text-sm">
                        {post.files && post.files.length > 0 && (
                          <span className="text-text-secondary">
                            📎 {post.files.length} file{post.files.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <span className="text-text-secondary">
                            #️⃣ {post.hashtags.length} tags
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          post.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4 text-right">
                      <div className="text-2xl mb-1">
                        {selectedPost?.id === post.id ? '🔽' : '▶️'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedPost?.id === post.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-text-primary mb-4">Platform Results:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {post.results.map((result) => (
                          <div
                            key={result.platform}
                            className="p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">
                                  {platformIcons[result.platform] || '📱'}
                                </span>
                                <span className="font-semibold capitalize">
                                  {result.platform}
                                </span>
                              </div>
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                {result.status}
                              </span>
                            </div>

                            <div className="text-xs text-text-secondary mb-3">
                              Mock URL: <span className="text-primary">{result.mockUrl}</span>
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div>
                                <div className="text-lg font-bold text-text-primary">
                                  {result.engagement.likes}
                                </div>
                                <div className="text-xs text-text-secondary">Likes</div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-text-primary">
                                  {result.engagement.comments}
                                </div>
                                <div className="text-xs text-text-secondary">Comments</div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-text-primary">
                                  {result.engagement.shares}
                                </div>
                                <div className="text-xs text-text-secondary">Shares</div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-text-primary">
                                  {result.engagement.views}
                                </div>
                                <div className="text-xs text-text-secondary">Views</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {post.files && post.files.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-text-primary mb-2">Attached Files:</h4>
                          <div className="flex flex-wrap gap-2">
                            {post.files.map((file, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
                              >
                                📄 {file.name} ({formatFileSize(file.size)})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-text-primary mb-2">Hashtags:</h4>
                          <div className="flex flex-wrap gap-2">
                            {post.hashtags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">About Test Mode</h3>
              <p className="text-sm text-blue-800">
                Test mode allows you to test the entire content creation and publishing flow without actually posting to social media.
                All engagement metrics shown here are simulated. When you're ready to post for real, simply disable test mode in settings.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}