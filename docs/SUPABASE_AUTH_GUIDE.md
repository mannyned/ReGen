# Supabase Authentication Guide for ReGenr

Complete setup guide for Supabase Auth with Next.js App Router, Prisma, and Row Level Security.

---

## 1. Dashboard Setup Checklist

### Supabase Dashboard Configuration

- [ ] **Create Supabase Project**
  - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
  - Click "New Project"
  - Note your Project URL and API keys

- [ ] **Configure Authentication Providers**
  - Navigate: Authentication → Providers
  - Enable Email provider (default)
  - Optional: Enable OAuth providers (Google, GitHub, etc.)

- [ ] **Set Site URL**
  - Navigate: Authentication → URL Configuration
  - Site URL: `http://localhost:3000` (dev) or your production URL
  - Add redirect URLs:
    ```
    http://localhost:3000/auth/callback
    https://yourdomain.com/auth/callback
    ```

- [ ] **Enable Email Confirmations (Recommended)**
  - Navigate: Authentication → Email Templates
  - Enable "Confirm email" for new signups
  - Customize email templates as needed

- [ ] **Configure Session Settings**
  - Navigate: Authentication → Settings
  - JWT expiry: 3600 seconds (1 hour) recommended
  - Enable "Refresh Token Rotation"

- [ ] **Get API Keys**
  - Navigate: Settings → API
  - Copy: `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - Copy: `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Copy: `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Get Database Connection String**
  - Navigate: Settings → Database
  - Copy: Connection string (URI) → `DATABASE_URL`
  - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

### Environment Variables (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
```

---

## 2. Prisma Schema

The Profile model links to Supabase's `auth.users` table:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Profile table - linked to Supabase auth.users
// The id is a UUID that matches auth.users.id from Supabase
model Profile {
  id          String   @id @db.Uuid  // UUID from Supabase auth.users.id
  email       String   @unique
  displayName String?  @map("display_name")
  avatarUrl   String?  @map("avatar_url")
  tier        UserTier @default(FREE)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Stripe subscription fields
  stripeCustomerId         String?   @unique @map("stripe_customer_id")
  stripeSubscriptionId     String?   @unique @map("stripe_subscription_id")
  stripeSubscriptionStatus SubscriptionStatus? @map("stripe_subscription_status")

  // Relations
  socialConnections  SocialConnection[]
  contentUploads     ContentUpload[]
  // ... other relations

  @@index([stripeCustomerId])
  @@map("profiles")
}

enum UserTier {
  FREE
  CREATOR
  PRO
  @@map("user_tier")
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
  TRIALING
  INCOMPLETE
  INCOMPLETE_EXPIRED
  @@map("subscription_status")
}
```

### Auto-Create Profile on Signup

Create a Supabase Database Function to automatically create a profile when a user signs up:

```sql
-- Run this in Supabase SQL Editor

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, tier, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'FREE',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 3. Row Level Security (RLS) Policies

Enable RLS and create policies for each table:

```sql
-- Run this in Supabase SQL Editor

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do anything (for admin operations)
CREATE POLICY "Service role has full access"
  ON profiles
  USING (auth.jwt()->>'role' = 'service_role');


-- ============================================
-- SOCIAL CONNECTIONS TABLE
-- ============================================

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own connections
CREATE POLICY "Users can manage own social connections"
  ON social_connections FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);


-- ============================================
-- CONTENT UPLOADS TABLE
-- ============================================

ALTER TABLE content_uploads ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own uploads
CREATE POLICY "Users can manage own content uploads"
  ON content_uploads FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);


-- ============================================
-- SCHEDULED POSTS TABLE
-- ============================================

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled posts"
  ON scheduled_posts FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);


-- ============================================
-- NOTIFICATION LOGS TABLE
-- ============================================

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notification_logs FOR SELECT
  USING (auth.uid() = profile_id);

-- Only service role can insert (system-generated)
CREATE POLICY "Service role can insert notifications"
  ON notification_logs FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

### Verify RLS is Working

```sql
-- Check RLS status for all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 4. Next.js Auth Utilities

### Server Client (`lib/supabase/server.ts`)

```typescript
import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  );
}

// Admin client (bypasses RLS)
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### Middleware Client (`lib/supabase/middleware.ts`)

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export function createClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  return { supabase, response };
}
```

### Browser Client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Identity Verification (`lib/security/identity.ts`)

```typescript
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import type { UserTier } from '@prisma/client';

export interface VerifiedIdentity {
  readonly id: string;
  readonly profileId: string;
  readonly email: string;
  readonly tier: UserTier;
  readonly emailVerified: boolean;
}

export interface IdentityResult {
  identity: VerifiedIdentity | null;
  response: NextResponse | null;
}

// Get verified identity from session
export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  const supabase = await createClient();

  // IMPORTANT: Use getUser() not getSession()
  // getUser() validates JWT with Supabase server
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Get tier from profile
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { tier: true },
  });

  return {
    id: user.id,
    profileId: user.id,
    email: user.email || '',
    tier: profile?.tier || 'FREE',
    emailVerified: user.email_confirmed_at !== null,
  };
}

// Require verified identity or return 401
export async function requireVerifiedIdentity(
  request: NextRequest
): Promise<IdentityResult> {
  const identity = await getVerifiedIdentity();

  if (!identity) {
    return {
      identity: null,
      response: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  return { identity, response: null };
}

// Verify resource ownership
export function verifyOwnership(
  identity: VerifiedIdentity,
  resourceProfileId: string
): boolean {
  return identity.profileId === resourceProfileId;
}
```

