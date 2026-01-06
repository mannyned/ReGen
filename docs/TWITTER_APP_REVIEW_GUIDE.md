# Twitter/X App Review Application Guide

This document provides all the information needed to apply for Twitter/X API access and complete the app review process.

## Table of Contents
1. [Overview](#overview)
2. [Access Levels](#access-levels)
3. [Application Information](#application-information)
4. [Use Case Description](#use-case-description)
5. [OAuth Configuration](#oauth-configuration)
6. [Required Scopes](#required-scopes)
7. [Demo Recording Script](#demo-recording-script)
8. [Environment Variables](#environment-variables)
9. [Troubleshooting](#troubleshooting)

---

## Overview

**App Name:** ReGenr
**Developer Portal:** https://developer.twitter.com/en/portal/dashboard
**API Version:** Twitter API v2
**Authentication:** OAuth 2.0 with PKCE

---

## Access Levels

Twitter/X offers tiered API access:

| Level | Monthly Cost | Tweet Cap | Write Access | Best For |
|-------|-------------|-----------|--------------|----------|
| Free | $0 | 1,500 reads | No | Testing only |
| Basic | $100/mo | 50,000 | Yes | Small apps |
| Pro | $5,000/mo | 1,000,000 | Yes | Large scale |

**ReGenr requires Basic or Pro access for publishing functionality.**

---

## Application Information

Use these details when filling out the Twitter Developer Application:

### Basic Information

| Field | Value |
|-------|-------|
| **App Name** | ReGenr |
| **App Description** | AI-powered content repurposing platform for creators |
| **Website URL** | https://www.regenr.app |
| **Organization** | ReGenr |
| **Country** | United States |

### URLs

| Field | Value |
|-------|-------|
| **Callback URL** | `https://www.regenr.app/api/auth/x/callback` |
| **Website** | `https://www.regenr.app` |
| **Terms of Service** | `https://www.regenr.app/terms` |
| **Privacy Policy** | `https://www.regenr.app/privacy` |

### App Type

- **App Type:** Web App
- **Authentication:** OAuth 2.0 with PKCE
- **User Context:** Acts on behalf of authenticated users

---

## Use Case Description

### Primary Use Case (Copy this for the application)

```
ReGenr is an AI-powered content repurposing platform designed for content creators,
social media managers, and small businesses. Our X (Twitter) integration enables
users to publish optimized content directly from our platform.

CORE FUNCTIONALITY:
1. OAuth Authentication - Users connect their X account via OAuth 2.0 to authorize
   ReGenr to post on their behalf
2. Content Publishing - Users create or upload content, generate AI-optimized
   captions, and publish directly to X
3. Cross-Platform Optimization - Our AI automatically adapts content for X's
   280-character limit, hashtag best practices, and engagement patterns
4. Scheduling - Users can schedule posts for optimal engagement times

USER FLOW:
1. User signs into ReGenr and navigates to Settings > Integrations
2. User clicks "Connect X (Twitter)" and completes OAuth authorization
3. User uploads content (image/video) and generates AI captions
4. User selects X as a publishing destination
5. User clicks "Publish" or schedules for later
6. ReGenr posts the content to X using the user's authorized account

DATA USAGE:
- We only access the user's profile information (username, display name, avatar)
- We only post content that the user explicitly requests to publish
- We do not read, analyze, or store the user's timeline or tweets
- We do not access direct messages
- We do not perform any automated actions without user initiation

WE WILL NOT:
- Auto-post content without explicit user action
- Aggregate or analyze tweets at scale
- Build follow/unfollow automation tools
- Access or store direct messages
- Scrape or collect user data beyond basic profile info
- Perform any bulk or automated operations
```

### How will you use tweet.write? (Copy this)

```
The tweet.write scope is used to publish content on behalf of authenticated users.

Specific use case:
1. User creates content in ReGenr (uploads image/video, writes caption)
2. User selects X (Twitter) as a publishing destination
3. User clicks "Publish Now" or "Schedule"
4. ReGenr calls POST /2/tweets to create the tweet

Every tweet is:
- Initiated by explicit user action (clicking Publish)
- Created with user-provided content
- Posted to the user's own authenticated account

We do NOT:
- Auto-generate tweets without user review
- Post automatically based on schedules without user setup
- Create tweets in bulk or for multiple accounts simultaneously
```

### How will you use users.read? (Copy this)

```
The users.read scope is used to retrieve basic profile information after OAuth
authentication to display in our app.

Specific use case:
1. User completes OAuth flow and authorizes ReGenr
2. We call GET /2/users/me to retrieve:
   - User ID (for API calls)
   - Username (to display connected account)
   - Display name (for UI)
   - Profile image URL (for UI)
3. This information is displayed in Settings > Integrations to confirm connection

We only make this call:
- Once after initial OAuth authorization
- When user refreshes their connection status

We do NOT:
- Look up other users' profiles
- Collect or analyze user data at scale
- Store data beyond what's needed for the integration
```

---

## OAuth Configuration

### Authorization URL
```
https://twitter.com/i/oauth2/authorize
```

### Token URL
```
https://api.twitter.com/2/oauth2/token
```

### User Info URL
```
https://api.twitter.com/2/users/me
```

### PKCE Requirement
Twitter API v2 requires PKCE (Proof Key for Code Exchange):
- `code_verifier`: Random 43-128 character string
- `code_challenge`: Base64URL encoded SHA256 hash of code_verifier
- `code_challenge_method`: S256

---

## Required Scopes

| Scope | Purpose | Required |
|-------|---------|----------|
| `tweet.read` | Read user's tweets (for verification) | Yes |
| `tweet.write` | Post tweets on behalf of user | Yes |
| `users.read` | Get user profile information | Yes |
| `offline.access` | Obtain refresh tokens | Yes |

### Scope Request Justification

**tweet.read**
- Purpose: Verify successful post creation
- Usage: After publishing, we confirm the tweet was created successfully

**tweet.write**
- Purpose: Core publishing functionality
- Usage: Create tweets with user-provided content (text, images, videos)

**users.read**
- Purpose: Display connected account in UI
- Usage: Show username and profile picture in integration settings

**offline.access**
- Purpose: Maintain persistent connection
- Usage: Refresh access tokens without requiring re-authentication

---

## Demo Recording Script

If Twitter requires a demo video, follow this script:

### Pre-Recording Setup
1. Have ReGenr running at https://www.regenr.app
2. Have a test X (Twitter) account ready
3. Prepare sample content (image + caption)
4. Clear any previous test posts

### Recording Script

**Part 1: OAuth Connection (30 seconds)**
1. Open ReGenr and log in
2. Navigate to Settings > Integrations
3. Show X (Twitter) as "Not Connected"
4. Click "Connect X (Twitter)"
5. Show the OAuth consent screen with scopes
6. Authorize the app
7. Show redirect back to ReGenr
8. Show X (Twitter) now displays as "Connected" with username

**Part 2: Content Publishing (45 seconds)**
1. Navigate to Upload page
2. Upload an image
3. Show AI caption generation
4. Select X (Twitter) as destination
5. Click "Publish Now"
6. Show success message

**Part 3: Verification (15 seconds)**
1. Open X (Twitter) in new tab
2. Navigate to your profile
3. Show the newly published tweet
4. Verify image and caption match

### Recording Tips
- Use screen recording software (OBS, Loom, etc.)
- Record in 1080p or higher
- Keep video under 2 minutes total
- No editing/cuts between ReGenr and Twitter
- Show full URLs in browser address bar

---

## Environment Variables

After approval, add these to your environment:

### Local Development (.env.local)
```bash
X_CLIENT_ID=your_client_id_here
X_CLIENT_SECRET=your_client_secret_here
```

### Production (Vercel Dashboard)
Add the same variables in Vercel Project Settings > Environment Variables.

---

## Troubleshooting

### Common Issues

**"Invalid redirect_uri"**
- Ensure callback URL matches exactly: `https://www.regenr.app/api/auth/x/callback`
- Check for trailing slashes
- Verify URL is added in Twitter Developer Portal

**"Invalid client_id"**
- Verify X_CLIENT_ID environment variable is set
- Check for extra spaces or quotes in the value

**"Unauthorized" on token exchange**
- Verify X_CLIENT_SECRET is correct
- Ensure you're using OAuth 2.0, not OAuth 1.0a
- Check PKCE implementation

**"Forbidden" on tweet creation**
- Verify your app has Basic or Pro access (Free tier cannot write)
- Check that tweet.write scope was authorized
- Verify user hasn't revoked access

### Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| POST /2/tweets | 200 per 15 min per user |
| GET /2/users/me | 75 per 15 min per user |
| OAuth token refresh | 300 per 15 min per app |

---

## Checklist

Before submitting your application:

- [ ] Created Twitter Developer account
- [ ] Created a Project in Developer Portal
- [ ] Created an App within the project
- [ ] Configured OAuth 2.0 settings
- [ ] Added correct Callback URL
- [ ] Requested required scopes
- [ ] Wrote detailed use case descriptions
- [ ] Applied for Basic or Pro access (for tweet.write)
- [ ] Added Terms of Service URL
- [ ] Added Privacy Policy URL
- [ ] Prepared demo video (if required)

---

## Support

- Twitter Developer Documentation: https://developer.twitter.com/en/docs
- API v2 Reference: https://developer.twitter.com/en/docs/twitter-api
- OAuth 2.0 Guide: https://developer.twitter.com/en/docs/authentication/oauth-2-0
- Developer Community: https://twittercommunity.com/

---

*Last Updated: January 2025*
