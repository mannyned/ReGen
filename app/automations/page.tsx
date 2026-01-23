'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppHeader, Card, Badge } from '@/app/components/ui'
import { PlatformLogo } from '@/app/components/ui/PlatformLogo'
import type { SocialPlatform } from '@/lib/types/social'

// ============================================
// TYPES
// ============================================

interface AutoShareSettings {
  enabled: boolean
  platforms: string[]
  autoPublish: boolean
  defaultImageUrl: string | null
  quietHoursEnabled: boolean
  quietHoursStart: number | null
  quietHoursEnd: number | null
  postingWindowEnabled: boolean
  postingWindowStart: number | null
  postingWindowEnd: number | null
  captionTemplates: Record<string, string> | null
  feedIds: string[]
  discordChannelId: string | null
  pinterestBoardId: string | null
  linkedinOrgUrn: string | null
}

interface AutoSharePost {
  id: string
  articleUrl: string
  articleTitle: string
  articleExcerpt: string | null
  ogImage: string | null
  generatedCaption: string | null
  status: string
  platformResults: PlatformResult[]
  createdAt: string
  processedAt: string | null
  rssFeedItem: {
    feed: {
      id: string
      name: string
      feedTitle: string | null
    }
  }
}

interface PlatformResult {
  platform: string
  status: 'published' | 'failed' | 'skipped'
  postId?: string
  postUrl?: string
  error?: string
}

interface StatusCounts {
  total: number
  drafts: number
  published: number
  partial: number
  failed: number
  skipped: number
}

