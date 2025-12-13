// ============================================
// SHAREABLE LINK SERVICE
// PRO-Only Feature - Generate Expiring Download Links
// ============================================

import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import type {
  ShareableLink,
  ShareableLinkAccess,
  ShareableLinkCreateInput,
} from '@/lib/types/export'
import type { PlanTier } from '@prisma/client'

// In-memory store for development (replace with database in production)
const shareableLinks = new Map<string, ShareableLink>()

// Default expiration: 72 hours
const DEFAULT_EXPIRATION_HOURS = 72

// Maximum downloads default
const DEFAULT_MAX_DOWNLOADS = 10

interface ShareableLinkResult {
  link: ShareableLink
  fullUrl: string
  shortUrl?: string
}

interface AccessVerificationResult {
  allowed: boolean
  reason?: string
  link?: ShareableLink
}

export class ShareableLinkService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }

  /**
   * Create a new shareable link for an export
   */
  async createShareableLink(
    input: ShareableLinkCreateInput,
    userPlan: PlanTier
  ): Promise<ShareableLinkResult> {
    // Validate PRO access
    if (userPlan === 'FREE') {
      throw new Error('Shareable links are a PRO-only feature')
    }

    // Generate secure token
    const token = this.generateSecureToken()

    // Generate short code (optional, for shorter URLs)
    const shortCode = this.generateShortCode()

    // Calculate expiration
    const expiresInHours = input.expiresInHours || DEFAULT_EXPIRATION_HOURS
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    // Hash password if provided
    const hashedPassword = input.password
      ? await this.hashPassword(input.password)
      : undefined

    const link: ShareableLink = {
      id: uuidv4(),
      userId: input.userId,
      exportJobId: input.exportJobId,
      token,
      shortCode,
      password: hashedPassword,
      maxDownloads: input.maxDownloads || DEFAULT_MAX_DOWNLOADS,
      downloadCount: 0,
      allowedEmails: input.allowedEmails,
      expiresAt,
      isExpired: false,
      accessLog: [],
      createdAt: new Date(),
    }

    shareableLinks.set(link.id, link)

    // Also index by token for quick lookup
    shareableLinks.set(`token:${token}`, link)
    if (shortCode) {
      shareableLinks.set(`short:${shortCode}`, link)
    }

    return {
      link,
      fullUrl: `${this.baseUrl}/share/${token}`,
      shortUrl: shortCode ? `${this.baseUrl}/s/${shortCode}` : undefined,
    }
  }

  /**
   * Get a shareable link by ID
   */
  async getShareableLink(linkId: string, userId: string): Promise<ShareableLink | null> {
    const link = shareableLinks.get(linkId)
    if (!link || link.userId !== userId) {
      return null
    }

    // Update expired status
    this.updateExpiredStatus(link)

    return link
  }

  /**
   * Get a shareable link by token (for public access)
   */
  async getShareableLinkByToken(token: string): Promise<ShareableLink | null> {
    const link = shareableLinks.get(`token:${token}`)
    if (!link) {
      return null
    }

    this.updateExpiredStatus(link)
    return link
  }

  /**
   * Get a shareable link by short code
   */
  async getShareableLinkByShortCode(shortCode: string): Promise<ShareableLink | null> {
    const link = shareableLinks.get(`short:${shortCode}`)
    if (!link) {
      return null
    }

    this.updateExpiredStatus(link)
    return link
  }

  /**
   * Get all shareable links for a user
   */
  async getUserShareableLinks(userId: string): Promise<ShareableLink[]> {
    const links: ShareableLink[] = []
    for (const [key, link] of shareableLinks.entries()) {
      // Skip index entries
      if (key.startsWith('token:') || key.startsWith('short:')) continue

      if (link.userId === userId) {
        this.updateExpiredStatus(link)
        links.push(link)
      }
    }
    return links.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Verify access to a shareable link
   */
  async verifyAccess(
    token: string,
    password?: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AccessVerificationResult> {
    const link = await this.getShareableLinkByToken(token)

    if (!link) {
      return { allowed: false, reason: 'Link not found' }
    }

    // Check if expired
    if (link.isExpired) {
      return { allowed: false, reason: 'Link has expired' }
    }

    // Check download limit
    if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
      return { allowed: false, reason: 'Download limit reached' }
    }

    // Check password protection
    if (link.password) {
      if (!password) {
        return { allowed: false, reason: 'Password required' }
      }

      const passwordValid = await this.verifyPassword(password, link.password)
      if (!passwordValid) {
        return { allowed: false, reason: 'Invalid password' }
      }
    }

    // Check email restriction
    if (link.allowedEmails && link.allowedEmails.length > 0) {
      if (!email) {
        return { allowed: false, reason: 'Email verification required' }
      }

      const emailAllowed = link.allowedEmails.some(
        (allowed) => allowed.toLowerCase() === email.toLowerCase()
      )

      if (!emailAllowed) {
        return { allowed: false, reason: 'Email not authorized for this link' }
      }
    }

    // Log access attempt
    this.logAccess(link, ipAddress, userAgent, email, false)

    return { allowed: true, link }
  }

  /**
   * Record a successful download
   */
  async recordDownload(
    token: string,
    ipAddress?: string,
    userAgent?: string,
    email?: string
  ): Promise<boolean> {
    const link = await this.getShareableLinkByToken(token)
    if (!link) return false

    // Increment download count
    link.downloadCount++
    link.lastAccessedAt = new Date()

    // Log the download
    this.logAccess(link, ipAddress, userAgent, email, true)

    // Update in store
    shareableLinks.set(link.id, link)
    shareableLinks.set(`token:${link.token}`, link)
    if (link.shortCode) {
      shareableLinks.set(`short:${link.shortCode}`, link)
    }

    return true
  }

  /**
   * Revoke a shareable link
   */
  async revokeLink(linkId: string, userId: string): Promise<boolean> {
    const link = shareableLinks.get(linkId)
    if (!link || link.userId !== userId) {
      return false
    }

    // Mark as expired immediately
    link.isExpired = true
    link.expiresAt = new Date()

    shareableLinks.set(linkId, link)
    shareableLinks.set(`token:${link.token}`, link)
    if (link.shortCode) {
      shareableLinks.set(`short:${link.shortCode}`, link)
    }

    return true
  }

  /**
   * Delete a shareable link
   */
  async deleteLink(linkId: string, userId: string): Promise<boolean> {
    const link = shareableLinks.get(linkId)
    if (!link || link.userId !== userId) {
      return false
    }

    // Remove all index entries
    shareableLinks.delete(linkId)
    shareableLinks.delete(`token:${link.token}`)
    if (link.shortCode) {
      shareableLinks.delete(`short:${link.shortCode}`)
    }

    return true
  }

  /**
   * Update link settings
   */
  async updateLink(
    linkId: string,
    userId: string,
    updates: {
      maxDownloads?: number
      expiresAt?: Date
      allowedEmails?: string[]
      password?: string
    }
  ): Promise<ShareableLink | null> {
    const link = shareableLinks.get(linkId)
    if (!link || link.userId !== userId) {
      return null
    }

    // Apply updates
    if (updates.maxDownloads !== undefined) {
      link.maxDownloads = updates.maxDownloads
    }

    if (updates.expiresAt) {
      link.expiresAt = updates.expiresAt
      link.isExpired = updates.expiresAt <= new Date()
    }

    if (updates.allowedEmails) {
      link.allowedEmails = updates.allowedEmails
    }

    if (updates.password) {
      link.password = await this.hashPassword(updates.password)
    }

    // Update in store
    shareableLinks.set(linkId, link)
    shareableLinks.set(`token:${link.token}`, link)
    if (link.shortCode) {
      shareableLinks.set(`short:${link.shortCode}`, link)
    }

    return link
  }

  /**
   * Get access log for a link
   */
  async getAccessLog(linkId: string, userId: string): Promise<ShareableLinkAccess[] | null> {
    const link = shareableLinks.get(linkId)
    if (!link || link.userId !== userId) {
      return null
    }

    return link.accessLog
  }

  /**
   * Extend link expiration
   */
  async extendExpiration(
    linkId: string,
    userId: string,
    additionalHours: number
  ): Promise<ShareableLink | null> {
    const link = shareableLinks.get(linkId)
    if (!link || link.userId !== userId) {
      return null
    }

    // Extend from current expiration or now if already expired
    const baseTime = link.isExpired ? Date.now() : link.expiresAt.getTime()
    link.expiresAt = new Date(baseTime + additionalHours * 60 * 60 * 1000)
    link.isExpired = false

    // Update in store
    shareableLinks.set(linkId, link)
    shareableLinks.set(`token:${link.token}`, link)
    if (link.shortCode) {
      shareableLinks.set(`short:${link.shortCode}`, link)
    }

    return link
  }

  /**
   * Clean up expired links (for maintenance)
   */
  async cleanupExpiredLinks(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    let deletedCount = 0

    for (const [key, link] of shareableLinks.entries()) {
      // Skip index entries
      if (key.startsWith('token:') || key.startsWith('short:')) continue

      if (link.isExpired && link.expiresAt < cutoffDate) {
        await this.deleteLink(link.id, link.userId)
        deletedCount++
      }
    }

    return deletedCount
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Generate a cryptographically secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  /**
   * Generate a short code for URL shortening
   */
  private generateShortCode(): string {
    // 8 character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * Hash a password for storage
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  }

  /**
   * Verify a password against stored hash
   */
  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':')
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return hash === verifyHash
  }

  /**
   * Update expired status based on current time
   */
  private updateExpiredStatus(link: ShareableLink): void {
    if (!link.isExpired && link.expiresAt <= new Date()) {
      link.isExpired = true
    }
  }

  /**
   * Log an access attempt
   */
  private logAccess(
    link: ShareableLink,
    ipAddress?: string,
    userAgent?: string,
    email?: string,
    downloaded: boolean = false
  ): void {
    const accessEntry: ShareableLinkAccess = {
      timestamp: new Date(),
      ipAddress,
      userAgent,
      email,
      downloaded,
    }

    // Keep only last 100 access entries
    link.accessLog = [...link.accessLog.slice(-99), accessEntry]
  }

  /**
   * Generate statistics for a link
   */
  async getLinkStats(
    linkId: string,
    userId: string
  ): Promise<{
    totalAccesses: number
    uniqueIPs: number
    downloads: number
    lastAccessed: Date | null
    remainingDownloads: number | null
    expiresIn: string
  } | null> {
    const link = shareableLinks.get(linkId)
    if (!link || link.userId !== userId) {
      return null
    }

    const uniqueIPs = new Set(
      link.accessLog.filter((a) => a.ipAddress).map((a) => a.ipAddress)
    ).size

    const downloads = link.accessLog.filter((a) => a.downloaded).length

    const remainingDownloads = link.maxDownloads
      ? link.maxDownloads - link.downloadCount
      : null

    const expiresIn = this.formatTimeRemaining(link.expiresAt)

    return {
      totalAccesses: link.accessLog.length,
      uniqueIPs,
      downloads,
      lastAccessed: link.lastAccessedAt || null,
      remainingDownloads,
      expiresIn,
    }
  }

  /**
   * Format time remaining until expiration
   */
  private formatTimeRemaining(expiresAt: Date): string {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()

    if (diff <= 0) {
      return 'Expired'
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`
    }

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }

    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
}

// Export singleton instance
export const shareableLinkService = new ShareableLinkService()
