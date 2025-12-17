# ReGenr - AI-Powered Content Repurposing Platform

ReGenr is a modern SaaS application that helps content creators repurpose their content across multiple social media platforms using AI. Built with Next.js 16, React 19, and TypeScript.

## Features

### Core Features
- **AI Content Generation** - Automatically generate captions, hashtags, and optimized content for each platform
- **Caption Workflow** - Generate one primary caption and adapt it across platforms with 11 rule-based adaptations
- **Multi-Platform Publishing** - Connect and publish to 7 platforms: Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Facebook, and Snapchat
- **Content Upload** - Drag-and-drop file upload with preview and validation
- **Smart Scheduling** - Schedule posts for optimal engagement times
- **Analytics Dashboard** - Track performance across all platforms with caption usage analytics
- **Brand Voice AI** - Maintain consistent brand voice across all content (Pro)

### Supported Platforms

| Platform | OAuth | Publishing | Analytics | Content Types |
|----------|-------|------------|-----------|---------------|
| Instagram | ✓ | ✓ | ✓ | Images, Videos, Reels, Carousels |
| TikTok | ✓ | ✓ | ✓ | Videos |
| YouTube | ✓ | ✓ | ✓ | Videos, Shorts |
| Twitter/X | ✓ | ✓ | ✓ | Images, Videos, Text |
| LinkedIn | ✓ | ✓ | ✓ | Images, Videos, Articles |
| Facebook | ✓ | ✓ | ✓ | Images, Videos, Reels |
| Snapchat | ✓ | ✓ | ✓ | Videos, Spotlight |

### Plan Tiers

| Feature | Free | Creator ($9/mo) | Pro ($29/mo) |
|---------|------|-----------------|--------------|
| Uploads per month | 3 | Unlimited | Unlimited |
| Platform connections | 2 | 7 | 7 |
| AI captions | Basic | Advanced | Advanced |
| Caption Workflow | ✓ | ✓ | ✓ |
| Save Rate Analytics | - | ✓ | ✓ |
| Location Analytics | - | Locked Preview | ✓ |
| Retention Analytics | - | Locked Preview | ✓ |
| Caption Usage Analytics | - | Locked Preview | ✓ |
| Advanced Metrics | - | Locked Preview | ✓ |
| AI Recommendations | - | Locked Preview | ✓ |
| Brand Voice AI | - | - | ✓ |
| 5-Min Trial Previews | - | ✓ | - |

### Creator Plan - Locked Metrics Experience

Creator users see a polished preview of Pro features with:
- **Name-Only Metrics**: Sentiment, Retention, Virality, Velocity, Cross-Platform displayed as locked cards
- **Blurred Chart Previews**: Visual indicators of what data looks like
- **Hover-to-Reveal CTAs**: Non-intrusive upgrade prompts on interaction
- **5-Minute Trial Previews**: Temporary unlock to try any metric
- **Personalized Upgrade Prompts**: Contextual messaging based on interest

### Analytics Features

#### Save Rate Analytics (Creator+)
- Track how often your content gets saved
- Save rate by content format (carousel, video, image, etc.)
- Platform-by-platform breakdown
- Top 5 most saved posts
- Trend visualization over time

#### Location Analytics (Pro)
- Interactive engagement map
- Country, region, and city breakdown
- Emerging market detection
- Format performance by region
- AI-powered location insights

#### Retention Analytics (Pro)
- Video retention curves
- Hook score and analysis
- Drop-off point detection
- Completion rate tracking
- AI optimization tips

#### Caption Usage Analytics (Pro)
- Compare identical vs adapted caption performance
- Track engagement by caption mode (identical, adapted, edited, rewritten)
- Top performing adaptations ranking
- Platform-specific adaptation insights
- AI-powered recommendations for caption optimization

### Caption Workflow

The Caption Workflow feature allows you to generate one primary caption and intelligently adapt it across multiple platforms:

#### 11 Rule-Based Adaptations
| Adaptation | Description | Best For |
|------------|-------------|----------|
| Shorten | Truncate at sentence/word boundaries | Twitter, Snapchat |
| Remove Hashtags | Strip all hashtags | Snapchat |
| Reduce Hashtags | Keep only top hashtags | Twitter, TikTok |
| Remove Emojis | Strip all emojis | LinkedIn |
| Reduce Emojis | Limit to professional level | LinkedIn |
| Add Line Breaks | Add paragraph breaks | Instagram, LinkedIn |
| Remove Line Breaks | Condense to single paragraph | Twitter |
| Add CTA | Append call-to-action | YouTube, All |
| Remove Mentions | Strip @mentions | Cross-posting |
| Professional Tone | Adjust for business context | LinkedIn |
| Casual Tone | Adjust for casual context | TikTok |

#### Caption Usage Modes
- **Identical** - Same caption across all platforms
- **Adapted** - Rule-based modifications applied
- **Edited** - Manual user modifications
- **Rewritten** - Full AI rewrite requested

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Authentication**: OAuth 2.0 with PKCE support
- **Database**: PostgreSQL (production) with Prisma ORM
- **Token Security**: AES-256-GCM encryption
- **AI**: OpenAI GPT-4 for content generation

