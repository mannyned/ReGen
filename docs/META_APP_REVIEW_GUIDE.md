# Meta App Review - Use Case Descriptions

This document contains the use case descriptions for ReGenr's Meta App Review submission.

## Permissions Overview

### Facebook User Account Permissions

| Permission | Why You Need It | Feature |
|------------|-----------------|---------|
| `public_profile` | Get user's name and profile picture | User identification |
| `email` | Get user's email address | Account creation & login |

### Facebook Page Permissions

| Permission | Why You Need It | Feature |
|------------|-----------------|---------|
| `pages_show_list` | List user's Facebook Pages | Account selection |
| `pages_read_engagement` | Read engagement metrics | Analytics |
| `pages_manage_posts` | Publish to Facebook Pages | Facebook publishing |
| `pages_manage_metadata` | Manage page settings | Page configuration |
| `pages_read_user_content` | Read comments and interactions | Engagement tracking |
| `publish_video` | Upload videos to Facebook | Video publishing |
| `business_management` | Link FB Pages to IG accounts | Multi-account support |

### Instagram Permissions

| Permission | Why You Need It | Feature |
|------------|-----------------|---------|
| `instagram_basic` | Get account info (ID, username, profile pic) | Account connection |
| `instagram_content_publish` | Publish posts to Instagram | Post scheduling & publishing |
| `instagram_manage_insights` | Access post/account analytics | Analytics dashboard |

---

## Use Case Descriptions

---

## FACEBOOK USER ACCOUNT PERMISSIONS

---

### 1. public_profile

**Use Case Description:**
```
ReGenr is a social media management platform that helps content creators and businesses manage their Facebook and Instagram presence.

We use public_profile to:
1. Retrieve the user's Facebook name to personalize their experience in our app
2. Display the user's profile picture in the ReGenr dashboard header
3. Identify the user across sessions for account management
4. Show the connected Facebook account name in the Settings page

User Flow:
- User clicks "Connect Facebook" or "Connect Instagram" in ReGenr
- User authenticates via Facebook OAuth
- We retrieve their public profile information (name, profile picture)
- User sees their name and profile picture in the ReGenr dashboard
- User can verify they connected the correct Facebook account
```

---

### 2. email

**Use Case Description:**
```
ReGenr uses the user's Facebook email address for account management and communication.

We use email to:
1. Create or link the user's ReGenr account using their Facebook email
2. Send important notifications about their scheduled posts
3. Provide account recovery options if the user loses access
4. Send analytics reports and summaries to the user

User Flow:
- User clicks "Sign in with Facebook" or connects Facebook in ReGenr
- We retrieve their email address from Facebook
- Email is used to create/link their ReGenr account
- User receives notifications about their social media activity
- User can recover their account using this email if needed
```

---

## FACEBOOK PAGE PERMISSIONS

---

### 3. pages_show_list

**Use Case Description:**
```
ReGenr needs to discover which Facebook Pages a user manages to enable publishing and analytics features.

We use pages_show_list to:
1. Retrieve the list of Facebook Pages the user manages
2. Allow the user to select which Page(s) to connect to ReGenr
3. Support users who manage multiple Facebook Pages
4. Display Page names and profile pictures during account selection
5. Find Pages that have linked Instagram Business Accounts

User Flow:
- User clicks "Connect Facebook" in ReGenr
- After Facebook OAuth, we retrieve their managed Pages
- User sees a list of all their Facebook Pages
- User selects which Page(s) they want to manage in ReGenr
- Selected Pages appear in their ReGenr dashboard
```

---

### 4. pages_read_engagement

**Use Case Description:**
```
ReGenr displays engagement analytics for Facebook Page content to help users understand their audience and improve their content strategy.

We use pages_read_engagement to:
1. Read post impressions, reach, and engagement metrics from Facebook Pages
2. Display engagement data (likes, comments, shares) for Facebook posts
3. Calculate engagement rates for content performance analysis
4. Show unique visitor and reach metrics in analytics dashboards
5. Track audience growth and engagement trends over time

User Flow:
- User publishes content to Facebook via ReGenr
- User navigates to Analytics section
- We fetch engagement metrics for their Facebook posts
- User sees impressions, reach, likes, comments, and shares
- User compares performance across different posts
- User identifies top-performing content to inform future posts
```

---

### 5. pages_manage_posts

**Use Case Description:**
```
ReGenr allows users to create, schedule, and publish content directly to their Facebook Pages.

We use pages_manage_posts to:
1. Publish text posts to Facebook Pages
2. Publish photos with captions to Facebook Pages
3. Schedule Facebook posts for future publishing at optimal times
4. Edit or update existing posts when needed
5. Delete posts from Facebook when requested by the user

User Flow:
- User creates a post in ReGenr
- User selects their Facebook Page as a publishing destination
- User writes their post content and optionally adds an image
- User publishes immediately or schedules for a specific date/time
- ReGenr publishes the post to their Facebook Page via the API
- Post appears on their Facebook Page
- User can view, edit, or delete the post from ReGenr
```

