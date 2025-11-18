const express = require('express');
const router = express.Router();
const {
  getAnalyticsDashboard,
  getPlatformStats,
  getTrendingHashtagsController,
} = require('../controllers/analyticsController');

/**
 * GET /api/analytics
 * Get comprehensive analytics dashboard
 */
router.get('/', getAnalyticsDashboard);

/**
 * GET /api/analytics/platform/:platform
 * Get platform-specific analytics
 */
router.get('/platform/:platform', getPlatformStats);

/**
 * GET /api/analytics/hashtags
 * Get trending hashtags
 */
router.get('/hashtags', getTrendingHashtagsController);

module.exports = router;
