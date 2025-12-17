# Security Requirements

This document outlines the security requirements and implementation patterns for ReGenr.

## Core Principles

### 1. Never Trust Frontend User IDs

**Rule**: User identity MUST always be derived from the authenticated Supabase session, NEVER from request parameters.

```typescript
// BAD - Never do this
export async function POST(request: NextRequest) {
  const { userId } = await request.json(); // DANGEROUS!
  await prisma.resource.create({
    data: { profileId: userId } // User can impersonate anyone!
  });
}

// GOOD - Always do this
import { requireVerifiedIdentity } from '@/lib/security';

export async function POST(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  // identity.profileId is safe - derived from session
  await prisma.resource.create({
    data: { profileId: identity.profileId }
  });
}
```

### 2. Always Derive Identity from Supabase Session

The `requireVerifiedIdentity()` function is the **ONLY** approved way to get user identity:

```typescript
import { requireVerifiedIdentity } from '@/lib/security';

export async function GET(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  // Safe to use - derived from authenticated session
  const profile = await prisma.profile.findUnique({
    where: { id: identity.profileId }
  });
}
```

The `VerifiedIdentity` object contains:
- `id` - Supabase user ID (auth.users.id)
- `profileId` - Profile ID (same as id in our schema)
- `email` - Verified email from Supabase
- `tier` - User's tier from profiles table
- `emailVerified` - Whether email is verified

### 3. Never Store Tokens in Frontend

OAuth tokens are:
- Encrypted with AES-256-GCM before storage
- Stored only in the server-side database
- Never sent to the frontend
- Accessed only through server-side API routes

```typescript
// The frontend only stores the session cookie
// Managed automatically by Supabase

// To check if a platform is connected:
const response = await fetch('/api/oauth/instagram/status');
const { connected } = await response.json();

// To use platform APIs, call server-side routes:
const response = await fetch('/api/instagram/posts', {
  method: 'POST',
  body: JSON.stringify({ content: '...' })
});
// Server handles token retrieval, refresh, and API calls
```

### 4. Service Role Key is Server-Only

The `SUPABASE_SERVICE_ROLE_KEY`:
- Bypasses Row Level Security
- Must NEVER have `NEXT_PUBLIC_` prefix
- Only accessible in server-side code
- Protected by `server-only` package

```typescript
// lib/supabase/server.ts is protected
import 'server-only';

// Attempting to import on client will throw:
// Error: This module cannot be imported from a Client Component module.
```

## Implementation

### Security Module Location

```
lib/security/
├── index.ts          # Exports
├── server-only.ts    # Server-only utilities
├── identity.ts       # User identity derivation
└── env-check.ts      # Environment validation
```

### Verified Identity Pattern

```typescript
import {
  requireVerifiedIdentity,
  requireVerifiedIdentityWithTier,
  verifyOwnership,
  requireOwnership,
} from '@/lib/security';

// Basic authentication
export async function GET(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  // identity is verified
}

// With tier requirement
export async function POST(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentityWithTier(
    request,
    'CREATOR'
  );
  if (response) return response;

  // identity is verified and has CREATOR tier or higher
}

// Verify resource ownership
export async function PUT(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId }
  });

  // Verify user owns this resource
  const ownershipError = requireOwnership(identity, resource.profileId);
  if (ownershipError) return ownershipError;

  // Safe to modify
}
```

### Environment Validation

Validate security environment on startup:

```typescript
import { requireValidEnv } from '@/lib/security';

// In instrumentation.ts or app startup
requireValidEnv();
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `DATABASE_URL` - PostgreSQL connection (server-only)
- `OAUTH_ENCRYPTION_KEY` - Token encryption key (server-only)

Server-only (optional):
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations

### Development Security Warnings

In development, the security module will warn about:

```
========== SECURITY WARNING ==========
  Request contains userId/profileId in query params.
  These values MUST NOT be trusted.
  Use identity from session instead.
========================================
```

If request body contains `userId` or `profileId`:
```
========== SECURITY WARNINGS ==========
  SECURITY: Request body contains "userId".
  User identity should be derived from session, not request body.
========================================
```

## Middleware Route Protection

Next.js middleware provides the first line of defense for route protection.

### How It Works

```
Request → Middleware → Route Handler → Response
              ↓
         1. Session refresh
         2. Auth check
         3. Tier check
         4. Email verification
```

### Configuration

Routes are configured in `lib/middleware/config.ts`:

```typescript
// Public routes - no auth required
export const PUBLIC_ROUTES = [
  { path: '/' },
  { path: '/login' },
  { path: '/api/auth', prefix: true },
];

