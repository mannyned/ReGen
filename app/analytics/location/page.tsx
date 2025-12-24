'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlan } from '@/app/context/PlanContext';
import { hasLocationAnalytics } from '@/app/config/plans';
import { AppHeader, Card, Badge, GradientBanner } from '@/app/components/ui';
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
}

function MetricCard({ icon, label, value, subValue, change, flag, badge, highlight }: MetricCardProps) {
  return (
    <Card className={`p-5 ${highlight ? 'border-purple-200 bg-purple-50/50' : ''}`} hover={false}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          {icon} {label}
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
            <p>No location data yet</p>
            <p className="text-sm mt-1">Connect your social accounts to see engagement by location</p>
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
        <div className="text-center text-text-secondary">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="font-medium">No location data yet</p>
          <p className="text-sm mt-1">Connect your accounts to see the map</p>
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

function InsightsCarousel({ insights }: InsightsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (insights.length === 0) return null;

  const insight = insights[currentIndex];

  return (
    <GradientBanner>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💡</span>
        <span className="text-sm font-medium uppercase tracking-wide opacity-90">
          Location Insight
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
export default function LocationAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<KeyMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<RankedLocation[]>([]);
  const [mapData, setMapData] = useState<{ features: GeoJSONFeature[] } | null>(null);
  const [insights, setInsights] = useState<LocationInsight[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setIsLoading(true);

    // In production, load empty data (real API integration would go here)
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Production: Show empty state until real data is available
      setMetrics(null);
      setTopLocations([]);
      setMapData(null);
      setInsights([]);
      setIsLoading(false);
      return;
    }

    // Development: Simulate API calls with mock data
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock data for development only
    setMetrics({
      topCountry: { name: 'United States', code: 'US', engagement: 45200, change: 12 },
      topCity: { name: 'Los Angeles', country: 'US', engagement: 9800, change: 24 },
      emergingRegion: { name: 'São Paulo', growth: 156, previous: 2100, current: 5400 },
      globalReach: { countries: 47, cities: 234, newThisPeriod: 8 }
    });

    setTopLocations([
      { rank: 1, location: { id: '1', name: 'United States', countryCode: 'US', flag: '🇺🇸' }, metric: { name: 'engagement', value: 45200, formattedValue: '45.2K' }, change: { value: 12, direction: 'up' } },
      { rank: 2, location: { id: '2', name: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧' }, metric: { name: 'engagement', value: 18900, formattedValue: '18.9K' }, change: { value: 8, direction: 'up' } },
      { rank: 3, location: { id: '3', name: 'Canada', countryCode: 'CA', flag: '🇨🇦' }, metric: { name: 'engagement', value: 12400, formattedValue: '12.4K' }, change: { value: 15, direction: 'up' } },
      { rank: 4, location: { id: '4', name: 'Australia', countryCode: 'AU', flag: '🇦🇺' }, metric: { name: 'engagement', value: 8700, formattedValue: '8.7K' }, change: { value: 22, direction: 'up' } },
      { rank: 5, location: { id: '5', name: 'Germany', countryCode: 'DE', flag: '🇩🇪' }, metric: { name: 'engagement', value: 6200, formattedValue: '6.2K' }, change: { value: 5, direction: 'up' } },
    ]);

    setMapData({
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.24, 34.05] }, properties: { locationId: '1', name: 'Los Angeles', country: 'US', engagement: 9800, intensity: 0.95, radius: 20 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [-0.12, 51.51] }, properties: { locationId: '2', name: 'London', country: 'GB', engagement: 7200, intensity: 0.72, radius: 16 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.94, 40.67] }, properties: { locationId: '3', name: 'New York', country: 'US', engagement: 6900, intensity: 0.68, radius: 15 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [-79.38, 43.65] }, properties: { locationId: '4', name: 'Toronto', country: 'CA', engagement: 4500, intensity: 0.45, radius: 12 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [151.21, -33.87] }, properties: { locationId: '5', name: 'Sydney', country: 'AU', engagement: 3800, intensity: 0.38, radius: 10 } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [-46.63, -23.55] }, properties: { locationId: '6', name: 'São Paulo', country: 'BR', engagement: 5400, intensity: 0.54, radius: 13 } },
      ]
    });

    setInsights([
      {
        id: '1',
        type: 'format_outperformer',
        title: 'Carousel Sweet Spot in London',
        description: 'Your carousel posts get 34% more saves in London compared to your global average. Consider creating more carousel content for your UK audience.',
        locationId: '2',
        locationName: 'London',
        formatId: 'carousel',
        formatName: 'Carousel',
        metrics: { name: 'saves', value: 8.2, comparison: 6.1, changePercent: 34 },
        priority: 80,
        isActionable: true,
        actionLabel: 'Create Carousel for UK',
        actionUrl: '/generate?format=carousel',
        validFrom: '2024-01-24',
        validUntil: '2024-01-31',
        createdAt: '2024-01-24T00:00:00Z'
      },
      {
        id: '2',
        type: 'emerging_region',
        title: 'São Paulo is Heating Up',
        description: 'Your audience in São Paulo has grown 156% this week. This emerging market shows strong potential for localized content.',
        locationId: '6',
        locationName: 'São Paulo',
        formatId: null,
        formatName: null,
        metrics: { name: 'growth', value: 156, comparison: 100, changePercent: 156 },
        priority: 90,
        isActionable: true,
        actionLabel: 'Explore Brazil Market',
        actionUrl: '/analytics/location?country=BR',
        validFrom: '2024-01-24',
        validUntil: '2024-02-07',
        createdAt: '2024-01-24T00:00:00Z'
      }
    ]);

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
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <MetricCard
              icon="🌍"
              label="Top Country"
              value={metrics?.topCountry.name || '-'}
              subValue={`${formatNumber(metrics?.topCountry.engagement || 0)} engagement`}
              change={metrics?.topCountry.change}
              flag={getFlag(metrics?.topCountry.code || '')}
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
            />
            <MetricCard
              icon="🌐"
              label="Global Reach"
              value={`${metrics?.globalReach.countries || 0} Countries`}
              subValue={`${metrics?.globalReach.cities || 0} Cities`}
              badge={`+${metrics?.globalReach.newThisPeriod || 0} new`}
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
              <InsightsCarousel insights={insights} />
            </div>
          )}

          {/* Format Performance Section */}
          <Card className="p-6" hover={false}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Top Performing Formats by Region
            </h2>
            <p className="text-text-secondary text-sm">
              Coming soon: See which content formats perform best in each geographic region.
            </p>
          </Card>
        </main>
      </div>
    </ProOnlyGate>
  );
}