// V1 Platforms
const AVAILABLE_PLATFORMS: { id: SocialPlatform; name: string; description: string }[] = [
  { id: 'instagram', name: 'Instagram', description: 'Image posts with caption (link in bio)' },
  { id: 'facebook', name: 'Facebook', description: 'Link posts with preview' },
  { id: 'twitter', name: 'X (Twitter)', description: 'Text posts with link' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Professional link posts' },
  { id: 'discord', name: 'Discord', description: 'Channel messages with embed' },
  { id: 'pinterest', name: 'Pinterest', description: 'Pins with destination link' },
]

// ============================================
// COMPONENT
// ============================================

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'posts'>('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Settings state
  const [settings, setSettings] = useState<AutoShareSettings>({
    enabled: false,
    platforms: [],
    autoPublish: false,
    defaultImageUrl: null,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    postingWindowEnabled: false,
    postingWindowStart: null,
    postingWindowEnd: null,
    captionTemplates: null,
    feedIds: [],
    discordChannelId: null,
    pinterestBoardId: null,
    linkedinOrgUrn: null,
  })

  // Posts state
  const [posts, setPosts] = useState<AutoSharePost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsFilter, setPostsFilter] = useState<string>('all')
  const [counts, setCounts] = useState<StatusCounts>({
    total: 0,
    drafts: 0,
    published: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
  })

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/blog-auto-share/settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch (err) {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPosts = useCallback(async (filter: string) => {
    try {
      setPostsLoading(true)
      const response = await fetch(`/api/blog-auto-share/posts?filter=${filter}`)
      const data = await response.json()

      if (data.success) {
        setPosts(data.posts)
        setCounts(data.counts)
      }
    } catch (err) {
      console.error('Failed to load posts:', err)
    } finally {
      setPostsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts(postsFilter)
    }
  }, [activeTab, postsFilter, fetchPosts])

  // ============================================
  // HANDLERS
  // ============================================

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/blog-auto-share/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
        setSuccess('Settings saved successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const togglePlatform = (platformId: string) => {
    setSettings(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId],
    }))
  }

  const handleApproveDraft = async (postId: string) => {
    try {
      const response = await fetch(`/api/blog-auto-share/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (data.success) {
        fetchPosts(postsFilter)
        setSuccess('Post published successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to publish post')
      }
    } catch (err) {
      setError('Failed to publish post')
    }
  }

  const handleDismissDraft = async (postId: string) => {
    try {
      const response = await fetch(`/api/blog-auto-share/posts/${postId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        fetchPosts(postsFilter)
      }
    } catch (err) {
      setError('Failed to dismiss post')
    }
  }

  // ============================================
  // RENDER
  // ============================================

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success">Published</Badge>
      case 'PARTIAL':
        return <Badge variant="warning">Partial</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      case 'DRAFT':
        return <Badge variant="default">Draft</Badge>
      case 'QUEUED':
        return <Badge variant="info">Queued</Badge>
      case 'SKIPPED':
        return <Badge variant="secondary">Skipped</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <AppHeader title="Automations" subtitle="Blog Auto-Share" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
              }`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === 'posts'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
              }`}
            >
              📝 Posts
              {counts.drafts > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                  {counts.drafts}
                </span>
              )}
            </button>
          </nav>

          <Link
            href="/rss"
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            📡 Manage RSS Feeds →
          </Link>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            {success}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {loading ? (
              <Card className="p-8 text-center">
                <div className="animate-pulse">Loading settings...</div>
              </Card>
            ) : (
              <>
                {/* Enable/Disable Toggle */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Blog Auto-Share</h3>
                      <p className="text-sm text-text-secondary mt-1">
                        Automatically share new blog posts from your RSS feeds to social media
                      </p>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.enabled ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </Card>

                {settings.enabled && (
                  <>
                    {/* Platform Selection */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
                        Select Platforms
                      </h3>
                      <p className="text-sm text-text-secondary mb-4">
                        Choose where to share your blog posts. TikTok and YouTube are video-only and not available for blog sharing.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AVAILABLE_PLATFORMS.map(platform => (
                          <button
                            key={platform.id}
                            onClick={() => togglePlatform(platform.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              settings.platforms.includes(platform.id)
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <PlatformLogo platform={platform.id} size="sm" variant="color" />
                              <span className="font-medium text-text-primary">{platform.name}</span>
                            </div>
                            <p className="text-xs text-text-secondary">{platform.description}</p>
                          </button>
                        ))}
                      </div>
                    </Card>

                    {/* Publishing Mode */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
                        Publishing Mode
                      </h3>
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            checked={!settings.autoPublish}
                            onChange={() => setSettings(prev => ({ ...prev, autoPublish: false }))}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-text-primary">Create Draft for Approval</div>
                            <div className="text-sm text-text-secondary">
                              Review and approve each post before it&apos;s published (recommended)
                            </div>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            checked={settings.autoPublish}
                            onChange={() => setSettings(prev => ({ ...prev, autoPublish: true }))}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-text-primary">Auto-Publish</div>
                            <div className="text-sm text-text-secondary">
                              Automatically publish posts without manual approval
                            </div>
                          </div>
                        </label>
                      </div>
                    </Card>

                    {/* Quiet Hours */}
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">Quiet Hours</h3>
                          <p className="text-sm text-text-secondary">
                            Don&apos;t publish during these hours (UTC)
                          </p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, quietHoursEnabled: !prev.quietHoursEnabled }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.quietHoursEnabled ? 'bg-purple-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.quietHoursEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      {settings.quietHoursEnabled && (
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="text-sm text-text-secondary">Start</label>
                            <select
                              value={settings.quietHoursStart ?? 22}
                              onChange={e => setSettings(prev => ({ ...prev, quietHoursStart: parseInt(e.target.value) }))}
                              className="block mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                              ))}
                            </select>
                          </div>
                          <span className="text-text-secondary mt-6">to</span>
                          <div>
                            <label className="text-sm text-text-secondary">End</label>
                            <select
                              value={settings.quietHoursEnd ?? 6}
                              onChange={e => setSettings(prev => ({ ...prev, quietHoursEnd: parseInt(e.target.value) }))}
                              className="block mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Default Fallback Image */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Default Fallback Image
                      </h3>
                      <p className="text-sm text-text-secondary mb-4">
                        Used when the blog post doesn&apos;t have an Open Graph image
                      </p>
                      <input
                        type="url"
                        value={settings.defaultImageUrl || ''}
                        onChange={e => setSettings(prev => ({ ...prev, defaultImageUrl: e.target.value || null }))}
                        placeholder="https://example.com/default-image.jpg"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </Card>

                    {/* Instagram Note */}
                    <Card className="p-6 bg-amber-50 border-amber-200">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">📱</span>
                        <div>
                          <h3 className="font-semibold text-amber-800">Instagram Note</h3>
                          <p className="text-sm text-amber-700 mt-1">
                            Links in Instagram captions are not clickable. A note will be added to direct users to your bio link. Consider using a link-in-bio service.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[
                { key: 'all', label: 'All', count: counts.total },
                { key: 'drafts', label: 'Drafts', count: counts.drafts },
                { key: 'published', label: 'Published', count: counts.published },
                { key: 'failed', label: 'Failed', count: counts.failed + counts.partial },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setPostsFilter(filter.key)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    postsFilter === filter.key
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-text-secondary hover:bg-gray-100'
                  }`}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Posts List */}
            {postsLoading ? (
              <Card className="p-8 text-center">
                <div className="animate-pulse">Loading posts...</div>
              </Card>
            ) : posts.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">No posts yet</h3>
                <p className="text-text-secondary">
                  {settings.enabled
                    ? 'New blog posts from your RSS feeds will appear here when detected.'
                    : 'Enable Blog Auto-Share to start automatically sharing your blog posts.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
                  <Card key={post.id} className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      {post.ogImage && (
                        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={post.ogImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-text-primary truncate">
                              {post.articleTitle}
                            </h4>
                            <p className="text-sm text-text-secondary mt-1">
                              From: {post.rssFeedItem.feed.feedTitle || post.rssFeedItem.feed.name}
                            </p>
                          </div>
                          {getStatusBadge(post.status)}
                        </div>

                        {post.articleExcerpt && (
                          <p className="text-sm text-text-secondary mt-2 line-clamp-2">
                            {post.articleExcerpt}
                          </p>
                        )}

                        {/* Platform Results */}
                        {post.platformResults && post.platformResults.length > 0 && (
                          <div className="flex items-center gap-2 mt-3">
                            {post.platformResults.map((result, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                  result.status === 'published'
                                    ? 'bg-green-100 text-green-700'
                                    : result.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                                title={result.error || undefined}
                              >
                                <PlatformLogo platform={result.platform as SocialPlatform} size="xs" variant="color" />
                                {result.status === 'published' ? '✓' : result.status === 'failed' ? '✗' : '−'}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions for Drafts */}
                        {(post.status === 'DRAFT' || post.status === 'QUEUED') && (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleApproveDraft(post.id)}
                              className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                            >
                              Approve & Publish
                            </button>
                            <button
                              onClick={() => handleDismissDraft(post.id)}
                              className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
                            >
                              Dismiss
                            </button>
                            <a
                              href={post.articleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 text-purple-600 text-sm hover:text-purple-700"
                            >
                              View Article →
                            </a>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-xs text-text-tertiary mt-2">
                          {new Date(post.createdAt).toLocaleDateString()} at{' '}
                          {new Date(post.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
