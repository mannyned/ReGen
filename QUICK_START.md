# OAuth Quick Start Guide

## What's Been Implemented

Your ReGen app now has a complete OAuth integration system for securely connecting social media accounts:

✅ **Backend OAuth Infrastructure**
- OAuth configuration for 6 platforms (Instagram, Twitter, LinkedIn, Facebook, TikTok, YouTube)
- Secure token storage with encryption
- OAuth callback handlers
- Connection status management

✅ **Frontend Integration**
- Settings page now uses real OAuth flow
- Automatic connection status sync
- OAuth success/error handling

✅ **Security Features**
- CSRF protection with state tokens
- Encrypted token storage
- Secure callback handling

## How to Test OAuth (Even Without Real Credentials)

### Option 1: Test the Flow (Without Real OAuth)

Even without setting up OAuth credentials, you can test that the system works:

1. Go to http://localhost:3001/settings
2. Click "Connect" on any platform
3. You'll see an alert: "Missing OAuth credentials for [platform]"
4. This confirms the OAuth system is working and checking for credentials

### Option 2: Set Up Real OAuth (Recommended)

To actually connect your accounts:

1. **Choose a Platform to Start With** (Twitter is easiest for testing)

2. **Follow the Setup Guide**
   - Open `OAUTH_SETUP_GUIDE.md` in the server directory
   - Follow the platform-specific instructions
   - Each section has step-by-step instructions with links

3. **Add Credentials to .env**
   ```bash
   # Copy the example file
   cd regen-mvp/server
   copy .env.example .env

   # Edit .env and add your credentials
   # Example for Twitter:
   TWITTER_CLIENT_ID=your-actual-client-id
   TWITTER_CLIENT_SECRET=your-actual-client-secret
   ```

4. **Restart the Backend Server**
   ```bash
   # Stop the current server (Ctrl+C in the terminal)
   # Then restart:
   npm run dev
   ```

5. **Test the Connection**
   - Go to http://localhost:3001/settings
   - Click "Connect Twitter"
   - You'll be redirected to Twitter's OAuth page
   - Authorize the app
   - You'll be redirected back with a success message!

## Quick Setup for Twitter (Fastest Option)

Twitter is the easiest to set up for testing:

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a free developer account (takes 2-3 minutes)
3. Create a new app
4. Get your API Key and API Secret
5. Set callback URL to: `http://localhost:3000/api/oauth/callback/twitter`
6. Add to .env:
   ```
   TWITTER_CLIENT_ID=your-api-key
   TWITTER_CLIENT_SECRET=your-api-secret
   ```
7. Restart backend server
8. Connect from Settings page!

## Testing Without Setting Up OAuth

If you want to test the app without setting up OAuth:

1. The system will show which platforms need setup
2. You can still use the schedule and other features
3. The "Post Now" feature will work with mock connections

## Files Created

Here's what was added to your project:

**Backend:**
- `server/config/oauth.js` - OAuth configuration for all platforms
- `server/services/tokenStorageService.js` - Secure token storage
- `server/controllers/oauthController.js` - OAuth flow handlers
- `server/routes/oauth.js` - OAuth API endpoints
- `server/.env.example` - Environment variables template
- `OAUTH_SETUP_GUIDE.md` - Detailed setup instructions

**Frontend:**
- Updated `app/settings/page.tsx` - Now uses real OAuth

**Documentation:**
- `OAUTH_SETUP_GUIDE.md` - Platform-by-platform setup guide
- `QUICK_START.md` - This file

## Available OAuth Endpoints

Your backend now has these endpoints:

- `GET /api/oauth/connect/:platform` - Initiate OAuth flow
- `GET /api/oauth/callback/:platform` - Handle OAuth callback
- `GET /api/oauth/status` - Get connection status
- `DELETE /api/oauth/disconnect/:platform` - Disconnect platform

## Security Features Implemented

1. **Token Encryption** - All access tokens are encrypted before storage
2. **CSRF Protection** - State tokens prevent cross-site request forgery
3. **Secure Storage** - Tokens stored separately from code
4. **Token Expiration** - Tracks token expiration dates
5. **Secure Callbacks** - Validates all OAuth callbacks

## Next Steps

1. **For Testing**: Try connecting Twitter (fastest setup)
2. **For Production**: Set up all platforms you want to support
3. **Add Features**: Implement token refresh logic
4. **Upgrade Storage**: Move to a proper database (PostgreSQL/MongoDB)
5. **Add User Auth**: Implement proper user authentication

## Troubleshooting

**Server won't start after adding OAuth:**
- Make sure the backend server was restarted after code changes
- Check for syntax errors in the new files

**"Missing OAuth credentials" alert:**
- This means the system is working! You just need to add credentials to .env

**OAuth redirect doesn't work:**
- Make sure the redirect URI in the platform's settings matches exactly
- Check that the backend is running on port 3000

**Token storage errors:**
- Make sure the `data` directory exists in the server folder
- Check file permissions

## Support

- See `OAUTH_SETUP_GUIDE.md` for detailed platform setup
- Check console logs for debugging
- OAuth errors are logged in the backend terminal

---

**You're all set!** The OAuth system is ready. Start by testing one platform, then expand to others as needed.
