/**
 * YouTube API Types
 *
 * Types for YouTube upload and analytics.
 */

// ============================================
// UPLOAD TYPES
// ============================================

export type YouTubePrivacyStatus = 'public' | 'private' | 'unlisted';

export type YouTubeCategory =
  | '1'   // Film & Animation
  | '2'   // Autos & Vehicles
  | '10'  // Music
  | '15'  // Pets & Animals
  | '17'  // Sports
  | '19'  // Travel & Events
  | '20'  // Gaming
  | '22'  // People & Blogs
  | '23'  // Comedy
  | '24'  // Entertainment
  | '25'  // News & Politics
  | '26'  // Howto & Style
  | '27'  // Education
  | '28'  // Science & Technology
  | '29'; // Nonprofits & Activism

export interface YouTubeUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: YouTubeCategory;
  privacyStatus?: YouTubePrivacyStatus;
  videoFileRef?: string;  // Reference to uploaded file
  videoUrl?: string;      // Direct URL to video
  madeForKids?: boolean;
  publishAt?: Date;       // For scheduled uploads
}

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  status?: 'uploading' | 'processing' | 'published' | 'failed';
  error?: string;
}

// ============================================
// METRICS TYPES
// ============================================

export interface YouTubeMetrics {
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  subscribersGained: number;
  subscribersLost: number;
}

export interface YouTubeVideoMetrics {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  publishedAt: string;
  metrics: YouTubeMetrics;
  fetchedAt: string;
  cached: boolean;
}

export interface YouTubeChannelMetrics {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  metrics: YouTubeMetrics;
  fetchedAt: string;
  cached: boolean;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface UploadYouTubeVideoRequest {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: YouTubeCategory;
  privacyStatus?: YouTubePrivacyStatus;
  videoUrl?: string;
  madeForKids?: boolean;
}

export interface UploadYouTubeVideoResponse {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  status?: string;
  error?: string;
  code?: string;
}

export interface GetYouTubeMetricsRequest {
  videoId?: string;      // Specific video (optional)
  startDate?: string;    // ISO date
  endDate?: string;      // ISO date
}

export interface GetYouTubeMetricsResponse {
  channelId: string;
  channelTitle: string;
  videos?: YouTubeVideoMetrics[];
  channelMetrics?: YouTubeChannelMetrics;
  fetchedAt: string;
  cached: boolean;
  error?: string;
  code?: string;
}

export interface GetYouTubeStatusResponse {
  connected: boolean;
  channelId?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  expiresAt?: string;
}

// ============================================
// YOUTUBE API TYPES
// ============================================

export interface YouTubeVideoResource {
  kind: 'youtube#video';
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    tags?: string[];
    categoryId: string;
  };
  status: {
    uploadStatus: string;
    privacyStatus: YouTubePrivacyStatus;
    publishAt?: string;
    madeForKids: boolean;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    commentCount: string;
  };
}

export interface YouTubeChannelResource {
  kind: 'youtube#channel';
  etag: string;
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface YouTubeApiError {
  error: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}
