# OAuth Setup Guide for ReGen

This guide will help you set up OAuth connections for each social media platform to enable secure posting from ReGen.

## Prerequisites

- A developer account on each platform you want to integrate
- Your ReGen backend running on `http://localhost:3000` (or your production URL)

## General Setup Steps

For each platform, you'll need to:
1. Register as a developer
2. Create an app
3. Get your Client ID and Client Secret
4. Set the redirect URI
5. Add credentials to your `.env` file

---

## Platform-Specific Instructions

### 1. Instagram (via Facebook)

Instagram uses Facebook's OAuth system.

**Steps:**
1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Click "Create App"
3. Select "Business" or "Consumer" type
4. Name your app and provide contact email
5. Go to Settings > Basic
   - Copy **App ID** → This is your `INSTAGRAM_CLIENT_ID`
   - Copy **App Secret** → This is your `INSTAGRAM_CLIENT_SECRET`
6. Go to Instagram > Basic Display
7. Add OAuth Redirect URI: `http://localhost:3000/api/oauth/callback/instagram`
8. Add to Products: Instagram Basic Display
9. Configure Instagram permissions

**Add to .env:**
```env
INSTAGRAM_CLIENT_ID=your-app-id
INSTAGRAM_CLIENT_SECRET=your-app-secret
```

---

### 2. Twitter/X

Twitter uses OAuth 2.0 with PKCE.

**Steps:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign up for a developer account (if needed)
3. Create a new Project and App
4. Go to your App Settings > Keys and tokens
   - Save the **API Key** → This is your `TWITTER_CLIENT_ID`
   - Save the **API Secret Key** → This is your `TWITTER_CLIENT_SECRET`
5. Go to App Settings > User authentication settings
6. Set up OAuth 2.0:
   - Type of App: Web App
   - Callback URI: `http://localhost:3000/api/oauth/callback/twitter`
   - Website URL: `http://localhost:3001`
7. Request permissions: Read and Write

**Add to .env:**
```env
TWITTER_CLIENT_ID=your-api-key
TWITTER_CLIENT_SECRET=your-api-secret-key
```

---

### 3. LinkedIn

**Steps:**
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in app details (name, company, logo, etc.)
4. Go to Auth tab
   - Copy **Client ID** → `LINKEDIN_CLIENT_ID`
   - Copy **Client Secret** → `LINKEDIN_CLIENT_SECRET`
5. Add OAuth 2.0 Redirect URL: `http://localhost:3000/api/oauth/callback/linkedin`
6. Go to Products tab
7. Request access to:
   - Share on LinkedIn
   - Sign In with LinkedIn

**Add to .env:**
```env
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
```

---

### 4. Facebook

**Steps:**
1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Create a new app (same as Instagram above)
3. Go to Settings > Basic
   - Copy **App ID** → `FACEBOOK_CLIENT_ID`
   - Copy **App Secret** → `FACEBOOK_CLIENT_SECRET`
4. Add OAuth Redirect URI: `http://localhost:3000/api/oauth/callback/facebook`
5. Add Facebook Login product
6. Configure permissions: `pages_manage_posts`, `pages_read_engagement`

**Add to .env:**
```env
FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret
```

---

### 5. TikTok

**Steps:**
1. Go to [TikTok Developers](https://developers.tiktok.com/)
2. Register as a developer
3. Create a new app
4. Go to App Details
   - Copy **Client Key** → `TIKTOK_CLIENT_ID`
   - Copy **Client Secret** → `TIKTOK_CLIENT_SECRET`
5. Add Redirect URL: `http://localhost:3000/api/oauth/callback/tiktok`
6. Request permissions: `user.info.basic`, `video.publish`
7. Submit for review (required for production)

**Add to .env:**
```env
TIKTOK_CLIENT_ID=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret
```

---

### 6. YouTube (via Google)

**Steps:**
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Go to Credentials
5. Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/oauth/callback/youtube`
6. Copy **Client ID** → `YOUTUBE_CLIENT_ID`
7. Copy **Client Secret** → `YOUTUBE_CLIENT_SECRET`

**Add to .env:**
```env
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
```

---

## After Setup

1. Copy `.env.example` to `.env` in the server directory
2. Fill in all the credentials you obtained
3. Add a secure TOKEN_ENCRYPTION_KEY (random string)
4. Restart your server: `npm run dev`
5. Go to Settings in the ReGen app
6. Click "Connect" on any platform to test OAuth

---

## Testing OAuth Flow

1. Click "Connect Instagram" (or any platform)
2. You should be redirected to the platform's authorization page
3. Approve the permissions
4. You'll be redirected back to ReGen
5. The platform should now show as "Connected" in Settings

---

## Production Deployment

When deploying to production:

1. Update `OAUTH_REDIRECT_BASE_URL` in `.env` to your production URL
2. Update all redirect URIs in each platform's app settings
3. Use a strong `TOKEN_ENCRYPTION_KEY`
4. Consider using a proper database for token storage
5. Implement token refresh logic
6. Add SSL/HTTPS (required by most platforms)
7. Submit apps for review where required (TikTok, Instagram, etc.)

---

## Troubleshooting

**"Missing OAuth credentials" error:**
- Make sure credentials are in `.env` file
- Restart the server after adding credentials

**"Invalid redirect URI" error:**
- Check that the redirect URI in the platform's app settings matches exactly
- Include the protocol (http/https)

**"OAuth state expired" error:**
- The OAuth flow must complete within 10 minutes
- Try reconnecting

**Token storage errors:**
- Make sure the `data` directory exists and is writable
- Check file permissions

---

## Security Notes

- Never commit `.env` file to version control
- Use environment variables in production
- Rotate secrets regularly
- Enable 2FA on all developer accounts
- Monitor OAuth logs for suspicious activity
- Implement rate limiting in production
- Use HTTPS in production (required by OAuth spec)

---

## Support

For platform-specific OAuth issues, consult:
- [Instagram/Facebook OAuth Docs](https://developers.facebook.com/docs/facebook-login)
- [Twitter OAuth 2.0 Docs](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [LinkedIn OAuth Docs](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [TikTok OAuth Docs](https://developers.tiktok.com/doc/login-kit-web)
- [YouTube OAuth Docs](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps)
