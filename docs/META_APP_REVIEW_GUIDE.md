# Meta App Review - Use Case Descriptions

This document contains the use case descriptions for ReGenr's Meta App Review submission.

## Permissions Overview

| Permission | Why You Need It | Feature |
|------------|-----------------|---------|
| `instagram_basic` | Get account info (ID, username, profile pic) | Account connection |
| `instagram_content_publish` | Publish posts to Instagram | Post scheduling & publishing |
| `instagram_manage_insights` | Access post/account analytics | Analytics dashboard |
| `pages_show_list` | List user's Facebook Pages | Account selection |
| `pages_read_engagement` | Read engagement metrics | Analytics |
| `pages_manage_posts` | Publish to Facebook Pages | Facebook publishing |
| `business_management` | Link FB Pages to IG accounts | Multi-account support |
| `publish_video` | Upload videos to Facebook | Video publishing |

---

## Use Case Descriptions

### 1. instagram_basic

**Use Case Description:**
```
ReGenr is a social media management platform that helps content creators and businesses manage their Instagram presence.

We use instagram_basic to:
1. Retrieve the user's Instagram Business Account ID to identify their account for publishing
2. Display the user's Instagram username and profile picture in our dashboard
3. Show follower count on the account overview page
4. Verify the user has a valid Instagram Business or Creator account connected to a Facebook Page

User Flow:
- User clicks "Connect Instagram" in ReGenr
- User authenticates via Facebook OAuth
- We retrieve their Instagram Business Account info
- User sees their connected account in the ReGenr dashboard
```

---

### 2. instagram_content_publish

**Use Case Description:**
```
ReGenr allows users to create, schedule, and publish content to Instagram directly from our platform.

We use instagram_content_publish to:
1. Upload images and videos to Instagram on behalf of the user
2. Create Instagram posts with captions and hashtags
3. Schedule posts for future publishing at optimal times
4. Support both single image posts and video content (Reels)

User Flow:
- User uploads an image or video in ReGenr
- User writes a caption with hashtags
- User either publishes immediately or schedules for later
- ReGenr creates a media container via the API
- ReGenr publishes the container to the user's Instagram account
- User sees the published post in their Instagram feed
```

---

### 3. instagram_manage_insights

**Use Case Description:**
```
ReGenr provides analytics dashboards to help users understand their Instagram performance and grow their audience.

We use instagram_manage_insights to:
1. Display post-level metrics: likes, comments, reach, impressions, saves, shares, video views
2. Show account-level analytics: total reach, impressions, follower growth
3. Help users identify their best-performing content
4. Provide engagement rate calculations and trends over time

User Flow:
- User navigates to the Analytics section in ReGenr
- We fetch insights data for their Instagram posts and account
- User sees visual charts and metrics for their content performance
- User can filter by date range (day, week, month)
- User uses these insights to optimize their content strategy
```

---

### 4. pages_show_list

**Use Case Description:**
```
ReGenr needs to discover which Facebook Pages a user manages to find their connected Instagram Business Account.

We use pages_show_list to:
1. Retrieve the list of Facebook Pages the user manages
2. Allow the user to select which Page/Instagram account to connect
3. Support users who manage multiple Pages and Instagram accounts
4. Display Page names during the account selection process

User Flow:
- User initiates Instagram connection in ReGenr
- After Facebook OAuth, we retrieve their managed Pages
- User sees a list of their Facebook Pages
- User selects the Page connected to their Instagram Business Account
- We retrieve the Instagram Business Account linked to that Page
```

---

### 5. pages_read_engagement

**Use Case Description:**
```
ReGenr displays engagement analytics for both Facebook and Instagram content to provide a unified view of social media performance.

We use pages_read_engagement to:
1. Read post impressions, reach, and engagement metrics from Facebook Pages
2. Display engagement data (likes, comments, shares) for Facebook posts
3. Calculate engagement rates for content performance analysis
4. Show unique visitor and reach metrics in analytics dashboards

User Flow:
- User publishes content to Facebook via ReGenr
- User navigates to Analytics section
- We fetch engagement metrics for their Facebook posts
- User sees impressions, reach, likes, comments, and shares
- User compares performance across different posts
```

---

### 6. pages_manage_posts

