# ReGenr Universal OAuth Backend

Production-ready OAuth backend for connecting multiple social media platforms.

## Architecture Overview

```
lib/
├── oauth/
│   ├── engine.ts      # Universal OAuth flow orchestration
│   ├── types.ts       # TypeScript type definitions
│   └── errors.ts      # Custom error classes
├── providers/
│   ├── index.ts       # Provider exports & registration
│   ├── meta.ts        # Meta (Facebook/Instagram) - FULL
│   ├── tiktok.ts      # TikTok - SCAFFOLD
│   ├── google.ts      # Google (YouTube) - SCAFFOLD
│   ├── x.ts           # X (Twitter) - SCAFFOLD
│   └── linkedin.ts    # LinkedIn - SCAFFOLD
├── crypto/
│   └── encrypt.ts     # AES-256-GCM token encryption
├── auth/
│   └── getUser.ts     # User authentication utilities
└── db.ts              # Prisma client singleton

app/api/auth/[provider]/
├── start/route.ts     # Initiate OAuth flow
├── callback/route.ts  # Handle provider callback
├── status/route.ts    # Check connection status
├── disconnect/route.ts # Remove connection
└── refresh/route.ts   # Refresh tokens
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env.local`:
```env
TOKEN_ENCRYPTION_KEY=<your-64-char-hex-key>
DATABASE_URL=postgresql://user:pass@localhost:5432/regenr
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Configure OAuth Providers

See [Provider Setup](#provider-setup) for each platform.

## API Endpoints

### Start OAuth Flow

```
GET /api/auth/[provider]/start
```

Redirects user to provider's authorization page.

**Query Parameters (development only):**
- `userId` - User ID for testing

**Response:** Redirect to provider

### Handle Callback

```
GET /api/auth/[provider]/callback
```

Handles OAuth callback, exchanges code for tokens, stores encrypted.

**Query Parameters (from provider):**
- `code` - Authorization code
- `state` - CSRF token

**Response:** Redirect to `/settings/integrations?connected=[provider]`

### Check Connection Status

```
GET /api/auth/[provider]/status
```

**Response:**
```json
{
  "connected": true,
  "provider": "meta",
  "providerAccountId": "123456789",
  "expiresAt": "2025-03-15T00:00:00.000Z",
  "scopes": ["pages_show_list", "instagram_basic"],
  "displayName": "John Doe"
}
```

### Disconnect Provider

```
POST /api/auth/[provider]/disconnect
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully disconnected meta"
}
```

### Refresh Tokens

```
POST /api/auth/[provider]/refresh
```

**Response:**
```json
{
  "success": true,
  "expiresAt": "2025-03-15T00:00:00.000Z",
  "expiresIn": 5184000
}
```

## Provider Setup

### Meta (Facebook/Instagram)

1. Create app at [Facebook Developers](https://developers.facebook.com/apps)
2. Add **Facebook Login** product
3. Configure OAuth settings:
   - Valid OAuth Redirect URIs: `https://yourdomain.com/api/auth/meta/callback`
4. Add required permissions:
   - `pages_show_list`
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `business_management`

```env
META_CLIENT_ID=your_app_id
META_CLIENT_SECRET=your_app_secret
```

**Token Flow:**
1. User authorizes → Short-lived token (1 hour)
2. Exchange for long-lived token (60 days)
3. Verify via `debug_token` endpoint
4. Store encrypted in database

### TikTok

