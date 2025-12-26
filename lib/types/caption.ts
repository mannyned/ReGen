// ============================================
// CAPTION WORKFLOW TYPES
// ============================================
//
// This file defines types for the caption workflow system that allows
// users to generate a primary caption and distribute it across platforms
// with explicit user controls for adaptation.
//
// KEY PRINCIPLES:
// 1. Primary caption is the single source of truth
// 2. No AI modification without explicit user action
// 3. Users have full control over caption distribution
// 4. Analytics track identical vs adapted caption performance
//
// ============================================

import type { SocialPlatform } from './social'

// ============================================
// PLATFORM CHARACTER LIMITS
// ============================================

export const PLATFORM_CHARACTER_LIMITS: Record<SocialPlatform, {
  caption: number
  hashtags: number
  description?: string
  warningThreshold: number // Percentage at which to show warning
}> = {
  instagram: {
    caption: 2200,
    hashtags: 30,
    warningThreshold: 90,
  },
  tiktok: {
    caption: 4000,
    hashtags: 100,
    warningThreshold: 90,
  },
  youtube: {
    caption: 5000, // Description
    hashtags: 500,
    description: 'Shorts: 100 chars for title',
    warningThreshold: 85,
  },
  twitter: {
    caption: 280,
    hashtags: 280, // Included in caption limit
    warningThreshold: 80,
  },
  linkedin: {
    caption: 3000,
    hashtags: 3000, // Included in caption limit
    warningThreshold: 90,
  },
  facebook: {
    caption: 63206,
    hashtags: 63206,
    warningThreshold: 95,
  },
  snapchat: {
    caption: 250,
    hashtags: 0, // No hashtags on Snapchat
    warningThreshold: 80,
  },
  pinterest: {
    caption: 500,
    hashtags: 20,
    warningThreshold: 90,
  },
  discord: {
    caption: 2000,
    hashtags: 0, // Discord doesn't use hashtags
    warningThreshold: 90,
  },
}

// ============================================
// CAPTION USAGE MODES
// ============================================

/**
 * How the caption is being used on a specific platform
 */
export type CaptionUsageMode =
  | 'identical'      // Using primary caption exactly as-is
  | 'manual_edit'    // User manually edited the caption
  | 'ai_adapted'     // AI applied rule-based adaptations
  | 'full_rewrite'   // User explicitly requested full AI rewrite

/**
 * Rule-based adaptations that can be applied without full rewrite
 */
export type CaptionAdaptation =
  | 'shorten'           // Reduce length to fit platform limits
  | 'remove_hashtags'   // Strip all hashtags
  | 'reduce_hashtags'   // Reduce to platform-appropriate number
  | 'remove_emojis'     // Strip all emojis
  | 'reduce_emojis'     // Use fewer emojis
  | 'add_line_breaks'   // Add line breaks for readability
  | 'remove_line_breaks' // Remove line breaks for compact display
  | 'add_cta'           // Add call-to-action
  | 'remove_mentions'   // Remove @mentions
  | 'professional_tone' // Adjust for LinkedIn/professional context
  | 'casual_tone'       // Adjust for TikTok/casual context

// ============================================
// PRIMARY CAPTION
// ============================================

/**
 * The primary/source caption that serves as the single source of truth
 */
export interface PrimaryCaption {
  id: string
  content: string
  hashtags: string[]
  sourcePlatform: SocialPlatform
  generatedAt: Date
  generatedBy: 'ai' | 'manual' | 'brand_voice'
  isLocked: boolean // Always starts as true
  originalContent?: string // Preserved if user edits
  metadata: {
    tone?: 'professional' | 'engaging' | 'casual'
    contentDescription?: string
    imageAnalysis?: string
  }
}

// ============================================
// PLATFORM CAPTION INSTANCE
// ============================================

/**
 * Caption instance for a specific platform, derived from primary caption
 */
export interface PlatformCaptionInstance {
  platform: SocialPlatform
  enabled: boolean // Whether this platform is selected for distribution

  // Caption content
  caption: string
  hashtags: string[]

