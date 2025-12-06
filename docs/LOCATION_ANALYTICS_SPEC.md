# Location of Engagement Analytics - System Design Specification

## Executive Summary

This document provides a complete production-ready specification for implementing "Location of Engagement" analytics in the ReGen app. The feature enables creators to understand **where** their audience engages most, broken down by country, region, and city, with insights into which content formats perform best by geography.

> **Access Control:** This is a **Pro-only feature**. Free and Creator plan users will see an upgrade prompt when accessing `/analytics/location`. The feature is gated via `hasLocationAnalytics()` in `app/config/plans.ts`.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Inputs & Collection Strategy](#2-data-inputs--collection-strategy)
3. [Database Schema Design](#3-database-schema-design)
4. [API Endpoints Specification](#4-api-endpoints-specification)
5. [UI/UX Dashboard Design](#5-uiux-dashboard-design)
6. [Insights & Intelligence Engine](#6-insights--intelligence-engine)
7. [Privacy & Compliance](#7-privacy--compliance)
8. [Implementation Code Examples](#8-implementation-code-examples)
9. [Performance & Scaling Considerations](#9-performance--scaling-considerations)
10. [Appendix](#10-appendix)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Map Heatmap   │  │  Location Table │  │  Format Charts  │             │
│  │   Component     │  │    Component    │  │    Component    │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                ▼                                            │
│                    ┌───────────────────────┐                                │
│                    │  Location Analytics   │                                │
│                    │      Dashboard        │                                │
│                    └───────────┬───────────┘                                │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js API Routes                               │   │
│  │  /api/analytics/location/*                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Express Backend                                  │   │
│  │  GET  /api/analytics/engagement-by-location                         │   │
│  │  GET  /api/analytics/top-locations                                  │   │
│  │  GET  /api/analytics/location-performance-by-format                 │   │
│  │  POST /api/analytics/ingest-events                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Location Service │  │  Insights Engine │  │  Aggregation     │          │
│  │                  │  │                  │  │  Worker          │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Geo Normalization Service                         │   │
│  │  - ISO 3166 Country Codes                                           │   │
│  │  - Region/State Standardization                                     │   │
│  │  - City Name Normalization                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ engagement_events│  │   geo_locations  │  │  content_items   │          │
│  │                  │  │                  │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  format_types    │  │ aggregated_stats │  │ location_insights│          │
│  │                  │  │     _daily       │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL DATA SOURCES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Instagram │  │  TikTok  │  │ YouTube  │  │ LinkedIn │  │    X     │     │
│  │Graph API │  │   API    │  │Analytics │  │Analytics │  │   API    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
Platform APIs → Ingest Service → Geo Normalization → Event Storage
                                                           │
                                                           ▼
Dashboard ← API Layer ← Insights Engine ← Aggregation Worker
```

### 1.3 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | Next.js 16 + React 19 | Existing stack, SSR support |
| Map Visualization | Mapbox GL JS / Leaflet | Rich geo visualization |
| Charts | Recharts / Chart.js | Existing pattern compatibility |
| Backend API | Express.js | Existing stack |
| Database | PostgreSQL + TimescaleDB | Time-series optimization |
| Cache | Redis | Fast aggregation queries |
| Job Queue | Bull (Redis-backed) | Background aggregation |
| Geo Data | MaxMind GeoIP2 | IP-to-location resolution |

---

## 2. Data Inputs & Collection Strategy

### 2.1 Engagement Signals to Collect

| Signal | Weight | Description | Platforms Available |
|--------|--------|-------------|---------------------|
| `views` | 1.0 | Content impressions | All |
| `likes` | 2.0 | Like/heart reactions | All |
| `comments` | 3.0 | Comment count | All |
| `shares` | 4.0 | Shares/reposts | All |
| `saves` | 3.5 | Bookmarks/saves | Instagram, TikTok, Pinterest |
| `watch_time` | 2.5 | Average watch duration | YouTube, TikTok |
| `clicks` | 2.0 | Link/profile clicks | All |
| `replies` | 3.0 | Direct replies | X, LinkedIn |
| `duets` | 4.0 | Duet/stitch content | TikTok |

### 2.2 Location Data Sources by Platform

#### Instagram Graph API
```javascript
// Audience insights endpoint
GET /v18.0/{ig-user-id}/insights
  ?metric=audience_city,audience_country
  &period=lifetime

// Response provides top locations (aggregated, not per-post)
{
  "data": [{
    "name": "audience_city",
    "values": [{
      "value": {
        "New York, New York": 15420,
        "Los Angeles, California": 12350,
        "London, England": 8920
      }
    }]
  }]
}
```

#### TikTok Analytics API
```javascript
// Follower demographics
GET /v2/research/user/followers/
  ?fields=audience_countries

// Returns country-level breakdown
{
  "data": {
    "audience_countries": {
      "US": 45.2,
      "UK": 12.8,
      "CA": 8.5
    }
  }
}
```

#### YouTube Analytics API
```javascript
// Geographic report
GET /v2/reports
  ?dimensions=country
  &metrics=views,likes,comments,shares
  &filters=video=={video_id}

// Provides country-level engagement
{
  "rows": [
    ["US", 125000, 8500, 420, 180],
    ["GB", 45000, 3200, 180, 95]
  ]
}
```

#### LinkedIn Analytics API
```javascript
// Follower statistics
GET /v2/organizationalEntityFollowerStatistics
  ?q=organizationalEntity
  &organizationalEntity=urn:li:organization:{id}

// Geographic breakdown
{
  "elements": [{
    "followerCountsByGeo": [{
      "geo": "urn:li:geo:103644278", // US
      "followerCounts": { "total": 5420 }
    }]
  }]
}
```

#### X (Twitter) API v2
```javascript
// Note: Limited geo data available
// Primarily through promoted tweets analytics
GET /2/tweets/{id}
  ?tweet.fields=public_metrics,geo

// For ads/promoted content
GET /11/stats/accounts/{account_id}
  ?granularity=DAY
  &metric_groups=ENGAGEMENT
  &segmentation_type=COUNTRY
```

### 2.3 Geo Data Normalization Strategy

```typescript
// types/geo.ts
export interface NormalizedLocation {
  // ISO 3166-1 alpha-2 country code
  countryCode: string;        // "US", "GB", "CA"
  countryName: string;        // "United States", "United Kingdom"

  // ISO 3166-2 region code
  regionCode: string | null;  // "US-CA", "GB-ENG"
  regionName: string | null;  // "California", "England"

  // Normalized city name
  cityName: string | null;    // "Los Angeles", "London"
  cityId: string | null;      // GeoNames ID for deduplication

  // Coordinates (centroid for aggregation, not precise)
  latitude: number | null;    // City/region centroid
  longitude: number | null;

  // Metadata
  timezone: string | null;    // "America/Los_Angeles"
  continent: string;          // "NA", "EU", "AS"
}

// Normalization mappings
const PLATFORM_GEO_MAPPINGS = {
  instagram: {
    // Instagram uses "City, State" format for US
    // "City, Country" format for international
    parser: (raw: string) => parseInstagramLocation(raw),
  },
  youtube: {
    // YouTube uses ISO 3166-1 alpha-2 codes
    parser: (raw: string) => parseYouTubeCountry(raw),
  },
  tiktok: {
    // TikTok uses ISO 3166-1 alpha-2 codes
    parser: (raw: string) => parseTikTokCountry(raw),
  },
  linkedin: {
    // LinkedIn uses URN format: urn:li:geo:{geoId}
    parser: (raw: string) => parseLinkedInGeo(raw),
  },
  x: {
    // X uses country codes or place IDs
    parser: (raw: string) => parseXLocation(raw),
  },
};
```

### 2.4 Data Freshness Strategy

| Data Type | Refresh Frequency | Method |
|-----------|-------------------|--------|
| Audience Demographics | Daily | Scheduled job (2 AM UTC) |
| Post Engagement | Every 4 hours | Webhook + polling fallback |
| Aggregated Stats | Hourly | Background worker |
| Insights Generation | Daily | Post-aggregation job |

---

## 3. Database Schema Design

### 3.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  content_items  │       │  format_types   │       │  geo_locations  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ name            │       │ country_code    │
│ platform        │       │ category        │       │ country_name    │
│ platform_id     │◄──┐   │ description     │       │ region_code     │
│ format_type_id  │───┼──►│                 │       │ region_name     │
│ title           │   │   └─────────────────┘       │ city_name       │
│ created_at      │   │                             │ city_id         │
│ published_at    │   │                             │ latitude        │
└────────┬────────┘   │                             │ longitude       │
         │            │                             │ timezone        │
         │            │                             │ continent       │
         ▼            │                             └────────┬────────┘
┌─────────────────────┴─────────────────────────────────────┐│
│                    engagement_events                       ││
├────────────────────────────────────────────────────────────┤│
│ id (PK)                                                    ││
│ content_item_id (FK) ──────────────────────────────────────┘│
│ geo_location_id (FK) ───────────────────────────────────────┘
│ event_type (views, likes, comments, shares, saves)         │
│ event_count                                                │
│ platform                                                   │
│ recorded_at                                                │
│ period_start                                               │
│ period_end                                                 │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                  aggregated_stats_daily                    │
├────────────────────────────────────────────────────────────┤
│ id (PK)                                                    │
│ user_id (FK)                                               │
│ geo_location_id (FK)                                       │
│ format_type_id (FK)                                        │
│ platform                                                   │
│ date                                                       │
│ total_views                                                │
│ total_likes                                                │
│ total_comments                                             │
│ total_shares                                               │
│ total_saves                                                │
│ total_engagement                                           │
│ engagement_rate                                            │
│ weighted_score                                             │
└────────────────────────────────────────────────────────────┘
```

### 3.2 SQL Schema (PostgreSQL)

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text matching

-- ============================================
-- TABLE: geo_locations
-- Normalized location reference table
-- ============================================
CREATE TABLE geo_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Country level (required)
    country_code CHAR(2) NOT NULL,           -- ISO 3166-1 alpha-2
    country_name VARCHAR(100) NOT NULL,

    -- Region/State level (optional)
    region_code VARCHAR(10),                  -- ISO 3166-2
    region_name VARCHAR(100),

    -- City level (optional)
    city_name VARCHAR(100),
    city_id VARCHAR(20),                      -- GeoNames ID

    -- Coordinates (centroid, not precise)
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),

    -- Metadata
    timezone VARCHAR(50),
    continent CHAR(2),                        -- AF, AN, AS, EU, NA, OC, SA

    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint for deduplication
    CONSTRAINT unique_location UNIQUE (country_code, region_code, city_id)
);

-- Indexes for geo_locations
CREATE INDEX idx_geo_country ON geo_locations(country_code);
CREATE INDEX idx_geo_region ON geo_locations(country_code, region_code);
CREATE INDEX idx_geo_city ON geo_locations(city_name) WHERE city_name IS NOT NULL;
CREATE INDEX idx_geo_coords ON geo_locations(latitude, longitude) WHERE latitude IS NOT NULL;

-- ============================================
-- TABLE: format_types
-- Content format classification
-- ============================================
CREATE TABLE format_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,         -- 'video_clip', 'carousel', 'quote_card'
    category VARCHAR(30) NOT NULL,            -- 'video', 'image', 'text'
    description TEXT,
    icon VARCHAR(50),                         -- Icon identifier for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed format types
INSERT INTO format_types (name, category, description, icon) VALUES
    ('video_clip', 'video', 'Short-form video clip (< 60s)', 'video'),
    ('video_long', 'video', 'Long-form video (> 60s)', 'film'),
    ('carousel', 'image', 'Multi-image carousel post', 'images'),
    ('single_image', 'image', 'Single image post', 'image'),
    ('quote_card', 'image', 'Quote graphic card', 'quote'),
    ('infographic', 'image', 'Data visualization / infographic', 'chart'),
    ('story', 'image', 'Ephemeral story content', 'clock'),
    ('reel', 'video', 'Vertical short-form video', 'smartphone'),
    ('thread', 'text', 'Multi-post text thread', 'message-square'),
    ('poll', 'text', 'Interactive poll', 'bar-chart'),
    ('live', 'video', 'Live stream recording', 'radio');

-- ============================================
-- TABLE: content_items
-- Individual pieces of content
-- ============================================
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,                    -- Reference to users table

    -- Platform info
    platform VARCHAR(20) NOT NULL,            -- 'instagram', 'tiktok', 'youtube', etc.
    platform_content_id VARCHAR(100),         -- Platform's native content ID

    -- Content metadata
    format_type_id UUID REFERENCES format_types(id),
    title VARCHAR(500),
    description TEXT,
    thumbnail_url VARCHAR(500),
    content_url VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Prevent duplicates
    CONSTRAINT unique_platform_content UNIQUE (platform, platform_content_id)
);

-- Indexes for content_items
CREATE INDEX idx_content_user ON content_items(user_id);
CREATE INDEX idx_content_platform ON content_items(platform);
CREATE INDEX idx_content_format ON content_items(format_type_id);
CREATE INDEX idx_content_published ON content_items(published_at DESC);

-- ============================================
-- TABLE: engagement_events
-- Raw engagement data by location
-- ============================================
CREATE TABLE engagement_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    geo_location_id UUID NOT NULL REFERENCES geo_locations(id),

    -- Event data
    event_type VARCHAR(20) NOT NULL,          -- 'views', 'likes', 'comments', etc.
    event_count BIGINT NOT NULL DEFAULT 0,

    -- Platform source
    platform VARCHAR(20) NOT NULL,

    -- Time period this data covers
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- When we recorded this
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Data quality
    is_estimated BOOLEAN DEFAULT false,       -- True if interpolated
    confidence_score DECIMAL(3, 2),           -- 0.00 to 1.00

    -- Prevent duplicate entries
    CONSTRAINT unique_event UNIQUE (content_item_id, geo_location_id, event_type, period_start)
);

-- Indexes for engagement_events (optimized for time-series queries)
CREATE INDEX idx_events_content ON engagement_events(content_item_id);
CREATE INDEX idx_events_location ON engagement_events(geo_location_id);
CREATE INDEX idx_events_type ON engagement_events(event_type);
CREATE INDEX idx_events_period ON engagement_events(period_start DESC);
CREATE INDEX idx_events_platform ON engagement_events(platform);

-- Composite index for common query patterns
CREATE INDEX idx_events_location_period ON engagement_events(geo_location_id, period_start DESC);
CREATE INDEX idx_events_content_location ON engagement_events(content_item_id, geo_location_id);

-- ============================================
-- TABLE: aggregated_stats_daily
-- Pre-computed daily aggregations
-- ============================================
CREATE TABLE aggregated_stats_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Dimensions
    user_id UUID NOT NULL,
    geo_location_id UUID NOT NULL REFERENCES geo_locations(id),
    format_type_id UUID REFERENCES format_types(id),
    platform VARCHAR(20),                     -- NULL = all platforms

    -- Time dimension
    date DATE NOT NULL,

    -- Metrics
    total_views BIGINT DEFAULT 0,
    total_likes BIGINT DEFAULT 0,
    total_comments BIGINT DEFAULT 0,
    total_shares BIGINT DEFAULT 0,
    total_saves BIGINT DEFAULT 0,
    total_engagement BIGINT DEFAULT 0,        -- Sum of all interactions

    -- Computed metrics
    engagement_rate DECIMAL(8, 4),            -- (engagement / views) * 100
    weighted_score DECIMAL(12, 2),            -- Custom weighted engagement score

    -- Content count
    content_count INTEGER DEFAULT 0,

    -- Metadata
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint for upserts
    CONSTRAINT unique_daily_stat UNIQUE (user_id, geo_location_id, format_type_id, platform, date)
);

-- Indexes for aggregated_stats_daily
CREATE INDEX idx_stats_user_date ON aggregated_stats_daily(user_id, date DESC);
CREATE INDEX idx_stats_location ON aggregated_stats_daily(geo_location_id);
CREATE INDEX idx_stats_format ON aggregated_stats_daily(format_type_id);
CREATE INDEX idx_stats_weighted ON aggregated_stats_daily(user_id, weighted_score DESC);

-- ============================================
-- TABLE: location_insights
-- AI-generated insights storage
-- ============================================
CREATE TABLE location_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,

    -- Insight details
    insight_type VARCHAR(50) NOT NULL,        -- 'emerging_region', 'format_performance', etc.
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Related entities
    geo_location_id UUID REFERENCES geo_locations(id),
    format_type_id UUID REFERENCES format_types(id),

    -- Metrics that triggered insight
    metric_name VARCHAR(50),
    metric_value DECIMAL(12, 2),
    comparison_value DECIMAL(12, 2),
    change_percentage DECIMAL(8, 2),

    -- Validity period
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,

    -- Priority/relevance
    priority INTEGER DEFAULT 50,              -- 0-100, higher = more important
    is_actionable BOOLEAN DEFAULT true,

    -- Status
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insights_user ON location_insights(user_id, created_at DESC);
CREATE INDEX idx_insights_active ON location_insights(user_id, is_dismissed, valid_until);

-- ============================================
-- VIEWS for common queries
-- ============================================

-- Top locations by engagement (last 30 days)
CREATE VIEW v_top_locations_30d AS
SELECT
    g.id AS geo_location_id,
    g.country_code,
    g.country_name,
    g.region_name,
    g.city_name,
    s.user_id,
    SUM(s.total_engagement) AS total_engagement,
    SUM(s.total_views) AS total_views,
    AVG(s.engagement_rate) AS avg_engagement_rate,
    SUM(s.content_count) AS content_count
FROM aggregated_stats_daily s
JOIN geo_locations g ON s.geo_location_id = g.id
WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY g.id, g.country_code, g.country_name, g.region_name, g.city_name, s.user_id;

-- Format performance by region
CREATE VIEW v_format_performance_by_region AS
SELECT
    g.country_code,
    g.country_name,
    g.region_name,
    f.name AS format_name,
    f.category AS format_category,
    s.user_id,
    SUM(s.total_engagement) AS total_engagement,
    AVG(s.engagement_rate) AS avg_engagement_rate,
    SUM(s.content_count) AS content_count
FROM aggregated_stats_daily s
JOIN geo_locations g ON s.geo_location_id = g.id
JOIN format_types f ON s.format_type_id = f.id
WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY g.country_code, g.country_name, g.region_name, f.name, f.category, s.user_id;
```

### 3.3 NoSQL Alternative (MongoDB Schema)

```javascript
// For JSON-based storage (current ReGen pattern)
// File: server/data/location_analytics.json

{
  "geo_locations": {
    "loc_us_ca_la": {
      "id": "loc_us_ca_la",
      "countryCode": "US",
      "countryName": "United States",
      "regionCode": "US-CA",
      "regionName": "California",
      "cityName": "Los Angeles",
      "cityId": "5368361",
      "latitude": 34.0522,
      "longitude": -118.2437,
      "timezone": "America/Los_Angeles",
      "continent": "NA"
    }
  },

  "engagement_events": [
    {
      "id": "evt_abc123",
      "contentItemId": "content_xyz",
      "geoLocationId": "loc_us_ca_la",
      "eventType": "likes",
      "eventCount": 1250,
      "platform": "instagram",
      "periodStart": "2024-01-01T00:00:00Z",
      "periodEnd": "2024-01-01T23:59:59Z",
      "recordedAt": "2024-01-02T02:00:00Z"
    }
  ],

  "aggregated_stats_daily": {
    "user_123_2024-01-15": {
      "userId": "user_123",
      "date": "2024-01-15",
      "locations": {
        "loc_us_ca_la": {
          "totalViews": 45000,
          "totalLikes": 3200,
          "totalComments": 180,
          "totalShares": 95,
          "totalSaves": 420,
          "engagementRate": 8.66,
          "byFormat": {
            "carousel": { "engagement": 2100, "rate": 12.4 },
            "video_clip": { "engagement": 1500, "rate": 7.2 }
          }
        }
      }
    }
  }
}
```

---

## 4. API Endpoints Specification

### 4.1 Endpoint Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/analytics/engagement-by-location` | Engagement metrics grouped by location | Yes |
| GET | `/api/analytics/top-locations` | Ranked list of top performing locations | Yes |
| GET | `/api/analytics/location-performance-by-format` | Format performance comparison by region | Yes |
| POST | `/api/analytics/ingest-events` | Ingest engagement events from platforms | Yes |
| GET | `/api/analytics/location-insights` | AI-generated location insights | Yes |
| GET | `/api/analytics/location-map-data` | Optimized data for map visualization | Yes |

### 4.2 Detailed Endpoint Specifications

#### GET /api/analytics/engagement-by-location

**Description:** Returns engagement metrics grouped by geographic location with filtering options.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `granularity` | string | No | `country` | `country`, `region`, `city` |
| `period` | string | No | `30d` | `7d`, `30d`, `90d`, `365d`, `all` |
| `platform` | string | No | `all` | `instagram`, `tiktok`, `youtube`, `linkedin`, `x`, `all` |
| `format` | string | No | `all` | Format type filter |
| `country` | string | No | - | Filter to specific country (ISO code) |
| `limit` | number | No | `50` | Max results to return |
| `offset` | number | No | `0` | Pagination offset |

**Request Example:**
```http
GET /api/analytics/engagement-by-location?granularity=city&period=30d&platform=instagram&limit=20
Authorization: Bearer {token}
```

**Response Shape:**
```typescript
interface EngagementByLocationResponse {
  success: boolean;
  data: {
    locations: LocationEngagement[];
    totals: EngagementTotals;
    period: {
      start: string;  // ISO date
      end: string;
    };
    filters: AppliedFilters;
  };
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface LocationEngagement {
  locationId: string;
  countryCode: string;
  countryName: string;
  regionName: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    totalEngagement: number;
    engagementRate: number;
    weightedScore: number;
  };
  trend: {
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
    previousPeriod: number;
  };
  contentCount: number;
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "locationId": "loc_us_ca_la",
        "countryCode": "US",
        "countryName": "United States",
        "regionName": "California",
        "cityName": "Los Angeles",
        "latitude": 34.0522,
        "longitude": -118.2437,
        "metrics": {
          "views": 125000,
          "likes": 8500,
          "comments": 420,
          "shares": 180,
          "saves": 650,
          "totalEngagement": 9750,
          "engagementRate": 7.8,
          "weightedScore": 28450.5
        },
        "trend": {
          "direction": "up",
          "changePercent": 23.5,
          "previousPeriod": 7900
        },
        "contentCount": 45
      },
      {
        "locationId": "loc_gb_eng_london",
        "countryCode": "GB",
        "countryName": "United Kingdom",
        "regionName": "England",
        "cityName": "London",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "metrics": {
          "views": 89000,
          "likes": 6200,
          "comments": 380,
          "shares": 145,
          "saves": 520,
          "totalEngagement": 7245,
          "engagementRate": 8.14,
          "weightedScore": 21890.0
        },
        "trend": {
          "direction": "up",
          "changePercent": 15.2,
          "previousPeriod": 6290
        },
        "contentCount": 38
      }
    ],
    "totals": {
      "views": 580000,
      "likes": 42000,
      "comments": 2100,
      "shares": 890,
      "saves": 3200,
      "totalEngagement": 48190,
      "avgEngagementRate": 8.31
    },
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "filters": {
      "granularity": "city",
      "platform": "instagram",
      "format": "all"
    }
  },
  "meta": {
    "total": 156,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### GET /api/analytics/top-locations

**Description:** Returns a ranked list of top performing locations, optimized for dashboard widgets.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `metric` | string | No | `engagement` | `engagement`, `views`, `engagement_rate`, `growth` |
| `period` | string | No | `7d` | Time period |
| `limit` | number | No | `10` | Number of results |
| `granularity` | string | No | `city` | Location granularity |

**Request Example:**
```http
GET /api/analytics/top-locations?metric=engagement&period=7d&limit=5
Authorization: Bearer {token}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "location": {
          "id": "loc_us_ca_la",
          "name": "Los Angeles, California",
          "countryCode": "US",
          "flag": "🇺🇸"
        },
        "metric": {
          "name": "engagement",
          "value": 9750,
          "formattedValue": "9.8K"
        },
        "change": {
          "value": 23.5,
          "direction": "up"
        }
      },
      {
        "rank": 2,
        "location": {
          "id": "loc_gb_eng_london",
          "name": "London, England",
          "countryCode": "GB",
          "flag": "🇬🇧"
        },
        "metric": {
          "name": "engagement",
          "value": 7245,
          "formattedValue": "7.2K"
        },
        "change": {
          "value": 15.2,
          "direction": "up"
        }
      },
      {
        "rank": 3,
        "location": {
          "id": "loc_us_ny_nyc",
          "name": "New York City, New York",
          "countryCode": "US",
          "flag": "🇺🇸"
        },
        "metric": {
          "name": "engagement",
          "value": 6890,
          "formattedValue": "6.9K"
        },
        "change": {
          "value": 8.7,
          "direction": "up"
        }
      }
    ],
    "period": {
      "label": "Last 7 days",
      "start": "2024-01-24",
      "end": "2024-01-31"
    }
  }
}
```

---

#### GET /api/analytics/location-performance-by-format

**Description:** Returns content format performance comparison by geographic region.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period |
| `country` | string | No | - | Filter by country |
| `region` | string | No | - | Filter by region |
| `formats` | string | No | `all` | Comma-separated format types |

**Request Example:**
```http
GET /api/analytics/location-performance-by-format?period=30d&country=US
Authorization: Bearer {token}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "comparison": [
      {
        "location": {
          "id": "loc_us_ca",
          "name": "California",
          "countryCode": "US"
        },
        "formats": [
          {
            "formatId": "carousel",
            "formatName": "Carousel",
            "category": "image",
            "metrics": {
              "totalEngagement": 4500,
              "engagementRate": 12.4,
              "contentCount": 15
            },
            "isTopPerformer": true
          },
          {
            "formatId": "video_clip",
            "formatName": "Video Clip",
            "category": "video",
            "metrics": {
              "totalEngagement": 3200,
              "engagementRate": 8.9,
              "contentCount": 22
            },
            "isTopPerformer": false
          },
          {
            "formatId": "quote_card",
            "formatName": "Quote Card",
            "category": "image",
            "metrics": {
              "totalEngagement": 1800,
              "engagementRate": 6.2,
              "contentCount": 18
            },
            "isTopPerformer": false
          }
        ],
        "insight": "Carousel posts get 39% higher engagement in California compared to video clips."
      },
      {
        "location": {
          "id": "loc_us_ny",
          "name": "New York",
          "countryCode": "US"
        },
        "formats": [
          {
            "formatId": "video_clip",
            "formatName": "Video Clip",
            "category": "video",
            "metrics": {
              "totalEngagement": 5100,
              "engagementRate": 11.2,
              "contentCount": 28
            },
            "isTopPerformer": true
          },
          {
            "formatId": "carousel",
            "formatName": "Carousel",
            "category": "image",
            "metrics": {
              "totalEngagement": 3800,
              "engagementRate": 9.8,
              "contentCount": 20
            },
            "isTopPerformer": false
          }
        ],
        "insight": "Video clips outperform all other formats in New York by 34%."
      }
    ],
    "summary": {
      "topFormatOverall": "carousel",
      "totalLocationsAnalyzed": 12,
      "dataPoints": 1456
    }
  }
}
```

---

#### POST /api/analytics/ingest-events

**Description:** Ingests engagement events from social media platforms. Used by platform sync jobs.

**Request Body:**
```typescript
interface IngestEventsRequest {
  source: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x';
  events: EngagementEvent[];
  syncId?: string;  // For idempotency
}

interface EngagementEvent {
  contentId: string;           // Platform content ID
  geoData: {
    raw: string;               // Raw location from platform
    countryCode?: string;      // Pre-normalized if available
    regionName?: string;
    cityName?: string;
  };
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
  periodStart: string;         // ISO timestamp
  periodEnd: string;
}
```

**Request Example:**
```json
{
  "source": "instagram",
  "syncId": "sync_abc123_20240131",
  "events": [
    {
      "contentId": "ig_post_123456",
      "geoData": {
        "raw": "Los Angeles, California",
        "countryCode": "US"
      },
      "metrics": {
        "views": 5000,
        "likes": 350,
        "comments": 28,
        "saves": 45
      },
      "periodStart": "2024-01-30T00:00:00Z",
      "periodEnd": "2024-01-30T23:59:59Z"
    }
  ]
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "processed": 1,
    "created": 1,
    "updated": 0,
    "errors": [],
    "syncId": "sync_abc123_20240131"
  }
}
```

---

#### GET /api/analytics/location-map-data

**Description:** Returns optimized GeoJSON data for map visualization.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30d` | Time period |
| `metric` | string | No | `engagement` | Metric for intensity |
| `bounds` | string | No | - | Map bounds: `sw_lat,sw_lng,ne_lat,ne_lng` |

**Response Example:**
```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-118.2437, 34.0522]
        },
        "properties": {
          "locationId": "loc_us_ca_la",
          "name": "Los Angeles",
          "country": "US",
          "engagement": 9750,
          "intensity": 0.95,
          "radius": 45
        }
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-0.1278, 51.5074]
        },
        "properties": {
          "locationId": "loc_gb_eng_london",
          "name": "London",
          "country": "GB",
          "engagement": 7245,
          "intensity": 0.72,
          "radius": 38
        }
      }
    ],
    "bounds": {
      "sw": [-180, -60],
      "ne": [180, 75]
    },
    "maxEngagement": 9750,
    "totalLocations": 45
  }
}
```

---

## 5. UI/UX Dashboard Design

### 5.1 Component Hierarchy

```
LocationAnalyticsDashboard
├── LocationHeader
│   ├── PageTitle
│   ├── PeriodSelector
│   └── ExportButton
│
├── KeyMetricsRow
│   ├── MetricCard (Top Country)
│   ├── MetricCard (Top City)
│   ├── MetricCard (Emerging Region)
│   └── MetricCard (Global Reach)
│
├── MainVisualizationSection
│   ├── EngagementMap (left 60%)
│   │   ├── MapControls
│   │   ├── MapCanvas
│   │   └── MapLegend
│   │
│   └── TopLocationsPanel (right 40%)
│       ├── TabSelector (Countries | Cities)
│       ├── RankedLocationList
│       └── ViewAllButton
│
├── InsightsCarousel
│   ├── InsightCard[]
│   └── NavigationDots
│
├── FormatPerformanceSection
│   ├── SectionHeader
│   ├── RegionSelector
│   └── FormatComparisonChart
│
└── DetailedBreakdownTable
    ├── TableFilters
    ├── DataTable
    └── Pagination
```

### 5.2 UI Mockup Specifications

#### 5.2.1 Key Metric Cards

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  │ 🌍 TOP COUNTRY  │  │ 🏙️ TOP CITY     │  │ 🚀 EMERGING     │  │ 🌐 GLOBAL REACH │
│  │                 │  │                 │  │                 │  │                 │
│  │ 🇺🇸 United States│  │ Los Angeles     │  │ São Paulo       │  │ 47 Countries    │
│  │    45.2K        │  │    9.8K         │  │    ↑ 156%       │  │ 234 Cities      │
│  │    ↑ 12%        │  │    ↑ 24%        │  │    2.1K → 5.4K  │  │ ↑ 8 new         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 Engagement Map + Top Locations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────┐  ┌───────────────────────┐│
│  │                                             │  │ WHERE YOUR CONTENT    ││
│  │           🗺️ ENGAGEMENT MAP                 │  │ HITS THE HARDEST      ││
│  │                                             │  │                       ││
│  │    ┌──────────────────────────────────┐    │  │ Countries  Cities     ││
│  │    │                                  │    │  │ ──────────────────    ││
│  │    │     ○                            │    │  │                       ││
│  │    │        ●                    ○    │    │  │ 1. 🇺🇸 United States  ││
│  │    │           ○     ●               │    │  │    45.2K  ↑12%        ││
│  │    │              ●     ○            │    │  │                       ││
│  │    │                 ○               │    │  │ 2. 🇬🇧 United Kingdom ││
│  │    │        ○           ●            │    │  │    18.9K  ↑8%         ││
│  │    │                        ○        │    │  │                       ││
│  │    │                                  │    │  │ 3. 🇨🇦 Canada        ││
│  │    │        ○                        │    │  │    12.4K  ↑15%        ││
│  │    │              ○                  │    │  │                       ││
│  │    └──────────────────────────────────┘    │  │ 4. 🇦🇺 Australia     ││
│  │                                             │  │    8.7K   ↑22%       ││
│  │    ○ Low   ● Medium   ● High               │  │                       ││
│  │                                             │  │ 5. 🇩🇪 Germany       ││
│  │    [ Zoom + ] [ Zoom - ] [ Reset ]         │  │    6.2K   ↑5%        ││
│  │                                             │  │                       ││
│  └─────────────────────────────────────────────┘  │ [View All →]         ││
│                                                   └───────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.3 AI Insights Carousel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  💡 LOCATION INSIGHTS                                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  🎯 ACTIONABLE INSIGHT                                              │   │
│  │                                                                     │   │
│  │  "Your carousel posts get 34% more saves in London compared to     │   │
│  │   your global average. Consider creating more carousel content     │   │
│  │   for your UK audience."                                           │   │
│  │                                                                     │   │
│  │  📊 London Carousel Saves: 8.2%  |  Global Average: 6.1%           │   │
│  │                                                                     │   │
│  │  [Create Carousel for UK →]                                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                              ● ○ ○ ○ ○                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.4 Format Performance by Region

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📊 TOP PERFORMING FORMATS BY REGION                                        │
│                                                                             │
│  Region: [ California ▼ ]                                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   Carousel      ████████████████████████████  12.4%  (Best)        │   │
│  │                                                                     │   │
│  │   Video Clip    ████████████████████         8.9%                  │   │
│  │                                                                     │   │
│  │   Reel          ███████████████████          8.5%                  │   │
│  │                                                                     │   │
│  │   Quote Card    ██████████████               6.2%                  │   │
│  │                                                                     │   │
│  │   Thread        ████████████                 5.4%                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  💡 Carousels outperform video clips by 39% in this region                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.5 Top Cities Widget Card

```
┌─────────────────────────────────────────────┐
│                                             │
│  🏙️ TOP CITIES ENGAGING WITH YOU THIS WEEK │
│                                             │
│  1. Los Angeles, CA      9.8K    ↑ 24%     │
│     ████████████████████████████████        │
│                                             │
│  2. London, UK           7.2K    ↑ 15%     │
│     ██████████████████████████              │
│                                             │
│  3. New York, NY         6.9K    ↑ 9%      │
│     █████████████████████████               │
│                                             │
│  4. Toronto, CA          4.5K    ↑ 31%     │
│     █████████████████                       │
│                                             │
│  5. Sydney, AU           3.8K    ↑ 18%     │
│     ██████████████                          │
│                                             │
│  [See All Cities →]                         │
│                                             │
└─────────────────────────────────────────────┘
```

### 5.3 React Component Code

```tsx
// app/analytics/location/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePlan } from '@/app/context/PlanContext';
import { LocationMap } from './components/LocationMap';
import { TopLocationsPanel } from './components/TopLocationsPanel';
import { InsightsCarousel } from './components/InsightsCarousel';
import { FormatPerformanceChart } from './components/FormatPerformanceChart';
import { MetricCard } from './components/MetricCard';

type Period = '7d' | '30d' | '90d' | '365d';

interface LocationMetrics {
  topCountry: { name: string; code: string; engagement: number; change: number };
  topCity: { name: string; country: string; engagement: number; change: number };
  emergingRegion: { name: string; growth: number; previous: number; current: number };
  globalReach: { countries: number; cities: number; newThisPeriod: number };
}

export default function LocationAnalyticsPage() {
  const { currentPlan } = usePlan();
  const [period, setPeriod] = useState<Period>('30d');
  const [metrics, setMetrics] = useState<LocationMetrics | null>(null);
  const [mapData, setMapData] = useState(null);
  const [topLocations, setTopLocations] = useState([]);
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLocationData();
  }, [period]);

  const fetchLocationData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, mapRes, locationsRes, insightsRes] = await Promise.all([
        fetch(`/api/analytics/location-metrics?period=${period}`),
        fetch(`/api/analytics/location-map-data?period=${period}`),
        fetch(`/api/analytics/top-locations?period=${period}&limit=10`),
        fetch(`/api/analytics/location-insights?period=${period}`)
      ]);

      setMetrics(await metricsRes.json());
      setMapData(await mapRes.json());
      setTopLocations((await locationsRes.json()).data.rankings);
      setInsights((await insightsRes.json()).data.insights);
    } catch (error) {
      console.error('Failed to fetch location data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Pro plan check for advanced features
  const isPro = currentPlan === 'pro';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <nav className="text-sm text-gray-500 mb-1">
                Dashboard / Analytics / <span className="text-gray-900">Location</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">
                Location of Engagement
              </h1>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2">
              {(['7d', '30d', '90d', '365d'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon="🌍"
            label="Top Country"
            value={metrics?.topCountry.name || '-'}
            subValue={`${formatNumber(metrics?.topCountry.engagement || 0)} engagement`}
            change={metrics?.topCountry.change || 0}
            flag={getFlagEmoji(metrics?.topCountry.code || '')}
          />
          <MetricCard
            icon="🏙️"
            label="Top City"
            value={metrics?.topCity.name || '-'}
            subValue={`${formatNumber(metrics?.topCity.engagement || 0)} engagement`}
            change={metrics?.topCity.change || 0}
          />
          <MetricCard
            icon="🚀"
            label="Emerging Region"
            value={metrics?.emergingRegion.name || '-'}
            subValue={`${formatNumber(metrics?.emergingRegion.previous || 0)} → ${formatNumber(metrics?.emergingRegion.current || 0)}`}
            change={metrics?.emergingRegion.growth || 0}
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
          {/* Map - 3/5 width */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Engagement Map
            </h2>
            <LocationMap
              data={mapData}
              isLoading={isLoading}
              onLocationClick={(location) => console.log('Clicked:', location)}
            />
          </div>

          {/* Top Locations - 2/5 width */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Where Your Content Hits the Hardest
            </h2>
            <TopLocationsPanel
              locations={topLocations}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* AI Insights Carousel - Pro Only */}
        {isPro && insights.length > 0 && (
          <div className="mb-8">
            <InsightsCarousel insights={insights} />
          </div>
        )}

        {/* Pro Upgrade CTA for Creator Plan */}
        {!isPro && (
          <div className="mb-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">
                  Unlock AI-Powered Location Insights
                </h3>
                <p className="text-purple-100">
                  Get actionable recommendations, emerging market detection, and format optimization by region.
                </p>
              </div>
              <button className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}

        {/* Format Performance by Region */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performing Formats by Region
          </h2>
          <FormatPerformanceChart period={period} />
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Detailed Location Breakdown
          </h2>
          <LocationBreakdownTable period={period} />
        </div>
      </main>
    </div>
  );
}

// Utility functions
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
```

---

## 6. Insights & Intelligence Engine

### 6.1 Insight Types

| Insight Type | Trigger Condition | Priority |
|--------------|-------------------|----------|
| `emerging_region` | Region growth > 100% WoW | 90 |
| `declining_region` | Region decline > 50% WoW | 85 |
| `format_outperformer` | Format rate > 30% above average in region | 80 |
| `untapped_potential` | High views, low engagement in region | 75 |
| `timing_opportunity` | Engagement spikes at specific times by region | 70 |
| `cross_platform_variance` | Platform performance differs >50% by region | 65 |

### 6.2 Insight Generation Logic

```typescript
// server/services/locationInsightsService.js

const INSIGHT_RULES = [
  {
    type: 'emerging_region',
    title: '🚀 Emerging Audience Region',
    check: (current, previous) => {
      const growth = ((current - previous) / previous) * 100;
      return growth > 100;
    },
    generateMessage: (location, metrics) => {
      const growth = Math.round(metrics.growthPercent);
      return `Your audience in ${location.name} has grown ${growth}% this week. ` +
             `Consider creating localized content for this emerging market.`;
    },
    priority: 90
  },

  {
    type: 'format_outperformer',
    title: '📊 Format Sweet Spot Detected',
    check: (formatRate, globalAvg) => {
      return formatRate > globalAvg * 1.3; // 30% above average
    },
    generateMessage: (location, format, metrics) => {
      const diff = Math.round((metrics.rate / metrics.globalAvg - 1) * 100);
      return `Your ${format} posts get ${diff}% more ${metrics.metric} in ${location.name} ` +
             `compared to your global average. Double down on this format for your ${location.name} audience.`;
    },
    priority: 80
  },

  {
    type: 'untapped_potential',
    title: '💎 Untapped Engagement Potential',
    check: (views, engagement, avgRate) => {
      const rate = (engagement / views) * 100;
      return views > 10000 && rate < avgRate * 0.5; // High views, low engagement
    },
    generateMessage: (location, metrics) => {
      return `${location.name} has high viewership (${formatNumber(metrics.views)}) ` +
             `but below-average engagement. Try more interactive content ` +
             `(polls, questions, carousels) to boost engagement in this region.`;
    },
    priority: 75
  },

  {
    type: 'geographic_content_match',
    title: '🎯 Geographic Content Match',
    check: (topicPerformance, location) => {
      return topicPerformance.relevanceScore > 0.8;
    },
    generateMessage: (location, topic, metrics) => {
      return `Content about "${topic}" performs ${Math.round(metrics.lift * 100)}% better ` +
             `in ${location.name}. Consider creating more ${topic}-focused content for this audience.`;
    },
    priority: 72
  }
];

async function generateInsights(userId, period = '7d') {
  const insights = [];

  // Fetch required data
  const currentStats = await getAggregatedStats(userId, period);
  const previousStats = await getAggregatedStats(userId, getPreviousPeriod(period));
  const globalAverages = calculateGlobalAverages(currentStats);

  // Check each location against each rule
  for (const location of currentStats.locations) {
    for (const rule of INSIGHT_RULES) {
      const previousLocation = findLocation(previousStats, location.id);

      if (rule.type === 'emerging_region') {
        if (previousLocation && rule.check(location.engagement, previousLocation.engagement)) {
          insights.push({
            type: rule.type,
            title: rule.title,
            message: rule.generateMessage(location, {
              growthPercent: ((location.engagement - previousLocation.engagement) / previousLocation.engagement) * 100
            }),
            locationId: location.id,
            priority: rule.priority,
            metrics: {
              current: location.engagement,
              previous: previousLocation.engagement
            }
          });
        }
      }

      if (rule.type === 'format_outperformer') {
        for (const format of location.formats) {
          const globalFormatAvg = globalAverages.formats[format.id]?.rate || 0;
          if (rule.check(format.engagementRate, globalFormatAvg)) {
            insights.push({
              type: rule.type,
              title: rule.title,
              message: rule.generateMessage(location, format.name, {
                rate: format.engagementRate,
                globalAvg: globalFormatAvg,
                metric: 'engagement'
              }),
              locationId: location.id,
              formatId: format.id,
              priority: rule.priority
            });
          }
        }
      }
    }
  }

  // Sort by priority and deduplicate
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10); // Return top 10 insights
}

module.exports = { generateInsights, INSIGHT_RULES };
```

### 6.3 Insight Storage & Lifecycle

```typescript
// Insight validity and lifecycle management
interface InsightLifecycle {
  // New insights generated daily
  generationSchedule: '0 3 * * *'; // 3 AM UTC daily

  // Insights valid for 7 days by default
  defaultValidityDays: 7;

  // High-priority insights extend validity
  priorityExtension: {
    90: 14, // 2 weeks for highest priority
    80: 10,
    70: 7
  };

  // Auto-dismiss conditions
  autoDismiss: [
    'user_acted_on_insight',      // User created content for region
    'metrics_changed_direction',   // Trend reversed
    'validity_expired'             // Past valid_until date
  ];
}
```

---

## 7. Privacy & Compliance

### 7.1 Data Minimization Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA HANDLING HIERARCHY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ NEVER STORE                                                  │
│  ├── Individual user IP addresses                               │
│  ├── Precise GPS coordinates of individuals                     │
│  ├── Device identifiers linked to location                      │
│  └── Personal names/emails with location data                   │
│                                                                  │
│  ✅ ONLY STORE (Aggregated)                                     │
│  ├── Country-level totals (min 100 users per bucket)           │
│  ├── Region-level totals (min 50 users per bucket)             │
│  ├── City-level totals (min 25 users per bucket)               │
│  └── Pre-aggregated metrics from platform APIs                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 K-Anonymity Implementation

```typescript
// server/services/privacyService.js

const ANONYMITY_THRESHOLDS = {
  country: 100,  // Minimum 100 users to show country data
  region: 50,    // Minimum 50 users to show region data
  city: 25       // Minimum 25 users to show city data
};

function applyKAnonymity(locationData, granularity) {
  const threshold = ANONYMITY_THRESHOLDS[granularity];

  return locationData.filter(location => {
    // Check if location meets minimum audience threshold
    if (location.uniqueAudienceCount < threshold) {
      // Roll up to parent geography
      return rollUpToParent(location, granularity);
    }
    return location;
  });
}

function rollUpToParent(location, currentGranularity) {
  const hierarchy = {
    city: 'region',
    region: 'country',
    country: null // Cannot roll up further
  };

  const parentGranularity = hierarchy[currentGranularity];

  if (!parentGranularity) {
    // Cannot show this data - below threshold at country level
    return null;
  }

  // Aggregate into parent location
  return {
    ...location,
    granularity: parentGranularity,
    cityName: parentGranularity === 'country' ? null : location.cityName,
    regionName: parentGranularity === 'country' ? null : location.regionName,
    isRolledUp: true
  };
}
```

### 7.3 GDPR Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| **Lawful Basis** | Legitimate interest for analytics; consent for detailed tracking |
| **Data Minimization** | Only aggregate metrics; no PII stored |
| **Purpose Limitation** | Data used only for creator analytics dashboard |
| **Storage Limitation** | Raw events: 90 days; Aggregated: 2 years |
| **Right to Erasure** | Cascade delete on user account deletion |
| **Right to Access** | Export endpoint for user's own data |
| **Data Portability** | JSON/CSV export of analytics |
| **Privacy by Design** | K-anonymity, aggregation-first architecture |

### 7.4 CCPA Compliance

```typescript
// Data handling for California users
interface CCPACompliance {
  // Do Not Sell flag
  doNotSell: boolean;

  // Categories of data collected
  dataCategories: [
    'Geolocation data (aggregated)',
    'Internet activity (engagement metrics)'
  ];

  // Disclosure requirements
  disclosure: {
    collectPurpose: 'Provide analytics about content engagement by location',
    businessPurpose: 'Improve content strategy and audience understanding',
    thirdPartySharing: false // No third-party sharing of location data
  };

  // User rights implementation
  rights: {
    access: '/api/user/data-export',
    deletion: '/api/user/delete-account',
    optOut: '/api/user/privacy-settings'
  };
}
```

### 7.5 Data Retention Policy

```sql
-- Automated data retention enforcement
CREATE OR REPLACE FUNCTION enforce_data_retention()
RETURNS void AS $$
BEGIN
  -- Delete raw events older than 90 days
  DELETE FROM engagement_events
  WHERE recorded_at < NOW() - INTERVAL '90 days';

  -- Delete daily aggregates older than 2 years
  DELETE FROM aggregated_stats_daily
  WHERE date < CURRENT_DATE - INTERVAL '2 years';

  -- Archive insights older than 1 year
  UPDATE location_insights
  SET is_archived = true
  WHERE created_at < NOW() - INTERVAL '1 year';

  -- Log retention enforcement
  INSERT INTO audit_log (action, details, executed_at)
  VALUES ('data_retention_enforcement',
          json_build_object(
            'events_deleted', (SELECT COUNT(*) FROM engagement_events WHERE recorded_at < NOW() - INTERVAL '90 days'),
            'stats_deleted', (SELECT COUNT(*) FROM aggregated_stats_daily WHERE date < CURRENT_DATE - INTERVAL '2 years')
          ),
          NOW());
END;
$$ LANGUAGE plpgsql;

-- Schedule daily at 4 AM UTC
-- pg_cron: SELECT cron.schedule('0 4 * * *', 'SELECT enforce_data_retention()');
```

---

## 8. Implementation Code Examples

### 8.1 Backend Service Implementation

```javascript
// server/services/locationAnalyticsService.js

const geoData = require('../data/geo_locations.json');
const { normalizeLocation } = require('./geoNormalizationService');

class LocationAnalyticsService {
  constructor() {
    this.engagementWeights = {
      views: 1.0,
      likes: 2.0,
      comments: 3.0,
      shares: 4.0,
      saves: 3.5
    };
  }

  /**
   * Get engagement metrics grouped by location
   */
  async getEngagementByLocation(userId, options = {}) {
    const {
      granularity = 'country',
      period = '30d',
      platform = 'all',
      format = 'all',
      limit = 50,
      offset = 0
    } = options;

    const periodDays = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // In production, this would query the database
    // For now, we'll use aggregated stats from JSON storage
    const stats = await this.loadAggregatedStats(userId);

    // Filter by date range
    const filteredStats = stats.filter(stat =>
      new Date(stat.date) >= startDate
    );

    // Apply platform filter
    const platformFiltered = platform === 'all'
      ? filteredStats
      : filteredStats.filter(s => s.platform === platform);

    // Apply format filter
    const formatFiltered = format === 'all'
      ? platformFiltered
      : platformFiltered.filter(s => s.formatType === format);

    // Aggregate by location granularity
    const locationMap = new Map();

    for (const stat of formatFiltered) {
      const location = await this.getLocation(stat.geoLocationId);
      const key = this.getLocationKey(location, granularity);

      if (!locationMap.has(key)) {
        locationMap.set(key, {
          locationId: stat.geoLocationId,
          ...this.getLocationFields(location, granularity),
          metrics: this.initializeMetrics(),
          contentCount: 0
        });
      }

      const entry = locationMap.get(key);
      entry.metrics.views += stat.totalViews;
      entry.metrics.likes += stat.totalLikes;
      entry.metrics.comments += stat.totalComments;
      entry.metrics.shares += stat.totalShares;
      entry.metrics.saves += stat.totalSaves;
      entry.contentCount += stat.contentCount;
    }

    // Calculate derived metrics
    const locations = Array.from(locationMap.values()).map(loc => ({
      ...loc,
      metrics: {
        ...loc.metrics,
        totalEngagement: this.calculateTotalEngagement(loc.metrics),
        engagementRate: this.calculateEngagementRate(loc.metrics),
        weightedScore: this.calculateWeightedScore(loc.metrics)
      },
      trend: await this.calculateTrend(userId, loc.locationId, period)
    }));

    // Sort by weighted score
    locations.sort((a, b) => b.metrics.weightedScore - a.metrics.weightedScore);

    // Apply pagination
    const paginated = locations.slice(offset, offset + limit);

    // Calculate totals
    const totals = this.calculateTotals(locations);

    return {
      locations: paginated,
      totals,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      meta: {
        total: locations.length,
        limit,
        offset,
        hasMore: offset + limit < locations.length
      }
    };
  }

  /**
   * Get top performing locations
   */
  async getTopLocations(userId, options = {}) {
    const {
      metric = 'engagement',
      period = '7d',
      limit = 10,
      granularity = 'city'
    } = options;

    const data = await this.getEngagementByLocation(userId, {
      granularity,
      period,
      limit
    });

    // Sort by requested metric
    const sortedLocations = [...data.locations].sort((a, b) => {
      switch (metric) {
        case 'engagement':
          return b.metrics.totalEngagement - a.metrics.totalEngagement;
        case 'views':
          return b.metrics.views - a.metrics.views;
        case 'engagement_rate':
          return b.metrics.engagementRate - a.metrics.engagementRate;
        case 'growth':
          return b.trend.changePercent - a.trend.changePercent;
        default:
          return b.metrics.weightedScore - a.metrics.weightedScore;
      }
    });

    return {
      rankings: sortedLocations.slice(0, limit).map((loc, index) => ({
        rank: index + 1,
        location: {
          id: loc.locationId,
          name: this.formatLocationName(loc),
          countryCode: loc.countryCode,
          flag: this.getCountryFlag(loc.countryCode)
        },
        metric: {
          name: metric,
          value: this.getMetricValue(loc, metric),
          formattedValue: this.formatMetricValue(loc, metric)
        },
        change: {
          value: loc.trend.changePercent,
          direction: loc.trend.direction
        }
      })),
      period: {
        label: this.formatPeriodLabel(period),
        ...data.period
      }
    };
  }

  /**
   * Get format performance by location
   */
  async getFormatPerformanceByLocation(userId, options = {}) {
    const {
      period = '30d',
      country = null,
      region = null
    } = options;

    const stats = await this.loadAggregatedStats(userId);
    const periodDays = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Filter and group
    const filtered = stats.filter(stat => {
      if (new Date(stat.date) < startDate) return false;
      if (country && stat.countryCode !== country) return false;
      if (region && stat.regionCode !== region) return false;
      return true;
    });

    // Group by location and format
    const locationFormatMap = new Map();

    for (const stat of filtered) {
      const locationKey = `${stat.countryCode}_${stat.regionCode || 'all'}`;

      if (!locationFormatMap.has(locationKey)) {
        locationFormatMap.set(locationKey, {
          location: {
            id: stat.geoLocationId,
            name: stat.regionName || stat.countryName,
            countryCode: stat.countryCode
          },
          formats: new Map()
        });
      }

      const locEntry = locationFormatMap.get(locationKey);

      if (!locEntry.formats.has(stat.formatType)) {
        locEntry.formats.set(stat.formatType, {
          formatId: stat.formatType,
          formatName: this.formatTypeName(stat.formatType),
          category: this.formatCategory(stat.formatType),
          totalEngagement: 0,
          totalViews: 0,
          contentCount: 0
        });
      }

      const formatEntry = locEntry.formats.get(stat.formatType);
      formatEntry.totalEngagement += stat.totalEngagement;
      formatEntry.totalViews += stat.totalViews;
      formatEntry.contentCount += stat.contentCount;
    }

    // Calculate engagement rates and find top performers
    const comparison = Array.from(locationFormatMap.values()).map(loc => {
      const formats = Array.from(loc.formats.values())
        .map(fmt => ({
          ...fmt,
          engagementRate: fmt.totalViews > 0
            ? (fmt.totalEngagement / fmt.totalViews) * 100
            : 0
        }))
        .sort((a, b) => b.engagementRate - a.engagementRate);

      const topFormat = formats[0];
      const secondFormat = formats[1];

      return {
        location: loc.location,
        formats: formats.map((fmt, idx) => ({
          ...fmt,
          isTopPerformer: idx === 0
        })),
        insight: topFormat && secondFormat
          ? this.generateFormatInsight(loc.location, topFormat, secondFormat)
          : null
      };
    });

    return {
      comparison,
      summary: {
        topFormatOverall: this.findOverallTopFormat(comparison),
        totalLocationsAnalyzed: comparison.length,
        dataPoints: filtered.length
      }
    };
  }

  /**
   * Ingest engagement events from platforms
   */
  async ingestEvents(source, events, syncId = null) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    for (const event of events) {
      try {
        // Normalize geo data
        const normalizedLocation = await normalizeLocation(
          event.geoData,
          source
        );

        // Find or create location record
        const locationId = await this.ensureLocation(normalizedLocation);

        // Find or create content item
        const contentItemId = await this.ensureContentItem(
          event.contentId,
          source
        );

        // Store engagement event
        const isNew = await this.storeEngagementEvent({
          contentItemId,
          geoLocationId: locationId,
          platform: source,
          metrics: event.metrics,
          periodStart: event.periodStart,
          periodEnd: event.periodEnd
        });

        results.processed++;
        if (isNew) {
          results.created++;
        } else {
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          contentId: event.contentId,
          error: error.message
        });
      }
    }

    // Trigger aggregation if significant data ingested
    if (results.created > 100) {
      this.scheduleAggregation();
    }

    return { ...results, syncId };
  }

  /**
   * Get map-optimized GeoJSON data
   */
  async getMapData(userId, options = {}) {
    const { period = '30d', metric = 'engagement' } = options;

    const data = await this.getEngagementByLocation(userId, {
      granularity: 'city',
      period,
      limit: 500
    });

    const maxValue = Math.max(...data.locations.map(l =>
      this.getMetricValue(l, metric)
    ));

    const features = data.locations
      .filter(loc => loc.latitude && loc.longitude)
      .map(loc => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [loc.longitude, loc.latitude]
        },
        properties: {
          locationId: loc.locationId,
          name: loc.cityName || loc.regionName || loc.countryName,
          country: loc.countryCode,
          engagement: loc.metrics.totalEngagement,
          intensity: maxValue > 0
            ? this.getMetricValue(loc, metric) / maxValue
            : 0,
          radius: this.calculateMarkerRadius(loc, maxValue)
        }
      }));

    return {
      type: 'FeatureCollection',
      features,
      bounds: this.calculateBounds(features),
      maxEngagement: maxValue,
      totalLocations: features.length
    };
  }

  // Helper methods
  parsePeriod(period) {
    const match = period.match(/(\d+)([dwmy])/);
    if (!match) return 30;
    const [, num, unit] = match;
    const multipliers = { d: 1, w: 7, m: 30, y: 365 };
    return parseInt(num) * (multipliers[unit] || 1);
  }

  calculateWeightedScore(metrics) {
    return Object.entries(this.engagementWeights).reduce((sum, [key, weight]) => {
      return sum + (metrics[key] || 0) * weight;
    }, 0);
  }

  calculateEngagementRate(metrics) {
    if (!metrics.views || metrics.views === 0) return 0;
    const engagement = metrics.likes + metrics.comments + metrics.shares + metrics.saves;
    return (engagement / metrics.views) * 100;
  }

  calculateTotalEngagement(metrics) {
    return metrics.likes + metrics.comments + metrics.shares + metrics.saves;
  }

  getCountryFlag(countryCode) {
    if (!countryCode) return '';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  formatLocationName(location) {
    const parts = [location.cityName, location.regionName, location.countryName]
      .filter(Boolean);
    return parts.slice(0, 2).join(', ');
  }

  generateFormatInsight(location, topFormat, secondFormat) {
    const diff = Math.round(
      ((topFormat.engagementRate - secondFormat.engagementRate) /
       secondFormat.engagementRate) * 100
    );
    return `${topFormat.formatName} posts outperform ${secondFormat.formatName} ` +
           `by ${diff}% in ${location.name}.`;
  }
}

module.exports = new LocationAnalyticsService();
```

### 8.2 API Route Implementation

```javascript
// server/routes/locationAnalytics.js

const express = require('express');
const router = express.Router();
const locationAnalyticsService = require('../services/locationAnalyticsService');
const { authenticateToken } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validation');

/**
 * GET /api/analytics/engagement-by-location
 */
router.get('/engagement-by-location',
  authenticateToken,
  validateQuery({
    granularity: { type: 'string', enum: ['country', 'region', 'city'] },
    period: { type: 'string', pattern: /^\d+[dwmy]$/ },
    platform: { type: 'string' },
    format: { type: 'string' },
    limit: { type: 'number', min: 1, max: 100 },
    offset: { type: 'number', min: 0 }
  }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const data = await locationAnalyticsService.getEngagementByLocation(
        userId,
        req.query
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching engagement by location:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch location analytics'
      });
    }
  }
);

/**
 * GET /api/analytics/top-locations
 */
router.get('/top-locations',
  authenticateToken,
  validateQuery({
    metric: { type: 'string', enum: ['engagement', 'views', 'engagement_rate', 'growth'] },
    period: { type: 'string' },
    limit: { type: 'number', min: 1, max: 50 },
    granularity: { type: 'string', enum: ['country', 'region', 'city'] }
  }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const data = await locationAnalyticsService.getTopLocations(
        userId,
        req.query
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching top locations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top locations'
      });
    }
  }
);