## Architecture

### Backend Services

```
lib/
├── config/
│   └── oauth.ts              # OAuth configs for all 7 platforms
├── middleware/
│   ├── rateLimit.ts          # Rate limiting middleware
│   └── validation.ts         # Input validation utilities
├── services/
│   ├── oauth/
│   │   ├── OAuthService.ts   # OAuth flow management
│   │   └── TokenManager.ts   # Encrypted token storage & refresh
│   ├── publishing/
│   │   ├── InstagramPublisher.ts
│   │   ├── TikTokPublisher.ts
│   │   ├── YouTubePublisher.ts
│   │   ├── TwitterPublisher.ts
│   │   ├── LinkedInPublisher.ts
│   │   ├── FacebookPublisher.ts
│   │   ├── SnapchatPublisher.ts
│   │   └── index.ts          # Unified publishing service
│   └── analytics/
│       └── AnalyticsService.ts
└── types/
    └── social.ts             # TypeScript type definitions
```

### Project Structure

```
regen-app/
├── app/
│   ├── analytics/            # Analytics pages
│   │   ├── location/         # Location analytics (Pro)
│   │   ├── retention/        # Retention analytics (Pro)
│   │   ├── save-rate/        # Save rate analytics (Creator+)
│   │   └── page.tsx          # Main analytics dashboard
│   ├── api/                  # API routes
│   │   ├── analytics/        # Analytics endpoints
│   │   ├── oauth/            # OAuth authentication
│   │   ├── publish/          # Content publishing
│   │   ├── brand-voice/      # Brand voice AI
│   │   └── generate-caption/ # AI caption generation
│   ├── components/           # Reusable components
│   │   ├── ui/               # UI component library
│   │   │   ├── index.tsx     # Component exports
│   │   │   ├── PlatformLogo.tsx # Platform logos
│   │   │   ├── Tooltip.tsx   # Platform-aware tooltips
│   │   │   └── LockedMetric.tsx # Locked metric components
│   │   ├── CaptionWorkflow.tsx # Caption workflow component
│   │   └── ExportAnalytics.tsx # Analytics export component
│   ├── config/               # App configuration
│   ├── context/              # React contexts
│   │   ├── PlanContext.tsx   # User plan management
│   │   └── UpgradeIntentContext.tsx # Upgrade tracking
│   ├── dashboard/            # User dashboard
│   ├── generate/             # Content generation
│   ├── login/                # Login page
│   ├── schedule/             # Scheduling interface
│   ├── settings/             # User settings & OAuth
│   ├── signup/               # Registration page
│   ├── upload/               # File upload page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── lib/                      # Backend services & utilities
├── prisma/                   # Database schema
├── public/                   # Static assets
├── docs/                     # Documentation
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL (for production)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mannyned/ReGenr.git
cd regen-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure OAuth credentials for each platform (see [OAuth Setup Guide](./docs/OAUTH_SETUP_GUIDE.md))

5. Set up the database (optional for development):
```bash
npx prisma generate
npx prisma db push
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Reference

### OAuth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/oauth/connect/:platform` | Initiate OAuth flow |
| GET | `/api/oauth/callback/:platform` | Handle OAuth callback |
| GET | `/api/oauth/status` | Get connected platforms |
| POST | `/api/oauth/status` | Check connection health |
| DELETE | `/api/oauth/disconnect/:platform` | Disconnect platform |

### Publishing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/publish` | Publish to one or multiple platforms |
| DELETE | `/api/publish` | Delete a published post |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get account/aggregated analytics |
| GET | `/api/analytics/post/:postId` | Get post-specific analytics |

### Content Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-caption` | Generate AI captions |
| POST | `/api/brand-voice/analyze` | Analyze brand voice |
| POST | `/api/brand-voice/generate` | Generate with brand voice |

For detailed API documentation, see [Backend API Reference](./docs/BACKEND_API_REFERENCE.md).

## Environment Variables

```env
# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/regen"

# Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY=your-64-character-hex-string

# OAuth Credentials (all 7 platforms)
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
SNAPCHAT_CLIENT_ID=
SNAPCHAT_CLIENT_SECRET=

# AI
OPENAI_API_KEY=
```

## Platform Content Limits

| Platform | Caption | Hashtags | Video Duration | Max File Size |
|----------|---------|----------|----------------|---------------|
| Instagram | 2,200 chars | 30 | 90 sec | 100 MB |
| TikTok | 2,200 chars | 100 | 10 min | 287 MB |
| YouTube | 5,000 chars | 60 | 12 hours | 256 GB |
| Twitter/X | 280 chars | 30 | 140 sec | 512 MB |
| LinkedIn | 3,000 chars | 30 | 10 min | 200 MB |
| Facebook | 63,206 chars | 30 | 4 hours | 10 GB |
| Snapchat | 250 chars | 10 | 3 min | 1 GB |

## UI/UX Design System

### Colors

