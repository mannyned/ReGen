-- Migration: Add analytics permission toggle to teams table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

BEGIN;

-- Add the allow_member_account_analytics column with default false
-- This is backward compatible - existing teams get the restrictive default
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS allow_member_account_analytics BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN teams.allow_member_account_analytics IS
  'When true, team members can view account-level analytics. Default false means members only see content analytics.';

COMMIT;

-- Verify the migration
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'teams'
  AND column_name = 'allow_member_account_analytics';
