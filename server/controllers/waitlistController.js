const {
  addToWaitlist,
  getWaitlist,
  getWaitlistEntry,
  updateWaitlistStatus,
  getWaitlistStats,
  removeFromWaitlist,
} = require('../services/waitlistService');

/**
 * POST /api/waitlist
 * Add email to waitlist
 */
exports.joinWaitlist = async (req, res) => {
  try {
    const { email, name, referralSource } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    const result = addToWaitlist(email, name, referralSource);

    if (result.alreadyExists) {
      return res.status(409).json({
        success: false,
        message: 'Email already on waitlist',
        entry: {
          position: result.entry.position,
          joinedAt: result.entry.joinedAt,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Successfully joined waitlist',
      entry: {
        position: result.entry.position,
        joinedAt: result.entry.joinedAt,
      },
    });

  } catch (error) {
    console.error('Join waitlist error:', error);
    res.status(500).json({
      error: 'Failed to join waitlist',
      message: error.message,
    });
  }
};

/**
 * GET /api/waitlist
 * Get all waitlist entries (admin only)
 */
exports.getWaitlistController = async (req, res) => {
  try {
    const waitlist = getWaitlist();

    res.json({
      success: true,
      count: waitlist.length,
      waitlist,
    });

  } catch (error) {
    console.error('Get waitlist error:', error);
    res.status(500).json({
      error: 'Failed to get waitlist',
      message: error.message,
    });
  }
};

/**
 * GET /api/waitlist/check/:email
 * Check waitlist status by email
 */
exports.checkWaitlistStatus = async (req, res) => {
  try {
    const { email } = req.params;

    const entry = getWaitlistEntry(email);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Email not found on waitlist',
      });
    }

    res.json({
      success: true,
      entry: {
        position: entry.position,
        status: entry.status,
        joinedAt: entry.joinedAt,
      },
    });

  } catch (error) {
    console.error('Check waitlist status error:', error);
    res.status(500).json({
      error: 'Failed to check waitlist status',
      message: error.message,
    });
  }
};

/**
 * PATCH /api/waitlist/:email
 * Update waitlist entry status (admin only)
 */
exports.updateWaitlistEntryController = async (req, res) => {
  try {
    const { email } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required',
      });
    }

    const validStatuses = ['pending', 'approved', 'invited', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updatedEntry = updateWaitlistStatus(email, status);

    if (!updatedEntry) {
      return res.status(404).json({
        error: 'Email not found on waitlist',
      });
    }

    res.json({
      success: true,
      message: 'Waitlist entry updated',
      entry: updatedEntry,
    });

  } catch (error) {
    console.error('Update waitlist entry error:', error);
    res.status(500).json({
      error: 'Failed to update waitlist entry',
      message: error.message,
    });
  }
};

/**
 * GET /api/waitlist/stats
 * Get waitlist statistics
 */
exports.getWaitlistStatsController = async (req, res) => {
  try {
    const stats = getWaitlistStats();

    res.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Get waitlist stats error:', error);
    res.status(500).json({
      error: 'Failed to get waitlist stats',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/waitlist/:email
 * Remove from waitlist (admin only)
 */
exports.removeFromWaitlistController = async (req, res) => {
  try {
    const { email } = req.params;

    const result = removeFromWaitlist(email);

    if (!result) {
      return res.status(404).json({
        error: 'Email not found on waitlist',
      });
    }

    res.json({
      success: true,
      message: 'Email removed from waitlist',
    });

  } catch (error) {
    console.error('Remove from waitlist error:', error);
    res.status(500).json({
      error: 'Failed to remove from waitlist',
      message: error.message,
    });
  }
};
