const fs = require('fs');
const path = require('path');

const waitlistFile = path.join(__dirname, '../data/waitlist.json');

// Initialize waitlist file if it doesn't exist
if (!fs.existsSync(waitlistFile)) {
  fs.writeFileSync(waitlistFile, JSON.stringify([], null, 2));
}

/**
 * Load waitlist from file
 */
function loadWaitlist() {
  try {
    const data = fs.readFileSync(waitlistFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading waitlist:', error);
    return [];
  }
}

/**
 * Save waitlist to file
 */
function saveWaitlist(waitlist) {
  try {
    fs.writeFileSync(waitlistFile, JSON.stringify(waitlist, null, 2));
  } catch (error) {
    console.error('Error saving waitlist:', error);
    throw error;
  }
}

/**
 * Add email to waitlist
 */
exports.addToWaitlist = (email, name = null, referralSource = null) => {
  const waitlist = loadWaitlist();

  // Check if email already exists
  const existing = waitlist.find(entry => entry.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return {
      success: false,
      alreadyExists: true,
      entry: existing,
    };
  }

  // Create new entry
  const entry = {
    email: email.toLowerCase(),
    name,
    referralSource,
    position: waitlist.length + 1,
    joinedAt: new Date().toISOString(),
    status: 'pending',
  };

  waitlist.push(entry);
  saveWaitlist(waitlist);

  console.log(`📧 Added ${email} to waitlist (position ${entry.position})`);

  return {
    success: true,
    entry,
  };
};

/**
 * Get all waitlist entries
 */
exports.getWaitlist = () => {
  return loadWaitlist();
};

/**
 * Get waitlist entry by email
 */
exports.getWaitlistEntry = (email) => {
  const waitlist = loadWaitlist();
  return waitlist.find(entry => entry.email.toLowerCase() === email.toLowerCase());
};

/**
 * Update waitlist entry status
 */
exports.updateWaitlistStatus = (email, status) => {
  const waitlist = loadWaitlist();
  const index = waitlist.findIndex(entry => entry.email.toLowerCase() === email.toLowerCase());

  if (index === -1) {
    return null;
  }

  waitlist[index].status = status;
  waitlist[index].updatedAt = new Date().toISOString();

  saveWaitlist(waitlist);

  console.log(`📝 Updated ${email} status to ${status}`);
  return waitlist[index];
};

/**
 * Get waitlist stats
 */
exports.getWaitlistStats = () => {
  const waitlist = loadWaitlist();

  const stats = {
    total: waitlist.length,
    pending: waitlist.filter(e => e.status === 'pending').length,
    approved: waitlist.filter(e => e.status === 'approved').length,
    invited: waitlist.filter(e => e.status === 'invited').length,
    referralSources: {},
  };

  // Count referral sources
  waitlist.forEach(entry => {
    if (entry.referralSource) {
      stats.referralSources[entry.referralSource] =
        (stats.referralSources[entry.referralSource] || 0) + 1;
    }
  });

  return stats;
};

/**
 * Remove from waitlist
 */
exports.removeFromWaitlist = (email) => {
  const waitlist = loadWaitlist();
  const filtered = waitlist.filter(entry => entry.email.toLowerCase() !== email.toLowerCase());

  if (filtered.length === waitlist.length) {
    return null; // Email not found
  }

  // Reindex positions
  filtered.forEach((entry, index) => {
    entry.position = index + 1;
  });

  saveWaitlist(filtered);

  console.log(`🗑️  Removed ${email} from waitlist`);
  return true;
};
