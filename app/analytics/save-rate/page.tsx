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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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
        <div className="text-center text-text-secondary px-6">
          <div className="text-4xl mb-3">📈</div>
          <p className="font-medium text-text-primary">Your trend chart is brewing!</p>
          <p className="text-sm mt-2 max-w-sm">
            As your content gets saved by viewers, we'll track the trends here. Keep posting quality content!
          </p>
        </div>
      </div>
    );
  }

  const maxRate = Math.max(...data.map(d => d.saveRate), 5);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgWidth = rect.width;

    // Calculate which data point we're closest to
    const chartStart = (50 / 800) * svgWidth;
    const chartEnd = (780 / 800) * svgWidth;
    const chartWidth = chartEnd - chartStart;

    if (x >= chartStart && x <= chartEnd) {
      const relativeX = (x - chartStart) / chartWidth;
      const index = Math.round(relativeX * (data.length - 1));
      const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
      setHoveredIndex(clampedIndex);

      // Calculate tooltip position
      const pointX = 50 + (clampedIndex / (data.length - 1)) * 730;
      const pointY = 180 - ((data[clampedIndex].saveRate / maxRate) * 160);
      setTooltipPosition({
        x: (pointX / 800) * svgWidth,
        y: (pointY / 200) * rect.height
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="relative">
      <svg
        viewBox="0 0 800 200"
        className="w-full h-64"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
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
          const isHovered = hoveredIndex === i;
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 4}
                fill={isHovered ? '#059669' : '#10B981'}
                stroke="white"
                strokeWidth={isHovered ? 3 : 2}
                className="cursor-pointer transition-all duration-150"
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

        {/* Vertical indicator line when hovering */}
        {hoveredIndex !== null && (
          <line
            x1={50 + (hoveredIndex / (data.length - 1)) * 730}
            y1={180 - ((data[hoveredIndex].saveRate / maxRate) * 160)}
            x2={50 + (hoveredIndex / (data.length - 1)) * 730}
            y2={180}
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="4"
            opacity="0.5"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-10 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10
          }}
        >
          <div className="font-medium mb-1">
            {new Date(data[hoveredIndex].date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </div>
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="text-emerald-400 font-semibold">
              Save Rate: {data[hoveredIndex].saveRate.toFixed(2)}%
            </span>
            <span className="text-gray-300">
              Saves: {data[hoveredIndex].saves.toLocaleString()}
            </span>
            <span className="text-gray-300">
              Impressions: {data[hoveredIndex].impressions.toLocaleString()}
            </span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
        </div>
      )}
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
        <div className="text-3xl mb-2">🎨</div>
        <p className="font-medium text-text-primary">No format data yet</p>
        <p className="text-sm mt-2 max-w-xs mx-auto">
          Post different content types (carousels, reels, images) to see which formats get saved the most.
        </p>
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
        <div className="text-4xl mb-3">🔖</div>
        <p className="font-medium text-text-primary">Your hall of fame awaits!</p>
        <p className="text-sm mt-2 max-w-xs mx-auto">
          As viewers save your content, your top 5 most saved posts will be showcased here.
        </p>
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
        <div className="text-3xl mb-2">📱</div>
        <p className="font-medium text-text-primary">No platform data yet</p>
        <p className="text-sm mt-2 max-w-xs mx-auto">
          Connect your social accounts and post content to see save rates across platforms.
        </p>
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
          <div className="text-sm text-text-secondary space-y-0.5">
            <div>{formatNumber(platform.saves)} saves</div>
            <div>{formatNumber(platform.impressions)} impressions</div>
            <div>{platform.contentCount} posts</div>
          </div>
          {/* Mini bar */}
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${maxRate > 0 ? (platform.saveRate / maxRate) * 100 : 0}%` }}
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
type PlatformFilter = 'all' | 'instagram' | 'youtube' | 'facebook' | 'tiktok' | 'linkedin' | 'twitter' | 'snapchat';

export default function SaveRateAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SaveRateSummary | null>(null);
  const [byFormat, setByFormat] = useState<SaveRateByFormat[]>([]);
  const [byPlatform, setByPlatform] = useState<SaveRateByPlatform[]>([]);
  const [trends, setTrends] = useState<SaveRateTrendPoint[]>([]);
  const [topPosts, setTopPosts] = useState<TopSavedPost[]>([]);

  useEffect(() => {
    loadData();
  }, [period, selectedPlatform]);

  const loadData = async () => {
    setIsLoading(true);

    try {
      // Calculate date range based on period
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

      // Fetch from analytics stats endpoint - this uses synced engagement data
      const platformParam = selectedPlatform !== 'all' ? `&platform=${selectedPlatform}` : '';
      const statsRes = await fetch(`/api/analytics/stats?days=${days}${platformParam}`);
      if (!statsRes.ok) {
        setIsLoading(false);
        return;
      }
      const statsData = await statsRes.json();

      // Get engagement data from stats
      const engagement = statsData?.engagement || {};
      const totalSaves = engagement.totalSaves || 0;
      const totalImpressions = engagement.totalImpressions || engagement.totalViews || 0;
      const totalReach = engagement.totalReach || totalImpressions || 0;
      const postsCount = statsData?.postsInRange || statsData?.totalPosts || 0;

      // Calculate overall save rate (saves / reach * 100)
      const overallSaveRate = totalReach > 0 ? (totalSaves / totalReach) * 100 : 0;

      // Always set summary with current values (even if 0)
      // This ensures metrics are displayed rather than showing "-"
      setSummary({
        saves: totalSaves,
        impressions: totalReach,
        saveRate: overallSaveRate,
        contentCount: postsCount,
        trend: { direction: 'stable', changePercent: 0 }
      });

      // Set format breakdown from topFormats
      const formatList: SaveRateByFormat[] = [];
      if (statsData?.topFormats && statsData.topFormats.length > 0) {
        for (const format of statsData.topFormats) {
          // Map format names to valid FormatType
          let formatType: SaveRateByFormat['formatType'] = 'single_image';
          const formatLower = format.format.toLowerCase();
          if (formatLower === 'video') formatType = 'video_clip';
          else if (formatLower === 'image') formatType = 'single_image';
          else if (formatLower === 'carousel') formatType = 'carousel';
          else if (formatLower === 'reel' || formatLower === 'reels') formatType = 'reel';
          else if (formatLower === 'story' || formatLower === 'stories') formatType = 'story';
          else if (formatLower === 'infographic') formatType = 'infographic';
          else if (formatLower === 'thread') formatType = 'thread';

          // Estimate saves and impressions for this format based on its percentage
          const formatSaves = Math.round(totalSaves * (format.percentage / 100));
          const formatImpressions = Math.round(totalReach * (format.percentage / 100));
          const formatSaveRate = formatImpressions > 0 ? (formatSaves / formatImpressions) * 100 : 0;

          formatList.push({
            formatType,
            saves: formatSaves,
            impressions: formatImpressions,
            saveRate: formatSaveRate,
            contentCount: format.count,
            trend: { direction: 'stable' as const, changePercent: 0 }
          });
        }
      }
      setByFormat(formatList);

      // Set platform breakdown from platformEngagement
      const platformList: SaveRateByPlatform[] = [];
      if (statsData?.platformEngagement) {
        for (const [platform, pdata] of Object.entries(statsData.platformEngagement)) {
          const pd = pdata as { posts: number; saves: number; impressions: number; views: number; reach: number };
          const platformReach = pd.reach || pd.impressions || pd.views || 0;
          const platformSaves = pd.saves || 0;

          platformList.push({
            platform: platform as SaveRateByPlatform['platform'],
            saves: platformSaves,
            impressions: platformReach,
            saveRate: platformReach > 0 ? (platformSaves / platformReach) * 100 : 0,
            contentCount: pd.posts || 0
          });
        }
      }
      setByPlatform(platformList);

      // Generate trend data from actual totals
      // Distribute the totals across the time period
      const trendPoints: SaveRateTrendPoint[] = [];
      const daysToShow = Math.min(days, 30);
      const dailySaves = totalSaves > 0 ? Math.round(totalSaves / daysToShow) : 0;
      const dailyImpressions = totalReach > 0 ? Math.round(totalReach / daysToShow) : 0;

      for (let i = daysToShow; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trendPoints.push({
          date: date.toISOString().split('T')[0],
          saveRate: overallSaveRate, // Show actual save rate
          saves: dailySaves,
          impressions: dailyImpressions
        });
      }
      setTrends(trendPoints);

      // Fetch recent posts for top saved posts
      try {
        const postsRes = await fetch(`/api/posts/recent?limit=10`);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const posts = postsData?.posts || postsData || [];

          // Map to TopSavedPost format and sort by saves
          const topSavedList: TopSavedPost[] = posts
            .filter((post: { metadata?: { analytics?: { saves?: number; saved?: number } } }) => {
              const analytics = post.metadata?.analytics;
              return analytics && (analytics.saves || analytics.saved || 0) > 0;
            })
            .map((post: { id: string; caption?: string; provider?: string; postedAt?: string; metadata?: { analytics?: { saves?: number; saved?: number; impressions?: number; reach?: number } }; contentUpload?: { mimeType?: string; thumbnailUrl?: string } }, idx: number) => {
              const analytics = post.metadata?.analytics || {};
              const saves = analytics.saves || analytics.saved || 0;
              const reach = analytics.reach || analytics.impressions || 1;

              let formatType: TopSavedPost['formatType'] = 'single_image';
              const mimeType = post.contentUpload?.mimeType || '';
              if (mimeType.startsWith('video/')) formatType = 'video_clip';

              return {
                rank: idx + 1,
                contentId: post.id,
                title: post.caption?.slice(0, 50) || 'Untitled Post',
                thumbnail: post.contentUpload?.thumbnailUrl || null,
                platform: (post.provider || 'instagram') as TopSavedPost['platform'],
                formatType,
                saves,
                impressions: reach,
                saveRate: reach > 0 ? (saves / reach) * 100 : 0,
                publishedAt: post.postedAt || new Date().toISOString()
              };
            })
            .sort((a: TopSavedPost, b: TopSavedPost) => b.saves - a.saves)
            .slice(0, 5)
            .map((post: TopSavedPost, idx: number) => ({ ...post, rank: idx + 1 }));

          setTopPosts(topSavedList);
        }
      } catch {
        // Silently fail - top posts are optional
        setTopPosts([]);
      }

    } catch (error) {
      console.error('Failed to load save rate data:', error);
      setSummary(null);
      setByFormat([]);
      setByPlatform([]);
      setTrends([]);
      setTopPosts([]);
    }

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

              <div className="flex items-center gap-4">
                {/* Platform Selector */}
                <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-3 py-1.5">
                  <span className="text-xs text-text-secondary font-medium">Platform:</span>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as PlatformFilter)}
                    className="text-sm px-2 py-1.5 border-0 bg-transparent text-text-primary font-medium focus:outline-none focus:ring-0 cursor-pointer"
                  >
                    <option value="all">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="facebook">Facebook</option>
                    <option value="snapchat">Snapchat</option>
                  </select>
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
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Sync Info Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-blue-500 text-lg">ℹ️</span>
            <div className="text-sm text-blue-700">
              <p className="font-medium">When do metrics update?</p>
              <p className="mt-1 text-blue-600">
                Instagram saves update within 15-30 minutes. YouTube metrics may take 24-48 hours to reflect.
                Data syncs automatically when you visit this page.
              </p>
            </div>
          </div>

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
            {(() => {
              // Dynamic AI insight based on actual data
              const topFormat = byFormat.length > 0 ? byFormat[0] : null;
              const topPlatform = byPlatform.length > 0 ? byPlatform.reduce((a, b) => a.saves > b.saves ? a : b) : null;
              const hasSaves = (summary?.saves || 0) > 0;
              const hasPosts = (summary?.contentCount || 0) > 0;
              const totalImpressions = summary?.impressions || 0;

              if (hasSaves && topFormat && topFormat.saves > 0) {
                const formatName = topFormat.formatType === 'video_clip' || topFormat.formatType === 'video_long' ? 'Videos' :
                                   topFormat.formatType === 'single_image' ? 'Images' :
                                   topFormat.formatType === 'carousel' ? 'Carousels' :
                                   topFormat.formatType === 'reel' ? 'Reels' :
                                   topFormat.formatType === 'story' ? 'Stories' : 'Your Top Format';
                return (
                  <>
                    <h3 className="text-xl font-bold mb-2">{formatName} Drive the Most Saves</h3>
                    <p className="text-white/80 mb-4">
                      Your {topFormat.formatType.replace('_', ' ')} posts have a {formatSaveRate(topFormat.saveRate)} save rate
                      with {formatNumber(topFormat.saves)} total saves. Keep creating this type of content!
                    </p>
                    <Link href={`/generate?format=${topFormat.formatType}`}
                      className="inline-flex items-center px-4 py-2 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors">
                      Create More {formatName}
                    </Link>
                  </>
                );
              }

              if (hasPosts && totalImpressions > 0) {
                return (
                  <>
                    <h3 className="text-xl font-bold mb-2">Your Content is Getting Views!</h3>
                    <p className="text-white/80 mb-4">
                      You have {formatNumber(summary?.contentCount || 0)} posts with {formatNumber(totalImpressions)} total impressions.
                      {topPlatform ? ` ${topPlatform.platform.charAt(0).toUpperCase() + topPlatform.platform.slice(1)} is your most active platform with ${formatNumber(topPlatform.impressions)} impressions.` : ''}
                      {' '}As saves come in, we'll show you which content resonates most.
                    </p>
                    <Link href="/generate"
                      className="inline-flex items-center px-4 py-2 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors">
                      Create More Content
                    </Link>
                  </>
                );
              }

              if (hasPosts) {
                return (
                  <>
                    <h3 className="text-xl font-bold mb-2">Building Your Save Rate</h3>
                    <p className="text-white/80 mb-4">
                      You have {formatNumber(summary?.contentCount || 0)} posts published. As your audience grows,
                      we'll analyze which content types get saved the most. Tip: Educational content and how-to guides
                      typically have higher save rates!
                    </p>
                    <Link href="/generate"
                      className="inline-flex items-center px-4 py-2 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors">
                      Create New Content
                    </Link>
                  </>
                );
              }

              return (
                <>
                  <h3 className="text-xl font-bold mb-2">Unlock Save Rate Insights</h3>
                  <p className="text-white/80 mb-4">
                    Start posting content to track your save rates. Content that provides value—tutorials,
                    tips, resources—tends to get saved for later reference.
                  </p>
                  <Link href="/generate"
                    className="inline-flex items-center px-4 py-2 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors">
                    Create Your First Post
                  </Link>
                </>
              );
            })()}
          </GradientBanner>
        </main>
      </div>
    </SaveRateGate>
  );
}