| Color | Value | Usage |
|-------|-------|-------|
| Primary | `#6366F1` | Buttons, links, accents |
| Primary Hover | `#4F46E5` | Interactive states |
| Accent Purple | `#A855F7` | Gradients, highlights |
| Background | `#F9FAFB` | Page backgrounds |
| Text Primary | `#111827` | Headings, body text |
| Text Secondary | `#6B7280` | Labels, captions |

### Components

The app uses a custom UI component library located in `app/components/ui/`:

#### Core Components
- **AppHeader** - Responsive navigation with mobile menu
- **Card** - Container with shadow and hover effects (supports onClick, keyboard nav)
- **StatCard** - Metric display with trend indicators
- **Badge** - Status indicators (success, primary, gray, gradient)
- **GradientBanner** - CTA sections with gradient backgrounds
- **EmptyState** - Placeholder for empty content areas
- **Tooltip** - Platform-aware metric explanations with AI hints
- **MetricInfo** - Simplified tooltip wrapper for metrics

#### Locked Metric Components
- **LockIcon** - Animated SVG lock with size variants (sm, md, lg, xl)
- **Skeleton** - Loading placeholders (text, chart, card, circular)
- **BlurredChart** - SVG chart previews (line, bar, pie, area)
- **LockedValue** - Locked value display with optional lock icon
- **LockedMetricCard** - Interactive locked metric with hover effects
- **LockedFeatureBanner** - Full-width feature preview with stats
- **UpgradeModal** - Conversion modal with trial option
- **TrialCountdownBanner** - Floating countdown during preview
- **PersonalizedUpgradePrompt** - Dynamic upgrade messaging

### Animations

- `animate-fade-in` - Fade in on mount
- `animate-slide-up` - Slide up on mount
- `animate-scale-in` - Scale in on mount
- `animate-float` - Continuous floating effect
- `animate-lock-pulse` - Pulsing lock icon
- `animate-shimmer` - Skeleton loading shimmer
- `animate-slide-in-bottom` - Slide in from bottom
- `animate-bounce-in` - Bounce in effect

### Accessibility

- Full keyboard navigation (Enter key support)
- ARIA roles and labels for screen readers
- Focus ring styles (purple theme)
- Mobile tap highlight removal
- `prefers-reduced-motion` support

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Default | 100 requests/minute |
| Publish | 10 requests/minute |
| Analytics | 30 requests/minute |
| OAuth | 20 requests/minute |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Upgrade Intent Tracking

The app includes a sophisticated upgrade intent tracking system for optimizing Creator → Pro conversion:

### Features
- **Interaction Tracking**: Records hover, tap, click, and long-hover events on locked metrics
- **Intent Scoring**: Calculates upgrade intent score (0-100) based on engagement patterns
- **Persistence**: 7-day localStorage history for returning users
- **Trial System**: 5-minute temporary unlocks for any locked metric
- **Personalization**: Dynamic prompts based on most-interacted metrics

### Implementation
```typescript
// Track interactions
upgradeIntent.trackInteraction({
  metricId: 'sentiment',
  interactionType: 'hover',
  duration: 2500,
  source: 'card'
})

// Start trial preview
upgradeIntent.startTrial('retention', 5 * 60 * 1000)

// Get personalized prompt
const prompt = upgradeIntent.getPersonalizedPrompt('virality')

// Check upgrade intent score
const { upgradeIntentScore, topMetrics } = upgradeIntent.getInteractionSummary()
```

### Metrics Tracked
| Metric ID | Display Name | Category |
|-----------|--------------|----------|
| sentiment | Sentiment Score | Advanced |
| retention | Retention Rate | Advanced |
| virality | Virality Index | Advanced |
| velocity | Content Velocity | Advanced |
| crossPlatform | Cross-Platform Sync | Advanced |
| locationAnalytics | Location Analytics | Feature |
| retentionGraphs | Retention Graphs | Feature |
| aiRecommendations | AI Recommendations | Feature |
| captionUsage | Caption Usage | Feature |
| calendarInsights | Calendar Insights | Feature |
| bestPostingTimes | Best Posting Times | Feature |

## Security Features

- **OAuth 2.0 with PKCE** - Secure authorization for all platforms
- **AES-256-GCM Encryption** - Tokens encrypted at rest
- **Automatic Token Refresh** - Tokens refreshed before expiration
- **Rate Limiting** - Protection against API abuse
- **Input Validation** - All inputs validated and sanitized
- **CSRF Protection** - State parameter validation in OAuth flows

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [User Guide](./docs/USER_GUIDE.md) - Complete user guide for all features
- [OAuth Setup Guide](./docs/OAUTH_SETUP_GUIDE.md) - Configure OAuth for each platform
- [Backend API Reference](./docs/BACKEND_API_REFERENCE.md) - Complete API documentation
- [Caption Workflow](./docs/CAPTION_WORKFLOW.md) - Caption workflow feature documentation
- [Location Analytics Spec](./docs/LOCATION_ANALYTICS_SPEC.md) - Location analytics feature spec
- [Save Rate & Retention Spec](./docs/SAVE_RATE_RETENTION_ANALYTICS_SPEC.md) - Analytics specs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@regen.app or open an issue on GitHub.
