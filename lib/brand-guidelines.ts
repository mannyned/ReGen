// ============================================
// SOCIAL MEDIA BRAND GUIDELINES
// ============================================
//
// This file contains official brand asset information and usage guidelines
// for all supported social media platforms in the ReGenr app.
//
// IMPORTANT: All logos are trademarks of their respective owners.
// Always refer to official brand guidelines before using these assets.
//
// ============================================

import type { SocialPlatform } from './types/social'

/**
 * Official brand resource URLs for each platform
 * These are the authoritative sources for brand assets and guidelines
 */
export const BRAND_RESOURCE_URLS: Record<SocialPlatform, {
  brandGuidelines: string
  pressKit: string
  trademark: string
}> = {
  instagram: {
    brandGuidelines: 'https://about.meta.com/brand/resources/instagram/instagram-brand/',
    pressKit: 'https://about.meta.com/brand/resources/instagram/instagram-brand/',
    trademark: 'https://about.meta.com/brand/resources/instagram/instagram-brand/',
  },
  facebook: {
    brandGuidelines: 'https://about.meta.com/brand/resources/facebook/logo/',
    pressKit: 'https://about.meta.com/brand/resources/facebook/logo/',
    trademark: 'https://about.meta.com/brand/resources/facebook/logo/',
  },
  tiktok: {
    brandGuidelines: 'https://www.tiktok.com/about/brand-guidelines',
    pressKit: 'https://newsroom.tiktok.com/en-us/press-kit',
    trademark: 'https://www.tiktok.com/legal/trademark-policy',
  },
  twitter: {
    brandGuidelines: 'https://about.x.com/en/who-we-are/brand-toolkit',
    pressKit: 'https://about.x.com/en/who-we-are/brand-toolkit',
    trademark: 'https://about.x.com/en/who-we-are/brand-toolkit',
  },
  youtube: {
    brandGuidelines: 'https://www.youtube.com/howyoutubeworks/policies/community-guidelines/',
    pressKit: 'https://www.youtube.com/about/brand-resources/',
    trademark: 'https://www.youtube.com/about/brand-resources/',
  },
  linkedin: {
    brandGuidelines: 'https://brand.linkedin.com/',
    pressKit: 'https://news.linkedin.com/media-resources',
    trademark: 'https://brand.linkedin.com/policies',
  },
  'linkedin-org': {
    brandGuidelines: 'https://brand.linkedin.com/',
    pressKit: 'https://news.linkedin.com/media-resources',
    trademark: 'https://brand.linkedin.com/policies',
  },
  snapchat: {
    brandGuidelines: 'https://snap.com/en-US/brand-guidelines',
    pressKit: 'https://newsroom.snap.com/',
    trademark: 'https://snap.com/en-US/terms/trademark-guidelines',
  },
  pinterest: {
    brandGuidelines: 'https://business.pinterest.com/brand-guidelines/',
    pressKit: 'https://newsroom.pinterest.com/en/media-assets',
    trademark: 'https://policy.pinterest.com/en/trademark',
  },
  discord: {
    brandGuidelines: 'https://discord.com/branding',
    pressKit: 'https://discord.com/branding',
    trademark: 'https://discord.com/terms',
  },
  meta: {
    brandGuidelines: 'https://about.meta.com/brand/resources/',
    pressKit: 'https://about.meta.com/brand/resources/',
    trademark: 'https://about.meta.com/brand/resources/',
  },
  reddit: {
    brandGuidelines: 'https://www.redditinc.com/brand',
    pressKit: 'https://www.redditinc.com/press',
    trademark: 'https://www.redditinc.com/policies/trademark-use-policy',
  },
}

/**
 * Official brand colors for each platform
 * These colors should be used when displaying platform-specific content
 */
