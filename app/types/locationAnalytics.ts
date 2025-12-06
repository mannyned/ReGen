// Location Analytics Type Definitions
// For the "Location of Engagement" feature

// ==============================================
// Core Location Types
// ==============================================

export interface GeoLocation {
  id: string;
  countryCode: string;        // ISO 3166-1 alpha-2 (e.g., "US", "GB")
  countryName: string;
  regionCode: string | null;  // ISO 3166-2 (e.g., "US-CA")
  regionName: string | null;
  cityName: string | null;
  cityId: string | null;      // GeoNames ID
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  continent: 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';
}

export interface NormalizedLocation {
  countryCode: string;
  countryName: string;
  regionCode: string | null;
  regionName: string | null;
  cityName: string | null;
  cityId: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  continent: string;
}

// ==============================================
// Engagement Metrics Types
// ==============================================

export interface EngagementMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  totalEngagement: number;
  engagementRate: number;
  weightedScore: number;
}

export interface EngagementTrend {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  previousPeriod: number;
}

export interface LocationEngagement {
  locationId: string;
  countryCode: string;
  countryName: string;
  regionName: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  metrics: EngagementMetrics;
  trend: EngagementTrend;
  contentCount: number;
}

export interface EngagementTotals {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  totalEngagement: number;
  avgEngagementRate: number;
}

// ==============================================
// Content Format Types
// ==============================================

export type FormatCategory = 'video' | 'image' | 'text';

export interface FormatType {
  id: string;
  name: string;
  category: FormatCategory;
  description: string;
  icon: string;
}

export const FORMAT_TYPES: Record<string, FormatType> = {
  video_clip: {
    id: 'video_clip',
    name: 'Video Clip',
    category: 'video',
    description: 'Short-form video clip (< 60s)',
    icon: 'video'
  },
  video_long: {
    id: 'video_long',
    name: 'Long Video',
    category: 'video',
    description: 'Long-form video (> 60s)',
    icon: 'film'
  },
  carousel: {
    id: 'carousel',
    name: 'Carousel',
    category: 'image',
    description: 'Multi-image carousel post',
    icon: 'images'
  },
  single_image: {
    id: 'single_image',
    name: 'Single Image',
    category: 'image',
    description: 'Single image post',
    icon: 'image'
  },
  quote_card: {
    id: 'quote_card',
    name: 'Quote Card',
    category: 'image',
    description: 'Quote graphic card',
    icon: 'quote'
  },
  infographic: {
    id: 'infographic',
    name: 'Infographic',
    category: 'image',
    description: 'Data visualization / infographic',
    icon: 'chart'
  },
  story: {
    id: 'story',
    name: 'Story',
    category: 'image',
    description: 'Ephemeral story content',
    icon: 'clock'
  },
  reel: {
    id: 'reel',
    name: 'Reel',
    category: 'video',
    description: 'Vertical short-form video',
    icon: 'smartphone'
  },
  thread: {
    id: 'thread',
    name: 'Thread',
    category: 'text',
    description: 'Multi-post text thread',
    icon: 'message-square'
  },
  poll: {
    id: 'poll',
    name: 'Poll',
    category: 'text',
    description: 'Interactive poll',
    icon: 'bar-chart'
  },
  live: {
    id: 'live',
    name: 'Live',
    category: 'video',
    description: 'Live stream recording',
    icon: 'radio'
  }
};

export interface FormatPerformance {
  formatId: string;
  formatName: string;
  category: FormatCategory;
  metrics: {
    totalEngagement: number;
    engagementRate: number;
    contentCount: number;
  };
  isTopPerformer: boolean;
}

// ==============================================
// API Request Types
// ==============================================

export type Period = '7d' | '30d' | '90d' | '365d' | 'all';
export type Granularity = 'country' | 'region' | 'city';
export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'all';
export type SortMetric = 'engagement' | 'views' | 'engagement_rate' | 'growth';

export interface EngagementByLocationParams {
  granularity?: Granularity;
  period?: Period;
  platform?: Platform;
  format?: string;
  country?: string;
  limit?: number;
  offset?: number;
}

export interface TopLocationsParams {
  metric?: SortMetric;
  period?: Period;
  limit?: number;
  granularity?: Granularity;
}

export interface FormatPerformanceParams {
  period?: Period;
  country?: string;
  region?: string;
  formats?: string;
}

export interface MapDataParams {
  period?: Period;
  metric?: SortMetric;
  bounds?: string; // "sw_lat,sw_lng,ne_lat,ne_lng"
}

// ==============================================
// API Response Types
// ==============================================

export interface ApiMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PeriodInfo {
  start: string;
  end: string;
  label?: string;
}

export interface AppliedFilters {
  granularity: Granularity;
  platform: Platform;
  format: string;
}

export interface EngagementByLocationResponse {
  success: boolean;
  data: {
    locations: LocationEngagement[];
    totals: EngagementTotals;
    period: PeriodInfo;
    filters: AppliedFilters;
  };
  meta: ApiMeta;
}

