# Supabase Authentication Setup

This document describes how to configure Supabase Authentication for the ReGenr application.

## Overview

ReGenr uses Supabase Auth as the primary user authentication system. This integrates with:
- **Supabase Auth**: Handles user identity (sign-up, sign-in, sessions)
- **PostgreSQL/Prisma**: Stores extended user profiles and application data
- **Universal OAuth Engine**: Connects users to social platforms (Meta, TikTok, etc.)

## Architecture

```
User
  |
  v
Supabase Auth (identity & sessions)
  |
  v
Profile Table (extended user data, linked by UUID)
  |
  v
OAuth Connections (social platform tokens, linked to Profile)
```

## 1. Supabase Project Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `regen-app` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Select the closest to your users
5. Click "Create new project"

### Get Your API Keys

After project creation, go to **Project Settings > API**:

- **Project URL**: `https://your-project.supabase.co`
- **Anon Public Key**: `eyJhbGc...` (safe to expose in browser)
- **Service Role Key**: `eyJhbGc...` (keep secret, server-side only)

## 2. Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database URL (from Supabase Dashboard > Settings > Database)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

For production, also add:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Authentication Providers

### Email/Password (Default)

Email authentication is enabled by default. Configure in **Authentication > Providers > Email**:

- [x] Enable Email provider
- [ ] Confirm email (optional - enable for production)
- [x] Enable Sign-ups

### Magic Link

No additional configuration needed - uses the same Email provider.

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services > OAuth consent screen**
   - User Type: External
   - App name: ReGenr
   - User support email: your email
   - Developer contact: your email
4. Navigate to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**
   - Application type: Web application
   - Name: ReGenr Web
   - Authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
6. Copy the Client ID and Client Secret

In Supabase Dashboard (**Authentication > Providers > Google**):
- [x] Enable Google provider
- Client ID: (paste from Google)
- Client Secret: (paste from Google)

### Apple OAuth

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles > Identifiers**
3. Click **+** to register a new App ID
4. Select **App IDs** and continue
5. Enter Description and Bundle ID
6. Enable **Sign In with Apple** capability
7. Go to **Keys** and create a new key
   - Enable **Sign in with Apple**
   - Configure with your App ID
8. Download the key file

In Supabase Dashboard (**Authentication > Providers > Apple**):
- [x] Enable Apple provider
- Client ID: Your App's Bundle ID (e.g., `com.regen.app`)
- Secret Key: Contents of the `.p8` key file
- Additional fields as required

## 4. URL Configuration

In Supabase Dashboard (**Authentication > URL Configuration**):

**Site URL** (for email confirmations):
```
http://localhost:3000  (development)
https://your-domain.com  (production)
```

**Redirect URLs** (allowed OAuth callbacks):
```
http://localhost:3000/auth/callback
http://localhost:3000/api/auth/**
https://your-domain.com/auth/callback
https://your-domain.com/api/auth/**
```

## 5. Database Schema

The application uses Prisma to manage the database schema. The `Profile` table links to Supabase's `auth.users`:

```prisma
model Profile {
  id          String   @id @db.Uuid  // UUID from Supabase auth.users.id
  email       String   @unique
  displayName String?  @map("display_name")
  avatarUrl   String?  @map("avatar_url")
  tier        UserTier @default(FREE)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  oauthConnections OAuthConnection[]
  // ... other relations

  @@map("profiles")
}

enum UserTier {
  FREE
  CREATOR
  PRO
  @@map("user_tier")
}
```

### Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Or use migrations for production
npx prisma migrate dev
```

## 6. Authentication Flow

### Sign Up (Email/Password)

```
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

1. Creates user in Supabase Auth
2. Creates Profile record in database
3. Sends confirmation email (if enabled)

### Sign In (Email/Password)

