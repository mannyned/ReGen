const { getAllJobs } = require('./repurposeWorker');

/**
 * Get comprehensive analytics for all jobs
 */
exports.getAnalytics = () => {
  const jobs = getAllJobs();

  // Overall stats
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;
  const processingJobs = jobs.filter(j => j.status === 'processing' || j.status === 'generating_content').length;
  const queuedJobs = jobs.filter(j => j.status === 'queued').length;

  // Content type breakdown
  const contentTypeBreakdown = {
    video: jobs.filter(j => j.type === 'video').length,
    image: jobs.filter(j => j.type === 'image').length,
    text: jobs.filter(j => j.type === 'text').length,
  };

  // Platform breakdown
  const platformBreakdown = {};
  jobs.forEach(job => {
    job.platforms?.forEach(platform => {
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
    });
  });

  // Outputs generated
  const totalOutputs = jobs.reduce((sum, job) => {
    return sum + (job.outputs?.length || 0);
  }, 0);

  // Recent jobs (last 10)
  const recentJobs = jobs
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(job => ({
      id: job.id,
      type: job.type,
      platforms: job.platforms,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    }));

  // Calculate success rate
  const successRate = totalJobs > 0
    ? ((completedJobs / totalJobs) * 100).toFixed(1)
    : 0;

  return {
    overview: {
      totalJobs,
      completedJobs,
      failedJobs,
      processingJobs,
      queuedJobs,
      successRate: `${successRate}%`,
    },
    contentTypes: contentTypeBreakdown,
    platforms: platformBreakdown,
    outputs: {
      totalGenerated: totalOutputs,
      averagePerJob: totalJobs > 0 ? (totalOutputs / totalJobs).toFixed(1) : 0,
    },
    recentActivity: recentJobs,
  };
};

/**
 * Get platform-specific analytics
 */
exports.getPlatformAnalytics = (platform) => {
  const jobs = getAllJobs();

  const platformJobs = jobs.filter(job =>
    job.platforms?.includes(platform)
  );

  const completed = platformJobs.filter(j => j.status === 'completed');
  const failed = platformJobs.filter(j => j.status === 'failed');

  const totalOutputs = completed.reduce((sum, job) => {
    const platformOutputs = job.outputs?.filter(o => o.platform === platform) || [];
    return sum + platformOutputs.length;
  }, 0);

  return {
    platform,
    totalJobs: platformJobs.length,
    completedJobs: completed.length,
    failedJobs: failed.length,
    outputsGenerated: totalOutputs,
    successRate: platformJobs.length > 0
      ? `${((completed.length / platformJobs.length) * 100).toFixed(1)}%`
      : '0%',
  };
};

/**
 * Get trending hashtags from all completed jobs
 */
exports.getTrendingHashtags = () => {
  const jobs = getAllJobs();
  const hashtagCount = {};

  jobs
    .filter(j => j.status === 'completed')
    .forEach(job => {
      job.outputs?.forEach(output => {
        output.hashtags?.forEach(tag => {
          hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
        });
      });
    });

  const trending = Object.entries(hashtagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  return trending;
};
