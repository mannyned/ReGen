/**
 * FAQ Data Structure
 *
 * Config-driven FAQ content for the Help page.
 * Each item has a stable anchor ID for deep linking.
 */

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQSection {
  id: string;
  title: string;
  icon: string;
  items: FAQItem[];
}

export const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    items: [
      {
        id: 'what-is-regenr',
        question: 'What is ReGenr?',
        answer: `ReGenr is a content repurposing platform that helps creators and marketers transform their existing content into fresh social media posts. Upload your content once, and we'll help you regenerate it into multiple formats optimized for different platforms.

Whether you're a solo creator or part of a team, ReGenr saves you hours of work by intelligently adapting your content while maintaining your unique voice.`,
      },
      {
        id: 'how-regeneration-works',
        question: 'How does "regeneration" work?',
        answer: `Regeneration is our core feature that transforms your content into platform-ready posts:

1. **Upload** your original content (text, images, videos, or import from content feeds)
2. **Generate** AI-powered variations optimized for each platform
3. **Review & Edit** the generated content to match your style
4. **Schedule or Publish** directly to your connected accounts

Our AI analyzes your content's tone, key messages, and structure to create engaging posts that feel authentic to your brand.`,
      },
    ],
  },
  {
    id: 'content-creation',
    title: 'Content Creation',
    icon: '📝',
    items: [
      {
        id: 'upload-types',
        question: 'What types of content can I upload?',
        answer: `ReGenr supports multiple content types:

**Video**
- Formats: MP4, MOV, AVI, WebM
- Max size: 500 MB

**Image**
- Formats: JPG, PNG, GIF, WebP
- Max size: 50 MB

**Mixed Media (Carousels)**
- Combine images and videos
- Max size: 500 MB total

**Text/URL**
- Plain text content
- URLs to articles or webpages
- Optional: Add images or videos to accompany your text/URL`,
      },
      {
        id: 'mixed-media-carousel',
        question: 'What is Mixed Media upload?',
        answer: `Mixed Media lets you upload a combination of images and videos to create carousel posts.

**Platform Support:**
| Platform | Max Items | Video Support |
|----------|-----------|---------------|
| Instagram | 10 | Yes |
| Facebook | 10 | Yes |
| Twitter/X | 4 | Images only |
| LinkedIn | 20 | Images only |
| Snapchat | 10 | Yes |
| Discord | 10 | Yes |
| Pinterest | 5 | Images only |

**Tips:**
- The first image becomes your cover image
- Drag to reorder items before publishing
- Platforms that don't support all items will show a truncation warning
- Videos have platform-specific duration limits`,
      },
      {
        id: 'text-url-upload',
        question: 'How does Text/URL upload work?',
        answer: `Text/URL mode is perfect for bloggers, news publishers, and content sharers:

1. Select **Text/URL** mode in the upload section
2. Enter your text content OR paste a URL
3. **Optional:** Add images or videos to accompany your text/URL
4. The AI will analyze your content to generate relevant captions

**URL Content Analysis:**
When you paste a URL, ReGenr will:
- Fetch and read the webpage content
- Extract the title, description, and article text
- Use this context to generate accurate, relevant captions

**Note:** URLs are automatically appended to your captions when publishing, so your audience can click through to the original content.`,
      },
      {
        id: 'ai-url-analysis',
        question: 'How does AI analyze URLs for captions?',
        answer: `When you include a URL in your upload, our AI does more than just include the link - it actually reads and understands the content.

**What the AI extracts:**
- Page title
- Meta description
- Author name
- Article content

**How it helps:**
Instead of generic captions, you get contextually relevant ones. For example, if you paste a news article URL about a tech breakthrough, the AI generates:

*"Breaking: Scientists achieve major breakthrough in renewable energy! New solar technology could revolutionize how we power homes. Read more about this game-changing discovery."*

The AI references actual content from the article, not just the URL.

**Regenerating captions:**
When you click "Regenerate" on any platform preview, the AI re-analyzes the URL content to generate fresh variations.`,
      },
      {
        id: 'caption-workflow',
        question: 'What is the Caption Workflow?',
        answer: `The Caption Workflow lets you create one primary caption and adapt it across platforms.

**How it works:**
1. Click "Start Workflow" on the Generate page
2. Select your source platform
3. Generate with AI or write manually
4. Adapt for other platforms using our tools

**Usage Modes:**
- **Identical** (Green) - Same as primary caption
- **Adapted** (Purple) - Rule-based modifications applied
- **Edited** (Blue) - Manual changes made
- **Rewritten** (Orange) - Full AI regeneration

**Available Adaptations:**
- Shorten to fit character limits
- Remove or reduce hashtags
- Remove or reduce emojis
- Add/remove line breaks
- Add call-to-action
- Adjust tone (Professional/Casual)`,
      },
      {
        id: 'ai-image-analysis',
        question: 'Does the AI analyze my images?',
        answer: `Yes! When you upload images or videos, our AI uses GPT-4 Vision to analyze the visual content.

**What the AI looks at:**
- Objects and subjects in the image
- Scene and setting
- Colors and mood
- Text visible in the image
- Actions or activities shown

**How it helps:**
The AI creates captions that accurately describe and reference what's actually in your visual content, making your posts more relevant and engaging.

**Example:**
Upload a photo of a sunset at the beach, and the AI might generate:
*"Golden hour magic at its finest. Nothing beats watching the sun dip below the horizon while the waves keep their eternal rhythm."*`,
      },
    ],
  },
  {
    id: 'meta-connection',
    title: 'Connecting Platforms',
    icon: '🔗',
    items: [
      {
        id: 'why-facebook-for-instagram',
        question: 'Why do I need to connect Facebook to use Instagram?',
        answer: `Instagram's API requires a Facebook Business account connection. This is a Meta requirement, not ours.

**Here's why:**
- Instagram's Content Publishing API only works through Facebook's Graph API
- Your Instagram account must be a Professional account (Business or Creator)
- It must be linked to a Facebook Page

**To set this up:**
1. Convert your Instagram to a Professional account in Instagram settings
2. Create or use an existing Facebook Page
3. Link your Instagram to that Facebook Page
4. Then connect through ReGenr`,
      },
      {
        id: 'permissions-requested',
        question: 'What permissions do you request and why?',
        answer: `We only request permissions essential for posting and analytics:

**Required Permissions:**
- **pages_show_list** - See your Facebook Pages
- **pages_read_engagement** - Read post performance
- **pages_manage_posts** - Create and schedule posts
- **instagram_basic** - Access your Instagram profile
- **instagram_content_publish** - Post to Instagram

**We never:**
- Access your private messages
- Post without your explicit action
- Share your data with third parties
- Store your Facebook/Instagram password`,
      },
      {
        id: 'callback-url',
        question: 'What is a callback URL?',
        answer: `A callback URL (or redirect URI) is where Meta sends you after you approve permissions. It's a security measure that ensures you're returned to the legitimate ReGenr app.

Our callback URL is: \`https://regenr.app/api/auth/facebook/callback\`

If you're a developer setting up your own Meta app, this URL must be added to your app's Valid OAuth Redirect URIs in the Meta Developer Console.`,
      },
      {
        id: 'connection-failed',
        question: 'Why did my connection fail?',
        answer: `Common reasons for connection failures:

**Account Issues:**
- Instagram isn't a Professional account (Business/Creator)
- Instagram isn't linked to a Facebook Page
- You denied required permissions during the flow

**Technical Issues:**
- Browser blocked the popup or redirect
- Session expired mid-flow (try again)
- Meta's servers are temporarily down

**Fixes to try:**
1. Ensure your Instagram is a Professional account
2. Link it to a Facebook Page in Instagram settings
3. Clear browser cookies and try again
4. Use an incognito/private window
5. Check [Meta's Status Page](https://metastatus.com) for outages`,
      },
      {
        id: 'disconnect-reconnect',
        question: 'How do I disconnect or reconnect?',
        answer: `**To disconnect:**
1. Go to Settings → Integrations
2. Click "Disconnect" next to the platform
3. Confirm the disconnection

**To reconnect:**
1. Go to Settings → Integrations
2. Click "Connect" for the platform
3. Complete the authorization flow

**Note:** Disconnecting removes your tokens from ReGenr but doesn't revoke access on Meta's side. To fully revoke, go to Facebook Settings → Apps and Websites → Remove ReGenr.`,
      },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling & Posting',
    icon: '📅',
    items: [
      {
        id: 'how-scheduling-works',
        question: 'How does scheduling work in ReGenr?',
        answer: `ReGenr lets you schedule posts in advance:

1. **Create your content** in the Upload or Generate section
2. **Select platforms** where you want to post
3. **Choose date & time** from the calendar picker
4. **Review & Schedule** - we'll handle the rest

Your scheduled posts appear in the Schedule tab where you can edit, reschedule, or cancel them anytime before they go live.`,
      },
      {
        id: 'scheduled-posts-fail',
        question: 'Why did my scheduled post fail?',
        answer: `Scheduled posts can fail for several reasons:

**Permission Issues:**
- Your platform connection expired (reconnect in Settings)
- Required permissions were revoked on Meta's side
- Your Instagram was converted back to Personal account

**Content Issues:**
- Image doesn't meet platform requirements (size, format)
- Caption exceeds character limits
- Content violates platform guidelines

**Platform Limitations:**
- Instagram has rate limits on posting frequency
- Meta's servers may be temporarily unavailable

**What happens when a post fails:**
- You'll receive an email notification
- The post status changes to "Failed" in your Schedule
- You can retry or edit the post from there`,
      },
      {
        id: 'timezones',
        question: 'How do timezones work?',
        answer: `**Display:** Times are shown in your local timezone (detected from your browser)

**Storage:** We store all times in UTC internally for consistency

**Scheduling:** When you pick "3:00 PM", that's 3:00 PM in YOUR timezone

**Tip:** If you're scheduling for a different timezone audience, consider when they're most active, not when you are. Our analytics can help identify optimal posting times.`,
      },
      {
        id: 'duplicate-prevention',
        question: 'How do you prevent duplicate posts?',
        answer: `We have safeguards to prevent accidental duplicates:

**Before Scheduling:**
- We warn if similar content was recently posted
- Each scheduled post has a unique ID

**During Publishing:**
- Posts are marked as "Publishing" to prevent double-triggers
- If a post succeeds, it's marked "Published"
- If it fails, it's marked "Failed" (not retried automatically)

**Manual Retries:**
- Failed posts can be manually retried from the Schedule tab
- You control when and if to retry`,
      },
    ],
  },
  {
    id: 'rss',
    title: 'Content Feeds',
    icon: '📡',
    items: [
      {
        id: 'what-is-rss',
        question: 'What are Content Feeds?',
        answer: `Content Feeds let you automatically pull new content from blogs, newsletters, and websites to regenerate and schedule posts.

**How it works:**
ReGenr uses RSS (Really Simple Syndication) technology to subscribe to content updates from your favorite sources.

**Why it's useful:**
- Import content from your favorite sources automatically
- Stay updated on industry news to repurpose
- Never miss content from sources you follow

Think of it as a content pipeline that brings fresh material directly into ReGenr for regeneration.`,
      },
      {
        id: 'add-rss-feed',
        question: 'How do I add a content feed?',
        answer: `**Option 1: Discover Tab**
1. Go to Content Feeds → Discover tab
2. Browse curated feeds by category
3. Click "Add" on any feed you like

**Option 2: Custom URL**
1. Go to Content Feeds → My Feeds tab
2. Click "Add Content Feed"
3. Paste a blog or newsletter feed URL
4. ReGenr will check for new posts automatically

**Finding Feed URLs:**
- Look for RSS/Feed icons on websites
- Try adding \`/feed\`, \`/rss\`, or \`/feed.xml\` to the site URL
- Check the website's footer or "Subscribe" page`,
      },
      {
        id: 'feed-not-loading',
        question: 'Why won\'t my feed load?',
        answer: `Common reasons a feed might not load:

**Invalid URL:**
- The URL doesn't point to a valid RSS/Atom feed
- The website doesn't have an RSS feed

**Access Restricted:**
- The feed requires authentication (paywalled content)
- The server blocks automated requests
- Geographic restrictions

**Technical Issues:**
- The feed's server is temporarily down
- The feed XML is malformed
- Request timeout (server too slow)

**Troubleshooting:**
1. Test the URL in your browser first
2. Try the Discover tab for pre-validated feeds
3. Check if the source requires a subscription`,
      },
      {
        id: 'feed-check-frequency',
        question: 'How often are feeds checked?',
        answer: `**Automatic Checks:**
- All active feeds are checked once daily (8:00 AM UTC)
- This is optimized for Vercel's hosting limits

**Manual Refresh:**
- Click the refresh icon next to any feed for immediate update
- Useful when you know new content was just published

**Coming Soon:**
- More frequent checks for Pro users
- Webhook support for instant updates`,
      },
      {
        id: 'what-gets-ingested',
        question: 'What content is imported from feeds?',
        answer: `**We import:**
- Title of each article/post
- Link to the original content
- Description/summary text
- Publication date
- Author (if available)
- Featured image (if available)
- Categories/tags

**What you can do with it:**
- Review items in the Content Feeds tab
- Mark items as "Reviewed" to track what you've seen
- Use content as inspiration for regeneration
- Convert directly to scheduled posts (coming soon)

**We don't import:**
- Full article text (we link to the original)
- Paywalled content
- Comments or user data`,
      },
    ],
  },
  {
    id: 'plans-access',
    title: 'Plans & Access',
    icon: '💎',
    items: [
      {
        id: 'plan-comparison',
        question: 'What\'s the difference between plans?',
        answer: `**Free Plan**
- 2 platform connections
- 5 scheduled posts/month
- Basic analytics
- 5 content feeds included

**Creator Plan**
- 5 platform connections
- Unlimited scheduled posts
- Full analytics
- 10 content feeds included
- Priority support

**Pro Plan**
- Unlimited platform connections
- Everything in Creator
- 20 content feeds included
- Team workspace (3 seats)
- Advanced analytics permissions
- API access (coming soon)

*Pricing will be announced when we exit beta. Beta users will receive special early-adopter rates.*`,
      },
      {
        id: 'beta-pro',
        question: 'What is Beta Pro?',
        answer: `Beta Pro is our early adopter program that gives you full Pro features for free during our beta period.

**What you get:**
- All Pro features at no cost
- Help shape the product with your feedback
- Grandfathered pricing when we launch

**How long does it last:**
- Beta period is currently unlimited
- We'll give 30 days notice before any changes
- You'll have the option to convert to a paid plan or downgrade

**After Beta:**
- Beta Pro users get first access to discounted annual plans
- Your data and connections remain intact`,
      },
      {
        id: 'connection-limits',
        question: 'What are platform connection limits?',
        answer: `Each plan has different limits on how many social accounts you can connect:

| Plan | Connections |
|------|-------------|
| Free | 2 |
| Creator | 5 |
| Pro | Unlimited |

**What counts as a connection:**
- Each Instagram account = 1 connection
- Each Facebook Page = 1 connection
- Future platforms will follow the same model

**Hitting your limit:**
- You'll see a message when trying to add more
- Upgrade your plan or disconnect unused accounts`,
      },
      {
        id: 'rss-limits',
        question: 'How many content feeds can I add?',
        answer: `Content feeds included by plan:

| Plan | Content Feeds |
|------|---------------|
| Free | 5 |
| Creator | 10 |
| Pro | 20 |

**Note:** These limits are per user. Team workspaces share the owner's limit.

**Reaching your limit:**
- You'll see a "Limit reached" message
- Upgrade to add more content feeds, or remove unused feeds`,
      },
    ],
  },
  {
    id: 'teams',
    title: 'Teams (Pro)',
    icon: '👥',
    items: [
      {
        id: 'what-is-workspace',
        question: 'What is a shared workspace?',
        answer: `A shared workspace lets multiple team members collaborate on content:

**Shared Resources:**
- All connected platforms
- Scheduled and published posts
- Content feeds and imported items
- Analytics data (with permissions)

**Not Shared:**
- Individual login credentials
- Billing information (owner only)
- Personal settings

**Best for:**
- Agencies managing client accounts
- Marketing teams sharing responsibilities
- Content teams with multiple contributors`,
      },
      {
        id: 'seat-counting',
        question: 'How do seats work?',
        answer: `Pro plan includes 3 seats total (1 owner + 2 members).

**Who counts as a seat:**
- The account owner (you) = 1 seat
- Each invited team member = 1 seat
- Pending invites don't count until accepted

**Need more seats?**
- Contact us for custom team pricing
- Enterprise plans available for larger teams

**Removing members:**
- Go to Settings → Team
- Click "Remove" next to the member
- Their seat becomes available immediately`,
      },
      {
        id: 'team-roles',
        question: 'What\'s the difference between Owner/Admin and Member?',
        answer: `**Owner (you)**
- Full access to everything
- Manage billing and subscription
- Invite/remove team members
- Set permissions for members
- Cannot be removed

**Admin**
- Same as Owner except:
- Cannot manage billing
- Cannot remove the Owner
- Can manage other members

**Member**
- Create and schedule content
- View shared analytics (if permitted)
- Cannot manage team or billing
- Cannot change workspace settings`,
      },
      {
        id: 'downgrade-teams',
        question: 'What happens to my team if I downgrade?',
        answer: `If you downgrade from Pro:

**Immediate:**
- Team members lose access to the workspace
- Invites are cancelled
- You retain all content and connections

**Grace Period (7 days):**
- Members can still view (not edit) content
- Time to export or transfer ownership

**After Grace Period:**
- Workspace converts to individual account
- Team features are disabled
- Re-upgrading restores team capabilities

**Tip:** Export important data before downgrading, and give your team advance notice.`,
      },
    ],
  },
  {
    id: 'analytics-permissions',
    title: 'Analytics & Export',
    icon: '📊',
    items: [
      {
        id: 'member-analytics-default',
        question: 'What analytics can team members see?',
        answer: `**By default, members can see:**
- Their own posts' performance
- Content-level metrics (likes, comments, shares)
- Basic engagement data

**By default, members cannot see:**
- Account-level analytics
- Follower growth data
- Revenue/conversion metrics
- Other members' individual performance`,
      },
      {
        id: 'admin-analytics-toggle',
        question: 'Can I give members access to more analytics?',
        answer: `Yes! Admins and Owners can enable expanded analytics for members:

**To enable:**
1. Go to Settings → Team
2. Find the team member
3. Toggle "View Account Analytics"

**This unlocks:**
- Account-level metrics
- Follower insights
- Historical performance data
- Export capabilities

**Note:** This is per-member, so you can customize access for each team member.`,
      },
      {
        id: 'analytics-locked',
        question: 'Why are some analytics locked?',
        answer: `Analytics may be locked for several reasons:

**Plan Limitations:**
- Free plan has basic analytics only
- Advanced metrics require Creator or Pro

**Permission Settings:**
- You're a team member without analytics access
- Ask your workspace admin to enable it

**Data Availability:**
- New accounts need time to gather data
- Some metrics require minimum post volume
- Platform API limitations

**To unlock:**
- Upgrade your plan, or
- Request access from your team admin`,
      },
      {
        id: 'export-analytics',
        question: 'How do I export my analytics data?',
        answer: `Pro plan users can export analytics data in multiple formats:

**Export Options:**
- **CSV** - Spreadsheet-compatible data
- **PDF** - Formatted report with charts
- **Google Sheets** - Direct integration (requires Google account)

**To export:**
1. Go to Analytics
2. Click "Export" in the top right
3. Select your preferred format
4. Choose platforms to include
5. Download or connect to Google Sheets

**Platform Filtering:**
Select specific platforms to include in your export:
- Instagram, TikTok, YouTube, Twitter/X
- LinkedIn, Facebook, Snapchat
- Pinterest, Discord

Leave empty to export all connected platforms.`,
      },
      {
        id: 'caption-usage-analytics',
        question: 'What are Caption Usage Analytics?',
        answer: `Pro plan users can track how different caption strategies perform:

**Usage Distribution:**
See the breakdown of how you use captions:
- Identical - Used exactly as primary
- Adapted - Rule-based modifications
- Edited - Manual changes made
- Rewritten - Full AI rewrites

**Performance Comparison:**
Compare engagement rates by caption mode:
- Average engagement by mode
- Reach comparison
- Likes and comments breakdown

**Top Performing Adaptations:**
See which adaptations boost engagement:
- Shorten (+18% avg)
- Add CTA (+15% avg)
- Add Line Breaks (+12% avg)
- Professional Tone (+9% avg)

**Platform Insights:**
Get platform-specific recommendations based on your data.`,
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & Privacy',
    icon: '🔧',
    items: [
      {
        id: 'password-storage',
        question: 'Do you store my password?',
        answer: `**No, we never store your password.**

**How authentication works:**
- You sign in with email magic links or OAuth
- Social connections use OAuth tokens (not passwords)
- Tokens are encrypted at rest
- We can't access your social media passwords

**Your security:**
- All data transmitted over HTTPS
- Tokens encrypted with AES-256
- Regular security audits
- SOC 2 compliance in progress`,
      },
      {
        id: 'data-stored',
        question: 'What data do you store?',
        answer: `**Account Data:**
- Email address
- Profile information you provide
- Plan and billing info (via Stripe)

**Content Data:**
- Posts you create in ReGenr
- Scheduled content
- Imported content feed items
- Generated captions

**Platform Tokens:**
- OAuth access tokens (encrypted)
- Refresh tokens (encrypted)
- Never your passwords

**Analytics Data:**
- Post performance metrics
- Aggregated engagement data
- No personal data from your followers

**We don't sell your data. Ever.**`,
      },
      {
        id: 'report-issue',
        question: 'How do I report an issue?',
        answer: `**To report a bug or issue:**

1. **Email us:** support@regenr.app

2. **Include:**
   - What you were trying to do
   - What happened instead
   - Steps to reproduce the issue
   - Screenshots (if helpful)
   - Your browser and device

3. **For urgent issues:**
   - Mark email as "URGENT"
   - We aim to respond within 24 hours

**Feature Requests:**
- Email with subject "Feature Request"
- We read every suggestion!`,
      },
      {
        id: 'delete-account',
        question: 'How do I delete my account?',
        answer: `**To delete your account:**

1. Go to Settings → Account
2. Scroll to "Danger Zone"
3. Click "Delete Account"
4. Confirm by typing your email

**What gets deleted:**
- Your profile and settings
- All created content
- Connected platform tokens
- Team workspace (if owner)

**What we retain (30 days):**
- Billing records (legal requirement)
- Anonymized analytics

**Note:** This action is irreversible. Export your data first if needed.`,
      },
    ],
  },
];

/**
 * Get all FAQ items flattened for search
 */
export function getAllFAQItems(): (FAQItem & { sectionId: string; sectionTitle: string })[] {
  return FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionId: section.id,
      sectionTitle: section.title,
    }))
  );
}

/**
 * Search FAQ items by query
 */
export function searchFAQ(query: string): (FAQItem & { sectionId: string; sectionTitle: string })[] {
  if (!query.trim()) {
    return getAllFAQItems();
  }

  const lowerQuery = query.toLowerCase();
  return getAllFAQItems().filter(
    (item) =>
      item.question.toLowerCase().includes(lowerQuery) ||
      item.answer.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get a specific FAQ item by ID
 */
export function getFAQById(id: string): FAQItem | undefined {
  for (const section of FAQ_SECTIONS) {
    const item = section.items.find((item) => item.id === id);
    if (item) return item;
  }
  return undefined;
}
