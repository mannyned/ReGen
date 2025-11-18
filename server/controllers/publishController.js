const {
  schedulePost,
  getScheduledPost,
  getAllScheduledPosts,
  cancelScheduledPost,
  publishImmediately,
  exportContent,
} = require('../services/publishService');
const { getJobById } = require('../services/repurposeWorker');

/**
 * POST /api/publish/schedule
 * Schedule a post for future publishing
 */
exports.schedulePostController = async (req, res) => {
  try {
    const { jobId, outputId, platform, scheduledTime, caption, hashtags, assetUrl } = req.body;

    // Validate required fields
    if (!jobId || !platform || !scheduledTime) {
      return res.status(400).json({
        error: 'Missing required fields: jobId, platform, scheduledTime',
      });
    }

    // Validate job exists
    const job = getJobById(jobId);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    // Validate scheduled time is in future
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        error: 'Scheduled time must be in the future',
      });
    }

    const scheduledPost = schedulePost({
      jobId,
      outputId,
      platform,
      scheduledTime,
      caption,
      hashtags,
      assetUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Post scheduled successfully',
      scheduledPost,
    });

  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({
      error: 'Failed to schedule post',
      message: error.message,
    });
  }
};

/**
 * GET /api/publish/scheduled
 * Get all scheduled posts
 */
exports.getScheduledPostsController = async (req, res) => {
  try {
    const posts = getAllScheduledPosts();

    res.json({
      success: true,
      count: posts.length,
      scheduledPosts: posts,
    });

  } catch (error) {
    console.error('Get scheduled posts error:', error);
    res.status(500).json({
      error: 'Failed to get scheduled posts',
      message: error.message,
    });
  }
};

/**
 * GET /api/publish/scheduled/:scheduleId
 * Get specific scheduled post
 */
exports.getScheduledPostByIdController = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const post = getScheduledPost(scheduleId);

    if (!post) {
      return res.status(404).json({
        error: 'Scheduled post not found',
        scheduleId,
      });
    }

    res.json({
      success: true,
      scheduledPost: post,
    });

  } catch (error) {
    console.error('Get scheduled post error:', error);
    res.status(500).json({
      error: 'Failed to get scheduled post',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/publish/scheduled/:scheduleId
 * Cancel a scheduled post
 */
exports.cancelScheduledPostController = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const cancelledPost = cancelScheduledPost(scheduleId);

    if (!cancelledPost) {
      return res.status(404).json({
        error: 'Scheduled post not found',
        scheduleId,
      });
    }

    res.json({
      success: true,
      message: 'Scheduled post cancelled',
      scheduledPost: cancelledPost,
    });

  } catch (error) {
    console.error('Cancel scheduled post error:', error);
    res.status(500).json({
      error: 'Failed to cancel scheduled post',
      message: error.message,
    });
  }
};

/**
 * POST /api/publish/now
 * Publish immediately
 */
exports.publishNowController = async (req, res) => {
  try {
    const { jobId, outputId, platform, caption, hashtags, assetUrl } = req.body;

    // Validate required fields
    if (!jobId || !platform) {
      return res.status(400).json({
        error: 'Missing required fields: jobId, platform',
      });
    }

    // Validate job exists
    const job = getJobById(jobId);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    const publishedPost = publishImmediately({
      jobId,
      outputId,
      platform,
      caption,
      hashtags,
      assetUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Post published successfully',
      publishedPost,
    });

  } catch (error) {
    console.error('Publish now error:', error);
    res.status(500).json({
      error: 'Failed to publish post',
      message: error.message,
    });
  }
};

/**
 * POST /api/publish/export
 * Export content for manual posting
 */
exports.exportContentController = async (req, res) => {
  try {
    const { jobId, outputId, platform, caption, hashtags, assetUrl, type } = req.body;

    // Validate required fields
    if (!jobId || !platform) {
      return res.status(400).json({
        error: 'Missing required fields: jobId, platform',
      });
    }

    // Validate job exists
    const job = getJobById(jobId);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    const exportPackage = exportContent({
      jobId,
      outputId,
      platform,
      caption,
      hashtags,
      assetUrl,
      type,
    });

    res.json({
      success: true,
      message: 'Content exported successfully',
      export: exportPackage,
    });

  } catch (error) {
    console.error('Export content error:', error);
    res.status(500).json({
      error: 'Failed to export content',
      message: error.message,
    });
  }
};
