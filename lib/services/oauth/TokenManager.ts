import crypto from 'crypto'
import type { SocialPlatform, OAuthTokens } from '../../types/social'
import { oauthService } from './OAuthService'
import { prisma } from '@/lib/db'
import { SocialPlatform as PrismaSocialPlatform } from '@prisma/client'

// ============================================
// ENCRYPTION UTILITIES
// ============================================

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

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
// PLATFORM MAPPING
// ============================================

// Map lowercase platform strings to Prisma enum
function toPrismaPlatform(platform: SocialPlatform): PrismaSocialPlatform {
  const mapping: Record<SocialPlatform, PrismaSocialPlatform> = {
    instagram: 'INSTAGRAM',
    tiktok: 'TIKTOK',
    youtube: 'YOUTUBE',
    twitter: 'TWITTER',
    linkedin: 'LINKEDIN',
    facebook: 'FACEBOOK',
    snapchat: 'SNAPCHAT',
  }
  return mapping[platform]
}

// Map Prisma enum to lowercase platform strings
function fromPrismaPlatform(platform: PrismaSocialPlatform): SocialPlatform {
  return platform.toLowerCase() as SocialPlatform
}

// ============================================
// STORED CONNECTION TYPE
// ============================================

export interface StoredConnection {
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
    const prismaPlatform = toPrismaPlatform(platform)

    // Upsert the connection (update if exists, create if not)
    const connection = await prisma.socialConnection.upsert({
      where: {
        profileId_platform: {
          profileId: userId,
          platform: prismaPlatform,
        },
      },
      update: {
        platformUserId: profile.platformUserId,
        username: profile.username,
        displayName: profile.displayName,
        profileImageUrl: profile.profileImageUrl,
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scopes: scopes,
        isActive: true,
        lastSyncAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      },
      create: {
        profileId: userId,
        platform: prismaPlatform,
        platformUserId: profile.platformUserId,
        username: profile.username,
        displayName: profile.displayName,
        profileImageUrl: profile.profileImageUrl,
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scopes: scopes,
        isActive: true,
      },
    })

    console.log(`[TokenManager] Stored connection for ${userId} on ${platform}`)

    return {
      userId: connection.profileId,
      platform: fromPrismaPlatform(connection.platform),
      platformUserId: connection.platformUserId,
      username: connection.username || undefined,
      displayName: connection.displayName || undefined,
      profileImageUrl: connection.profileImageUrl || undefined,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      expiresAt: connection.tokenExpiresAt || undefined,
      scopes: connection.scopes,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }
  }

  // ============================================
  // GET CONNECTION
  // ============================================

  async getConnection(
    userId: string,
    platform: SocialPlatform
  ): Promise<StoredConnection | null> {
    const prismaPlatform = toPrismaPlatform(platform)

    const connection = await prisma.socialConnection.findUnique({
      where: {
        profileId_platform: {
          profileId: userId,
          platform: prismaPlatform,
        },
      },
    })

    if (!connection) return null

    return {
      userId: connection.profileId,
      platform: fromPrismaPlatform(connection.platform),
      platformUserId: connection.platformUserId,
      username: connection.username || undefined,
      displayName: connection.displayName || undefined,
      profileImageUrl: connection.profileImageUrl || undefined,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      expiresAt: connection.tokenExpiresAt || undefined,
      scopes: connection.scopes,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }
  }

  // ============================================
  // GET ALL USER CONNECTIONS
  // ============================================

  async getUserConnections(userId: string): Promise<StoredConnection[]> {
    const connections = await prisma.socialConnection.findMany({
      where: {
        profileId: userId,
        isActive: true,
      },
    })

    return connections.map((connection) => ({
      userId: connection.profileId,
      platform: fromPrismaPlatform(connection.platform),
      platformUserId: connection.platformUserId,
      username: connection.username || undefined,
      displayName: connection.displayName || undefined,
      profileImageUrl: connection.profileImageUrl || undefined,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      expiresAt: connection.tokenExpiresAt || undefined,
      scopes: connection.scopes,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }))
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

    const prismaPlatform = toPrismaPlatform(platform)

    // Update stored connection
    const updatedConnection = await prisma.socialConnection.update({
      where: {
        profileId_platform: {
          profileId: userId,
          platform: prismaPlatform,
        },
      },
      data: {
        accessToken: encryptToken(newTokens.accessToken),
        refreshToken: newTokens.refreshToken
          ? encryptToken(newTokens.refreshToken)
          : undefined,
        tokenExpiresAt: newTokens.expiresAt,
        lastSyncAt: new Date(),
      },
    })

    console.log(`[TokenManager] Refreshed tokens for ${userId} on ${platform}`)

    return {
      userId: updatedConnection.profileId,
      platform: fromPrismaPlatform(updatedConnection.platform),
      platformUserId: updatedConnection.platformUserId,
      username: updatedConnection.username || undefined,
      displayName: updatedConnection.displayName || undefined,
      profileImageUrl: updatedConnection.profileImageUrl || undefined,
      accessToken: updatedConnection.accessToken,
      refreshToken: updatedConnection.refreshToken || undefined,
      expiresAt: updatedConnection.tokenExpiresAt || undefined,
      scopes: updatedConnection.scopes,
      isActive: updatedConnection.isActive,
      createdAt: updatedConnection.createdAt,
      updatedAt: updatedConnection.updatedAt,
    }
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

    const prismaPlatform = toPrismaPlatform(platform)

    // Delete from database
    await prisma.socialConnection.delete({
      where: {
        profileId_platform: {
          profileId: userId,
          platform: prismaPlatform,
        },
      },
    })

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
    const prismaPlatform = toPrismaPlatform(platform)

    await prisma.socialConnection.update({
      where: {
        profileId_platform: {
          profileId: userId,
          platform: prismaPlatform,
        },
      },
      data: {
        isActive: false,
        lastErrorAt: new Date(),
        lastError: 'Token expired and refresh failed',
      },
    })
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

    const threshold = new Date(Date.now() + bufferHours * 60 * 60 * 1000)

    const expiringConnections = await prisma.socialConnection.findMany({
      where: {
        isActive: true,
        refreshToken: { not: null },
        tokenExpiresAt: { lt: threshold },
      },
    })

    for (const connection of expiringConnections) {
      try {
        await this.refreshTokens(
          connection.profileId,
          fromPrismaPlatform(connection.platform)
        )
        results.refreshed++
      } catch (error) {
        results.failed++
        results.errors.push({
          userId: connection.profileId,
          platform: fromPrismaPlatform(connection.platform),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
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
