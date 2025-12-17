// In-memory store for verification codes
// Note: In production, use Redis, database, or a proper session store
// This in-memory store will reset when the server restarts

interface VerificationData {
  code: string
  expiresAt: number
  attempts: number
}

class VerificationStore {
  private codes = new Map<string, VerificationData>()
  private maxAttempts = 5

  // Generate a random 6-digit code
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Store a verification code for an email
  setCode(email: string, code: string, expiryMinutes: number = 10): void {
    const normalizedEmail = email.toLowerCase().trim()
    this.codes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + expiryMinutes * 60 * 1000,
      attempts: 0,
    })
  }

  // Verify a code for an email
  verifyCode(email: string, code: string): { valid: boolean; error?: string } {
    const normalizedEmail = email.toLowerCase().trim()
    const data = this.codes.get(normalizedEmail)

    if (!data) {
      return { valid: false, error: 'No verification code found. Please request a new one.' }
    }

    // Check expiry
    if (Date.now() > data.expiresAt) {
      this.codes.delete(normalizedEmail)
      return { valid: false, error: 'Code has expired. Please request a new one.' }
    }

    // Check attempts
    if (data.attempts >= this.maxAttempts) {
      this.codes.delete(normalizedEmail)
      return { valid: false, error: 'Too many attempts. Please request a new code.' }
    }

    // Increment attempts
    data.attempts++

    // Check code
    if (data.code !== code) {
      const remaining = this.maxAttempts - data.attempts
      return {
        valid: false,
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many attempts. Please request a new code.'
      }
    }

    // Success - remove the code
    this.codes.delete(normalizedEmail)
    return { valid: true }
  }

  // Check if email has a pending verification
  hasPendingVerification(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim()
    const data = this.codes.get(normalizedEmail)
    return !!data && Date.now() <= data.expiresAt
  }

  // Get remaining time in seconds
  getRemainingTime(email: string): number {
    const normalizedEmail = email.toLowerCase().trim()
    const data = this.codes.get(normalizedEmail)
    if (!data) return 0
    const remaining = Math.max(0, data.expiresAt - Date.now())
    return Math.floor(remaining / 1000)
  }

  // Clean up expired codes (call periodically)
  cleanup(): void {
    const now = Date.now()
    for (const [email, data] of this.codes.entries()) {
      if (now > data.expiresAt) {
        this.codes.delete(email)
      }
    }
  }
}

// Export a singleton instance
export const verificationStore = new VerificationStore()
