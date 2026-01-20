-- Add push subscription field to profiles table for PWA push notifications
ALTER TABLE "profiles" ADD COLUMN "push_subscription" JSONB;
