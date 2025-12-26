/**
 * RSS Feed Parser Utility
 *
 * Handles parsing of RSS 2.0, Atom, and other feed formats.
 * Uses rss-parser library for robust feed handling.
 *
 * @see https://www.npmjs.com/package/rss-parser
 */

import Parser from 'rss-parser';

// ============================================
// TYPES
// ============================================

export interface ParsedFeed {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  language?: string;
  lastBuildDate?: Date;
  items: ParsedFeedItem[];
}

export interface ParsedFeedItem {
  guid: string;
  title: string;
  link?: string;
  description?: string;
  content?: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: Date;
  categories: string[];
}

export interface FetchFeedResult {
  success: boolean;
  feed?: ParsedFeed;
  error?: string;
  errorCode?: 'INVALID_URL' | 'FETCH_FAILED' | 'PARSE_FAILED' | 'TIMEOUT' | 'INVALID_FEED';
}

// ============================================
// CONFIGURATION
// ============================================

const FETCH_TIMEOUT_MS = 30000; // 30 seconds
const MAX_ITEMS_PER_FETCH = 50; // Limit items to prevent memory issues

// Custom parser configuration
const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent': 'ReGenr-RSS-Bot/1.0 (+https://regenr.app)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
  customFields: {
    feed: ['image', 'language'],
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate and normalize a feed URL
 */
export function validateFeedUrl(url: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  try {
    // Trim whitespace
    const trimmed = url.trim();

    // Check if URL is provided
    if (!trimmed) {
      return { valid: false, error: 'URL is required' };
    }

    // Parse URL to validate format
    const parsed = new URL(trimmed);

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    // Block localhost and private IPs for security
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.endsWith('.local')
    ) {
      return { valid: false, error: 'Local and private network URLs are not allowed' };
    }

    return { valid: true, normalizedUrl: parsed.href };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// ============================================
// FEED PARSING
// ============================================

/**
 * Extract the best available image URL from an item
 */
function extractImageUrl(item: Parser.Item & { mediaContent?: any[]; mediaThumbnail?: any; enclosure?: any }): string | undefined {
  // Try media:content array
  if (item.mediaContent && Array.isArray(item.mediaContent)) {
    const image = item.mediaContent.find(
      (m) => m.$ && (m.$.medium === 'image' || m.$.type?.startsWith('image/'))
    );
    if (image?.$?.url) {
      return image.$.url;
    }
  }

  // Try media:thumbnail
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url;
  }

  // Try enclosure
  if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url;
  }

  // Try to extract from content (first img tag)
  const content = (item as any).contentEncoded || item.content || item.contentSnippet || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) {
    return imgMatch[1];
  }

  return undefined;
}

/**
 * Generate a unique identifier for an item
 * Prefers guid, falls back to link, then title hash
 */
function generateGuid(item: Parser.Item): string {
  if (item.guid) {
    return item.guid;
  }
  if (item.link) {
    return item.link;
  }
  // Fallback: hash of title + pubDate
  const str = `${item.title || ''}${item.pubDate || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash-${Math.abs(hash).toString(36)}`;
}

/**
 * Parse an RSS/Atom feed from a URL
 */
export async function fetchAndParseFeed(url: string): Promise<FetchFeedResult> {
  // Validate URL first
  const validation = validateFeedUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      errorCode: 'INVALID_URL',
    };
  }

  try {
    // Fetch and parse the feed
    const feed = await parser.parseURL(validation.normalizedUrl!);

    // Check if we got a valid feed
    if (!feed || (!feed.title && (!feed.items || feed.items.length === 0))) {
      return {
        success: false,
        error: 'URL does not contain a valid RSS or Atom feed',
        errorCode: 'INVALID_FEED',
      };
    }

    // Extract feed image
    let feedImageUrl: string | undefined;
    if (feed.image?.url) {
      feedImageUrl = feed.image.url;
    } else if ((feed as any).itunes?.image) {
      feedImageUrl = (feed as any).itunes.image;
    }

    // Parse items (limit to prevent memory issues)
    const items: ParsedFeedItem[] = feed.items.slice(0, MAX_ITEMS_PER_FETCH).map((item) => ({
      guid: generateGuid(item),
      title: item.title || 'Untitled',
      link: item.link,
      description: item.contentSnippet || item.summary,
      content: (item as any).contentEncoded || item.content,
      author: item.creator || item.author,
      imageUrl: extractImageUrl(item as any),
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      categories: item.categories || [],
    }));

    return {
      success: true,
      feed: {
        title: feed.title || 'Untitled Feed',
        description: feed.description,
        link: feed.link,
        imageUrl: feedImageUrl,
        language: (feed as any).language,
        lastBuildDate: feed.lastBuildDate ? new Date(feed.lastBuildDate) : undefined,
        items,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Categorize the error
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return {
        success: false,
        error: 'Feed request timed out. The server may be slow or unavailable.',
        errorCode: 'TIMEOUT',
      };
    }

    if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
      return {
        success: false,
        error: 'Could not reach the feed URL. Please check the address.',
        errorCode: 'FETCH_FAILED',
      };
    }

    if (message.includes('Non-whitespace before first tag') || message.includes('Unexpected')) {
      return {
        success: false,
        error: 'The URL does not return a valid RSS or Atom feed.',
        errorCode: 'PARSE_FAILED',
      };
    }

    return {
      success: false,
      error: `Failed to fetch feed: ${message}`,
      errorCode: 'FETCH_FAILED',
    };
  }
}

/**
 * Validate a feed URL by attempting to fetch and parse it
 * Returns metadata about the feed if successful
 */
export async function validateFeed(url: string): Promise<{
  valid: boolean;
  feed?: {
    title: string;
    description?: string;
    imageUrl?: string;
    itemCount: number;
  };
  error?: string;
}> {
  const result = await fetchAndParseFeed(url);

  if (!result.success || !result.feed) {
    return {
      valid: false,
      error: result.error || 'Failed to validate feed',
    };
  }

  return {
    valid: true,
    feed: {
      title: result.feed.title,
      description: result.feed.description,
      imageUrl: result.feed.imageUrl,
      itemCount: result.feed.items.length,
    },
  };
}
