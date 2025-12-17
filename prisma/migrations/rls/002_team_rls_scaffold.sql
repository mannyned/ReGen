-- ============================================
-- TEAM ROW LEVEL SECURITY (RLS) - SCAFFOLD
-- ============================================
-- This migration creates the team infrastructure for Pro users.
-- Enable these policies when team functionality is implemented.
--
-- Prerequisites:
-- - 001_enable_rls.sql must be applied first
-- - Team tables must be created via Prisma migration
--
-- DO NOT RUN THIS FILE DIRECTLY
-- Uncomment sections as team features are implemented
-- ============================================

-- ============================================
-- TEAM TABLES (Create via Prisma first)
-- ============================================
-- Add these models to your Prisma schema when ready:
--
-- model Team {
--   id          String   @id @default(cuid())
--   name        String
--   slug        String   @unique
--   ownerId     String   @map("owner_id") @db.Uuid
--   tier        UserTier @default(PRO)
--   createdAt   DateTime @default(now()) @map("created_at")
--   updatedAt   DateTime @updatedAt @map("updated_at")
--
--   owner       Profile      @relation("TeamOwner", fields: [ownerId], references: [id])
--   members     TeamMember[]
--   invites     TeamInvite[]
--
--   @@map("teams")
-- }
--
-- model TeamMember {
--   id        String     @id @default(cuid())
--   teamId    String     @map("team_id")
--   profileId String     @map("profile_id") @db.Uuid
--   role      TeamRole   @default(MEMBER)
--   status    MemberStatus @default(ACTIVE)
--   joinedAt  DateTime   @default(now()) @map("joined_at")
--
--   team      Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
--   profile   Profile    @relation(fields: [profileId], references: [id], onDelete: Cascade)
--
--   @@unique([teamId, profileId])
--   @@map("team_members")
-- }
--
-- model TeamInvite {
--   id        String   @id @default(cuid())
--   teamId    String   @map("team_id")
--   email     String
--   role      TeamRole @default(MEMBER)
--   token     String   @unique
--   expiresAt DateTime @map("expires_at")
--   createdAt DateTime @default(now()) @map("created_at")
--
--   team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
--
--   @@map("team_invites")
-- }
--
-- enum TeamRole {
--   OWNER
--   ADMIN
--   MEMBER
--   VIEWER
-- }
--
-- enum MemberStatus {
--   ACTIVE
--   SUSPENDED
--   PENDING
-- }

-- ============================================
-- UPDATED HELPER FUNCTIONS FOR TEAMS
-- ============================================
-- Uncomment when team tables exist:

/*
-- Drop and recreate is_team_member with actual implementation
DROP FUNCTION IF EXISTS public.is_team_member(UUID);

CREATE OR REPLACE FUNCTION public.is_team_member(owner_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Direct owner check
  IF auth.uid() = owner_profile_id THEN
    RETURN TRUE;
  END IF;

  -- Check if current user shares a team with the owner
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members my_membership
    JOIN public.team_members owner_membership
      ON my_membership.team_id = owner_membership.team_id
    WHERE my_membership.profile_id = auth.uid()
    AND owner_membership.profile_id = owner_profile_id
    AND my_membership.status = 'ACTIVE'
    AND owner_membership.status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check team role
CREATE OR REPLACE FUNCTION public.get_team_role(team_id TEXT)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.team_members
  WHERE team_members.team_id = $1
  AND profile_id = auth.uid()
  AND status = 'ACTIVE';

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage team
CREATE OR REPLACE FUNCTION public.can_manage_team(team_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := public.get_team_role(team_id);
  RETURN user_role IN ('OWNER', 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- ============================================
-- TEAMS TABLE RLS
-- ============================================
-- Uncomment when teams table exists:

/*
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can read their teams
CREATE POLICY "teams_select_member"
  ON public.teams
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.profile_id = auth.uid()
      AND team_members.status = 'ACTIVE'
    )
  );

-- Policy: Only Pro users can create teams
CREATE POLICY "teams_insert_pro"
  ON public.teams
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND public.is_pro_user()
  );

-- Policy: Only team owner can update team
CREATE POLICY "teams_update_owner"
  ON public.teams
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Only team owner can delete team
CREATE POLICY "teams_delete_owner"
  ON public.teams
  FOR DELETE
  USING (auth.uid() = owner_id);
*/

-- ============================================
-- TEAM MEMBERS TABLE RLS
-- ============================================
-- Uncomment when team_members table exists:

