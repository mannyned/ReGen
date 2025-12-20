# Beta Pro Access - Rollout Guide

This document covers the deployment, testing, and management of the Beta Pro feature for 50 beta creators.

## Overview

Beta Pro gives selected users temporary Pro-level access that:
- Expires automatically after a configurable period (default: 30 days)
- Is clearly labeled in UI as "Beta Pro"
- Has billing disabled
- Can be cleanly downgraded without breaking existing data

## Files Modified/Created

### Database
- `prisma/schema.prisma` - Added `betaUser` and `betaExpiresAt` fields to Profile
- `prisma/migrations/beta_pro_access.sql` - SQL migration script

### Server-Side Logic
- `lib/tiers/effective-tier.ts` - Core effective tier calculation
- `lib/auth/beta-guards.ts` - Authentication guards using effective tier

### API Endpoints
- `app/api/admin/beta/route.ts` - Admin endpoints for assign/revoke/list
- `app/api/auth/me/route.ts` - Updated to include beta info

### UI Components
- `app/components/BetaProBadge.tsx` - Badge, banner, and card components
- `app/settings/page.tsx` - Updated to show beta status

---

## Rollout Checklist

### Step 1: Add Environment Variable

Add to your `.env` and Vercel environment variables:

```bash
# Admin API key for beta management (generate a secure random string)
ADMIN_API_KEY=your-secure-random-key-here
```

Generate a secure key:
```bash
openssl rand -hex 32
```

### Step 2: Apply Database Migration

Run the SQL migration in Supabase SQL Editor:

```sql
-- Copy contents of prisma/migrations/beta_pro_access.sql
-- Run in Supabase Dashboard → SQL Editor
```

Or via Prisma:
```bash
npx prisma db push
```

Verify the migration:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('beta_user', 'beta_expires_at');
```

### Step 3: Deploy Backend Changes

Deploy to Vercel:
```bash
npx vercel --prod
```

### Step 4: Verify Deployment

Test the admin endpoint:
```bash
# List beta users (should return empty)
curl -X GET https://regenr.app/api/admin/beta \
  -H "x-admin-key: YOUR_ADMIN_API_KEY"
```

### Step 5: Assign Beta Users

Assign beta access to selected creators:

```bash
curl -X POST https://regenr.app/api/admin/beta \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{
    "emails": [
      "creator1@example.com",
      "creator2@example.com"
    ],
    "durationDays": 30
  }'
```

Response:
```json
{
  "success": true,
  "assigned": 2,
  "skipped": 0,
  "notFound": [],
  "expiresAt": "2025-01-18T12:00:00.000Z"
}
```

---

## Admin API Reference

### Assign Beta Access
```
POST /api/admin/beta
Headers: x-admin-key: YOUR_ADMIN_API_KEY
Body: {
  "emails": ["user@example.com"],
  "userIds": ["uuid-here"],
  "durationDays": 30
}
```

### Revoke Beta Access
```
DELETE /api/admin/beta
Headers: x-admin-key: YOUR_ADMIN_API_KEY
Body: {
  "emails": ["user@example.com"],
  "all": false
}
```

### List Beta Users
```
GET /api/admin/beta
Headers: x-admin-key: YOUR_ADMIN_API_KEY
```

---

## Testing Checklist

### Pre-Deployment Tests

1. **Existing non-beta users unaffected**
   - [ ] Regular users can still sign in
   - [ ] Tier-based access works as before
   - [ ] No errors in console

2. **Schema backward compatibility**
   - [ ] Old profiles work (betaUser defaults to false)
   - [ ] API returns correct tierInfo for all users

### Post-Deployment Tests

3. **Beta user experience**
   - [ ] Beta user sees "Beta Pro" badge in settings
   - [ ] Beta user has Pro-level access
   - [ ] Platform connections show unlimited limit
   - [ ] Team features accessible

4. **Beta expiry handling**
   - [ ] Expired beta users revert to actual tier
   - [ ] Existing connections preserved (not deleted)
   - [ ] Over-limit warning shows if applicable

5. **Admin endpoints**
   - [ ] Assign works with emails
   - [ ] Assign works with userIds
   - [ ] Revoke works correctly
   - [ ] List shows all beta users
   - [ ] Invalid API key returns 401

6. **UI states**
   - [ ] Settings → Subscription shows Beta Pro card
   - [ ] Billing/Payment sections hidden for beta users
   - [ ] Expiring soon warning at <= 7 days

---

## Monitoring

### Key Metrics to Watch

1. **Beta user count**
   ```sql
   SELECT COUNT(*) FROM profiles WHERE beta_user = true;
   ```

2. **Beta users expiring soon**
   ```sql
   SELECT email, beta_expires_at
   FROM profiles
   WHERE beta_user = true
     AND beta_expires_at <= NOW() + INTERVAL '7 days'
   ORDER BY beta_expires_at;
   ```

3. **Expired beta users (need cleanup)**
   ```sql
   SELECT COUNT(*)
   FROM profiles
   WHERE beta_user = true
     AND beta_expires_at < NOW();
   ```

---

## Rollback Procedure

If issues arise, you can rollback:

### 1. Revoke all beta access
```bash
curl -X DELETE https://regenr.app/api/admin/beta \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"all": true}'
```

### 2. Database rollback (if needed)
```sql
-- Remove beta columns
ALTER TABLE profiles DROP COLUMN IF EXISTS beta_user;
ALTER TABLE profiles DROP COLUMN IF EXISTS beta_expires_at;
DROP INDEX IF EXISTS idx_profiles_beta_user;
DROP INDEX IF EXISTS idx_profiles_beta_expires_at;
```

### 3. Redeploy previous version
```bash
vercel rollback
```

---

## After Beta Ends

When transitioning beta users to paid plans:

1. **Notify users** before beta ends (7-day warning is automatic in UI)
2. **Track conversions** - beta users who upgrade
3. **Clean up expired** - optionally set `beta_user = false` for expired users

```sql
-- Clean up expired beta flags
UPDATE profiles
SET beta_user = false, beta_expires_at = null
WHERE beta_user = true AND beta_expires_at < NOW();
```

---

## Security Notes

- **ADMIN_API_KEY** must be kept secret (server-side only)
- Never expose the key in client-side code
- Rotate the key if compromised
- All admin actions are logged (non-sensitive info only)
- Rate limit admin endpoints in production if needed
