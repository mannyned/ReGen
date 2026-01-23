/**
 * RSS Feed Ingestion Service
 *
 * Handles polling RSS feeds and creating feed items.
 * Designed for serverless execution (Vercel cron).
 *
 * Key features:
 * - Idempotent: Never creates duplicate items (uses guid)
 * - Rate limited: Processes feeds in batches
 * - Error resilient: Continues on individual feed failures
 * - Auto-pause: Disables feeds after consecutive errors
 * - Blog Auto-Share: Triggers auto-share processing for new items
 */

import { prisma } from '@/lib/db';
import { fetchAndParseFeed, type ParsedFeedItem } from './parser';
import type { RssFeed, RssFeedStatus } from '@prisma/client';
import { blogAutoShareService } from '@/lib/services/blog-auto-share';

// ============================================
// CONFIGURATION
// ============================================

const MAX_FEEDS_PER_RUN = 50; // Process up to 50 feeds per cron run
const MAX_CONSECUTIVE_ERRORS = 5; // Pause feed after this many consecutive errors
const MIN_FETCH_INTERVAL_MINUTES = 15; // Don't re-fetch feeds more often than this

// ============================================
// TYPES
// ============================================

export interface IngestionResult {
  feedId: string;
  feedName: string;
  success: boolean;
  itemsCreated: number;
  itemsSkipped: number;
  error?: string;
}

export interface IngestionJobResult {
  processed: number;
  successful: number;
  failed: number;
  itemsCreated: number;
  results: IngestionResult[];
  durationMs: number;
}

// ============================================
// FEED SELECTION
// ============================================

/**
 * Get feeds that need to be polled
 *
 * Criteria:
 * - Status is ACTIVE
 * - Never fetched, OR last fetched > MIN_FETCH_INTERVAL ago
 */
async function getFeedsToProcess(): Promise<RssFeed[]> {
  const cutoffTime = new Date(Date.now() - MIN_FETCH_INTERVAL_MINUTES * 60 * 1000);

  return prisma.rssFeed.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { lastFetchedAt: null },
        { lastFetchedAt: { lt: cutoffTime } },
      ],
    },
    orderBy: [
      // Prioritize feeds that have never been fetched
      { lastFetchedAt: { sort: 'asc', nulls: 'first' } },
    ],
    take: MAX_FEEDS_PER_RUN,
  });
}

// ============================================
// ITEM CREATION
// ============================================

/**
 * Create feed items from parsed items (idempotent)
 *
 * Uses upsert with unique constraint to prevent duplicates
 */
async function createFeedItems(
  feed: RssFeed,
  items: ParsedFeedItem[]
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      // Try to create the item - will fail if guid already exists
      await prisma.rssFeedItem.create({
        data: {
          feedId: feed.id,
          profileId: feed.profileId,
          guid: item.guid,
          title: item.title,
          link: item.link,
          description: item.description,
          content: item.content,
          author: item.author,
          imageUrl: item.imageUrl,
          publishedAt: item.publishedAt,
          categories: item.categories,
          status: 'NEW',
        },
      });
      created++;
    } catch (error) {
      // Unique constraint violation means item already exists - skip it
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        skipped++;
      } else {
        // Re-throw unexpected errors
        throw error;
      }
    }
  }

  return { created, skipped };
}

// ============================================
// FEED PROCESSING
// ============================================

/**
 * Process a single feed
 */
async function processFeed(feed: RssFeed): Promise<IngestionResult> {
  const result: IngestionResult = {
    feedId: feed.id,
    feedName: feed.name,
    success: false,
    itemsCreated: 0,
    itemsSkipped: 0,
  };

  try {
    // Fetch and parse the feed
    const parseResult = await fetchAndParseFeed(feed.url);

    if (!parseResult.success || !parseResult.feed) {
      throw new Error(parseResult.error || 'Failed to parse feed');
    }

    // Create feed items
    const { created, skipped } = await createFeedItems(feed, parseResult.feed.items);
    result.itemsCreated = created;
    result.itemsSkipped = skipped;

    // Update feed with success
    await prisma.rssFeed.update({
      where: { id: feed.id },
      data: {
        lastFetchedAt: new Date(),
        lastError: null,
        errorCount: 0,
        // Update feed metadata if available
        feedTitle: parseResult.feed.title,
        feedDescription: parseResult.feed.description,
        feedImageUrl: parseResult.feed.imageUrl,
        feedLink: parseResult.feed.link,
      },
    });

    result.success = true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.error = errorMessage;

    // Update feed with error
    const newErrorCount = feed.errorCount + 1;
    const newStatus: RssFeedStatus = newErrorCount >= MAX_CONSECUTIVE_ERRORS ? 'ERROR' : 'ACTIVE';

    await prisma.rssFeed.update({
      where: { id: feed.id },
      data: {
        lastFetchedAt: new Date(),
        lastError: errorMessage,
        errorCount: newErrorCount,
        status: newStatus,
      },
    });
  }

  return result;
}

// ============================================
// MAIN INGESTION JOB
// ============================================

/**
 * Run the RSS ingestion job
 *
 * This is the main entry point called by the cron endpoint.
 * Processes all active feeds that need updating.
 * Also triggers Blog Auto-Share processing for new items.
 */
export async function runIngestionJob(): Promise<IngestionJobResult> {
  const startTime = Date.now();
  const results: IngestionResult[] = [];

  // Get feeds to process
  const feeds = await getFeedsToProcess();

  // Process each feed
  for (const feed of feeds) {
    const result = await processFeed(feed);
    results.push(result);
  }

  // Calculate summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const itemsCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0);

  // Trigger Blog Auto-Share processing if any new items were created
  if (itemsCreated > 0) {
    try {
      console.log(`[RSS Ingestion] Triggering Blog Auto-Share for ${itemsCreated} new items`);
      const autoShareResult = await blogAutoShareService.processNewItems();
      console.log(`[RSS Ingestion] Blog Auto-Share: ${autoShareResult.published} published, ${autoShareResult.drafts} drafts, ${autoShareResult.failed} failed`);
    } catch (error) {
      console.error('[RSS Ingestion] Blog Auto-Share processing failed:', error);
      // Don't fail the entire job if auto-share fails
    }
  }

  return {
    processed: feeds.length,
    successful,
    failed,
    itemsCreated,
    results,
    durationMs: Date.now() - startTime,
  };
}

// ============================================
// SINGLE FEED REFRESH
// ============================================

/**
 * Manually refresh a single feed
 *
 * Used for immediate refresh from UI.
 */
export async function refreshFeed(feedId: string, profileId: string): Promise<IngestionResult> {
  // Verify ownership
  const feed = await prisma.rssFeed.findFirst({
    where: {
      id: feedId,
      profileId: profileId,
    },
  });

  if (!feed) {
    return {
      feedId,
      feedName: 'Unknown',
      success: false,
      itemsCreated: 0,
      itemsSkipped: 0,
      error: 'Feed not found or access denied',
    };
  }

  return processFeed(feed);
}

// ============================================
// FEED MANAGEMENT
// ============================================

/**
 * Reactivate a paused/errored feed
 *
 * Resets error count and sets status to ACTIVE.
 */
export async function reactivateFeed(feedId: string, profileId: string): Promise<boolean> {
  const result = await prisma.rssFeed.updateMany({
    where: {
      id: feedId,
      profileId: profileId,
    },
    data: {
      status: 'ACTIVE',
      errorCount: 0,
      lastError: null,
    },
  });

  return result.count > 0;
}