/**
 * GET /api/analytics/location-performance-by-format
 */
router.get('/location-performance-by-format',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const data = await locationAnalyticsService.getFormatPerformanceByLocation(
        userId,
        req.query
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching format performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch format performance by location'
      });
    }
  }
);

/**
 * POST /api/analytics/ingest-events
 */
router.post('/ingest-events',
  authenticateToken,
  async (req, res) => {
    try {
      const { source, events, syncId } = req.body;

      if (!source || !events || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body. Required: source (string), events (array)'
        });
      }

      const result = await locationAnalyticsService.ingestEvents(
        source,
        events,
        syncId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error ingesting events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to ingest events'
      });
    }
  }
);

/**
 * GET /api/analytics/location-map-data
 */
router.get('/location-map-data',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const data = await locationAnalyticsService.getMapData(
        userId,
        req.query
      );

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching map data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch map data'
      });
    }
  }
);

module.exports = router;
```

### 8.3 Map Component Implementation

```tsx
// app/analytics/location/components/LocationMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface MapDataPoint {
  locationId: string;
  name: string;
  country: string;
  engagement: number;
  intensity: number;
  coordinates: [number, number];
}

interface LocationMapProps {
  data: {
    features: Array<{
      geometry: { coordinates: [number, number] };
      properties: MapDataPoint;
    }>;
    maxEngagement: number;
  } | null;
  isLoading: boolean;
  onLocationClick?: (location: MapDataPoint) => void;
}

