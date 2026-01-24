export type PlanType = 'free' | 'creator' | 'pro'

export interface PlanFeatures {
  name: string
  price: number
  priceDisplay: string
  color: string
  icon: string
  // Upload limits
  maxUploadsPerMonth: number
  maxFileSize: number // in MB
  maxFilesPerUpload: number

  // Platform limits
  maxPlatforms: number
  availablePlatforms: string[]

  // Generation features
  aiCaptions: boolean
  aiHashtags: boolean
  maxHashtags: number
  customPrompts: boolean

  // Scheduling
  scheduling: boolean
  maxScheduledPosts: number
  autoPosting: boolean

  // Analytics
  basicAnalytics: boolean
  advancedAnalytics: boolean
  locationAnalytics: boolean     // Pro only - engagement by geographic location
  saveRateAnalytics: boolean     // Creator + Pro - save rate metrics
  retentionAnalytics: boolean    // Pro only - video retention graphs
  aiRecommendations: boolean
  exportReports: boolean

  // Automation
  blogAutoShare: boolean         // Pro only - automatic blog post sharing from RSS

  // Storage
  cloudStorage: number // in GB

  // Support
  support: 'community' | 'email' | 'priority'

  // Other features
  testMode: boolean
  watermark: boolean
  teamMembers: number
}

export const PLANS: Record<PlanType, PlanFeatures> = {
  free: {
    name: 'Free',
    price: 0,
    priceDisplay: 'Free',
    color: 'bg-gray-500',
    icon: '🎯',
    // Upload limits
    maxUploadsPerMonth: 10,
    maxFileSize: 50, // 50MB
    maxFilesPerUpload: 1,
    // Platform limits
    maxPlatforms: 2,
    availablePlatforms: ['instagram', 'tiktok'],
    // Generation features
    aiCaptions: true,
    aiHashtags: true,
    maxHashtags: 10,
    customPrompts: false,
    // Scheduling
    scheduling: false,
    maxScheduledPosts: 0,
    autoPosting: false,
    // Analytics
    basicAnalytics: true,
    advancedAnalytics: false,
    locationAnalytics: false,     // Pro only
    saveRateAnalytics: false,     // Creator + Pro (not Free)
    retentionAnalytics: false,    // Pro only
    aiRecommendations: false,
    exportReports: false,
    // Automation
    blogAutoShare: false,         // Pro only
    // Storage
    cloudStorage: 1, // 1GB
    // Support
    support: 'community',
    // Other features
    testMode: true,
    watermark: true,
    teamMembers: 1
  },
  creator: {
    name: 'Creator',
    price: 9,
    priceDisplay: '$9/month',
    color: 'bg-primary',
    icon: '🌟',
    // Upload limits
    maxUploadsPerMonth: -1, // unlimited
    maxFileSize: 200, // 200MB
    maxFilesPerUpload: 6,
    // Platform limits
    maxPlatforms: 5,
    availablePlatforms: ['instagram', 'facebook', 'tiktok', 'youtube', 'x', 'linkedin', 'snapchat'],
    // Generation features
    aiCaptions: true,
    aiHashtags: true,
    maxHashtags: 30,
    customPrompts: true,
    // Scheduling
    scheduling: true,
    maxScheduledPosts: 50,
    autoPosting: true,
    // Analytics
    basicAnalytics: true,
    advancedAnalytics: false,
    locationAnalytics: false,     // Pro only
    saveRateAnalytics: true,      // Creator gets Save Rate!
    retentionAnalytics: false,    // Pro only
    aiRecommendations: false,
    exportReports: false,
    // Automation
    blogAutoShare: false,         // Pro only
    // Storage
    cloudStorage: 10, // 10GB
    // Support
    support: 'email',
    // Other features
    testMode: true,
    watermark: false,
    teamMembers: 1
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceDisplay: '$29/month',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    icon: '⭐',
    // Upload limits
    maxUploadsPerMonth: -1, // unlimited
    maxFileSize: 500, // 500MB
    maxFilesPerUpload: 10,
    // Platform limits
    maxPlatforms: -1, // unlimited
    availablePlatforms: ['instagram', 'facebook', 'tiktok', 'youtube', 'x', 'linkedin', 'snapchat'],
    // Generation features
    aiCaptions: true,
    aiHashtags: true,
    maxHashtags: -1, // unlimited
    customPrompts: true,
    // Scheduling
    scheduling: true,
    maxScheduledPosts: -1, // unlimited
    autoPosting: true,
    // Analytics
    basicAnalytics: true,
    advancedAnalytics: true,
    locationAnalytics: true,      // Pro exclusive
    saveRateAnalytics: true,      // Pro gets Save Rate
    retentionAnalytics: true,     // Pro exclusive - Retention Graphs
    aiRecommendations: true,
    exportReports: true,
    // Automation
    blogAutoShare: true,          // Pro exclusive
    // Storage
    cloudStorage: 100, // 100GB
    // Support
    support: 'priority',
    // Other features
    testMode: true,
    watermark: false,
    teamMembers: 5
  }
}

export function getPlan(planType: PlanType): PlanFeatures {
  return PLANS[planType]
}

export function canUsePlatform(planType: PlanType, platform: string): boolean {
  const plan = getPlan(planType)
  return plan.availablePlatforms.includes(platform.toLowerCase())
}

export function getUploadLimit(planType: PlanType): number {
  const plan = getPlan(planType)
  return plan.maxFilesPerUpload
}

export function formatPlanBadge(planType: PlanType): { text: string; className: string } {
  const plan = getPlan(planType)
  switch (planType) {
    case 'free':
      return {
        text: `${plan.icon} FREE`,
        className: 'bg-gray-200 text-gray-700'
      }
    case 'creator':
      return {
        text: `${plan.icon} CREATOR`,
        className: 'bg-primary text-white'
      }
    case 'pro':
      return {
        text: `${plan.icon} PRO`,
        className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
      }
    default:
      return {
        text: 'FREE',
        className: 'bg-gray-200 text-gray-700'
      }
  }
}

// Helper to check feature availability
export function hasFeature(planType: PlanType, feature: keyof PlanFeatures): boolean {
  const plan = getPlan(planType)
  const value = plan[feature]

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value > 0 || value === -1 // -1 means unlimited
  }

  return true
}

// Get remaining uploads for the month (mock implementation)
export function getRemainingUploads(planType: PlanType, usedUploads: number = 0): number | null {
  const plan = getPlan(planType)
  if (plan.maxUploadsPerMonth === -1) {
    return null // unlimited
  }
  return Math.max(0, plan.maxUploadsPerMonth - usedUploads)
}

// Check if location analytics is available for a plan
export function hasLocationAnalytics(planType: PlanType): boolean {
  const plan = getPlan(planType)
  return plan.locationAnalytics
}

// Check if user can access advanced analytics features
export function hasAdvancedAnalytics(planType: PlanType): boolean {
  const plan = getPlan(planType)
  return plan.advancedAnalytics
}

// Check if save rate analytics is available (Creator + Pro)
export function hasSaveRateAnalytics(planType: PlanType): boolean {
  const plan = getPlan(planType)
  return plan.saveRateAnalytics
}

// Check if retention analytics is available (Pro only)
export function hasRetentionAnalytics(planType: PlanType): boolean {
  const plan = getPlan(planType)
  return plan.retentionAnalytics
}

// Check if blog auto-share is available (Pro only)
export function hasBlogAutoShare(planType: PlanType): boolean {
  const plan = getPlan(planType)
  return plan.blogAutoShare
}