const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../services/storageService');
const {
  createRepurposeJob,
  getJobStatus,
  getAllJobsController,
  getJobOutputs,
} = require('../controllers/repurposeController');

/**
 * POST /api/repurpose
 * Create a new repurpose job
 * Requires multipart/form-data with optional file upload
 */
router.post('/', uploadMiddleware, createRepurposeJob);

/**
 * GET /api/repurpose
 * Get all jobs
 */
router.get('/', getAllJobsController);

/**
 * GET /api/repurpose/:jobId
 * Get specific job status and details
 */
router.get('/:jobId', getJobStatus);

/**
 * GET /api/repurpose/:jobId/outputs
 * Get job outputs (only for completed jobs)
 */
router.get('/:jobId/outputs', getJobOutputs);

module.exports = router;