export interface RankedLocation {
  rank: number;
  location: {
    id: string;
    name: string;
    countryCode: string;
    flag: string;
  };
  metric: {
    name: string;
    value: number;
    formattedValue: string;
  };
  change: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface TopLocationsResponse {
  success: boolean;
  data: {
    rankings: RankedLocation[];
    period: PeriodInfo;
  };
}

export interface LocationFormatComparison {
  location: {
    id: string;
    name: string;
    countryCode: string;
  };
  formats: FormatPerformance[];
  insight: string | null;
}

export interface FormatPerformanceResponse {
  success: boolean;
  data: {
    comparison: LocationFormatComparison[];
    summary: {
      topFormatOverall: string;
      totalLocationsAnalyzed: number;
      dataPoints: number;
    };
  };
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    locationId: string;
    name: string;
    country: string;
    engagement: number;
    intensity: number; // 0-1 normalized
    radius: number;
  };
}

export interface MapDataResponse {
  success: boolean;
  data: {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
    bounds: {
      sw: [number, number];
      ne: [number, number];
    };
    maxEngagement: number;
    totalLocations: number;
  };
}

// ==============================================
// Ingest Event Types
// ==============================================

export interface RawGeoData {
  raw: string;
  countryCode?: string;
  regionName?: string;
  cityName?: string;
}

export interface EngagementEventInput {
  contentId: string;
  geoData: RawGeoData;
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface IngestEventsRequest {
  source: Platform;
  events: EngagementEventInput[];
  syncId?: string;
}

export interface IngestEventsResponse {
  success: boolean;
  data: {
    processed: number;
    created: number;
    updated: number;
    errors: Array<{
      contentId: string;
      error: string;
    }>;
    syncId: string | null;
  };
}

// ==============================================
// Insights Types
// ==============================================

export type InsightType =
  | 'emerging_region'
  | 'declining_region'
  | 'format_outperformer'
  | 'untapped_potential'
  | 'timing_opportunity'
  | 'cross_platform_variance'
  | 'geographic_content_match';

export interface LocationInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  locationId: string | null;
  locationName: string | null;
  formatId: string | null;
  formatName: string | null;
  metrics: {
    name: string;
    value: number;
    comparison: number;
    changePercent: number;
  } | null;
  priority: number;
  isActionable: boolean;
  actionLabel: string | null;
  actionUrl: string | null;
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

export interface LocationInsightsResponse {
  success: boolean;
  data: {
    insights: LocationInsight[];
    generatedAt: string;
    nextRefresh: string;
  };
}

// ==============================================
// Dashboard Widget Types
// ==============================================

export interface LocationMetricCard {
  icon: string;
  label: string;
  value: string;
  subValue: string;
  change?: number;
  flag?: string;
  badge?: string;
  highlight?: boolean;
}

export interface KeyMetrics {
  topCountry: {
    name: string;
    code: string;
    engagement: number;
    change: number;
  };
  topCity: {
    name: string;
    country: string;
    engagement: number;
    change: number;
  };
  emergingRegion: {
    name: string;
    growth: number;
    previous: number;
    current: number;
  };
  globalReach: {
    countries: number;
    cities: number;
    newThisPeriod: number;
  };
}

// ==============================================
// Utility Types
// ==============================================

export type EngagementSignal = 'views' | 'likes' | 'comments' | 'shares' | 'saves';

export const ENGAGEMENT_WEIGHTS: Record<EngagementSignal, number> = {
  views: 1.0,
  likes: 2.0,
  comments: 3.0,
  shares: 4.0,
  saves: 3.5
};

export const CONTINENT_NAMES: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America'
};

// ==============================================
// Helper Functions
// ==============================================

export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function formatEngagementNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatPercentChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

export function getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
  switch (direction) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
  }
}

export function calculateEngagementRate(metrics: Partial<EngagementMetrics>): number {
  const { views = 0, likes = 0, comments = 0, shares = 0, saves = 0 } = metrics;
  if (views === 0) return 0;
  const engagement = likes + comments + shares + saves;
  return (engagement / views) * 100;
}

export function calculateWeightedScore(metrics: Partial<EngagementMetrics>): number {
  const { views = 0, likes = 0, comments = 0, shares = 0, saves = 0 } = metrics;
  return (
    views * ENGAGEMENT_WEIGHTS.views +
    likes * ENGAGEMENT_WEIGHTS.likes +
    comments * ENGAGEMENT_WEIGHTS.comments +
    shares * ENGAGEMENT_WEIGHTS.shares +
    saves * ENGAGEMENT_WEIGHTS.saves
  );
}

export function formatLocationName(location: Partial<GeoLocation>): string {
  const parts = [location.cityName, location.regionName, location.countryName].filter(Boolean);
  return parts.slice(0, 2).join(', ');
}

export function parsePeriodDays(period: Period): number {
  const match = period.match(/(\d+)([dwmy])/);
  if (!match) return 30;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = { d: 1, w: 7, m: 30, y: 365 };
  return parseInt(num) * (multipliers[unit] || 1);
}
