# Tier Handling System

ReGenr uses a three-tier subscription model: **Free**, **Creator**, and **Pro**. This document covers tier configuration, enforcement, and API usage.

## Tier Overview

| Feature | Free | Creator | Pro |
|---------|------|---------|-----|
| **Platforms** | 2 | 5 | Unlimited |
| **Scheduled Posts** | 10 | 100 | Unlimited |
| **Uploads/Month** | 20 | 200 | Unlimited |
| **Storage** | 100 MB | 1 GB | 10 GB |
| **Analytics History** | 7 days | 30 days | 365 days |
| **Team Members** | 0 | 0 | 10 |
| **AI Captions** | ❌ | ✅ | ✅ |
| **Custom Watermarks** | ❌ | ✅ | ✅ |
| **Analytics Export** | ❌ | ❌ | ✅ |
| **Team Access** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |

## Platform Access by Tier

| Platform | Free | Creator | Pro |
|----------|------|---------|-----|
| Instagram | ✅ | ✅ | ✅ |
| Facebook | ✅ | ✅ | ✅ |
| TikTok | ❌ | ✅ | ✅ |
| YouTube | ❌ | ✅ | ✅ |
| X (Twitter) | ❌ | ❌ | ✅ |
| LinkedIn | ❌ | ❌ | ✅ |

## Quick Start

### Protecting API Routes

```typescript
import { requireAuth, requireTier, checkPlatformLimit } from '@/lib/tiers';

// Simple authentication check
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  // user is authenticated
  return NextResponse.json({ tier: user.tier });
}

// Require specific tier
export async function POST(request: NextRequest) {
  const { user, response } = await requireTier(request, 'CREATOR');
  if (response) return response;

  // user has Creator tier or higher
}

// Check platform connection limit
export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const platformCheck = await checkPlatformLimit(user.profileId);
  if (!platformCheck.allowed) {
    return NextResponse.json({
      error: 'Platform limit reached',
      current: platformCheck.current,
      limit: platformCheck.limit,
      upgradeRequired: platformCheck.upgradeRequired,
    }, { status: 403 });
  }

  // User can connect another platform
}
```

### Higher-Order Handlers

For cleaner route definitions:

```typescript
import { withAuthHandler, withTierHandler, withFeatureHandler } from '@/lib/tiers';

// Wrap handler with auth requirement
export const GET = withAuthHandler(async (request, context, user) => {
  return NextResponse.json({ user: user.email });
});

// Wrap handler with tier requirement
export const POST = withTierHandler('CREATOR', async (request, context, user) => {
  // Only Creator+ users reach here
});

// Wrap handler with feature requirement
export const POST = withFeatureHandler('aiCaptions', async (request, context, user) => {
  // Only users with AI Captions feature reach here
});
```

## Configuration

### Tier Configs

Located in `lib/tiers/config.ts`:

```typescript
import { TIER_CONFIGS, getTierConfig, getTierLimits, getTierFeatures } from '@/lib/tiers';

// Get full config for a tier
const proConfig = TIER_CONFIGS.PRO;

// Get specific tier's limits
const limits = getTierLimits('CREATOR');
// { maxPlatforms: 5, maxScheduledPosts: 100, ... }

// Get specific tier's features
const features = getTierFeatures('PRO');
// { teamAccess: true, analyticsExport: true, ... }
```

### Tier Comparison Utilities

```typescript
import { hasTierAccess, hasFeature, isUnlimited, isUnderLimit } from '@/lib/tiers';

// Check if user's tier grants access to target tier
hasTierAccess('CREATOR', 'FREE');     // true (Creator > Free)
hasTierAccess('FREE', 'CREATOR');     // false (Free < Creator)
hasTierAccess('PRO', 'PRO');          // true (equal)

// Check if tier has a specific feature
hasFeature('PRO', 'teamAccess');      // true
hasFeature('FREE', 'aiCaptions');     // false

// Check if a limit is unlimited (-1)
isUnlimited('PRO', 'maxPlatforms');   // true
isUnlimited('FREE', 'maxPlatforms');  // false

// Check if value is under limit (handles unlimited)
isUnderLimit('FREE', 'maxPlatforms', 1);  // true (1 < 2)
isUnderLimit('FREE', 'maxPlatforms', 5);  // false (5 >= 2)
isUnderLimit('PRO', 'maxPlatforms', 100); // true (unlimited)
```

### Upgrade Helpers

