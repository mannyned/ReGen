/**
 * User Credentials Service
 *
 * Manages retrieval and decryption of user-provided API credentials (BYOK).
 * Used by OAuth providers to check for user-specific API keys before
 * falling back to environment variables.
 */

import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto/encrypt'

export interface UserTwitterCredentials {
  clientId: string
  clientSecret: string
  appName?: string | null
}

export interface CredentialStatus {
  configured: boolean
  isValid: boolean
  lastError?: string | null
  lastTestedAt?: Date | null
}

/**
 * Get decrypted Twitter/X credentials for a user
 *
 * @param profileId - User's profile ID
 * @returns Decrypted credentials or null if not configured
 */
export async function getTwitterCredentials(
  profileId: string
): Promise<UserTwitterCredentials | null> {
  try {
    const credentials = await prisma.userApiCredentials.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: 'twitter',
        },
      },
    })

    if (!credentials || !credentials.isValid) {
      return null
    }

    // Decrypt credentials
    const clientId = decrypt(credentials.clientIdEnc)
    const clientSecret = decrypt(credentials.clientSecretEnc)

    return {
      clientId,
      clientSecret,
      appName: credentials.appName,
    }
  } catch (error) {
    console.error('[UserCredentials] Failed to get Twitter credentials:', error)
    return null
  }
}

/**
 * Check credential status without decrypting
 *
 * @param profileId - User's profile ID
 * @param provider - Provider name
 * @returns Status of credentials
 */
export async function getCredentialStatus(
  profileId: string,
  provider: string
): Promise<CredentialStatus> {
  try {
    const normalizedProvider = provider === 'x' ? 'twitter' : provider

    const credentials = await prisma.userApiCredentials.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: normalizedProvider,
        },
      },
      select: {
        isValid: true,
        lastError: true,
        lastTestedAt: true,
      },
    })

    if (!credentials) {
      return { configured: false, isValid: false }
    }

    return {
      configured: true,
      isValid: credentials.isValid,
      lastError: credentials.lastError,
      lastTestedAt: credentials.lastTestedAt,
    }
  } catch (error) {
    console.error('[UserCredentials] Failed to get status:', error)
    return { configured: false, isValid: false }
  }
}

/**
 * Mark credentials as invalid with error message
 *
 * @param profileId - User's profile ID
 * @param provider - Provider name
 * @param error - Error message
 */
export async function markCredentialsInvalid(
  profileId: string,
  provider: string,
  error: string
): Promise<void> {
  try {
    const normalizedProvider = provider === 'x' ? 'twitter' : provider

    await prisma.userApiCredentials.update({
      where: {
        profileId_provider: {
          profileId,
          provider: normalizedProvider,
        },
      },
      data: {
        isValid: false,
        lastError: error,
        lastTestedAt: new Date(),
      },
    })

    console.log(`[UserCredentials] Marked ${normalizedProvider} as invalid for ${profileId}`)
  } catch (error) {
    console.error('[UserCredentials] Failed to mark invalid:', error)
  }
}

/**
 * Mark credentials as valid (e.g., after successful API call)
 *
 * @param profileId - User's profile ID
 * @param provider - Provider name
 */
export async function markCredentialsValid(
  profileId: string,
  provider: string
): Promise<void> {
  try {
    const normalizedProvider = provider === 'x' ? 'twitter' : provider

    await prisma.userApiCredentials.update({
      where: {
        profileId_provider: {
          profileId,
          provider: normalizedProvider,
        },
      },
      data: {
        isValid: true,
        lastError: null,
        lastTestedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[UserCredentials] Failed to mark valid:', error)
  }
}

export const userCredentialsService = {
  getTwitterCredentials,
  getCredentialStatus,
  markCredentialsInvalid,
  markCredentialsValid,
}
