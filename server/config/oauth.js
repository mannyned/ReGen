/**
 * OAuth Configuration for Social Media Platforms
 *
 * To use these OAuth integrations, you need to:
 * 1. Register an app on each platform's developer portal
 * 2. Get your Client ID and Client Secret
 * 3. Add them to your .env file
 * 4. Set the redirect URI in your app settings on each platform
 */

const REDIRECT_BASE_URL = process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000';

const oauthConfig = {
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    // Instagram Basic Display API is DEPRECATED - use Graph API instead
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    redirectUri: `${REDIRECT_BASE_URL}/api/oauth/callback/instagram`,
    scope: 'instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list',
    // Requires Facebook Page connected to Instagram Business/Creator account
  },

  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    redirectUri: `${REDIRECT_BASE_URL}/api/oauth/callback/twitter`,
    scope: 'tweet.read tweet.write users.read offline.access',
    // Twitter OAuth 2.0 with PKCE
    usePKCE: true,
  },

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    redirectUri: `${REDIRECT_BASE_URL}/api/oauth/callback/linkedin`,
    scope: 'w_member_social r_liteprofile',
  },

  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    redirectUri: `${REDIRECT_BASE_URL}/api/oauth/callback/facebook`,
    scope: 'pages_manage_posts,pages_read_engagement,public_profile',
  },

  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_ID,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    authUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    redirectUri: `${REDIRECT_BASE_URL}/api/oauth/callback/tiktok`,
    scope: 'user.info.basic,video.publish',
  },

  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    redirectUri: `${REDIRECT_BASE_URL}/api/oauth/callback/youtube`,
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
  },
};

/**
 * Generate OAuth authorization URL
 */
function generateAuthUrl(platform, state) {
  const config = oauthConfig[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state, // CSRF protection
  });

  // Platform-specific parameters
  if (platform === 'twitter') {
    params.append('code_challenge', 'challenge'); // TODO: Implement proper PKCE
    params.append('code_challenge_method', 'plain');
  }

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Validate OAuth configuration for a platform
 */
function validateConfig(platform) {
  const config = oauthConfig[platform];
  if (!config) {
    return { valid: false, error: `Platform ${platform} not configured` };
  }

  if (!config.clientId || !config.clientSecret) {
    return {
      valid: false,
      error: `Missing OAuth credentials for ${platform}. Please add ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET to your .env file`,
    };
  }

  return { valid: true };
}

module.exports = {
  oauthConfig,
  generateAuthUrl,
  validateConfig,
  REDIRECT_BASE_URL,
};
