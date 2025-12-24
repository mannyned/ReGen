'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlan } from '@/app/context/PlanContext';
import { hasSaveRateAnalytics } from '@/app/config/plans';
import { AppHeader, Card, Badge, GradientBanner } from '@/app/components/ui';
import type {
  Period,
  SaveRateSummary,
  SaveRateByFormat,
  SaveRateByPlatform,
  SaveRateTrendPoint,
  TopSavedPost,
  TrendDirection
} from '@/app/types/saveRateAnalytics';
import {
  formatSaveRate,
  formatNumber,
  getTrendIcon,
  getTrendColor,
  getFormatIcon,
  getPlatformIcon
} from '@/app/types/saveRateAnalytics';

// ============================================
// Access Gate Component (Creator + Pro)
// ============================================
function SaveRateGate({ children }: { children: React.ReactNode }) {
  const { currentPlan } = usePlan();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    );
  }

  const hasAccess = hasSaveRateAnalytics(currentPlan);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader currentPage="analytics" />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
          {/* Back Button */}
          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-8 group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Analytics
          </Link>

          <Card className="overflow-hidden" hover={false}>
            {/* Preview Image */}
            <div className="relative h-64 bg-gradient-to-br from-emerald-50 to-teal-50">
              <div className="absolute inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-float">🔖</div>
                  <Badge variant="success">
                    Creator Feature
                  </Badge>
                </div>
              </div>

              {/* Fake chart preview */}
              <div className="absolute inset-4 rounded-xl bg-gradient-to-b from-emerald-100 to-teal-100 opacity-50">
                <div className="absolute bottom-4 left-4 right-4 h-24 flex items-end gap-2">
                  {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-emerald-400 rounded-t opacity-60"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                Unlock Save Rate Analytics
              </h2>
              <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                Discover which content your audience loves enough to save. Track save rates across formats
                and platforms to create more bookmark-worthy content.
              </p>

              {/* Feature List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left max-w-lg mx-auto">
                {[
                  'Overall save rate metrics',
                  'Save rate by content format',
                  'Platform-by-platform breakdown',
                  'Top 5 most saved posts',
                  'Save rate trends over time',
                  'AI-powered insights'
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span className="text-text-secondary">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Link
                href="/settings?tab=billing"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
              >
                Upgrade to Creator - $9/month
              </Link>

              <p className="text-sm text-text-secondary mt-4">
                Cancel anytime. 14-day money-back guarantee.
              </p>
            </div>
          </Card>

          {/* Current Plan Info */}
          <div className="mt-8 text-center text-text-secondary text-sm">
            Your current plan: <span className="font-medium text-text-primary capitalize">{currentPlan}</span>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================
// Metric Card Component
// ============================================
interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: { direction: TrendDirection; changePercent: number };
  highlight?: boolean;
}