/*
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can see other members
CREATE POLICY "team_members_select_team"
  ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members my_membership
      WHERE my_membership.team_id = team_members.team_id
      AND my_membership.profile_id = auth.uid()
      AND my_membership.status = 'ACTIVE'
    )
  );

-- Policy: Team admins can add members
CREATE POLICY "team_members_insert_admin"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    public.can_manage_team(team_id)
  );

-- Policy: Team admins can update members (except owner)
CREATE POLICY "team_members_update_admin"
  ON public.team_members
  FOR UPDATE
  USING (
    public.can_manage_team(team_id)
    AND role != 'OWNER'
  );

-- Policy: Team admins can remove members (except owner)
-- Members can remove themselves
CREATE POLICY "team_members_delete_admin_or_self"
  ON public.team_members
  FOR DELETE
  USING (
    (public.can_manage_team(team_id) AND role != 'OWNER')
    OR profile_id = auth.uid()
  );
*/

-- ============================================
-- TEAM INVITES TABLE RLS
-- ============================================
-- Uncomment when team_invites table exists:

/*
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Team admins can see invites
CREATE POLICY "team_invites_select_admin"
  ON public.team_invites
  FOR SELECT
  USING (public.can_manage_team(team_id));

-- Policy: Team admins can create invites
CREATE POLICY "team_invites_insert_admin"
  ON public.team_invites
  FOR INSERT
  WITH CHECK (public.can_manage_team(team_id));

-- Policy: Team admins can delete invites
CREATE POLICY "team_invites_delete_admin"
  ON public.team_invites
  FOR DELETE
  USING (public.can_manage_team(team_id));
*/

-- ============================================
-- SHARED RESOURCE POLICIES
-- ============================================
-- These policies allow team members to access shared resources.
-- Uncomment to upgrade existing policies for team support:

/*
-- Update content_uploads policy for team access
DROP POLICY IF EXISTS "content_uploads_select_own" ON public.content_uploads;
CREATE POLICY "content_uploads_select_team"
  ON public.content_uploads
  FOR SELECT
  USING (
    auth.uid() = profile_id
    OR (
      public.is_pro_user()
      AND public.is_team_member(profile_id)
    )
  );

-- Update scheduled_posts policy for team access
DROP POLICY IF EXISTS "scheduled_posts_select_own" ON public.scheduled_posts;
CREATE POLICY "scheduled_posts_select_team"
  ON public.scheduled_posts
  FOR SELECT
  USING (
    auth.uid() = profile_id
    OR (
      public.is_pro_user()
      AND public.is_team_member(profile_id)
    )
  );

-- Update analytics_snapshots policy for team access
DROP POLICY IF EXISTS "analytics_snapshots_select_own" ON public.analytics_snapshots;
CREATE POLICY "analytics_snapshots_select_team"
  ON public.analytics_snapshots
  FOR SELECT
  USING (
    auth.uid() = profile_id
    OR (
      public.is_pro_user()
      AND public.is_team_member(profile_id)
    )
  );
*/

-- ============================================
-- TEAM RESOURCE SHARING GRANULAR CONTROLS
-- ============================================
-- For more granular control, you could add a sharing model:
--
-- model ResourceShare {
--   id          String   @id @default(cuid())
--   resourceType String  @map("resource_type") // 'content', 'schedule', etc.
--   resourceId  String   @map("resource_id")
--   teamId      String   @map("team_id")
--   permission  SharePermission @default(VIEW)
--   createdAt   DateTime @default(now())
--
--   @@unique([resourceType, resourceId, teamId])
--   @@map("resource_shares")
-- }
--
-- enum SharePermission {
--   VIEW
--   EDIT
--   MANAGE
-- }

-- ============================================
-- NOTES FOR IMPLEMENTATION
-- ============================================
--
-- 1. When implementing teams:
--    a. Add Team, TeamMember, TeamInvite models to Prisma schema
--    b. Run prisma migrate dev to create tables
--    c. Uncomment relevant sections in this file
--    d. Run this SQL file against the database
--
-- 2. Team access levels:
--    - OWNER: Full control, can delete team
--    - ADMIN: Manage members and invites, edit settings
--    - MEMBER: Create/edit own content, view team content
--    - VIEWER: Read-only access to team content
--
-- 3. Resource sharing model:
--    - By default, content is private to creator
--    - Pro users can share with team
--    - Granular sharing via ResourceShare table (optional)
--
-- 4. Performance considerations:
--    - Add indexes on team_members(profile_id, status)
--    - Add indexes on team_members(team_id, status)
--    - Consider caching team membership lookups
