const {
  getAnalytics,
  getPlatformAnalytics,
  getTrendingHashtags,
} = require('../services/analyticsService');

/**
 * GET /api/analytics
 * Get comprehensive analytics dashboard data
 */
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const analytics = getAnalytics();

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message,
    });
  }
};

/**
 * GET /api/analytics/platform/:platform
 * Get platform-specific analytics
 */
exports.getPlatformStats = async (req, res) => {
  try {
    const { platform } = req.params;

    const validPlatforms = ['instagram', 'tiktok', 'youtube', 'x'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Valid options: ${validPlatforms.join(', ')}`,
      });
    }

    const stats = getPlatformAnalytics(platform);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      error: 'Failed to get platform analytics',
      message: error.message,
    });
  }
};

/**
 * GET /api/analytics/hashtags
 * Get trending hashtags
 */
exports.getTrendingHashtagsController = async (req, res) => {
  try {
    const trending = getTrendingHashtags();

    res.json({
      success: true,
      count: trending.length,
      hashtags: trending,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({
      error: 'Failed to get trending hashtags',
      message: error.message,
    });
  }
};
