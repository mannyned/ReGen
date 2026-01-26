'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlan } from '@/app/context/PlanContext';
import { hasLocationAnalytics } from '@/app/config/plans';
import { AppHeader, Card, Badge, GradientBanner, MetricInfo } from '@/app/components/ui';
import { MetricTooltips } from '@/app/components/ui/Tooltip';
import type { SocialPlatform } from '@/lib/types/social';
import type {
  Period,
  KeyMetrics,
  RankedLocation,
  LocationInsight,
  GeoJSONFeature
} from '@/app/types/locationAnalytics';

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

  const hasAccess = hasLocationAnalytics(currentPlan);
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
            {/* Preview Image / Blur */}
            <div className="relative h-64 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="absolute inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-float">🌍</div>
                  <Badge variant="primary" className="bg-purple-100 text-purple-700">
                    Pro Feature
                  </Badge>
                </div>
              </div>

              {/* Fake map preview */}
              <div className="absolute inset-4 rounded-xl bg-gradient-to-b from-blue-100 to-blue-200 opacity-50">
                <div className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-purple-400 animate-pulse" />
                <div className="absolute top-1/3 right-1/3 w-6 h-6 rounded-full bg-blue-400 animate-pulse" />
                <div className="absolute bottom-1/3 left-1/2 w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                Unlock Location Analytics
              </h2>
              <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                See exactly where your audience engages the most. Get geographic insights,
                discover emerging markets, and learn which content formats perform best in each region.
              </p>

              {/* Feature List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left max-w-lg mx-auto">
                {[
                  'Interactive engagement map',
                  'Country, region & city breakdown',
                  'Format performance by region',
                  'AI-powered location insights',
                  'Emerging market detection',
                  'Export location reports'
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
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
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
                  <div className="text-6xl mb-4 opacity-50">🌍</div>
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
// Metric Card Component
// ============================================
interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  subValue: string;
  change?: number;
  flag?: string;
  badge?: string;
  highlight?: boolean;
  tooltipKey?: keyof typeof MetricTooltips;
  platform?: SocialPlatform | 'all';
  currentValue?: number;
}

function MetricCard({ icon, label, value, subValue, change, flag, badge, highlight, tooltipKey, platform, currentValue }: MetricCardProps) {
  // Convert 'all' to undefined for tooltip (no platform-specific content)
  const tooltipPlatform = platform === 'all' ? undefined : platform;

  return (
    <Card className={`p-5 ${highlight ? 'border-purple-200 bg-purple-50/50' : ''}`} hover={false}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1">
          {icon} {label}
          {tooltipKey && (
            <MetricInfo
              metric={tooltipKey}
              platform={tooltipPlatform}
              currentValue={currentValue}
            />
          )}
        </span>
        {badge && (
          <Badge variant="success">{badge}</Badge>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        {flag && <span className="text-xl">{flag}</span>}
        <span className="text-2xl font-bold text-text-primary">{value}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-text-secondary">{subValue}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </Card>
  );
}

// ============================================
// Top Locations Panel Component
// ============================================
interface TopLocationsPanelProps {
  locations: RankedLocation[];
  isLoading: boolean;
}

function TopLocationsPanel({ locations, isLoading }: TopLocationsPanelProps) {
  const [view, setView] = useState<'countries' | 'cities'>('countries');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Tab Selector */}
      <div className="flex gap-2 mb-4">
        {(['countries', 'cities'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
              view === tab
                ? 'bg-text-primary text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Location List */}
      <div className="space-y-2">
        {locations.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <div className="text-3xl mb-2">📍</div>
            <p className="font-medium text-text-primary">No countries yet</p>
            <p className="text-sm mt-1 max-w-xs mx-auto">
              Once your content reaches viewers in different countries, they'll appear here ranked by engagement.
            </p>
          </div>
        ) : (
          locations.map((loc) => (
            <div
              key={loc.location.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium text-text-secondary w-6">
                  {loc.rank}.
                </span>
                <span className="text-xl">{loc.location.flag}</span>
                <span className="font-medium text-text-primary">{loc.location.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-text-primary">
                  {loc.metric.formattedValue}
                </span>
                <span className={`text-sm font-medium ${
                  loc.change.direction === 'up' ? 'text-green-600' :
                  loc.change.direction === 'down' ? 'text-red-600' : 'text-text-secondary'
                }`}>
                  {loc.change.direction === 'up' ? '↑' : loc.change.direction === 'down' ? '↓' : '→'}
                  {Math.abs(loc.change.value)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {locations.length > 0 && (
        <button className="w-full mt-4 py-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors">
          View All →
        </button>
      )}
    </div>
  );
}

// ============================================
// Location Map Component (Simplified)
// ============================================
interface LocationMapProps {
  data: { features: GeoJSONFeature[] } | null;
  isLoading: boolean;
}

function LocationMap({ data, isLoading }: LocationMapProps) {
  if (isLoading) {
    return (
      <div className="h-80 bg-gray-100 rounded-xl flex items-center justify-center animate-pulse">
        <span className="text-text-secondary">Loading map data...</span>
      </div>
    );
  }

  if (!data || !data.features.length) {
    return (
      <div className="h-80 bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
        <div className="text-center text-text-secondary px-6">
          <div className="text-4xl mb-3">🌍</div>
          <p className="font-medium text-text-primary">Your map is waiting to light up!</p>
          <p className="text-sm mt-2 max-w-sm">
            As your content gains views across different countries, this map will show where your audience is located.
          </p>
        </div>
      </div>
    );
  }

  // Simple SVG map visualization
  const geoToSvg = (lon: number, lat: number) => ({
    x: ((lon + 180) / 360) * 800,
    y: ((90 - lat) / 180) * 400
  });

  const getColor = (intensity: number) => {
    if (intensity > 0.8) return '#7C3AED';
    if (intensity > 0.5) return '#3B82F6';
    if (intensity > 0.2) return '#10B981';
    return '#9CA3AF';
  };

  return (
    <div className="relative">
      <svg viewBox="0 0 800 400" className="w-full h-80 bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl">
        {/* World background */}
        <rect x="0" y="0" width="800" height="400" fill="#E0F2FE" />

        {/* Continental shapes (simplified) */}
        <ellipse cx="200" cy="160" rx="100" ry="60" fill="#D1FAE5" opacity="0.4" />
        <ellipse cx="420" cy="140" rx="90" ry="70" fill="#D1FAE5" opacity="0.4" />
        <ellipse cx="580" cy="180" rx="120" ry="80" fill="#D1FAE5" opacity="0.4" />
        <ellipse cx="680" cy="300" rx="60" ry="40" fill="#D1FAE5" opacity="0.4" />

        {/* Engagement markers */}
        {data.features.map((feature, idx) => {
          const [lon, lat] = feature.geometry.coordinates;
          const pos = geoToSvg(lon, lat);
          const { intensity, name } = feature.properties;
          const radius = Math.max(6, Math.min(20, intensity * 20));
          const color = getColor(intensity);

          return (
            <g key={idx}>
              {intensity > 0.7 && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 4}
                  fill={color}
                  opacity="0.2"
                  className="animate-ping"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={color}
                opacity="0.85"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-100 transition-opacity"
              />
              {intensity > 0.5 && (
                <text
                  x={pos.x}
                  y={pos.y - radius - 6}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-xs">
        <div className="font-medium text-text-primary mb-1.5">Engagement Level</div>
        <div className="flex items-center gap-3">
          {[
            { color: 'bg-gray-400', label: 'Low' },
            { color: 'bg-green-500', label: 'Med' },
            { color: 'bg-blue-500', label: 'High' },
            { color: 'bg-purple-600', label: 'Hot' }
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Insights Carousel Component
// ============================================
interface InsightsCarouselProps {
  insights: LocationInsight[];
}

interface InsightsCarouselPropsExtended extends InsightsCarouselProps {
  selectedPlatform?: PlatformFilter;
}

function InsightsCarousel({ insights, selectedPlatform }: InsightsCarouselPropsExtended) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (insights.length === 0) return null;

  const insight = insights[currentIndex];

  return (
    <GradientBanner>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💡</span>
        <span className="text-sm font-medium uppercase tracking-wide opacity-90">
          Location Insight {selectedPlatform && selectedPlatform !== 'all' && `for ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}`}
        </span>
      </div>

      <h3 className="text-xl font-bold mb-2">{insight.title}</h3>
      <p className="text-white/80 mb-4">{insight.description}</p>

      {insight.metrics && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
            {insight.locationName}: {insight.metrics.value.toFixed(1)}%
          </div>
          <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
            Global Avg: {insight.metrics.comparison.toFixed(1)}%
          </div>
        </div>
      )}

      {insight.isActionable && insight.actionLabel && (
        <button className="px-4 py-2 bg-white text-primary rounded-xl font-medium hover:bg-gray-50 transition-colors">
          {insight.actionLabel} →
        </button>
      )}

      {/* Navigation dots */}
      {insights.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {insights.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </GradientBanner>
  );
}

// ============================================
// Main Page Component
// ============================================
interface FormatPerformance {
  format: string;
  count: number;
  engagementRate: number;
  totalEngagement: number;
}

type PlatformFilter = 'all' | 'instagram' | 'youtube' | 'facebook' | 'tiktok' | 'linkedin' | 'linkedin-org' | 'twitter' | 'pinterest' | 'discord' | 'reddit';

export default function LocationAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<KeyMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<RankedLocation[]>([]);
  const [mapData, setMapData] = useState<{ features: GeoJSONFeature[] } | null>(null);
  const [insights, setInsights] = useState<LocationInsight[]>([]);
  const [formatPerformance, setFormatPerformance] = useState<FormatPerformance[]>([]);

  useEffect(() => {
    loadData();
  }, [period, selectedPlatform]);

  // Country code to name mapping
  const countryNames: Record<string, string> = {
    US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
    DE: 'Germany', FR: 'France', BR: 'Brazil', MX: 'Mexico', IN: 'India',
    JP: 'Japan', KR: 'South Korea', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
    AT: 'Austria', CH: 'Switzerland', BE: 'Belgium', PT: 'Portugal', IE: 'Ireland',
    NZ: 'New Zealand', SG: 'Singapore', HK: 'Hong Kong', AE: 'UAE', SA: 'Saudi Arabia',
    ZA: 'South Africa', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
    PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam',
    TR: 'Turkey', RU: 'Russia', UA: 'Ukraine', EG: 'Egypt', NG: 'Nigeria',
  };

  // Country coordinates for map (approximate centers)
  const countryCoords: Record<string, [number, number]> = {
    US: [-98.58, 39.83], GB: [-3.44, 55.38], CA: [-106.35, 56.13], AU: [133.78, -25.27],
    DE: [10.45, 51.17], FR: [2.21, 46.23], BR: [-51.93, -14.24], MX: [-102.55, 23.63],
    IN: [78.96, 20.59], JP: [138.25, 36.20], KR: [127.77, 35.91], ES: [-3.75, 40.46],
    IT: [12.57, 41.87], NL: [5.29, 52.13], SE: [18.64, 60.13], NO: [8.47, 60.47],
    DK: [9.50, 56.26], FI: [25.75, 61.92], PL: [19.15, 51.92], AT: [14.55, 47.52],
    CH: [8.23, 46.82], BE: [4.47, 50.50], PT: [-8.22, 39.40], IE: [-8.24, 53.41],
    NZ: [174.89, -40.90], SG: [103.82, 1.35], HK: [114.11, 22.40], AE: [53.85, 23.42],
    SA: [45.08, 23.89], ZA: [22.94, -30.56], AR: [-63.62, -38.42], CL: [-71.54, -35.68],
    CO: [-74.30, 4.57], PE: [-75.02, -9.19], PH: [121.77, 12.88], ID: [113.92, -0.79],
    MY: [101.98, 4.21], TH: [100.99, 15.87], VN: [108.28, 14.06], TR: [35.24, 38.96],
    RU: [105.32, 61.52], UA: [31.17, 48.38], EG: [30.80, 26.82], NG: [8.68, 9.08],
  };

  const loadData = async () => {
    setIsLoading(true);

    try {
      // Try to get user info for platform API calls
      const userRes = await fetch('/api/auth/me');
      let userId = null;
      if (userRes.ok) {
        const userData = await userRes.json();
        userId = userData?.id;
      }

      if (!userId) {
        setMetrics(null);
        setTopLocations([]);
        setMapData(null);
        setInsights([]);
        setIsLoading(false);
        return;
      }

      // Fetch location data from connected platforms
      // YouTube requires yt-analytics.readonly scope
      // Instagram requires instagram_insights with business account
      // Facebook requires read_insights for page
      // LinkedIn Company requires rw_organization_admin scope
      const allPlatforms = ['youtube', 'instagram', 'facebook', 'linkedin-org'];
      // Filter platforms based on selected platform
      const platforms = selectedPlatform === 'all'
        ? allPlatforms
        : allPlatforms.filter(p => p === selectedPlatform);
      const allLocationData: Array<{ country: string; percentage: number; engagement: number }> = [];

      for (const platform of platforms) {
        try {
          const res = await fetch(`/api/analytics?type=location&platform=${platform}&userId=${userId}`);
          const data = await res.json();

          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            // Add platform tag to each location for tracking
            for (const loc of data.data) {
              allLocationData.push({
                ...loc,
                platform,
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch ${platform} location data:`, err);
        }
      }

      // Aggregate location data by country
      const aggregated: Record<string, { percentage: number; engagement: number }> = {};
      for (const loc of allLocationData) {
        if (!aggregated[loc.country]) {
          aggregated[loc.country] = { percentage: 0, engagement: 0 };
        }
        aggregated[loc.country].percentage += loc.percentage;
        aggregated[loc.country].engagement += loc.engagement;
      }

      // Sort by engagement
      const sortedCountries = Object.entries(aggregated)
        .sort((a, b) => b[1].engagement - a[1].engagement);

      if (sortedCountries.length === 0) {
        // No location data available - show helpful message
        setMetrics(null);
        setTopLocations([]);
        setMapData(null);

        // Show insight about what's needed for location analytics
        setInsights([{
          id: '1',
          type: 'untapped_potential',
          title: 'Building Your Geographic Data',
          description: 'Location analytics require sufficient engagement data. YouTube, Instagram, and Facebook need a meaningful number of views (typically 50-100+) before they can provide geographic breakdowns. Keep posting content and check back as your audience grows!',
          locationId: 'growing',
          locationName: 'Growing Audience',
          formatId: null,
          formatName: null,
          metrics: null,
          priority: 100,
          isActionable: true,
          actionLabel: 'Create Content',
          actionUrl: '/generate',
          validFrom: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        }]);

        setIsLoading(false);
        return;
      }

      // Build metrics from real data
      const topCountryCode = sortedCountries[0][0];
      const topCountryData = sortedCountries[0][1];
      const totalEngagement = sortedCountries.reduce((sum, [, data]) => sum + data.engagement, 0);

      setMetrics({
        topCountry: {
          name: countryNames[topCountryCode] || topCountryCode,
          code: topCountryCode,
          engagement: topCountryData.engagement,
          change: 0 // Would need historical data
        },
        topCity: {
          name: '—', // City-level data requires more detailed API access
          country: topCountryCode,
          engagement: 0,
          change: 0
        },
        emergingRegion: {
          name: sortedCountries.length > 3 ? (countryNames[sortedCountries[3][0]] || sortedCountries[3][0]) : '—',
          growth: 0,
          previous: 0,
          current: sortedCountries.length > 3 ? sortedCountries[3][1].engagement : 0
        },
        globalReach: {
          countries: sortedCountries.length,
          cities: 0, // City count requires detailed data
          newThisPeriod: 0
        }
      });

      // Build top locations list
      const topLocs: RankedLocation[] = sortedCountries.slice(0, 10).map(([code, data], idx) => ({
        rank: idx + 1,
        location: {
          id: code,
          name: countryNames[code] || code,
          countryCode: code,
          flag: getFlag(code)
        },
        metric: {
          name: 'engagement',
          value: data.engagement,
          formattedValue: formatNumber(data.engagement)
        },
        change: {
          value: 0, // Would need historical data
          direction: 'stable' as const
        }
      }));
      setTopLocations(topLocs);

      // Build map data
      const maxEngagement = Math.max(...sortedCountries.map(([, d]) => d.engagement));
      const features: GeoJSONFeature[] = sortedCountries
        .filter(([code]) => countryCoords[code])
        .map(([code, data]) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: countryCoords[code]
          },
          properties: {
            locationId: code,
            name: countryNames[code] || code,
            country: code,
            engagement: data.engagement,
            intensity: maxEngagement > 0 ? data.engagement / maxEngagement : 0,
            radius: Math.max(6, Math.min(20, (data.engagement / maxEngagement) * 20))
          }
        }));
      setMapData({ features });

      // Generate insights based on real data
      const newInsights: LocationInsight[] = [];
      if (sortedCountries.length > 0) {
        const [topCode, topData] = sortedCountries[0];
        newInsights.push({
          id: '1',
          type: 'geographic_content_match',
          title: `${countryNames[topCode] || topCode} Leads Your Engagement`,
          description: `${countryNames[topCode] || topCode} accounts for ${((topData.engagement / totalEngagement) * 100).toFixed(1)}% of your total engagement. Consider creating more content tailored to this audience.`,
          locationId: topCode,
          locationName: countryNames[topCode] || topCode,
          formatId: null,
          formatName: null,
          metrics: {
            name: 'engagement share',
            value: (topData.engagement / totalEngagement) * 100,
            comparison: 100 / sortedCountries.length,
            changePercent: 0
          },
          priority: 90,
          isActionable: true,
          actionLabel: 'View Content Strategy',
          actionUrl: '/generate',
          validFrom: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
      }
      setInsights(newInsights);

      // Fetch format performance data from stats API
      try {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
        const platformParam = selectedPlatform !== 'all' ? `&platform=${selectedPlatform}` : '';
        const statsRes = await fetch(`/api/analytics/stats?days=${days}${platformParam}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData?.topFormats && statsData.topFormats.length > 0) {
            const formats: FormatPerformance[] = statsData.topFormats.map((f: { format: string; count: number; engagementRate: number; totalEngagement: number }) => ({
              format: f.format,
              count: f.count,
              engagementRate: f.engagementRate || 0,
              totalEngagement: f.totalEngagement || 0
            }));
            setFormatPerformance(formats);
          } else {
            setFormatPerformance([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch format data:', err);
        setFormatPerformance([]);
      }

    } catch (error) {
      console.error('Failed to load location data:', error);
      setMetrics(null);
      setTopLocations([]);
      setMapData(null);
      setInsights([]);
      setFormatPerformance([]);
    }

    setIsLoading(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getFlag = (code: string): string => {
    if (!code) return '';
    const codePoints = code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
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
                    Location of Engagement
                  </h1>
                  <p className="text-sm text-text-secondary">See where your audience engages the most</p>
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
                  <option value="linkedin">LinkedIn Personal</option>
                  <option value="linkedin-org">LinkedIn Company</option>
                  <option value="twitter">Twitter</option>
                  <option value="facebook">Facebook</option>
                  <option value="pinterest">Pinterest</option>
                  <option value="discord">Discord</option>
                  <option value="reddit">Reddit</option>
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
                        ? 'bg-primary text-white shadow-md'
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
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-lg">ℹ️</span>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-2">Location Data Requirements by Platform</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-blue-600">
                  <div className="flex items-center gap-2">
                    <span>📺</span>
                    <span><strong>YouTube:</strong> 50+ views, 24-48h delay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📸</span>
                    <span><strong>Instagram:</strong> Business/Creator account, 100+ followers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span><strong>Facebook:</strong> Page required, any follower count</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🏢</span>
                    <span><strong>LinkedIn Company:</strong> Admin access, 100+ followers</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span>🐦</span>
                    <span><strong>Twitter/X:</strong> Not available (API limitation)</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span>🎵</span>
                    <span><strong>TikTok:</strong> Not available (API limitation)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Row */}
          {selectedPlatform !== 'all' && (
            <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <span className="text-blue-600">📊</span>
              <span className="text-sm text-blue-700">
                Showing location data for <strong className="capitalize">{selectedPlatform}</strong> only.
                {' '}Select "All Platforms" to see combined geographic data.
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <MetricCard
              icon="🌍"
              label="Top Country"
              value={metrics?.topCountry.name || '-'}
              subValue={`${formatNumber(metrics?.topCountry.engagement || 0)} engagement`}
              change={metrics?.topCountry.change}
              flag={getFlag(metrics?.topCountry.code || '')}
              tooltipKey="topCountry"
              platform={selectedPlatform as SocialPlatform | 'all'}
              currentValue={metrics?.topCountry.engagement}
            />
            <MetricCard
              icon="🏙️"
              label="Top City"
              value={metrics?.topCity.name || '-'}
              subValue={`${formatNumber(metrics?.topCity.engagement || 0)} engagement`}
              change={metrics?.topCity.change}
            />
            <MetricCard
              icon="🚀"
              label="Emerging Region"
              value={metrics?.emergingRegion.name || '-'}
              subValue={`${formatNumber(metrics?.emergingRegion.previous || 0)} → ${formatNumber(metrics?.emergingRegion.current || 0)}`}
              change={metrics?.emergingRegion.growth}
              highlight
              tooltipKey="emergingRegion"
              platform={selectedPlatform as SocialPlatform | 'all'}
              currentValue={metrics?.emergingRegion.growth}
            />
            <MetricCard
              icon="🌐"
              label="Global Reach"
              value={`${metrics?.globalReach.countries || 0} Countries`}
              subValue={`${metrics?.globalReach.cities || 0} Cities`}
              badge={`+${metrics?.globalReach.newThisPeriod || 0} new`}
              tooltipKey="globalReach"
              platform={selectedPlatform as SocialPlatform | 'all'}
              currentValue={metrics?.globalReach.countries}
            />
          </div>

          {/* Map + Top Locations */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <Card className="lg:col-span-3 p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Engagement Map
              </h2>
              <LocationMap data={mapData} isLoading={isLoading} />
            </Card>

            <Card className="lg:col-span-2 p-6" hover={false}>
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Where Your Content Hits the Hardest
              </h2>
              <TopLocationsPanel locations={topLocations} isLoading={isLoading} />
            </Card>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="mb-8 animate-slide-up">
              <InsightsCarousel insights={insights} selectedPlatform={selectedPlatform} />
            </div>
          )}

          {/* Format Performance Section */}
          <Card className="p-6" hover={false}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Top Performing Formats {selectedPlatform !== 'all' ? `on ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}` : 'by Region'}
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : formatPerformance.length > 0 ? (
              <div className="space-y-4">
                {topLocations.length === 0 && (
                  <p className="text-sm text-text-secondary mb-4">
                    Regional breakdown will be available once you have 50+ views. Showing overall format performance:
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formatPerformance.map((format, idx) => (
                    <div
                      key={format.format}
                      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">
                          {format.format === 'Video' ? '🎬' :
                           format.format === 'Image' ? '🖼️' :
                           format.format === 'Audio' ? '🎵' : '📄'}
                        </span>
                        <span className="font-medium text-text-primary">{format.format}</span>
                        {idx === 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Top</span>}
                      </div>
                      <div className="text-2xl font-bold text-text-primary mb-1">
                        {format.engagementRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-text-secondary">
                        {formatNumber(format.totalEngagement)} engagements · {format.count} posts
                      </div>
                      {/* Performance bar */}
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (format.engagementRate / (formatPerformance[0]?.engagementRate || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {topLocations.length > 0 && (
                  <p className="text-xs text-text-secondary mt-4">
                    💡 Tip: Compare format performance across your top regions to optimize content for each audience.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <div className="text-3xl mb-2">🎨</div>
                <p className="font-medium text-text-primary">No format data yet</p>
                <p className="text-sm mt-2 max-w-xs mx-auto">
                  Post different content types (videos, images, carousels) to see which formats perform best.
                </p>
              </div>
            )}
          </Card>

        </main>
      </div>
    </ProOnlyGate>
  );
}
