import type { SocialPlatform, OAuthConfig } from '../types/social'

// ============================================
// OAUTH CONFIGURATIONS FOR ALL PLATFORMS
// ============================================

export const OAUTH_CONFIGS: Record<SocialPlatform, OAuthConfig> = {
  // ============================================
  // INSTAGRAM (via Facebook Graph API)
  // ============================================
  instagram: {
    clientId: process.env.META_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || '',
    clientSecret: process.env.META_CLIENT_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    refreshUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    revokeUrl: 'https://graph.facebook.com/v21.0/me/permissions',
    scopes: [
      // Core approved scopes
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_read_engagement',
      'pages_show_list',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
  },

  // ============================================
  // TIKTOK
  // ============================================
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    refreshUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    revokeUrl: 'https://open.tiktokapis.com/v2/oauth/revoke/',
    scopes: [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.publish',
      'video.upload',
      'video.list',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
    pkceRequired: true,
  },

  // ============================================
  // YOUTUBE (Google OAuth)
  // ============================================
  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    refreshUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'openid',
      'profile',
      'email',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
    additionalParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },

  // ============================================
  // TWITTER / X (OAuth 2.0)
  // ============================================
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    authUrl: 'https://x.com/i/oauth2/authorize',  // Updated to x.com per X API docs
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    refreshUrl: 'https://api.twitter.com/2/oauth2/token',
    revokeUrl: 'https://api.twitter.com/2/oauth2/revoke',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',
      'media.write',  // REQUIRED for v2 media upload endpoint
    ],
    responseType: 'code',
    grantType: 'authorization_code',
    pkceRequired: true,
  },

  // ============================================
  // LINKEDIN (Personal Profile)
  // ============================================
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    refreshUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    revokeUrl: 'https://www.linkedin.com/oauth/v2/revoke',
    scopes: [
      'openid',
      'profile',
      'email',
      'w_member_social',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
  },

  // ============================================
  // LINKEDIN ORGANIZATION (Company Page - Community Management API)
  // ============================================
  'linkedin-org': {
    clientId: process.env.LINKEDIN_CM_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CM_CLIENT_SECRET || '',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    refreshUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    revokeUrl: 'https://www.linkedin.com/oauth/v2/revoke',
    scopes: [
      'openid',
      'profile',
      'email',
      'w_organization_social',
      'r_organization_social',
      'rw_organization_admin',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
  },

  // ============================================
  // FACEBOOK
  // ============================================
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || process.env.META_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || process.env.META_CLIENT_SECRET || '',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    refreshUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    revokeUrl: 'https://graph.facebook.com/v21.0/me/permissions',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'pages_manage_metadata',
      'pages_read_user_content',
      'publish_video',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
  },

  // ============================================
  // PINTEREST
  // ============================================
  pinterest: {
    clientId: process.env.PINTEREST_CLIENT_ID || '',
    clientSecret: process.env.PINTEREST_CLIENT_SECRET || '',
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    refreshUrl: 'https://api.pinterest.com/v5/oauth/token',
    revokeUrl: 'https://api.pinterest.com/v5/oauth/token/revoke',
    scopes: [
      'boards:read',
      'pins:read',
      'pins:write',
      'user_accounts:read',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
  },

  // ============================================
  // DISCORD
  // ============================================
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    refreshUrl: 'https://discord.com/api/oauth2/token',
    revokeUrl: 'https://discord.com/api/oauth2/token/revoke',
    scopes: [
      'identify',
      'guilds',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
  },

  // ============================================
  // META (Combined Instagram + Facebook)
  // ============================================
  meta: {
    clientId: process.env.META_CLIENT_ID || '',
    clientSecret: process.env.META_CLIENT_SECRET || '',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    refreshUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    revokeUrl: 'https://graph.facebook.com/v21.0/me/permissions',
    scopes: [
      // Core approved scopes for Instagram/Facebook publishing
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
  },

  // ============================================
  // REDDIT
  // ============================================
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    authUrl: 'https://www.reddit.com/api/v1/authorize',
    tokenUrl: 'https://www.reddit.com/api/v1/access_token',
    refreshUrl: 'https://www.reddit.com/api/v1/access_token',
    revokeUrl: 'https://www.reddit.com/api/v1/revoke_token',
    scopes: [
      'identity',
      'submit',
      'read',
      'mysubreddits',
    ],
    responseType: 'code',
    grantType: 'authorization_code',
    additionalParams: {
      duration: 'permanent',
    },
  },
}

// ============================================
// API BASE URLS
// ============================================

export const API_BASE_URLS: Record<SocialPlatform, string> = {
  instagram: 'https://graph.facebook.com/v21.0',
  tiktok: 'https://open.tiktokapis.com/v2',
  youtube: 'https://www.googleapis.com/youtube/v3',
  twitter: 'https://api.twitter.com/2',
  linkedin: 'https://api.linkedin.com/v2',
  'linkedin-org': 'https://api.linkedin.com/v2',
  facebook: 'https://graph.facebook.com/v21.0',
  meta: 'https://graph.facebook.com/v21.0',
  pinterest: 'https://api.pinterest.com/v5',
  discord: 'https://discord.com/api/v10',
  reddit: 'https://oauth.reddit.com',
}

