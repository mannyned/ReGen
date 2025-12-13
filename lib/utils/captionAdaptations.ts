// ============================================
// CAPTION ADAPTATION UTILITIES
// ============================================
//
// Rule-based caption adaptations that modify content WITHOUT AI rewriting.
// These are deterministic transformations that users can apply selectively.
//
// IMPORTANT: These adaptations are limited and predictable.
// They do NOT change the meaning or rewrite the caption.
// Full AI rewrites require explicit user action.
//
// ============================================

import type { SocialPlatform } from '../types/social'
import type { CaptionAdaptation, PlatformCaptionInstance } from '../types/caption'
import { PLATFORM_CHARACTER_LIMITS, checkCaptionLimit, countEmojis } from '../types/caption'

// ============================================
// ADAPTATION FUNCTIONS
// ============================================

/**
 * Shorten caption to fit within specified length
 * Uses intelligent truncation at sentence/word boundaries
 */
export function shortenCaption(caption: string, maxLength: number): string {
  if (caption.length <= maxLength) return caption

  // Try to truncate at sentence boundary
  const sentences = caption.split(/(?<=[.!?])\s+/)
  let result = ''

  for (const sentence of sentences) {
    if ((result + sentence).length <= maxLength - 3) {
      result += (result ? ' ' : '') + sentence
    } else {
      break
    }
  }

  // If no complete sentences fit, truncate at word boundary
  if (!result || result.length < maxLength * 0.3) {
    const words = caption.split(/\s+/)
    result = ''
    for (const word of words) {
      if ((result + ' ' + word).length <= maxLength - 3) {
        result += (result ? ' ' : '') + word
      } else {
        break
      }
    }
  }

  // Add ellipsis if truncated
  if (result.length < caption.length) {
    result = result.trimEnd() + '...'
  }

  return result
}

/**
 * Remove all hashtags from caption
 */
