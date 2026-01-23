/**
 * Platform Capabilities Configuration
 *
 * Defines what each social platform supports for content publishing.
 * Used by Blog Auto-Share and other features to determine compatible platforms.
 */

import type { SocialPlatform } from '../types/social'

// ============================================
// PLATFORM CAPABILITY FLAGS
// ============================================

export interface PlatformCapabilities {
  // Content type support
  supportsLinkPost: boolean       // Can publish posts with clickable links
  supportsImagePost: boolean      // Can publish image posts
  supportsTextOnly: boolean       // Can publish text-only posts (no media)
  supportsVideoOnly: boolean      // Platform is video-centric (TikTok, YouTube)

  // Blog Auto-Share specific
  supportsBlogAutoShare: boolean  // Eligible for V1 blog auto-share

  // Future expansion
  supportsCarousel: boolean       // Can publish multiple images
  supportsStories: boolean        // Has ephemeral content format
  supportsReels: boolean          // Has short-form video format
  supportsScheduling: boolean     // Platform supports scheduled posts

  // Link behavior
  linksClickable: boolean         // Links in captions are clickable
  linkInBioRequired: boolean      // Links only work via bio (Instagram)

  // Caption limits for blog posts
  maxCaptionLength: number
  recommendedCaptionLength: number
}

// ============================================
// PLATFORM CAPABILITIES REGISTRY
// ============================================

