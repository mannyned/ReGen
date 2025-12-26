-- Migration: Add RSS Feed Ingestion Tables
-- Description: Adds tables for RSS feed subscriptions and ingested items
-- Safe to run multiple times (uses IF NOT EXISTS)

-- ============================================
-- ENUMS
-- ============================================

-- RSS Feed status
DO $$ BEGIN
  CREATE TYPE rss_feed_status AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- RSS Item status
DO $$ BEGIN
  CREATE TYPE rss_item_status AS ENUM ('NEW', 'REVIEWED', 'CONVERTED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- RSS Feeds: User's subscribed RSS feed URLs
CREATE TABLE IF NOT EXISTS rss_feeds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Feed configuration
  name TEXT NOT NULL,
  url TEXT NOT NULL,

  -- Feed metadata (populated after first fetch)
  feed_title TEXT,
  feed_description TEXT,
  feed_image_url TEXT,
  feed_link TEXT,

  -- Status and polling
  status rss_feed_status NOT NULL DEFAULT 'ACTIVE',
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INT NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT rss_feeds_url_unique UNIQUE (profile_id, url)
);

-- RSS Feed Items: Ingested items from feeds
CREATE TABLE IF NOT EXISTS rss_feed_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  feed_id TEXT NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Item content
  guid TEXT NOT NULL,  -- Unique identifier from the feed (link or guid)
  title TEXT NOT NULL,
  link TEXT,
  description TEXT,
  content TEXT,  -- Full content if available
  author TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,

  -- Categories/tags from feed
  categories TEXT[],

  -- Processing status
  status rss_item_status NOT NULL DEFAULT 'NEW',

  -- Reference to created content (if converted)
  content_upload_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate items per feed
  CONSTRAINT rss_feed_items_guid_unique UNIQUE (feed_id, guid)
);

-- ============================================
-- INDEXES
-- ============================================

-- Feed indexes
CREATE INDEX IF NOT EXISTS idx_rss_feeds_profile_id ON rss_feeds(profile_id);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_status ON rss_feeds(status);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_last_fetched ON rss_feeds(last_fetched_at);

-- Item indexes
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed_id ON rss_feed_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_profile_id ON rss_feed_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_status ON rss_feed_items(status);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_published_at ON rss_feed_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_created_at ON rss_feed_items(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feed_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own feeds" ON rss_feeds;
DROP POLICY IF EXISTS "Users can insert their own feeds" ON rss_feeds;
DROP POLICY IF EXISTS "Users can update their own feeds" ON rss_feeds;
DROP POLICY IF EXISTS "Users can delete their own feeds" ON rss_feeds;

DROP POLICY IF EXISTS "Users can view their own feed items" ON rss_feed_items;
DROP POLICY IF EXISTS "Users can update their own feed items" ON rss_feed_items;
DROP POLICY IF EXISTS "Service role can insert feed items" ON rss_feed_items;

-- RLS Policies for rss_feeds
CREATE POLICY "Users can view their own feeds"
  ON rss_feeds FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own feeds"
  ON rss_feeds FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own feeds"
  ON rss_feeds FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own feeds"
  ON rss_feeds FOR DELETE
  USING (auth.uid() = profile_id);

-- RLS Policies for rss_feed_items
CREATE POLICY "Users can view their own feed items"
  ON rss_feed_items FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own feed items"
  ON rss_feed_items FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Service role can insert (for cron job)
-- Note: The cron job uses service role which bypasses RLS
-- But we add this policy for completeness
CREATE POLICY "Service role can insert feed items"
  ON rss_feed_items FOR INSERT
  WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_rss_feeds_updated_at ON rss_feeds;
CREATE TRIGGER update_rss_feeds_updated_at
  BEFORE UPDATE ON rss_feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rss_feed_items_updated_at ON rss_feed_items;
CREATE TRIGGER update_rss_feed_items_updated_at
  BEFORE UPDATE ON rss_feed_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE rss_feeds IS 'User-subscribed RSS feed URLs for content ingestion';
COMMENT ON TABLE rss_feed_items IS 'Individual items ingested from RSS feeds';
COMMENT ON COLUMN rss_feeds.error_count IS 'Consecutive fetch errors. Reset to 0 on success. Feed paused after 5 consecutive errors.';
COMMENT ON COLUMN rss_feed_items.guid IS 'Unique identifier from feed (RSS guid or Atom id). Used for deduplication.';
COMMENT ON COLUMN rss_feed_items.content_upload_id IS 'Reference to ContentUpload if this item was converted to content';