---

### 6. pages_manage_metadata

**Use Case Description:**
```
ReGenr needs to access and manage Facebook Page metadata to ensure proper configuration for publishing.

We use pages_manage_metadata to:
1. Verify the Page is properly configured for content publishing
2. Access Page settings required for API interactions
3. Ensure the Page has the necessary features enabled for our app
4. Manage Page-level settings that affect content delivery

User Flow:
- User connects their Facebook Page to ReGenr
- We verify the Page configuration supports our publishing features
- We ensure all required Page settings are properly configured
- User can successfully publish content without configuration issues
```

---

### 7. pages_read_user_content

**Use Case Description:**
```
ReGenr monitors user interactions on Facebook Pages to help users engage with their audience.

We use pages_read_user_content to:
1. Read comments on Facebook Page posts
2. Track user mentions and tags on the Page
3. Monitor audience interactions for engagement tracking
4. Display recent comments and interactions in the dashboard
5. Help users identify content that generates discussion

User Flow:
- User publishes content to their Facebook Page
- Audience members comment on the posts
- ReGenr fetches and displays these comments
- User sees comments in their ReGenr dashboard
- User can monitor engagement without leaving ReGenr
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
4. Allow users to add descriptions, titles, and captions to videos
5. Schedule video posts for future publishing

User Flow:
- User uploads a video file in ReGenr
- User adds a title, description, and optional caption
- User selects their Facebook Page as the publishing destination
- ReGenr initiates resumable upload (start → transfer → finish phases)
- Video is processed by Facebook
- Video post is published to the Facebook Page
- User sees the video post on their Facebook Page
```

---

### 9. business_management

**Use Case Description:**
```
ReGenr needs to discover and verify connections between Facebook Pages and Instagram Business Accounts for cross-platform management.

We use business_management to:
1. Retrieve the Instagram Business Account ID linked to a Facebook Page
2. Verify the user has proper permissions to manage both accounts
3. Support users with multiple business assets across Facebook and Instagram
4. Ensure proper account linking for cross-platform content publishing
5. Access business-level analytics and insights

User Flow:
- User connects their accounts via Facebook OAuth
- We query Facebook Pages to find linked Instagram Business Accounts
- We verify the instagram_business_account relationship exists
- User sees both their Facebook Page and Instagram account in ReGenr
- User can publish and view analytics for both platforms from one place
```

---

## INSTAGRAM PERMISSIONS

---

### 10. instagram_basic

**Use Case Description:**
```
ReGenr is a social media management platform that helps content creators and businesses manage their Instagram presence.

We use instagram_basic to:
1. Retrieve the user's Instagram Business Account ID to identify their account
2. Display the user's Instagram username and profile picture in our dashboard
3. Show follower count on the account overview page
4. Verify the user has a valid Instagram Business or Creator account
5. Confirm the account is properly connected to a Facebook Page

User Flow:
- User clicks "Connect Instagram" in ReGenr
- User authenticates via Facebook OAuth
- We retrieve their Instagram Business Account info via their Facebook Page
- User sees their connected Instagram account in the ReGenr dashboard
- User can verify the correct account is connected
```

---

### 11. instagram_content_publish

**Use Case Description:**
```
ReGenr allows users to create, schedule, and publish content to Instagram directly from our platform.

We use instagram_content_publish to:
1. Upload images and videos to Instagram on behalf of the user
2. Create Instagram posts with captions and hashtags
3. Schedule posts for future publishing at optimal times
4. Support single image posts, carousel posts, and video content (Reels)
5. Manage the media container creation and publishing workflow

User Flow:
- User uploads an image or video in ReGenr
- User writes a caption with hashtags
- User either publishes immediately or schedules for later
- ReGenr creates a media container via the Instagram Graph API
- For videos, we poll the container status until ready
- ReGenr publishes the container to the user's Instagram account
- User sees the published post in their Instagram feed
```

---

### 12. instagram_manage_insights

**Use Case Description:**
```
ReGenr provides analytics dashboards to help users understand their Instagram performance and grow their audience.

We use instagram_manage_insights to:
1. Display post-level metrics: likes, comments, reach, impressions, saves, shares, video views
2. Show account-level analytics: total reach, impressions, follower growth
3. Help users identify their best-performing content
4. Provide engagement rate calculations and trends over time
5. Compare performance across different content types and posting times

User Flow:
- User navigates to the Analytics section in ReGenr
- We fetch insights data for their Instagram posts and account
- User sees visual charts and metrics for their content performance
- User can filter by date range (day, week, month)
- User identifies top-performing content
- User uses these insights to optimize their content strategy
```

