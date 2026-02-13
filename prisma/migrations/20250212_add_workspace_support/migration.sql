-- Migration: Add Workspace Support
-- Applied: 2025-02-12
-- Description: Adds workspace_id to content tables for multi-workspace support
-- Backwards Compatible: Yes (all workspace_id columns are nullable)

-- ============================================
-- 1. ADD WORKSPACE FIELDS TO TEAM (now serves as Workspace)
-- ============================================

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN DEFAULT false;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}';

-- Index for default workspace queries
CREATE INDEX IF NOT EXISTS "teams_is_default_idx" ON "teams" ("is_default");

-- ============================================
-- 2. ADD WORKSPACE LIMIT TO PROFILES
-- ============================================

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "workspace_limit" INTEGER DEFAULT 1;

-- ============================================
-- 3. ADD WORKSPACE_ID TO CONTENT TABLES (all nullable for backwards compatibility)
-- ============================================

-- Social Connections
ALTER TABLE "social_connections" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "social_connections_workspace_id_idx" ON "social_connections" ("workspace_id");

-- OAuth Connections
ALTER TABLE "oauth_connections" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "oauth_connections_workspace_id_idx" ON "oauth_connections" ("workspace_id");

-- Content Uploads
ALTER TABLE "content_uploads" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "content_uploads_workspace_id_idx" ON "content_uploads" ("workspace_id");

-- Scheduled Posts
ALTER TABLE "scheduled_posts" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "scheduled_posts_workspace_id_idx" ON "scheduled_posts" ("workspace_id");

-- Analytics Snapshots
ALTER TABLE "analytics_snapshots" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "analytics_snapshots_workspace_id_idx" ON "analytics_snapshots" ("workspace_id");

-- Export Jobs
ALTER TABLE "export_jobs" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "export_jobs_workspace_id_idx" ON "export_jobs" ("workspace_id");

-- RSS Feeds
ALTER TABLE "rss_feeds" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "rss_feeds_workspace_id_idx" ON "rss_feeds" ("workspace_id");

-- Outbound Posts
ALTER TABLE "outbound_posts" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "outbound_posts_workspace_id_idx" ON "outbound_posts" ("workspace_id");

-- Blog Auto Share Settings
ALTER TABLE "blog_auto_share_settings" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "blog_auto_share_settings_workspace_id_idx" ON "blog_auto_share_settings" ("workspace_id");

-- ============================================
-- 4. UPDATE TEAM_MEMBERS (allow multi-workspace membership)
-- ============================================

-- Remove the unique constraint on user_id (if exists) to allow users in multiple workspaces
-- Note: This may have already been removed depending on database state
-- The unique constraint [teamId, userId] is kept to prevent duplicate memberships in same workspace

-- ============================================
-- 5. ADD FOREIGN KEY CONSTRAINTS (optional, for referential integrity)
-- ============================================

-- These are optional since Prisma handles this at the application level
-- Uncomment if you want database-level enforcement

-- ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "content_uploads" ADD CONSTRAINT "content_uploads_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "rss_feeds" ADD CONSTRAINT "rss_feeds_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "outbound_posts" ADD CONSTRAINT "outbound_posts_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "blog_auto_share_settings" ADD CONSTRAINT "blog_auto_share_settings_workspace_id_fkey"
--   FOREIGN KEY ("workspace_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
