'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppHeader, Card, Badge } from '@/app/components/ui';

// ============================================
// TYPES
// ============================================

interface RssFeed {
  id: string;
  name: string;
  url: string;
  feedTitle?: string;
  feedDescription?: string;
  feedImageUrl?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  lastFetchedAt?: string;
  lastError?: string;
  errorCount: number;
  createdAt: string;
  totalItems: number;
  newItems: number;
}

interface RssItem {
  id: string;
  guid: string;
  title: string;
  link?: string;
  description?: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: string;
  categories: string[];
  status: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'DISMISSED';
  feed: {
    id: string;
    name: string;
    feedImageUrl?: string;
  };
}

interface CuratedFeed {
  id: string;
  niche_key: string;
  feed_name: string;
  feed_url: string;
  source_type: 'blog' | 'newsletter' | 'news' | 'podcast';
  description: string;
  language: string;
  enabled: boolean;
  already_added: boolean;
}

interface Niche {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

// ============================================
// COMPONENT
// ============================================

export default function RssFeedsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'my-feeds' | 'discover'>('my-feeds');

  // My Feeds state
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add feed modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);
  const [addFeedError, setAddFeedError] = useState<string | null>(null);
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [validatedFeed, setValidatedFeed] = useState<{ title: string; description?: string; itemCount: number } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('NEW');
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

  // Item counts
  const [itemCounts, setItemCounts] = useState({ new: 0, reviewed: 0, converted: 0, dismissed: 0, total: 0 });

  // Discover state
  const [niches, setNiches] = useState<Niche[]>([]);
  const [curatedFeeds, setCuratedFeeds] = useState<CuratedFeed[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [addingCuratedFeed, setAddingCuratedFeed] = useState<string | null>(null);
  const [userFeedCount, setUserFeedCount] = useState(0);
  const [userFeedLimit, setUserFeedLimit] = useState(20);

  // Fetch feeds
  const fetchFeeds = useCallback(async () => {
    try {
      const response = await fetch('/api/rss/feeds');
      if (!response.ok) throw new Error('Failed to fetch feeds');
      const data = await response.json();
      setFeeds(data.feeds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
    }
  }, []);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (selectedFeedId) params.set('feedId', selectedFeedId);
      params.set('limit', '20');

      const response = await fetch(`/api/rss/items?${params}`);
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setItems(data.items || []);
      setItemCounts(data.counts || { new: 0, reviewed: 0, converted: 0, dismissed: 0, total: 0 });
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setItemsLoading(false);
    }
  }, [statusFilter, selectedFeedId]);

  // Fetch curated feeds
  const fetchCuratedFeeds = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedNiche) params.set('niche', selectedNiche);

      const response = await fetch(`/api/rss/discover?${params}`);
      if (!response.ok) throw new Error('Failed to fetch curated feeds');
      const data = await response.json();
      setNiches(data.niches || []);
      setCuratedFeeds(data.feeds || []);
      setUserFeedCount(data.userFeedCount || 0);
      setUserFeedLimit(data.userFeedLimit || 20);
    } catch (err) {
      console.error('Failed to fetch curated feeds:', err);
    } finally {
      setDiscoverLoading(false);
    }
  }, [selectedNiche]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchFeeds();
      await fetchItems();
      setLoading(false);
    };
    loadData();
  }, [fetchFeeds, fetchItems]);

  // Refetch items when filter changes
  useEffect(() => {
    if (!loading) {
      fetchItems();
    }
  }, [statusFilter, selectedFeedId, fetchItems, loading]);

  // Fetch curated feeds when discover tab is active
  useEffect(() => {
    if (activeTab === 'discover') {
      fetchCuratedFeeds();
    }
  }, [activeTab, selectedNiche, fetchCuratedFeeds]);

  // Validate feed URL
  const validateFeedUrl = async (url: string) => {
    if (!url.trim()) {
      setValidatedFeed(null);
      return;
    }

    setValidatingUrl(true);
    setAddFeedError(null);
    setValidatedFeed(null);

    try {
      const response = await fetch('/api/rss/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      if (data.valid && data.feed) {
        setValidatedFeed(data.feed);
        if (!newFeedName) {
          setNewFeedName(data.feed.title);
        }
      } else {
        setAddFeedError(data.error || 'Invalid feed URL');
      }
    } catch {
      setAddFeedError('Failed to validate URL');
    } finally {
      setValidatingUrl(false);
    }
  };

  // Add new feed
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    setAddingFeed(true);
    setAddFeedError(null);

    try {
      const response = await fetch('/api/rss/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newFeedUrl.trim(),
          name: newFeedName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add feed');
      }

      // Success - close modal and refresh
      setShowAddModal(false);
      setNewFeedUrl('');
      setNewFeedName('');
      setValidatedFeed(null);
      await fetchFeeds();
      await fetchItems();
    } catch (err) {
      setAddFeedError(err instanceof Error ? err.message : 'Failed to add feed');
    } finally {
      setAddingFeed(false);
    }
  };

  // Add curated feed
  const handleAddCuratedFeed = async (feedId: string) => {
    setAddingCuratedFeed(feedId);
    try {
      const response = await fetch('/api/rss/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add feed');
      }

      // Refresh both views
      await fetchFeeds();
      await fetchCuratedFeeds();
    } catch (err) {
      console.error('Failed to add curated feed:', err);
    } finally {
      setAddingCuratedFeed(null);
    }
  };

  // Refresh a feed
  const refreshFeed = async (feedId: string) => {
    try {
      const response = await fetch(`/api/rss/feeds/${feedId}/refresh`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        await fetchFeeds();
        await fetchItems();
      }
    } catch (err) {
      console.error('Failed to refresh feed:', err);
    }
  };

  // Delete a feed
  const deleteFeed = async (feedId: string) => {
    if (!confirm('Are you sure you want to delete this feed and all its items?')) {
      return;
    }

    try {
      const response = await fetch(`/api/rss/feeds/${feedId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchFeeds();
        if (selectedFeedId === feedId) {
          setSelectedFeedId(null);
        }
        await fetchItems();
      }
    } catch (err) {
      console.error('Failed to delete feed:', err);
    }
  };

  // Update item status
  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      const response = await fetch('/api/rss/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [itemId], status }),
      });

      if (response.ok) {
        await fetchItems();
      }
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'PAUSED':
        return <Badge variant="gray">Paused</Badge>;
      case 'ERROR':
        return <Badge variant="error">Error</Badge>;
      case 'NEW':
        return <Badge variant="primary">New</Badge>;
      case 'REVIEWED':
        return <Badge variant="gray">Reviewed</Badge>;
      case 'CONVERTED':
        return <Badge variant="success">Converted</Badge>;
      case 'DISMISSED':
        return <Badge variant="gray">Dismissed</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  // Source type badge
  const getSourceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      blog: 'bg-blue-100 text-blue-700',
      newsletter: 'bg-purple-100 text-purple-700',
      news: 'bg-red-100 text-red-700',
      podcast: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader currentPage="rss" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="rss" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">RSS Feeds</h1>
            <p className="text-text-secondary mt-1">
              Import content from your favorite sources
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Feed
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('my-feeds')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my-feeds'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            My Feeds ({feeds.length})
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'discover'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Discover
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* My Feeds Tab */}
        {activeTab === 'my-feeds' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feeds Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-4">
                <h2 className="font-semibold text-text-primary mb-4">Your Feeds</h2>

                {feeds.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📡</div>
                    <p className="text-text-secondary text-sm">No feeds yet</p>
                    <button
                      onClick={() => setActiveTab('discover')}
                      className="text-primary text-sm font-medium mt-2 hover:underline"
                    >
                      Discover feeds to add
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* All feeds option */}
                    <button
                      onClick={() => setSelectedFeedId(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedFeedId === null
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-gray-50 text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">All Feeds</span>
                        <span className="text-sm text-text-secondary">{itemCounts.total}</span>
                      </div>
                    </button>

                    {feeds.map((feed) => (
                      <div
                        key={feed.id}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          selectedFeedId === feed.id
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedFeedId(feed.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start gap-2">
                            {feed.feedImageUrl ? (
                              <img
                                src={feed.feedImageUrl}
                                alt=""
                                className="w-6 h-6 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs">📰</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{feed.name}</span>
                                {feed.newItems > 0 && (
                                  <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {feed.newItems}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {getStatusBadge(feed.status)}
                                <span className="text-xs text-text-secondary">
                                  {formatDate(feed.lastFetchedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Feed actions */}
                        <div className="flex items-center gap-1 mt-2 ml-8">
                          <button
                            onClick={() => refreshFeed(feed.id)}
                            className="p-1 text-text-secondary hover:text-primary transition-colors"
                            title="Refresh now"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <a
                            href={feed.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-text-secondary hover:text-primary transition-colors"
                            title="View feed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button
                            onClick={() => deleteFeed(feed.id)}
                            className="p-1 text-text-secondary hover:text-red-500 transition-colors"
                            title="Delete feed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Items List */}
            <div className="lg:col-span-2">
              <Card className="p-4">
                {/* Filter tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['NEW', 'REVIEWED', 'CONVERTED', 'DISMISSED'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                      {' '}
                      <span className="opacity-75">
                        ({itemCounts[status.toLowerCase() as keyof typeof itemCounts] || 0})
                      </span>
                    </button>
                  ))}
                </div>

                {/* Items */}
                {itemsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-text-secondary">No items found</p>
                    {feeds.length === 0 && (
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="text-primary text-sm font-medium mt-2 hover:underline"
                      >
                        Add feeds to get started
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                            />
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-text-primary line-clamp-2">
                                  {item.link ? (
                                    <a
                                      href={item.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-primary transition-colors"
                                    >
                                      {item.title}
                                    </a>
                                  ) : (
                                    item.title
                                  )}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-text-secondary">{item.feed.name}</span>
                                  <span className="text-xs text-text-secondary">•</span>
                                  <span className="text-xs text-text-secondary">
                                    {formatDate(item.publishedAt)}
                                  </span>
                                </div>
                              </div>
                              {getStatusBadge(item.status)}
                            </div>

                            {item.description && (
                              <p className="text-sm text-text-secondary mt-2 line-clamp-2">
                                {item.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              {item.status === 'NEW' && (
                                <>
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'REVIEWED')}
                                    className="text-xs px-2 py-1 bg-gray-100 text-text-secondary rounded hover:bg-gray-200 transition-colors"
                                  >
                                    Mark Reviewed
                                  </button>
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'DISMISSED')}
                                    className="text-xs px-2 py-1 bg-gray-100 text-text-secondary rounded hover:bg-gray-200 transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                              {item.status === 'REVIEWED' && (
                                <Link
                                  href={`/upload?rssItemId=${item.id}`}
                                  className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                                >
                                  Create Content
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div>
            {/* Feed limit indicator */}
            <div className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
              <span>Your feeds: {userFeedCount} / {userFeedLimit}</span>
              {userFeedCount >= userFeedLimit && (
                <Badge variant="warning">Limit reached</Badge>
              )}
            </div>

            {/* Niche filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedNiche(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedNiche === null
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {niches.map((niche) => (
                <button
                  key={niche.key}
                  onClick={() => setSelectedNiche(niche.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedNiche === niche.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {niche.emoji} {niche.label}
                </button>
              ))}
            </div>

            {/* Curated feeds grid */}
            {discoverLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {curatedFeeds.map((feed) => (
                  <Card key={feed.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-text-primary">{feed.feed_name}</h3>
                      {getSourceTypeBadge(feed.source_type)}
                    </div>
                    <p className="text-sm text-text-secondary mb-3">{feed.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">
                        {niches.find(n => n.key === feed.niche_key)?.emoji} {niches.find(n => n.key === feed.niche_key)?.label}
                      </span>
                      {feed.already_added ? (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddCuratedFeed(feed.id)}
                          disabled={addingCuratedFeed === feed.id || userFeedCount >= userFeedLimit}
                          className="text-xs px-3 py-1 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                          {addingCuratedFeed === feed.id ? 'Adding...' : '+ Add'}
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {!discoverLoading && curatedFeeds.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-text-secondary">No feeds found for this category</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Feed Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">Add RSS Feed</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewFeedUrl('');
                  setNewFeedName('');
                  setValidatedFeed(null);
                  setAddFeedError(null);
                }}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddFeed}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Feed URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      onBlur={() => validateFeedUrl(newFeedUrl)}
                      placeholder="https://example.com/feed.xml"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                    {validatingUrl && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    )}
                  </div>
                </div>

                {validatedFeed && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">{validatedFeed.title}</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      {validatedFeed.itemCount} items available
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    placeholder={validatedFeed?.title || 'Custom name for this feed'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {addFeedError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {addFeedError}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewFeedUrl('');
                    setNewFeedName('');
                    setValidatedFeed(null);
                    setAddFeedError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-text-primary rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingFeed || !newFeedUrl.trim()}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {addingFeed ? 'Adding...' : 'Add Feed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
