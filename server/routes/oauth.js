const express = require('express');
const router = express.Router();
const {
  initiateOAuthController,
  handleOAuthCallbackController,
  getConnectionStatusController,
  disconnectPlatformController,
} = require('../controllers/oauthController');

/**
 * GET /api/oauth/connect/:platform
 * Initiate OAuth flow for a platform
 * Params: platform (instagram, twitter, linkedin, facebook, tiktok, youtube)
 * Query: userId (optional, defaults to 'default-user')
 */
router.get('/connect/:platform', initiateOAuthController);

/**
 * GET /api/oauth/callback/:platform
 * Handle OAuth callback from platform
 * Query params: code, state
 */
router.get('/callback/:platform', handleOAuthCallbackController);

/**
 * GET /api/oauth/status
 * Get status of connected platforms
 * Query: userId (optional)
 */
router.get('/status', getConnectionStatusController);

/**
 * DELETE /api/oauth/disconnect/:platform
 * Disconnect a platform
 * Params: platform
 * Query: userId (optional)
 */
router.delete('/disconnect/:platform', disconnectPlatformController);

module.exports = router;