  // Usage tracking
  usageMode: CaptionUsageMode
  appliedAdaptations: CaptionAdaptation[]

  // Validation
  characterCount: number
  isOverLimit: boolean
  isTruncated: boolean
  warningLevel: 'none' | 'approaching' | 'exceeded'

  // Edit state
  hasUserEdits: boolean
  lastEditedAt?: Date
  editHistory?: CaptionEdit[]

  // Link to primary caption
  primaryCaptionId: string
  derivedFromVersion: number
}

/**
 * Track individual edits for undo/audit
 */
export interface CaptionEdit {
  timestamp: Date
  previousContent: string
  newContent: string
  editType: 'manual' | 'adaptation' | 'revert'
  adaptationsApplied?: CaptionAdaptation[]
}

// ============================================
// CAPTION WORKFLOW STATE
// ============================================

/**
 * Complete state for the caption workflow
 */
export interface CaptionWorkflowState {
  // Primary caption (single source of truth)
  primaryCaption: PrimaryCaption | null
  primaryCaptionVersion: number

  // Platform instances
  platformInstances: Record<SocialPlatform, PlatformCaptionInstance>

  // Selection state
  selectedPlatforms: SocialPlatform[]

  // Workflow state
  step: 'select_source' | 'generate' | 'distribute' | 'review'
  isGenerating: boolean
  hasUnsavedChanges: boolean

  // Validation
  allPlatformsValid: boolean
  platformsWithWarnings: SocialPlatform[]
  platformsWithErrors: SocialPlatform[]
}

// ============================================
// CAPTION ANALYTICS METADATA
// ============================================

/**
 * Metadata stored with each published caption for analytics comparison
 */
export interface CaptionAnalyticsMetadata {
  captionId: string
  publishedAt: Date
  platform: SocialPlatform

  // Caption tracking
  primaryCaptionId: string
  usageMode: CaptionUsageMode
  appliedAdaptations: CaptionAdaptation[]

  // Content fingerprints for comparison
  contentHash: string // Hash of caption text for exact match detection
  characterCount: number
  hashtagCount: number
  emojiCount: number
  lineBreakCount: number

  // Variation tracking
  isIdenticalToPrimary: boolean
  similarityScore: number // 0-100, how similar to primary caption

  // A/B testing support
  variationGroup?: string
  experimentId?: string
}

/**
 * Aggregated analytics for caption performance comparison
 */
export interface CaptionPerformanceComparison {
  primaryCaptionId: string
  totalPlatforms: number

  // Breakdown by usage mode
  identicalCount: number
  adaptedCount: number
  manualEditCount: number
  fullRewriteCount: number

  // Performance metrics by mode
  performanceByMode: Record<CaptionUsageMode, {
    avgEngagement: number
    avgReach: number
    avgLikes: number
    avgComments: number
    platformBreakdown: Record<SocialPlatform, number>
  }>

  // Insights
  bestPerformingMode: CaptionUsageMode
  recommendations: string[]
}

// ============================================
// ADAPTATION OPTIONS
// ============================================

/**
 * Options for applying a specific adaptation
 */
export interface AdaptationOptions {
  adaptation: CaptionAdaptation
  enabled: boolean
  customValue?: number | string // e.g., target length for 'shorten'
}

/**
 * Preset adaptation configurations per platform
 */
