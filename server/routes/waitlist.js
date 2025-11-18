const express = require('express');
const router = express.Router();
const {
  joinWaitlist,
  getWaitlistController,
  checkWaitlistStatus,
  updateWaitlistEntryController,
  getWaitlistStatsController,
  removeFromWaitlistController,
} = require('../controllers/waitlistController');

/**
 * POST /api/waitlist
 * Join the waitlist
 */
router.post('/', joinWaitlist);

/**
 * GET /api/waitlist
 * Get all waitlist entries (admin)
 */
router.get('/', getWaitlistController);

/**
 * GET /api/waitlist/stats
 * Get waitlist statistics
 */
router.get('/stats', getWaitlistStatsController);

/**
 * GET /api/waitlist/check/:email
 * Check waitlist status by email
 */
router.get('/check/:email', checkWaitlistStatus);

/**
 * PATCH /api/waitlist/:email
 * Update waitlist entry status (admin)
 */
router.patch('/:email', updateWaitlistEntryController);

/**
 * DELETE /api/waitlist/:email
 * Remove from waitlist (admin)
 */
router.delete('/:email', removeFromWaitlistController);

module.exports = router;
