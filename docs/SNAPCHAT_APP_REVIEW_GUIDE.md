# Snapchat App Review Application Guide

This document provides all the information needed to apply for Snapchat API access and complete the app review process.

## Table of Contents
1. [Overview](#overview)
2. [Important: Snapchat API Limitations](#important-snapchat-api-limitations)
3. [Snap Kit Products](#snap-kit-products)
4. [Application Information](#application-information)
5. [Use Case Description](#use-case-description)
6. [OAuth Configuration](#oauth-configuration)
7. [Required Scopes](#required-scopes)
8. [Creative Kit Integration](#creative-kit-integration)
9. [Demo Recording Script](#demo-recording-script)
10. [Environment Variables](#environment-variables)
11. [Troubleshooting](#troubleshooting)

---

## Overview

**App Name:** ReGenr
**Developer Portal:** https://developers.snap.com/
**Snap Kit Dashboard:** https://kit.snapchat.com/portal
**Authentication:** OAuth 2.0 (Login Kit)

---

## Important: Snapchat API Limitations

> **Critical:** Snapchat does NOT have a public Content Posting API like Instagram or Facebook.

### What This Means for ReGenr:

| Feature | Availability | Implementation |
|---------|--------------|----------------|
| User Authentication | ✅ Available | Login Kit (OAuth 2.0) |
| Get User Profile | ✅ Available | Login Kit API |
| Direct Post to Snapchat | ❌ Not Available | N/A |
| User-Initiated Sharing | ✅ Available | Creative Kit (client-side) |

### How Snapchat Sharing Works:

Unlike Instagram/Facebook where we can post directly via API, Snapchat requires:
1. User clicks "Share to Snapchat" in our app
2. Snapchat app opens with pre-filled content
3. User manually confirms and posts in Snapchat

This is by design - Snapchat prioritizes user control over their content.

---

## Snap Kit Products

Snapchat offers several "Kits" for developers:

| Kit | Purpose | ReGenr Usage |
|-----|---------|--------------|
| **Login Kit** | User authentication via Snapchat | ✅ Yes - OAuth login |
| **Creative Kit** | Share content to Snapchat | ✅ Yes - User-initiated sharing |
| **Bitmoji Kit** | Access user's Bitmoji | ❌ No |
| **Story Kit** | Embed public Stories | ❌ No |
| **Camera Kit** | AR Lenses in your app | ❌ No |

---

## Application Information

Use these details when applying in the Snap Kit Portal:

### Basic Information

| Field | Value |
|-------|-------|
| **App Name** | ReGenr |
| **App Description** | AI-powered content repurposing platform for creators |
| **App Category** | Social Media / Content Creation |
| **Website URL** | https://www.regenr.app |
| **Company/Organization** | ReGenr |
| **Country** | United States |

### URLs

| Field | Value |
|-------|-------|
| **OAuth Redirect URI** | `https://www.regenr.app/api/auth/snapchat/callback` |
| **Website** | `https://www.regenr.app` |
| **Privacy Policy** | `https://www.regenr.app/privacy` |
| **Terms of Service** | `https://www.regenr.app/terms` |

### Platform Support

| Platform | Supported |
|----------|-----------|
| iOS | Yes (via web) |
| Android | Yes (via web) |
| Web | Yes |

---

## Use Case Description

### Primary Use Case (Copy this for the application)

```
ReGenr is an AI-powered content repurposing platform designed for content creators
and social media managers. We integrate with Snapchat to enable seamless content
sharing.

INTEGRATION OVERVIEW:

1. Login Kit Integration
   - Users can optionally connect their Snapchat account to ReGenr
   - This allows us to display their Snapchat username in our integrations panel
   - No sensitive data is accessed or stored beyond basic profile info

2. Creative Kit Integration
   - When users create content in ReGenr, they can share it to Snapchat
   - Clicking "Share to Snapchat" opens the Snapchat app with pre-filled content
   - The user has full control to edit, add stickers, or cancel before posting
   - We never post content without the user opening Snapchat and confirming

USER FLOW:

1. User logs into ReGenr and uploads content (image/video)
2. User generates AI-optimized captions
3. User selects Snapchat as a sharing destination
4. User clicks "Share to Snapchat"
5. Snapchat app opens with the content pre-loaded
6. User reviews, optionally edits, and posts to their Story or sends to friends

DATA USAGE:

Login Kit:
- We only access: Display name, Bitmoji avatar URL (if available)
- We do NOT access: Friends list, Stories, Snaps, location, or any private content
- Profile data is used solely to display connection status in our app

Creative Kit:
- Content is passed directly to Snapchat app via deep link
- We do not have access to the user's Snapchat account when sharing
- The user must manually confirm every share in the Snapchat app

PRIVACY COMMITMENT:

- No data collection beyond basic profile for display purposes
- No access to private Snaps, Stories, or messages
- No automated posting - every share requires user confirmation
- Full compliance with Snap's Developer Terms of Service
```

### Why do you need Login Kit? (Copy this)

```
We use Login Kit to:

1. Allow users to connect their Snapchat account to ReGenr's integration panel
2. Display the connected Snapchat username to confirm successful connection
3. Show the user's Bitmoji avatar (if available) for visual confirmation

We request minimal scopes:
- External ID: To identify the connected account
- Display Name: To show which account is connected
- Avatar: To display user's Bitmoji in our UI

We do NOT use Login Kit to:
- Access the user's friends or contacts
- Read Stories or Snaps
- Send Snaps on behalf of the user
- Collect any data for analytics or advertising
```

### Why do you need Creative Kit? (Copy this)

```
Creative Kit enables our users to share their ReGenr content to Snapchat.

How we use it:
1. User creates content in ReGenr (image + caption)
2. User clicks "Share to Snapchat" button
3. We use Creative Kit to open Snapchat with the content pre-loaded
4. User reviews the content in Snapchat and chooses to post or cancel

Key points:
- Every share is user-initiated (button click required)
- User has full control in Snapchat before posting
- We cannot post without user opening Snapchat
- Content is passed via deep link, not stored by us

This provides a seamless experience while maintaining user control and privacy.
```

---

## OAuth Configuration

### Login Kit URLs

| Endpoint | URL |
|----------|-----|
| Authorization | `https://accounts.snapchat.com/accounts/oauth2/auth` |
| Token | `https://accounts.snapchat.com/accounts/oauth2/token` |
| User Info | `https://kit.snapchat.com/v1/me` |
| Token Refresh | `https://accounts.snapchat.com/accounts/oauth2/token` |
| Revoke | `https://accounts.snapchat.com/accounts/oauth2/revoke` |

### Token Lifetimes

| Token Type | Lifetime |
|------------|----------|
| Access Token | 30 minutes |
| Refresh Token | 30 days |

---

## Required Scopes

### Login Kit Scopes

| Scope | Purpose | Required |
|-------|---------|----------|
| `https://auth.snapchat.com/oauth2/api/user.external_id` | Unique user identifier | Yes |
| `https://auth.snapchat.com/oauth2/api/user.display_name` | User's display name | Yes |
| `https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar` | Bitmoji avatar URL | Optional |

### Scope Request Justification

**user.external_id**
- Purpose: Identify the connected Snapchat account
- Usage: Store a reference to know which account is connected
- We do NOT use this to look up user data elsewhere

**user.display_name**
- Purpose: Display connected account in UI
- Usage: Show "Connected as @username" in Settings > Integrations

**user.bitmoji.avatar**
- Purpose: Visual confirmation of connected account
- Usage: Display Bitmoji next to connection status

---

## Creative Kit Integration

### Web Implementation

Creative Kit for web uses deep links to open Snapchat:

```javascript
// Share image to Snapchat
function shareToSnapchat(imageUrl, caption) {
  const snapUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(imageUrl)}`;
  window.open(snapUrl, '_blank');
}
```

### Mobile Implementation (React Native / Web View)

```javascript
// Deep link format
const snapchatShareUrl = `snapchat://creativekit/share?content=${encodedContent}`;

// Fallback to web if app not installed
const webFallback = `https://www.snapchat.com/scan?attachmentUrl=${imageUrl}`;
```

### Supported Content Types

| Type | Support | Max Size |
|------|---------|----------|
| Static Image | ✅ Yes | 5 MB |
| Video | ✅ Yes | 60 seconds |
| Sticker | ✅ Yes | 1 MB |
| Caption/Text | ✅ Yes | 250 chars |

---

## Demo Recording Script

### Pre-Recording Setup
1. Have ReGenr running at https://www.regenr.app
2. Have Snapchat app installed on mobile device
3. Prepare sample image content
4. Have screen recording ready for both web and mobile

### Recording Script

**Part 1: Login Kit Connection (30 seconds)**
1. Open ReGenr and navigate to Settings > Integrations
2. Show Snapchat as "Not Connected"
3. Click "Connect Snapchat"
4. Show Snapchat login page
5. Enter credentials and authorize
6. Show redirect back to ReGenr
7. Show Snapchat now displays as "Connected" with username

**Part 2: Creative Kit Sharing (45 seconds)**
1. Navigate to Upload page in ReGenr
2. Upload an image
3. Generate AI caption
4. Select Snapchat as sharing destination
5. Click "Share to Snapchat"
6. Show Snapchat app opening with content pre-loaded
7. Show user can add stickers, edit, etc.
8. Post to Story or send to friends

**Part 3: Verification (15 seconds)**
1. Show the content posted in Snapchat
2. Navigate back to ReGenr
3. Show the post marked as "Shared to Snapchat"

### Recording Tips
- Record web portion with screen recorder
- Record mobile portion with phone screen recording
- Show the handoff clearly between ReGenr and Snapchat app
- Emphasize user control (editing options in Snapchat)

---

## Environment Variables

After approval, add these to your environment:

### Local Development (.env.local)
```bash
SNAPCHAT_CLIENT_ID=your_client_id_here
SNAPCHAT_CLIENT_SECRET=your_client_secret_here
```

### Production (Vercel Dashboard)
Add the same variables in Vercel Project Settings > Environment Variables.

---

## Troubleshooting

### Common Issues

**"Invalid redirect_uri"**
- Ensure callback URL matches exactly: `https://www.regenr.app/api/auth/snapchat/callback`
- Redirect URIs are case-sensitive
- Check for trailing slashes

**"Invalid client_id"**
- Verify SNAPCHAT_CLIENT_ID is correctly set
- Ensure you're using the correct environment (Development vs Production)

**"Access denied" during OAuth**
- User may have denied permissions
- Check that all required scopes are configured in Snap Kit Portal

**Creative Kit not opening Snapchat**
- On mobile: Ensure Snapchat app is installed
- On web: Users will be prompted to install or continue on web
- Check that the content URL is publicly accessible

**Token refresh failing**
- Refresh tokens expire after 30 days
- User needs to re-authenticate if refresh token expired
- Check that refresh endpoint URL is correct

### Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| OAuth Token | 100 requests/minute |
| User Info | 100 requests/minute |
| Creative Kit | No server-side limit (client-side) |

---

## Checklist

Before submitting your application:

- [ ] Created Snap Kit Developer account
- [ ] Created an Organization (if required)
- [ ] Created an App in Snap Kit Portal
- [ ] Enabled Login Kit
- [ ] Enabled Creative Kit
- [ ] Configured OAuth Redirect URI
- [ ] Added all required scopes
- [ ] Wrote detailed use case descriptions
- [ ] Added Privacy Policy URL
- [ ] Added Terms of Service URL
- [ ] Tested in Development mode
- [ ] Prepared demo video (if required)
- [ ] Submitted for review

---

## Review Timeline

Snap Kit review typically takes:
- **Initial Review:** 3-5 business days
- **Follow-up (if needed):** 2-3 business days
- **Approval:** Immediate after passing review

---

## Support Resources

- Snap Kit Documentation: https://developers.snap.com/
- Login Kit Guide: https://developers.snap.com/api/login-kit
- Creative Kit Guide: https://developers.snap.com/creative-kit
- Developer Support: https://developers.snap.com/support
- Community Forum: https://developers.snap.com/community

---

*Last Updated: January 2025*
