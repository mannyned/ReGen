# ReGen - AI-Powered Content Repurposing Platform

ReGen is a modern SaaS application that helps content creators repurpose their content across multiple social media platforms using AI. Built with Next.js 16, React 19, and TypeScript.

## Features

### Core Features
- **AI Content Generation** - Automatically generate captions, hashtags, and optimized content for each platform
- **Multi-Platform Publishing** - Connect and publish to Instagram, TikTok, YouTube, Twitter/X, LinkedIn, and Facebook
- **Content Upload** - Drag-and-drop file upload with preview and validation
- **Smart Scheduling** - Schedule posts for optimal engagement times
- **Analytics Dashboard** - Track performance across all platforms

### Plan Tiers

| Feature | Free | Creator ($9/mo) | Pro ($29/mo) |
|---------|------|-----------------|--------------|
| Uploads per month | 3 | Unlimited | Unlimited |
| Platform connections | 2 | 6 | 6 |
| AI captions | Basic | Advanced | Advanced |
| Save Rate Analytics | - | ✓ | ✓ |
| Location Analytics | - | - | ✓ |
| Retention Analytics | - | - | ✓ |
| AI Recommendations | - | - | ✓ |
| Brand Voice AI | - | - | ✓ |

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

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Authentication**: OAuth 2.0 (Instagram, TikTok, YouTube, etc.)
- **Database**: SQLite (development) / PostgreSQL (production)

## Project Structure

```
regen-app/
├── app/
│   ├── analytics/           # Analytics pages
│   │   ├── location/        # Location analytics (Pro)
│   │   ├── retention/       # Retention analytics (Pro)
│   │   ├── save-rate/       # Save rate analytics (Creator+)
│   │   └── page.tsx         # Main analytics dashboard
│   ├── api/                 # API routes
│   │   ├── generate/        # AI generation endpoints
│   │   └── oauth/           # OAuth authentication
│   ├── components/          # Reusable components
│   │   └── ui/              # UI component library
│   ├── config/              # App configuration
│   │   └── plans.ts         # Plan tier definitions
│   ├── context/             # React contexts
│   │   └── PlanContext.tsx  # Plan state management
│   ├── dashboard/           # User dashboard
│   ├── generate/            # Content generation
│   ├── login/               # Login page
│   ├── schedule/            # Scheduling interface
│   ├── settings/            # User settings & OAuth
│   ├── signup/              # Registration page
│   ├── types/               # TypeScript type definitions
│   ├── upload/              # File upload page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── public/                  # Static assets
├── server/                  # Backend server (Express)
├── docs/                    # Documentation
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/regen-app.git
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

4. Configure OAuth credentials (see [OAuth Setup Guide](./docs/OAUTH_SETUP_GUIDE.md))

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

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

- **AppHeader** - Responsive navigation with mobile menu
- **Card** - Container with shadow and hover effects
- **StatCard** - Metric display with trend indicators
- **Badge** - Status indicators (success, primary, gray)
- **GradientBanner** - CTA sections with gradient backgrounds
- **EmptyState** - Placeholder for empty content areas

### Animations

- `animate-fade-in` - Fade in on mount
- `animate-slide-up` - Slide up on mount
- `animate-scale-in` - Scale in on mount
- `animate-float` - Continuous floating effect

## API Routes

### OAuth

- `GET /api/oauth/connect/:platform` - Initiate OAuth flow
- `GET /api/oauth/callback/:platform` - Handle OAuth callback
- `GET /api/oauth/status` - Get connected platforms
- `DELETE /api/oauth/disconnect/:platform` - Disconnect platform

### Content Generation

- `POST /api/generate` - Generate AI captions and hashtags
- `POST /api/generate/brand-voice` - Generate with brand voice (Pro)

## Environment Variables

```env
# OAuth Credentials
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# API Keys
OPENAI_API_KEY=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@regen.app or open an issue on GitHub.
