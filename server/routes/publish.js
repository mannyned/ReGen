const express = require('express');
const router = express.Router();
const {
  schedulePostController,
  getScheduledPostsController,
  getScheduledPostByIdController,
  cancelScheduledPostController,
  publishNowController,
  exportContentController,
} = require('../controllers/publishController');

/**
 * POST /api/publish/schedule
 * Schedule a post for future publishing
 */
router.post('/schedule', schedulePostController);

/**
 * GET /api/publish/scheduled
 * Get all scheduled posts
 */
router.get('/scheduled', getScheduledPostsController);

/**
 * GET /api/publish/scheduled/:scheduleId
 * Get specific scheduled post
 */
router.get('/scheduled/:scheduleId', getScheduledPostByIdController);

/**
 * DELETE /api/publish/scheduled/:scheduleId
 * Cancel a scheduled post
 */
router.delete('/scheduled/:scheduleId', cancelScheduledPostController);

/**
 * POST /api/publish/now
 * Publish immediately
 */
router.post('/now', publishNowController);

/**
 * POST /api/publish/export
 * Export content for manual posting
 */
router.post('/export', exportContentController);

module.exports = router;
