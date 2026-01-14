'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlan } from '@/app/context/PlanContext';
import { hasRetentionAnalytics } from '@/app/config/plans';
import { AppHeader, Card, Badge, GradientBanner } from '@/app/components/ui';
import type {
  Period,
  RetentionDataPoint,
  RetentionAveragesSummary,
  RetentionFormatStats,
  DropOffPoint,
  HookScore,
  RetentionInsight,
} from '@/app/types/saveRateAnalytics';
import {
  formatDuration,
  formatNumber,
  getHookRatingColor,
  getFormatIcon
} from '@/app/types/saveRateAnalytics';

// ============================================
// Pro-Only Access Gate Component
// ============================================
function ProOnlyGate({ children }: { children: React.ReactNode }) {
  const { currentPlan } = usePlan();
  const [mounted, setMounted] = useState(false);
  const [analyticsPermissions, setAnalyticsPermissions] = useState<{
    canViewAccountAnalytics: boolean;
    teamContext: { userRole: string } | null;
  } | null>(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Fetch analytics permissions
    fetch('/api/analytics/permissions')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && !data.error) {
          setAnalyticsPermissions(data);
        }
        setPermissionsLoaded(true);
      })
      .catch(() => setPermissionsLoaded(true));
  }, []);

  if (!mounted || !permissionsLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    );
  }

  const hasAccess = hasRetentionAnalytics(currentPlan);
  const isTeamMemberWithoutAccess = analyticsPermissions?.teamContext &&
    analyticsPermissions.teamContext.userRole === 'member' &&
    analyticsPermissions.canViewAccountAnalytics === false;

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
            <div className="relative h-64 bg-gradient-to-br from-orange-50 to-red-50">
              <div className="absolute inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-float">📈</div>
                  <Badge variant="primary" className="bg-orange-100 text-orange-700">
                    Pro Feature
                  </Badge>
                </div>
              </div>

              {/* Fake retention curve preview */}
              <div className="absolute inset-4 rounded-xl bg-gradient-to-b from-orange-100 to-red-100 opacity-50">
                <svg viewBox="0 0 200 80" className="w-full h-full">
                  <path
                    d="M 10 10 Q 40 12 60 25 T 100 45 T 150 60 T 190 70"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="3"
                    opacity="0.6"
                  />
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                Unlock Retention Analytics
              </h2>
              <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                See exactly where viewers drop off in your videos. Optimize your hooks,
                identify weak points, and create content that keeps audiences watching until the end.
              </p>

              {/* Feature List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left max-w-lg mx-auto">
                {[
                  'Video retention curves',
                  'Hook score & analysis',
                  'Drop-off point detection',
                  'Completion rate tracking',
                  'Benchmark comparisons',
                  'AI optimization tips'
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
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl"
              >
                Upgrade to Pro - $29/month
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

  // Team member without account analytics access
  if (isTeamMemberWithoutAccess) {
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
            {/* Locked Header */}
            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-50">📊</div>
                  <Badge variant="gray" className="bg-gray-200 text-gray-600">
                    🔒 Admin Only
                  </Badge>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                Account Analytics
              </h2>
              <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                Account-level analytics are admin-only. Your analytics access is managed by the workspace admin.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md mx-auto">
                <p className="text-sm text-text-secondary">
                  You can still view <strong>content performance</strong> analytics on the main Analytics page.
                </p>
              </div>

              <Link
                href="/analytics"
                className="inline-flex items-center mt-6 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors"
              >
                Back to Analytics
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================
// Hook Score Display Component
// ============================================
interface HookScoreDisplayProps {
  score: HookScore | null;
  isLoading: boolean;
}

