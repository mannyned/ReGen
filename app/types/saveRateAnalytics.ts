// Save Rate & Retention Analytics Type Definitions

// ==============================================
// Common Types
// ==============================================

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'facebook' | 'pinterest';
export type FormatType = 'video_clip' | 'video_long' | 'carousel' | 'single_image' | 'quote_card' | 'infographic' | 'story' | 'reel' | 'thread' | 'poll' | 'live';
export type Period = '7d' | '30d' | '90d' | '365d' | 'all';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface Trend {
  direction: TrendDirection;
  changePercent: number;
  previousValue?: number;
}

export interface PeriodInfo {
  start: string;
  end: string;
  granularity?: string;
}

// ==============================================
// Save Rate Types
// ==============================================

export interface SaveMetrics {
  saves: number;
  impressions: number;
  saveRate: number;  // (saves / impressions) * 100
}

export interface SaveRateSummary extends SaveMetrics {
  contentCount: number;
  trend: Trend;
}

export interface SaveRateByFormat {
  formatType: FormatType;
  saves: number;
  impressions: number;
  saveRate: number;
  contentCount: number;
  trend?: Trend;
}

export interface SaveRateByPlatform {
  platform: Platform;
  saves: number;
  impressions: number;
  saveRate: number;
  contentCount: number;
}

export interface SaveRateTrendPoint {
  date: string;
  saveRate: number;
  saves: number;
  impressions: number;
}

export interface SaveRateTrendSummary {
  average: number;
  min: number;
  max: number;
  trend: TrendDirection;
  changePercent: number;
}

export interface TopSavedPost {
  rank: number;
  contentId: string;
  title: string;
  thumbnail: string;
  platform: Platform;
  formatType: FormatType;
  saves: number;
  impressions: number;
  saveRate: number;
  publishedAt: string;
}

// API Response Types
export interface SaveRateResponse {
  success: boolean;
  data: {
    summary: SaveRateSummary;
    byFormat: SaveRateByFormat[];
    byPlatform: SaveRateByPlatform[];
    period: PeriodInfo;
  };
}

export interface SaveRateTrendsResponse {
  success: boolean;
  data: {
    trends: SaveRateTrendPoint[];
    summary: SaveRateTrendSummary;
    period: PeriodInfo;
  };
}

export interface TopSavedPostsResponse {
  success: boolean;
  data: {
    topPosts: TopSavedPost[];
    period: PeriodInfo;
  };
}

// ==============================================
// Retention Analytics Types
// ==============================================

export interface RetentionDataPoint {
  second: number;
  retention: number;      // Percentage 0-100
  viewers: number;        // Absolute count
}

export type DropOffSeverity = 'minor' | 'moderate' | 'major';

export interface DropOffPoint {
  second: number;
  dropPercent: number;
  severity: DropOffSeverity;
  label: string;
  suggestion: string;
}

export type HookRating = 'excellent' | 'good' | 'average' | 'needs_improvement';

export interface HookScore {
  score: number;          // 0-100
  rating: HookRating;
  percentile: number;     // vs other creators
  trend?: Trend;
}

export interface RetentionCurve {
  dataPoints: RetentionDataPoint[];
}

export interface RetentionMetrics {
  hookRetention: number;          // First 3 seconds average
  hookScore: HookScore;
  averageViewDuration: number;    // In seconds
  completionRate: number;         // % who finished
  dropOffPoints: DropOffPoint[];
}

export interface RetentionInsight {
  type: 'positive' | 'warning' | 'tip' | 'improvement';
  title: string;
  description: string;
}

export interface RetentionComparison {
  vsYourAverage: {
    hookRetention: number;
    completionRate: number;
  };
  vsCreatorAverage: {
    hookRetention: number;
    completionRate: number;
  };
}

export interface RetentionCurveData {
  contentId: string;
  title: string;
  platform: Platform;
  videoDuration: number;
  totalViews: number;
  curve: RetentionCurve;
  metrics: RetentionMetrics;
  insights: RetentionInsight[];
  comparison: RetentionComparison;
}

// Aggregated Retention Stats
export interface RetentionFormatStats {
  formatType: FormatType;
  avgHookRetention: number;
  avgCompletionRate: number;
  avgViewDuration: number;
  videoCount: number;
}

