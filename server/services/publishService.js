const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

// In-memory storage for scheduled posts (would use DB in production)
const scheduledPosts = new Map();
const scheduledTasks = new Map();

/**
 * Schedule a post for future publishing
 */
exports.schedulePost = (postData) => {
  const scheduleId = uuidv4();

  const scheduledPost = {
    id: scheduleId,
    jobId: postData.jobId,
    outputId: postData.outputId,
    platform: postData.platform,
    scheduledTime: postData.scheduledTime,
    caption: postData.caption,
    hashtags: postData.hashtags,
    assetUrl: postData.assetUrl,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };

  scheduledPosts.set(scheduleId, scheduledPost);

  // Create cron job for scheduled time
  const scheduledDate = new Date(postData.scheduledTime);
  if (scheduledDate > new Date()) {
    const cronExpression = `${scheduledDate.getMinutes()} ${scheduledDate.getHours()} ${scheduledDate.getDate()} ${scheduledDate.getMonth() + 1} *`;

    const task = cron.schedule(cronExpression, () => {
      console.log(`⏰ Publishing scheduled post ${scheduleId} to ${postData.platform}`);
      publishScheduledPost(scheduleId);
    });

    scheduledTasks.set(scheduleId, task);
  }

  console.log(`📅 Post scheduled for ${scheduledDate.toISOString()}`);
  return scheduledPost;
};

/**
 * Get scheduled post by ID
 */
exports.getScheduledPost = (scheduleId) => {
  return scheduledPosts.get(scheduleId);
};

/**
 * Get all scheduled posts
 */
exports.getAllScheduledPosts = () => {
  return Array.from(scheduledPosts.values());
};

/**
 * Cancel a scheduled post
 */
exports.cancelScheduledPost = (scheduleId) => {
  const post = scheduledPosts.get(scheduleId);

  if (!post) {
    return null;
  }

  // Cancel cron task if exists
  const task = scheduledTasks.get(scheduleId);
  if (task) {
    task.stop();
    scheduledTasks.delete(scheduleId);
  }

  // Update status
  post.status = 'cancelled';
  post.cancelledAt = new Date().toISOString();
  scheduledPosts.set(scheduleId, post);

  console.log(`❌ Scheduled post ${scheduleId} cancelled`);
  return post;
};

/**
 * Publish a scheduled post (called by cron job)
 */
function publishScheduledPost(scheduleId) {
  const post = scheduledPosts.get(scheduleId);

  if (!post || post.status !== 'scheduled') {
    return;
  }

  // Simulate publishing (in production, would call platform APIs)
  console.log(`📤 Publishing to ${post.platform}...`);
  console.log(`   Caption: ${post.caption?.substring(0, 50)}...`);
  console.log(`   Hashtags: ${post.hashtags?.join(' ')}`);

  // Update status
  post.status = 'published';
  post.publishedAt = new Date().toISOString();
  scheduledPosts.set(scheduleId, post);

  // Clean up task
  scheduledTasks.delete(scheduleId);

  console.log(`✅ Post ${scheduleId} published successfully`);
}

/**
 * Publish immediately (for testing/manual publish)
 */
exports.publishImmediately = (postData) => {
  const publishId = uuidv4();

  console.log(`📤 Publishing immediately to ${postData.platform}...`);

  // Simulate API call to platform
  const publishedPost = {
    id: publishId,
    jobId: postData.jobId,
    outputId: postData.outputId,
    platform: postData.platform,
    caption: postData.caption,
    hashtags: postData.hashtags,
    assetUrl: postData.assetUrl,
    status: 'published',
    publishedAt: new Date().toISOString(),
    platformResponse: {
      success: true,
      message: `Successfully published to ${postData.platform} (simulated)`,
      postUrl: `https://${postData.platform}.com/post/${publishId}`,
    },
  };

  console.log(`✅ Post published successfully to ${postData.platform}`);
  return publishedPost;
};

/**
 * Export content for manual posting
 */
exports.exportContent = (outputData) => {
  const exportId = uuidv4();

  const exportPackage = {
    id: exportId,
    jobId: outputData.jobId,
    outputId: outputData.outputId,
    platform: outputData.platform,
    content: {
      assetUrl: outputData.assetUrl,
      caption: outputData.caption,
      hashtags: outputData.hashtags,
      type: outputData.type,
    },
    exportedAt: new Date().toISOString(),
    downloadUrl: outputData.assetUrl,
  };

  console.log(`📦 Content exported for ${outputData.platform}`);
  return exportPackage;
};