function MetricCard({ icon, label, value, subValue, trend, highlight }: MetricCardProps) {
  return (
    <Card className={`p-5 ${highlight ? 'border-emerald-200 bg-emerald-50/50' : ''}`} hover={false}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          {icon} {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
        {trend && (
          <span className={`text-sm font-medium ${getTrendColor(trend.direction)}`}>
            {getTrendIcon(trend.direction)} {Math.abs(trend.changePercent)}%
          </span>
        )}
      </div>
      {subValue && (
        <div className="mt-1">
          <span className="text-sm text-text-secondary">{subValue}</span>
        </div>
      )}
    </Card>
  );
}

// ============================================
// Save Rate Trend Chart Component
// ============================================
interface TrendChartProps {
  data: SaveRateTrendPoint[];
  isLoading: boolean;
}

function TrendChart({ data, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center animate-pulse">
        <span className="text-text-secondary">Loading chart...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
        <div className="text-center text-text-secondary">
          <div className="text-4xl mb-2">📈</div>
          <p className="font-medium">No trend data yet</p>
          <p className="text-sm mt-1">Start posting to see your save rate trends</p>
        </div>
      </div>
    );
  }

  const maxRate = Math.max(...data.map(d => d.saveRate), 5);

  return (
    <div className="relative">
      <svg viewBox="0 0 800 200" className="w-full h-64">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line
              x1="50"
              y1={180 - (pct / 100) * 160}
              x2="780"
              y2={180 - (pct / 100) * 160}
              stroke="#E5E7EB"
              strokeDasharray="4"
            />
            <text
              x="45"
              y={185 - (pct / 100) * 160}
              textAnchor="end"
              className="text-xs fill-gray-400"
            >
              {((pct / 100) * maxRate).toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Area fill */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={`M 50 180 ${data.map((point, i) => {
            const x = 50 + (i / (data.length - 1)) * 730;
            const y = 180 - ((point.saveRate / maxRate) * 160);
            return `L ${x} ${y}`;
          }).join(' ')} L 780 180 Z`}
          fill="url(#areaGradient)"
        />

        {/* Line */}
        <path
          d={data.map((point, i) => {
            const x = 50 + (i / (data.length - 1)) * 730;
            const y = 180 - ((point.saveRate / maxRate) * 160);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Data points */}
        {data.map((point, i) => {
          const x = 50 + (i / (data.length - 1)) * 730;
          const y = 180 - ((point.saveRate / maxRate) * 160);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#10B981"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-6 transition-all"
              />
              {i % Math.ceil(data.length / 7) === 0 && (
                <text
                  x={x}
                  y="195"
                  textAnchor="middle"
                  className="text-xs fill-gray-400"
                >
                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================
// Format Breakdown Table Component
// ============================================
interface FormatTableProps {
  data: SaveRateByFormat[];
  isLoading: boolean;
}

function FormatTable({ data, isLoading }: FormatTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No format data yet</p>
        <p className="text-sm mt-1">Post different content types to see format analytics</p>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.saveRate - a.saveRate);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Format</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Save Rate</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Saves</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Impressions</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Posts</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Trend</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((format, idx) => (
            <tr key={format.formatType} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFormatIcon(format.formatType)}</span>
                  <span className="font-medium text-text-primary capitalize">
                    {format.formatType.replace('_', ' ')}
                  </span>
                  {idx === 0 && (
                    <Badge variant="success">Best</Badge>
                  )}
                </div>
              </td>
              <td className="text-right py-3 px-4">
                <span className="font-semibold text-text-primary">{formatSaveRate(format.saveRate)}</span>
              </td>
              <td className="text-right py-3 px-4 text-text-secondary">{formatNumber(format.saves)}</td>
              <td className="text-right py-3 px-4 text-text-secondary">{formatNumber(format.impressions)}</td>
              <td className="text-right py-3 px-4 text-text-secondary">{format.contentCount}</td>
              <td className="text-right py-3 px-4">
                {format.trend ? (
                  <span className={`font-medium ${getTrendColor(format.trend.direction)}`}>
                    {getTrendIcon(format.trend.direction)} {Math.abs(format.trend.changePercent)}%
                  </span>
                ) : (
                  <span className="text-text-secondary">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Top Saved Posts Widget Component
// ============================================
interface TopPostsProps {
  posts: TopSavedPost[];
  isLoading: boolean;
}

function TopSavedPostsWidget({ posts, isLoading }: TopPostsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <div className="text-4xl mb-2">🔖</div>
        <p>No saved posts yet</p>
        <p className="text-sm mt-1">Your top performing content will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.contentId}
          className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <span className="text-lg font-bold text-text-secondary w-6">{post.rank}.</span>

          {/* Thumbnail */}
          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            {post.thumbnail ? (
              <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-secondary">
                {getFormatIcon(post.formatType)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">{post.title}</p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>{getPlatformIcon(post.platform)}</span>
              <span className="capitalize">{post.platform}</span>
              <span>•</span>
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="text-right">
            <div className="font-semibold text-emerald-600">{formatSaveRate(post.saveRate)}</div>
            <div className="text-sm text-text-secondary">{formatNumber(post.saves)} saves</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Platform Breakdown Component
// ============================================
interface PlatformBreakdownProps {
  data: SaveRateByPlatform[];
  isLoading: boolean;
}

function PlatformBreakdown({ data, isLoading }: PlatformBreakdownProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No platform data yet</p>
      </div>
    );
  }

  const maxRate = Math.max(...data.map(d => d.saveRate));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {data.map((platform) => (
        <div
          key={platform.platform}
          className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{getPlatformIcon(platform.platform)}</span>
            <span className="font-medium text-text-primary capitalize">{platform.platform}</span>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">
            {formatSaveRate(platform.saveRate)}
          </div>
          <div className="text-sm text-text-secondary">
            {formatNumber(platform.saves)} saves
          </div>
          {/* Mini bar */}
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(platform.saveRate / maxRate) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function SaveRateAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SaveRateSummary | null>(null);
  const [byFormat, setByFormat] = useState<SaveRateByFormat[]>([]);
  const [byPlatform, setByPlatform] = useState<SaveRateByPlatform[]>([]);
  const [trends, setTrends] = useState<SaveRateTrendPoint[]>([]);
  const [topPosts, setTopPosts] = useState<TopSavedPost[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setIsLoading(true);

    // In production, load empty data (real API integration would go here)
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Production: Show empty state until real data is available
      setSummary(null);
      setByFormat([]);
      setByPlatform([]);
      setTrends([]);
      setTopPosts([]);
      setIsLoading(false);
      return;
    }

    // Development: Simulate API calls with mock data
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock data for development only
    setSummary({
      saves: 12450,
      impressions: 845000,
      saveRate: 1.47,
      contentCount: 87,
      trend: { direction: 'up', changePercent: 12 }
    });

    setByFormat([
      { formatType: 'carousel', saves: 4200, impressions: 180000, saveRate: 2.33, contentCount: 24, trend: { direction: 'up', changePercent: 18 } },
      { formatType: 'infographic', saves: 2800, impressions: 145000, saveRate: 1.93, contentCount: 15, trend: { direction: 'up', changePercent: 8 } },
      { formatType: 'video_clip', saves: 2100, impressions: 210000, saveRate: 1.00, contentCount: 28, trend: { direction: 'stable', changePercent: 2 } },
      { formatType: 'single_image', saves: 1800, impressions: 165000, saveRate: 1.09, contentCount: 35, trend: { direction: 'down', changePercent: 5 } },
      { formatType: 'reel', saves: 1550, impressions: 145000, saveRate: 1.07, contentCount: 22, trend: { direction: 'up', changePercent: 22 } },
    ]);

    setByPlatform([
      { platform: 'instagram', saves: 5200, impressions: 320000, saveRate: 1.63, contentCount: 42 },
      { platform: 'tiktok', saves: 3100, impressions: 280000, saveRate: 1.11, contentCount: 35 },
      { platform: 'linkedin', saves: 2800, impressions: 145000, saveRate: 1.93, contentCount: 28 },
      { platform: 'youtube', saves: 1350, impressions: 100000, saveRate: 1.35, contentCount: 12 },
    ]);

    // Generate trend data
    const trendData: SaveRateTrendPoint[] = [];
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      trendData.push({
        date: date.toISOString().split('T')[0],
        saveRate: 1.2 + Math.random() * 0.6 + (i < days / 2 ? 0 : 0.2),
        saves: Math.floor(300 + Math.random() * 200),
        impressions: Math.floor(20000 + Math.random() * 10000)
      });
    }
    setTrends(trendData);

    setTopPosts([
      { rank: 1, contentId: '1', title: '10 Tips for Better Morning Routine', thumbnail: '', platform: 'instagram', formatType: 'carousel', saves: 892, impressions: 23400, saveRate: 3.81, publishedAt: '2024-01-18' },
      { rank: 2, contentId: '2', title: 'Complete Guide to Productivity', thumbnail: '', platform: 'linkedin', formatType: 'infographic', saves: 654, impressions: 18200, saveRate: 3.59, publishedAt: '2024-01-15' },
      { rank: 3, contentId: '3', title: 'How I Built My Side Hustle', thumbnail: '', platform: 'tiktok', formatType: 'video_clip', saves: 521, impressions: 45000, saveRate: 1.16, publishedAt: '2024-01-20' },
      { rank: 4, contentId: '4', title: 'Financial Freedom Checklist', thumbnail: '', platform: 'instagram', formatType: 'carousel', saves: 487, impressions: 14800, saveRate: 3.29, publishedAt: '2024-01-12' },
      { rank: 5, contentId: '5', title: 'Weekly Planning Template', thumbnail: '', platform: 'linkedin', formatType: 'single_image', saves: 423, impressions: 12100, saveRate: 3.50, publishedAt: '2024-01-22' },
    ]);

    setIsLoading(false);
  };

  return (
    <SaveRateGate>
      <div className="min-h-screen bg-background">
        <AppHeader currentPage="analytics" />

        {/* Sub-header with title and controls */}
        <div className="bg-white border-b border-gray-100 mt-16 lg:mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Back Button */}
                <Link
                  href="/analytics"
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-text-secondary hover:text-text-primary"
                  title="Back to Analytics"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    Save Rate Analytics
                  </h1>
                  <p className="text-sm text-text-secondary">Track how often your content gets saved</p>
                </div>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                {(['7d', '30d', '90d', '365d'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-text-secondary hover:bg-gray-200'
                    }`}
                  >
                    {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <MetricCard
              icon="🔖"
              label="Overall Save Rate"
              value={summary ? formatSaveRate(summary.saveRate) : '-'}
              trend={summary?.trend}
              highlight
            />
            <MetricCard
              icon="💾"
              label="Total Saves"
              value={summary ? formatNumber(summary.saves) : '-'}
              subValue="across all platforms"
            />
            <MetricCard
              icon="👁️"
              label="Total Impressions"
              value={summary ? formatNumber(summary.impressions) : '-'}
              subValue="content views"
            />
            <MetricCard
              icon="📊"
              label="Content Analyzed"
              value={summary ? `${summary.contentCount}` : '-'}
              subValue="posts with save data"
            />
          </div>

          {/* Save Rate Trend Chart */}
          <Card className="p-6 mb-8" hover={false}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Save Rate Trend
            </h2>
            <TrendChart data={trends} isLoading={isLoading} />
          </Card>

          {/* Two Column Layout: Format Table + Top Posts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <Card className="lg:col-span-3 p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Save Rate by Content Format
              </h2>
              <FormatTable data={byFormat} isLoading={isLoading} />
            </Card>

            <Card className="lg:col-span-2 p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Top 5 Most Saved Posts
              </h2>
              <TopSavedPostsWidget posts={topPosts} isLoading={isLoading} />
            </Card>
          </div>

          {/* Platform Breakdown */}
          <Card className="p-6 mb-8" hover={false}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Save Rate by Platform
            </h2>
            <PlatformBreakdown data={byPlatform} isLoading={isLoading} />
          </Card>

          {/* AI Insight Card */}
          <GradientBanner className="bg-gradient-to-r from-emerald-500 to-teal-600">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <span className="text-sm font-medium uppercase tracking-wide opacity-90">
                AI Insight
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2">Carousels Are Your Save Magnets</h3>
            <p className="text-white/80 mb-4">
              Your carousel posts have a 2.33% save rate - 59% higher than your overall average.
              Consider creating more carousel content, especially how-to guides and listicles
              which tend to get saved for later reference.
            </p>
            <Link
              href="/generate?format=carousel"
              className="inline-flex items-center px-4 py-2 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors"
            >
              Create Carousel Post
            </Link>
          </GradientBanner>
        </main>
      </div>
    </SaveRateGate>
  );
}
