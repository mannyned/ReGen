const { v4: uuidv4 } = require('uuid');
const { uploadToS3 } = require('../services/storageService');
const { addJobToQueue, getJobById, getAllJobs } = require('../services/repurposeWorker');

/**
 * POST /api/repurpose
 * Create a new repurpose job
 */
exports.createRepurposeJob = async (req, res) => {
  try {
    const { type, platforms, textContent, brandVoice } = req.body;

    // Validate input
    if (!type || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: type, platforms (array)',
      });
    }

    // Validate type
    const validTypes = ['video', 'image', 'text'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Validate platforms
    const validPlatforms = ['instagram', 'tiktok', 'youtube', 'x'];
    const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({
        error: `Invalid platforms: ${invalidPlatforms.join(', ')}. Valid: ${validPlatforms.join(', ')}`,
      });
    }

    // Text content validation
    if (type === 'text' && !textContent) {
      return res.status(400).json({
        error: 'textContent is required for type "text"',
      });
    }

    // File validation for video/image
    if ((type === 'video' || type === 'image') && !req.file) {
      return res.status(400).json({
        error: `File upload required for type "${type}"`,
      });
    }

    // Create job
    const jobId = uuidv4();
    let originalUrl = null;

    // Upload file if present
    if (req.file) {
      console.log(`📤 Uploading file for job ${jobId}...`);
      const uploadResult = await uploadToS3(req.file, jobId);
      originalUrl = uploadResult.url;
      console.log(`✅ File uploaded: ${originalUrl}`);
    }

    // Create job object
    const job = {
      id: jobId,
      type,
      platforms,
      originalUrl,
      textContent: textContent || null,
      brandVoice: brandVoice || 'professional and engaging',
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to queue
    addJobToQueue(job);

    // Return job info
    res.status(201).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Job created and queued for processing',
      job: {
        id: job.id,
        type: job.type,
        platforms: job.platforms,
        status: job.status,
        createdAt: job.createdAt,
      },
    });

  } catch (error) {
    console.error('Repurpose job creation error:', error);
    res.status(500).json({
      error: 'Failed to create repurpose job',
      message: error.message,
    });
  }
};

/**
 * GET /api/repurpose/:jobId
 * Get job status and results
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    res.json({
      success: true,
      job,
    });

  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message,
    });
  }
};

/**
 * GET /api/repurpose
 * Get all jobs
 */
exports.getAllJobsController = async (req, res) => {
  try {
    const jobs = getAllJobs();

    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        platforms: job.platforms,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        outputCount: job.outputs ? job.outputs.length : 0,
      })),
    });

  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      error: 'Failed to get jobs',
      message: error.message,
    });
  }
};

/**
 * GET /api/repurpose/:jobId/outputs
 * Get job outputs with full details
 */
exports.getJobOutputs = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Job not completed yet',
        status: job.status,
        jobId,
      });
    }

    res.json({
      success: true,
      jobId: job.id,
      outputs: job.outputs || [],
    });

  } catch (error) {
    console.error('Get job outputs error:', error);
    res.status(500).json({
      error: 'Failed to get job outputs',
      message: error.message,
    });
  }
};
