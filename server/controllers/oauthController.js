const axios = require('axios');
const crypto = require('crypto');
const { generateAuthUrl, oauthConfig, validateConfig } = require('../config/oauth');
const { storeTokens, getTokens, getConnectedPlatforms, deleteTokens } = require('../services/tokenStorageService');

// Store for OAuth state tokens (CSRF protection)
// In production, use Redis or a database
const oauthStates = new Map();

/**
 * GET /api/oauth/connect/:platform
 * Initiate OAuth flow
 */
exports.initiateOAuthController = async (req, res) => {
  try {
    const { platform } = req.params;
    const userId = req.query.userId || 'default-user'; // In production, get from authenticated session

    // Validate platform configuration
    const configValidation = validateConfig(platform);
    if (!configValidation.valid) {
      return res.status(400).json({
        error: configValidation.error,
        setupRequired: true,
      });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with user info (expires in 10 minutes)
    oauthStates.set(state, {
      userId,
      platform,
      timestamp: Date.now(),
    });

    // Clean up old states
    setTimeout(() => {
      oauthStates.delete(state);
    }, 10 * 60 * 1000);

    // Generate OAuth authorization URL
    const authUrl = generateAuthUrl(platform, state);

    res.json({
      success: true,
      authUrl,
      platform,
    });

  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({
      error: 'Failed to initiate OAuth',
      message: error.message,
    });
  }
};

/**
 * GET /api/oauth/callback/:platform
 * Handle OAuth callback
 */
exports.handleOAuthCallbackController = async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      return res.redirect(`http://localhost:3001/settings?error=oauth_denied&platform=${platform}`);
    }

    // Validate state (CSRF protection)
    const stateData = oauthStates.get(state);
    if (!stateData) {
      return res.status(400).json({
        error: 'Invalid or expired OAuth state',
      });
    }

    // Delete used state
    oauthStates.delete(state);

    // Check if state is expired (10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return res.status(400).json({
        error: 'OAuth state expired',
      });
    }

    const { userId } = stateData;
    const config = oauthConfig[platform];

    // Exchange code for access token
    let tokenData;

    if (platform === 'twitter') {
      // Twitter uses different token exchange format
      tokenData = await exchangeTwitterToken(code, config);
    } else {
      tokenData = await exchangeToken(code, config);
    }

    // Fetch user info from the platform
    const userInfo = await fetchUserInfo(platform, tokenData.accessToken);

    // Store tokens
    const storeResult = storeTokens(userId, platform, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      scope: tokenData.scope,
      username: userInfo.username,
      userId: userInfo.id,
    });

    if (!storeResult.success) {
      throw new Error('Failed to store tokens');
    }

    // Redirect back to frontend settings page with success
    res.redirect(`http://localhost:3001/settings?connected=${platform}&username=${userInfo.username}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`http://localhost:3001/settings?error=oauth_failed&platform=${req.params.platform}`);
  }
};

/**
 * Exchange authorization code for access token
 */
async function exchangeToken(code, config) {
  try {
    const response = await axios.post(
      config.tokenUrl,
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code for token');
  }
}

/**
 * Exchange Twitter authorization code (uses Basic Auth)
 */
async function exchangeTwitterToken(code, config) {
  try {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await axios.post(
      config.tokenUrl,
      new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
        code_verifier: 'challenge', // TODO: Use proper PKCE verifier
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Twitter token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange Twitter authorization code');
  }
}

/**
 * Fetch user info from platform
 */
async function fetchUserInfo(platform, accessToken) {
  const endpoints = {
    instagram: 'https://graph.instagram.com/me?fields=id,username',
    twitter: 'https://api.twitter.com/2/users/me',
    linkedin: 'https://api.linkedin.com/v2/me',
    facebook: 'https://graph.facebook.com/me?fields=id,name',
    tiktok: 'https://open.tiktokapis.com/v2/user/info/',
    youtube: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
  };

  try {
    const response = await axios.get(endpoints[platform], {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Parse response based on platform
    switch (platform) {
      case 'twitter':
        return { id: response.data.data.id, username: response.data.data.username };
      case 'linkedin':
        return { id: response.data.id, username: response.data.localizedFirstName };
      case 'youtube':
        return { id: response.data.items[0].id, username: response.data.items[0].snippet.title };
      default:
        return { id: response.data.id, username: response.data.username || response.data.name };
    }
  } catch (error) {
    console.error(`Error fetching ${platform} user info:`, error.response?.data || error.message);
    return { id: 'unknown', username: 'Unknown User' };
  }
}

/**
 * GET /api/oauth/status
 * Get connected platforms status
 */
exports.getConnectionStatusController = async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';

    const connectedPlatforms = getConnectedPlatforms(userId);

    res.json({
      success: true,
      connectedPlatforms,
    });

  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({
      error: 'Failed to get connection status',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/oauth/disconnect/:platform
 * Disconnect a platform
 */
exports.disconnectPlatformController = async (req, res) => {
  try {
    const { platform } = req.params;
    const userId = req.query.userId || 'default-user';

    const result = deleteTokens(userId, platform);

    if (!result.success) {
      return res.status(404).json({
        error: 'Platform not connected',
      });
    }

    res.json({
      success: true,
      message: `${platform} disconnected successfully`,
    });

  } catch (error) {
    console.error('Disconnect platform error:', error);
    res.status(500).json({
      error: 'Failed to disconnect platform',
      message: error.message,
    });
  }
};

module.exports = exports;
