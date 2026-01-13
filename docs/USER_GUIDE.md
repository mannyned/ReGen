# ReGenr User Guide

Welcome to ReGenr - your AI-powered content repurposing platform. This guide will walk you through all features and help you get the most out of the app.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Uploading Content](#uploading-content)
4. [AI Content Generation](#ai-content-generation)
5. [Caption Workflow](#caption-workflow)
6. [Scheduling Posts](#scheduling-posts)
7. [Analytics](#analytics)
8. [Settings & Connections](#settings--connections)
9. [Plan Features](#plan-features)

---

## Getting Started

### Creating an Account

1. Visit the ReGenr homepage
2. Click **Sign Up**
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile setup

### Connecting Social Media Accounts

1. Go to **Settings** from the navigation menu
2. Click **Connect** next to each platform you want to use
3. Authorize ReGenr in the platform's OAuth flow
4. Once connected, you'll see a green checkmark

**Supported Platforms:**
- Instagram (Posts, Reels, Stories, Carousels)
- TikTok (Videos)
- YouTube (Videos, Shorts)
- Twitter/X (Images, Videos, Text)
- LinkedIn (Images, Videos, Articles)
- Facebook (Posts, Reels, Stories)
- Snapchat (Videos, Spotlight)
- Pinterest (Images, Pins)
- Discord (Images, Videos, Text)

> **Connection Status:** On the Upload page, connected platforms show a green indicator dot, while disconnected platforms show an orange indicator.

---

## Dashboard

The Dashboard is your central hub for managing content.

### Overview Cards
- **Posts This Month** - Total posts scheduled/published
- **Engagement Rate** - Average engagement across platforms
- **Scheduled Posts** - Upcoming content in queue
- **Connected Platforms** - Active social media connections

### Quick Actions
- **Create New** - Start a new content upload
- **Schedule Post** - Jump to scheduling
- **View Analytics** - See performance metrics

### Recent Activity
Track your latest actions including:
- Posts published
- AI captions generated
- Content scheduled
- Platform connections

---

## Uploading Content

### Supported Content Types

| Type | Formats | Max Size |
|------|---------|----------|
| Video | MP4, MOV, AVI, WebM | 500 MB |
| Image | JPG, PNG, GIF, WebP | 50 MB |
| Mixed Media | Images + Videos | 500 MB |
| Text/URL | Plain text or URL | - |

### Upload Process

1. **Go to Upload** - Click "Upload" in the navigation
2. **Choose Content Type** - Select Video, Image, Mixed Media, or Text/URL
3. **Drag & Drop** - Drop files into the upload zone, or click to browse
4. **Select Platforms** - Choose which platforms to publish to
5. **Add Description** - Describe your content for AI caption generation
6. **Add Hashtags** - Enter custom hashtags (optional)
7. **Continue** - Proceed to caption generation

### Mixed Media Upload (Carousels)

Upload a combination of images and videos for carousel posts:

| Platform | Max Items | Video Support | Notes |
|----------|-----------|---------------|-------|
| Instagram | 10 | Yes | True carousel via Graph API |
| Facebook | 10 | Yes | Multi-photo post |
| Twitter/X | 4 | No (images only) | No mixed media |
| LinkedIn | 20 | No (images only) | Carousel document |
| Snapchat | 10 | Yes | Sequential stories |
| Discord | 10 | Yes | Multi-attachment |
| Pinterest | 5 | No (images only) | Carousel pin |

**Tips for Mixed Media:**
- The first image becomes your cover image
- Drag to reorder items before publishing
- Platforms that don't support all items will show a truncation warning
- Videos have platform-specific duration limits (e.g., Instagram: 60s per video)

### Text/URL Upload

For bloggers, news publishers, and content sharers:

1. Select **Text/URL** mode
2. Enter your text content OR paste a URL
3. **Optional:** Add images or videos to accompany your text/URL
4. The AI will analyze your URL content to generate relevant captions

**URL Content Analysis:**
When you paste a URL, ReGenr will:
- Fetch and read the webpage content
- Extract the title, description, and article text
- Use this context to generate accurate, relevant captions

**Example:** Paste a news article URL, and the AI generates:
> "Breaking: Scientists achieve major breakthrough in renewable energy! New solar technology could revolutionize how we power homes. Read more about this game-changing discovery."

Instead of a generic caption, the AI understands and references the actual article content.

### Multi-File Upload
- Upload multiple images for carousel posts
- Platform limits apply:
  - Instagram: Up to 10 images
  - Facebook: Up to 10 images
  - Twitter/X: Up to 4 images
  - Others: 1 file only

---

## AI Content Generation

### Caption Generation

ReGenr uses AI to create optimized captions for each platform.

#### Tone Selection
Choose your caption style:
- **Professional** - Formal, business-focused language
- **Engaging** - Fun, attention-grabbing with emojis
- **Casual** - Friendly, relaxed conversational tone

#### What the AI Analyzes

The AI considers multiple content sources when generating captions:

| Content Type | How AI Uses It |
|--------------|----------------|
| **Images/Videos** | Visually analyzes the content using GPT-4 Vision |
| **URL Content** | Fetches and reads the webpage to understand the linked article |
| **Text Content** | Uses your written text as context |
| **Description** | Incorporates your content description |

#### URL Content Analysis

When you include a URL in Text/URL mode, the AI:
1. Fetches the webpage content
2. Extracts: Title, description, author, and article text
3. Generates captions that reference the actual content

This is especially useful for:
- Sharing news articles with accurate summaries
- Promoting blog posts with relevant hooks
- Creating engaging captions for shared links

> **Note:** URLs are automatically appended to your caption as plain text on all platforms.

#### Regenerating Captions
1. Click **Regenerate** on any platform preview
2. Select your preferred tone
3. AI generates a new caption optimized for that platform
4. If a URL was provided, the AI re-analyzes the link content

### Brand Voice AI (Pro)

Create and maintain consistent brand voice across all content:

1. **Analyze Content** - Upload 5+ examples of your content
2. **Generate Profile** - AI extracts your brand voice patterns
3. **Apply to Captions** - Toggle "Use Brand Voice" when generating
4. **Refine** - Adjust vocabulary, tone, and style preferences

---

## Caption Workflow

The Caption Workflow lets you create one primary caption and adapt it across platforms.

### Starting the Workflow

1. On the Generate page, click **Start Workflow**
2. Select your **Source Platform** (the platform your caption is optimized for)
3. **Generate** with AI or **Write Manually**

### Understanding Usage Modes

| Mode | Badge Color | Description |
|------|-------------|-------------|
| Identical | Green | Same as primary caption |
| Adapted | Purple | Rule-based modifications applied |
| Edited | Blue | Manual changes made |
| Rewritten | Orange | Full AI regeneration |

### 11 Available Adaptations

Click **Adapt** on any platform to apply these modifications:

| Adaptation | What It Does | Best For |
|------------|--------------|----------|
| Shorten | Truncate to fit character limit | Twitter, Snapchat |
| Remove Hashtags | Strip all hashtags | Snapchat |
| Reduce Hashtags | Keep top 3-5 hashtags | Twitter, TikTok |
| Remove Emojis | Strip all emojis | LinkedIn |
| Reduce Emojis | Limit to 2-3 emojis | LinkedIn |
| Add Line Breaks | Add paragraph spacing | Instagram, LinkedIn |
| Remove Line Breaks | Condense to one paragraph | Twitter |
| Add CTA | Append call-to-action | YouTube, All |
| Remove Mentions | Strip @mentions | Cross-posting |
| Professional Tone | Business-appropriate adjustments | LinkedIn |
| Casual Tone | Informal, fun adjustments | TikTok |

### Workflow Tips

- **Auto-fit** - Click when over character limit for automatic shortening
- **Reset** - Revert any platform back to the primary caption
- **Edit** - Make manual changes to any platform's caption
- **Review** - Check all platforms before confirming

---

## Scheduling Posts

### Creating a Schedule

1. After generating captions, click **Proceed to Export**
2. Select posts to schedule
3. Choose date and time for each platform
4. Click **Schedule** to confirm

### Schedule Views

- **Calendar View** - See posts on a monthly calendar
- **List View** - Chronological list of scheduled posts
- **Platform View** - Group by social media platform

### Optimal Timing

Pro users see AI-recommended posting times based on:
- Historical engagement data
- Platform-specific best times
- Audience activity patterns

### Managing Scheduled Posts

- **Edit** - Modify caption or timing
- **Reschedule** - Change date/time
- **Delete** - Remove from schedule
- **Post Now** - Publish immediately

---

## Analytics

### Accessing Analytics

Go to **Analytics** from the navigation menu.

> **Note:** Analytics requires Creator ($9/mo) or Pro ($29/mo) plan.

### Dashboard Overview

#### Key Metrics
- **Total Posts** - Posts published in selected period
- **Total Reach** - Audience reached across platforms
- **Avg Engagement** - Average engagement rate
- **AI Generated** - Posts using AI captions

#### Time Range
Select viewing period:
- 7 Days
- 30 Days
- 90 Days
- 1 Year

### Platform Performance

See metrics for each connected platform:
- Posts published
- Engagement rate
- Reach per post
- Growth trend (Pro)
- Best posting times (Pro)

### Top Formats

Compare performance by content type:
- Video
- Image
- Text
- Carousel

### AI Impact

Compare engagement between:
- Posts with AI-generated captions
- Posts with manual captions

---

## Caption Usage Analytics (Pro)

Track how different caption strategies perform:

### Usage Distribution
- **Identical** - Captions used exactly as primary
- **Adapted** - Rule-based modifications applied
- **Edited** - Manual changes made
- **Rewritten** - Full AI rewrites

### Performance Comparison

See which caption mode drives best results:
- Engagement rates by mode
- Average reach by mode
- Likes and comments breakdown

### Top Performing Adaptations

Ranked list of which adaptations boost engagement:
1. Shorten (+18% avg)
2. Add CTA (+15% avg)
3. Add Line Breaks (+12% avg)
4. Professional Tone (+9% avg)

### Platform Insights

Platform-specific recommendations:
- **Twitter** - Adapted captions +32% better (Shorten works best)
- **LinkedIn** - Adapted +28% (Professional tone wins)
- **Instagram** - Identical +5% (Full captions perform well)
- **TikTok** - Adapted +22% (Casual tone preferred)

---

## Additional Pro Analytics

### Save Rate Analytics (Creator+)
- Track how often content gets saved
- See save rate by format
- Top 5 most saved posts
- Platform breakdown

### Location Analytics (Pro)
- Interactive engagement map
- Country/region/city breakdown
- Emerging market detection
- AI-powered location insights

### Retention Analytics (Pro)
- Video retention curves
- Hook score analysis
- Drop-off point detection
- Completion rate tracking

### Export Analytics (Pro)

Export your analytics data in multiple formats:

**Export Options:**
- **CSV** - Spreadsheet-compatible data
- **PDF** - Formatted report with charts
- **Google Sheets** - Direct integration (requires Google account)

**Platform Filtering:**
- Select specific platforms to include in your export
- Choose from: Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Facebook, Snapchat, Pinterest, Discord
- Leave empty to export all platforms

**Export Features:**
- Schedule automated reports
- Create shareable links
- Custom date ranges

---

## Settings & Connections

### Platform Connections

Manage your social media connections:
- **Connect** - Link new platforms
- **Disconnect** - Remove platform access
- **Refresh** - Update connection status
- **Test** - Verify connection is working

### Account Settings

- Profile information
- Email preferences
- Notification settings
- Password change

### Plan Management

- View current plan
- Upgrade/downgrade options
- Billing history
- Usage statistics

---

## Plan Features

### Free Plan
- 3 uploads per month
- 2 platform connections
- Basic AI captions
- Caption Workflow

### Creator Plan ($9/mo)
- Unlimited uploads
- 5 platform connections
- Advanced AI captions
- Caption Workflow
- Save Rate Analytics
- Platform Performance

### Pro Plan ($29/mo)
Everything in Creator, plus:
- Unlimited platform connections
- Location Analytics
- Retention Analytics
- Caption Usage Analytics
- AI Recommendations
- Brand Voice AI
- Analytics Export
- Scheduled Reports
- Best Posting Times
- Advanced Metrics

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + U` | Upload content |
| `Ctrl/Cmd + G` | Generate captions |
| `Ctrl/Cmd + S` | Schedule post |
| `Ctrl/Cmd + A` | View analytics |
| `Esc` | Close modal/menu |

---

## Troubleshooting

### Common Issues

**OAuth Connection Failed**
- Ensure pop-ups are allowed
- Try disconnecting and reconnecting
- Check that your social account is in good standing

**Caption Generation Slow**
- AI generation typically takes 3-5 seconds
- Check your internet connection
- Try regenerating with a different tone

**File Upload Failed**
- Check file size limits
- Ensure format is supported
- Try a smaller file or different format

**Scheduled Post Not Publishing**
- Verify platform connection is active
- Check that account has posting permissions
- Ensure content meets platform guidelines

### Getting Help

- **Documentation** - Check our [docs](/docs)
- **Email Support** - support@regen.app
- **GitHub Issues** - Report bugs on GitHub

---

## Best Practices

### For Maximum Engagement

1. **Use Caption Workflow** - Adapted captions outperform identical by 32%
2. **Apply Platform-Specific Adaptations** - Each platform has preferences
3. **Post at Optimal Times** - Check AI recommendations (Pro)
4. **Track What Works** - Review Caption Usage Analytics
5. **Maintain Brand Voice** - Use Brand Voice AI for consistency

### Content Tips

- **Video** - First 3 seconds are crucial (hook score)
- **Images** - High quality, clear subject
- **Captions** - Include call-to-action when appropriate
- **Hashtags** - Use platform-appropriate amounts

### Platform-Specific Tips

| Platform | Caption Length | Hashtags | Tone |
|----------|---------------|----------|------|
| Instagram | Medium-long | 5-15 | Engaging |
| TikTok | Short | 3-5 | Casual |
| Twitter | Very short | 1-3 | Direct |
| LinkedIn | Long | 3-5 | Professional |
| YouTube | Medium | 5-10 | Informative |
| Facebook | Medium | 3-5 | Friendly |
| Snapchat | Very short | 0 | Fun |
| Pinterest | Medium | 5-10 | Descriptive |
| Discord | Short-medium | 0 | Casual |

---

## Updates & Changelog

Stay updated with new features:
- Check the Dashboard for announcements
- Follow our blog for detailed release notes
- Subscribe to email updates in Settings

### Recent Updates (January 2026)

#### URL Content Analysis for AI Captions
- AI now fetches and analyzes webpage content when you paste a URL
- Extracts title, description, author, and article text
- Generates more relevant, contextual captions based on the actual content
- Perfect for news articles, blog posts, and shared links

#### Mixed Media Upload (Carousels)
- New "Mixed Media" upload option combines images and videos
- Create carousel posts with both media types on Instagram and Facebook
- Drag-and-drop reordering of carousel items
- Platform-specific item limits and truncation warnings
- Info box shows which platforms support mixed media

#### Text/URL with Media
- Text/URL mode now supports optional image/video uploads
- Perfect for bloggers and news publishers
- Combine article links with featured images
- AI considers both URL content and visual media

#### Export Analytics Improvements
- Added Discord and Pinterest to platform selection
- Platform filtering now works correctly for all export types
- CSV, PDF, and Google Sheets exports include selected platforms only

#### URL Appending to Captions
- URLs from Text/URL uploads are now always included in captions
- Automatically appended as plain text at the end of each caption
- Works across all platforms (Instagram, Facebook, LinkedIn, etc.)

---

**Need more help?** Contact us at support@regen.app or visit our [documentation](./README.md).
