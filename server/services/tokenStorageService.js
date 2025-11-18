/**
 * Token Storage Service
 * Handles secure storage and retrieval of OAuth tokens
 *
 * NOTE: In production, you should:
 * 1. Encrypt tokens before storing
 * 2. Use a proper database (PostgreSQL, MongoDB, etc.)
 * 3. Implement token rotation
 * 4. Set up token refresh logic
 * 5. Add expiration tracking
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_STORAGE_FILE = path.join(__dirname, '..', 'data', 'oauth_tokens.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize storage file if it doesn't exist
if (!fs.existsSync(TOKEN_STORAGE_FILE)) {
  fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify({ tokens: {} }));
}

/**
 * Simple encryption for tokens (use a proper encryption library in production)
 */
function encryptToken(token) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.TOKEN_ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Simple decryption for tokens
 */
function decryptToken(encryptedToken) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.TOKEN_ENCRYPTION_KEY || 'default-key', 'salt', 32);

    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Token decryption error:', error);
    return null;
  }
}

/**
 * Store OAuth tokens for a user and platform
 */
function storeTokens(userId, platform, tokenData) {
  try {
    const storage = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));

    if (!storage.tokens[userId]) {
      storage.tokens[userId] = {};
    }

    // Encrypt sensitive token data
    const encryptedData = {
      accessToken: encryptToken(tokenData.accessToken),
      refreshToken: tokenData.refreshToken ? encryptToken(tokenData.refreshToken) : null,
      expiresAt: tokenData.expiresAt || null,
      scope: tokenData.scope || null,
      username: tokenData.username || null,
      userId: tokenData.userId || null,
      connectedAt: new Date().toISOString(),
    };

    storage.tokens[userId][platform] = encryptedData;

    fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(storage, null, 2));

    return { success: true };
  } catch (error) {
    console.error('Token storage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve OAuth tokens for a user and platform
 */
function getTokens(userId, platform) {
  try {
    const storage = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));

    const encryptedData = storage.tokens[userId]?.[platform];
    if (!encryptedData) {
      return null;
    }

    // Decrypt tokens
    return {
      accessToken: decryptToken(encryptedData.accessToken),
      refreshToken: encryptedData.refreshToken ? decryptToken(encryptedData.refreshToken) : null,
      expiresAt: encryptedData.expiresAt,
      scope: encryptedData.scope,
      username: encryptedData.username,
      userId: encryptedData.userId,
      connectedAt: encryptedData.connectedAt,
    };
  } catch (error) {
    console.error('Token retrieval error:', error);
    return null;
  }
}

/**
 * Get all connected platforms for a user
 */
function getConnectedPlatforms(userId) {
  try {
    const storage = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));
    const userTokens = storage.tokens[userId];

    if (!userTokens) {
      return [];
    }

    return Object.keys(userTokens).map(platform => ({
      platform,
      username: userTokens[platform].username,
      connectedAt: userTokens[platform].connectedAt,
    }));
  } catch (error) {
    console.error('Error getting connected platforms:', error);
    return [];
  }
}

/**
 * Delete tokens for a platform
 */
function deleteTokens(userId, platform) {
  try {
    const storage = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));

    if (storage.tokens[userId]?.[platform]) {
      delete storage.tokens[userId][platform];
      fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(storage, null, 2));
      return { success: true };
    }

    return { success: false, error: 'Tokens not found' };
  } catch (error) {
    console.error('Token deletion error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

module.exports = {
  storeTokens,
  getTokens,
  getConnectedPlatforms,
  deleteTokens,
  isTokenExpired,
};
