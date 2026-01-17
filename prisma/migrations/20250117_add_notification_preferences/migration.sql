-- Add notification_preferences column to profiles table
ALTER TABLE "profiles" ADD COLUMN "notification_preferences" JSONB;
