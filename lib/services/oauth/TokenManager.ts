import crypto from 'crypto'
import type { SocialPlatform, OAuthTokens } from '../../types/social'
import { oauthService } from './OAuthService'

// ============================================
// ENCRYPTION UTILITIES
// ============================================

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine IV + authTag + encrypted data
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }

  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// ============================================
// TOKEN STORAGE (In-memory for dev, use DB in production)
// ============================================

interface StoredConnection {
  userId: string
  platform: SocialPlatform
  platformUserId: string
  username?: string
  displayName?: string
  profileImageUrl?: string
  accessToken: string // Encrypted
  refreshToken?: string // Encrypted
  expiresAt?: Date
  scopes: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// In-memory storage (replace with Prisma in production)
const connectionStore = new Map<string, StoredConnection>()

function getConnectionKey(userId: string, platform: SocialPlatform): string {
  return `${userId}:${platform}`
}

// ============================================
// TOKEN MANAGER CLASS
// ============================================

export class TokenManager {
  // ============================================
  // STORE CONNECTION
  // ============================================

  async storeConnection(
    userId: string,
    platform: SocialPlatform,
    tokens: OAuthTokens,
    profile: {
      platformUserId: string
      username?: string
      displayName?: string
      profileImageUrl?: string
    },
    scopes: string[]
  ): Promise<StoredConnection> {
    const key = getConnectionKey(userId, platform)

    const connection: StoredConnection = {
      userId,
      platform,
      platformUserId: profile.platformUserId,
      username: profile.username,
      displayName: profile.displayName,
      profileImageUrl: profile.profileImageUrl,
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
      expiresAt: tokens.expiresAt,
      scopes,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    connectionStore.set(key, connection)

    console.log(`[TokenManager] Stored connection for ${userId} on ${platform}`)

    return connection
  }

  // ============================================
  // GET CONNECTION
  // ============================================

  async getConnection(
    userId: string,
    platform: SocialPlatform
  ): Promise<StoredConnection | null> {
    const key = getConnectionKey(userId, platform)
    return connectionStore.get(key) || null
  }

  // ============================================
  // GET ALL USER CONNECTIONS
  // ============================================

  async getUserConnections(userId: string): Promise<StoredConnection[]> {
    const connections: StoredConnection[] = []

    for (const connection of connectionStore.values()) {
      if (connection.userId === userId && connection.isActive) {
        connections.push(connection)
      }
    }

    return connections
  }

  // ============================================
  // GET VALID ACCESS TOKEN (auto-refresh if needed)
  // ============================================

  async getValidAccessToken(
    userId: string,
    platform: SocialPlatform
  ): Promise<string | null> {
    const connection = await this.getConnection(userId, platform)

    if (!connection || !connection.isActive) {
      return null
    }

    // Check if token is expired or about to expire (5 min buffer)
    const bufferMs = 5 * 60 * 1000
    const isExpired = connection.expiresAt &&
      new Date(connection.expiresAt.getTime() - bufferMs) < new Date()

    if (isExpired && connection.refreshToken) {
      try {
        const newTokens = await this.refreshTokens(userId, platform)
        return newTokens ? decryptToken(newTokens.accessToken) : null
      } catch (error) {
        console.error(`[TokenManager] Failed to refresh token for ${platform}:`, error)
        // Mark connection as inactive
        await this.deactivateConnection(userId, platform)
        return null
      }
    }

    return decryptToken(connection.accessToken)
  }

  // ============================================
  // REFRESH TOKENS
  // ============================================

  async refreshTokens(
    userId: string,
    platform: SocialPlatform
  ): Promise<StoredConnection | null> {
    const connection = await this.getConnection(userId, platform)

    if (!connection || !connection.refreshToken) {
      return null
    }

    const decryptedRefreshToken = decryptToken(connection.refreshToken)
    const newTokens = await oauthService.refreshAccessToken(platform, decryptedRefreshToken)

    // Update stored connection
    const key = getConnectionKey(userId, platform)
    const updatedConnection: StoredConnection = {
      ...connection,
      accessToken: encryptToken(newTokens.accessToken),
      refreshToken: newTokens.refreshToken
        ? encryptToken(newTokens.refreshToken)
        : connection.refreshToken,
      expiresAt: newTokens.expiresAt,
      updatedAt: new Date(),
    }

    connectionStore.set(key, updatedConnection)

    console.log(`[TokenManager] Refreshed tokens for ${userId} on ${platform}`)

    return updatedConnection
  }

  // ============================================
  // DISCONNECT
  // ============================================

  async disconnect(
    userId: string,
    platform: SocialPlatform
  ): Promise<boolean> {
    const connection = await this.getConnection(userId, platform)

    if (!connection) {
      return false
    }

    try {
      // Revoke tokens with the platform
      const accessToken = decryptToken(connection.accessToken)
      await oauthService.revokeToken(platform, accessToken)
    } catch (error) {
      console.warn(`[TokenManager] Token revocation failed for ${platform}:`, error)
    }

    // Remove from store
    const key = getConnectionKey(userId, platform)
    connectionStore.delete(key)

    console.log(`[TokenManager] Disconnected ${userId} from ${platform}`)

    return true
  }

  // ============================================
  // DEACTIVATE CONNECTION
  // ============================================

  async deactivateConnection(
    userId: string,
    platform: SocialPlatform
  ): Promise<void> {
    const key = getConnectionKey(userId, platform)
    const connection = connectionStore.get(key)

    if (connection) {
      connection.isActive = false
      connection.updatedAt = new Date()
      connectionStore.set(key, connection)
    }
  }

  // ============================================
  // CHECK CONNECTION HEALTH
  // ============================================

  async checkConnectionHealth(
    userId: string,
    platform: SocialPlatform
  ): Promise<{ healthy: boolean; message: string }> {
    try {
      const accessToken = await this.getValidAccessToken(userId, platform)

      if (!accessToken) {
        return { healthy: false, message: 'No valid access token' }
      }

      // Try to fetch user profile to verify token works
      await oauthService.fetchUserProfile(platform, accessToken)

      return { healthy: true, message: 'Connection is healthy' }
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Connection check failed',
      }
    }
  }

  // ============================================
  // BATCH REFRESH (for scheduled jobs)
  // ============================================

  async refreshExpiringTokens(bufferHours: number = 1): Promise<{
    refreshed: number
    failed: number
    errors: Array<{ userId: string; platform: SocialPlatform; error: string }>
  }> {
    const results = {
      refreshed: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; platform: SocialPlatform; error: string }>,
    }

    const bufferMs = bufferHours * 60 * 60 * 1000
    const threshold = new Date(Date.now() + bufferMs)

    for (const connection of connectionStore.values()) {
      if (
        connection.isActive &&
        connection.refreshToken &&
        connection.expiresAt &&
        connection.expiresAt < threshold
      ) {
        try {
          await this.refreshTokens(connection.userId, connection.platform)
          results.refreshed++
        } catch (error) {
          results.failed++
          results.errors.push({
            userId: connection.userId,
            platform: connection.platform,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    console.log(
      `[TokenManager] Batch refresh complete: ${results.refreshed} refreshed, ${results.failed} failed`
    )

    return results
  }
}

// Singleton instance
export const tokenManager = new TokenManager()