export function LocationMap({ data, isLoading, onLocationClick }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapDataPoint | null>(null);

  // Simple SVG-based world map for demonstration
  // In production, use Mapbox GL JS or Leaflet

  if (isLoading) {
    return (
      <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading map data...</div>
      </div>
    );
  }

  if (!data || !data.features.length) {
    return (
      <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No location data yet</p>
          <p className="text-sm mt-1">Connect your social accounts to see engagement by location</p>
        </div>
      </div>
    );
  }

  // Convert geo coordinates to SVG position
  const geoToSvg = (lon: number, lat: number): { x: number; y: number } => {
    // Simple equirectangular projection
    const x = ((lon + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  const getMarkerColor = (intensity: number): string => {
    if (intensity > 0.8) return '#7C3AED'; // Purple - high
    if (intensity > 0.5) return '#3B82F6'; // Blue - medium
    if (intensity > 0.2) return '#10B981'; // Green - low-medium
    return '#6B7280'; // Gray - low
  };

  const getMarkerRadius = (intensity: number): number => {
    return Math.max(6, Math.min(24, intensity * 24));
  };

  return (
    <div className="relative">
      <svg
        viewBox="0 0 800 400"
        className="w-full h-96 bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl"
      >
        {/* Simple world outline - would use actual GeoJSON in production */}
        <rect x="0" y="0" width="800" height="400" fill="#E0F2FE" />

        {/* Continental shapes placeholder */}
        <ellipse cx="200" cy="180" rx="100" ry="60" fill="#D1FAE5" opacity="0.5" />
        <ellipse cx="400" cy="150" rx="80" ry="70" fill="#D1FAE5" opacity="0.5" />
        <ellipse cx="550" cy="180" rx="120" ry="80" fill="#D1FAE5" opacity="0.5" />
        <ellipse cx="650" cy="280" rx="60" ry="40" fill="#D1FAE5" opacity="0.5" />

        {/* Engagement markers */}
        {data.features.map((feature, index) => {
          const { coordinates } = feature.geometry;
          const props = feature.properties;
          const pos = geoToSvg(coordinates[0], coordinates[1]);
          const radius = getMarkerRadius(props.intensity);
          const color = getMarkerColor(props.intensity);

          return (
            <g key={props.locationId || index}>
              {/* Pulse animation for high-engagement locations */}
              {props.intensity > 0.7 && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={color}
                  opacity="0.3"
                  className="animate-ping"
                />
              )}

              {/* Main marker */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={color}
                opacity="0.8"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-100 transition-opacity"
                onClick={() => {
                  setSelectedLocation(props);
                  onLocationClick?.(props);
                }}
              />

              {/* Label for high-engagement locations */}
              {props.intensity > 0.6 && (
                <text
                  x={pos.x}
                  y={pos.y - radius - 8}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {props.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
        <div className="text-xs font-medium text-gray-700 mb-2">Engagement Level</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-600">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-purple-600" />
            <span className="text-xs text-gray-600">Hotspot</span>
          </div>
        </div>
      </div>

      {/* Selected location tooltip */}
      {selectedLocation && (
        <div className="absolute top-4 right-4 bg-white rounded-lg px-4 py-3 shadow-lg max-w-xs">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-gray-900">{selectedLocation.name}</div>
              <div className="text-sm text-gray-500">{selectedLocation.country}</div>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-2xl font-bold text-purple-600">
              {selectedLocation.engagement.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">total engagement</div>
          </div>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors">
          <span className="text-lg">+</span>
        </button>
        <button className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors">
          <span className="text-lg">−</span>
        </button>
        <button className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors text-xs">
          Reset
        </button>
      </div>
    </div>
  );
}
```

---

## 9. Performance & Scaling Considerations

### 9.1 Query Optimization Strategies

```sql
-- Materialized view for fast dashboard queries
CREATE MATERIALIZED VIEW mv_location_engagement_summary AS
SELECT
  s.user_id,
  g.country_code,
  g.country_name,
  g.region_name,
  g.city_name,
  g.latitude,
  g.longitude,
  SUM(s.total_engagement) as total_engagement,
  SUM(s.total_views) as total_views,
  AVG(s.engagement_rate) as avg_engagement_rate,
  COUNT(DISTINCT s.date) as active_days,
  MAX(s.date) as last_activity
FROM aggregated_stats_daily s
JOIN geo_locations g ON s.geo_location_id = g.id
WHERE s.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY s.user_id, g.country_code, g.country_name, g.region_name,
         g.city_name, g.latitude, g.longitude;

-- Refresh strategy: every hour during business hours
CREATE INDEX idx_mv_location_user ON mv_location_engagement_summary(user_id);
CREATE INDEX idx_mv_location_engagement ON mv_location_engagement_summary(total_engagement DESC);

-- Refresh command (scheduled via pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_location_engagement_summary;
```

### 9.2 Caching Strategy

```typescript
// Redis caching layer
const CACHE_TTL = {
  topLocations: 300,        // 5 minutes
  engagementByLocation: 600, // 10 minutes
  mapData: 900,             // 15 minutes
  insights: 3600            // 1 hour
};

async function getCachedOrFetch<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}

// Usage
async function getTopLocations(userId: string, options: Options) {
  const cacheKey = `loc:top:${userId}:${hash(options)}`;

  return getCachedOrFetch(
    cacheKey,
    CACHE_TTL.topLocations,
    () => locationAnalyticsService.getTopLocations(userId, options)
  );
}
```

### 9.3 Recommended Storage Format

| Data Type | Recommended Format | Rationale |
|-----------|-------------------|-----------|
| Raw events | TimescaleDB hypertable | Automatic partitioning, compression |
| Aggregated stats | PostgreSQL with BRIN index | Efficient for time-range queries |
| Map data | GeoJSON in Redis | Fast retrieval for visualization |
| Insights | PostgreSQL JSONB | Flexible schema for varied insight types |
| Location reference | PostgreSQL with GiST index | Spatial queries support |

### 9.4 Estimated Query Performance

| Query Type | Cold | Warm (Cached) | Target |
|------------|------|---------------|--------|
| Top 10 locations | 150ms | 15ms | <200ms |
| Engagement by location (50 rows) | 300ms | 25ms | <500ms |
| Map GeoJSON (500 points) | 200ms | 20ms | <300ms |
| Format by region comparison | 400ms | 30ms | <500ms |

---

## 10. Appendix

### 10.1 ISO 3166-1 Country Code Reference

Common countries for social media analytics:

| Code | Country | Continent |
|------|---------|-----------|
| US | United States | NA |
| GB | United Kingdom | EU |
| CA | Canada | NA |
| AU | Australia | OC |
| DE | Germany | EU |
| FR | France | EU |
| BR | Brazil | SA |
| IN | India | AS |
| JP | Japan | AS |
| MX | Mexico | NA |

### 10.2 Format Type Categories

| Format ID | Display Name | Category | Platforms |
|-----------|--------------|----------|-----------|
| video_clip | Video Clip | video | All |
| carousel | Carousel | image | IG, LinkedIn, X |
| quote_card | Quote Card | image | All |
| reel | Reel/Short | video | IG, TikTok, YT |
| thread | Thread | text | X, LinkedIn |
| story | Story | image | IG, TikTok |

### 10.3 Migration Path (JSON → PostgreSQL)

For transitioning from current JSON storage:

```javascript
// migration/migrateLocationData.js
async function migrateToPostgres() {
  const jsonData = require('../data/location_analytics.json');

  // 1. Migrate geo_locations
  for (const [id, loc] of Object.entries(jsonData.geo_locations)) {
    await db.query(`
      INSERT INTO geo_locations (id, country_code, country_name, region_code,
                                 region_name, city_name, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (country_code, region_code, city_id) DO NOTHING
    `, [id, loc.countryCode, loc.countryName, loc.regionCode,
        loc.regionName, loc.cityName, loc.latitude, loc.longitude]);
  }

  // 2. Migrate engagement events
  for (const event of jsonData.engagement_events) {
    await db.query(`
      INSERT INTO engagement_events (...)
      VALUES (...)
    `, [...]);
  }

  // 3. Run initial aggregation
  await runDailyAggregation();
}
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-31 | ReGen Team | Initial specification |

---

*This document serves as the complete technical specification for implementing Location of Engagement analytics in the ReGen application. For questions or clarifications, refer to the implementation code examples or contact the development team.*
