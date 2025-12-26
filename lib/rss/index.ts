/**
 * RSS Module Exports
 *
 * Central export point for RSS-related functionality.
 */

// Parser utilities
export {
  validateFeedUrl,
  fetchAndParseFeed,
  validateFeed,
  type ParsedFeed,
  type ParsedFeedItem,
  type FetchFeedResult,
} from './parser';

// Ingestion service
export {
  runIngestionJob,
  refreshFeed,
  reactivateFeed,
  type IngestionResult,
  type IngestionJobResult,
} from './ingestion';

// Curated feeds library
export {
  NICHES,
  CURATED_FEEDS,
  getEnabledFeeds,
  getFeedsByNiche,
  getFeedById,
  getFeedsBySourceType,
  searchFeeds,
  getNicheByKey,
  type SourceType,
  type CuratedFeed,
  type Niche,
} from './curated-feeds';