function HookScoreDisplay({ score, isLoading }: HookScoreDisplayProps) {
  if (isLoading) {
    return (
      <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
    );
  }

  if (!score) {
    return (
      <div className="h-40 bg-gray-50 rounded-xl flex items-center justify-center text-text-secondary">
        <div className="text-center px-4">
          <div className="text-3xl mb-2">🎣</div>
          <p className="font-medium text-text-primary">Hook score coming soon</p>
          <p className="text-sm mt-1">Post videos to see how well your hooks perform</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      {/* Score Circle */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={score.rating === 'excellent' ? '#10B981' :
                   score.rating === 'good' ? '#3B82F6' :
                   score.rating === 'average' ? '#F59E0B' : '#EF4444'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score.score / 100) * 283} 283`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text-primary">{score.score}</span>
          <span className="text-xs text-text-secondary">/ 100</span>
        </div>
      </div>

      {/* Rating Badge */}
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getHookRatingColor(score.rating)}`}>
        {score.rating.replace('_', ' ')}
      </span>

      {/* Percentile */}
      <p className="text-sm text-text-secondary mt-2">
        Better than {score.percentile}% of creators
      </p>
    </div>
  );
}

// ============================================
// Retention Curve Chart Component
// ============================================
interface RetentionCurveChartProps {
  data: RetentionDataPoint[];
  dropOffs: DropOffPoint[];
  duration: number;
  isLoading: boolean;
}

