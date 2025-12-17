# Save Rate & Retention Graph Analytics - System Design Specification

## Executive Summary

This document provides a complete production-ready specification for implementing two new analytics features in the ReGenr app:

1. **Save Rate Analytics** - Available to Creator + Pro users
2. **Retention Graph Analytics** - Available to Pro users only

---

## Table of Contents

1. [Access Control Summary](#1-access-control-summary)
2. [System Architecture](#2-system-architecture)
3. [Feature 1: Save Rate Analytics](#3-feature-1-save-rate-analytics)
4. [Feature 2: Retention Graph Analytics](#4-feature-2-retention-graph-analytics)
5. [Database Schema](#5-database-schema)
6. [API Specification](#6-api-specification)
7. [Backend Implementation](#7-backend-implementation)
8. [UI Components](#8-ui-components)
9. [Data Ingestion by Platform](#9-data-ingestion-by-platform)
10. [Insight Generation Rules](#10-insight-generation-rules)

---

## 1. Access Control Summary

| Feature | Free | Creator | Pro |
|---------|------|---------|-----|
| Save Rate Analytics | ❌ | ✅ | ✅ |
| Retention Graph Analytics | ❌ | ❌ | ✅ |
| AI-Powered Insights | ❌ | ❌ | ✅ |

### Plan Configuration Updates

```typescript
// app/config/plans.ts - Add these fields to PlanFeatures interface

export interface PlanFeatures {
  // ... existing fields ...

  // New Analytics Features
  saveRateAnalytics: boolean;      // Creator + Pro
  retentionAnalytics: boolean;     // Pro only
}

// Update PLANS object:
const PLANS = {
  free: {
    // ...
    saveRateAnalytics: false,
    retentionAnalytics: false,
  },
  creator: {
    // ...
    saveRateAnalytics: true,       // ✅ Creator gets Save Rate
    retentionAnalytics: false,     // ❌ No Retention
  },
  pro: {
    // ...
    saveRateAnalytics: true,       // ✅ Pro gets Save Rate
    retentionAnalytics: true,      // ✅ Pro gets Retention
  }
}
```

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Analytics Dashboard                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │  Save Rate  │  │  Retention  │  │  Location   │                 │    │
│  │  │   Module    │  │   Module    │  │   Module    │                 │    │
│  │  │ (Creator+)  │  │ (Pro Only)  │  │ (Pro Only)  │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Access Control Middleware                        │   │
│  │  checkPlanAccess('saveRateAnalytics')                               │   │
│  │  checkPlanAccess('retentionAnalytics')                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                        API Endpoints                                 │   │
│  │  /api/analytics/save-rate/*          (Creator + Pro)                │   │
│  │  /api/analytics/retention/*          (Pro Only)                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ SaveRateService  │  │ RetentionService │  │ InsightsEngine   │          │
│  │                  │  │                  │  │                  │          │
│  │ - Calculate rate │  │ - Curve analysis │  │ - AI suggestions │          │
│  │ - Aggregate data │  │ - Drop-off detect│  │ - Trend analysis │          │
│  │ - Trend analysis │  │ - Hook scoring   │  │ - Comparisons    │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Aggregation Worker (Cron)                         │   │
│  │  - Daily save rate rollups                                          │   │
│  │  - Retention curve processing                                       │   │
│  │  - Insight generation                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  content_saves   │  │ retention_curves │  │ analytics_insights│          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ save_rate_daily  │  │ retention_stats  │  │ content_items    │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Feature 1: Save Rate Analytics

### 3.1 Core Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **Save Rate** | `(saves ÷ impressions) × 100` | Percentage of viewers who saved |
| **Total Saves** | `SUM(saves)` | Absolute save count |
| **Save Rate by Format** | Per format type | Compare carousel vs video etc. |
| **Save Rate by Platform** | Per platform | Compare IG vs TikTok etc. |
| **Save Rate Trend** | Time series | Daily/weekly save rate over time |

### 3.2 Data Model

```typescript
interface SaveMetrics {
  contentId: string;
  platform: Platform;
  formatType: FormatType;

  // Raw counts
  saves: number;
  impressions: number;

  // Calculated
  saveRate: number;  // (saves / impressions) * 100

  // Time data
  recordedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

interface SaveRateTrend {
  date: string;
  saveRate: number;
  saves: number;
  impressions: number;
}

interface SaveRateByFormat {
  formatType: FormatType;
  totalSaves: number;
  totalImpressions: number;
  saveRate: number;
  contentCount: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface TopSavedPost {
  contentId: string;
  title: string;
  thumbnail: string;
  platform: Platform;
  formatType: FormatType;
  saves: number;
  impressions: number;
  saveRate: number;
  publishedAt: Date;
}
```

### 3.3 Normalization Logic

```typescript
// Platform-specific save terminology mapping
const SAVE_FIELD_MAPPING = {
  instagram: 'saved',           // Instagram Insights API
  tiktok: 'shares',             // TikTok uses shares (no save metric)
  youtube: 'addedToPlaylists',  // YouTube Analytics
  linkedin: 'saves',            // LinkedIn Analytics
  x: 'bookmarks',               // X API v2
  facebook: 'saves',            // Facebook Insights
  pinterest: 'saves',           // Pinterest Analytics
};

const IMPRESSION_FIELD_MAPPING = {
  instagram: 'impressions',
  tiktok: 'video_views',
  youtube: 'views',
  linkedin: 'impressions',
  x: 'impressions',
  facebook: 'impressions',
  pinterest: 'impressions',
};

function normalizeSaveData(rawData: any, platform: Platform): SaveMetrics {
  const saveField = SAVE_FIELD_MAPPING[platform];
  const impressionField = IMPRESSION_FIELD_MAPPING[platform];

  const saves = rawData[saveField] || 0;
  const impressions = rawData[impressionField] || 0;

  return {
    saves,
    impressions,
    saveRate: impressions > 0 ? (saves / impressions) * 100 : 0,
    platform,
    // ... other fields
  };
}
```

### 3.4 Aggregation Pipeline

```typescript
// Daily aggregation job (runs at 2 AM UTC)
async function aggregateDailySaveRates(userId: string, date: Date) {
  // 1. Fetch all content saves for the day
  const saves = await db.contentSaves.findMany({
    where: {
      userId,
      recordedAt: {
        gte: startOfDay(date),
        lt: endOfDay(date)
      }
    }
  });

  // 2. Aggregate by format type
  const byFormat = groupBy(saves, 'formatType');
  const formatAggregates = Object.entries(byFormat).map(([format, items]) => ({
    formatType: format,
    totalSaves: sum(items, 'saves'),
    totalImpressions: sum(items, 'impressions'),
    saveRate: calculateRate(items),
    contentCount: items.length
  }));

  // 3. Aggregate by platform
  const byPlatform = groupBy(saves, 'platform');
  const platformAggregates = Object.entries(byPlatform).map(([platform, items]) => ({
    platform,
    totalSaves: sum(items, 'saves'),
    totalImpressions: sum(items, 'impressions'),
    saveRate: calculateRate(items),
    contentCount: items.length
  }));

  // 4. Calculate overall daily rate
  const dailyTotal = {
    date,
    totalSaves: sum(saves, 'saves'),
    totalImpressions: sum(saves, 'impressions'),
    saveRate: calculateRate(saves),
    byFormat: formatAggregates,
    byPlatform: platformAggregates
  };

  // 5. Store aggregated data
  await db.saveRateDaily.upsert({
    where: { userId_date: { userId, date } },
    create: dailyTotal,
    update: dailyTotal
  });

  // 6. Generate insights if significant changes
  await generateSaveRateInsights(userId, dailyTotal);
}
```

---

## 4. Feature 2: Retention Graph Analytics

### 4.1 Core Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **Retention Curve** | `viewers_at_second[t] ÷ total_views × 100` | % viewers remaining at each second |
| **Hook Retention** | `avg(retention[0:3])` | Average retention in first 3 seconds |
| **Drop-off Points** | Detect steep declines | Seconds where >10% viewers leave |
| **Average View Duration** | `SUM(watch_time) ÷ total_views` | Mean watch time per viewer |
| **Completion Rate** | `completed_views ÷ total_views × 100` | % who watched to end |

### 4.2 Data Model

```typescript
interface RetentionCurve {
  contentId: string;
  videoDuration: number;  // Total video length in seconds

  // Retention data points (one per second)
  dataPoints: RetentionDataPoint[];

  // Calculated metrics
  hookRetention: number;        // First 3 seconds average
  averageViewDuration: number;  // In seconds
  completionRate: number;       // % who finished

  // Drop-off analysis
  dropOffPoints: DropOffPoint[];

  // Metadata
  totalViews: number;
  recordedAt: Date;
}

interface RetentionDataPoint {
  second: number;           // 0, 1, 2, 3...
  viewersRemaining: number; // Absolute count
  retentionPercent: number; // % of initial viewers
}

interface DropOffPoint {
  second: number;
  dropPercent: number;      // How much % dropped at this point
  severity: 'minor' | 'moderate' | 'major';
  suggestedAction: string;  // AI-generated suggestion
}

interface RetentionStats {
  userId: string;
  period: string;  // '7d', '30d', etc.

  // Aggregate metrics
  avgHookRetention: number;
  avgCompletionRate: number;
  avgViewDuration: number;

  // By format type
  byFormat: {
    [formatType: string]: {
      avgHookRetention: number;
      avgCompletionRate: number;
      contentCount: number;
    }
  };

  // Trends
  hookRetentionTrend: number;  // % change from previous period
  completionTrend: number;

  // Comparison to benchmarks
  vsAverageCreator: {
    hookRetention: number;    // +/- %
    completionRate: number;
  };
}

interface RetentionInsight {
  id: string;
  contentId: string | null;
  type: 'drop_off' | 'hook_performance' | 'completion' | 'improvement';
  title: string;
  description: string;
  metric: {
    name: string;
    value: number;
    comparison: number;
  };
  priority: number;
  createdAt: Date;
}
```

### 4.3 Retention Curve Calculation

```typescript
interface RawRetentionData {
  // YouTube provides this directly in Analytics API
  // TikTok provides watch time distribution
  audienceRetention: number[];  // Array of retention % per second
  totalViews: number;
  averageViewDuration: number;
}

function calculateRetentionCurve(raw: RawRetentionData): RetentionCurve {
  const dataPoints: RetentionDataPoint[] = raw.audienceRetention.map(
    (retention, second) => ({
      second,
      retentionPercent: retention,
      viewersRemaining: Math.round((retention / 100) * raw.totalViews)
    })
  );

  // Calculate hook retention (first 3 seconds average)
  const hookRetention = dataPoints
    .slice(0, 3)
    .reduce((sum, p) => sum + p.retentionPercent, 0) / 3;

  // Detect drop-off points (where retention drops >10% in 1 second)
  const dropOffPoints: DropOffPoint[] = [];
  for (let i = 1; i < dataPoints.length; i++) {
    const drop = dataPoints[i - 1].retentionPercent - dataPoints[i].retentionPercent;
    if (drop > 10) {
      dropOffPoints.push({
        second: i,
        dropPercent: drop,
        severity: drop > 20 ? 'major' : drop > 15 ? 'moderate' : 'minor',
        suggestedAction: generateDropOffSuggestion(i, drop)
      });
    }
  }

  // Completion rate (last data point)
  const completionRate = dataPoints[dataPoints.length - 1]?.retentionPercent || 0;

  return {
    dataPoints,
    hookRetention,
    averageViewDuration: raw.averageViewDuration,
    completionRate,
    dropOffPoints,
    totalViews: raw.totalViews,
    videoDuration: dataPoints.length,
    contentId: '',  // Set by caller
    recordedAt: new Date()
  };
}

function generateDropOffSuggestion(second: number, dropPercent: number): string {
  if (second <= 3) {
    return 'Your hook may not be captivating enough. Try starting with a question or surprising statement.';
  } else if (second <= 10) {
    return 'Viewers are losing interest early. Ensure your key value proposition is clear within the first 10 seconds.';
  } else if (dropPercent > 20) {
    return `Major drop at ${second}s. Review this section for pacing issues, unclear content, or natural exit points.`;
  } else {
    return `Moderate drop at ${second}s. Consider adding a pattern interrupt or new visual element here.`;
  }
}
```

### 4.4 Hook Retention Scoring

```typescript
interface HookScore {
  score: number;           // 0-100
  rating: 'excellent' | 'good' | 'average' | 'needs_improvement';
  percentile: number;      // vs other creators
  trend: number;           // % change from last period
  insights: string[];      // Specific feedback
}

function calculateHookScore(hookRetention: number, benchmarks: Benchmarks): HookScore {
  // Industry benchmarks (example values)
  const HOOK_BENCHMARKS = {
    excellent: 85,    // Top 10%
    good: 70,         // Top 25%
    average: 55,      // Top 50%
    poor: 40          // Bottom 50%
  };

  let rating: HookScore['rating'];
  let score: number;

  if (hookRetention >= HOOK_BENCHMARKS.excellent) {
    rating = 'excellent';
    score = 90 + ((hookRetention - 85) / 15) * 10;
  } else if (hookRetention >= HOOK_BENCHMARKS.good) {
    rating = 'good';
    score = 70 + ((hookRetention - 70) / 15) * 20;
  } else if (hookRetention >= HOOK_BENCHMARKS.average) {
    rating = 'average';
    score = 50 + ((hookRetention - 55) / 15) * 20;
  } else {
    rating = 'needs_improvement';
    score = (hookRetention / 55) * 50;
  }

  // Calculate percentile
  const percentile = calculatePercentile(hookRetention, benchmarks.hookRetentionDistribution);

  // Generate insights
  const insights = generateHookInsights(hookRetention, rating, benchmarks);

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    rating,
    percentile,
    trend: 0,  // Calculated from historical data
    insights
  };
}

function generateHookInsights(retention: number, rating: string, benchmarks: any): string[] {
  const insights: string[] = [];

  if (rating === 'excellent') {
    insights.push('Your hooks are performing exceptionally well!');
    insights.push(`You're in the top ${100 - benchmarks.percentile}% of creators.`);
  } else if (rating === 'needs_improvement') {
    insights.push('Your first 3 seconds need work to capture attention.');
    insights.push('Try: Questions, surprising facts, or immediate value statements.');
  }

  return insights;
}
```

---

## 5. Database Schema

### 5.1 SQL Schema (PostgreSQL)

```sql
-- ============================================
-- TABLE: content_saves
-- Raw save/bookmark data per content item
-- ============================================
CREATE TABLE content_saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,

    -- Platform info
    platform VARCHAR(20) NOT NULL,

    -- Metrics
    saves BIGINT NOT NULL DEFAULT 0,
    impressions BIGINT NOT NULL DEFAULT 0,
    save_rate DECIMAL(8, 4) GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN (saves::DECIMAL / impressions) * 100 ELSE 0 END
    ) STORED,

    -- Time period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicates
    CONSTRAINT unique_content_save_period UNIQUE (content_item_id, period_start)
);

CREATE INDEX idx_saves_user ON content_saves(user_id);
CREATE INDEX idx_saves_content ON content_saves(content_item_id);
CREATE INDEX idx_saves_platform ON content_saves(platform);
CREATE INDEX idx_saves_period ON content_saves(period_start DESC);
CREATE INDEX idx_saves_rate ON content_saves(save_rate DESC);

-- ============================================
-- TABLE: save_rate_daily
-- Pre-aggregated daily save rate stats
-- ============================================
CREATE TABLE save_rate_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,

    -- Overall metrics
    total_saves BIGINT DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    save_rate DECIMAL(8, 4) DEFAULT 0,
    content_count INTEGER DEFAULT 0,

    -- By format (JSONB for flexibility)
    by_format JSONB DEFAULT '{}',
    -- Example: {"carousel": {"saves": 100, "impressions": 5000, "rate": 2.0}, ...}

    -- By platform
    by_platform JSONB DEFAULT '{}',

    -- Metadata
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_save_rate_daily UNIQUE (user_id, date)
);

CREATE INDEX idx_save_daily_user ON save_rate_daily(user_id, date DESC);

-- ============================================
-- TABLE: retention_curves
-- Per-video retention curve data
-- ============================================
CREATE TABLE retention_curves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,

    -- Video info
    video_duration INTEGER NOT NULL,  -- In seconds
    total_views BIGINT NOT NULL,

    -- Retention data (array of % at each second)
    data_points JSONB NOT NULL,
    -- Example: [{"second": 0, "retention": 100}, {"second": 1, "retention": 95}, ...]

    -- Calculated metrics
    hook_retention DECIMAL(5, 2),           -- First 3 seconds avg
    average_view_duration DECIMAL(8, 2),    -- In seconds
    completion_rate DECIMAL(5, 2),          -- % who finished

    -- Drop-off analysis
    drop_off_points JSONB DEFAULT '[]',
    -- Example: [{"second": 6, "dropPercent": 15, "severity": "moderate"}, ...]

    -- Metadata
    platform VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_retention_curve UNIQUE (content_item_id, recorded_at)
);

CREATE INDEX idx_retention_user ON retention_curves(user_id);
CREATE INDEX idx_retention_content ON retention_curves(content_item_id);
CREATE INDEX idx_retention_hook ON retention_curves(hook_retention DESC);

-- ============================================
-- TABLE: retention_stats_daily
-- Aggregated retention statistics
-- ============================================
CREATE TABLE retention_stats_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,

    -- Aggregate metrics
    avg_hook_retention DECIMAL(5, 2),
    avg_completion_rate DECIMAL(5, 2),
    avg_view_duration DECIMAL(8, 2),
    video_count INTEGER DEFAULT 0,

    -- By format type
    by_format JSONB DEFAULT '{}',

    -- Comparison to benchmarks
    vs_benchmark JSONB DEFAULT '{}',
    -- Example: {"hookRetention": +5.2, "completionRate": -2.1}

    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_retention_daily UNIQUE (user_id, date)
);

CREATE INDEX idx_retention_daily_user ON retention_stats_daily(user_id, date DESC);

-- ============================================
-- TABLE: analytics_insights
-- AI-generated insights for both features
-- ============================================
CREATE TABLE analytics_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,

    -- Insight categorization
    feature VARCHAR(30) NOT NULL,           -- 'save_rate', 'retention', 'location'
    insight_type VARCHAR(50) NOT NULL,      -- 'drop_off', 'trend', 'comparison', etc.

    -- Content
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Related entities
    content_item_id UUID REFERENCES content_items(id),
    format_type VARCHAR(30),
    platform VARCHAR(20),

    -- Metrics that triggered insight
    metric_data JSONB,
    -- Example: {"name": "hookRetention", "value": 78, "change": +12, "benchmark": 65}

    -- Priority and status
    priority INTEGER DEFAULT 50,            -- 0-100
    is_actionable BOOLEAN DEFAULT true,
    action_label VARCHAR(100),
    action_url VARCHAR(255),

    -- Validity
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_dismissed BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insights_user_feature ON analytics_insights(user_id, feature);
CREATE INDEX idx_insights_active ON analytics_insights(user_id, is_dismissed, valid_until);
```

### 5.2 NoSQL Alternative (MongoDB/JSON)

```javascript
// For current ReGenr JSON-based storage pattern
// File: server/data/save_rate_analytics.json

{
  "contentSaves": {
    "save_123": {
      "id": "save_123",
      "userId": "user_abc",
      "contentItemId": "content_xyz",
      "platform": "instagram",
      "saves": 150,
      "impressions": 5000,
      "saveRate": 3.0,
      "periodStart": "2024-01-15T00:00:00Z",
      "periodEnd": "2024-01-15T23:59:59Z",
      "recordedAt": "2024-01-16T02:00:00Z"
    }
  },

  "saveRateDaily": {
    "user_abc_2024-01-15": {
      "userId": "user_abc",
      "date": "2024-01-15",
      "totalSaves": 450,
      "totalImpressions": 15000,
      "saveRate": 3.0,
      "contentCount": 12,
      "byFormat": {
        "carousel": { "saves": 200, "impressions": 4000, "rate": 5.0 },
        "video_clip": { "saves": 150, "impressions": 8000, "rate": 1.875 },
        "quote_card": { "saves": 100, "impressions": 3000, "rate": 3.33 }
      },
      "byPlatform": {
        "instagram": { "saves": 300, "impressions": 10000, "rate": 3.0 },
        "tiktok": { "saves": 150, "impressions": 5000, "rate": 3.0 }
      }
    }
  }
}

// File: server/data/retention_analytics.json

{
  "retentionCurves": {
    "curve_456": {
      "id": "curve_456",
      "userId": "user_abc",
      "contentItemId": "video_xyz",
      "platform": "youtube",
      "videoDuration": 60,
      "totalViews": 10000,
      "dataPoints": [
        { "second": 0, "retention": 100 },
        { "second": 1, "retention": 92 },
        { "second": 2, "retention": 88 },
        { "second": 3, "retention": 85 },
        { "second": 4, "retention": 78 },
        { "second": 5, "retention": 72 },
        { "second": 6, "retention": 58 },  // Major drop here
        // ... continues to end
        { "second": 60, "retention": 25 }
      ],
      "hookRetention": 88.33,
      "averageViewDuration": 32.5,
      "completionRate": 25,
      "dropOffPoints": [
        {
          "second": 6,
          "dropPercent": 14,
          "severity": "major",
          "suggestedAction": "Major drop at 6s. Review this section for pacing issues."
        }
      ],
      "recordedAt": "2024-01-16T02:00:00Z"
    }
  },

  "retentionStatsDaily": {
    "user_abc_2024-01-15": {
      "userId": "user_abc",
      "date": "2024-01-15",
      "avgHookRetention": 82.5,
      "avgCompletionRate": 28.3,
      "avgViewDuration": 35.2,
      "videoCount": 8,
      "byFormat": {
        "video_clip": { "hookRetention": 85, "completionRate": 32 },
        "reel": { "hookRetention": 80, "completionRate": 24 }
      },
      "vsBenchmark": {
        "hookRetention": 5.2,
        "completionRate": -2.1
      }
    }
  }
}
```

---

## 6. API Specification

### 6.1 Save Rate Endpoints

#### GET /api/analytics/save-rate

**Description:** Get save rate metrics with filtering options.

**Access:** Creator + Pro

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | `7d`, `30d`, `90d`, `365d` |
| `platform` | string | No | `all` | Filter by platform |
| `format` | string | No | `all` | Filter by format type |
| `groupBy` | string | No | `none` | `format`, `platform`, `content` |

**Request:**
```http
GET /api/analytics/save-rate?period=30d&groupBy=format
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSaves": 4520,
      "totalImpressions": 156000,
      "saveRate": 2.9,
      "contentCount": 45,
      "trend": {
        "direction": "up",
        "changePercent": 12.5,
        "previousRate": 2.58
      }
    },
    "byFormat": [
      {
        "formatType": "carousel",
        "saves": 1850,
        "impressions": 42000,
        "saveRate": 4.4,
        "contentCount": 12,
        "trend": { "direction": "up", "changePercent": 18.2 }
      },
      {
        "formatType": "video_clip",
        "saves": 1420,
        "impressions": 68000,
        "saveRate": 2.09,
        "contentCount": 18,
        "trend": { "direction": "stable", "changePercent": 1.2 }
      },
      {
        "formatType": "quote_card",
        "saves": 850,
        "impressions": 28000,
        "saveRate": 3.04,
        "contentCount": 10,
        "trend": { "direction": "down", "changePercent": -5.8 }
      },
      {
        "formatType": "static_image",
        "saves": 400,
        "impressions": 18000,
        "saveRate": 2.22,
        "contentCount": 5,
        "trend": { "direction": "up", "changePercent": 8.5 }
      }
    ],
    "byPlatform": [
      {
        "platform": "instagram",
        "saves": 2800,
        "impressions": 95000,
        "saveRate": 2.95,
        "contentCount": 25
      },
      {
        "platform": "tiktok",
        "saves": 1200,
        "impressions": 45000,
        "saveRate": 2.67,
        "contentCount": 15
      },
      {
        "platform": "linkedin",
        "saves": 520,
        "impressions": 16000,
        "saveRate": 3.25,
        "contentCount": 5
      }
    ],
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }
}
```

---

#### GET /api/analytics/save-rate/trends

**Description:** Get save rate trend over time.

**Access:** Creator + Pro

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period |
| `granularity` | string | No | `daily` | `daily`, `weekly`, `monthly` |
| `platform` | string | No | `all` | Filter by platform |
| `format` | string | No | `all` | Filter by format |

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      { "date": "2024-01-01", "saveRate": 2.4, "saves": 120, "impressions": 5000 },
      { "date": "2024-01-02", "saveRate": 2.8, "saves": 140, "impressions": 5000 },
      { "date": "2024-01-03", "saveRate": 3.1, "saves": 155, "impressions": 5000 },
      { "date": "2024-01-04", "saveRate": 2.9, "saves": 145, "impressions": 5000 },
      { "date": "2024-01-05", "saveRate": 3.5, "saves": 175, "impressions": 5000 },
      // ... more data points
    ],
    "summary": {
      "average": 2.9,
      "min": 2.1,
      "max": 4.2,
      "trend": "up",
      "changePercent": 15.2
    },
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31",
      "granularity": "daily"
    }
  }
}
```

---

#### GET /api/analytics/save-rate/top

**Description:** Get top posts by save rate.

**Access:** Creator + Pro

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period |
| `limit` | number | No | `5` | Number of results (max 20) |
| `platform` | string | No | `all` | Filter by platform |

**Response:**
```json
{
  "success": true,
  "data": {
    "topPosts": [
      {
        "rank": 1,
        "contentId": "post_abc123",
        "title": "10 Productivity Hacks That Actually Work",
        "thumbnail": "https://...",
        "platform": "instagram",
        "formatType": "carousel",
        "saves": 892,
        "impressions": 12500,
        "saveRate": 7.14,
        "publishedAt": "2024-01-15T14:30:00Z"
      },
      {
        "rank": 2,
        "contentId": "post_def456",
        "title": "The Morning Routine That Changed My Life",
        "thumbnail": "https://...",
        "platform": "instagram",
        "formatType": "carousel",
        "saves": 654,
        "impressions": 9800,
        "saveRate": 6.67,
        "publishedAt": "2024-01-12T09:00:00Z"
      },
      {
        "rank": 3,
        "contentId": "post_ghi789",
        "title": "Quick tip: Use this keyboard shortcut",
        "thumbnail": "https://...",
        "platform": "tiktok",
        "formatType": "video_clip",
        "saves": 1205,
        "impressions": 25000,
        "saveRate": 4.82,
        "publishedAt": "2024-01-18T16:45:00Z"
      },
      {
        "rank": 4,
        "contentId": "post_jkl012",
        "title": "Mindset shift for entrepreneurs",
        "thumbnail": "https://...",
        "platform": "linkedin",
        "formatType": "quote_card",
        "saves": 234,
        "impressions": 5200,
        "saveRate": 4.5,
        "publishedAt": "2024-01-20T08:00:00Z"
      },
      {
        "rank": 5,
        "contentId": "post_mno345",
        "title": "How I grew my audience to 100K",
        "thumbnail": "https://...",
        "platform": "instagram",
        "formatType": "reel",
        "saves": 567,
        "impressions": 14200,
        "saveRate": 3.99,
        "publishedAt": "2024-01-22T12:00:00Z"
      }
    ],
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }
}
```

---

### 6.2 Retention Endpoints

#### GET /api/analytics/retention/:contentId

**Description:** Get retention curve for a specific video.

**Access:** Pro Only

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": "video_xyz",
    "title": "How to Build a Million Dollar Business",
    "platform": "youtube",
    "videoDuration": 180,
    "totalViews": 45000,

    "curve": {
      "dataPoints": [
        { "second": 0, "retention": 100, "viewers": 45000 },
        { "second": 1, "retention": 94, "viewers": 42300 },
        { "second": 2, "retention": 89, "viewers": 40050 },
        { "second": 3, "retention": 85, "viewers": 38250 },
        { "second": 5, "retention": 78, "viewers": 35100 },
        { "second": 10, "retention": 65, "viewers": 29250 },
        { "second": 30, "retention": 48, "viewers": 21600 },
        { "second": 60, "retention": 35, "viewers": 15750 },
        { "second": 120, "retention": 22, "viewers": 9900 },
        { "second": 180, "retention": 15, "viewers": 6750 }
      ]
    },

    "metrics": {
      "hookRetention": 89.33,
      "hookScore": {
        "score": 82,
        "rating": "good",
        "percentile": 75
      },
      "averageViewDuration": 54.2,
      "completionRate": 15,
      "dropOffPoints": [
        {
          "second": 6,
          "dropPercent": 12,
          "severity": "major",
          "label": "Major drop at 0:06",
          "suggestion": "Review the transition at this point. Consider adding a hook or pattern interrupt."
        },
        {
          "second": 45,
          "dropPercent": 8,
          "severity": "moderate",
          "label": "Moderate drop at 0:45",
          "suggestion": "This might be a natural break point. Consider restructuring content flow."
        }
      ]
    },

    "insights": [
      {
        "type": "positive",
        "title": "Strong Hook Performance",
        "description": "Your first 3 seconds retain 89% of viewers, which is 15% above average."
      },
      {
        "type": "warning",
        "title": "Major Drop at 6 Seconds",
        "description": "12% of viewers leave at the 6-second mark. Consider strengthening your intro."
      }
    ],

    "comparison": {
      "vsYourAverage": {
        "hookRetention": 4.2,
        "completionRate": -2.1
      },
      "vsCreatorAverage": {
        "hookRetention": 8.5,
        "completionRate": 1.2
      }
    }
  }
}
```

---

#### GET /api/analytics/retention/averages

**Description:** Get aggregated retention statistics.

**Access:** Pro Only

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period |
| `format` | string | No | `all` | Filter by format type |
| `platform` | string | No | `all` | Filter by platform |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "avgHookRetention": 82.5,
      "avgCompletionRate": 28.3,
      "avgViewDuration": 35.2,
      "totalVideos": 45,
      "totalViews": 425000
    },

    "hookScore": {
      "score": 78,
      "rating": "good",
      "percentile": 68,
      "trend": {
        "direction": "up",
        "changePercent": 5.2,
        "previousScore": 74
      }
    },

    "byFormat": [
      {
        "formatType": "reel",
        "avgHookRetention": 85.2,
        "avgCompletionRate": 32.5,
        "avgViewDuration": 12.8,
        "videoCount": 20
      },
      {
        "formatType": "video_clip",
        "avgHookRetention": 80.1,
        "avgCompletionRate": 25.4,
        "avgViewDuration": 28.5,
        "videoCount": 15
      },
      {
        "formatType": "video_long",
        "avgHookRetention": 78.5,
        "avgCompletionRate": 18.2,
        "avgViewDuration": 95.2,
        "videoCount": 10
      }
    ],

    "trends": {
      "hookRetention": [
        { "date": "2024-01-01", "value": 78.2 },
        { "date": "2024-01-08", "value": 80.5 },
        { "date": "2024-01-15", "value": 82.1 },
        { "date": "2024-01-22", "value": 84.8 },
        { "date": "2024-01-29", "value": 82.5 }
      ],
      "completionRate": [
        { "date": "2024-01-01", "value": 25.5 },
        { "date": "2024-01-08", "value": 27.2 },
        { "date": "2024-01-15", "value": 28.8 },
        { "date": "2024-01-22", "value": 29.5 },
        { "date": "2024-01-29", "value": 28.3 }
      ]
    },

    "insights": [
      {
        "id": "insight_1",
        "type": "improvement",
        "title": "Your hooks hold 23% longer than last week",
        "description": "Great improvement! Your first 3 seconds are now retaining 82.5% of viewers compared to 67% last week.",
        "priority": 90
      },
      {
        "id": "insight_2",
        "type": "tip",
        "title": "Reels outperform long-form by 14%",
        "description": "Your short-form content (Reels) has significantly higher hook retention. Consider repurposing more content into Reels format.",
        "priority": 75
      }
    ],

    "comparison": {
      "vsAverageCreator": {
        "hookRetention": { "value": 5.2, "label": "5.2% above average" },
        "completionRate": { "value": -2.1, "label": "2.1% below average" },
        "viewDuration": { "value": 8.5, "label": "8.5s longer than average" }
      }
    },

    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }
}
```

---

## 7. Backend Implementation

### 7.1 Access Control Middleware

```typescript
// server/middleware/planAccess.ts

import { Request, Response, NextFunction } from 'express';
import { getPlan, PlanType } from '../config/plans';

type FeatureKey = 'saveRateAnalytics' | 'retentionAnalytics' | 'locationAnalytics';

export function checkPlanAccess(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user's plan from request (set by auth middleware)
      const userPlan: PlanType = req.user?.plan || 'free';
      const plan = getPlan(userPlan);

      // Check if feature is available
      if (!plan[feature]) {
        return res.status(403).json({
          success: false,
          error: 'PLAN_UPGRADE_REQUIRED',
          message: `This feature requires a ${getRequiredPlan(feature)} plan or higher.`,
          requiredPlan: getRequiredPlan(feature),
          currentPlan: userPlan,
          upgradeUrl: '/settings?tab=billing'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function getRequiredPlan(feature: FeatureKey): string {
  const requirements: Record<FeatureKey, string> = {
    saveRateAnalytics: 'Creator',
    retentionAnalytics: 'Pro',
    locationAnalytics: 'Pro'
  };
  return requirements[feature];
}

// Usage in routes:
// router.get('/save-rate', checkPlanAccess('saveRateAnalytics'), saveRateController.get);
// router.get('/retention/:id', checkPlanAccess('retentionAnalytics'), retentionController.get);
```

### 7.2 Save Rate Service

```typescript
// server/services/saveRateService.ts

interface SaveRateOptions {
  userId: string;
  period: string;
  platform?: string;
  format?: string;
  groupBy?: 'format' | 'platform' | 'content';
}

class SaveRateService {

  /**
   * Get save rate metrics with aggregations
   */
  async getSaveRateMetrics(options: SaveRateOptions) {
    const { userId, period, platform, format, groupBy } = options;
    const periodDays = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch raw save data
    const saves = await this.fetchSaveData(userId, startDate, platform, format);

    // Calculate summary
    const summary = this.calculateSummary(saves);

    // Calculate previous period for trend
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - periodDays);
    const previousSaves = await this.fetchSaveData(userId, previousStart, platform, format, startDate);
    const previousSummary = this.calculateSummary(previousSaves);

    // Add trend data
    summary.trend = this.calculateTrend(summary.saveRate, previousSummary.saveRate);

    // Group by format
    const byFormat = this.groupByFormat(saves);

    // Group by platform
    const byPlatform = this.groupByPlatform(saves);

    return {
      summary,
      byFormat,
      byPlatform,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };
  }

  /**
   * Get save rate trends over time
   */
  async getSaveRateTrends(options: SaveRateOptions & { granularity: string }) {
    const { userId, period, granularity, platform, format } = options;
    const periodDays = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch daily aggregates
    const dailyStats = await this.fetchDailyStats(userId, startDate, platform, format);

    // Group by granularity
    const trends = this.groupByGranularity(dailyStats, granularity);

    // Calculate summary stats
    const rates = trends.map(t => t.saveRate);
    const summary = {
      average: this.average(rates),
      min: Math.min(...rates),
      max: Math.max(...rates),
      trend: rates[rates.length - 1] > rates[0] ? 'up' : 'down',
      changePercent: this.percentChange(rates[0], rates[rates.length - 1])
    };

    return {
      trends,
      summary,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        granularity
      }
    };
  }

  /**
   * Get top posts by save rate
   */
  async getTopSavedPosts(userId: string, period: string, limit: number = 5, platform?: string) {
    const periodDays = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch and sort by save rate
    const posts = await this.fetchPostsWithSaves(userId, startDate, platform);

    // Sort by save rate descending
    posts.sort((a, b) => b.saveRate - a.saveRate);

    // Take top N
    const topPosts = posts.slice(0, limit).map((post, index) => ({
      rank: index + 1,
      ...post
    }));

    return {
      topPosts,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };
  }

  // Helper methods
  private calculateSummary(saves: any[]) {
    const totalSaves = saves.reduce((sum, s) => sum + s.saves, 0);
    const totalImpressions = saves.reduce((sum, s) => sum + s.impressions, 0);
    return {
      totalSaves,
      totalImpressions,
      saveRate: totalImpressions > 0 ? (totalSaves / totalImpressions) * 100 : 0,
      contentCount: saves.length
    };
  }

  private calculateTrend(current: number, previous: number) {
    const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return {
      direction: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'stable',
      changePercent: Math.round(changePercent * 10) / 10,
      previousRate: Math.round(previous * 100) / 100
    };
  }

  private groupByFormat(saves: any[]) {
    const groups = new Map();
    for (const save of saves) {
      const key = save.formatType;
      if (!groups.has(key)) {
        groups.set(key, { saves: 0, impressions: 0, count: 0 });
      }
      const group = groups.get(key);
      group.saves += save.saves;
      group.impressions += save.impressions;
      group.count++;
    }

    return Array.from(groups.entries()).map(([formatType, data]) => ({
      formatType,
      saves: data.saves,
      impressions: data.impressions,
      saveRate: data.impressions > 0 ? (data.saves / data.impressions) * 100 : 0,
      contentCount: data.count
    }));
  }

  private groupByPlatform(saves: any[]) {
    const groups = new Map();
    for (const save of saves) {
      const key = save.platform;
      if (!groups.has(key)) {
        groups.set(key, { saves: 0, impressions: 0, count: 0 });
      }
      const group = groups.get(key);
      group.saves += save.saves;
      group.impressions += save.impressions;
      group.count++;
    }

    return Array.from(groups.entries()).map(([platform, data]) => ({
      platform,
      saves: data.saves,
      impressions: data.impressions,
      saveRate: data.impressions > 0 ? (data.saves / data.impressions) * 100 : 0,
      contentCount: data.count
    }));
  }

  private parsePeriod(period: string): number {
    const match = period.match(/(\d+)([dwmy])/);
    if (!match) return 30;
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { d: 1, w: 7, m: 30, y: 365 };
    return parseInt(num) * (multipliers[unit] || 1);
  }

  private average(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private percentChange(from: number, to: number): number {
    if (from === 0) return 0;
    return Math.round(((to - from) / from) * 1000) / 10;
  }
}

export default new SaveRateService();
```

### 7.3 Retention Service

```typescript
// server/services/retentionService.ts

interface RetentionCurveData {
  contentId: string;
  dataPoints: Array<{ second: number; retention: number; viewers: number }>;
  hookRetention: number;
  averageViewDuration: number;
  completionRate: number;
  dropOffPoints: DropOffPoint[];
}

interface DropOffPoint {
  second: number;
  dropPercent: number;
  severity: 'minor' | 'moderate' | 'major';
  label: string;
  suggestion: string;
}

class RetentionService {

  /**
   * Get retention curve for specific content
   */
  async getRetentionCurve(contentId: string, userId: string): Promise<RetentionCurveData> {
    // Fetch retention data
    const retentionData = await this.fetchRetentionData(contentId);
    const content = await this.fetchContentInfo(contentId);

    // Verify ownership
    if (content.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Calculate curve metrics
    const curve = this.processRetentionCurve(retentionData);

    // Calculate hook score
    const hookScore = this.calculateHookScore(curve.hookRetention);

    // Detect drop-off points
    const dropOffPoints = this.detectDropOffPoints(curve.dataPoints);

    // Generate insights
    const insights = this.generateCurveInsights(curve, hookScore, dropOffPoints);

    // Get comparisons
    const comparison = await this.getComparisons(userId, curve);

    return {
      contentId,
      title: content.title,
      platform: content.platform,
      videoDuration: curve.videoDuration,
      totalViews: curve.totalViews,
      curve: {
        dataPoints: curve.dataPoints
      },
      metrics: {
        hookRetention: curve.hookRetention,
        hookScore,
        averageViewDuration: curve.averageViewDuration,
        completionRate: curve.completionRate,
        dropOffPoints
      },
      insights,
      comparison
    };
  }

  /**
   * Get aggregated retention averages
   */
  async getRetentionAverages(userId: string, options: {
    period: string;
    format?: string;
    platform?: string;
  }) {
    const { period, format, platform } = options;
    const periodDays = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch all retention curves for period
    const curves = await this.fetchUserRetentionCurves(userId, startDate, format, platform);

    if (curves.length === 0) {
      return this.emptyAveragesResponse(period);
    }

    // Calculate averages
    const avgHookRetention = this.average(curves.map(c => c.hookRetention));
    const avgCompletionRate = this.average(curves.map(c => c.completionRate));
    const avgViewDuration = this.average(curves.map(c => c.averageViewDuration));

    // Calculate hook score
    const hookScore = this.calculateHookScore(avgHookRetention);

    // Group by format
    const byFormat = this.groupRetentionByFormat(curves);

    // Get trends
    const trends = await this.getRetentionTrends(userId, startDate);

    // Generate insights
    const insights = await this.generateAggregateInsights(userId, {
      avgHookRetention,
      avgCompletionRate,
      trends
    });

    // Get comparison to average creator
    const comparison = await this.getBenchmarkComparison(avgHookRetention, avgCompletionRate, avgViewDuration);

    return {
      summary: {
        avgHookRetention: Math.round(avgHookRetention * 100) / 100,
        avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
        avgViewDuration: Math.round(avgViewDuration * 10) / 10,
        totalVideos: curves.length,
        totalViews: curves.reduce((sum, c) => sum + c.totalViews, 0)
      },
      hookScore,
      byFormat,
      trends,
      insights,
      comparison,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };
  }

  /**
   * Process raw retention data into curve
   */
  private processRetentionCurve(raw: any): any {
    const dataPoints = raw.audienceRetention.map((retention: number, second: number) => ({
      second,
      retention,
      viewers: Math.round((retention / 100) * raw.totalViews)
    }));

    // Hook retention = average of first 3 seconds
    const hookRetention = dataPoints.slice(0, 3).reduce((sum: number, p: any) => sum + p.retention, 0) / 3;

    // Completion rate = last data point
    const completionRate = dataPoints[dataPoints.length - 1]?.retention || 0;

    return {
      dataPoints,
      hookRetention,
      averageViewDuration: raw.averageViewDuration,
      completionRate,
      videoDuration: dataPoints.length,
      totalViews: raw.totalViews
    };
  }

  /**
   * Detect significant drop-off points
   */
  private detectDropOffPoints(dataPoints: any[]): DropOffPoint[] {
    const dropOffs: DropOffPoint[] = [];

    for (let i = 1; i < dataPoints.length; i++) {
      const drop = dataPoints[i - 1].retention - dataPoints[i].retention;

      if (drop >= 8) {  // At least 8% drop
        const severity = drop >= 15 ? 'major' : drop >= 10 ? 'moderate' : 'minor';

        dropOffs.push({
          second: i,
          dropPercent: Math.round(drop * 10) / 10,
          severity,
          label: `${severity.charAt(0).toUpperCase() + severity.slice(1)} drop at ${this.formatTime(i)}`,
          suggestion: this.generateDropOffSuggestion(i, drop, severity)
        });
      }
    }

    return dropOffs;
  }

  /**
   * Calculate hook score (0-100)
   */
  private calculateHookScore(hookRetention: number): {
    score: number;
    rating: string;
    percentile: number;
  } {
    // Benchmark-based scoring
    let score: number;
    let rating: string;

    if (hookRetention >= 85) {
      score = 85 + ((hookRetention - 85) / 15) * 15;
      rating = 'excellent';
    } else if (hookRetention >= 70) {
      score = 65 + ((hookRetention - 70) / 15) * 20;
      rating = 'good';
    } else if (hookRetention >= 55) {
      score = 45 + ((hookRetention - 55) / 15) * 20;
      rating = 'average';
    } else {
      score = (hookRetention / 55) * 45;
      rating = 'needs_improvement';
    }

    // Estimate percentile (simplified)
    const percentile = Math.min(99, Math.round(score * 0.95));

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      rating,
      percentile
    };
  }

  /**
   * Generate suggestions for drop-off points
   */
  private generateDropOffSuggestion(second: number, drop: number, severity: string): string {
    if (second <= 3) {
      return 'Your opening hook needs work. Start with something that immediately grabs attention - a question, surprising fact, or bold statement.';
    } else if (second <= 8) {
      return 'Viewers are leaving early. Make sure you deliver your key promise or value within the first 8 seconds.';
    } else if (second <= 15) {
      return 'Consider adding a "pattern interrupt" here - a visual change, topic shift, or new element to re-engage viewers.';
    } else if (severity === 'major') {
      return `Major drop at ${this.formatTime(second)}. Review this section for pacing issues, unclear content, or long pauses.`;
    } else {
      return `Consider adding more engaging elements around the ${this.formatTime(second)} mark to maintain viewer interest.`;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private parsePeriod(period: string): number {
    const match = period.match(/(\d+)([dwmy])/);
    if (!match) return 30;
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { d: 1, w: 7, m: 30, y: 365 };
    return parseInt(num) * (multipliers[unit] || 1);
  }
}

export default new RetentionService();
```

### 7.4 API Routes

```typescript
// server/routes/analyticsRoutes.ts

import express from 'express';
import { checkPlanAccess } from '../middleware/planAccess';
import { authenticateToken } from '../middleware/auth';
import saveRateService from '../services/saveRateService';
import retentionService from '../services/retentionService';

const router = express.Router();

// ============================================
// SAVE RATE ENDPOINTS (Creator + Pro)
// ============================================

router.get('/save-rate',
  authenticateToken,
  checkPlanAccess('saveRateAnalytics'),
  async (req, res) => {
    try {
      const { period = '30d', platform, format, groupBy } = req.query;

      const data = await saveRateService.getSaveRateMetrics({
        userId: req.user.id,
        period: period as string,
        platform: platform as string,
        format: format as string,
        groupBy: groupBy as any
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch save rate metrics' });
    }
  }
);

router.get('/save-rate/trends',
  authenticateToken,
  checkPlanAccess('saveRateAnalytics'),
  async (req, res) => {
    try {
      const { period = '30d', granularity = 'daily', platform, format } = req.query;

      const data = await saveRateService.getSaveRateTrends({
        userId: req.user.id,
        period: period as string,
        granularity: granularity as string,
        platform: platform as string,
        format: format as string
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch save rate trends' });
    }
  }
);

router.get('/save-rate/top',
  authenticateToken,
  checkPlanAccess('saveRateAnalytics'),
  async (req, res) => {
    try {
      const { period = '30d', limit = '5', platform } = req.query;

      const data = await saveRateService.getTopSavedPosts(
        req.user.id,
        period as string,
        parseInt(limit as string),
        platform as string
      );

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch top saved posts' });
    }
  }
);

// ============================================
// RETENTION ENDPOINTS (Pro Only)
// ============================================

router.get('/retention/:contentId',
  authenticateToken,
  checkPlanAccess('retentionAnalytics'),
  async (req, res) => {
    try {
      const { contentId } = req.params;

      const data = await retentionService.getRetentionCurve(
        contentId,
        req.user.id
      );

      res.json({ success: true, data });
    } catch (error) {
      if (error.message === 'Unauthorized') {
        res.status(403).json({ success: false, error: 'Unauthorized' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to fetch retention curve' });
      }
    }
  }
);

router.get('/retention/averages',
  authenticateToken,
  checkPlanAccess('retentionAnalytics'),
  async (req, res) => {
    try {
      const { period = '30d', format, platform } = req.query;

      const data = await retentionService.getRetentionAverages(
        req.user.id,
        {
          period: period as string,
          format: format as string,
          platform: platform as string
        }
      );

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch retention averages' });
    }
  }
);

export default router;
```

---

## 8. UI Components

### 8.1 Save Rate Dashboard

#### Card Widget: "Save Rate This Week"

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  📌 SAVE RATE THIS WEEK                                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │         2.9%              4,520                     │   │
│  │      Save Rate          Total Saves                 │   │
│  │      ↑ 12.5%             ↑ 320                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  By Format:                                                  │
│  ────────────────────────────────────────────────────────   │
│  Carousel     ████████████████████████  4.4%   (Best)       │
│  Quote Card   ████████████████          3.0%                │
│  Video Clip   ██████████████            2.1%                │
│  Static       ██████████████            2.2%                │
│                                                              │
│  ℹ️ Save Rate = Saves ÷ Impressions × 100                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Line Graph: Save Rate Over Time

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  📈 SAVE RATE TREND                      [7D] [30D] [90D]   │
│                                                              │
│  4.0% ─┼─────────────────────────────────────────────────   │
│        │                              ●                      │
│  3.5% ─┼──────────────────────●──────────────────────────   │
│        │              ●                   ●                  │
│  3.0% ─┼────────●─────────────────────────────●─────────    │
│        │    ●                                      ●         │
│  2.5% ─┼●───────────────────────────────────────────────    │
│        │                                                     │
│  2.0% ─┼─────────────────────────────────────────────────   │
│        └────┬────┬────┬────┬────┬────┬────┬────────────     │
│           Jan 1  5    10   15   20   25   30                │
│                                                              │
│  Average: 2.9%  │  Peak: 4.2% (Jan 18)  │  Low: 2.1%        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Table: Save Rate by Format

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 SAVE RATE BY FORMAT                                                 │
├─────────────┬───────────┬───────────────┬───────────┬─────────┬────────┤
│ Format      │ Save Rate │ Total Saves   │ Impressions│ Posts  │ Trend  │
├─────────────┼───────────┼───────────────┼───────────┼─────────┼────────┤
│ 🎠 Carousel │   4.4%    │    1,850      │   42,000  │   12    │ ↑ 18%  │
│ 💬 Quote    │   3.0%    │      850      │   28,000  │   10    │ ↓ 6%   │
│ 🎬 Video    │   2.1%    │    1,420      │   68,000  │   18    │ → 1%   │
│ 📷 Image    │   2.2%    │      400      │   18,000  │    5    │ ↑ 9%   │
└─────────────┴───────────┴───────────────┴───────────┴─────────┴────────┘
```

#### Top 5 Posts Widget

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  🏆 TOP 5 POSTS BY SAVE RATE                                │
│                                                              │
│  1. ┌────┐  10 Productivity Hacks That...                   │
│     │ 📷 │  Instagram • Carousel                           │
│     └────┘  892 saves  •  7.14% save rate                  │
│                                                              │
│  2. ┌────┐  The Morning Routine That...                     │
│     │ 📷 │  Instagram • Carousel                           │
│     └────┘  654 saves  •  6.67% save rate                  │
│                                                              │
│  3. ┌────┐  Quick tip: Use this keyboard...                 │
│     │ 🎬 │  TikTok • Video Clip                            │
│     └────┘  1,205 saves  •  4.82% save rate                │
│                                                              │
│  4. ┌────┐  Mindset shift for entrepreneurs                 │
│     │ 💬 │  LinkedIn • Quote Card                          │
│     └────┘  234 saves  •  4.50% save rate                  │
│                                                              │
│  5. ┌────┐  How I grew my audience to 100K                  │
│     │ 🎬 │  Instagram • Reel                               │
│     └────┘  567 saves  •  3.99% save rate                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                         📌                                   │
│                                                              │
│              No Save Data Available Yet                      │
│                                                              │
│    Connect your social accounts and publish some content    │
│    to start tracking your save rate metrics.                │
│                                                              │
│              [Connect Accounts]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 8.2 Retention Graph Dashboard (Pro Only)

#### Retention Curve Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  📊 RETENTION CURVE                   Video: "How to Build a..."         │
│                                                                          │
│  100% ─●───────────────────────────────────────────────────────────────  │
│        │ ╲                                                               │
│   80% ─┼──╲─────────────────────────────────────────────────────────    │
│        │   ╲                                                             │
│   60% ─┼────╲──────────────●────────────────────────────────────────    │
│        │     ╲___________╱  ╲                                           │
│   40% ─┼─────────────────────╲────────────────────────────────────     │
│        │        ⚠️ DROP        ╲______                                  │
│   20% ─┼───────────────────────────────╲____________________________    │
│        │                                                                 │
│    0% ─┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────    │
│        0s   15s  30s  45s  1:00 1:15 1:30 1:45 2:00 2:15 2:30 2:45      │
│                                                                          │
│  ⚠️ Major drop at 0:06 (12% viewers left)                               │
│  💡 Suggestion: Review the transition at this point.                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Hook Score Badge

```
┌───────────────────────────────────┐
│                                   │
│  🎣 HOOK SCORE                    │
│                                   │
│      ┌─────────────────────┐     │
│      │                     │     │
│      │         82          │     │
│      │        GOOD         │     │
│      │                     │     │
│      └─────────────────────┘     │
│                                   │
│  First 3 seconds: 89% retention  │
│  Top 25% of creators             │
│  ↑ 8% vs last week               │
│                                   │
└───────────────────────────────────┘
```

#### Drop-off Annotations

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚠️ DROP-OFF POINTS DETECTED                                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 MAJOR  │  0:06  │  12% drop                      │   │
│  │ Your hook transition may be too abrupt. Try a       │   │
│  │ smoother lead into your main content.               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟡 MODERATE  │  0:45  │  8% drop                    │   │
│  │ Consider adding a pattern interrupt here - a new    │   │
│  │ visual or topic shift to re-engage viewers.         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### AI Insights Module

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  🤖 AI RETENTION INSIGHTS                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ POSITIVE                                         │   │
│  │                                                     │   │
│  │ Your hooks hold 23% longer than last week           │   │
│  │ Your first 3 seconds now retain 82.5% of viewers    │   │
│  │ compared to 67% last week.                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 RECOMMENDATION                                   │   │
│  │                                                     │   │
│  │ Reels outperform long-form by 14%                   │   │
│  │ Your short-form content has significantly higher    │   │
│  │ hook retention. Consider creating more Reels.       │   │
│  │                                                     │   │
│  │ [Create Reel Content →]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Comparison Chart

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  📊 YOUR RETENTION VS AVERAGE CREATOR                       │
│                                                              │
│                You        Average      Diff                  │
│              ─────────────────────────────────              │
│  Hook         82.5%       77.3%       +5.2%  ✅             │
│  Retention    ████████░░  ███████░░░                        │
│                                                              │
│  Completion   28.3%       30.4%       -2.1%  ⚠️             │
│  Rate         █████░░░░░  ██████░░░░                        │
│                                                              │
│  Avg View     35.2s       26.7s       +8.5s  ✅             │
│  Duration     ███████░░░  █████░░░░░                        │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│  💡 Your hooks are strong but completion could improve.     │
│     Focus on maintaining engagement through the middle.     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Pro-Only Gate (for non-Pro users)

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│              ┌─────────────────────────────┐                │
│              │                             │                │
│              │     📊 RETENTION GRAPH      │                │
│              │         PRO ONLY            │                │
│              │                             │                │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░  │                │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░  │                │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░  │                │
│              │       (Blurred Preview)     │                │
│              │                             │                │
│              └─────────────────────────────┘                │
│                                                              │
│   Unlock Retention Analytics to see:                         │
│   ✓ Viewer drop-off points                                  │
│   ✓ Hook retention scores                                   │
│   ✓ AI-powered improvement suggestions                      │
│   ✓ Comparison to top creators                              │
│                                                              │
│              [Upgrade to Pro - $29/mo]                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Data Ingestion by Platform

### 9.1 Platform API Requirements

| Platform | Save Metric | Impressions | Retention Data | API Endpoint |
|----------|-------------|-------------|----------------|--------------|
| Instagram | `saved` | `impressions` | N/A | Graph API `/insights` |
| TikTok | `shares` (proxy) | `video_views` | `audience_retention` | Research API |
| YouTube | `addedToPlaylists` | `views` | `audienceRetention` | Analytics API |
| LinkedIn | `saves` | `impressions` | N/A | Analytics API |
| X (Twitter) | `bookmark_count` | `impression_count` | N/A | API v2 |
| Facebook | `post_saves` | `impressions` | N/A | Graph API |

### 9.2 Ingestion Code Examples

```typescript
// server/services/platformIngestion/instagramIngestion.ts

interface InstagramInsightsResponse {
  data: Array<{
    name: string;
    values: Array<{ value: number }>;
  }>;
}

async function ingestInstagramSaves(userId: string, contentId: string, accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${contentId}/insights?metric=saved,impressions`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const data: InstagramInsightsResponse = await response.json();

  const saves = data.data.find(m => m.name === 'saved')?.values[0]?.value || 0;
  const impressions = data.data.find(m => m.name === 'impressions')?.values[0]?.value || 0;

  return {
    platform: 'instagram',
    contentId,
    saves,
    impressions,
    saveRate: impressions > 0 ? (saves / impressions) * 100 : 0
  };
}
```

```typescript
// server/services/platformIngestion/youtubeIngestion.ts

interface YouTubeRetentionResponse {
  rows: Array<[number, number]>;  // [second, retention%]
}

async function ingestYouTubeRetention(userId: string, videoId: string, accessToken: string) {
  // Fetch retention curve
  const retentionResponse = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
    `ids=channel==MINE&` +
    `dimensions=elapsedVideoTimeRatio&` +
    `metrics=audienceWatchRatio&` +
    `filters=video==${videoId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const retentionData: YouTubeRetentionResponse = await retentionResponse.json();

  // Fetch video stats
  const statsResponse = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
    `ids=channel==MINE&` +
    `metrics=views,averageViewDuration,estimatedMinutesWatched&` +
    `filters=video==${videoId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const statsData = await statsResponse.json();

  // Transform to our format
  const audienceRetention = retentionData.rows.map(([_, retention]) => retention * 100);

  return {
    platform: 'youtube',
    contentId: videoId,
    audienceRetention,
    totalViews: statsData.rows[0][0],
    averageViewDuration: statsData.rows[0][1]
  };
}
```

```typescript
// server/services/platformIngestion/tiktokIngestion.ts

async function ingestTikTokRetention(userId: string, videoId: string, accessToken: string) {
  const response = await fetch(
    `https://open.tiktokapis.com/v2/video/query/?fields=id,title,view_count,share_count,audience_countries`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: { video_ids: [videoId] }
      })
    }
  );

  const data = await response.json();
  const video = data.data.videos[0];

  // TikTok provides less granular retention data
  // We may need to use their Creator Portal API for detailed retention

  return {
    platform: 'tiktok',
    contentId: videoId,
    saves: video.share_count,  // TikTok doesn't have saves, use shares as proxy
    impressions: video.view_count,
    // Retention data requires separate API call or Creator Portal access
  };
}
```

### 9.3 Scheduled Ingestion Jobs

```typescript
// server/jobs/analyticsIngestion.ts

import cron from 'node-cron';
import { ingestInstagramSaves } from './platformIngestion/instagramIngestion';
import { ingestYouTubeRetention } from './platformIngestion/youtubeIngestion';

// Run every 4 hours
cron.schedule('0 */4 * * *', async () => {
  console.log('Starting analytics ingestion job...');

  // Get all users with connected accounts
  const users = await db.users.findMany({
    where: { hasConnectedAccounts: true }
  });

  for (const user of users) {
    try {
      // Ingest from each connected platform
      if (user.instagramConnected) {
        await ingestInstagramData(user.id, user.instagramToken);
      }
      if (user.youtubeConnected) {
        await ingestYouTubeData(user.id, user.youtubeToken);
      }
      if (user.tiktokConnected) {
        await ingestTikTokData(user.id, user.tiktokToken);
      }
      // ... other platforms
    } catch (error) {
      console.error(`Failed to ingest data for user ${user.id}:`, error);
    }
  }

  console.log('Analytics ingestion job completed.');
});

// Daily aggregation at 3 AM UTC
cron.schedule('0 3 * * *', async () => {
  console.log('Starting daily aggregation job...');

  const users = await db.users.findMany();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const user of users) {
    try {
      await aggregateDailySaveRates(user.id, yesterday);
      await aggregateDailyRetention(user.id, yesterday);
      await generateDailyInsights(user.id, yesterday);
    } catch (error) {
      console.error(`Failed to aggregate for user ${user.id}:`, error);
    }
  }

  console.log('Daily aggregation job completed.');
});
```

---

## 10. Insight Generation Rules

### 10.1 Save Rate Insights

| Insight Type | Trigger Condition | Priority | Example Message |
|--------------|-------------------|----------|-----------------|
| `format_leader` | Format >30% above avg | 85 | "Carousels get 45% higher save rate than your other formats" |
| `save_rate_spike` | Rate >50% above 7-day avg | 80 | "Your save rate jumped to 4.2% yesterday - 52% above your weekly average!" |
| `declining_saves` | Rate down >20% WoW | 75 | "Save rate dropped 25% this week. Review recent content performance." |
| `platform_opportunity` | Platform lagging >30% | 70 | "LinkedIn saves are 35% below your average. Try more saveable content." |
| `top_performer` | Post in top 1% by rate | 90 | "Your productivity hacks post has a 7.1% save rate - in your top 1%!" |

### 10.2 Retention Insights

| Insight Type | Trigger Condition | Priority | Example Message |
|--------------|-------------------|----------|-----------------|
| `hook_improvement` | Hook retention up >15% | 90 | "Your hooks hold 23% longer than last week!" |
| `major_dropoff` | Drop >15% at single point | 85 | "Major drop occurs at 6 seconds - 15% of viewers leave here" |
| `completion_decline` | Completion rate down >10% | 80 | "Completion rate dropped 12% this week. Videos may be too long." |
| `format_retention_diff` | Format >20% better retention | 75 | "Reels have 18% better hook retention than long-form videos" |
| `above_benchmark` | Metric >10% above benchmark | 70 | "Your hook retention is 12% above average creators" |
| `below_benchmark` | Metric >10% below benchmark | 70 | "Completion rate is 15% below average. Consider shorter content." |

### 10.3 Insight Generation Code

```typescript
// server/services/insightGenerator.ts

interface InsightRule {
  type: string;
  check: (data: any, benchmarks: any) => boolean;
  generate: (data: any, benchmarks: any) => Insight;
  priority: number;
}

const SAVE_RATE_RULES: InsightRule[] = [
  {
    type: 'format_leader',
    priority: 85,
    check: (data) => {
      const rates = Object.values(data.byFormat).map((f: any) => f.saveRate);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      return rates.some(r => r > avg * 1.3);
    },
    generate: (data) => {
      const formats = Object.entries(data.byFormat);
      const rates = formats.map(([_, f]: any) => f.saveRate);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      const [topFormat, topData] = formats.reduce((best, curr) =>
        (curr[1] as any).saveRate > (best[1] as any).saveRate ? curr : best
      );
      const diff = Math.round(((topData as any).saveRate / avg - 1) * 100);

      return {
        type: 'format_leader',
        title: `${topFormat} is Your Save Rate Champion`,
        description: `${topFormat} posts get ${diff}% higher save rate than your other formats. Consider creating more ${topFormat} content.`,
        priority: 85,
        isActionable: true,
        actionLabel: `Create ${topFormat}`,
        actionUrl: `/generate?format=${topFormat}`
      };
    }
  },
  // ... more rules
];

const RETENTION_RULES: InsightRule[] = [
  {
    type: 'hook_improvement',
    priority: 90,
    check: (data, prev) => {
      return prev && data.avgHookRetention > prev.avgHookRetention * 1.15;
    },
    generate: (data, prev) => {
      const improvement = Math.round((data.avgHookRetention / prev.avgHookRetention - 1) * 100);
      return {
        type: 'hook_improvement',
        title: `Your hooks hold ${improvement}% longer than last week`,
        description: `Great improvement! Your first 3 seconds now retain ${data.avgHookRetention.toFixed(1)}% of viewers compared to ${prev.avgHookRetention.toFixed(1)}% last week.`,
        priority: 90,
        isActionable: false
      };
    }
  },
  {
    type: 'major_dropoff',
    priority: 85,
    check: (data) => {
      return data.dropOffPoints?.some((d: any) => d.severity === 'major');
    },
    generate: (data) => {
      const majorDrop = data.dropOffPoints.find((d: any) => d.severity === 'major');
      return {
        type: 'major_dropoff',
        title: `Major drop occurs at ${majorDrop.second} seconds`,
        description: `${majorDrop.dropPercent}% of viewers leave at this point. ${majorDrop.suggestion}`,
        priority: 85,
        isActionable: true,
        actionLabel: 'View Video Analysis',
        actionUrl: `/analytics/retention/${data.contentId}`
      };
    }
  },
  // ... more rules
];

async function generateInsights(userId: string, feature: 'save_rate' | 'retention') {
  const rules = feature === 'save_rate' ? SAVE_RATE_RULES : RETENTION_RULES;
  const data = await fetchCurrentData(userId, feature);
  const previousData = await fetchPreviousData(userId, feature);
  const benchmarks = await fetchBenchmarks(feature);

  const insights: Insight[] = [];

  for (const rule of rules) {
    if (rule.check(data, previousData)) {
      const insight = rule.generate(data, previousData);
      insights.push(insight);
    }
  }

  // Sort by priority and take top 5
  insights.sort((a, b) => b.priority - a.priority);
  const topInsights = insights.slice(0, 5);

  // Store insights
  await storeInsights(userId, topInsights);

  return topInsights;
}
```

---

## Summary

This specification provides a complete implementation plan for:

### Save Rate Analytics (Creator + Pro)
- Full data model with saves, impressions, and calculated rates
- API endpoints for metrics, trends, and top posts
- UI components including cards, graphs, and tables
- Platform-specific ingestion for 6 social networks

### Retention Graph Analytics (Pro Only)
- Retention curve processing and storage
- Hook score calculation with benchmarks
- Drop-off detection with AI suggestions
- Comparison charts against average creators
- Pro-only access gating at API and UI levels

### Shared Infrastructure
- Database schema (SQL and NoSQL options)
- Scheduled ingestion and aggregation jobs
- Insight generation engine with configurable rules
- Tier-based access control middleware

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-31 | ReGenr Team | Initial specification |
