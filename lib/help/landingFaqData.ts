/**
 * Landing Page FAQ Data
 *
 * Public-facing FAQ for potential users on the landing page.
 * Focused on value proposition, trust-building, and conversion.
 *
 * Design principles:
 * - Scannable, concise answers
 * - Benefit-focused language
 * - Address common objections
 * - Build trust and credibility
 */

export interface LandingFAQItem {
  id: string;
  question: string;
  answer: string;
  highlight?: string; // Optional key benefit to emphasize
}

export interface LandingFAQSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  items: LandingFAQItem[];
}

export const LANDING_FAQ_SECTIONS: LandingFAQSection[] = [
  {
    id: 'overview',
    title: 'About ReGenr',
    subtitle: 'Learn what ReGenr is and how it can help you',
    icon: '✨',
    items: [
      {
        id: 'what-is-regenr',
        question: 'What is ReGenr?',
        answer: `ReGenr is an AI-powered content repurposing platform that transforms your existing content into optimized social media posts. Upload once, and our AI creates platform-perfect versions for Instagram, TikTok, YouTube, LinkedIn, Twitter/X, Facebook, and more.`,
        highlight: 'Save hours every week',
      },
      {
        id: 'who-is-it-for',
        question: 'Who is ReGenr for?',
        answer: `ReGenr is built for content creators, social media managers, marketers, and businesses who want to maximize their content's reach without spending hours reformatting for each platform. Whether you're a solo creator or part of a marketing team, ReGenr scales with you.`,
        highlight: 'Solo creators to enterprise teams',
      },
      {
        id: 'how-is-it-different',
        question: 'How is ReGenr different from other social media tools?',
        answer: `Unlike traditional schedulers that just post content, ReGenr uses AI to actually transform and optimize your content for each platform. We analyze your brand voice, understand platform best practices, and generate captions that feel native to each network—not just copied and pasted.`,
        highlight: 'AI-powered transformation, not just scheduling',
      },
      {
        id: 'what-problem-solved',
        question: 'What problem does ReGenr solve?',
        answer: `Creating content for multiple platforms is time-consuming. What works on LinkedIn doesn't work on TikTok. ReGenr eliminates this friction by automatically adapting your content's tone, length, hashtags, and format for each platform—while maintaining your unique brand voice.`,
        highlight: 'One content piece, every platform covered',
      },
    ],
  },
  {
    id: 'features',
    title: 'Features & Capabilities',
    subtitle: 'Discover what you can do with ReGenr',
    icon: '🚀',
    items: [
      {
        id: 'supported-platforms',
        question: 'Which social media platforms are supported?',
        answer: `ReGenr currently supports Instagram, Facebook, TikTok, YouTube, Twitter/X, LinkedIn, Snapchat, Pinterest, and Discord. We're constantly adding new platforms based on user feedback.`,
        highlight: '9+ platforms supported',
      },
      {
        id: 'content-types',
        question: 'What types of content can I upload?',
        answer: `You can upload videos (MP4, MOV, WebM up to 500MB), images (JPG, PNG, GIF, WebP up to 50MB), mixed media carousels, text content, and even URLs. Our AI analyzes your content and generates optimized captions for each platform.`,
        highlight: 'Videos, images, text, URLs & more',
      },
      {
        id: 'ai-captions',
        question: 'How does AI caption generation work?',
        answer: `Our AI analyzes your uploaded content—including images and videos using vision AI—and generates multiple caption variants tailored to each platform. You get short punchy versions, descriptive versions, and CTA-focused versions. Then you pick your favorite or edit as needed.`,
        highlight: 'Multiple AI-generated variants to choose from',
      },
      {
        id: 'brand-voice',
        question: 'Can I maintain my brand voice across platforms?',
        answer: `Absolutely. ReGenr's AI Brand Voice feature lets you define your brand's personality (e.g., "professional and witty" or "casual and inspiring"). The AI then ensures all generated content matches your specified tone while still optimizing for each platform's unique style.`,
        highlight: 'Your voice, every platform',
      },
      {
        id: 'scheduling',
        question: 'Can I schedule posts in advance?',
        answer: `Yes. Create your content, choose your platforms, pick your date and time, and we'll handle the rest. You can schedule weeks or months ahead, and manage everything from a visual calendar. Scheduled posts can be edited or cancelled anytime before they go live.`,
        highlight: 'Set it and forget it',
      },
      {
        id: 'analytics',
        question: 'Does ReGenr provide analytics?',
        answer: `Yes. Track your content performance across all connected platforms in one dashboard. See engagement metrics, reach, saves, shares, and more. Our analytics help you understand what's working so you can create more of what your audience loves.

**Note:** Discord does not provide engagement analytics through their API, so Discord posts won't show metrics. All other platforms (Instagram, TikTok, YouTube, Facebook, LinkedIn, Twitter/X, Pinterest, Snapchat) provide full analytics.`,
        highlight: 'All your metrics in one place',
      },
      {
        id: 'content-feeds',
        question: 'What are Content Feeds?',
        answer: `Content Feeds (RSS) let you automatically import content from blogs, newsletters, and websites you follow. Use them as inspiration or quickly repurpose trending industry content. It's like having a content research assistant built in.`,
        highlight: 'Never run out of content ideas',
      },
      {
        id: 'tiktok-posting',
        question: 'How does TikTok posting work?',
        answer: `ReGenr is fully compliant with TikTok's Content Sharing Guidelines. When posting to TikTok, you control privacy settings, enable/disable comments, duets, and stitches, and disclose branded content—all from one simple interface. Your video is sent to TikTok for a final review before going live.`,
        highlight: 'Full TikTok compliance built-in',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing & Plans',
    subtitle: 'Flexible options for every creator',
    icon: '💎',
    items: [
      {
        id: 'free-plan',
        question: 'Is there a free plan?',
        answer: `Yes! Our Free plan includes 2 platform connections, 5 scheduled posts per month, basic analytics, and 5 content feeds. It's perfect for trying ReGenr and seeing how it fits your workflow—no credit card required.`,
        highlight: 'Free forever, no credit card needed',
      },
      {
        id: 'plan-options',
        question: 'What plans are available?',
        answer: `We offer three tiers: Free (for getting started), Creator (for active content creators with unlimited scheduling), and Pro (for teams with collaboration features, advanced analytics, and API access). Each tier is designed to grow with your needs.`,
        highlight: 'Plans that scale with you',
      },
      {
        id: 'beta-pricing',
        question: 'What is Beta Pro access?',
        answer: `During our beta period, you can access all Pro features completely free. Beta users help shape the product with their feedback and will receive exclusive early-adopter pricing when we officially launch. It's our way of saying thanks for being early supporters.`,
        highlight: 'Full Pro features, completely free during beta',
      },
      {
        id: 'cancel-anytime',
        question: 'Can I cancel anytime?',
        answer: `Yes, you can cancel or downgrade your plan at any time with no penalties or hidden fees. Your data remains accessible, and you can export everything before leaving. We believe in earning your business every month.`,
        highlight: 'No contracts, no commitments',
      },
    ],
  },
  {
    id: 'trust',
    title: 'Security & Privacy',
    subtitle: 'Your data and accounts are safe with us',
    icon: '🔒',
    items: [
      {
        id: 'data-security',
        question: 'Is my data secure?',
        answer: `Security is foundational to ReGenr. All data is encrypted in transit (HTTPS) and at rest (AES-256). OAuth tokens for your social accounts are encrypted and never stored as plain text. We follow industry best practices and are pursuing SOC 2 compliance.`,
        highlight: 'Enterprise-grade encryption',
      },
      {
        id: 'password-storage',
        question: 'Do you store my social media passwords?',
        answer: `Never. We use OAuth authentication, which means you authorize ReGenr through each platform's official login. We receive secure tokens—never your passwords. You can revoke access anytime from your social media account settings.`,
        highlight: 'We never see your passwords',
      },
      {
        id: 'auto-posting',
        question: 'Will ReGenr post without my permission?',
        answer: `No. ReGenr only posts when you explicitly schedule or click "Post Now." We don't have autonomous posting capabilities. You're always in control of what goes live and when.`,
        highlight: 'You control every post',
      },
      {
        id: 'data-selling',
        question: 'Do you sell my data?',
        answer: `Absolutely not. We don't sell, share, or monetize your personal data or content. Your content is yours. We make money through subscriptions, not by selling your information to advertisers or third parties.`,
        highlight: 'Your data is never sold',
      },
      {
        id: 'disconnect',
        question: 'Can I disconnect my accounts anytime?',
        answer: `Yes, instantly. Go to Settings → Integrations and click "Disconnect" next to any platform. Your tokens are immediately deleted from our servers. You can also delete your entire ReGenr account and all associated data at any time.`,
        highlight: 'One-click disconnect',
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    subtitle: 'From signup to first post in minutes',
    icon: '⚡',
    items: [
      {
        id: 'setup-time',
        question: 'How long does setup take?',
        answer: `Most users are up and running in under 5 minutes. Sign up, connect your social accounts (one click each), and you're ready to start creating. No complex configurations or lengthy onboarding required.`,
        highlight: 'Under 5 minutes to start',
      },
      {
        id: 'account-requirements',
        question: 'Do I need business accounts on social platforms?',
        answer: `For Instagram, you'll need a Professional account (Business or Creator) linked to a Facebook Page—this is a Meta API requirement. Other platforms like TikTok, Twitter/X, and LinkedIn work with regular accounts.`,
        highlight: 'Works with most account types',
      },
      {
        id: 'learning-curve',
        question: 'Is ReGenr easy to use?',
        answer: `We've designed ReGenr to be intuitive from day one. Upload your content, let AI generate captions, review and edit if needed, then schedule or post. Most features are self-explanatory, and we provide in-app help if you need it.`,
        highlight: 'Intuitive, no training needed',
      },
      {
        id: 'support',
        question: 'What if I need help?',
        answer: `We're here for you. Access our comprehensive Help Center from within the app, or email us at support@regenr.app. Pro users get priority support with faster response times. We read and respond to every message.`,
        highlight: 'Real humans, real support',
      },
      {
        id: 'mobile-app',
        question: 'Is there a mobile app?',
        answer: `ReGenr is a progressive web app (PWA), meaning it works beautifully on mobile browsers and can be added to your home screen for an app-like experience. A dedicated mobile app is on our roadmap based on user demand.`,
        highlight: 'Works on any device',
      },
    ],
  },
];

/**
 * Get all landing FAQ items flattened for search
 */
export function getAllLandingFAQItems(): (LandingFAQItem & { sectionId: string; sectionTitle: string })[] {
  return LANDING_FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionId: section.id,
      sectionTitle: section.title,
    }))
  );
}

