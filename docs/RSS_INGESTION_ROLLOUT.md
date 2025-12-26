# RSS Ingestion Feature - Rollout Guide

This document outlines the zero-downtime rollout plan for the RSS Feed Ingestion feature.

## Overview

RSS Ingestion allows users to:
- Add RSS feed URLs to automatically ingest content
- View and filter ingested items
- Convert items to content for scheduling/publishing

## Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Verify CRON_SECRET is set in Vercel environment
- [ ] Review RLS policies

## Rollout Steps

### Step 1: Database Migration (Zero Downtime)

Run the migration in Supabase SQL Editor:

```bash
# Option A: Run from Supabase Dashboard
# Go to SQL Editor and paste contents of:
# migrations/add_rss_feeds.sql

# Option B: Run via CLI
psql $DATABASE_URL -f migrations/add_rss_feeds.sql
```

**Verification:**
```sql
-- Check tables exist
SELECT * FROM information_schema.tables
WHERE table_name IN ('rss_feeds', 'rss_feed_items');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('rss_feeds', 'rss_feed_items');
```

### Step 2: Update Prisma Schema & Generate Client

```bash
cd regen-app
npm install rss-parser
npx prisma generate
```

### Step 3: Deploy API Routes & Utilities

Deploy to Vercel (routes will be inactive until UI is ready):

```bash
git add .
git commit -m "Add RSS ingestion API routes and utilities"
git push origin main
```

**Files deployed:**
- `lib/rss/parser.ts` - RSS parsing utility
- `lib/rss/ingestion.ts` - Ingestion job logic
- `lib/rss/index.ts` - Module exports
- `app/api/rss/**/*.ts` - API routes
- `app/api/cron/rss-ingestion/route.ts` - Cron endpoint

### Step 4: Deploy UI

The UI is deployed with the API routes. Verify at `/rss`.

### Step 5: Enable Cron Job

Vercel will automatically pick up the cron configuration from `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/rss-ingestion",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

**Verification:**
```bash
# Check cron is registered in Vercel dashboard
# Settings > Cron Jobs
```

### Step 6: Monitor

After deployment, monitor:

1. **Vercel Logs** - Check for cron job execution
2. **Database** - Verify items are being created
3. **Error rates** - Watch for feed parsing failures

```sql
-- Check feed status
SELECT status, COUNT(*) FROM rss_feeds GROUP BY status;

-- Check recent items
SELECT COUNT(*) FROM rss_feed_items
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check error feeds
SELECT name, url, last_error, error_count
FROM rss_feeds
WHERE status = 'ERROR';
```

## Rollback Plan

If issues occur:

### Quick Disable (No Data Loss)

1. Update `vercel.json` to remove cron job
2. Deploy to disable automatic polling

### Full Rollback

```sql
-- Disable RLS temporarily
ALTER TABLE rss_feed_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds DISABLE ROW LEVEL SECURITY;

-- Drop tables (data loss!)
DROP TABLE IF EXISTS rss_feed_items CASCADE;
DROP TABLE IF EXISTS rss_feeds CASCADE;

-- Drop types
DROP TYPE IF EXISTS rss_item_status;
DROP TYPE IF EXISTS rss_feed_status;
```

## API Reference

### Feeds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rss/feeds` | List user's feeds |
| POST | `/api/rss/feeds` | Add new feed |
| GET | `/api/rss/feeds/[id]` | Get feed details |
| PUT | `/api/rss/feeds/[id]` | Update feed |
| DELETE | `/api/rss/feeds/[id]` | Delete feed |
| POST | `/api/rss/feeds/[id]/refresh` | Manual refresh |

### Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rss/items` | List all items (with filters) |
| PUT | `/api/rss/items` | Bulk update status |
| GET | `/api/rss/feeds/[id]/items` | Items for specific feed |

### Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rss/validate` | Validate feed URL |

## Troubleshooting

### Common RSS Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Feed not updating | URL returns 404/403 | Check URL is accessible |
| Items missing | Feed uses unusual format | Check for Atom vs RSS2 |
| Duplicate items | GUID not unique | System handles via unique constraint |
| Timeout errors | Slow server | Increase timeout or retry later |
| Parse errors | Malformed XML | Contact feed owner |

### Feed Status Meanings

- **ACTIVE**: Feed is being polled normally
- **PAUSED**: User paused the feed
- **ERROR**: 5+ consecutive fetch failures, auto-paused

### Reactivating Error Feeds

```typescript
// Via API
PUT /api/rss/feeds/[id]
{ "status": "ACTIVE" }

// This resets error count and reactivates polling
```

## Security Considerations

1. **URL Validation**: Only HTTP/HTTPS allowed, no localhost/private IPs
2. **RLS**: Users can only access their own feeds/items
3. **Rate Limiting**: Max 50 feeds per user, 50 feeds processed per cron run
4. **Cron Auth**: Protected by CRON_SECRET header

## Performance Notes

- Cron runs every 30 minutes
- Processes up to 50 feeds per run
- Each feed limited to 50 items per fetch
- Feeds not re-fetched within 15 minutes of last fetch