```
POST /api/auth/signin
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Sign In (Magic Link)

```
POST /api/auth/magic-link
{
  "email": "user@example.com"
}
```

Sends a login link to the user's email.

### OAuth Sign In

```
GET /api/auth/oauth?provider=google&redirectTo=/dashboard
```

Or:

```
POST /api/auth/oauth
{
  "provider": "google",
  "redirectTo": "/dashboard"
}
```

### Sign Out

```
POST /api/auth/signout
```

## 7. Protected Routes

The middleware (`middleware.ts`) protects routes automatically:

**Protected Routes** (require authentication):
- `/dashboard`
- `/settings`
- `/upload`
- `/schedule`
- `/analytics`
- `/generate`

**Public Routes** (no authentication):
- `/`
- `/login`
- `/signup`
- `/auth/callback`
- `/share/*`
- Static files

### API Route Protection

API routes that aren't in the public list return 401:

```typescript
// In your route handler
import { requireUser, requireUserId } from '@/lib/auth/getUser';

export async function GET(request: NextRequest) {
  const user = await requireUser(request);  // Throws if not authenticated
  // or
  const userId = await requireUserId(request);  // Just get the ID

  // ... rest of handler
}
```

## 8. Integration with OAuth Engine

After Supabase authentication, users can connect social platforms:

```
User authenticates with Supabase
  |
  v
GET /api/auth/meta/start
  |
  v
User completes Meta OAuth
  |
  v
GET /api/auth/meta/callback
  |
  v
Tokens stored in OAuthConnection (linked to Profile)
```

The OAuth engine uses the Supabase user ID (which equals the Profile ID) to associate social connections.

## 9. Session Management

Sessions are automatically managed by Supabase Auth:

- **Access Token**: JWT, refreshed automatically
- **Refresh Token**: Used to get new access tokens
- **Session Cookie**: HttpOnly, managed by `@supabase/ssr`

The middleware refreshes sessions on each request.

## 10. Testing

### Development Mode

In development, you can bypass auth using environment variables:

```env
DISABLE_AUTH=true
```

Or pass a userId query parameter:

```
GET /api/auth/meta/start?userId=test-user-123
```

### Test Users

Create test users via the Supabase Dashboard:
1. Go to **Authentication > Users**
2. Click **Add user**
3. Enter email and password

## 11. Row Level Security (RLS)

RLS ensures users can only access their own data at the database level. This is critical when using Supabase client-side or for defense-in-depth.

### Enable RLS

After running Prisma migrations, apply RLS policies:

```bash
# Apply RLS policies
psql $DATABASE_URL -f prisma/migrations/rls/001_enable_rls.sql
```

### Key Policies

| Table | Policy |
|-------|--------|
| profiles | Users can read/update only their own profile |
| oauth_connections | Users can only access their own OAuth connections |
| content_uploads | Own content + team content (Pro users) |
| scheduled_posts | Own posts + team posts (Pro users) |

### Example Policy

```sql
-- Users can only read their own OAuth connections
CREATE POLICY "oauth_connections_select_own"
  ON public.oauth_connections
  FOR SELECT
  USING (auth.uid() = profile_id);
```

See [Row Level Security Documentation](./ROW_LEVEL_SECURITY.md) for complete details.

## 12. Security Considerations

1. **Never expose Service Role Key** - Only use on server-side
2. **Enable Row Level Security (RLS)** - See section 11 above
3. **Use HTTPS in production** - Required for secure cookies
4. **Enable email confirmation** - Prevents fake accounts
5. **Set proper CORS** - Restrict allowed origins

## 13. Troubleshooting

### "Invalid login credentials"
- Check email/password are correct
- Verify user exists in Supabase Dashboard

### "Email not confirmed"
- Check spam folder
- Resend confirmation from Supabase Dashboard
- Or disable confirmation for development

### OAuth redirect errors
- Verify redirect URLs in Supabase Dashboard
- Check `NEXT_PUBLIC_APP_URL` matches actual URL
- Ensure OAuth provider is configured correctly

### Session not persisting
- Check cookies are being set (HttpOnly)
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check middleware is running

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Auth Helpers](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Row Level Security](./ROW_LEVEL_SECURITY.md)
- [OAuth Backend Documentation](./OAUTH_BACKEND.md)
