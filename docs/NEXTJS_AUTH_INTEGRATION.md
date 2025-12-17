# Next.js Authentication Integration

Complete guide for using Supabase authentication in your Next.js application.

## Overview

This guide covers:
- Browser client (`createBrowserClient`) for Client Components
- Server client (`createServerClient`) for Route Handlers & Server Components
- Getting current user in API routes
- Enforcing authentication in `/api/auth/[provider]/*`
- Redirecting unauthenticated users

## Client Types

| Client | Use Case | Import Path |
|--------|----------|-------------|
| Browser | Client Components | `@/lib/supabase/client` |
| Server | Route Handlers, Server Components | `@/lib/supabase/server` |
| Middleware | Next.js Middleware | `@/lib/supabase/middleware` |
| Admin | Background jobs (bypasses RLS) | `@/lib/supabase/server` |

## 1. Browser Client (Client Components)

For components with `'use client'` directive.

### Basic Usage

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';

export function MyComponent() {
  const supabase = createClient();

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return <button onClick={handleSignIn}>Sign In</button>;
}
```

### Using the useAuth Hook (Recommended)

```tsx
'use client';

import { useAuth } from '@/lib/supabase/hooks/useAuth';

export function ProfileButton() {
  const { user, loading, signOut, signInWithOAuth } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <button onClick={() => signInWithOAuth('google')}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      <span>{user.email}</span>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### useAuth Hook API

```typescript
interface UseAuthReturn {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;

  // Methods
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}
```

## 2. Server Client (Route Handlers)

For API routes and Server Components.

### Basic Usage in Route Handler

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Query database (RLS applies automatically)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ profile });
}
```

### Using Auth Guards (Recommended)

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Returns user or error response
  const { user, response } = await withAuth(request);

  // If response exists, auth failed - return it
  if (response) return response;

  // user is guaranteed to be authenticated here
  return NextResponse.json({
    profileId: user.profileId,
    email: user.email,
    tier: user.tier,
  });
}
```

### With Tier Requirements

```typescript
// app/api/premium/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Requires PRO tier
  const { user, response } = await withAuth(request, {
    requiredTier: 'PRO',
  });

  if (response) return response;

  return NextResponse.json({ premium: true });
}
```

### Higher-Order Handler Pattern

```typescript
// app/api/data/route.ts
import { NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth';

// Wrap your handler - auth is checked automatically
export const GET = withAuthHandler(async (request, context, user) => {
  // user is guaranteed to be authenticated
  return NextResponse.json({
    userId: user.profileId,
    tier: user.tier,
  });
});

// With tier requirement
export const POST = withAuthHandler(
  async (request, context, user) => {
    const body = await request.json();
    return NextResponse.json({ created: true });
  },
  { requiredTier: 'CREATOR' }
);
```

## 3. Getting Current User in API Routes

### Method 1: withAuth (Recommended)

```typescript
import { withAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  // user.profileId - UUID matching Supabase auth.users.id
  // user.email - User's email
  // user.tier - User's subscription tier
  // user.user - Full Supabase User object
}
```

### Method 2: getUser (Simple)

```typescript
import { getUser, requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Returns null if not authenticated
  const user = await getUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Or use requireUser to throw instead
  const user = await requireUser(request); // Throws NotAuthenticatedError
}
```

### Method 3: Direct Supabase

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // user.id is the profile ID
}
```

## 4. Enforcing Auth in /api/auth/[provider]/*

The OAuth routes must verify the user is authenticated before allowing social connections.

### Example: Start Route

```typescript
// app/api/auth/[provider]/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { OAuthEngine, isProviderRegistered } from '@/lib/oauth/engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isProviderRegistered(provider)) {
    return NextResponse.json(
      { error: 'Unknown provider', code: 'UNKNOWN_PROVIDER' },
      { status: 400 }
    );
  }

  // Enforce authentication
  const { user, response } = await withAuth(request);
  if (response) return response;

  // Start OAuth flow with authenticated user's profile ID
  const { authUrl } = await OAuthEngine.startOAuth(provider, user.profileId);

  return NextResponse.redirect(authUrl);
}
```

### Example: Status Route

```typescript
// app/api/auth/[provider]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth';
import { OAuthEngine } from '@/lib/oauth/engine';