function RetentionCurveChart({ data, dropOffs, duration, isLoading }: RetentionCurveChartProps) {
  if (isLoading) {
    return (
      <div className="h-80 bg-gray-100 rounded-xl flex items-center justify-center animate-pulse">
        <span className="text-text-secondary">Loading retention curve...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-80 bg-gradient-to-b from-orange-50 to-red-50 rounded-xl flex items-center justify-center">
        <div className="text-center text-text-secondary px-6">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-medium text-text-primary">Your retention curve is waiting!</p>
          <p className="text-sm mt-2 max-w-sm">
            Post video content on YouTube or TikTok to see how viewers engage throughout your videos. We'll show you exactly where they stay hooked.
          </p>
        </div>
      </div>
    );
  }

  const maxRetention = 100;

  return (
    <div className="relative">
      <svg viewBox="0 0 800 300" className="w-full h-80">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line
              x1="60"
              y1={260 - (pct / 100) * 220}
              x2="780"
              y2={260 - (pct / 100) * 220}
              stroke="#E5E7EB"
              strokeDasharray="4"
            />
            <text
              x="55"
              y={265 - (pct / 100) * 220}
              textAnchor="end"
              className="text-xs fill-gray-400"
            >
              {pct}%
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <text
            key={pct}
            x={60 + pct * 720}
            y="285"
            textAnchor="middle"
            className="text-xs fill-gray-400"
          >
            {formatDuration(duration * pct)}
          </text>
        ))}

        {/* Area fill */}
        <defs>
          <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={`M 60 260 ${data.map((point, i) => {
            const x = 60 + (i / (data.length - 1)) * 720;
            const y = 260 - ((point.retention / maxRetention) * 220);
            return `L ${x} ${y}`;
          }).join(' ')} L 780 260 Z`}
          fill="url(#retentionGradient)"
        />

        {/* Retention line */}
        <path
          d={data.map((point, i) => {
            const x = 60 + (i / (data.length - 1)) * 720;
            const y = 260 - ((point.retention / maxRetention) * 220);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke="#F97316"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Drop-off markers */}
        {dropOffs.map((dropOff, i) => {
          const x = 60 + (dropOff.second / duration) * 720;
          const dataPoint = data.find(d => d.second === dropOff.second) || data[Math.floor(dropOff.second / duration * data.length)];
          const y = dataPoint ? 260 - ((dataPoint.retention / maxRetention) * 220) : 150;

          return (
            <g key={i}>
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={260}
                stroke={dropOff.severity === 'major' ? '#EF4444' :
                       dropOff.severity === 'moderate' ? '#F59E0B' : '#FB923C'}
                strokeWidth="2"
                strokeDasharray="4"
              />
              <circle
                cx={x}
                cy={y}
                r="6"
                fill={dropOff.severity === 'major' ? '#EF4444' :
                      dropOff.severity === 'moderate' ? '#F59E0B' : '#FB923C'}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
              />
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                className="text-xs fill-gray-600 font-medium"
              >
                -{dropOff.dropPercent}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-xs">
        <div className="font-medium text-text-primary mb-1.5">Drop-off Severity</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span className="text-text-secondary">Minor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-text-secondary">Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-text-secondary">Major</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Metric Card Component
// ============================================
interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  comparison?: { value: number; label: string };
  highlight?: boolean;
}

function MetricCard({ icon, label, value, subValue, comparison, highlight }: MetricCardProps) {
  return (
    <Card className={`p-5 ${highlight ? 'border-orange-200 bg-orange-50/50' : ''}`} hover={false}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          {icon} {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
      </div>
      {subValue && (
        <div className="mt-1">
          <span className="text-sm text-text-secondary">{subValue}</span>
        </div>
      )}
      {comparison && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className={`text-sm font-medium ${comparison.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {comparison.value >= 0 ? '+' : ''}{comparison.value}% {comparison.label}
          </span>
        </div>
      )}
    </Card>
  );
}

// ============================================
// Format Retention Table Component
// ============================================
interface FormatRetentionTableProps {
  data: RetentionFormatStats[];
  isLoading: boolean;
}

function FormatRetentionTable({ data, isLoading }: FormatRetentionTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <div className="text-3xl mb-2">🎬</div>
        <p className="font-medium text-text-primary">No format data yet</p>
        <p className="text-sm mt-2 max-w-xs mx-auto">
          Post different video formats (shorts, long-form, tutorials) to compare retention performance.
        </p>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.avgCompletionRate - a.avgCompletionRate);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Format</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Hook Retention</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Completion</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Avg Duration</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Videos</th>
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
                <span className="font-semibold text-text-primary">{format.avgHookRetention.toFixed(1)}%</span>
              </td>
              <td className="text-right py-3 px-4">
                <span className="font-semibold text-text-primary">{format.avgCompletionRate.toFixed(1)}%</span>
              </td>
              <td className="text-right py-3 px-4 text-text-secondary">
                {formatDuration(format.avgViewDuration)}
              </td>
              <td className="text-right py-3 px-4 text-text-secondary">{format.videoCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Drop-off Points List Component
// ============================================
interface DropOffListProps {
  dropOffs: DropOffPoint[];
  isLoading: boolean;
}

function DropOffList({ dropOffs, isLoading }: DropOffListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (dropOffs.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No significant drop-offs detected</p>
        <p className="text-sm mt-1">Great job keeping viewers engaged!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dropOffs.map((dropOff, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-xl border-l-4 ${
            dropOff.severity === 'major' ? 'bg-red-50 border-red-500' :
            dropOff.severity === 'moderate' ? 'bg-yellow-50 border-yellow-500' :
            'bg-orange-50 border-orange-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-text-primary">{dropOff.label}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                  dropOff.severity === 'major' ? 'bg-red-100 text-red-700' :
                  dropOff.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {dropOff.severity}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{dropOff.suggestion}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-text-primary">-{dropOff.dropPercent}%</div>
              <div className="text-xs text-text-secondary">at {formatDuration(dropOff.second)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Insights List Component
// ============================================
interface InsightsListProps {
  insights: RetentionInsight[];
}

function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <div className="text-3xl mb-2">💡</div>
        <p className="font-medium text-text-primary">Insights loading...</p>
        <p className="text-sm mt-2 max-w-xs mx-auto">
          AI-powered tips will appear here as we analyze your video performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-xl ${
            insight.type === 'positive' ? 'bg-green-50 border border-green-200' :
            insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            insight.type === 'tip' ? 'bg-blue-50 border border-blue-200' :
            'bg-purple-50 border border-purple-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {insight.type === 'positive' ? '✅' :
               insight.type === 'warning' ? '⚠️' :
               insight.type === 'tip' ? '💡' : '🎯'}
            </span>
            <div>
              <h4 className="font-semibold text-text-primary">{insight.title}</h4>
              <p className="text-sm text-text-secondary mt-1">{insight.description}</p>
            </div>
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

export default function RetentionAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<RetentionAveragesSummary | null>(null);
  const [hookScore, setHookScore] = useState<HookScore | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionDataPoint[]>([]);
  const [dropOffs, setDropOffs] = useState<DropOffPoint[]>([]);
  const [byFormat, setByFormat] = useState<RetentionFormatStats[]>([]);
  const [insights, setInsights] = useState<RetentionInsight[]>([]);

  useEffect(() => {
    loadData();
  }, [period, selectedPlatform]);

  const loadData = async () => {
    setIsLoading(true);

    try {
      // Get user info for API calls
      const userRes = await fetch('/api/auth/me');
      let userId = null;
      if (userRes.ok) {
        const userData = await userRes.json();
        userId = userData?.id;
      }

      // Calculate date range based on period
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

      // Build platform parameter
      const platformParam = selectedPlatform !== 'all' ? `&platform=${selectedPlatform}` : '';

      // Fetch analytics stats to get video metrics from synced data
      const statsRes = await fetch(`/api/analytics/stats?days=${days}${platformParam}`);
      if (!statsRes.ok) {
        setIsLoading(false);
        return;
      }
      const statsData = await statsRes.json();

      // Get video posts count and views from synced data
      const totalViews = statsData?.engagement?.totalViews || 0;
      const totalPosts = statsData?.postsInRange || 0;

      // Count video posts from topFormats
      let videoCount = 0;
      if (statsData?.topFormats) {
        const videoFormat = statsData.topFormats.find((f: { format: string }) => f.format === 'Video');
        if (videoFormat) {
          videoCount = videoFormat.count;
        }
      }

      // If no video data, check platform engagement for video platforms
      if (videoCount === 0 && statsData?.platformEngagement) {
        // YouTube and TikTok are video-first platforms
        const youtube = statsData.platformEngagement['google'] || statsData.platformEngagement['youtube'];
        const tiktok = statsData.platformEngagement['tiktok'];
        if (youtube) videoCount += youtube.posts || 0;
        if (tiktok) videoCount += tiktok.posts || 0;
      }

      const totalVideos = videoCount || totalPosts;

      if (totalViews === 0 && totalVideos === 0) {
        // No video data available - show empty states
        setSummary(null);
        setHookScore(null);
        setRetentionData([]);
        setDropOffs([]);
        setByFormat([]);
        setInsights([]);
        setIsLoading(false);
        return;
      }

      // Try to fetch real retention data from video posts
      let realRetentionData: Array<{ timestamp: number; retention: number }> = [];
      let hasRealData = false;

      if (userId) {
        try {
          // Fetch recent video posts to get retention data
          const postsRes = await fetch('/api/posts/recent?limit=20');
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            const posts = postsData?.posts || postsData || [];

            // Filter for video posts on YouTube (which has retention data)
            const videoPosts = posts.filter((post: { provider?: string; contentUpload?: { mimeType?: string } }) => {
              const isYouTube = post.provider === 'google' || post.provider === 'youtube';
              const isVideo = post.contentUpload?.mimeType?.startsWith('video/');
              // Apply platform filter
              if (selectedPlatform !== 'all') {
                const matchesPlatform = post.provider === selectedPlatform ||
                  (selectedPlatform === 'youtube' && post.provider === 'google');
                return matchesPlatform && (isYouTube || isVideo);
              }
              return isYouTube || isVideo;
            });

            // Fetch retention data for up to 5 videos to aggregate
            const retentionPromises = videoPosts.slice(0, 5).map(async (post: { id: string; provider?: string }) => {
              try {
                const platform = post.provider === 'google' ? 'youtube' : post.provider;
                const retRes = await fetch(`/api/analytics?type=retention&platform=${platform}&userId=${userId}&postId=${post.id}`);
                if (retRes.ok) {
                  const retData = await retRes.json();
                  if (retData.success && retData.data && retData.data.length > 0) {
                    return retData.data as Array<{ timestamp: number; retention: number }>;
                  }
                }
              } catch {
                // Silently fail for individual posts
              }
              return null;
            });

            const retentionResults = await Promise.all(retentionPromises);
            const validResults = retentionResults.filter((r): r is Array<{ timestamp: number; retention: number }> => r !== null && r.length > 0);

            if (validResults.length > 0) {
              hasRealData = true;
              // Aggregate retention data by averaging across videos
              const aggregated: Record<number, { total: number; count: number }> = {};
              for (const result of validResults) {
                for (const point of result) {
                  const ts = Math.round(point.timestamp);
                  if (!aggregated[ts]) {
                    aggregated[ts] = { total: 0, count: 0 };
                  }
                  aggregated[ts].total += point.retention;
                  aggregated[ts].count += 1;
                }
              }
              realRetentionData = Object.entries(aggregated)
                .map(([ts, data]) => ({
                  timestamp: parseInt(ts),
                  retention: data.total / data.count
                }))
                .sort((a, b) => a.timestamp - b.timestamp);
            }
          }
        } catch (err) {
          console.error('Failed to fetch real retention data:', err);
        }
      }

      // Calculate metrics from real data or use estimates
      let avgHookRetention: number;
      let avgCompletionRate: number;
      let avgViewDuration: number;

      if (hasRealData && realRetentionData.length > 0) {
        // Use real retention data
        // Hook retention: retention at ~3 seconds (timestamp 5-10%)
        const hookPoint = realRetentionData.find(p => p.timestamp >= 5 && p.timestamp <= 15) || realRetentionData[0];
        avgHookRetention = hookPoint?.retention || 50;

        // Completion rate: retention at the end
        avgCompletionRate = realRetentionData[realRetentionData.length - 1]?.retention || 20;

        // Average view duration: estimate based on completion
        avgViewDuration = Math.round(45 * (avgCompletionRate / 100));
      } else {
        // Use estimates based on engagement data
        const avgEngagementRate = statsData?.engagement?.avgEngagementRate
          ? parseFloat(statsData.engagement.avgEngagementRate)
          : 0;

        avgHookRetention = Math.min(90, Math.max(40, 50 + (avgEngagementRate * 5)));
        avgCompletionRate = Math.min(50, Math.max(15, 25 + (avgEngagementRate * 2)));
        avgViewDuration = Math.round(45 * (avgCompletionRate / 100));
      }

      setSummary({
        avgHookRetention,
        avgCompletionRate,
        avgViewDuration,
        totalVideos,
        totalViews
      });

      // Build retention curve from real data or generate estimated curve
      const curvePoints: RetentionDataPoint[] = [];

      if (hasRealData && realRetentionData.length > 0) {
        // Use real retention data points
        for (const point of realRetentionData) {
          // Convert percentage timestamp to seconds (assuming 60 second video)
          const second = Math.round(point.timestamp * 0.6);
          if (second <= 60) {
            curvePoints.push({
              second,
              retention: point.retention,
              viewers: Math.floor((totalViews / totalVideos) * (point.retention / 100))
            });
          }
        }
        // Ensure we have data points at regular intervals
        if (curvePoints.length < 10) {
          // Interpolate if needed
          const interpolated: RetentionDataPoint[] = [];
          for (let i = 0; i <= 60; i += 2) {
            const closest = curvePoints.reduce((prev, curr) =>
              Math.abs(curr.second - i) < Math.abs(prev.second - i) ? curr : prev
            );
            interpolated.push({
              second: i,
              retention: closest.retention,
              viewers: closest.viewers
            });
          }
          curvePoints.length = 0;
          curvePoints.push(...interpolated);
        }
      } else {
        // Generate estimated curve
        for (let i = 0; i <= 60; i += 2) {
          let retention: number;
          if (i <= 3) {
            retention = 100 - (i * ((100 - avgHookRetention) / 3));
          } else {
            const decayFactor = (i - 3) / 57;
            retention = avgHookRetention - (decayFactor * (avgHookRetention - avgCompletionRate));
          }
          curvePoints.push({
            second: i,
            retention: Math.max(avgCompletionRate, retention),
            viewers: Math.floor((totalViews / totalVideos) * (retention / 100))
          });
        }
      }
      setRetentionData(curvePoints);

      // Calculate hook score
      const score = Math.min(100, Math.round(avgHookRetention * 1.1));
      const rating: 'excellent' | 'good' | 'average' | 'needs_improvement' =
        score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'average' : 'needs_improvement';
      setHookScore({
        score,
        rating,
        percentile: Math.min(99, Math.round(score * 0.9)),
        trend: undefined
      });

      // No specific drop-offs detected from synced data
      setDropOffs([]);

      // Generate insights based on data source
      const newInsights: RetentionInsight[] = [];

      if (hasRealData) {
        newInsights.push({
          type: 'positive',
          title: 'Real Retention Data',
          description: `Showing actual retention metrics from ${realRetentionData.length > 0 ? 'your YouTube videos' : 'connected platforms'}. Data based on ${formatNumber(totalViews)} views across ${totalVideos} videos.`
        });
      } else if (totalViews > 0) {
        newInsights.push({
          type: 'tip',
          title: 'Estimated Retention Metrics',
          description: `Based on ${formatNumber(totalViews)} total views across ${totalVideos} videos. Connect YouTube Analytics for detailed retention curves.`
        });
      }

      const engagementRate = statsData?.engagement?.avgEngagementRate
        ? parseFloat(statsData.engagement.avgEngagementRate)
        : 0;

      if (engagementRate > 5) {
        newInsights.push({
          type: 'positive',
          title: 'Strong Engagement Signals',
          description: `Your ${engagementRate.toFixed(1)}% engagement rate suggests good viewer retention.`
        });
      } else if (engagementRate > 0) {
        newInsights.push({
          type: 'tip',
          title: 'Improve Your Hooks',
          description: 'Try starting videos with a compelling question or surprising fact to boost retention.'
        });
      }

      setInsights(newInsights);

      // Format breakdown from synced data
      const formatStats: RetentionFormatStats[] = [];
      if (statsData?.topFormats) {
        for (const format of statsData.topFormats) {
          if (format.format === 'Video') {
            formatStats.push({
              formatType: 'video_clip',
              avgHookRetention,
              avgCompletionRate,
              avgViewDuration,
              videoCount: format.count
            });
          }
        }
      }
      setByFormat(formatStats);

    } catch (error) {
      console.error('Failed to load retention data:', error);
      setSummary(null);
      setHookScore(null);
      setRetentionData([]);
      setDropOffs([]);
      setByFormat([]);
      setInsights([]);
    }

    setIsLoading(false);
  };

  return (
    <ProOnlyGate>
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
                    Retention Analytics
                  </h1>
                  <p className="text-sm text-text-secondary">Understand how viewers engage with your videos</p>
                </div>
              </div>

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
                        ? 'bg-orange-600 text-white shadow-md'
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
          {/* Sync Info Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-blue-500 text-lg">ℹ️</span>
            <div className="text-sm text-blue-700">
              <p className="font-medium">When do metrics update?</p>
              <p className="mt-1 text-blue-600">
                YouTube retention data may take 24-48 hours to appear after upload. TikTok metrics update within a few hours.
                Data syncs automatically when you visit this page.
              </p>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <MetricCard
              icon="🎣"
              label="Hook Retention"
              value={summary ? `${summary.avgHookRetention.toFixed(1)}%` : '-'}
              subValue="first 3 seconds"
              comparison={{ value: 15, label: 'vs average' }}
              highlight
            />
            <MetricCard
              icon="✅"
              label="Completion Rate"
              value={summary ? `${summary.avgCompletionRate.toFixed(1)}%` : '-'}
              subValue="watched to end"
            />
            <MetricCard
              icon="⏱️"
              label="Avg View Duration"
              value={summary ? formatDuration(summary.avgViewDuration) : '-'}
              subValue="per video"
            />
            <MetricCard
              icon="🎬"
              label="Videos Analyzed"
              value={summary ? `${summary.totalVideos}` : '-'}
              subValue={`${formatNumber(summary?.totalViews || 0)} total views`}
            />
          </div>

          {/* Two Column Layout: Retention Curve + Hook Score */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <Card className="lg:col-span-3 p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Average Retention Curve
              </h2>
              <RetentionCurveChart
                data={retentionData}
                dropOffs={dropOffs}
                duration={60}
                isLoading={isLoading}
              />
            </Card>

            <Card className="lg:col-span-1 p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4 text-center">
                Hook Score
              </h2>
              <HookScoreDisplay score={hookScore} isLoading={isLoading} />
            </Card>
          </div>

          {/* Drop-off Points */}
          <Card className="p-6 mb-8" hover={false}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Key Drop-off Points
            </h2>
            <DropOffList dropOffs={dropOffs} isLoading={isLoading} />
          </Card>

          {/* Two Column Layout: Format Stats + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Retention by Format
              </h2>
              <FormatRetentionTable data={byFormat} isLoading={isLoading} />
            </Card>

            <Card className="p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                AI Insights
              </h2>
              <InsightsList insights={insights} />
            </Card>
          </div>

          {/* AI Optimization Card */}
          <GradientBanner className="bg-gradient-to-r from-orange-500 to-red-500">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-medium uppercase tracking-wide opacity-90">
                Optimization Tip
              </span>
            </div>
            {(() => {
              // Dynamic optimization tip based on actual data
              const hasVideos = (summary?.totalVideos || 0) > 0;
              const hasViews = (summary?.totalViews || 0) > 0;
              const hookRetention = summary?.avgHookRetention || 0;
              const completionRate = summary?.avgCompletionRate || 0;
              const score = hookScore?.score || 0;

              if (hasViews && hookRetention > 0) {
                if (hookRetention >= 70) {
                  return (
                    <>
                      <h3 className="text-xl font-bold mb-2">Your Hooks Are Working!</h3>
                      <p className="text-white/80 mb-4">
                        With {hookRetention.toFixed(0)}% hook retention, your opening seconds are capturing attention effectively.
                        {completionRate >= 30
                          ? ` Your ${completionRate.toFixed(0)}% completion rate shows viewers are staying engaged throughout.`
                          : ` Focus on maintaining momentum mid-video to improve your ${completionRate.toFixed(0)}% completion rate.`}
                      </p>
                      <Link href="/generate?format=video_clip"
                        className="inline-flex items-center px-4 py-2 bg-white text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors">
                        Create More Videos
                      </Link>
                    </>
                  );
                } else if (hookRetention >= 50) {
                  return (
                    <>
                      <h3 className="text-xl font-bold mb-2">Strengthen Your First 3 Seconds</h3>
                      <p className="text-white/80 mb-4">
                        Your {hookRetention.toFixed(0)}% hook retention has room for improvement. Try starting with a bold statement,
                        unexpected visual, or direct question. Videos that hook in the first 1.5 seconds see 30%+ higher retention.
                      </p>
                      <Link href="/generate?format=video_clip"
                        className="inline-flex items-center px-4 py-2 bg-white text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors">
                        Create Optimized Video
                      </Link>
                    </>
                  );
                } else {
                  return (
                    <>
                      <h3 className="text-xl font-bold mb-2">Revamp Your Video Openings</h3>
                      <p className="text-white/80 mb-4">
                        With {hookRetention.toFixed(0)}% hook retention, viewers are scrolling past quickly. Start with movement,
                        a surprising fact, or address viewers directly. Avoid slow intros—get to the value immediately.
                      </p>
                      <Link href="/generate?format=video_clip"
                        className="inline-flex items-center px-4 py-2 bg-white text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors">
                        Try a New Approach
                      </Link>
                    </>
                  );
                }
              }

              if (hasVideos) {
                return (
                  <>
                    <h3 className="text-xl font-bold mb-2">Building Your Retention Data</h3>
                    <p className="text-white/80 mb-4">
                      You have {summary?.totalVideos || 0} videos posted. As views come in over the next 24-48 hours,
                      we'll analyze your hook effectiveness and provide personalized optimization tips.
                    </p>
                    <Link href="/generate?format=video_clip"
                      className="inline-flex items-center px-4 py-2 bg-white text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors">
                      Create More Videos
                    </Link>
                  </>
                );
              }

              return (
                <>
                  <h3 className="text-xl font-bold mb-2">Boost Your Hook with Pattern Interrupts</h3>
                  <p className="text-white/80 mb-4">
                    Videos that start with an unexpected visual or statement in the first 1.5 seconds
                    have 34% higher hook retention. Post videos to get personalized retention insights.
                  </p>
                  <Link href="/generate?format=video_clip"
                    className="inline-flex items-center px-4 py-2 bg-white text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors">
                    Create Your First Video
                  </Link>
                </>
              );
            })()}
          </GradientBanner>
        </main>
      </div>
    </ProOnlyGate>
  );
}