---

## 5. Example API Routes

### Basic Authenticated Route

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHandler, successResponse } from '@/lib/api';
import { prisma } from '@/lib/db';

// GET /api/profile - Get current user's profile
export const GET = createHandler(
  async (request, context, user) => {
    const profile = await prisma.profile.findUnique({
      where: { id: user.profileId }, // SAFE: from session
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        tier: true,
        createdAt: true,
      },
    });

    return successResponse({ profile });
  },
  { auth: true }  // Requires authentication
);

// PATCH /api/profile - Update profile
export const PATCH = createHandler(
  async (request, context, user) => {
    const body = await request.json();

    const profile = await prisma.profile.update({
      where: { id: user.profileId }, // SAFE: from session
      data: {
        displayName: body.displayName,
        avatarUrl: body.avatarUrl,
      },
    });

    return successResponse({ profile });
  },
  { auth: true }
);
```

### Route with Tier Requirement

```typescript
// app/api/export/route.ts
import { createHandler, successResponse } from '@/lib/api';

// Only PRO users can export
export const POST = createHandler(
  async (request, context, user) => {
    // User is verified PRO tier
    const exportData = await generateExport(user.profileId);
    return successResponse({ exportData });
  },
  { auth: true, requiredTier: 'PRO' }
);
```

### Route with Rate Limiting

```typescript
// app/api/ai/generate/route.ts
import { createHandler, successResponse } from '@/lib/api';

export const POST = createHandler(
  async (request, context, user) => {
    const body = await request.json();
    const result = await generateAIContent(body.prompt);
    return successResponse({ result });
  },
  { auth: true, rateLimit: true }
);
```

### Manual Auth Check (Without Helper)

```typescript
// app/api/manual-example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  // IMPORTANT: Always use getUser(), never getSession()
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // user.id is SAFE - derived from verified JWT
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  return NextResponse.json({ profile });
}
```

---

## 6. Common Auth Mistakes and Fixes

### Mistake 1: Using `getSession()` Instead of `getUser()`

```typescript
// WRONG - getSession() only reads cookies, doesn't validate
const { data: { session } } = await supabase.auth.getSession();
const userId = session?.user?.id; // NOT VALIDATED!

// CORRECT - getUser() validates JWT with Supabase
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id; // Validated by Supabase server
```

### Mistake 2: Trusting User-Provided IDs

```typescript
// WRONG - Never trust IDs from request body/params
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId'); // DANGEROUS!

  const data = await prisma.profile.findUnique({
    where: { id: userId }, // INSECURE!
  });
}

// CORRECT - Always derive identity from session
export async function GET(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  const data = await prisma.profile.findUnique({
    where: { id: identity.profileId }, // SAFE!
  });
}
```

### Mistake 3: Missing Ownership Checks

```typescript
// WRONG - User can access any resource by ID
export async function GET(request: NextRequest, { params }) {
  const postId = params.id;
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });
  return NextResponse.json({ post }); // Anyone can see any post!
}

// CORRECT - Verify ownership
export async function GET(request: NextRequest, { params }) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  const postId = (await params).id;
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  // Verify user owns this resource
  if (!post || post.profileId !== identity.profileId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ post });
}
```

### Mistake 4: Exposing Service Role Key

```typescript
// WRONG - Service role key in client code
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

// CORRECT - Only use service role in server-only code
import 'server-only'; // Add this to prevent client import
import { createAdminClient } from '@/lib/supabase/server';

const admin = createAdminClient(); // Only in API routes
```

### Mistake 5: Missing Middleware Session Refresh

```typescript
// WRONG - No middleware = sessions expire without refresh
// Users get logged out unexpectedly

// CORRECT - Always have middleware that refreshes sessions
// middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // This call refreshes the session if needed
  await supabase.auth.getUser();

  return response; // Response includes updated cookies
}
```

### Mistake 6: Not Checking Email Verification

```typescript
// WRONG - Allowing unverified emails for sensitive actions
export async function POST(request: NextRequest) {
  const { identity } = await requireVerifiedIdentity(request);
  // User might have unverified email!
  await sendEmailToContacts(identity.email);
}

// CORRECT - Check email verification for sensitive actions
export async function POST(request: NextRequest) {
  const { identity, response } = await requireVerifiedIdentity(request);
  if (response) return response;

  if (!identity.emailVerified) {
    return NextResponse.json(
      { error: 'Email verification required' },
      { status: 403 }
    );
  }

  await sendEmailToContacts(identity.email);
}
```

### Mistake 7: RLS Disabled or Misconfigured

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- If rowsecurity is false, ENABLE IT:
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## Quick Reference

### API Route Auth Pattern

```typescript
import { createHandler, successResponse } from '@/lib/api';

export const GET = createHandler(
  async (request, context, user) => {
    // user.profileId is ALWAYS safe to use
    return successResponse({ userId: user.profileId });
  },
  { auth: true }
);
```

### Server Component Auth Pattern

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <div>Welcome {user.email}</div>;
}
```

### Client Component Auth Pattern

```typescript
'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function ClientComponent() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  return user ? <div>Logged in</div> : <div>Not logged in</div>;
}
```