export const PLATFORM_CAPABILITIES: Record<SocialPlatform, PlatformCapabilities> = {
  // V1 Blog Auto-Share Platforms
  instagram: {
    supportsLinkPost: false,      // Links not clickable in captions
    supportsImagePost: true,
    supportsTextOnly: false,      // Requires media
    supportsVideoOnly: false,
    supportsBlogAutoShare: true,  // V1 supported
    supportsCarousel: true,
    supportsStories: true,
    supportsReels: true,
    supportsScheduling: true,
    linksClickable: false,
    linkInBioRequired: true,
    maxCaptionLength: 2200,
    recommendedCaptionLength: 150,
  },

  facebook: {
    supportsLinkPost: true,
    supportsImagePost: true,
    supportsTextOnly: true,
    supportsVideoOnly: false,
    supportsBlogAutoShare: true,  // V1 supported
    supportsCarousel: true,
    supportsStories: true,
    supportsReels: true,
    supportsScheduling: true,
    linksClickable: true,
    linkInBioRequired: false,
    maxCaptionLength: 63206,
    recommendedCaptionLength: 250,
  },

  twitter: {
    supportsLinkPost: true,
    supportsImagePost: true,
    supportsTextOnly: true,
    supportsVideoOnly: false,
    supportsBlogAutoShare: true,  // V1 supported
    supportsCarousel: true,
    supportsStories: false,
    supportsReels: false,
    supportsScheduling: true,
    linksClickable: true,
    linkInBioRequired: false,
    maxCaptionLength: 280,
    recommendedCaptionLength: 250,
  },

  linkedin: {
    supportsLinkPost: true,
    supportsImagePost: true,
    supportsTextOnly: true,
    supportsVideoOnly: false,
    supportsBlogAutoShare: true,  // V1 supported
    supportsCarousel: true,
    supportsStories: false,
    supportsReels: false,
    supportsScheduling: true,
    linksClickable: true,
    linkInBioRequired: false,
    maxCaptionLength: 3000,
    recommendedCaptionLength: 250,
  },

  'linkedin-org': {
    supportsLinkPost: true,
    supportsImagePost: true,
    supportsTextOnly: true,
    supportsVideoOnly: false,
    supportsBlogAutoShare: true,  // V1 supported (company pages)
    supportsCarousel: true,
    supportsStories: false,
    supportsReels: false,
    supportsScheduling: true,
    linksClickable: true,
    linkInBioRequired: false,
    maxCaptionLength: 3000,
    recommendedCaptionLength: 250,
  },

  discord: {
    supportsLinkPost: true,
    supportsImagePost: true,
    supportsTextOnly: true,
    supportsVideoOnly: false,
    supportsBlogAutoShare: true,  // V1 supported
    supportsCarousel: true,
    supportsStories: false,
    supportsReels: false,
    supportsScheduling: false,    // No native scheduling
    linksClickable: true,
    linkInBioRequired: false,
    maxCaptionLength: 2000,
    recommendedCaptionLength: 500,
  },

  pinterest: {
    supportsLinkPost: true,       // Pins can have destination links
    supportsImagePost: true,
    supportsTextOnly: false,      // Requires image
    supportsVideoOnly: false,
    supportsBlogAutoShare: true,  // V1 supported
    supportsCarousel: true,
    supportsStories: false,
    supportsReels: false,
    supportsScheduling: true,
    linksClickable: true,
    linkInBioRequired: false,
    maxCaptionLength: 500,
    recommendedCaptionLength: 100,
  },

  // V2+ Platforms (Video-centric - excluded from V1 Blog Auto-Share)
  tiktok: {
    supportsLinkPost: false,
    supportsImagePost: false,     // Images only as photo slideshows
    supportsTextOnly: false,
    supportsVideoOnly: true,      // Video required
    supportsBlogAutoShare: false, // V1 excluded - video only
    supportsCarousel: false,
    supportsStories: false,
    supportsReels: false,         // TikTok IS short-form video
    supportsScheduling: true,
    linksClickable: false,
    linkInBioRequired: true,
    maxCaptionLength: 4000,
    recommendedCaptionLength: 150,
  },

  youtube: {
    supportsLinkPost: false,
    supportsImagePost: false,
    supportsTextOnly: false,
    supportsVideoOnly: true,      // Video required
    supportsBlogAutoShare: false, // V1 excluded - video only
    supportsCarousel: false,
    supportsStories: true,        // YouTube Shorts
    supportsReels: true,          // YouTube Shorts
    supportsScheduling: true,
    linksClickable: true,         // In description
    linkInBioRequired: false,
    maxCaptionLength: 5000,
    recommendedCaptionLength: 200,
  },

  reddit: {
    supportsLinkPost: true,
    supportsImagePost: true,
    supportsTextOnly: true,
    supportsVideoOnly: false,
    supportsBlogAutoShare: false, // V1 excluded - requires subreddit selection
    supportsCarousel: false,
    supportsStories: false,
    supportsReels: false,
    supportsScheduling: false,
    linksClickable: true,
    linkInBioRequired: false,
    maxCaptionLength: 40000,
    recommendedCaptionLength: 300,
  },

  meta: {
    // Meta is a combined platform - uses Instagram capabilities
    supportsLinkPost: false,
    supportsImagePost: true,
    supportsTextOnly: false,
    supportsVideoOnly: false,
    supportsBlogAutoShare: false, // Use instagram/facebook directly
    supportsCarousel: true,
    supportsStories: true,
    supportsReels: true,
    supportsScheduling: true,
    linksClickable: false,
    linkInBioRequired: true,
    maxCaptionLength: 2200,
    recommendedCaptionLength: 150,
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get platforms that support Blog Auto-Share V1
 */
export function getBlogAutoSharePlatforms(): SocialPlatform[] {
  return (Object.entries(PLATFORM_CAPABILITIES) as [SocialPlatform, PlatformCapabilities][])
    .filter(([, caps]) => caps.supportsBlogAutoShare)
    .map(([platform]) => platform)
}

/**
 * Get platforms that are video-only
 */
export function getVideoOnlyPlatforms(): SocialPlatform[] {
  return (Object.entries(PLATFORM_CAPABILITIES) as [SocialPlatform, PlatformCapabilities][])
    .filter(([, caps]) => caps.supportsVideoOnly)
    .map(([platform]) => platform)
}

/**
 * Check if a platform supports text-only posts
 */
export function supportsTextOnlyPost(platform: SocialPlatform): boolean {
  return PLATFORM_CAPABILITIES[platform]?.supportsTextOnly ?? false
}

/**
 * Check if a platform requires media
 */
export function requiresMedia(platform: SocialPlatform): boolean {
  const caps = PLATFORM_CAPABILITIES[platform]
  return caps ? (!caps.supportsTextOnly) : true
}

/**
 * Get caption length limit for a platform
 */
export function getCaptionLimit(platform: SocialPlatform): number {
  return PLATFORM_CAPABILITIES[platform]?.maxCaptionLength ?? 2000
}

/**
 * Get platforms that support scheduling
 */
export function getSchedulablePlatforms(): SocialPlatform[] {
  return (Object.entries(PLATFORM_CAPABILITIES) as [SocialPlatform, PlatformCapabilities][])
    .filter(([, caps]) => caps.supportsScheduling)
    .map(([platform]) => platform)
}

// ============================================
// BLOG AUTO-SHARE V1 PLATFORMS LIST
// ============================================

export const BLOG_AUTO_SHARE_V1_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'twitter',
  'linkedin',
  'linkedin-org',
  'discord',
  'pinterest',
]

// Platforms explicitly excluded from V1 with reasons
export const BLOG_AUTO_SHARE_EXCLUDED: Record<SocialPlatform, string> = {
  tiktok: 'Video-only platform - requires video content',
  youtube: 'Video-only platform - requires video content',
  reddit: 'Requires subreddit selection - planned for V2',
  meta: 'Use Instagram or Facebook directly',
  instagram: '',  // Not excluded
  facebook: '',
  twitter: '',
  linkedin: '',
  'linkedin-org': '',
  discord: '',
  pinterest: '',
}