1. Create app at [TikTok Developers](https://developers.tiktok.com/apps)
2. Enable **Login Kit**
3. Configure redirect URI

```env
TIKTOK_CLIENT_ID=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
```

**Features:**
- PKCE required (S256)
- Access tokens: 24 hours
- Refresh tokens: 365 days

### Google (YouTube)

1. Create project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

**Features:**
- PKCE optional (recommended)
- Access tokens: 1 hour
- Refresh tokens: Indefinite

### X (Twitter)

1. Create app at [Twitter Developer Portal](https://developer.twitter.com)
2. Enable OAuth 2.0
3. Configure callback URL

```env
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
```

**Features:**
- PKCE required
- Access tokens: 2 hours
- Refresh tokens: 6 months

### LinkedIn

1. Create app at [LinkedIn Developers](https://www.linkedin.com/developers)
2. Request Marketing Developer Platform access (for advanced features)

```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

**Features:**
- Standard OAuth 2.0
- Access tokens: 60 days
- Refresh tokens: Varies by product tier

## Security

### Token Encryption

All OAuth tokens are encrypted using AES-256-GCM before database storage:

```typescript
import { encrypt, decrypt } from '@/lib/crypto/encrypt';

// Encrypt before storing
const encryptedToken = encrypt(accessToken);

// Decrypt when needed
const accessToken = decrypt(encryptedToken);
```

### CSRF Protection

OAuth state parameter includes:
- Cryptographic random value
- User ID (for callback association)
- Timestamp (10-minute expiration)

### Cookie Security

OAuth cookies use:
- `HttpOnly` - No JavaScript access
- `Secure` - HTTPS only (production)
- `SameSite=Lax` - CSRF protection
- 10-minute expiration

## Common OAuth Failures

### Invalid State

**Cause:** State parameter mismatch (CSRF protection triggered)

**Solutions:**
- Ensure cookies are enabled
- Check for browser extensions blocking cookies
- Verify redirect URI matches exactly

### Access Denied

**Cause:** User declined permissions

**Solution:** Prompt user to try again, explain why permissions are needed

### Token Exchange Failed

**Causes:**
- Expired authorization code (use within 10 minutes)
- Wrong redirect URI
- Invalid client credentials

**Solutions:**
- Restart OAuth flow
- Verify environment variables
- Check provider app settings

### Token Expired

**Cause:** Access token has expired

**Solution:** Use refresh endpoint or reconnect:
```typescript
// Automatic refresh attempt
const token = await OAuthEngine.getAccessToken('meta', userId);
```

### Insufficient Permissions

**Cause:** Required scopes not granted

**Solution:** Add scope to provider config, request user re-authorization

## Local Testing

### Using Tunnels

For OAuth callbacks to work locally, use a tunnel:

```bash
# Option 1: ngrok
ngrok http 3000

# Option 2: localtunnel
npx localtunnel --port 3000
```

Update `.env.local`:
```env
NEXT_PUBLIC_BASE_URL=https://your-tunnel-url.ngrok.io
```

### Development Mode

Enable development mode for easier testing:

```env
DISABLE_AUTH=true
```

Then use `userId` query param:
```
GET /api/auth/meta/start?userId=test-user-123
```

## Database Schema

```prisma
model OAuthConnection {
  id                String    @id @default(cuid())
  userId            String
  provider          String    // 'meta', 'tiktok', 'google', 'x', 'linkedin'
  providerAccountId String
  accessTokenEnc    String    // Encrypted
  refreshTokenEnc   String?   // Encrypted
  scopes            String[]
  expiresAt         DateTime?
  metadata          Json?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([userId, provider])
}
```

### Migration

```bash
npx prisma migrate dev --name add_oauth_connections
```

## Adding New Providers

1. Create provider file in `lib/providers/`:

```typescript
// lib/providers/newprovider.ts
import { OAuthProviderInterface, ProviderConfig } from '../oauth/types';
import { registerProvider } from '../oauth/engine';

const config: ProviderConfig = {
  id: 'newprovider',
  displayName: 'New Provider',
  authorizationUrl: 'https://...',
  tokenUrl: 'https://...',
  identityUrl: 'https://...',
  scopes: ['...'],
  capabilities: {
    supportsRefresh: true,
    supportsTokenVerification: false,
    tokensExpire: true,
    requiresPKCE: false,
    supportsTokenExchange: false,
  },
};

// Implement required methods...

export const newProvider: OAuthProviderInterface = {
  config,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  verifyToken,
  getIdentity,
};

registerProvider(newProvider);
```

2. Export from `lib/providers/index.ts`:

```typescript
export { newProvider } from './newprovider';
```

3. Add environment variables to `.env.example`

4. Provider is automatically available at `/api/auth/newprovider/*`

## Usage in Application

### Get Access Token for API Calls

```typescript
import { OAuthEngine } from '@/lib/oauth/engine';

async function postToInstagram(userId: string, content: string) {
  const accessToken = await OAuthEngine.getAccessToken('meta', userId);

  // Use token for Instagram API calls
  const response = await fetch('https://graph.facebook.com/...', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
```

### Check Multiple Connections

```typescript
import { OAuthEngine, getAllProviders } from '@/lib/oauth/engine';

async function getConnectionStatuses(userId: string) {
  const providers = getAllProviders();

  const statuses = await Promise.all(
    providers.map(p => OAuthEngine.getConnectionStatus(p.config.id, userId))
  );

  return statuses;
}
```

## Error Handling

All errors extend `OAuthError` with standardized structure:

```typescript
try {
  await OAuthEngine.getAccessToken('meta', userId);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Handle expired token
  } else if (error instanceof ConnectionNotFoundError) {
    // Prompt user to connect
  }
}
```

Error codes:
- `UNKNOWN_PROVIDER` - Provider not supported
- `NOT_AUTHENTICATED` - User not logged in
- `INVALID_STATE` - CSRF check failed
- `TOKEN_EXPIRED` - Access token expired
- `CONNECTION_NOT_FOUND` - No connection for provider
- `TOKEN_EXCHANGE_FAILED` - Code exchange failed
- `TOKEN_REFRESH_FAILED` - Refresh failed
