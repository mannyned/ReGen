-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- This migration enables RLS on all user-owned tables and creates
-- policies to ensure users can only access their own data.
--
-- Prerequisites:
-- - Supabase Auth must be configured
-- - auth.uid() returns the authenticated user's UUID
-- - Profile.id matches auth.users.id (same UUID)
--
-- Run this migration after Prisma migrations:
-- psql $DATABASE_URL -f prisma/migrations/rls/001_enable_rls.sql
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if current user owns a profile
CREATE OR REPLACE FUNCTION public.is_owner(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has Pro tier (for team features)
CREATE OR REPLACE FUNCTION public.is_pro_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND tier = 'PRO'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a team member (future-ready)
-- This will be used when team functionality is implemented
CREATE OR REPLACE FUNCTION public.is_team_member(owner_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Direct owner check
  IF auth.uid() = owner_profile_id THEN
    RETURN TRUE;
  END IF;

  -- Team membership check (future implementation)
  -- Uncomment and modify when teams table exists:
  -- RETURN EXISTS (
  --   SELECT 1 FROM public.team_members
  --   WHERE team_members.profile_id = auth.uid()
  --   AND team_members.team_id IN (
  --     SELECT team_id FROM public.team_members
  --     WHERE profile_id = owner_profile_id
  --   )
  --   AND team_members.status = 'active'
  -- );

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check team access for Pro users (future-ready)
CREATE OR REPLACE FUNCTION public.has_team_access(resource_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Owner always has access
  IF auth.uid() = resource_profile_id THEN
    RETURN TRUE;
  END IF;

  -- Pro users can access team resources
  IF public.is_pro_user() AND public.is_team_member(resource_profile_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (during signup)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users cannot delete their own profile (handled by auth cascade)
-- No DELETE policy - profiles are deleted when auth.users is deleted

-- ============================================
-- OAUTH CONNECTIONS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own OAuth connections
CREATE POLICY "oauth_connections_select_own"
  ON public.oauth_connections
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Policy: Users can insert their own OAuth connections
CREATE POLICY "oauth_connections_insert_own"
  ON public.oauth_connections
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own OAuth connections
CREATE POLICY "oauth_connections_update_own"
  ON public.oauth_connections
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can delete their own OAuth connections
CREATE POLICY "oauth_connections_delete_own"
  ON public.oauth_connections
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================
-- SOCIAL CONNECTIONS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own social connections
CREATE POLICY "social_connections_select_own"
  ON public.social_connections
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Policy: Users can insert their own social connections
CREATE POLICY "social_connections_insert_own"
  ON public.social_connections
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own social connections
CREATE POLICY "social_connections_update_own"
  ON public.social_connections
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can delete their own social connections
CREATE POLICY "social_connections_delete_own"
  ON public.social_connections
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================
-- CONTENT UPLOADS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.content_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own content (+ team content for Pro)
CREATE POLICY "content_uploads_select_own"
  ON public.content_uploads
  FOR SELECT
  USING (public.has_team_access(profile_id));

-- Policy: Users can insert their own content
CREATE POLICY "content_uploads_insert_own"
  ON public.content_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own content
CREATE POLICY "content_uploads_update_own"
  ON public.content_uploads
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can delete their own content
CREATE POLICY "content_uploads_delete_own"
  ON public.content_uploads
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================
-- SCHEDULED POSTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own scheduled posts (+ team posts for Pro)
CREATE POLICY "scheduled_posts_select_own"
  ON public.scheduled_posts
  FOR SELECT
  USING (public.has_team_access(profile_id));

-- Policy: Users can insert their own scheduled posts
CREATE POLICY "scheduled_posts_insert_own"
  ON public.scheduled_posts
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own scheduled posts
CREATE POLICY "scheduled_posts_update_own"
  ON public.scheduled_posts
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can delete their own scheduled posts
CREATE POLICY "scheduled_posts_delete_own"
  ON public.scheduled_posts
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================
-- PUBLISHED POSTS TABLE
-- ============================================
-- Note: published_posts doesn't have a direct profile_id,
-- it links through scheduled_post or social_connection

-- Enable RLS
ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own published posts via social connection
CREATE POLICY "published_posts_select_own"
  ON public.published_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.social_connections sc
      WHERE sc.id = published_posts.social_connection_id
      AND public.has_team_access(sc.profile_id)
    )
  );

-- Policy: Users can insert published posts for their own social connections
CREATE POLICY "published_posts_insert_own"
  ON public.published_posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_connections sc
      WHERE sc.id = social_connection_id
      AND auth.uid() = sc.profile_id
    )
  );