export const BRAND_COLORS: Record<SocialPlatform, {
  primary: string
  secondary?: string
  background: string
  text: string
  safeZone: string // Minimum clear space requirement
}> = {
  instagram: {
    primary: '#E4405F',
    secondary: '#833AB4',
    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    text: '#FFFFFF',
    safeZone: '25%', // 25% of logo width on all sides
  },
  facebook: {
    primary: '#1877F2',
    background: '#1877F2',
    text: '#FFFFFF',
    safeZone: '50%', // Half the height of the logo
  },
  tiktok: {
    primary: '#000000',
    secondary: '#EE1D52',
    background: '#000000',
    text: '#FFFFFF',
    safeZone: '25%',
  },
  twitter: {
    primary: '#000000', // X uses black as primary
    background: '#000000',
    text: '#FFFFFF',
    safeZone: '50%',
  },
  youtube: {
    primary: '#FF0000',
    background: '#FF0000',
    text: '#FFFFFF',
    safeZone: '20%',
  },
  linkedin: {
    primary: '#0A66C2',
    background: '#0A66C2',
    text: '#FFFFFF',
    safeZone: '50%',
  },
  'linkedin-org': {
    primary: '#0A66C2',
    background: '#0A66C2',
    text: '#FFFFFF',
    safeZone: '50%',
  },
  snapchat: {
    primary: '#FFFC00',
    background: '#FFFC00',
    text: '#000000',
    safeZone: '10%',
  },
  pinterest: {
    primary: '#E60023',
    background: '#E60023',
    text: '#FFFFFF',
    safeZone: '25%',
  },
  discord: {
    primary: '#5865F2',
    background: '#5865F2',
    text: '#FFFFFF',
    safeZone: '20%',
  },
  meta: {
    primary: '#0081FB',
    secondary: '#833AB4',
    background: 'linear-gradient(45deg, #0081FB 0%, #833AB4 50%, #E4405F 100%)',
    text: '#FFFFFF',
    safeZone: '25%',
  },
  reddit: {
    primary: '#FF4500',
    background: '#FF4500',
    text: '#FFFFFF',
    safeZone: '20%',
  },
}

/**
 * Logo usage restrictions and requirements
 */
export const LOGO_USAGE_RULES: Record<SocialPlatform, {
  minSize: number // Minimum size in pixels
  allowedVariants: ('color' | 'monochrome' | 'white' | 'dark')[]
  restrictions: string[]
  allowedBackgrounds: string[]
}> = {
  instagram: {
    minSize: 29,
    allowedVariants: ['color', 'monochrome', 'white'],
    restrictions: [
      'Do not modify or recreate the logo',
      'Do not change the logo colors',
      'Do not add effects (shadows, outlines, gradients)',
      'Do not rotate or skew the logo',
      'Do not combine with other logos',
    ],
    allowedBackgrounds: ['White', 'Black', 'Instagram gradient'],
  },
  facebook: {
    minSize: 24,
    allowedVariants: ['color', 'white'],
    restrictions: [
      'Always use the official blue color (#1877F2)',
      'Do not recreate, modify, distort, or alter',
      'Do not animate the logo',
      'Do not add taglines or other text',
    ],
    allowedBackgrounds: ['White', 'Light gray', 'Dark backgrounds'],
  },
  tiktok: {
    minSize: 24,
    allowedVariants: ['color', 'monochrome', 'white', 'dark'],
    restrictions: [
      'Do not modify the logo proportions',
      'Do not add effects or filters',
      'Do not recreate or simulate the logo',
    ],
    allowedBackgrounds: ['White', 'Black', 'Solid colors'],
  },
  twitter: {
    minSize: 32,
    allowedVariants: ['dark', 'white'],
    restrictions: [
      'Use only the official X logo',
      'Do not modify or recreate',
      'Do not use old Twitter bird logo',
      'Maintain clear space around logo',
    ],
    allowedBackgrounds: ['White', 'Black'],
  },
  youtube: {
    minSize: 24,
    allowedVariants: ['color', 'monochrome', 'white', 'dark'],
    restrictions: [
      'Do not modify the play button icon',
      'Do not separate elements of the logo',
      'Do not change colors from approved palette',
    ],
    allowedBackgrounds: ['White', 'Black', 'YouTube Red'],
  },
  linkedin: {
    minSize: 21,
    allowedVariants: ['color', 'monochrome', 'white'],
    restrictions: [
      'Use only the In bug or full LinkedIn logo',
      'Do not modify the LinkedIn blue color',
      'Do not add decorative elements',
      'Maintain minimum clear space',
    ],
    allowedBackgrounds: ['White', 'Light backgrounds', 'Dark backgrounds'],
  },
  'linkedin-org': {
    minSize: 21,
    allowedVariants: ['color', 'monochrome', 'white'],
    restrictions: [
      'Use only the In bug or full LinkedIn logo',
      'Do not modify the LinkedIn blue color',
      'Do not add decorative elements',
      'Maintain minimum clear space',
    ],
    allowedBackgrounds: ['White', 'Light backgrounds', 'Dark backgrounds'],
  },
  snapchat: {
    minSize: 18,
    allowedVariants: ['color', 'white', 'dark'],
    restrictions: [
      'Do not modify the ghost icon',
      'Always include the black outline on yellow background',
      'Do not recreate or animate',
      'Do not combine with other elements',
    ],
    allowedBackgrounds: ['Snapchat Yellow (#FFFC00)', 'White', 'Black'],
  },
  pinterest: {
    minSize: 24,
    allowedVariants: ['color', 'white', 'dark'],
    restrictions: [
      'Do not modify the Pinterest logo',
      'Always use Pinterest Red (#E60023)',
      'Do not rotate or skew the logo',
      'Maintain clear space around logo',
    ],
    allowedBackgrounds: ['White', 'Pinterest Red', 'Black'],
  },
  discord: {
    minSize: 24,
    allowedVariants: ['color', 'white', 'dark'],
    restrictions: [
      'Do not modify the Clyde logo',
      'Use official Blurple (#5865F2) color',
      'Do not add effects or filters',
      'Maintain clear space around logo',
    ],
    allowedBackgrounds: ['White', 'Blurple', 'Dark backgrounds'],
  },
  meta: {
    minSize: 24,
    allowedVariants: ['color', 'monochrome', 'white'],
    restrictions: [
      'Do not modify or recreate the Meta logo',
      'Do not change the logo colors',
      'Do not add effects (shadows, outlines, gradients)',
      'Do not rotate or skew the logo',
    ],
    allowedBackgrounds: ['White', 'Light backgrounds', 'Dark backgrounds'],
  },
  reddit: {
    minSize: 24,
    allowedVariants: ['color', 'monochrome', 'white'],
    restrictions: [
      'Do not modify the Snoo mascot',
      'Use official Reddit Orange (#FF4500)',
      'Do not add effects or filters',
      'Maintain clear space around logo',
    ],
    allowedBackgrounds: ['White', 'Reddit Orange', 'Dark backgrounds'],
  },
}

