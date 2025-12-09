// ============================================
// SOCIAL PLATFORM TYPES
// ============================================

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'snapchat'

export type PlanTier = 'free' | 'creator' | 'pro'

// ============================================
// OAUTH TYPES
// ============================================

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  authUrl: string
  tokenUrl: string
  refreshUrl?: string
  revokeUrl?: string
  scopes: string[]
  responseType: 'code' | 'token'
  grantType: 'authorization_code' | 'client_credentials'
  pkceRequired?: boolean
  additionalParams?: Record<string, string>
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  tokenType?: string
  scope?: string
}

export interface OAuthState {
  userId: string
  platform: SocialPlatform
  timestamp: number
  nonce: string
  codeVerifier?: string // For PKCE
}

export interface SocialProfile {
  platformUserId: string
  username?: string
  displayName?: string
  profileImageUrl?: string
  email?: string
  followers?: number
  following?: number
  metadata?: Record<string, unknown>
}

// ============================================
// CONTENT TYPES
// ============================================

export interface ContentUpload {
  id: string
  userId: string
  originalUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  duration?: number
  thumbnailUrl?: string
  status: ContentStatus
  createdAt: Date
}

export type ContentStatus = 'processing' | 'ready' | 'failed' | 'archived'

export interface PlatformContent {
  caption: string
  hashtags: string[]
  mentionedUsers?: string[]
  settings?: PlatformSettings
}

export interface PlatformSettings {
  // Instagram
  coverPhoto?: string
  shareToFeed?: boolean
  shareToStory?: boolean

  // TikTok
  privacyLevel?: 'public' | 'friends' | 'private'
  allowComments?: boolean
  allowDuet?: boolean
  allowStitch?: boolean

  // YouTube
  title?: string
  description?: string
  tags?: string[]
  categoryId?: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
  madeForKids?: boolean

  // Twitter/X
  replySettings?: 'everyone' | 'following' | 'mentionedUsers'

  // LinkedIn
  visibility?: 'PUBLIC' | 'CONNECTIONS'

  // Facebook
  targetAudience?: Record<string, unknown>

  // Snapchat
  storyDuration?: number
}

// ============================================
// PUBLISHING TYPES
// ============================================

export interface PublishRequest {
  contentUploadId: string
  platform: SocialPlatform
  content: PlatformContent
  scheduleAt?: Date
}

export interface PublishResult {
  success: boolean
  platform: SocialPlatform
  platformPostId?: string
  platformUrl?: string
  error?: string
  publishedAt?: Date
}

export interface ScheduledPost {
  id: string
  userId: string
  contentUploadId: string
  platforms: SocialPlatform[]
  scheduledAt: Date
  timezone: string
  platformContent: Record<SocialPlatform, PlatformContent>
  status: ScheduleStatus
}

export type ScheduleStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'partial_failure'
  | 'failed'
  | 'cancelled'

// ============================================
// ANALYTICS TYPES
// ============================================

export interface PostAnalytics {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  impressions: number
  avgWatchTime?: number
  completionRate?: number
  demographics?: Demographics
  locationData?: LocationData[]
  retentionCurve?: RetentionPoint[]
}

export interface Demographics {
  ageRanges: Record<string, number>
  genders: Record<string, number>
  countries: Record<string, number>
}

export interface LocationData {
  country: string
  region?: string
  city?: string
  percentage: number
  engagement: number
}

export interface RetentionPoint {
  timestamp: number
  retention: number
}

export interface AccountAnalytics {
  followers: number
  following: number
  totalPosts: number
  avgEngagementRate: number
  avgReach: number
  avgImpressions: number
  followerGrowth: number
  topPosts: PostAnalytics[]
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  metadata?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

export interface PlatformApiError {
  platform: SocialPlatform
  code: string
  message: string
  retryable: boolean
  retryAfter?: number
}

// ============================================
// RATE LIMITING
// ============================================

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  retryAfter?: number
}

export interface RateLimitStatus {
  remaining: number
  total: number
  resetAt: Date
  isLimited: boolean
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface WebhookPayload {
  platform: SocialPlatform
  eventType: string
  timestamp: Date
  data: Record<string, unknown>
  signature?: string
}

export interface WebhookConfig {
  platform: SocialPlatform
  endpointUrl: string
  secret: string
  events: string[]
}
