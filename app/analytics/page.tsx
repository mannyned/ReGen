'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppHeader, Card, StatCard, GradientBanner, Badge, PlatformLogo, Tooltip, MetricTooltips } from '../components/ui'
import { ExportAnalytics } from '../components/ExportAnalytics'
import type { SocialPlatform } from '@/lib/types/social'

type TimeRange = '7' | '30' | '90' | '365'
type PlanType = 'free' | 'creator' | 'pro'

// Map display names to platform IDs
const PLATFORM_ID_MAP: Record<string, SocialPlatform> = {
  'Instagram': 'instagram',
  'Twitter': 'twitter',
  'LinkedIn': 'linkedin',
  'Facebook': 'facebook',
  'TikTok': 'tiktok',
  'YouTube': 'youtube',
  'Snapchat': 'snapchat',
}

interface AIRecommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  icon: string
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30')
  const [userPlan, setUserPlan] = useState<PlanType>('free')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedPlan = localStorage.getItem('userPlan')
    if (savedPlan === 'pro') {
      setUserPlan('pro')
    } else if (savedPlan === 'creator') {
      setUserPlan('creator')
    } else {
      setUserPlan('free')
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

  const advancedMetrics = {
    sentimentScore: 78,
    audienceRetention: 65,
    viralityScore: 42,
    contentVelocity: 3.2,
    crossPlatformSynergy: 85,
    hashtagPerformance: 72
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="analytics" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* FREE USER - Full Page Upgrade Gate */}
        {userPlan === 'free' ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in">
            {/* Lock Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent-purple/20 rounded-full flex items-center justify-center mb-8 animate-float">
              <span className="text-5xl">🔒</span>
            </div>

            <h1 className="text-4xl font-bold text-text-primary mb-4 text-center">Unlock Analytics</h1>
            <p className="text-text-secondary text-lg mb-12 text-center max-w-xl">
              Get detailed insights into your content performance, audience engagement, and AI-powered recommendations.
            </p>

            {/* Plan Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mb-12">
              {/* Creator Plan */}
              <Card className="p-8 border-2 border-gray-200 hover:border-primary transition-colors" hover={false}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🌟</span>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">Creator Plan</h3>
                    <p className="text-primary font-semibold">$9/month</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {['Save Rate Analytics', 'Platform Performance', 'Top Formats Analysis', 'AI Impact Insights', 'Unlimited Uploads'].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-text-secondary">
                      <span className="text-green-500 text-lg">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/settings" className="block w-full py-3 btn-primary text-center">
                  Upgrade to Creator
                </Link>
              </Card>

              {/* Pro Plan */}
              <Card className="p-8 border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 relative" hover={false}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                  BEST VALUE
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">Pro Plan</h3>
                    <p className="text-purple-600 font-semibold">$29/month</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3 text-text-secondary">
                    <span className="text-green-500 text-lg">✓</span>
                    <span>Everything in Creator, plus:</span>
                  </li>
                  {['Location Analytics', 'Retention Graphs & Hook Scoring', 'AI-Powered Recommendations', 'Advanced Metrics & Calendar'].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-text-secondary">
                      <span className="text-purple-500 text-lg">⭐</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/settings" className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  Upgrade to Pro
                </Link>
              </Card>
            </div>

            {/* Preview Tags */}
            <div className="text-center">
              <p className="text-text-secondary text-sm mb-4">See what you're missing:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { icon: '📊', text: 'Performance Tracking' },
                  { icon: '📌', text: 'Save Rate Analysis' },
                  { icon: '🌍', text: 'Location Insights' },
                  { icon: '🤖', text: 'AI Recommendations' }
                ].map(({ icon, text }) => (
                  <Badge key={text} variant="gray" className="px-4 py-2">
                    {icon} {text}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Plan Switcher for Testing */}
            <div className="mt-16 p-6 bg-gray-100 rounded-xl w-full max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary mb-1">Test Different Plans (Development Only)</p>
                  <p className="text-xs text-text-secondary/70">This switcher is for testing purposes only</p>
                </div>
                <div className="flex gap-2">
                  {(['free', 'creator', 'pro'] as PlanType[]).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => {
                        setUserPlan(plan)
                        localStorage.setItem('userPlan', plan)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                        userPlan === plan
                          ? plan === 'pro'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : plan === 'creator'
                            ? 'bg-primary text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-white text-text-secondary hover:bg-gray-50'
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 animate-fade-in">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">Analytics Dashboard</h1>
                  <Badge variant={userPlan === 'pro' ? 'primary' : 'gray'} className={userPlan === 'pro' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}>
                    {userPlan === 'pro' ? '⭐ PRO' : '🌟 CREATOR'}
                  </Badge>
                </div>
                <p className="text-text-secondary text-lg">
                  {userPlan === 'pro'
                    ? 'Advanced analytics with AI-powered recommendations'
                    : 'Track your content performance across platforms'}
                </p>
              </div>

              {/* Time Range Selector and Export Button */}
              <div className="flex items-center gap-4">
                <div className="flex gap-2 bg-white rounded-xl shadow-sm p-1.5">
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
                          ? 'bg-primary text-white shadow-md'
                          : 'text-text-secondary hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Export Analytics Button - PRO Only */}
                <ExportAnalytics
                  userId="demo-user-id"
                  userPlan={userPlan}
                  onExportComplete={(jobId, format) => {
                    console.log(`Export completed: ${jobId} (${format})`)
                  }}
                />
              </div>
            </div>

            {/* AI Recommendations - Pro Plan Only */}
            {userPlan === 'pro' && (
              <GradientBanner className="mb-8 animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span>🤖</span>
                      AI-Powered Recommendations
                    </h2>
                    <p className="text-white/90 mt-1">Personalized insights to boost your performance</p>
                  </div>
                  <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm">
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
              </GradientBanner>
            )}

            {/* Pro Features Section - Creator Plan Only */}
            {userPlan === 'creator' && (
              <Card className="p-6 mb-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-2 border-purple-200" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">⭐</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-lg">Unlock Pro Analytics</h3>
                      <p className="text-sm text-text-secondary">Get these powerful features with Pro Plan</p>
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
                  >
                    Upgrade to Pro - $29/mo
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { href: '/analytics/location', icon: '🌍', title: 'Location Analytics', desc: 'See where your audience engages by country, region & city' },
                    { href: '/analytics/retention', icon: '📊', title: 'Retention Graphs', desc: 'Video retention curves, drop-off detection & hook scoring' },
                    { href: null, icon: '🤖', title: 'AI Recommendations', desc: 'Personalized insights to boost your performance' },
                    { href: null, icon: '📈', title: 'Advanced Metrics', desc: 'Sentiment, virality score, hashtag performance & more' },
                    { href: null, icon: '⏰', title: 'Best Posting Times', desc: 'Optimal times for each platform based on your audience' },
                    { href: null, icon: '📅', title: 'Calendar Insights', desc: 'Peak days, optimal frequency & content mix analysis' }
                  ].map((feature) => {
                    const content = (
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{feature.icon}</span>
                          <h4 className="font-semibold text-text-primary group-hover:text-purple-600 transition-colors">{feature.title}</h4>
                        </div>
                        <p className="text-sm text-text-secondary">{feature.desc}</p>
                      </div>
                    )
                    return feature.href ? (
                      <Link key={feature.title} href={feature.href} className="group">{content}</Link>
                    ) : (
                      <div key={feature.title}>{content}</div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard label="Total Posts" value="147" icon="📊" trend={{ value: 12, positive: true }} />
              <StatCard label="Total Reach" value="22.5K" icon="👥" trend={{ value: 24, positive: true }} />
              <StatCard label="Avg Engagement" value="12.3%" icon="❤️" trend={{ value: 5.2, positive: true }} />
              <StatCard label="AI Generated" value="89" icon="✨" subtitle="60% of total posts" />
            </div>

            {/* Feature Cards */}
            {userPlan === 'pro' && (
              <Link href="/analytics/location" className="block mb-6 group">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-6 hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl group-hover:scale-[1.01] transform">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">🌍</div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">Location of Engagement</h3>
                        <p className="text-white/90 text-sm">See where your audience engages the most — by country, region, and city</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="text-2xl font-bold">47</p>
                        <p className="text-xs text-white/80">Countries</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-2xl font-bold">234</p>
                        <p className="text-xs text-white/80">Cities</p>
                      </div>
                      <div className="ml-4 bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {(userPlan === 'creator' || userPlan === 'pro') && (
              <Link href="/analytics/save-rate" className="block mb-6 group">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-6 hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl group-hover:scale-[1.01] transform">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">📌</div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">Save Rate Analytics</h3>
                        <p className="text-white/90 text-sm">Track how often your content gets saved — by format and platform</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="text-2xl font-bold">2.9%</p>
                        <p className="text-xs text-white/80">Avg Save Rate</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-2xl font-bold">4,520</p>
                        <p className="text-xs text-white/80">Total Saves</p>
                      </div>
                      <div className="ml-4 bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {userPlan === 'pro' && (
              <Link href="/analytics/retention" className="block mb-8 group">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-6 hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl group-hover:scale-[1.01] transform">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">📊</div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">Retention Graph Analytics</h3>
                        <p className="text-white/90 text-sm">See exactly where viewers drop off and optimize your hooks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="text-2xl font-bold">82%</p>
                        <p className="text-xs text-white/80">Hook Score</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-2xl font-bold">28%</p>
                        <p className="text-xs text-white/80">Completion</p>
                      </div>
                      <div className="ml-4 bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Advanced Metrics - Pro Plan Only */}
            {userPlan === 'pro' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[
                  { icon: '😊', label: 'Sentiment', value: advancedMetrics.sentimentScore, suffix: '%', color: 'text-green-600', sublabel: 'Positive', tooltipKey: 'sentiment' as const },
                  { icon: '👁️', label: 'Retention', value: advancedMetrics.audienceRetention, suffix: '%', color: 'text-text-secondary', sublabel: 'Avg watch', tooltipKey: 'retention' as const },
                  { icon: '🔥', label: 'Virality', value: advancedMetrics.viralityScore, suffix: '', color: 'text-orange-600', sublabel: 'Score', tooltipKey: 'virality' as const },
                  { icon: '⚡', label: 'Velocity', value: advancedMetrics.contentVelocity, suffix: '', color: 'text-text-secondary', sublabel: 'Posts/day', tooltipKey: 'velocity' as const },
                  { icon: '🔗', label: 'Cross-Platform', value: advancedMetrics.crossPlatformSynergy, suffix: '%', color: 'text-blue-600', sublabel: 'Synergy', tooltipKey: 'crossPlatform' as const },
                  { icon: '#️⃣', label: 'Hashtags', value: advancedMetrics.hashtagPerformance, suffix: '%', color: 'text-purple-600', sublabel: 'Performance', tooltipKey: 'hashtags' as const }
                ].map((metric) => (
                  <Card key={metric.label} className="p-4" hover={false}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{metric.icon}</span>
                      <Tooltip
                        title={MetricTooltips[metric.tooltipKey].title}
                        content={MetricTooltips[metric.tooltipKey].content}
                        position="top"
                      >
                        <span className="text-xs text-text-secondary font-medium">{metric.label}</span>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">{metric.value}{metric.suffix}</p>
                    <p className={`text-xs ${metric.color}`}>{metric.sublabel}</p>
                  </Card>
                ))}
              </div>
            )}

            {/* Platform Performance */}
            <Card className="p-6 lg:p-8 mb-8" hover={false}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Platform Performance</h2>
                {userPlan === 'creator' && (
                  <Badge variant="primary" className="bg-purple-100 text-purple-700">
                    🔒 Pro: Unlock best posting times
                  </Badge>
                )}
              </div>
              <div className="space-y-6">
                {platformData.map((platform) => (
                  <div key={platform.platform}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PlatformLogo
                          platform={PLATFORM_ID_MAP[platform.platform]}
                          size="sm"
                          variant="color"
                        />
                        <span className="font-semibold text-text-primary">{platform.platform}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {userPlan === 'pro' && (
                          <>
                            <span className="text-xs text-text-secondary">
                              Best time: <span className="font-medium text-primary">{platform.bestTime}</span>
                            </span>
                            <span className={`text-xs font-medium ${platform.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-primary h-3 rounded-full transition-all duration-500"
                        style={{ width: `${platform.engagement * 5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Performing Formats */}
              <Card className="p-6 lg:p-8" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-text-primary">Top Formats</h2>
                  {userPlan === 'creator' && (
                    <Badge variant="primary" className="bg-purple-100 text-purple-700">
                      🔒 Pro: See trends
                    </Badge>
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
                                format.trend === 'down' ? 'text-red-600' : 'text-text-secondary'
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
              </Card>

              {/* AI Impact */}
              <Card className="p-6 lg:p-8" hover={false}>
                <h2 className="text-2xl font-bold text-text-primary mb-6">AI Impact</h2>
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-text-primary font-medium">With AI Captions</span>
                      <span className="text-3xl">✨</span>
                    </div>
                    <p className="text-4xl font-bold text-primary mb-2">14.8%</p>
                    <p className="text-sm text-text-secondary">Average engagement rate</p>
                  </div>

                  <div className="bg-gray-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-text-primary font-medium">Without AI Captions</span>
                      <span className="text-3xl">📝</span>
                    </div>
                    <p className="text-4xl font-bold text-text-secondary mb-2">11.2%</p>
                    <p className="text-sm text-text-secondary">Average engagement rate</p>
                  </div>

                  <GradientBanner className="!p-6">
                    <p className="text-sm font-medium mb-1">Performance Improvement</p>
                    <p className="text-5xl font-bold">+32%</p>
                    <p className="text-sm mt-2 opacity-90">AI captions perform significantly better</p>
                  </GradientBanner>
                </div>
              </Card>
            </div>

            {/* Caption Usage Analytics Teaser - Creator Plan Only */}
            {userPlan === 'creator' && (
              <Card className="p-6 lg:p-8 mt-8 relative overflow-hidden" hover={false}>
                {/* Blur overlay */}
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📝</span>
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Caption Usage Analytics</h3>
                    <p className="text-text-secondary mb-4 max-w-md">
                      See how your identical vs adapted captions perform. Pro users see +32% better engagement with adapted captions.
                    </p>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                      <span>⭐</span>
                      Upgrade to Pro
                    </Link>
                  </div>
                </div>

                {/* Blurred preview content */}
                <div className="opacity-50">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-text-primary">📝 Caption Usage Analytics</h2>
                      <p className="text-sm text-text-secondary mt-1">Compare performance of identical vs adapted captions</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">--</p>
                      <p className="text-sm text-green-700 font-medium">Identical</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-purple-600">--</p>
                      <p className="text-sm text-purple-700 font-medium">Adapted</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">--</p>
                      <p className="text-sm text-blue-700 font-medium">Edited</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-orange-600">--</p>
                      <p className="text-sm text-orange-700 font-medium">Rewritten</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6 h-32"></div>
                </div>
              </Card>
            )}

            {/* Caption Usage Analytics - Pro Plan Only */}
            {userPlan === 'pro' && (
              <Card className="p-6 lg:p-8 mt-8" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-text-primary">📝 Caption Usage Analytics</h2>
                    <p className="text-sm text-text-secondary mt-1">Compare performance of identical vs adapted captions</p>
                  </div>
                  <Badge variant="primary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Caption Workflow Insights
                  </Badge>
                </div>

                {/* Usage Mode Distribution */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">42</p>
                    <p className="text-sm text-green-700 font-medium">Identical</p>
                    <p className="text-xs text-green-600/70">Same across platforms</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">28</p>
                    <p className="text-sm text-purple-700 font-medium">Adapted</p>
                    <p className="text-xs text-purple-600/70">Rule-based changes</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">18</p>
                    <p className="text-sm text-blue-700 font-medium">Edited</p>
                    <p className="text-xs text-blue-600/70">Manual modifications</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-orange-600">9</p>
                    <p className="text-sm text-orange-700 font-medium">Rewritten</p>
                    <p className="text-xs text-orange-600/70">Full AI rewrites</p>
                  </div>
                </div>

                {/* Performance Comparison Chart */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-text-primary mb-4">Performance by Caption Mode</h3>
                  <div className="space-y-4">
                    {/* Identical */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Identical</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '68%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-green-600 w-16">11.2%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 3,240 avg reach • 142 avg likes</p>
                      </div>
                    </div>
                    {/* Adapted */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Adapted</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-purple-600 w-16">14.8%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 4,120 avg reach • 198 avg likes</p>
                      </div>
                    </div>
                    {/* Manual Edit */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Edited</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '72%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-blue-600 w-16">12.1%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 3,480 avg reach • 156 avg likes</p>
                      </div>
                    </div>
                    {/* Full Rewrite */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-text-primary">Rewritten</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: '78%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-orange-600 w-16">13.2%</span>
                        </div>
                        <p className="text-xs text-text-secondary">Avg engagement • 3,890 avg reach • 172 avg likes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Adaptation Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <span>🏆</span> Top Performing Adaptations
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>✂️</span>
                          <span className="text-sm">Shorten</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+18% engagement</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>📢</span>
                          <span className="text-sm">Add CTA</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+15% engagement</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>↵</span>
                          <span className="text-sm">Add Line Breaks</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+12% engagement</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>👔</span>
                          <span className="text-sm">Professional Tone</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">+9% engagement</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <span>📊</span> Platform Comparison
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="twitter" size="sm" variant="color" />
                          <span className="text-sm">Twitter</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-purple-600">Adapted +32%</span>
                          <p className="text-xs text-text-secondary">Shorten works best</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="linkedin" size="sm" variant="color" />
                          <span className="text-sm">LinkedIn</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-purple-600">Adapted +28%</span>
                          <p className="text-xs text-text-secondary">Professional tone wins</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="instagram" size="sm" variant="color" />
                          <span className="text-sm">Instagram</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-green-600">Identical +5%</span>
                          <p className="text-xs text-text-secondary">Full captions perform well</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformLogo platform="tiktok" size="sm" variant="color" />
                          <span className="text-sm">TikTok</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-purple-600">Adapted +22%</span>
                          <p className="text-xs text-text-secondary">Casual tone preferred</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Insight Banner */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">💡</div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Key Insight</h4>
                      <p className="text-white/90 text-sm mb-2">
                        <strong>Adapted captions outperform identical by 32%</strong> on average.
                        The "Shorten" adaptation shows the highest impact, especially on Twitter where
                        character limits matter. Consider using platform-specific adaptations for all your posts.
                      </p>
                      <div className="flex gap-3 mt-3">
                        <Link
                          href="/generate"
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                        >
                          Try Caption Workflow →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Content Calendar Insights - Pro Plan Only */}
            {userPlan === 'pro' && (
              <Card className="p-6 lg:p-8 mt-8" hover={false}>
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
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="p-6 lg:p-8 mt-8" hover={false}>
              <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Activity</h2>
              <div className="space-y-2">
                {[
                  { action: 'Post published on Instagram', time: '2 hours ago', icon: '📷', performance: userPlan === 'pro' ? '+15% above average' : null },
                  { action: 'AI caption generated', time: '4 hours ago', icon: '✨', performance: userPlan === 'pro' ? 'Predicted engagement: 14.2%' : null },
                  { action: 'Post scheduled for LinkedIn', time: '6 hours ago', icon: '💼', performance: userPlan === 'pro' ? 'Optimal time selected' : null },
                  { action: 'Video uploaded', time: '1 day ago', icon: '🎬', performance: userPlan === 'pro' ? '92% quality score' : null }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 hover:bg-background rounded-xl transition-colors">
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
            </Card>

            {/* Plan Switcher for Testing */}
            <div className="mt-12 p-6 bg-gray-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary mb-1">Test Different Plans (Development Only)</p>
                  <p className="text-xs text-text-secondary/70">This switcher is for testing purposes only</p>
                </div>
                <div className="flex gap-2">
                  {(['free', 'creator', 'pro'] as PlanType[]).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => {
                        setUserPlan(plan)
                        localStorage.setItem('userPlan', plan)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                        userPlan === plan
                          ? plan === 'pro'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : plan === 'creator'
                            ? 'bg-primary text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-white text-text-secondary hover:bg-gray-50'
                      }`}
                    >
                      {plan} Plan
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