---

## Screencast Video Script

Record a 5-7 minute video showing:

### Intro (30 sec)
"This is ReGenr, a social media management platform. I'll demonstrate how we use Facebook and Instagram APIs to help users manage their social media presence."

### 1. Facebook Login & Account Connection (1 min)
- Click "Sign in with Facebook" or "Connect Facebook"
- Show Facebook OAuth flow
- Show user's name and email being retrieved
- Show connected Facebook account in dashboard

### 2. Facebook Page Selection (1 min)
- Show list of user's Facebook Pages
- Select a Page to connect
- Show Page appears in dashboard with profile picture

### 3. Facebook Publishing (1.5 min)
- Create a new post
- Add text and an image
- Select Facebook Page as destination
- Click "Publish"
- Show success message
- Show post on Facebook Page (open Facebook)

### 4. Instagram Connection (30 sec)
- Show Instagram Business Account linked to Facebook Page
- Show Instagram account in dashboard

### 5. Instagram Publishing (1.5 min)
- Upload an image
- Write caption with hashtags
- Click "Publish to Instagram"
- Show success message
- Show post on Instagram (open Instagram app/web)

### 6. Analytics (1 min)
- Navigate to Analytics section
- Show Facebook post metrics (impressions, reach, engagement)
- Show Instagram post metrics (likes, comments, reach, saves)
- Explain how users benefit from this data

### Outro (30 sec)
"ReGenr helps creators manage their Facebook and Instagram presence efficiently from one platform using these Meta APIs."

---

## Required URLs

Ensure these are configured in your Meta App Dashboard:

| URL Type | URL |
|----------|-----|
| Privacy Policy | `https://regenr.app/privacy` |
| Terms of Service | `https://regenr.app/terms` |
| Data Deletion Callback | `https://regenr.app/api/meta/data-deletion` |
| Webhook URL | `https://regenr.app/api/webhooks/meta` |
| OAuth Redirect URI (Instagram) | `https://regenr.app/api/oauth/callback/instagram` |
| OAuth Redirect URI (Facebook) | `https://regenr.app/api/oauth/callback/facebook` |

---

## Tips for Approval

1. **Only request permissions you actively use** - Don't request permissions "for future use"
2. **Screencast must show real functionality** - No mockups or placeholder data
3. **Test all features before submission** - Meta reviewers will test your app
4. **Respond quickly to reviewer questions** - Delays can reset your review
5. **Keep descriptions concise but complete** - Explain the "why" not just the "what"
6. **Show both Facebook AND Instagram flows** - Demonstrate all platforms you support
7. **Use a real test account** - Not a fake or placeholder account
8. **Ensure OAuth flow works smoothly** - Reviewers will test the connection process

---

## API Endpoints Reference

### Facebook User
- `GET /me` - Get user profile (name, id)
- `GET /me?fields=email` - Get user email

### Facebook Pages
- `GET /me/accounts` - List user's Facebook Pages
- `POST /{page_id}/feed` - Publish text post
- `POST /{page_id}/photos` - Publish photo
- `POST /{page_id}/videos` - Upload video (resumable)
- `POST /{page_id}/video_reels` - Publish Reel
- `GET /{post_id}/insights` - Get post analytics

### Instagram
- `GET /{page_id}?fields=instagram_business_account` - Get linked Instagram account
- `GET /{ig_account_id}?fields=id,username,name,profile_picture_url,followers_count` - Get Instagram profile
- `POST /{ig_account_id}/media` - Create post container
- `POST /{ig_account_id}/media_publish` - Publish post
- `GET /{media_id}/insights` - Get post analytics
- `GET /{ig_account_id}/insights` - Get account analytics

### Token Management
- `GET /oauth/access_token` - Exchange code for token
- `GET /oauth/access_token?grant_type=fb_exchange_token` - Get long-lived token
- `GET /debug_token` - Verify token validity

---

## Review Timeline

- Simple requests (1-2 permissions): **24-48 hours**
- Multiple permissions (3-5): **5-7 business days**
- Complex apps (6+ permissions): **2-6 weeks**

---

## Common Rejection Reasons & Fixes

| Rejection Reason | How to Fix |
|------------------|------------|
| "Cannot verify use case" | Make screencast clearer, show exact feature in action |
| "Cannot access the app" | Provide working test credentials, ensure app is live |
| "Permission not needed" | Remove unused permissions, only request what you use |
| "Incomplete user flow" | Show the complete flow from login to feature usage |
| "Missing privacy policy" | Ensure privacy policy URL is accessible and complete |
| "Data deletion not working" | Test your data deletion callback endpoint |

---

*Last updated: December 2024*
