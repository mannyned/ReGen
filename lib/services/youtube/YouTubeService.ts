/**
 * YouTube Service
 *
 * Handles YouTube API interactions:
 * - YouTube Data API: Video uploads, video list, channel info
 * - YouTube Analytics API: View metrics, engagement data
 *
 * Uses the universal OAuth engine for token management.
 *
 * @see https://developers.google.com/youtube/v3/docs
 * @see https://developers.google.com/youtube/analytics
 */

import { getAccessToken } from '@/lib/oauth/engine';
import { prisma } from '@/lib/db';
import type {
  YouTubeUploadOptions,
  YouTubeUploadResult,
  YouTubeMetrics,
  YouTubeVideoMetrics,
  YouTubeChannelMetrics,
  YouTubeVideoResource,
  YouTubePrivacyStatus,
} from '@/lib/types/youtube';

// ============================================
// CONFIGURATION
// ============================================

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

// Cache duration for metrics (in milliseconds)
const METRICS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// ============================================
// YOUTUBE SERVICE CLASS
// ============================================

export class YouTubeService {
  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Get a valid access token for YouTube API calls
   * Automatically refreshes if expired
   */
  private async getValidAccessToken(profileId: string): Promise<string> {
    const accessToken = await getAccessToken('google', profileId);
    return accessToken;
  }

  // ============================================
  // CONNECTION STATUS
  // ============================================