```typescript
import { getNextTier, getUpgradeTiers } from '@/lib/tiers';

// Get next tier in hierarchy
getNextTier('FREE');     // 'CREATOR'
getNextTier('CREATOR');  // 'PRO'
getNextTier('PRO');      // null (already highest)

// Get all available upgrade options
getUpgradeTiers('FREE');     // ['CREATOR', 'PRO']
getUpgradeTiers('CREATOR');  // ['PRO']
getUpgradeTiers('PRO');      // []
```

## Enforcement Functions

### Authentication

```typescript
import { requireAuth, getAuthenticatedUser } from '@/lib/tiers';

// Get user without enforcing (returns null if not authenticated)
const user = await getAuthenticatedUser(request);

// Require authentication (returns error response if not authenticated)
const { user, response } = await requireAuth(request);
if (response) return response; // 401 Unauthorized
```

### Tier Requirements

```typescript
import { requireTier, requireFeature } from '@/lib/tiers';

// Require minimum tier
const { user, response } = await requireTier(request, 'CREATOR');
if (response) return response; // 403 if tier too low

// Require specific feature
const { user, response } = await requireFeature(request, 'teamAccess');
if (response) return response; // 403 if feature not available
```

### Limit Checks

```typescript
import {
  checkPlatformLimit,
  checkScheduledPostsLimit,
  checkUploadsLimit,
  checkTeamMemberLimit,
} from '@/lib/tiers';

// Check platform connection limit
const platformCheck = await checkPlatformLimit(profileId);
// Returns: { allowed: boolean, current: number, limit: number, upgradeRequired: boolean }

// Check scheduled posts limit
const postsCheck = await checkScheduledPostsLimit(profileId);

// Check uploads limit (for current month)
const uploadsCheck = await checkUploadsLimit(profileId);

// Check team member limit
const teamCheck = await checkTeamMemberLimit(profileId);
```

### Team Access

```typescript
import { checkTeamAccess } from '@/lib/tiers';

// Check if user can access team features
const teamAccess = await checkTeamAccess(profileId);
// Returns: { allowed: boolean, tier: UserTier, upgradeRequired: boolean }
```

### Usage Summary

For displaying tier info in UI:

```typescript
import { getUsageSummary } from '@/lib/tiers';

const usage = await getUsageSummary(profileId);
// Returns:
// {
//   tier: 'CREATOR',
//   limits: {
//     platforms: { current: 3, max: 5, unlimited: false, percentage: 60 },
//     scheduledPosts: { current: 45, max: 100, unlimited: false, percentage: 45 },
//     uploads: { current: 80, max: 200, unlimited: false, percentage: 40 },
//     storage: { current: 250, max: 1024, unlimited: false, percentage: 24 },
//     teamMembers: { current: 0, max: 0, unlimited: false, percentage: 0 },
//   },
//   features: {
//     teamAccess: false,
//     analyticsExport: false,
//     aiCaptions: true,
//     customWatermarks: true,
//     ...
//   },
// }
```

## API Endpoints

### GET /api/tiers

Returns all available tier configurations. Public endpoint.

**Response:**
```json
{
  "tiers": [
    {
      "id": "FREE",
      "name": "Free",
      "description": "Get started with basic features",
      "limits": { "maxPlatforms": 2, ... },
      "features": { "teamAccess": false, ... },
      "price": { "monthly": 0, "yearly": 0 }
    },
    ...
  ]
}
```

### GET /api/tiers/current

Returns current user's tier and usage. Requires authentication.

**Response:**
```json
{
  "tier": {
    "id": "CREATOR",
    "name": "Creator",
    "description": "Perfect for content creators"
  },
  "usage": {
    "platforms": { "current": 3, "max": 5, "percentage": 60 },
    ...
  },
  "features": { "aiCaptions": true, ... },
  "upgrade": {
    "nextTier": { "id": "PRO", "name": "Pro", "price": { "monthly": 29, "yearly": 290 } },
    "allOptions": [...]
  }
}
```

### POST /api/tiers/upgrade

Upgrades user's tier. Requires authentication.

**Request:**
```json
{
  "targetTier": "CREATOR" | "PRO",
  "paymentMethod": "pm_xxx" // Optional, for production
}
```

**Response (Development):**
```json
{
  "success": true,
  "message": "Upgraded to Creator",
  "tier": { "id": "CREATOR", "name": "Creator" }
}
```

**Response (Production):**
```json
{
  "requiresPayment": true,
  "tier": { "id": "CREATOR", "name": "Creator", "price": { "monthly": 9, "yearly": 90 } },
  "checkoutUrl": "/checkout?tier=CREATOR"
}
```