/**
 * Trademark ownership information
 */
export const TRADEMARK_INFO: Record<SocialPlatform, {
  owner: string
  registeredName: string
  copyrightYear: number
}> = {
  instagram: {
    owner: 'Meta Platforms, Inc.',
    registeredName: 'Instagram',
    copyrightYear: 2010,
  },
  facebook: {
    owner: 'Meta Platforms, Inc.',
    registeredName: 'Facebook',
    copyrightYear: 2004,
  },
  tiktok: {
    owner: 'ByteDance Ltd.',
    registeredName: 'TikTok',
    copyrightYear: 2016,
  },
  twitter: {
    owner: 'X Corp.',
    registeredName: 'X',
    copyrightYear: 2023,
  },
  youtube: {
    owner: 'Google LLC',
    registeredName: 'YouTube',
    copyrightYear: 2005,
  },
  linkedin: {
    owner: 'Microsoft Corporation',
    registeredName: 'LinkedIn',
    copyrightYear: 2003,
  },
  'linkedin-org': {
    owner: 'Microsoft Corporation',
    registeredName: 'LinkedIn',
    copyrightYear: 2003,
  },
  snapchat: {
    owner: 'Snap Inc.',
    registeredName: 'Snapchat',
    copyrightYear: 2011,
  },
  pinterest: {
    owner: 'Pinterest, Inc.',
    registeredName: 'Pinterest',
    copyrightYear: 2010,
  },
  discord: {
    owner: 'Discord Inc.',
    registeredName: 'Discord',
    copyrightYear: 2015,
  },
  meta: {
    owner: 'Meta Platforms, Inc.',
    registeredName: 'Meta',
    copyrightYear: 2021,
  },
  reddit: {
    owner: 'Reddit, Inc.',
    registeredName: 'Reddit',
    copyrightYear: 2005,
  },
}

/**
 * Validation function to check if logo usage is compliant
 */
export function validateLogoUsage(
  platform: SocialPlatform,
  options: {
    size: number
    variant: 'color' | 'monochrome' | 'white' | 'dark'
    isModified?: boolean
    hasEffects?: boolean
  }
): { valid: boolean; issues: string[] } {
  const rules = LOGO_USAGE_RULES[platform]
  const issues: string[] = []

  // Check minimum size
  if (options.size < rules.minSize) {
    issues.push(`Logo size (${options.size}px) is below minimum (${rules.minSize}px)`)
  }

  // Check variant is allowed
  if (!rules.allowedVariants.includes(options.variant)) {
    issues.push(`Variant '${options.variant}' is not allowed for ${platform}`)
  }

  // Check for modifications
  if (options.isModified) {
    issues.push('Logo appears to be modified - this violates brand guidelines')
  }

  // Check for effects
  if (options.hasEffects) {
    issues.push('Logo has effects applied - this violates brand guidelines')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export default {
  BRAND_RESOURCE_URLS,
  BRAND_COLORS,
  LOGO_USAGE_RULES,
  TRADEMARK_INFO,
  validateLogoUsage,
}