// ============================================
// RATE LIMITS (requests per window)
// ============================================

export const RATE_LIMITS: Record<SocialPlatform, { maxRequests: number; windowMs: number }> = {
  instagram: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200/hour
  tiktok: { maxRequests: 100, windowMs: 60 * 1000 }, // 100/minute
  youtube: { maxRequests: 10000, windowMs: 24 * 60 * 60 * 1000 }, // 10000/day
  twitter: { maxRequests: 300, windowMs: 15 * 60 * 1000 }, // 300/15min
  linkedin: { maxRequests: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100/day
  'linkedin-org': { maxRequests: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100/day (same as linkedin)
  facebook: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200/hour
  meta: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200/hour (same as FB)
  pinterest: { maxRequests: 1000, windowMs: 60 * 60 * 1000 }, // 1000/hour
  discord: { maxRequests: 50, windowMs: 1000 }, // 50/second
  reddit: { maxRequests: 60, windowMs: 60 * 1000 }, // 60/minute (OAuth)
}

// ============================================
// CONTENT LIMITS
// ============================================

export const CONTENT_LIMITS: Record<SocialPlatform, {
  maxCaptionLength: number
  maxHashtags: number
  maxVideoLengthSeconds: number
  maxFileSizeMb: number
  supportedFormats: string[]
}> = {
  instagram: {
    maxCaptionLength: 2200,
    maxHashtags: 30,
    maxVideoLengthSeconds: 90,
    maxFileSizeMb: 100,
    supportedFormats: ['mp4', 'mov', 'jpg', 'jpeg', 'png'],
  },
  tiktok: {
    maxCaptionLength: 2200,
    maxHashtags: 100,
    maxVideoLengthSeconds: 600,
    maxFileSizeMb: 287,
    supportedFormats: ['mp4', 'mov', 'webm'],
  },
  youtube: {
    maxCaptionLength: 5000, // Description
    maxHashtags: 60,
    maxVideoLengthSeconds: 43200, // 12 hours
    maxFileSizeMb: 256000, // 256GB
    supportedFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
  },
  twitter: {
    maxCaptionLength: 280,
    maxHashtags: 30,
    maxVideoLengthSeconds: 140,
    maxFileSizeMb: 512,
    supportedFormats: ['mp4', 'mov', 'jpg', 'jpeg', 'png', 'gif'],
  },
  linkedin: {
    maxCaptionLength: 3000,
    maxHashtags: 30,
    maxVideoLengthSeconds: 600,
    maxFileSizeMb: 200,
    supportedFormats: ['mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png'],
  },
  'linkedin-org': {
    maxCaptionLength: 3000,
    maxHashtags: 30,
    maxVideoLengthSeconds: 600,
    maxFileSizeMb: 200,
    supportedFormats: ['mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png'],
  },
  facebook: {
    maxCaptionLength: 63206,
    maxHashtags: 30,
    maxVideoLengthSeconds: 14400, // 4 hours
    maxFileSizeMb: 10000, // 10GB
    supportedFormats: ['mp4', 'mov', 'wmv', 'avi', 'jpg', 'jpeg', 'png'],
  },
  pinterest: {
    maxCaptionLength: 500,
    maxHashtags: 20,
    maxVideoLengthSeconds: 900, // 15 minutes
    maxFileSizeMb: 2000,
    supportedFormats: ['mp4', 'mov', 'jpg', 'jpeg', 'png', 'gif'],
  },
  discord: {
    maxCaptionLength: 2000,
    maxHashtags: 100, // Discord doesn't have a hashtag system, but they appear as text
    maxVideoLengthSeconds: 600,
    maxFileSizeMb: 100, // 100MB for nitro users, 25MB for free
    supportedFormats: ['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'gif'],
  },
  meta: {
    maxCaptionLength: 2200, // Same as Instagram
    maxHashtags: 30,
    maxVideoLengthSeconds: 90,
    maxFileSizeMb: 100,
    supportedFormats: ['mp4', 'mov', 'jpg', 'jpeg', 'png'],
  },
  reddit: {
    maxCaptionLength: 40000, // Reddit self-post text limit
    maxHashtags: 0, // Reddit doesn't use hashtags in the same way
    maxVideoLengthSeconds: 900, // 15 minutes for video posts
    maxFileSizeMb: 20, // Image upload limit
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif'],
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getOAuthConfig(platform: SocialPlatform): OAuthConfig {
  const config = OAUTH_CONFIGS[platform]
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`)
  }
  return config
}

export function isOAuthConfigured(platform: SocialPlatform): boolean {
  const config = OAUTH_CONFIGS[platform]
  return Boolean(config.clientId && config.clientSecret)
}

export function getRequiredEnvVars(platform: SocialPlatform): string[] {
  const platformUpper = platform.toUpperCase()
  return [
    `${platformUpper}_CLIENT_ID`,
    `${platformUpper}_CLIENT_SECRET`,
  ]
}

export function validatePlatform(platform: string): platform is SocialPlatform {
  return Object.keys(OAUTH_CONFIGS).includes(platform as SocialPlatform)
}
