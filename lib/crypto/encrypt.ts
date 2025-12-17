/**
 * Token Encryption Utilities - AES-256-GCM
 *
 * Provides secure encryption for OAuth tokens stored in the database.
 *
 * Why AES-256-GCM?
 * - AES-256: Military-grade encryption with 256-bit keys
 * - GCM mode: Provides both confidentiality AND authenticity
 * - Authentication tag prevents tampering with encrypted data
 * - Nonces ensure same plaintext produces different ciphertext
 *
 * Security considerations:
 * - Never reuse nonces with the same key
 * - Store nonce with ciphertext (it's not secret)
 * - Key must be exactly 32 bytes (256 bits)
 * - Auth tag provides tamper detection
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { EncryptionError, MissingConfigError } from '../oauth/errors';

// ============================================
// CONSTANTS
// ============================================

/** AES-256-GCM algorithm identifier */
const ALGORITHM = 'aes-256-gcm';

/** Nonce size in bytes (96 bits is recommended for GCM) */
const NONCE_LENGTH = 12;

/** Authentication tag length in bytes */
const AUTH_TAG_LENGTH = 16;

/** Key length in bytes (256 bits) */
const KEY_LENGTH = 32;

/**
 * Format: nonce (12 bytes) + authTag (16 bytes) + ciphertext
 * Stored as base64 string in database
 */

// ============================================
// KEY MANAGEMENT
// ============================================

let encryptionKey: Buffer | null = null;

/**
 * Get the encryption key from environment
 *
 * Why lazy initialization?
 * - Allows app to start even if key is missing (for development)
 * - Key is only required when actually encrypting/decrypting
 * - Throws clear error at point of use if missing
 */
function getEncryptionKey(): Buffer {
  if (encryptionKey) {
    return encryptionKey;
  }

  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new MissingConfigError('TOKEN_ENCRYPTION_KEY');
  }

  // Key can be provided as hex string (64 chars) or base64 (44 chars)
  let keyBuffer: Buffer;

  if (keyHex.length === 64) {
    // Hex-encoded key (32 bytes = 64 hex chars)
    keyBuffer = Buffer.from(keyHex, 'hex');
  } else if (keyHex.length === 44) {
    // Base64-encoded key
    keyBuffer = Buffer.from(keyHex, 'base64');
  } else {
    // Try direct UTF-8 (not recommended, but support for dev)
    keyBuffer = Buffer.from(keyHex, 'utf-8');
  }

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new MissingConfigError(
      `TOKEN_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${keyBuffer.length})`
    );
  }

  encryptionKey = keyBuffer;
  return encryptionKey;
}

/**
 * Generate a new random encryption key
 * Use this to create the TOKEN_ENCRYPTION_KEY value
 *
 * @returns Object with key in multiple formats
 */
export function generateEncryptionKey(): {
  hex: string;
  base64: string;
} {
  const key = randomBytes(KEY_LENGTH);
  return {
    hex: key.toString('hex'),
    base64: key.toString('base64'),
  };
}

// ============================================
// ENCRYPTION
// ============================================

/**
 * Encrypt a string value using AES-256-GCM
 *
 * @param plaintext - The string to encrypt (e.g., access token)
 * @returns Base64-encoded encrypted string (nonce + authTag + ciphertext)
 * @throws EncryptionError if encryption fails
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();

    // Generate random nonce for this encryption
    // Critical: Never reuse a nonce with the same key
    const nonce = randomBytes(NONCE_LENGTH);

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv(ALGORITHM, key, nonce, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt the plaintext
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag (proves data wasn't tampered with)
    const authTag = cipher.getAuthTag();

    // Combine: nonce + authTag + ciphertext
    // All parts are needed for decryption
    const combined = Buffer.concat([nonce, authTag, encrypted]);

    // Return as base64 for database storage
    return combined.toString('base64');
  } catch (error) {
    // Don't expose internal crypto errors
    console.error('[Encryption Error]', error);
    throw new EncryptionError('encrypt');
  }
}

/**
 * Decrypt a string encrypted with encrypt()
 *
 * @param encryptedBase64 - Base64-encoded encrypted string
 * @returns Original plaintext string
 * @throws EncryptionError if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(encryptedBase64: string): string {
  try {
    const key = getEncryptionKey();

    // Decode from base64
    const combined = Buffer.from(encryptedBase64, 'base64');

    // Minimum size check: nonce + authTag + at least 1 byte of data
    const minLength = NONCE_LENGTH + AUTH_TAG_LENGTH + 1;
    if (combined.length < minLength) {
      throw new Error('Encrypted data too short');
    }

    // Extract components
    const nonce = combined.subarray(0, NONCE_LENGTH);
    const authTag = combined.subarray(NONCE_LENGTH, NONCE_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(NONCE_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, nonce, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(), // This throws if auth tag doesn't match
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Don't expose what went wrong (could be key mismatch, tampering, etc.)
    console.error('[Decryption Error]', error);
    throw new EncryptionError('decrypt');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Encrypt a value only if it's not null/undefined
 * Useful for optional fields like refresh tokens
 */
export function encryptOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return encrypt(value);
}

/**
 * Decrypt a value only if it's not null/undefined
 */
export function decryptOptional(encryptedValue: string | null | undefined): string | null {
  if (encryptedValue === null || encryptedValue === undefined) {
    return null;
  }
  return decrypt(encryptedValue);
}

/**
 * Securely compare two strings in constant time
 * Prevents timing attacks when comparing tokens
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // timingSafeEqual requires same length buffers
  return require('crypto').timingSafeEqual(bufA, bufB);
}

/**
 * Generate a cryptographically secure random string
 * Useful for OAuth state parameters
 *
 * @param length - Number of random bytes (output will be 2x in hex)
 * @returns Hex-encoded random string
 */
export function generateSecureRandom(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a value using SHA-256
 * Useful for creating non-reversible identifiers
 */
export function sha256(value: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(value).digest('hex');
}

// ============================================
// KEY ROTATION SUPPORT
// ============================================

/**
 * Re-encrypt a value with a new key
 * Use this during key rotation
 *
 * @param encryptedValue - Currently encrypted value
 * @param oldKeyHex - Old encryption key (hex format)
 * @param newKeyHex - New encryption key (hex format)
 * @returns Value encrypted with new key
 */
export function rotateEncryption(
  encryptedValue: string,
  oldKeyHex: string,
  newKeyHex: string
): string {
  // Temporarily use old key to decrypt
  const oldKey = Buffer.from(oldKeyHex, 'hex');
  const combined = Buffer.from(encryptedValue, 'base64');

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const authTag = combined.subarray(NONCE_LENGTH, NONCE_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(NONCE_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, oldKey, nonce, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');

  // Encrypt with new key
  const newKey = Buffer.from(newKeyHex, 'hex');
  const newNonce = randomBytes(NONCE_LENGTH);

  const cipher = createCipheriv(ALGORITHM, newKey, newNonce, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const newAuthTag = cipher.getAuthTag();
  const newCombined = Buffer.concat([newNonce, newAuthTag, encrypted]);

  return newCombined.toString('base64');
}