export const GET = withAuthHandler(async (request, { params }, user) => {
  const { provider } = await params;

  const status = await OAuthEngine.getConnectionStatus(provider, user.profileId);

  return NextResponse.json({
    ...status,
    expiresAt: status.expiresAt?.toISOString() || null,
  });
});
```

### Example: Disconnect Route

```typescript
// app/api/auth/[provider]/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth';
import { OAuthEngine } from '@/lib/oauth/engine';

export const POST = withAuthHandler(async (request, { params }, user) => {
  const { provider } = await params;

  await OAuthEngine.disconnectProvider(provider, user.profileId);

  return NextResponse.json({
    success: true,
    message: `Disconnected from ${provider}`,
  });
});
```

## 5. Redirecting Unauthenticated Users

### Middleware (Automatic)

The middleware handles redirects for protected routes:

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/upload'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if accessing protected route without auth
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}
```

### Client-Side Redirect

```tsx
'use client';

import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedPage({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirectTo=' + window.location.pathname);
    }
  }, [loading, user, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null; // Will redirect

  return <>{children}</>;
}
```

### Using ProtectedContent Component

```tsx
import { ProtectedContent } from '@/components/auth';
import { LoginForm } from '@/components/auth';

export default function DashboardPage() {
  return (
    <ProtectedContent
      redirectTo="/login"
      loadingComponent={<div>Loading...</div>}
    >
      <Dashboard />
    </ProtectedContent>
  );
}
```

### API Route Redirect

```typescript
import { withAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);

  if (response) {
    // Option 1: Return JSON error
    return response;

    // Option 2: Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Continue with authenticated user
}
```

## 6. Auth Guard Options

```typescript
interface AuthGuardOptions {
  /** Required tier (FREE, CREATOR, PRO) */
  requiredTier?: UserTier;

  /** Custom unauthorized message */
  unauthorizedMessage?: string;

  /** Custom forbidden message */
  forbiddenMessage?: string;

  /** Allow development mode bypass (default: true) */
  allowDevBypass?: boolean;
}
```

### Tier Requirements

```typescript
// Requires CREATOR or higher
const { user, response } = await withAuth(request, {
  requiredTier: 'CREATOR',
});

// Tier hierarchy: FREE < CREATOR < PRO
```

### Custom Error Messages

```typescript
const { user, response } = await withAuth(request, {
  unauthorizedMessage: 'Please sign in to access this feature',
  forbiddenMessage: 'Upgrade to Pro to unlock this feature',
});
```

## 7. Development Mode

In development, you can bypass auth for testing:

### Environment Variable

```env
DISABLE_AUTH=true
```

### Query Parameter

```
GET /api/profile?userId=test-user-123
```

### Disable Bypass

```typescript
const { user, response } = await withAuth(request, {
  allowDevBypass: false, // Always require real auth
});
```

## 8. Complete Example: Protected API Route

```typescript
// app/api/dashboard/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  // 1. Enforce authentication
  const { user, response } = await withAuth(request);
  if (response) return response;

  // 2. User is authenticated - get their data
  const [profile, connections, uploads] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.profileId },
    }),
    prisma.oAuthConnection.findMany({
      where: { profileId: user.profileId },
      select: { provider: true, providerAccountId: true, expiresAt: true },
    }),
    prisma.contentUpload.findMany({
      where: { profileId: user.profileId },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    profile,
    connections,
    recentUploads: uploads,
  });
}

export async function POST(request: NextRequest) {
  // Require CREATOR tier for posting
  const { user, response } = await withAuth(request, {
    requiredTier: 'CREATOR',
  });
  if (response) return response;

  const body = await request.json();

  // Create content...
  const upload = await prisma.contentUpload.create({
    data: {
      profileId: user.profileId,
      ...body,
    },
  });

  return NextResponse.json({ upload }, { status: 201 });
}
```

## Related Documentation

- [Supabase Authentication](./SUPABASE_AUTH.md)
- [Row Level Security](./ROW_LEVEL_SECURITY.md)
- [OAuth Backend](./OAUTH_BACKEND.md)