export interface RetentionTrendPoint {
  date: string;
  value: number;
}

export interface RetentionAveragesSummary {
  avgHookRetention: number;
  avgCompletionRate: number;
  avgViewDuration: number;
  totalVideos: number;
  totalViews: number;
}

export interface BenchmarkComparison {
  hookRetention: {
    value: number;
    label: string;
  };
  completionRate: {
    value: number;
    label: string;
  };
  viewDuration: {
    value: number;
    label: string;
  };
}

// API Response Types
export interface RetentionCurveResponse {
  success: boolean;
  data: RetentionCurveData;
}

export interface RetentionAveragesResponse {
  success: boolean;
  data: {
    summary: RetentionAveragesSummary;
    hookScore: HookScore;
    byFormat: RetentionFormatStats[];
    trends: {
      hookRetention: RetentionTrendPoint[];
      completionRate: RetentionTrendPoint[];
    };
    insights: RetentionInsight[];
    comparison: {
      vsAverageCreator: BenchmarkComparison;
    };
    period: PeriodInfo;
  };
}

// ==============================================
// Analytics Insights Types
// ==============================================

export type InsightFeature = 'save_rate' | 'retention' | 'location';

export type SaveRateInsightType =
  | 'format_leader'
  | 'save_rate_spike'
  | 'declining_saves'
  | 'platform_opportunity'
  | 'top_performer';

export type RetentionInsightType =
  | 'hook_improvement'
  | 'major_dropoff'
  | 'completion_decline'
  | 'format_retention_diff'
  | 'above_benchmark'
  | 'below_benchmark';

export interface AnalyticsInsight {
  id: string;
  feature: InsightFeature;
  type: SaveRateInsightType | RetentionInsightType;
  title: string;
  description: string;
  contentId?: string;
  formatType?: FormatType;
  platform?: Platform;
  metricData?: {
    name: string;
    value: number;
    change?: number;
    benchmark?: number;
  };
  priority: number;
  isActionable: boolean;
  actionLabel?: string;
  actionUrl?: string;
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

// ==============================================
// API Error Response
// ==============================================

export interface PlanUpgradeRequired {
  success: false;
  error: 'PLAN_UPGRADE_REQUIRED';
  message: string;
  requiredPlan: 'Creator' | 'Pro';
  currentPlan: string;
  upgradeUrl: string;
}

// ==============================================
// Utility Functions
// ==============================================

export function formatSaveRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `0:${secs.toString().padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function getTrendIcon(direction: TrendDirection): string {
  switch (direction) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'stable': return '→';
  }
}

export function getTrendColor(direction: TrendDirection): string {
  switch (direction) {
    case 'up': return 'text-green-600';
    case 'down': return 'text-red-600';
    case 'stable': return 'text-gray-500';
  }
}

export function getHookRatingColor(rating: HookRating): string {
  switch (rating) {
    case 'excellent': return 'text-green-600 bg-green-50';
    case 'good': return 'text-blue-600 bg-blue-50';
    case 'average': return 'text-yellow-600 bg-yellow-50';
    case 'needs_improvement': return 'text-red-600 bg-red-50';
  }
}

export function getDropOffSeverityColor(severity: DropOffSeverity): string {
  switch (severity) {
    case 'major': return 'bg-red-500';
    case 'moderate': return 'bg-yellow-500';
    case 'minor': return 'bg-orange-400';
  }
}

export function calculateSaveRate(saves: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (saves / impressions) * 100;
}

export function getFormatIcon(format: FormatType): string {
  const icons: Record<FormatType, string> = {
    video_clip: '🎬',
    video_long: '🎥',
    carousel: '🎠',
    single_image: '📷',
    quote_card: '💬',
    infographic: '📊',
    story: '📱',
    reel: '🎞️',
    thread: '🧵',
    poll: '📊',
    live: '🔴'
  };
  return icons[format] || '📄';
}

export function getPlatformIcon(platform: Platform): string {
  const icons: Record<Platform, string> = {
    instagram: '📷',
    tiktok: '🎵',
    youtube: '▶️',
    linkedin: '💼',
    x: '𝕏',
    facebook: '👤',
    pinterest: '📌'
  };
  return icons[platform] || '🌐';
}