-- Policy: Users can update their own published posts
CREATE POLICY "published_posts_update_own"
  ON public.published_posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.social_connections sc
      WHERE sc.id = published_posts.social_connection_id
      AND auth.uid() = sc.profile_id
    )
  );

-- Policy: Users can delete their own published posts
CREATE POLICY "published_posts_delete_own"
  ON public.published_posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.social_connections sc
      WHERE sc.id = published_posts.social_connection_id
      AND auth.uid() = sc.profile_id
    )
  );

-- ============================================
-- POST ANALYTICS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read analytics for their own posts
CREATE POLICY "post_analytics_select_own"
  ON public.post_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.published_posts pp
      JOIN public.social_connections sc ON sc.id = pp.social_connection_id
      WHERE pp.id = post_analytics.published_post_id
      AND public.has_team_access(sc.profile_id)
    )
  );

-- Policy: System can insert/update analytics (via service role)
-- Individual users typically don't write analytics directly
CREATE POLICY "post_analytics_insert_system"
  ON public.post_analytics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.published_posts pp
      JOIN public.social_connections sc ON sc.id = pp.social_connection_id
      WHERE pp.id = published_post_id
      AND auth.uid() = sc.profile_id
    )
  );

CREATE POLICY "post_analytics_update_system"
  ON public.post_analytics
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.published_posts pp
      JOIN public.social_connections sc ON sc.id = pp.social_connection_id
      WHERE pp.id = post_analytics.published_post_id
      AND auth.uid() = sc.profile_id
    )
  );

-- ============================================
-- ANALYTICS SNAPSHOTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own analytics snapshots (+ team for Pro)
CREATE POLICY "analytics_snapshots_select_own"
  ON public.analytics_snapshots
  FOR SELECT
  USING (public.has_team_access(profile_id));

-- Policy: Users can insert their own analytics snapshots
CREATE POLICY "analytics_snapshots_insert_own"
  ON public.analytics_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own analytics snapshots
CREATE POLICY "analytics_snapshots_update_own"
  ON public.analytics_snapshots
  FOR UPDATE
  USING (auth.uid() = profile_id);

-- Policy: Users can delete their own analytics snapshots
CREATE POLICY "analytics_snapshots_delete_own"
  ON public.analytics_snapshots
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================
-- EXPORT JOBS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own export jobs
CREATE POLICY "export_jobs_select_own"
  ON public.export_jobs
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Policy: Users can insert their own export jobs
CREATE POLICY "export_jobs_insert_own"
  ON public.export_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own export jobs
CREATE POLICY "export_jobs_update_own"
  ON public.export_jobs
  FOR UPDATE
  USING (auth.uid() = profile_id);

-- Policy: Users can delete their own export jobs
CREATE POLICY "export_jobs_delete_own"
  ON public.export_jobs
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================
-- EXPORT AUDIT LOGS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.export_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own audit logs
CREATE POLICY "export_audit_logs_select_own"
  ON public.export_audit_logs
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Policy: System can insert audit logs
CREATE POLICY "export_audit_logs_insert_own"
  ON public.export_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- No update/delete for audit logs (immutable)

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Supabase automatically handles grants for authenticated users,
-- but we explicitly grant for clarity

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Service role bypasses RLS (for background jobs, webhooks, etc.)
-- This is automatically configured in Supabase

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify RLS is enabled:

-- Check RLS status on all tables
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public';

-- Check policies
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';
