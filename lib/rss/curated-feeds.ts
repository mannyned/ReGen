/**
 * Curated RSS Feeds Library
 *
 * A collection of high-quality RSS feeds organized by niche.
 * Users can browse and add these feeds with one click.
 */

// ============================================
// TYPES
// ============================================

export type SourceType = 'blog' | 'newsletter' | 'news' | 'podcast';

export interface CuratedFeed {
  /** Unique identifier */
  id: string;
  /** Category/niche key */
  niche_key: string;
  /** Display name */
  feed_name: string;
  /** RSS feed URL */
  feed_url: string;
  /** Type of content source */
  source_type: SourceType;
  /** Short, Gen-Z friendly description */
  description: string;
  /** Language code */
  language: string;
  /** Whether this feed is currently active/recommended */
  enabled: boolean;
}

export interface Niche {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

// ============================================
// NICHES
// ============================================

export const NICHES: Niche[] = [
  {
    key: 'marketing',
    label: 'Marketing',
    emoji: '📣',
    description: 'Digital marketing, growth hacking, and brand building',
  },
  {
    key: 'tech',
    label: 'Tech & Startups',
    emoji: '🚀',
    description: 'Tech news, startup culture, and innovation',
  },
  {
    key: 'finance',
    label: 'Finance',
    emoji: '💰',
    description: 'Personal finance, investing, and crypto',
  },
  {
    key: 'fitness',
    label: 'Fitness & Health',
    emoji: '💪',
    description: 'Workouts, nutrition, and wellness tips',
  },
  {
    key: 'creator',
    label: 'Creator Economy',
    emoji: '🎬',
    description: 'Content creation, social media, and monetization',
  },
  {
    key: 'design',
    label: 'Design',
    emoji: '🎨',
    description: 'UI/UX, graphic design, and creative inspiration',
  },
  {
    key: 'ai',
    label: 'AI & Machine Learning',
    emoji: '🤖',
    description: 'AI news, tools, and the future of automation',
  },
  {
    key: 'productivity',
    label: 'Productivity',
    emoji: '⚡',
    description: 'Life hacks, tools, and getting things done',
  },
  {
    key: 'news',
    label: 'General News',
    emoji: '📰',
    description: 'Breaking news and current events',
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    emoji: '🎮',
    description: 'Gaming, movies, music, and pop culture',
  },
];

// ============================================
// CURATED FEEDS
// ============================================

export const CURATED_FEEDS: CuratedFeed[] = [
  // Marketing
  {
    id: 'hubspot-marketing',
    niche_key: 'marketing',
    feed_name: 'HubSpot Marketing Blog',
    feed_url: 'https://blog.hubspot.com/marketing/rss.xml',
    source_type: 'blog',
    description: 'Inbound marketing strategies that actually work',
    language: 'en',
    enabled: true,
  },
  {
    id: 'buffer-blog',
    niche_key: 'marketing',
    feed_name: 'Buffer Blog',
    feed_url: 'https://buffer.com/resources/feed/',
    source_type: 'blog',
    description: 'Social media tips from the OG scheduling tool',
    language: 'en',
    enabled: true,
  },
  {
    id: 'social-media-examiner',
    niche_key: 'marketing',
    feed_name: 'Social Media Examiner',
    feed_url: 'https://www.socialmediaexaminer.com/feed/',
    source_type: 'blog',
    description: 'Deep dives into every social platform',
    language: 'en',
    enabled: true,
  },
  {
    id: 'copyblogger',
    niche_key: 'marketing',
    feed_name: 'Copyblogger',
    feed_url: 'https://copyblogger.com/feed/',
    source_type: 'blog',
    description: 'Copywriting tips that convert',
    language: 'en',
    enabled: true,
  },

  // Tech & Startups
  {
    id: 'techcrunch',
    niche_key: 'tech',
    feed_name: 'TechCrunch',
    feed_url: 'https://techcrunch.com/feed/',
    source_type: 'news',
    description: 'Startup news and fundraising updates',
    language: 'en',
    enabled: true,
  },
  {
    id: 'the-verge',
    niche_key: 'tech',
    feed_name: 'The Verge',
    feed_url: 'https://www.theverge.com/rss/index.xml',
    source_type: 'news',
    description: 'Tech, science, and culture coverage',
    language: 'en',
    enabled: true,
  },
  {
    id: 'hacker-news',
    niche_key: 'tech',
    feed_name: 'Hacker News',
    feed_url: 'https://hnrss.org/frontpage',
    source_type: 'news',
    description: 'What devs and founders are reading',
    language: 'en',
    enabled: true,
  },
  {
    id: 'product-hunt',
    niche_key: 'tech',
    feed_name: 'Product Hunt',
    feed_url: 'https://www.producthunt.com/feed',
    source_type: 'news',
    description: 'New products dropping daily',
    language: 'en',
    enabled: true,
  },

  // Finance
  {
    id: 'morning-brew',
    niche_key: 'finance',
    feed_name: 'Morning Brew',
    feed_url: 'https://www.morningbrew.com/daily/rss',
    source_type: 'newsletter',
    description: 'Business news that doesn\'t put you to sleep',
    language: 'en',
    enabled: true,
  },
  {
    id: 'coindesk',
    niche_key: 'finance',
    feed_name: 'CoinDesk',
    feed_url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    source_type: 'news',
    description: 'Crypto and blockchain news',
    language: 'en',
    enabled: true,
  },
  {
    id: 'investopedia',
    niche_key: 'finance',
    feed_name: 'Investopedia',
    feed_url: 'https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline',
    source_type: 'blog',
    description: 'Finance explained simply',
    language: 'en',
    enabled: true,
  },

  // Fitness & Health
  {
    id: 'mens-health',
    niche_key: 'fitness',
    feed_name: 'Men\'s Health',
    feed_url: 'https://www.menshealth.com/rss/all.xml/',
    source_type: 'blog',
    description: 'Workouts, nutrition, and lifestyle',
    language: 'en',
    enabled: true,
  },
  {
    id: 'nerd-fitness',
    niche_key: 'fitness',
    feed_name: 'Nerd Fitness',
    feed_url: 'https://www.nerdfitness.com/blog/feed/',
    source_type: 'blog',
    description: 'Fitness for nerds and gamers',
    language: 'en',
    enabled: true,
  },
  {
    id: 'examine',
    niche_key: 'fitness',
    feed_name: 'Examine',
    feed_url: 'https://examine.com/blog/feed/',
    source_type: 'blog',
    description: 'Science-backed supplement and nutrition info',
    language: 'en',
    enabled: true,
  },

  // Creator Economy
  {
    id: 'creator-science',
    niche_key: 'creator',
    feed_name: 'Creator Science',
    feed_url: 'https://creatorscience.com/feed/',
    source_type: 'newsletter',
    description: 'Behind the scenes of top creators',
    language: 'en',
    enabled: true,
  },
  {
    id: 'the-publish-press',
    niche_key: 'creator',
    feed_name: 'The Publish Press',
    feed_url: 'https://www.publishpress.com/feed/',
    source_type: 'newsletter',
    description: 'Newsletter and publishing insights',
    language: 'en',
    enabled: true,
  },

  // Design
  {
    id: 'smashing-magazine',
    niche_key: 'design',
    feed_name: 'Smashing Magazine',
    feed_url: 'https://www.smashingmagazine.com/feed/',
    source_type: 'blog',
    description: 'Web design and UX deep dives',
    language: 'en',
    enabled: true,
  },
  {
    id: 'ux-collective',
    niche_key: 'design',
    feed_name: 'UX Collective',
    feed_url: 'https://uxdesign.cc/feed',
    source_type: 'blog',
    description: 'UX design stories and case studies',
    language: 'en',
    enabled: true,
  },
  {
    id: 'sidebar',
    niche_key: 'design',
    feed_name: 'Sidebar',
    feed_url: 'https://sidebar.io/feed.xml',
    source_type: 'newsletter',
    description: 'Daily design links, curated',
    language: 'en',
    enabled: true,
  },

  // AI & Machine Learning
  {
    id: 'openai-blog',
    niche_key: 'ai',
    feed_name: 'OpenAI Blog',
    feed_url: 'https://openai.com/blog/rss/',
    source_type: 'blog',
    description: 'Straight from the ChatGPT creators',
    language: 'en',
    enabled: true,
  },
  {
    id: 'mit-ai',
    niche_key: 'ai',
    feed_name: 'MIT AI News',
    feed_url: 'https://news.mit.edu/topic/artificial-intelligence2-rss.xml',
    source_type: 'news',
    description: 'AI research from MIT',
    language: 'en',
    enabled: true,
  },
  {
    id: 'the-decoder',
    niche_key: 'ai',
    feed_name: 'The Decoder',
    feed_url: 'https://the-decoder.com/feed/',
    source_type: 'news',
    description: 'AI news and tool updates',
    language: 'en',
    enabled: true,
  },

  // Productivity
  {
    id: 'cal-newport',
    niche_key: 'productivity',
    feed_name: 'Cal Newport',
    feed_url: 'https://calnewport.com/feed/',
    source_type: 'blog',
    description: 'Deep work and digital minimalism',
    language: 'en',
    enabled: true,
  },
  {
    id: 'asian-efficiency',
    niche_key: 'productivity',
    feed_name: 'Asian Efficiency',
    feed_url: 'https://www.asianefficiency.com/feed/',
    source_type: 'blog',
    description: 'Productivity systems and workflows',
    language: 'en',
    enabled: true,
  },
  {
    id: 'todoist-blog',
    niche_key: 'productivity',
    feed_name: 'Todoist Blog',
    feed_url: 'https://blog.todoist.com/feed/',
    source_type: 'blog',
    description: 'Task management and getting things done',
    language: 'en',
    enabled: true,
  },

  // General News
  {
    id: 'bbc-news',
    niche_key: 'news',
    feed_name: 'BBC News',
    feed_url: 'https://feeds.bbci.co.uk/news/rss.xml',
    source_type: 'news',
    description: 'World news from the BBC',
    language: 'en',
    enabled: true,
  },
  {
    id: 'npr',
    niche_key: 'news',
    feed_name: 'NPR News',
    feed_url: 'https://feeds.npr.org/1001/rss.xml',
    source_type: 'news',
    description: 'Top stories from NPR',
    language: 'en',
    enabled: true,
  },
  {
    id: 'reuters',
    niche_key: 'news',
    feed_name: 'Reuters',
    feed_url: 'https://www.reutersagency.com/feed/',
    source_type: 'news',
    description: 'Breaking news and analysis',
    language: 'en',
    enabled: true,
  },

  // Entertainment
  {
    id: 'ign',
    niche_key: 'entertainment',
    feed_name: 'IGN',
    feed_url: 'https://feeds.feedburner.com/ign/all',
    source_type: 'news',
    description: 'Gaming and entertainment news',
    language: 'en',
    enabled: true,
  },
  {
    id: 'kotaku',
    niche_key: 'entertainment',
    feed_name: 'Kotaku',
    feed_url: 'https://kotaku.com/rss',
    source_type: 'news',
    description: 'Gaming culture and reviews',
    language: 'en',
    enabled: true,
  },
  {
    id: 'variety',
    niche_key: 'entertainment',
    feed_name: 'Variety',
    feed_url: 'https://variety.com/feed/',
    source_type: 'news',
    description: 'Hollywood and entertainment industry',
    language: 'en',
    enabled: true,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all enabled curated feeds
 */
export function getEnabledFeeds(): CuratedFeed[] {
  return CURATED_FEEDS.filter((feed) => feed.enabled);
}

/**
 * Get feeds by niche
 */
export function getFeedsByNiche(nicheKey: string): CuratedFeed[] {
  return getEnabledFeeds().filter((feed) => feed.niche_key === nicheKey);
}

/**
 * Get a specific feed by ID
 */
export function getFeedById(id: string): CuratedFeed | undefined {
  return CURATED_FEEDS.find((feed) => feed.id === id);
}

/**
 * Get feeds by source type
 */
export function getFeedsBySourceType(sourceType: SourceType): CuratedFeed[] {
  return getEnabledFeeds().filter((feed) => feed.source_type === sourceType);
}

/**
 * Search feeds by name or description
 */
export function searchFeeds(query: string): CuratedFeed[] {
  const lowerQuery = query.toLowerCase();
  return getEnabledFeeds().filter(
    (feed) =>
      feed.feed_name.toLowerCase().includes(lowerQuery) ||
      feed.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get niche by key
 */
export function getNicheByKey(key: string): Niche | undefined {
  return NICHES.find((niche) => niche.key === key);
}