### POST /api/tiers/downgrade

Downgrades user's tier. Requires authentication.

**Request:**
```json
{
  "targetTier": "FREE" | "CREATOR"
}
```

**Response:**
```json
{
  "scheduled": true,
  "effectiveDate": "2024-02-15T00:00:00.000Z",
  "tier": { "current": "PRO", "future": "CREATOR" },
  "changes": {
    "lostFeatures": ["teamAccess", "analyticsExport", "apiAccess"],
    "reducedLimits": ["maxPlatforms", "maxScheduledPosts", "maxTeamMembers"]
  },
  "message": "Your downgrade will take effect at the end of your billing period."
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### 403 Tier Forbidden
```json
{
  "error": "This feature requires Creator tier or higher",
  "code": "TIER_REQUIRED",
  "requiredTier": "CREATOR",
  "currentTier": "FREE",
  "upgradeUrl": "/upgrade"
}
```

### 403 Limit Exceeded
```json
{
  "error": "Platform connection limit reached",
  "code": "LIMIT_EXCEEDED",
  "limitType": "maxPlatforms",
  "current": 2,
  "limit": 2,
  "upgradeUrl": "/upgrade"
}
```

### 403 Feature Unavailable
```json
{
  "error": "This feature is not available on your current tier",
  "code": "FEATURE_UNAVAILABLE",
  "feature": "teamAccess",
  "currentTier": "CREATOR",
  "requiredTier": "PRO",
  "upgradeUrl": "/upgrade"
}
```

## Database Schema

The tier is stored in the `profiles` table:

```prisma
model Profile {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  tier      UserTier @default(FREE)
  // ...
}

enum UserTier {
  FREE
  CREATOR
  PRO
}
```

## Development Mode

In development, tier upgrades/downgrades happen immediately without payment:

```typescript
// Set in .env.local for immediate tier changes
ALLOW_DIRECT_UPGRADE=true
ALLOW_DIRECT_DOWNGRADE=true
```

## Usage Examples

### Protecting a Platform Connection Route

```typescript
// app/api/platforms/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkPlatformLimit, isPlatformAvailable } from '@/lib/tiers';

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { platform } = await request.json();

  // Check if platform is available for user's tier
  if (!isPlatformAvailable(user.tier, platform)) {
    return NextResponse.json({
      error: `${platform} is not available on ${user.tier} tier`,
      upgradeRequired: true,
    }, { status: 403 });
  }

  // Check platform limit
  const limitCheck = await checkPlatformLimit(user.profileId);
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: 'Platform limit reached',
      current: limitCheck.current,
      limit: limitCheck.limit,
      upgradeRequired: true,
    }, { status: 403 });
  }

  // Connect platform...
}
```

### Showing Upgrade Prompts in UI

```typescript
// components/UpgradePrompt.tsx
'use client';

import { useEffect, useState } from 'react';

export function UpgradePrompt() {
  const [tierInfo, setTierInfo] = useState(null);

  useEffect(() => {
    fetch('/api/tiers/current')
      .then(res => res.json())
      .then(setTierInfo);
  }, []);

  if (!tierInfo?.upgrade) return null;

  const { nextTier } = tierInfo.upgrade;

  return (
    <div className="upgrade-prompt">
      <h3>Upgrade to {nextTier.name}</h3>
      <p>Starting at ${nextTier.price.monthly}/month</p>
      <button onClick={() => window.location.href = '/upgrade'}>
        Upgrade Now
      </button>
    </div>
  );
}
```

### Checking Feature Access in Components

```typescript
// components/AICaptionButton.tsx
'use client';

import { useEffect, useState } from 'react';

export function AICaptionButton() {
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    fetch('/api/tiers/current')
      .then(res => res.json())
      .then(data => setHasAccess(data.features.aiCaptions));
  }, []);

  if (!hasAccess) {
    return (
      <button disabled title="Upgrade to Creator for AI Captions">
        🔒 AI Captions (Creator+)
      </button>
    );
  }

  return <button>Generate AI Caption</button>;
}
```

## Best Practices

1. **Always check authentication first** - Use `requireAuth()` before any tier checks.

2. **Use higher-order handlers** - Cleaner code with `withAuthHandler`, `withTierHandler`.

3. **Check limits before operations** - Prevent failed operations by checking limits upfront.

4. **Provide upgrade paths** - Include `upgradeUrl` in error responses for better UX.

5. **Cache usage data** - Consider caching `getUsageSummary()` results for performance.

6. **Handle downgrades gracefully** - Inform users about feature/limit changes before downgrade.