  /**
   * Get YouTube connection status
   */
  async getConnectionStatus(profileId: string): Promise<{
    connected: boolean;
    channelId?: string;
    channelTitle?: string;
    thumbnailUrl?: string;
    subscriberCount?: number;
    videoCount?: number;
    expiresAt?: Date;
  }> {
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: 'google',
        },
      },
      select: {
        providerAccountId: true,
        expiresAt: true,
        metadata: true,
      },
    });

    if (!connection) {
      return { connected: false };
    }

    const metadata = connection.metadata as Record<string, unknown> | null;
    const youtubeChannel = metadata?.youtubeChannel as Record<string, unknown> | null;

    return {
      connected: true,
      channelId: youtubeChannel?.id as string | undefined,
      channelTitle: youtubeChannel?.title as string | undefined,
      thumbnailUrl: youtubeChannel?.thumbnailUrl as string | undefined,
      subscriberCount: youtubeChannel?.subscriberCount
        ? parseInt(youtubeChannel.subscriberCount as string, 10)
        : undefined,
      videoCount: youtubeChannel?.videoCount
        ? parseInt(youtubeChannel.videoCount as string, 10)
        : undefined,
      expiresAt: connection.expiresAt || undefined,
    };
  }

  /**
   * Get YouTube channel ID for the authenticated user
   */
  private async getChannelId(profileId: string): Promise<string> {
    const status = await this.getConnectionStatus(profileId);
    if (!status.connected || !status.channelId) {
      throw new Error('YouTube channel not found');
    }
    return status.channelId;
  }

  // ============================================
  // VIDEO UPLOAD
  // ============================================

  /**
   * Upload a video to YouTube
   *
   * For MVP, we use URL-based upload via the insertVideo API.
   * For larger files, resumable upload should be used.
   */
  async uploadVideo(
    profileId: string,
    options: YouTubeUploadOptions
  ): Promise<YouTubeUploadResult> {
    try {
      const accessToken = await this.getValidAccessToken(profileId);

      if (!options.videoUrl) {
        return {
          success: false,
          error: 'Video URL is required for upload',
        };
      }

      // Build video metadata
      const videoMetadata = {
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags || [],
          categoryId: options.categoryId || '22', // People & Blogs
        },
        status: {
          privacyStatus: options.privacyStatus || 'private',
          madeForKids: options.madeForKids || false,
          publishAt: options.publishAt?.toISOString(),
        },
      };

      // For URL-based upload, we need to download and re-upload
      // This is a simplified approach for MVP
      const videoResponse = await fetch(options.videoUrl);
      if (!videoResponse.ok) {
        return {
          success: false,
          error: 'Failed to fetch video from URL',
        };
      }

      const videoBlob = await videoResponse.blob();

      // Create the upload URL with metadata
      const uploadUrl = new URL(YOUTUBE_UPLOAD_URL);
      uploadUrl.searchParams.set('uploadType', 'multipart');
      uploadUrl.searchParams.set('part', 'snippet,status');

      // Build multipart request
      const boundary = '----YouTubeUploadBoundary' + Date.now();
      const metadataString = JSON.stringify(videoMetadata);

      // Create form data
      const formData = new FormData();

      // Add metadata as first part
      formData.append(
        'metadata',
        new Blob([metadataString], { type: 'application/json' }),
        'metadata.json'
      );

      // Add video as second part
      formData.append('video', videoBlob, 'video.mp4');

      const response = await fetch(uploadUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[YouTube Upload Error]', errorData);
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
        };
      }

      const data: YouTubeVideoResource = await response.json();

      return {
        success: true,
        videoId: data.id,
        videoUrl: `https://www.youtube.com/watch?v=${data.id}`,
        status: data.status?.uploadStatus as 'uploading' | 'processing' | 'published' | 'failed',
      };
    } catch (error) {
      console.error('[YouTube Upload Error]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload video',
      };
    }
  }

  // ============================================
  // VIDEO LIST
  // ============================================

  /**
   * List videos from the authenticated user's channel
   */
  async listVideos(
    profileId: string,
    maxResults: number = 20,
    pageToken?: string
  ): Promise<{
    videos: YouTubeVideoResource[];
    nextPageToken?: string;
    totalResults: number;
  }> {
    const accessToken = await this.getValidAccessToken(profileId);
    const channelId = await this.getChannelId(profileId);

    // First, get the uploads playlist ID
    const channelUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
    channelUrl.searchParams.set('part', 'contentDetails');
    channelUrl.searchParams.set('id', channelId);

    const channelResponse = await fetch(channelUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel details');
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return { videos: [], totalResults: 0 };
    }

    // Get videos from uploads playlist
    const playlistUrl = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
    playlistUrl.searchParams.set('part', 'snippet,contentDetails');
    playlistUrl.searchParams.set('playlistId', uploadsPlaylistId);
    playlistUrl.searchParams.set('maxResults', String(maxResults));
    if (pageToken) {
      playlistUrl.searchParams.set('pageToken', pageToken);
    }

    const playlistResponse = await fetch(playlistUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!playlistResponse.ok) {
      throw new Error('Failed to fetch videos');
    }

    const playlistData = await playlistResponse.json();
    const videoIds = playlistData.items?.map(
      (item: Record<string, unknown>) =>
        (item.contentDetails as Record<string, unknown>)?.videoId
    ).filter(Boolean);

    if (!videoIds || videoIds.length === 0) {
      return {
        videos: [],
        nextPageToken: playlistData.nextPageToken,
        totalResults: playlistData.pageInfo?.totalResults || 0,
      };
    }

    // Get detailed video info
    const videosUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
    videosUrl.searchParams.set('part', 'snippet,statistics,status');
    videosUrl.searchParams.set('id', videoIds.join(','));

    const videosResponse = await fetch(videosUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!videosResponse.ok) {
      throw new Error('Failed to fetch video details');
    }

    const videosData = await videosResponse.json();

    return {
      videos: videosData.items || [],
      nextPageToken: playlistData.nextPageToken,
      totalResults: playlistData.pageInfo?.totalResults || 0,
    };
  }

  // ============================================
  // METRICS (YouTube Analytics API)
  // ============================================

  /**
   * Get channel-level metrics
   */
  async getChannelMetrics(
    profileId: string,
    startDate?: string,
    endDate?: string
  ): Promise<YouTubeChannelMetrics> {
    const accessToken = await this.getValidAccessToken(profileId);
    const channelId = await this.getChannelId(profileId);
    const status = await this.getConnectionStatus(profileId);

    // Default to last 30 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const analyticsUrl = new URL(`${YOUTUBE_ANALYTICS_API}/reports`);
    analyticsUrl.searchParams.set('ids', `channel==${channelId}`);
    analyticsUrl.searchParams.set('startDate', start);
    analyticsUrl.searchParams.set('endDate', end);
    analyticsUrl.searchParams.set(
      'metrics',
      'views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,comments,shares,subscribersGained,subscribersLost'
    );

    const response = await fetch(analyticsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[YouTube Analytics Error]', errorData);
      throw new Error('Failed to fetch analytics');
    }

    const data = await response.json();
    const row = data.rows?.[0] || [];

    const metrics: YouTubeMetrics = {
      views: row[0] || 0,
      estimatedMinutesWatched: row[1] || 0,
      averageViewDuration: row[2] || 0,
      likes: row[3] || 0,
      dislikes: row[4] || 0,
      comments: row[5] || 0,
      shares: row[6] || 0,
      subscribersGained: row[7] || 0,
      subscribersLost: row[8] || 0,
    };

    return {
      channelId,
      channelTitle: status.channelTitle || 'Unknown',
      subscriberCount: status.subscriberCount || 0,
      videoCount: status.videoCount || 0,
      viewCount: metrics.views,
      metrics,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * Get video-level metrics
   */
  async getVideoMetrics(
    profileId: string,
    videoId: string,
    startDate?: string,
    endDate?: string
  ): Promise<YouTubeVideoMetrics> {
    const accessToken = await this.getValidAccessToken(profileId);
    const channelId = await this.getChannelId(profileId);

    // Check cache first
    const cached = await this.getCachedMetrics(profileId, videoId);
    if (cached) {
      return cached;
    }

    // Default to last 30 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get video details
    const videoUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
    videoUrl.searchParams.set('part', 'snippet,statistics');
    videoUrl.searchParams.set('id', videoId);

    const videoResponse = await fetch(videoUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video details');
    }

    const videoData = await videoResponse.json();
    const video = videoData.items?.[0];

    if (!video) {
      throw new Error('Video not found');
    }

    // Get analytics
    const analyticsUrl = new URL(`${YOUTUBE_ANALYTICS_API}/reports`);
    analyticsUrl.searchParams.set('ids', `channel==${channelId}`);
    analyticsUrl.searchParams.set('startDate', start);
    analyticsUrl.searchParams.set('endDate', end);
    analyticsUrl.searchParams.set('filters', `video==${videoId}`);
    analyticsUrl.searchParams.set(
      'metrics',
      'views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,comments,shares,subscribersGained,subscribersLost'
    );

    const analyticsResponse = await fetch(analyticsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let metrics: YouTubeMetrics;

    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      const row = analyticsData.rows?.[0] || [];

      metrics = {
        views: row[0] || parseInt(video.statistics?.viewCount || '0', 10),
        estimatedMinutesWatched: row[1] || 0,
        averageViewDuration: row[2] || 0,
        likes: row[3] || parseInt(video.statistics?.likeCount || '0', 10),
        dislikes: row[4] || 0,
        comments: row[5] || parseInt(video.statistics?.commentCount || '0', 10),
        shares: row[6] || 0,
        subscribersGained: row[7] || 0,
        subscribersLost: row[8] || 0,
      };
    } else {
      // Fallback to basic statistics
      metrics = {
        views: parseInt(video.statistics?.viewCount || '0', 10),
        likes: parseInt(video.statistics?.likeCount || '0', 10),
        dislikes: 0,
        comments: parseInt(video.statistics?.commentCount || '0', 10),
        shares: 0,
        estimatedMinutesWatched: 0,
        averageViewDuration: 0,
        subscribersGained: 0,
        subscribersLost: 0,
      };
    }

    const result: YouTubeVideoMetrics = {
      videoId,
      title: video.snippet?.title || 'Unknown',
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url,
      publishedAt: video.snippet?.publishedAt || '',
      metrics,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    // Cache the result
    await this.cacheMetrics(profileId, videoId, result);

    return result;
  }

  /**
   * Get cached metrics if available and not expired
   */
  private async getCachedMetrics(
    profileId: string,
    videoId: string
  ): Promise<YouTubeVideoMetrics | null> {
    try {
      // Check if YouTubeMetricsCache table exists
      const hasTable = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'youtube_metrics_cache'
        ) as exists
      `;

      if (!Array.isArray(hasTable) || !hasTable[0]?.exists) {
        return null;
      }

      const cacheExpiry = new Date(Date.now() - METRICS_CACHE_DURATION);

      const cached = await prisma.$queryRaw<Array<{
        metrics: unknown;
        fetched_at: Date;
      }>>`
        SELECT metrics, fetched_at
        FROM youtube_metrics_cache
        WHERE user_id = ${profileId}::uuid
          AND video_id = ${videoId}
          AND fetched_at > ${cacheExpiry}
        ORDER BY fetched_at DESC
        LIMIT 1
      `;

      if (cached.length > 0) {
        const data = cached[0];
        return {
          ...(data.metrics as Omit<YouTubeVideoMetrics, 'cached' | 'fetchedAt'>),
          fetchedAt: data.fetched_at.toISOString(),
          cached: true,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Cache metrics for future requests
   */
  private async cacheMetrics(
    profileId: string,
    videoId: string,
    metrics: YouTubeVideoMetrics
  ): Promise<void> {
    try {
      // Check if table exists
      const hasTable = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'youtube_metrics_cache'
        ) as exists
      `;

      if (!Array.isArray(hasTable) || !hasTable[0]?.exists) {
        return;
      }

      const status = await this.getConnectionStatus(profileId);

      await prisma.$executeRaw`
        INSERT INTO youtube_metrics_cache (
          id, user_id, channel_id, video_id, fetched_at, metrics
        ) VALUES (
          gen_random_uuid(),
          ${profileId}::uuid,
          ${status.channelId || ''},
          ${videoId},
          NOW(),
          ${JSON.stringify(metrics)}::jsonb
        )
        ON CONFLICT (user_id, channel_id, video_id, (fetched_at::date))
        DO UPDATE SET
          metrics = ${JSON.stringify(metrics)}::jsonb,
          fetched_at = NOW()
      `;
    } catch (error) {
      console.warn('[YouTube] Failed to cache metrics:', error);
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const youtubeService = new YouTubeService();

export default youtubeService;