// Protected routes - auth required
export const PROTECTED_ROUTES = [
  { path: '/dashboard', prefix: true },
  { path: '/settings', prefix: true, requireVerifiedEmail: true },
  { path: '/generate', prefix: true, requiredTier: 'CREATOR' },
  { path: '/team', prefix: true, requiredTier: 'PRO' },
];
```

### Route Protection Levels

| Route | Auth | Verified Email | Tier |
|-------|------|----------------|------|
| `/` | - | - | - |
| `/dashboard` | Required | - | - |
| `/settings` | Required | Required | - |
| `/generate` | Required | - | Creator+ |
| `/team` | Required | - | Pro |

### Middleware Behavior

**For page routes:**
- Unauthenticated → Redirect to `/login?redirectTo=...`
- Email not verified → Redirect to `/verify-email?redirectTo=...`
- Tier too low → Redirect to `/pricing?requiredTier=...`

**For API routes:**
- Unauthenticated → `401 { error: "Authentication required" }`
- Email not verified → `403 { code: "EMAIL_NOT_VERIFIED" }`
- Tier too low → `403 { code: "TIER_REQUIRED", requiredTier, currentTier }`

### Defense in Depth

Middleware is the first check, but API routes should still validate:

```typescript
// Middleware already checked auth, but we verify again
export async function POST(request: NextRequest) {
  // This provides defense-in-depth
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  // Now safe to proceed
}
```

### Adding New Protected Routes

1. Add to `lib/middleware/config.ts`:
```typescript
export const PROTECTED_ROUTES = [
  // Existing routes...
  { path: '/new-feature', prefix: true, requiredTier: 'CREATOR' },
];
```

2. The middleware will automatically enforce the protection.

## Row Level Security

Database-level security using Supabase RLS:

```sql
-- Users can only read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can only access their own OAuth connections
CREATE POLICY "oauth_connections_select_own"
  ON public.oauth_connections FOR SELECT
  USING (auth.uid() = profile_id);
```

RLS provides defense-in-depth: even if API code has a bug, database won't return unauthorized data.

## API Route Security Checklist

When creating a new API route:

- [ ] Import `requireVerifiedIdentity` from `@/lib/security`
- [ ] Call `requireVerifiedIdentity(request)` first
- [ ] Return `response` if authentication failed
- [ ] Use `identity.profileId` for database queries
- [ ] Never use `userId` from request body or query params
- [ ] Verify ownership for resource operations
- [ ] Check tier if feature requires paid tier

## Secure Patterns

### Creating Resources

```typescript
export async function POST(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  const { title, content } = await request.json();

  // Use identity.profileId, not userId from body
  const resource = await prisma.resource.create({
    data: {
      profileId: identity.profileId, // Safe
      title,
      content,
    }
  });

  return NextResponse.json(resource);
}
```

### Reading Resources

```typescript
export async function GET(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  // Only return user's own resources
  const resources = await prisma.resource.findMany({
    where: { profileId: identity.profileId }
  });

  return NextResponse.json(resources);
}
```

### Updating Resources

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  const { id } = await params;
  const { title, content } = await request.json();

  // Update only if user owns the resource
  const resource = await prisma.resource.updateMany({
    where: {
      id,
      profileId: identity.profileId, // Ensures ownership
    },
    data: { title, content }
  });

  if (resource.count === 0) {
    return NextResponse.json(
      { error: 'Resource not found or access denied' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
```

### Deleting Resources

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  const { id } = await params;

  // Delete only if user owns the resource
  const result = await prisma.resource.deleteMany({
    where: {
      id,
      profileId: identity.profileId, // Ensures ownership
    }
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: 'Resource not found or access denied' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
```

## OAuth Token Security

OAuth tokens are protected:

1. **Encrypted at rest**: AES-256-GCM encryption
2. **Server-only access**: Tokens never sent to frontend
3. **Automatic refresh**: Server handles token refresh
4. **Scoped queries**: RLS ensures users only access their tokens

```typescript
// OAuth tokens are managed server-side
import { getAccessToken } from '@/lib/oauth';

// This is server-only code
const accessToken = await getAccessToken(profileId, 'instagram');
// Token is decrypted only when needed for API calls
```

## Testing Security

### Manual Testing

1. Try to access resources without authentication
2. Try to access another user's resources
3. Try passing userId in request body
4. Try to import server-only modules in client components

### Automated Testing

```typescript
describe('Security', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await fetch('/api/resources');
    expect(response.status).toBe(401);
  });

  it('rejects access to other users resources', async () => {
    // Authenticate as user A
    // Try to access user B's resource
    // Should return 404 or 403
  });

  it('ignores userId in request body', async () => {
    // Authenticate as user A
    // Send request with userId: userB.id in body
    // Resource should be created with user A's ID
  });
});
```

## Security Incident Response

If you discover a security issue:

1. Do NOT commit the fix publicly first
2. Document the issue privately
3. Assess impact (what data could be accessed?)
4. Develop and test fix locally
5. Deploy fix
6. Audit logs for exploitation
7. Consider disclosure if user data was affected
