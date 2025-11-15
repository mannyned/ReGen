'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-teal-600">
              🚀 ReGen
            </Link>
            <nav className="flex gap-6">
              <Link href="/upload" className="text-gray-600 hover:text-gray-900">Upload</Link>
              <Link href="/generate" className="text-gray-600 hover:text-gray-900">Generate</Link>
              <Link href="/schedule" className="text-gray-600 hover:text-gray-900">Schedule</Link>
              <Link href="/analytics" className="text-teal-600 font-semibold">Analytics</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your content performance across platforms</p>
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
                    ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
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
              <span className="text-gray-600 font-medium">Total Posts</span>
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">147</p>
            <p className="text-sm text-teal-600 font-medium">+12% from last period</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Total Reach</span>
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">22.5K</p>
            <p className="text-sm text-teal-600 font-medium">+24% from last period</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Avg Engagement</span>
              <span className="text-3xl">❤️</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">12.3%</p>
            <p className="text-sm text-teal-600 font-medium">+5.2% from last period</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">AI Generated</span>
              <span className="text-3xl">✨</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">89</p>
            <p className="text-sm text-gray-600">60% of total posts</p>
          </div>
        </div>

        {/* Platform Performance */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Performance</h2>
          <div className="space-y-6">
            {platformData.map((platform) => (
              <div key={platform.platform}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">{platform.platform}</span>
                  <span className="text-sm text-gray-600">{platform.posts} posts</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Engagement Rate</p>
                    <p className="text-lg font-bold text-teal-600">{platform.engagement}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Reach</p>
                    <p className="text-lg font-bold text-gray-900">{platform.reach.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Avg per Post</p>
                    <p className="text-lg font-bold text-gray-900">{Math.round(platform.reach / platform.posts)}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full transition-all"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Formats</h2>
            <div className="space-y-6">
              {topFormats.map((format, index) => (
                <div key={format.type} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 text-teal-600 font-bold text-lg">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{format.type}</span>
                      <span className="text-sm font-medium text-teal-600">{format.avgEngagement}%</span>
                    </div>
                    <p className="text-sm text-gray-600">{format.count} posts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Impact */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Impact</h2>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700 font-medium">With AI Captions</span>
                  <span className="text-3xl">✨</span>
                </div>
                <p className="text-4xl font-bold text-teal-600 mb-2">14.8%</p>
                <p className="text-sm text-gray-700">Average engagement rate</p>
              </div>

              <div className="bg-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700 font-medium">Without AI Captions</span>
                  <span className="text-3xl">📝</span>
                </div>
                <p className="text-4xl font-bold text-gray-600 mb-2">11.2%</p>
                <p className="text-sm text-gray-700">Average engagement rate</p>
              </div>

              <div className="bg-gradient-to-r from-teal-400 to-teal-600 rounded-xl p-6 text-white">
                <p className="text-sm font-medium mb-1">Performance Improvement</p>
                <p className="text-5xl font-bold">+32%</p>
                <p className="text-sm mt-2 opacity-90">AI captions perform significantly better</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'Post published on Instagram', time: '2 hours ago', icon: '📷' },
              { action: 'AI caption generated', time: '4 hours ago', icon: '✨' },
              { action: 'Post scheduled for LinkedIn', time: '6 hours ago', icon: '💼' },
              { action: 'Video uploaded', time: '1 day ago', icon: '🎬' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <span className="text-3xl">{activity.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
