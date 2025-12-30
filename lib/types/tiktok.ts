// ============================================
// TIKTOK API TYPES
// Types for TikTok Display API and Content Posting API
// ============================================

// ============================================
// VIDEO TYPES (Display API)
// ============================================

/**
 * TikTok video object from Display API /v2/video/list/
 */
export interface TikTokVideo {
  id: string
  createTime: number  // Unix timestamp
  coverImageUrl: string
  shareUrl: string
  videoDescription: string
  duration: number  // In seconds
  title: string
  embedHtml?: string
  embedLink?: string
  height?: number
  width?: number
}

/**
 * Response from TikTok Display API video list endpoint
 */
export interface TikTokVideoListResponse {
  videos: TikTokVideo[]
  cursor: string | null
  hasMore: boolean
}

// ============================================
// METRICS TYPES (Display API)
// ============================================

/**
 * Video metrics from TikTok Display API
 */
export interface TikTokMetrics {
  views: number
  likes: number
  comments: number
  shares: number
}

/**
 * Video with associated metrics (for UI display)
 */
export interface TikTokVideoWithMetrics extends TikTokVideo {
  metrics: TikTokMetrics | null
  metricsFetchedAt?: Date
}

/**
 * Cached metrics record (from database)
 */
export interface TikTokCachedMetrics {
  videoId: string
  metrics: TikTokMetrics
  fetchedAt: Date
  cached: boolean
}

// ============================================
// POSTING TYPES (Content Posting API)
// ============================================

/**
 * Privacy levels for TikTok posts
 */
export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY'

/**
 * Post status in our system
 */
export type TikTokPostStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'posted'
  | 'failed'
  | 'scheduled'

/**
 * Options for creating a TikTok post
 */
export interface TikTokPostOptions {
  caption: string
  videoUrl?: string  // For PULL_FROM_URL method
  videoFile?: Buffer | string  // For FILE_UPLOAD method
  contentUploadId?: string  // Reference to ReGenr content
  privacyLevel?: TikTokPrivacyLevel
  disableComments?: boolean
  disableDuet?: boolean
  disableStitch?: boolean
  scheduledAt?: Date
}

/**
 * Result from creating a TikTok post
 */
export interface TikTokPostResult {
  success: boolean
  postId: string  // ReGenr post ID
  status: TikTokPostStatus
  tiktokVideoId?: string
  publishId?: string
  shareUrl?: string
  error?: string
}

/**
 * Response from TikTok initialize upload endpoint
 * Note: TikTok API returns snake_case properties
 */
export interface TikTokInitUploadResponse {
  publish_id: string
  upload_url: string
}

/**
 * Response from TikTok publish/finalize endpoint
 * Note: TikTok API returns snake_case properties
 */
export interface TikTokPublishResponse {
  publish_id: string
  share_url?: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request body for POST /api/tiktok/post
 */
export interface CreateTikTokPostRequest {
  contentUploadId?: string
  videoUrl?: string
  caption: string
  privacyLevel?: TikTokPrivacyLevel
  disableComments?: boolean
  disableDuet?: boolean
  disableStitch?: boolean
  scheduledAt?: string  // ISO date string
}

/**
 * Response from POST /api/tiktok/post
 */
export interface CreateTikTokPostResponse {
  success: boolean
  postId: string
  status: TikTokPostStatus
  tiktokVideoId?: string
  error?: string
}

/**
 * Response from GET /api/tiktok/videos
 */
export interface GetTikTokVideosResponse {
  videos: TikTokVideoWithMetrics[]
  hasMore: boolean
  cursor: string | null
}

/**
 * Response from GET /api/tiktok/metrics
 */
export interface GetTikTokMetricsResponse {
  videoId: string
  metrics: TikTokMetrics
  fetchedAt: string
  cached: boolean
}

/**
 * Response from GET /api/tiktok/status
 */
export interface GetTikTokStatusResponse {
  connected: boolean
  username?: string
  avatarUrl?: string
  scopes?: string[]
  expiresAt?: string
}

// ============================================
// TIKTOK API RAW RESPONSE TYPES
// ============================================

/**
 * Raw TikTok API response wrapper
 */
export interface TikTokApiResponse<T> {
  data: T
  error?: {
    code: string
    message: string
    log_id?: string
  }
}

/**
 * Raw video data from TikTok API
 */
export interface TikTokApiVideo {
  id: string
  create_time: number
  cover_image_url: string
  share_url: string
  video_description: string
  duration: number
  title: string
  embed_html?: string
  embed_link?: string
  height?: number
  width?: number
  like_count?: number
  comment_count?: number
  share_count?: number
  view_count?: number
}

/**
 * Raw video list response from TikTok API
 */
export interface TikTokApiVideoListResponse {
  videos: TikTokApiVideo[]
  cursor: number
  has_more: boolean
}