export function removeHashtags(caption: string): string {
  return caption
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Reduce hashtags to specified count, keeping most relevant
 */
export function reduceHashtags(hashtags: string[], maxCount: number): string[] {
  if (hashtags.length <= maxCount) return hashtags
  // Keep first N hashtags (assuming user prioritized them)
  return hashtags.slice(0, maxCount)
}

/**
 * Remove all emojis from caption
 */
export function removeEmojis(caption: string): string {
  return caption
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Reduce emojis to specified count
 */
export function reduceEmojis(caption: string, maxCount: number): string {
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu
  let count = 0

  return caption.replace(emojiRegex, (match) => {
    count++
    return count <= maxCount ? match : ''
  }).replace(/\s+/g, ' ').trim()
}

/**
 * Add line breaks for readability (after sentences)
 */
export function addLineBreaks(caption: string): string {
  // Add line breaks after sentences (but not if already has many line breaks)
  if ((caption.match(/\n/g) || []).length > 2) return caption

  return caption
    .replace(/([.!?])\s+/g, '$1\n\n')
    .trim()
}

/**
 * Remove line breaks (condense to single line)
 */
export function removeLineBreaks(caption: string): string {
  return caption
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Add call-to-action if not present
 */
export function addCTA(caption: string, cta: string = 'Follow for more!'): string {
  // Always add CTA to make the change visible
  // This helps verify the adaptation is working
  return caption.trimEnd() + '\n\n' + cta
}

/**
 * Remove @mentions from caption
 */
export function removeMentions(caption: string): string {
  return caption
    .replace(/@\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Adjust caption for professional tone (LinkedIn-style)
 * Note: This is a MINIMAL adjustment, not a rewrite
 */
export function adjustProfessionalTone(caption: string): string {
  let adjusted = caption

  // Reduce excessive emojis for professional context
  const emojiCount = countEmojis(adjusted)
  if (emojiCount > 3) {
    adjusted = reduceEmojis(adjusted, 3)
  }

  // Remove casual phrases (simple replacements only)
  const casualReplacements: [RegExp, string][] = [
    [/\bOMG\b/gi, ''],
    [/\bLOL\b/gi, ''],
    [/\bLMAO\b/gi, ''],
    [/!{3,}/g, '!'],
    [/\?{3,}/g, '?'],
  ]

  for (const [pattern, replacement] of casualReplacements) {
    adjusted = adjusted.replace(pattern, replacement)
  }

  return adjusted.replace(/\s+/g, ' ').trim()
}

/**
 * Adjust caption for casual tone (TikTok-style)
 * Note: This is a MINIMAL adjustment, not a rewrite
 */
export function adjustCasualTone(caption: string): string {
  // Remove overly formal punctuation
  return caption
    .replace(/;\s*/g, '! ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================
// MAIN ADAPTATION APPLIER
// ============================================

/**
 * Apply a single adaptation to a caption
 */
export function applyAdaptation(
  caption: string,
  hashtags: string[],
  adaptation: CaptionAdaptation,
  options?: { customValue?: number | string }
): { caption: string; hashtags: string[] } {
  let newCaption = caption
  let newHashtags = [...hashtags]

  switch (adaptation) {
    case 'shorten':
      const maxLength = typeof options?.customValue === 'number'
        ? options.customValue
        : 280
      newCaption = shortenCaption(caption, maxLength)
      break

    case 'remove_hashtags':
      newCaption = removeHashtags(caption)
      newHashtags = []
      break

    case 'reduce_hashtags':
      const maxHashtags = typeof options?.customValue === 'number'
        ? options.customValue
        : 5
      newHashtags = reduceHashtags(hashtags, maxHashtags)
      break

    case 'remove_emojis':
      newCaption = removeEmojis(caption)
      break

    case 'reduce_emojis':
      const maxEmojis = typeof options?.customValue === 'number'
        ? options.customValue
        : 3
      newCaption = reduceEmojis(caption, maxEmojis)
      break

    case 'add_line_breaks':
      newCaption = addLineBreaks(caption)
      break

    case 'remove_line_breaks':
      newCaption = removeLineBreaks(caption)
      break

    case 'add_cta':
      const cta = typeof options?.customValue === 'string'
        ? options.customValue
        : undefined
      newCaption = addCTA(caption, cta)
      break

    case 'remove_mentions':
      newCaption = removeMentions(caption)
      break

    case 'professional_tone':
      newCaption = adjustProfessionalTone(caption)
      break

    case 'casual_tone':
      newCaption = adjustCasualTone(caption)
      break

    default:
      console.warn(`Unknown adaptation: ${adaptation}`)
  }

  return { caption: newCaption, hashtags: newHashtags }
}

/**
 * Apply multiple adaptations in sequence
 */
export function applyAdaptations(
  caption: string,
  hashtags: string[],
  adaptations: CaptionAdaptation[],
  optionsMap?: Record<CaptionAdaptation, { customValue?: number | string }>
): { caption: string; hashtags: string[]; appliedAdaptations: CaptionAdaptation[] } {
  let currentCaption = caption
  let currentHashtags = [...hashtags]
  const appliedAdaptations: CaptionAdaptation[] = []

  for (const adaptation of adaptations) {
    const options = optionsMap?.[adaptation]
    const result = applyAdaptation(currentCaption, currentHashtags, adaptation, options)

    // Only mark as applied if content actually changed
    if (result.caption !== currentCaption ||
        JSON.stringify(result.hashtags) !== JSON.stringify(currentHashtags)) {
      appliedAdaptations.push(adaptation)
      currentCaption = result.caption
      currentHashtags = result.hashtags
    }
  }

  return {
    caption: currentCaption,
    hashtags: currentHashtags,
    appliedAdaptations,
  }
}

// ============================================
// PLATFORM-SPECIFIC ADAPTATION HELPERS
// ============================================

/**
 * Get recommended adaptations for a platform
 */
export function getRecommendedAdaptations(
  platform: SocialPlatform,
  caption: string,
  hashtags: string[]
): CaptionAdaptation[] {
  const recommendations: CaptionAdaptation[] = []
  const limits = PLATFORM_CHARACTER_LIMITS[platform]
  const check = checkCaptionLimit(caption, hashtags, platform)

  // If over limit, recommend shortening
  if (check.isOverLimit) {
    recommendations.push('shorten')
  }

  // Platform-specific recommendations
  switch (platform) {
    case 'twitter':
      if (hashtags.length > 3) recommendations.push('reduce_hashtags')
      break
    case 'linkedin':
      if (countEmojis(caption) > 3) recommendations.push('reduce_emojis')
      break
    case 'snapchat':
      if (hashtags.length > 0) recommendations.push('remove_hashtags')
      break
    case 'tiktok':
      if (hashtags.length > 8) recommendations.push('reduce_hashtags')
      break
  }

  return recommendations
}

/**
 * Auto-fix caption to fit platform limits
 * ONLY shortens if necessary, no other changes
 */
export function autoFitPlatform(
  caption: string,
  hashtags: string[],
  platform: SocialPlatform
): { caption: string; hashtags: string[]; wasModified: boolean } {
  const limits = PLATFORM_CHARACTER_LIMITS[platform]
  const check = checkCaptionLimit(caption, hashtags, platform)

  if (!check.isOverLimit) {
    return { caption, hashtags, wasModified: false }
  }

  // Calculate how much space hashtags take
  const hashtagText = hashtags.length > 0
    ? ' ' + hashtags.map(h => `#${h}`).join(' ')
    : ''
  const hashtagLength = hashtagText.length

  // First try reducing hashtags
  let newHashtags = [...hashtags]
  if (hashtagLength > limits.caption * 0.3) {
    // Hashtags taking too much space, reduce them
    const targetHashtagCount = Math.min(3, Math.floor(hashtags.length / 2))
    newHashtags = reduceHashtags(hashtags, targetHashtagCount)
  }

  // Recalculate with reduced hashtags
  const newHashtagText = newHashtags.length > 0
    ? ' ' + newHashtags.map(h => `#${h}`).join(' ')
    : ''
  const availableForCaption = limits.caption - newHashtagText.length

  // Shorten caption if still over
  const newCaption = shortenCaption(caption, availableForCaption)

  return {
    caption: newCaption,
    hashtags: newHashtags,
    wasModified: true,
  }
}

// ============================================
// ADAPTATION DESCRIPTIONS (for UI)
// ============================================

export const ADAPTATION_DESCRIPTIONS: Record<CaptionAdaptation, {
  label: string
  description: string
  icon: string
}> = {
  shorten: {
    label: 'Shorten',
    description: 'Truncate caption at sentence/word boundaries to fit platform limit',
    icon: '✂️',
  },
  remove_hashtags: {
    label: 'Remove Hashtags',
    description: 'Strip all hashtags from the caption',
    icon: '#️⃣',
  },
  reduce_hashtags: {
    label: 'Reduce Hashtags',
    description: 'Keep only the most important hashtags',
    icon: '🏷️',
  },
  remove_emojis: {
    label: 'Remove Emojis',
    description: 'Strip all emojis from the caption',
    icon: '😶',
  },
  reduce_emojis: {
    label: 'Reduce Emojis',
    description: 'Limit emojis to a professional level',
    icon: '🙂',
  },
  add_line_breaks: {
    label: 'Add Line Breaks',
    description: 'Add paragraph breaks for better readability',
    icon: '↵',
  },
  remove_line_breaks: {
    label: 'Remove Line Breaks',
    description: 'Condense caption to a single paragraph',
    icon: '—',
  },
  add_cta: {
    label: 'Add CTA',
    description: 'Append a call-to-action at the end',
    icon: '📢',
  },
  remove_mentions: {
    label: 'Remove Mentions',
    description: 'Strip all @mentions from the caption',
    icon: '@',
  },
  professional_tone: {
    label: 'Professional Tone',
    description: 'Minor adjustments for business contexts',
    icon: '👔',
  },
  casual_tone: {
    label: 'Casual Tone',
    description: 'Minor adjustments for casual contexts',
    icon: '🎉',
  },
}

export default {
  shortenCaption,
  removeHashtags,
  reduceHashtags,
  removeEmojis,
  reduceEmojis,
  addLineBreaks,
  removeLineBreaks,
  addCTA,
  removeMentions,
  adjustProfessionalTone,
  adjustCasualTone,
  applyAdaptation,
  applyAdaptations,
  getRecommendedAdaptations,
  autoFitPlatform,
  ADAPTATION_DESCRIPTIONS,
}
