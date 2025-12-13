// ============================================
// ANALYTICS EXPORT TYPES
// PRO-Only Feature
// ============================================

import type { SocialPlatform, PostAnalytics, LocationData, RetentionPoint } from './social'

// ============================================
// EXPORT CONFIGURATION
// ============================================

export type ExportFormat = 'csv' | 'pdf' | 'excel' | 'google_sheets'

export type ExportAggregation = 'per_post' | 'per_day' | 'aggregated'

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExportFilters {
  platforms?: SocialPlatform[]
  postIds?: string[]
  dateFrom?: Date
  dateTo?: Date
}

export interface ExportOptions {
  format: ExportFormat
  aggregation?: ExportAggregation
  filters: ExportFilters
  includeCharts?: boolean // PDF only
  includeRetention?: boolean // PRO only
  includeLocationData?: boolean // PRO only

  // White-label options (PRO+ only)
  whiteLabel?: WhiteLabelOptions

  // Google Sheets options
  googleSheets?: GoogleSheetsOptions
}

// ============================================
// WHITE-LABEL OPTIONS (PRO+ Feature)
// ============================================

export interface WhiteLabelOptions {
  enabled: boolean
  companyName?: string
  companyLogo?: string // URL to logo image
  primaryColor?: string // Hex color code
  secondaryColor?: string // Hex color code
  accentColor?: string // Hex color code
  footerText?: string
  hideReGenBranding?: boolean
  customCoverImage?: string // URL to cover image
}

// ============================================
// GOOGLE SHEETS OPTIONS
// ============================================

export interface GoogleSheetsOptions {
  spreadsheetId?: string // Existing spreadsheet to update
  sheetName?: string // Sheet tab name
  createNew?: boolean // Create new spreadsheet
  shareWith?: string[] // Email addresses to share with
}

// ============================================
// SCHEDULED REPORT TYPES
// ============================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'

export interface ScheduledReport {
  id: string
  userId: string
  name: string
  description?: string

  // Schedule configuration
  frequency: ScheduleFrequency
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  hour: number // 0-23, UTC
  minute: number // 0-59
  timezone: string

  // Export configuration
  format: ExportFormat
  options: ExportOptions

  // Delivery options
  deliveryMethod: 'email' | 'download' | 'google_drive' | 'webhook'
  deliveryConfig: {
    emails?: string[]
    webhookUrl?: string
    googleDriveFolderId?: string
  }

  // Status
  isActive: boolean
  lastRunAt?: Date
  nextRunAt?: Date
  lastStatus?: 'success' | 'failed'
  lastError?: string
  runCount: number

  createdAt: Date
  updatedAt: Date
}

export interface ScheduledReportCreateInput {
  userId: string
  name: string
  description?: string
  frequency: ScheduleFrequency
  dayOfWeek?: number
  dayOfMonth?: number
  hour: number
  minute: number
  timezone: string
  format: ExportFormat
  options: ExportOptions
  deliveryMethod: 'email' | 'download' | 'google_drive' | 'webhook'
  deliveryConfig: {
    emails?: string[]
    webhookUrl?: string
    googleDriveFolderId?: string
  }
}

// ============================================
// SHAREABLE LINK TYPES
// ============================================

export interface ShareableLink {
  id: string
  userId: string
  exportJobId: string

  // Link configuration
  token: string // Unique secure token
  shortCode?: string // Optional short URL code

  // Access control
  password?: string // Hashed password for protection
  maxDownloads?: number
  downloadCount: number
  allowedEmails?: string[] // Restrict to specific emails

  // Expiration
  expiresAt: Date
  isExpired: boolean

  // Tracking
  lastAccessedAt?: Date
  accessLog: ShareableLinkAccess[]

  createdAt: Date
}

export interface ShareableLinkAccess {
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  email?: string
  downloaded: boolean
}

export interface ShareableLinkCreateInput {
  userId: string
  exportJobId: string
  expiresInHours?: number // Default 72 hours
  password?: string
  maxDownloads?: number
  allowedEmails?: string[]
}

// ============================================
// CSV EXPORT TYPES
// ============================================

export interface CSVRow {
  platform: string
  postId: string
  postTitle: string
  publishDate: string
  views: number
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  saveRate: string
  watchTime: string
  retention: string
  engagementRate: string
  topLocations: string
  deviceType: string
  dateRangeFrom: string
  dateRangeTo: string
}

