// Database-backed verification code store for serverless environments
// Uses Prisma to persist codes across function invocations

import { prisma } from '@/lib/db'

const MAX_ATTEMPTS = 5
const DEFAULT_EXPIRY_MINUTES = 10

class VerificationStore {
  // Generate a random 6-digit code
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Store a verification code for an email
  async setCode(email: string, code: string, expiryMinutes: number = DEFAULT_EXPIRY_MINUTES): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim()
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

    // Upsert - create or update existing code for this email
    await prisma.verificationCode.upsert({
      where: { email: normalizedEmail },
      update: {
        code,
        attempts: 0,
        expiresAt,
      },
      create: {
        email: normalizedEmail,
        code,
        attempts: 0,
        expiresAt,
      },
    })
  }

  // Verify a code for an email
  async verifyCode(email: string, code: string): Promise<{ valid: boolean; error?: string }> {
    const normalizedEmail = email.toLowerCase().trim()

    const data = await prisma.verificationCode.findUnique({
      where: { email: normalizedEmail },
    })

    if (!data) {
      return { valid: false, error: 'No verification code found. Please request a new one.' }
    }

    // Check expiry
    if (new Date() > data.expiresAt) {
      await prisma.verificationCode.delete({ where: { email: normalizedEmail } })
      return { valid: false, error: 'Code has expired. Please request a new one.' }
    }

    // Check attempts
    if (data.attempts >= MAX_ATTEMPTS) {
      await prisma.verificationCode.delete({ where: { email: normalizedEmail } })
      return { valid: false, error: 'Too many attempts. Please request a new code.' }
    }

    // Increment attempts
    await prisma.verificationCode.update({
      where: { email: normalizedEmail },
      data: { attempts: data.attempts + 1 },
    })

    // Check code
    if (data.code !== code) {
      const remaining = MAX_ATTEMPTS - (data.attempts + 1)
      return {
        valid: false,
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many attempts. Please request a new code.'
      }
    }

    // Success - remove the code
    await prisma.verificationCode.delete({ where: { email: normalizedEmail } })
    return { valid: true }
  }

  // Check if email has a pending verification
  async hasPendingVerification(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim()
    const data = await prisma.verificationCode.findUnique({
      where: { email: normalizedEmail },
    })
    return !!data && new Date() <= data.expiresAt
  }

  // Clean up expired codes (call periodically via cron)
  async cleanup(): Promise<number> {
    const result = await prisma.verificationCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })
    return result.count
  }
}

// Export a singleton instance
export const verificationStore = new VerificationStore()
