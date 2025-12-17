#!/bin/bash
# ============================================
# Apply Row Level Security Policies
# ============================================
# This script applies RLS policies to your Supabase database.
#
# Usage:
#   ./apply_rls.sh                    # Uses DATABASE_URL from .env
#   ./apply_rls.sh <database_url>     # Uses provided URL
#
# Prerequisites:
# - psql must be installed
# - Prisma migrations must be applied first
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get database URL
if [ -n "$1" ]; then
    DATABASE_URL="$1"
elif [ -f "$SCRIPT_DIR/../../../.env.local" ]; then
    DATABASE_URL=$(grep -E "^DATABASE_URL=" "$SCRIPT_DIR/../../../.env.local" | cut -d '=' -f2-)
elif [ -f "$SCRIPT_DIR/../../../.env" ]; then
    DATABASE_URL=$(grep -E "^DATABASE_URL=" "$SCRIPT_DIR/../../../.env" | cut -d '=' -f2-)
elif [ -n "$DATABASE_URL" ]; then
    : # Use existing environment variable
else
    echo "Error: DATABASE_URL not found"
    echo "Usage: ./apply_rls.sh <database_url>"
    exit 1
fi

# Remove quotes if present
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"

echo "Applying Row Level Security policies..."
echo "========================================"

# Apply main RLS policies
echo "Applying 001_enable_rls.sql..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/001_enable_rls.sql"

echo ""
echo "RLS policies applied successfully!"
echo ""
echo "To verify, run:"
echo "  psql \$DATABASE_URL -c \"SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';\""
echo ""
echo "To view policies:"
echo "  psql \$DATABASE_URL -c \"SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';\""
