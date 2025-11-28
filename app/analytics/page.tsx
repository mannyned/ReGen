'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type TimeRange = '7' | '30' | '90' | '365'
type PlanType = 'creator' | 'pro'

interface AIRecommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  icon: string
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30')
  const [userPlan, setUserPlan] = useState<PlanType>('creator')

  // Load user plan from localStorage
  useEffect(() => {
    const savedPlan = localStorage.getItem('userPlan')
    if (savedPlan === 'pro') {
      setUserPlan('pro')
    }
  }, [])

  const platformData = [
    { platform: 'Instagram', posts: 24, engagement: 12.5, reach: 5200, growth: 2.3, bestTime: '6PM-8PM' },
    { platform: 'Twitter', posts: 45, engagement: 8.3, reach: 3800, growth: -1.2, bestTime: '12PM-2PM' },
    { platform: 'LinkedIn', posts: 18, engagement: 15.2, reach: 2900, growth: 5.7, bestTime: '9AM-11AM' },
    { platform: 'Facebook', posts: 32, engagement: 6.8, reach: 4100, growth: 0.8, bestTime: '7PM-9PM' },
    { platform: 'TikTok', posts: 28, engagement: 18.7, reach: 6500, growth: 8.9, bestTime: '5PM-7PM' }
  ]

  const topFormats = [
    { type: 'Video', count: 42, avgEngagement: 14.2, trend: 'up' },
    { type: 'Image', count: 38, avgEngagement: 11.5, trend: 'stable' },
    { type: 'Text', count: 27, avgEngagement: 8.9, trend: 'down' }
  ]

  // AI Recommendations for Pro Plan
  const aiRecommendations: AIRecommendation[] = [
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

  // Advanced metrics for Pro Plan
  const advancedMetrics = {
    sentimentScore: 78,
    audienceRetention: 65,
    viralityScore: 42,
    contentVelocity: 3.2,
    crossPlatformSynergy: 85,
    hashtagPerformance: 72
  }

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
              <Link href="/settings" className="text-text-secondary hover:text-primary transition-colors">Settings</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Plan Badge */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold text-text-primary">Analytics Dashboard</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                userPlan === 'pro'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {userPlan === 'pro' ? '⭐ PRO' : '🌟 CREATOR'}
              </span>
            </div>
            <p className="text-text-secondary">
              {userPlan === 'pro'
                ? 'Advanced analytics with AI-powered recommendations'
                : 'Track your content performance across platforms'
              }
            </p>
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

        {/* AI Recommendations - Pro Plan Only */}
        {userPlan === 'pro' && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>🤖</span>
                  AI-Powered Recommendations
                </h2>
                <p className="text-white/90 mt-1">Personalized insights to boost your performance</p>
              </div>
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
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
          </div>
        )}

        {/* Upgrade Prompt - Creator Plan Only */}
        {userPlan === 'creator' && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">🚀</span>
                <div>
                  <h3 className="font-bold text-gray-900">Unlock Advanced Analytics</h3>
                  <p className="text-sm text-gray-600">
                    Get AI recommendations, sentiment analysis, and advanced metrics with Pro Plan
                  </p>
                </div>
              </div>
              <Link
                href="/settings"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        )}

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

        {/* Advanced Metrics - Pro Plan Only */}
        {userPlan === 'pro' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">😊</span>
                <span className="text-xs text-text-secondary font-medium">Sentiment</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{advancedMetrics.sentimentScore}%</p>
              <p className="text-xs text-green-600">Positive</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">👁️</span>
                <span className="text-xs text-text-secondary font-medium">Retention</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{advancedMetrics.audienceRetention}%</p>
              <p className="text-xs text-text-secondary">Avg watch</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔥</span>
                <span className="text-xs text-text-secondary font-medium">Virality</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{advancedMetrics.viralityScore}</p>
              <p className="text-xs text-orange-600">Score</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚡</span>
                <span className="text-xs text-text-secondary font-medium">Velocity</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{advancedMetrics.contentVelocity}</p>
              <p className="text-xs text-text-secondary">Posts/day</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔗</span>
                <span className="text-xs text-text-secondary font-medium">Cross-Platform</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{advancedMetrics.crossPlatformSynergy}%</p>
              <p className="text-xs text-blue-600">Synergy</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">#️⃣</span>
                <span className="text-xs text-text-secondary font-medium">Hashtags</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{advancedMetrics.hashtagPerformance}%</p>
              <p className="text-xs text-purple-600">Performance</p>
            </div>
          </div>
        )}

        {/* Platform Performance */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Platform Performance</h2>
            {userPlan === 'creator' && (
              <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                🔒 Pro: Unlock best posting times
              </span>
            )}
          </div>
          <div className="space-y-6">
            {platformData.map((platform) => (
              <div key={platform.platform}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-text-primary">{platform.platform}</span>
                  <div className="flex items-center gap-4">
                    {userPlan === 'pro' && (
                      <>
                        <span className="text-xs text-text-secondary">
                          Best time: <span className="font-medium text-primary">{platform.bestTime}</span>
                        </span>
                        <span className={`text-xs font-medium ${
                          platform.growth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {platform.growth > 0 ? '↑' : '↓'} {Math.abs(platform.growth)}%
                        </span>
                      </>
                    )}
                    <span className="text-sm text-text-secondary">{platform.posts} posts</span>
                  </div>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Top Formats</h2>
              {userPlan === 'creator' && (
                <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  🔒 Pro: See trends
                </span>
              )}
            </div>
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
                            format.trend === 'down' ? 'text-red-600' : 'text-gray-600'
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

        {/* Content Calendar Insights - Pro Plan Only */}
        {userPlan === 'pro' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-bold text-text-primary mb-6">📅 Content Calendar Insights</h2>
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
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'Post published on Instagram', time: '2 hours ago', icon: '📷', performance: userPlan === 'pro' ? '+15% above average' : null },
              { action: 'AI caption generated', time: '4 hours ago', icon: '✨', performance: userPlan === 'pro' ? 'Predicted engagement: 14.2%' : null },
              { action: 'Post scheduled for LinkedIn', time: '6 hours ago', icon: '💼', performance: userPlan === 'pro' ? 'Optimal time selected' : null },
              { action: 'Video uploaded', time: '1 day ago', icon: '🎬', performance: userPlan === 'pro' ? '92% quality score' : null }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-4 hover:bg-background rounded-lg transition-colors">
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
        </div>

        {/* Plan Switcher for Testing */}
        <div className="mt-12 p-6 bg-gray-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Test Different Plans (Development Only)</p>
              <p className="text-xs text-gray-500">This switcher is for testing purposes only</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setUserPlan('creator')
                  localStorage.setItem('userPlan', 'creator')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  userPlan === 'creator'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Creator Plan
              </button>
              <button
                onClick={() => {
                  setUserPlan('pro')
                  localStorage.setItem('userPlan', 'pro')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  userPlan === 'pro'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pro Plan
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}