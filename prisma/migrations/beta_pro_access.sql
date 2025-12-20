-- ============================================
-- MIGRATION: Beta Pro Access for 50 Beta Creators
-- ============================================
-- This migration adds beta access fields to the profiles table.
-- It is backward-compatible and can be applied without downtime.
--
-- ROLLBACK INSTRUCTIONS:
-- If you need to rollback, run:
--   ALTER TABLE profiles DROP COLUMN IF EXISTS beta_user;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS beta_expires_at;
--   DROP INDEX IF EXISTS idx_profiles_beta_user;
--   DROP INDEX IF EXISTS idx_profiles_beta_expires_at;
-- ============================================

BEGIN;

-- Step 1: Add beta_user column (defaults to false for backward compatibility)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS beta_user BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Add beta_expires_at column (nullable for non-beta users)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS beta_expires_at TIMESTAMPTZ NULL;

-- Step 3: Create index for efficient beta user queries
CREATE INDEX IF NOT EXISTS idx_profiles_beta_user
ON profiles (beta_user)
WHERE beta_user = true;

-- Step 4: Create index for beta expiry checks (used in cron jobs)
CREATE INDEX IF NOT EXISTS idx_profiles_beta_expires_at
ON profiles (beta_expires_at)
WHERE beta_expires_at IS NOT NULL;

-- Step 5: Add a comment for documentation
COMMENT ON COLUMN profiles.beta_user IS 'Whether user has beta access (temporary Pro access)';
COMMENT ON COLUMN profiles.beta_expires_at IS 'When beta access expires (NULL means no beta access)';

COMMIT;

-- ============================================
-- VERIFICATION QUERY (run after migration):
-- ============================================
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN ('beta_user', 'beta_expires_at');