/**
 * Search landing FAQ items by query
 */
export function searchLandingFAQ(query: string): (LandingFAQItem & { sectionId: string; sectionTitle: string })[] {
  if (!query.trim()) {
    return getAllLandingFAQItems();
  }

  const lowerQuery = query.toLowerCase();
  return getAllLandingFAQItems().filter(
    (item) =>
      item.question.toLowerCase().includes(lowerQuery) ||
      item.answer.toLowerCase().includes(lowerQuery) ||
      (item.highlight?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

/**
 * Get a specific landing FAQ item by ID
 */
export function getLandingFAQById(id: string): LandingFAQItem | undefined {
  for (const section of LANDING_FAQ_SECTIONS) {
    const item = section.items.find((item) => item.id === id);
    if (item) return item;
  }
  return undefined;
}

/**
 * Get featured FAQs for compact display (e.g., homepage snippet)
 * Returns the most important questions potential users typically ask
 */
export function getFeaturedLandingFAQs(count: number = 5): LandingFAQItem[] {
  const featuredIds = [
    'what-is-regenr',
    'free-plan',
    'supported-platforms',
    'data-security',
    'setup-time',
  ];

  return featuredIds
    .slice(0, count)
    .map((id) => getLandingFAQById(id))
    .filter((item): item is LandingFAQItem => item !== undefined);
}
