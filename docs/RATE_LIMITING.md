# Rate Limiting

ReGenr implements tier-based rate limiting to ensure fair usage and protect the API from abuse.

## Overview

| Limit Type | FREE | CREATOR | PRO | Window |
|------------|------|---------|-----|--------|
| **Standard API** | 30/min | 60/min | 120/min | 1 minute |
| **Expensive Ops** | 5/min | 15/min | 30/min | 1 minute |
| **AI Generation** | 10/hr | 100/hr | 500/hr | 1 hour |
| **File Uploads** | 10/hr | 50/hr | 200/hr | 1 hour |
| **Auth Endpoints** | 10/15min | 10/15min | 10/15min | 15 minutes |

## Quick Start

### Simple Rate Limiting

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const { response } = await rateLimit(request);
  if (response) return response; // 429 Too Many Requests

  // Handle request...
  return NextResponse.json({ success: true });
}
```

### With Authentication and Tier-Based Limits

```typescript
import { withAuthAndRateLimit } from '@/lib/rate-limit';

export const POST = withAuthAndRateLimit(async (request, context, user) => {
  // user.profileId and user.tier are available
  // Rate limit is automatically based on user's tier
  return NextResponse.json({ userId: user.profileId });
});
```

### Preset Rate Limiters

```typescript
import {
  withStandardRateLimit,   // Default API limits
  withExpensiveRateLimit,  // Lower limits for expensive operations
  withAIRateLimit,         // AI/generation endpoints
  withUploadRateLimit,     // File upload endpoints
  withAuthRateLimit,       // Auth endpoints (IP-based)
} from '@/lib/rate-limit';

// Standard API endpoint
export const GET = withStandardRateLimit(async (request, context, user) => {
  return NextResponse.json({ data: '...' });
});

// AI generation endpoint
export const POST = withAIRateLimit(async (request, context, user) => {
  // Stricter limits: 10/hr (FREE), 100/hr (CREATOR), 500/hr (PRO)
  return NextResponse.json({ generated: '...' });
});

// File upload endpoint
export const POST = withUploadRateLimit(async (request, context, user) => {
  // Upload limits: 10/hr (FREE), 50/hr (CREATOR), 200/hr (PRO)
  return NextResponse.json({ uploaded: true });
});

// Auth endpoint (no auth required, IP-based)
export const POST = withAuthRateLimit(async (request, context) => {
  // 10 requests per 15 minutes per IP
  return NextResponse.json({ success: true });
});
```

## Manual Rate Limiting

For more control, use the rate limit functions directly:

```typescript
import { requireVerifiedIdentity } from '@/lib/security';
import { rateLimitByTier, DEFAULT_TIER_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const { identity, response: authResponse } = await requireVerifiedIdentity(request);
  if (authResponse) return authResponse;

  // 2. Check rate limit
  const { result, response: limitResponse } = await rateLimitByTier(
    request,
    identity.tier,
    identity.profileId
  );
  if (limitResponse) return limitResponse;

  // 3. Handle request
  const data = await processRequest();

  // 4. Return response with rate limit headers
  return NextResponse.json(data, {
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toString(),
    },
  });
}
```

## Custom Rate Limits

Create custom rate limit configurations:

```typescript
import { withAuthAndRateLimit, type TierRateLimits } from '@/lib/rate-limit';

// Custom limits for a specific endpoint
const CUSTOM_LIMITS: TierRateLimits = {
  FREE: { limit: 3, windowMs: 60000, name: 'custom' },
  CREATOR: { limit: 10, windowMs: 60000, name: 'custom' },
  PRO: { limit: 50, windowMs: 60000, name: 'custom' },
};

export const POST = withAuthAndRateLimit(
  async (request, context, user) => {
    return NextResponse.json({ success: true });
  },
  { config: CUSTOM_LIMITS, useTierLimits: true }
);
```

## Response Headers

All rate-limited responses include these headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp (ms) when window resets |

## Error Response (429)

When rate limit is exceeded:

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 30,
  "current": 31,
  "retryAfter": 45,
  "resetAt": "2024-01-15T12:00:45.000Z"
}
```

Headers:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705320045000
```

## Storage Backends

### In-Memory (Development)

Default for development. Data is lost on server restart.

```typescript
import { MemoryStore } from '@/lib/rate-limit';
const store = new MemoryStore();
```

### Redis (Production)

Required for production with multiple server instances.

```bash
# .env.local
REDIS_URL=redis://localhost:6379
```

The rate limiter automatically uses Redis when `REDIS_URL` is configured in production.

## API Endpoint

Get your current rate limit status:

```
GET /api/rate-limit
```

Response:
```json
{
  "tier": "CREATOR",
  "limits": {
    "api": {
      "name": "Standard API",
      "limit": 60,
      "windowMs": 60000,
      "windowDescription": "1 minute"
    },
    "expensive": {
      "name": "Expensive Operations",
      "limit": 15,
      "windowMs": 60000,
      "windowDescription": "1 minute"
    },
    "ai": {
      "name": "AI Generation",
      "limit": 100,
      "windowMs": 3600000,
      "windowDescription": "1 hour"
    },
    "upload": {
      "name": "File Uploads",
      "limit": 50,
      "windowMs": 3600000,
      "windowDescription": "1 hour"
    }
  }
}
```

## Best Practices

### 1. Use Appropriate Limit Types

```typescript
// Standard API calls
export const GET = withStandardRateLimit(handler);

// Database-heavy operations
export const POST = withExpensiveRateLimit(handler);

// AI/LLM calls (expensive, slow)
export const POST = withAIRateLimit(handler);

// File uploads (storage costs)
export const POST = withUploadRateLimit(handler);
```

### 2. Per-User vs Per-IP

```typescript
// Per-user (default for authenticated routes)
withAuthAndRateLimit(handler, { perUser: true });

// Per-IP (for public/auth routes)
withAuthAndRateLimit(handler, { perUser: false });

// Auth endpoints always use IP
withAuthRateLimit(handler);
```

### 3. Handle Rate Limits in Frontend

```typescript
async function fetchData() {
  const response = await fetch('/api/data');

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = data.retryAfter;

    showNotification(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    return;
  }

  // Read rate limit headers for UI
  const remaining = response.headers.get('X-RateLimit-Remaining');
  if (remaining && parseInt(remaining) < 5) {
    showWarning('Approaching rate limit');
  }

  return response.json();
}
```

### 4. Exempt Internal Services

```typescript
import { withRateLimit } from '@/lib/rate-limit';

export const POST = withRateLimit(
  handler,
  {
    limit: 100,
    windowMs: 60000,
    skip: (request) => {
      // Skip rate limiting for internal service calls
      const secret = request.headers.get('X-Internal-Secret');
      return secret === process.env.INTERNAL_SECRET;
    },
  }
);
```

## Module Structure

```
lib/rate-limit/
├── index.ts      # Public exports
├── store.ts      # Storage backends (Memory, Redis)
├── limiter.ts    # Core rate limiter logic
└── middleware.ts # Route handler wrappers
```

## Troubleshooting

### Rate limits not working in development

In-memory store resets on server restart. This is expected behavior.

### Rate limits not shared across instances

Configure Redis for production:
```bash
REDIS_URL=redis://your-redis-host:6379
```

### Getting rate limited too quickly

Check your tier and the endpoint's limit type:
```
GET /api/rate-limit
```

Consider upgrading to a higher tier for increased limits.
