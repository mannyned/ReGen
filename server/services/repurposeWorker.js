const { generateCaptionsWithAI, generateHashtagsWithAI } = require('./aiService');

// In-memory job queue
const jobQueue = [];
const processedJobs = new Map();

// Worker status
let isWorkerRunning = false;
const WORKER_INTERVAL = 5000; // Process jobs every 5 seconds

/**
 * Add job to queue
 */
exports.addJobToQueue = (job) => {
  jobQueue.push(job);
  processedJobs.set(job.id, job);
  console.log(`📥 Job ${job.id} added to queue (${jobQueue.length} jobs pending)`);
};

/**
 * Get job by ID
 */
exports.getJobById = (jobId) => {
  return processedJobs.get(jobId);
};

/**
 * Get all jobs
 */
exports.getAllJobs = () => {
  return Array.from(processedJobs.values());
};

/**
 * Start the worker
 */
exports.startWorker = () => {
  if (isWorkerRunning) {
    console.log('⚠️  Worker already running');
    return;
  }

  isWorkerRunning = true;
  console.log('🚀 Repurpose worker started');

  setInterval(async () => {
    if (jobQueue.length > 0) {
      const job = jobQueue.shift();
      console.log(`⚙️  Processing job ${job.id}...`);
      await processJob(job);
    }
  }, WORKER_INTERVAL);
};

/**
 * Update job status
 */
function updateJobStatus(job, status, additionalData = {}) {
  job.status = status;
  job.updatedAt = new Date().toISOString();
  Object.assign(job, additionalData);
  processedJobs.set(job.id, job);
  console.log(`📊 Job ${job.id} status: ${status}`);
}

/**
 * Process a job
 */
async function processJob(job) {
  try {
    updateJobStatus(job, 'processing');

    console.log(`📝 Processing ${job.type} content for platforms: ${job.platforms.join(', ')}`);

    let outputs = [];

    // Process based on content type
    if (job.type === 'video') {
      outputs = await processVideo(job);
    } else if (job.type === 'image') {
      outputs = await processImage(job);
    } else if (job.type === 'text') {
      outputs = await processText(job);
    }

    // Generate captions and hashtags
    updateJobStatus(job, 'generating_content');
    outputs = await enrichOutputsWithAI(outputs, job);

    // Mark as completed
    updateJobStatus(job, 'completed', {
      outputs,
      completedAt: new Date().toISOString(),
    });

    console.log(`✅ Job ${job.id} completed with ${outputs.length} outputs`);

  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);
    updateJobStatus(job, 'failed', {
      error: error.message,
    });
  }
}

/**
 * Process video (simplified - no ffmpeg required for MVP)
 */
async function processVideo(job) {
  console.log('🎥 Processing video (simplified mode)...');

  const outputs = [];

  for (const platform of job.platforms) {
    outputs.push({
      platform,
      type: 'video',
      assetUrl: job.originalUrl,
      aspectRatio: platform === 'youtube' ? '16:9' : '9:16',
      metadata: {
        format: 'mp4',
        note: 'Original video - processing requires ffmpeg',
      },
    });
  }

  return outputs;
}

/**
 * Process image (simplified - no sharp required for MVP)
 */
async function processImage(job) {
  console.log('🖼️  Processing image (simplified mode)...');

  const outputs = [];

  for (const platform of job.platforms) {
    outputs.push({
      platform,
      type: 'image',
      assetUrl: job.originalUrl,
      aspectRatio: '1:1',
      metadata: {
        format: 'jpeg',
        note: 'Original image - resizing requires sharp library',
      },
    });
  }

  return outputs;
}

/**
 * Process text
 */
async function processText(job) {
  console.log('📝 Processing text...');

  const outputs = [];

  for (const platform of job.platforms) {
    outputs.push({
      platform,
      type: 'text',
      originalText: job.textContent,
      metadata: {
        characterCount: job.textContent.length,
        wordCount: job.textContent.split(/\s+/).length,
      },
    });
  }

  return outputs;
}

/**
 * Enrich outputs with AI-generated content
 */
async function enrichOutputsWithAI(outputs, job) {
  console.log('🤖 Generating AI captions and hashtags...');

  const enrichedOutputs = [];

  for (const output of outputs) {
    try {
      console.log(`  🎨 Generating content for ${output.platform}...`);

      const context = job.textContent || `${job.type} content for ${output.platform}`;
      const brandVoice = job.brandVoice || 'professional and engaging';

      // Generate captions
      const captions = await generateCaptionsWithAI(
        context,
        output.platform,
        brandVoice
      );

      // Generate hashtags
      const hashtags = await generateHashtagsWithAI(
        context,
        output.platform,
        6
      );

      enrichedOutputs.push({
        ...output,
        captionVariant1: captions[0] || 'Caption variant 1',
        captionVariant2: captions[1] || 'Caption variant 2',
        captionVariant3: captions[2] || 'Caption variant 3',
        hashtags: hashtags || [],
      });

      console.log(`  ✓ Content generated for ${output.platform}`);

    } catch (error) {
      console.error(`Failed to generate AI content for ${output.platform}:`, error);

      enrichedOutputs.push({
        ...output,
        captionVariant1: `Check out this ${job.type} content!`,
        captionVariant2: `New ${output.platform} post 🚀`,
        captionVariant3: `Don't miss this amazing content!`,
        hashtags: ['#content', '#socialmedia', '#viral'],
      });
    }
  }

  return enrichedOutputs;
}
