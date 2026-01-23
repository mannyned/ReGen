/**
 * Blog Auto-Share Module
 *
 * Automatically shares blog posts from RSS feeds to social media platforms.
 */

export { MetadataExtractor, metadataExtractor } from './MetadataExtractor'
export type { ArticleMetadata, ExtractionResult } from './MetadataExtractor'

export { BlogAutoShareService, blogAutoShareService } from './BlogAutoShareService'
export type {
  AutoShareResult,
  PlatformPublishResult,
  ProcessingJobResult,
} from './BlogAutoShareService'