**Use Case Description:**
```
ReGenr allows users to publish content directly to their Facebook Pages alongside Instagram posting.

We use pages_manage_posts to:
1. Publish text posts to Facebook Pages
2. Publish photos with captions to Facebook Pages
3. Schedule Facebook posts for future publishing
4. Delete posts from Facebook when requested by the user

User Flow:
- User creates a post in ReGenr
- User selects Facebook as a publishing destination
- User writes their post content and optionally adds an image
- User publishes immediately or schedules for later
- ReGenr publishes the post to their Facebook Page
- Post appears on their Facebook Page
```

---

### 7. business_management

**Use Case Description:**
```
ReGenr needs to discover and verify the connection between Facebook Pages and Instagram Business Accounts.

We use business_management to:
1. Retrieve the Instagram Business Account ID linked to a Facebook Page
2. Verify the user has proper permissions to manage the Instagram account
3. Support users with multiple business assets across Facebook and Instagram
4. Ensure proper account linking for content publishing

User Flow:
- User connects their Instagram account via Facebook OAuth
- We query the Facebook Page to find the linked Instagram Business Account
- We verify the instagram_business_account relationship
- User's Instagram account is successfully connected to ReGenr
- User can now publish and view analytics for this account
```

---

### 8. publish_video

**Use Case Description:**
```
ReGenr supports video content publishing to Facebook Pages, including standard videos and Reels.

We use publish_video to:
1. Upload video files to Facebook Pages using resumable upload
2. Publish Facebook Reels for short-form video content
3. Support large video files (up to 10GB) with chunked uploading
4. Allow users to add descriptions and captions to video posts

User Flow:
- User uploads a video file in ReGenr
- User adds a description/caption for the video
- User selects Facebook as the publishing destination
- ReGenr initiates resumable upload (start → transfer → finish phases)
- Video is processed and published to the Facebook Page
- User sees the video post on their Facebook Page
```

---

## Screencast Video Script

Record a 3-5 minute video showing:

### Intro (30 sec)
"This is ReGenr, a social media management platform. I'll demonstrate how we use Instagram and Facebook APIs."

### 1. Account Connection (1 min)
- Click "Connect Instagram"
- Show OAuth flow
- Select Facebook Page
- Show connected account in dashboard

### 2. Publishing Content (1.5 min)
- Upload an image
- Write caption with hashtags
- Click "Publish to Instagram"
- Show success message
- Show post on Instagram (open Instagram app/web)

### 3. Analytics (1 min)
- Navigate to Analytics
- Show post metrics (likes, comments, reach)
- Show account insights
- Explain how users benefit from this data

### Outro (30 sec)
"ReGenr helps creators manage their social media presence efficiently using these Meta APIs."

---

## Required URLs

Ensure these are configured in your Meta App Dashboard:

| URL Type | URL |
|----------|-----|
| Privacy Policy | `https://regenr.app/privacy` |
| Terms of Service | `https://regenr.app/terms` |
| Data Deletion Callback | `https://regenr.app/api/meta/data-deletion` |
| Webhook URL | `https://regenr.app/api/webhooks/meta` |
| OAuth Redirect URI | `https://regenr.app/api/oauth/callback/instagram` |

---

## Tips for Approval

1. **Only request permissions you actively use** - Don't request permissions "for future use"
2. **Screencast must show real functionality** - No mockups or placeholder data
3. **Test all features before submission** - Meta reviewers will test your app
4. **Respond quickly to reviewer questions** - Delays can reset your review
5. **Keep descriptions concise but complete** - Explain the "why" not just the "what"

---

## API Endpoints Reference

### Publishing
- `POST /{account_id}/media` - Create Instagram post container
- `POST /{account_id}/media_publish` - Publish Instagram post
- `POST /{page_id}/feed` - Facebook text post
- `POST /{page_id}/photos` - Facebook photo
- `POST /{page_id}/video_reels` - Facebook Reels

### Analytics
- `GET /{media_id}/insights` - Post metrics
- `GET /{account_id}/insights` - Account metrics

### Account Discovery
- `GET /me/accounts` - List Facebook Pages
- `GET /{page_id}?fields=instagram_business_account` - Get linked Instagram account

---

## Review Timeline

- Simple requests: **24-48 hours**
- Multiple permissions: **5-7 business days**
- Complex apps: **2-6 weeks**

---

*Last updated: December 2024*