export const PLATFORM_ADAPTATION_PRESETS: Record<SocialPlatform, AdaptationOptions[]> = {
  twitter: [
    { adaptation: 'shorten', enabled: true, customValue: 280 },
    { adaptation: 'reduce_hashtags', enabled: true, customValue: 3 },
    { adaptation: 'remove_line_breaks', enabled: true },
  ],
  linkedin: [
    { adaptation: 'professional_tone', enabled: true },
    { adaptation: 'add_line_breaks', enabled: true },
    { adaptation: 'reduce_emojis', enabled: true },
  ],
  tiktok: [
    { adaptation: 'casual_tone', enabled: true },
    { adaptation: 'reduce_hashtags', enabled: true, customValue: 5 },
  ],
  instagram: [
    { adaptation: 'add_line_breaks', enabled: true },
  ],
  youtube: [
    { adaptation: 'add_cta', enabled: true },
  ],
  facebook: [],
  snapchat: [
    { adaptation: 'shorten', enabled: true, customValue: 250 },
    { adaptation: 'remove_hashtags', enabled: true },
  ],
  pinterest: [
    { adaptation: 'shorten', enabled: true, customValue: 500 },
    { adaptation: 'add_cta', enabled: true },
  ],
  discord: [
    { adaptation: 'casual_tone', enabled: true },
    { adaptation: 'remove_hashtags', enabled: true },
  ],
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if caption exceeds platform limit
 */
export function checkCaptionLimit(
  caption: string,
  hashtags: string[],
  platform: SocialPlatform
): {
  isOverLimit: boolean
  warningLevel: 'none' | 'approaching' | 'exceeded'
  currentLength: number
  maxLength: number
  remainingChars: number
} {
  const limits = PLATFORM_CHARACTER_LIMITS[platform]
  const hashtagText = hashtags.length > 0 ? ' ' + hashtags.map(h => `#${h}`).join(' ') : ''
  const fullText = caption + hashtagText
  const currentLength = fullText.length
  const remainingChars = limits.caption - currentLength
  const usagePercent = (currentLength / limits.caption) * 100

  let warningLevel: 'none' | 'approaching' | 'exceeded' = 'none'
  if (currentLength > limits.caption) {
    warningLevel = 'exceeded'
  } else if (usagePercent >= limits.warningThreshold) {
    warningLevel = 'approaching'
  }

  return {
    isOverLimit: currentLength > limits.caption,
    warningLevel,
    currentLength,
    maxLength: limits.caption,
    remainingChars,
  }
}

/**
 * Count emojis in text
 */
export function countEmojis(text: string): number {
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu
  const matches = text.match(emojiRegex)
  return matches ? matches.length : 0
}

/**
 * Count line breaks in text
 */
export function countLineBreaks(text: string): number {
  return (text.match(/\n/g) || []).length
}

/**
 * Calculate similarity score between two captions (0-100)
 */
export function calculateSimilarity(original: string, modified: string): number {
  if (original === modified) return 100
  if (!original || !modified) return 0

  // Simple Levenshtein-based similarity
  const longer = original.length > modified.length ? original : modified
  const shorter = original.length > modified.length ? modified : original

  if (longer.length === 0) return 100

  // Check if modified is substring or contains most of original
  const commonChars = shorter.split('').filter(char => longer.includes(char)).length
  const similarity = (commonChars / longer.length) * 100

  return Math.round(similarity)
}

/**
 * Generate content hash for caption
 */
export function generateContentHash(caption: string, hashtags: string[]): string {
  const normalized = caption.toLowerCase().trim() + hashtags.sort().join(',')
  // Simple hash - in production use crypto
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Create initial platform instance from primary caption
 */
export function createPlatformInstance(
  platform: SocialPlatform,
  primaryCaption: PrimaryCaption
): PlatformCaptionInstance {
  const limitCheck = checkCaptionLimit(primaryCaption.content, primaryCaption.hashtags, platform)

  return {
    platform,
    enabled: false,
    caption: primaryCaption.content,
    hashtags: [...primaryCaption.hashtags],
    usageMode: 'identical',
    appliedAdaptations: [],
    characterCount: limitCheck.currentLength,
    isOverLimit: limitCheck.isOverLimit,
    isTruncated: false,
    warningLevel: limitCheck.warningLevel,
    hasUserEdits: false,
    primaryCaptionId: primaryCaption.id,
    derivedFromVersion: 1,
  }
}

export default {
  PLATFORM_CHARACTER_LIMITS,
  PLATFORM_ADAPTATION_PRESETS,
  checkCaptionLimit,
  countEmojis,
  countLineBreaks,
  calculateSimilarity,
  generateContentHash,
  createPlatformInstance,
}