export const CSV_COLUMNS: (keyof CSVRow)[] = [
  'platform',
  'postId',
  'postTitle',
  'publishDate',
  'views',
  'impressions',
  'reach',
  'likes',
  'comments',
  'shares',
  'saves',
  'saveRate',
  'watchTime',
  'retention',
  'engagementRate',
  'topLocations',
  'deviceType',
  'dateRangeFrom',
  'dateRangeTo',
]

export const CSV_COLUMN_HEADERS: Record<keyof CSVRow, string> = {
  platform: 'Platform',
  postId: 'Post ID',
  postTitle: 'Post Title / Caption',
  publishDate: 'Publish Date',
  views: 'Views',
  impressions: 'Impressions',
  reach: 'Reach',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  saveRate: 'Save Rate (%)',
  watchTime: 'Watch Time',
  retention: 'Retention (%)',
  engagementRate: 'Engagement Rate (%)',
  topLocations: 'Top Audience Locations',
  deviceType: 'Device Type',
  dateRangeFrom: 'Date Range (From)',
  dateRangeTo: 'Date Range (To)',
}

// ============================================
// PDF EXPORT TYPES
// ============================================

export interface PDFReportData {
  creatorName: string
  creatorEmail?: string
  reportTitle: string
  dateRange: {
    from: Date
    to: Date
  }
  generatedAt: Date

  // Summary metrics
  summary: {
    totalViews: number
    totalEngagements: number
    avgEngagementRate: number
    totalPosts: number
    topPerformingPlatform: SocialPlatform | null
  }

  // Platform breakdown
  platformAnalytics: Array<{
    platform: SocialPlatform
    followers: number
    posts: number
    views: number
    engagementRate: number
    reach: number
    growth: number
  }>

  // Post breakdown
  posts: Array<{
    id: string
    platform: SocialPlatform
    title: string
    publishedAt: Date
    analytics: PostAnalytics
  }>

  // Charts data (for visual rendering)
  chartsData?: {
    viewsOverTime: Array<{ date: string; views: number }>
    engagementByPlatform: Array<{ platform: string; engagement: number }>
    retentionCurves?: Array<{ postId: string; data: RetentionPoint[] }>
  }

  // Location data (PRO only)
  locationData?: LocationData[]
}

// ============================================
// EXPORT JOB TYPES
// ============================================

export interface ExportJob {
  id: string
  userId: string
  format: ExportFormat
  options: ExportOptions
  status: ExportStatus
  progress: number
  fileUrl?: string
  fileName?: string
  fileSize?: number
  error?: string
  createdAt: Date
  completedAt?: Date
  expiresAt?: Date
}

export interface ExportJobCreateInput {
  userId: string
  format: ExportFormat
  options: ExportOptions
}

// ============================================
// EXPORT RESULT TYPES
// ============================================

export interface ExportResult {
  success: boolean
  jobId?: string
  fileUrl?: string
  fileName?: string
  error?: string
  estimatedTime?: number // seconds
}

// ============================================
// NORMALIZED ANALYTICS FOR EXPORT
// ============================================

export interface NormalizedPostAnalytics {
  postId: string
  platform: SocialPlatform
  platformPostId: string
  title: string
  caption?: string
  publishedAt: Date

  // Core metrics
  views: number
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number

  // Calculated metrics
  engagementRate: number
  saveRate: number

  // Video metrics (optional)
  avgWatchTime?: number
  completionRate?: number

  // Location data (optional)
  topLocations?: LocationData[]

  // Retention data (optional, PRO only)
  retentionCurve?: RetentionPoint[]

  // Device breakdown (optional)
  deviceBreakdown?: Record<string, number>
}

export interface NormalizedAccountAnalytics {
  platform: SocialPlatform
  followers: number
  following: number
  totalPosts: number
  avgEngagementRate: number
  avgReach: number
  avgImpressions: number
  followerGrowth: number
  periodStart: Date
  periodEnd: Date
}

// ============================================
// EXPORT AUDIT TYPES
// ============================================

export interface ExportAuditLog {
  id: string
  userId: string
  exportJobId: string
  format: ExportFormat
  filters: ExportFilters
  rowCount: number
  fileSize: number
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}
