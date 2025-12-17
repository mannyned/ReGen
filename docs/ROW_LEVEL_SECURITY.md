# Row Level Security (RLS) Documentation

This document describes the Row Level Security policies implemented for ReGenr's database.

## Overview

Row Level Security (RLS) is a PostgreSQL feature that restricts which rows users can access based on policies. With Supabase, RLS integrates with `auth.uid()` to automatically filter data based on the authenticated user.

## Architecture

```
User Request
     |
     v
Supabase Auth (validates JWT, sets auth.uid())
     |
     v
PostgreSQL RLS (filters rows based on policies)
     |
     v
Query Results (only authorized rows)
```

## Quick Start

### Apply RLS Policies

After running Prisma migrations, apply RLS:

```bash
# Using the script
cd prisma/migrations/rls
chmod +x apply_rls.sh
./apply_rls.sh

# Or manually with psql
psql $DATABASE_URL -f prisma/migrations/rls/001_enable_rls.sql
```

### Verify RLS is Enabled

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- View all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

## Tables with RLS

| Table | RLS Enabled | Owner Column | Team Access |
|-------|-------------|--------------|-------------|
| profiles | Yes | id | No |
| oauth_connections | Yes | profile_id | No |
| social_connections | Yes | profile_id | No |
| content_uploads | Yes | profile_id | Pro users |
| scheduled_posts | Yes | profile_id | Pro users |
| published_posts | Yes | via social_connection | Pro users |
| post_analytics | Yes | via published_post | Pro users |
| analytics_snapshots | Yes | profile_id | Pro users |
| export_jobs | Yes | profile_id | No |
| export_audit_logs | Yes | profile_id | No |

## Policy Examples

### 1. Profiles Table

Users can only read and update their own profile:

```sql
-- Read own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Update own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Usage in Application:**

```typescript
// This query automatically filters to current user's profile
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .single();
// Returns only the authenticated user's profile
```

### 2. OAuth Connections Table

Users can only access their own OAuth connections:

```sql
-- Read own OAuth connections
CREATE POLICY "oauth_connections_select_own"
  ON public.oauth_connections
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Delete own OAuth connections
CREATE POLICY "oauth_connections_delete_own"
  ON public.oauth_connections
  FOR DELETE
  USING (auth.uid() = profile_id);
```

**Usage in Application:**

```typescript
// Get all OAuth connections for current user
const { data, error } = await supabase
  .from('oauth_connections')
  .select('provider, provider_account_id, expires_at');
// Only returns connections owned by auth.uid()

// Attempting to access another user's connections fails silently
const { data } = await supabase
  .from('oauth_connections')
  .select('*')
  .eq('profile_id', 'other-user-uuid');
// Returns empty array, not an error
```

### 3. Team Access for Pro Users

Pro users can access resources shared within their team:

```sql
-- Helper function for team access
CREATE FUNCTION public.has_team_access(resource_profile_id UUID)
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

-- Content uploads with team access
CREATE POLICY "content_uploads_select_own"
  ON public.content_uploads
  FOR SELECT
  USING (public.has_team_access(profile_id));
```

**Usage in Application:**

```typescript
// Pro user can see team content
const { data, error } = await supabase
  .from('content_uploads')
  .select('*');
// Returns own content + team members' content (if Pro)
```

## Helper Functions

### is_owner(profile_id)

Checks if the current user owns the specified profile:

```sql
SELECT public.is_owner('some-uuid');
-- Returns TRUE if auth.uid() = 'some-uuid'
```

### is_pro_user()

Checks if the current user has Pro tier:

```sql
SELECT public.is_pro_user();
-- Returns TRUE if user's tier = 'PRO'
```

### is_team_member(owner_profile_id)

Checks if the current user shares a team with the owner:

```sql
SELECT public.is_team_member('owner-uuid');
-- Returns TRUE if users share a team (future implementation)
```

### has_team_access(resource_profile_id)

Combines ownership and team membership checks:

```sql
SELECT public.has_team_access('resource-owner-uuid');
-- Returns TRUE if owner OR (Pro AND team member)
```

## Security Considerations

### 1. Service Role Bypasses RLS

The Supabase service role key bypasses RLS. Use it only for:
- Background jobs
- Webhook handlers
- Admin operations

```typescript
// Server-side only - bypasses RLS
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Never expose to client!
);
```

### 2. SECURITY DEFINER Functions

Helper functions use `SECURITY DEFINER` to run with elevated privileges. This is necessary for cross-table checks but requires careful implementation:

- Functions are owned by the database owner
- They can access data the calling user cannot
- Always validate inputs within the function

### 3. Indirect Access Patterns

Some tables (like `published_posts`) don't have a direct `profile_id`. Policies use JOINs to verify ownership:

```sql
-- Access through related table
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
```

### 4. Audit Logs are Immutable

Export audit logs have no UPDATE or DELETE policies:

```sql
-- Only INSERT allowed (no UPDATE/DELETE policies)
CREATE POLICY "export_audit_logs_insert_own"
  ON public.export_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
```

## Testing RLS Policies

### Test as a Specific User

```sql
-- Set the role for testing
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "test-user-uuid"}';

-- Run your query
SELECT * FROM profiles;

-- Reset
RESET ROLE;
```

### Test Policy Logic

```sql
-- Test helper functions
SELECT public.is_owner('your-uuid');
SELECT public.is_pro_user();
SELECT public.has_team_access('some-profile-uuid');
```

### Verify No Data Leakage

```typescript
// As user A, try to access user B's data
const { data, error } = await supabase
  .from('oauth_connections')
  .select('*')
  .eq('profile_id', 'user-b-uuid');

console.log(data); // Should be empty array []
console.log(error); // Should be null (not an access error)
```

## Future: Team Implementation

When team features are implemented:

1. Add team models to Prisma schema
2. Run Prisma migration
3. Uncomment sections in `002_team_rls_scaffold.sql`
4. Apply the SQL migration

Team roles:
- **OWNER**: Full control, delete team
- **ADMIN**: Manage members, edit settings
- **MEMBER**: Create/edit own content, view team content
- **VIEWER**: Read-only access

## Troubleshooting

### "permission denied for table X"

RLS is blocking access. Check:
1. Is the user authenticated? (`auth.uid()` must not be null)
2. Does a policy exist for this operation?
3. Does the user meet the policy conditions?

### Query returns empty when data exists

The policy `USING` clause filtered out all rows. Verify:
1. The `profile_id` matches `auth.uid()`
2. For team access, the user is Pro and a team member
3. Check related tables for indirect access

### Service role not bypassing RLS

Ensure you're using the service role key, not the anon key:

```typescript
// Wrong - uses anon key
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Correct - uses service role
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

### Performance issues with RLS

Complex policies with JOINs can slow queries. Solutions:
1. Add indexes on foreign keys
2. Denormalize `profile_id` to related tables
3. Use materialized views for complex access patterns

## Related Documentation

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Documentation](./SUPABASE_AUTH.md)
- [OAuth Backend Documentation](./OAUTH_BACKEND.md)
