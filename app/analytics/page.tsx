'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type TimeRange = '7' | '30' | '90' | '365'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30')

  const platformData = [
    { platform: 'Instagram', posts: 24, engagement: 12.5, reach: 5200 },
    { platform: 'Twitter', posts: 45, engagement: 8.3, reach: 3800 },
    { platform: 'LinkedIn', posts: 18, engagement: 15.2, reach: 2900 },
    { platform: 'Facebook', posts: 32, engagement: 6.8, reach: 4100 },
    { platform: 'TikTok', posts: 28, engagement: 18.7, reach: 6500 }
  ]

  const topFormats = [
    { type: 'Video', count: 42, avgEngagement: 14.2 },
    { type: 'Image', count: 38, avgEngagement: 11.5 },
    { type: 'Text', count: 27, avgEngagement: 8.9 }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/logo.png" alt="ReGen Logo" width={168} height={168} className="object-contain" />
                <span className="text-2xl font-bold text-primary">ReGen</span>
              </Link>
              <span className="text-text-secondary text-sm">/ Analytics</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/upload" className="text-text-secondary hover:text-primary transition-colors">Upload</Link>
              <Link href="/analytics" className="text-primary font-semibold">Analytics</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-2">Analytics Dashboard</h1>
            <p className="text-text-secondary">Track your content performance across platforms</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1">
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
                    ? 'bg-primary text-white shadow hover:bg-primary-hover'
                    : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary font-medium">Total Posts</span>
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-text-primary mb-1">147</p>
            <p className="text-sm text-primary font-medium">+12% from last period</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary font-medium">Total Reach</span>
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-4xl font-bold text-text-primary mb-1">22.5K</p>
            <p className="text-sm text-primary font-medium">+24% from last period</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary font-medium">Avg Engagement</span>
              <span className="text-3xl">❤️</span>
            </div>
            <p className="text-4xl font-bold text-text-primary mb-1">12.3%</p>
            <p className="text-sm text-primary font-medium">+5.2% from last period</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary font-medium">AI Generated</span>
              <span className="text-3xl">✨</span>
            </div>
            <p className="text-4xl font-bold text-text-primary mb-1">89</p>
            <p className="text-sm text-text-secondary">60% of total posts</p>
          </div>
        </div>

        {/* Platform Performance */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Platform Performance</h2>
          <div className="space-y-6">
            {platformData.map((platform) => (
              <div key={platform.platform}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-text-primary">{platform.platform}</span>
                  <span className="text-sm text-text-secondary">{platform.posts} posts</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Engagement Rate</p>
                    <p className="text-lg font-bold text-primary">{platform.engagement}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Reach</p>
                    <p className="text-lg font-bold text-text-primary">{platform.reach.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Avg per Post</p>
                    <p className="text-lg font-bold text-text-primary">{Math.round(platform.reach / platform.posts)}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-primary h-3 rounded-full transition-all"
                    style={{ width: `${platform.engagement * 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performing Formats */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Top Formats</h2>
            <div className="space-y-6">
              {topFormats.map((format, index) => (
                <div key={format.type} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-text-primary">{format.type}</span>
                      <span className="text-sm font-medium text-primary">{format.avgEngagement}%</span>
                    </div>
                    <p className="text-sm text-text-secondary">{format.count} posts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Impact */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-text-primary mb-6">AI Impact</h2>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-text-primary font-medium">With AI Captions</span>
                  <span className="text-3xl">✨</span>
                </div>
                <p className="text-4xl font-bold text-primary mb-2">14.8%</p>
                <p className="text-sm text-text-primary">Average engagement rate</p>
              </div>

              <div className="bg-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-text-primary font-medium">Without AI Captions</span>
                  <span className="text-3xl">📝</span>
                </div>
                <p className="text-4xl font-bold text-text-secondary mb-2">11.2%</p>
                <p className="text-sm text-text-primary">Average engagement rate</p>
              </div>

              <div className="gradient-brand rounded-xl p-6 text-white">
                <p className="text-sm font-medium mb-1">Performance Improvement</p>
                <p className="text-5xl font-bold">+32%</p>
                <p className="text-sm mt-2 opacity-90">AI captions perform significantly better</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'Post published on Instagram', time: '2 hours ago', icon: '📷' },
              { action: 'AI caption generated', time: '4 hours ago', icon: '✨' },
              { action: 'Post scheduled for LinkedIn', time: '6 hours ago', icon: '💼' },
              { action: 'Video uploaded', time: '1 day ago', icon: '🎬' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-4 hover:bg-background rounded-lg transition-colors">
                <span className="text-3xl">{activity.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{activity.action}</p>
                  <p className="text-sm text-text-secondary">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
