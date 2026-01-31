/**
 * API Routes for User API Credentials (BYOK - Bring Your Own Keys)
 *
 * Manages user-provided API credentials for platforms that require
 * paid API access (e.g., Twitter/X).
 *
 * GET /api/credentials/[provider] - Check if credentials exist
 * POST /api/credentials/[provider] - Save new credentials
 * DELETE /api/credentials/[provider] - Remove credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/auth/getUser'
import { encrypt, decrypt } from '@/lib/crypto/encrypt'
import { z } from 'zod'

export const runtime = 'nodejs'

// Supported providers for BYOK
const SUPPORTED_PROVIDERS = ['twitter', 'x'] as const
type SupportedProvider = typeof SUPPORTED_PROVIDERS[number]

// Validation schema for Twitter/X credentials
const twitterCredentialsSchema = z.object({
  clientId: z.string().min(10, 'Client ID is required'),
  clientSecret: z.string().min(10, 'Client Secret is required'),
  appName: z.string().optional(),
})

/**
 * GET /api/credentials/[provider]
 * Check if user has configured BYOK credentials
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const profileId = await getUserId(request)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { provider } = await params

    // Normalize provider name (x -> twitter)
    const normalizedProvider = provider === 'x' ? 'twitter' : provider

    if (!SUPPORTED_PROVIDERS.includes(normalizedProvider as SupportedProvider)) {
      return NextResponse.json(
        { error: 'Provider not supported for BYOK', code: 'UNSUPPORTED_PROVIDER' },
        { status: 400 }
      )
    }

    const credentials = await prisma.userApiCredentials.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: normalizedProvider,
        },
      },
      select: {
        id: true,
        provider: true,
        appName: true,
        isValid: true,
        lastError: true,
        lastTestedAt: true,
        createdAt: true,
        updatedAt: true,
        // Don't select encrypted fields - we'll mask them
        clientIdEnc: true,
      },
    })

    if (!credentials) {
      return NextResponse.json({
        configured: false,
        provider: normalizedProvider,
      })
    }

    // Decrypt client ID to show masked version
    let maskedClientId = '••••••••'
    try {
      const clientId = decrypt(credentials.clientIdEnc)
      // Show first 4 and last 4 characters
      if (clientId.length > 8) {
        maskedClientId = `${clientId.slice(0, 4)}••••${clientId.slice(-4)}`
      }
    } catch {
      // If decryption fails, just show masked
    }

    return NextResponse.json({
      configured: true,
      provider: normalizedProvider,
      appName: credentials.appName,
      maskedClientId,
      isValid: credentials.isValid,
      lastError: credentials.lastError,
      lastTestedAt: credentials.lastTestedAt,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    })
  } catch (error) {
    console.error('[Credentials GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credentials', code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credentials/[provider]
 * Save new BYOK credentials
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const profileId = await getUserId(request)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { provider } = await params

    // Normalize provider name
    const normalizedProvider = provider === 'x' ? 'twitter' : provider

    if (!SUPPORTED_PROVIDERS.includes(normalizedProvider as SupportedProvider)) {
      return NextResponse.json(
        { error: 'Provider not supported for BYOK', code: 'UNSUPPORTED_PROVIDER' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate based on provider
    let validatedData
    if (normalizedProvider === 'twitter') {
      const result = twitterCredentialsSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.errors[0].message, code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      validatedData = result.data
    } else {
      return NextResponse.json(
        { error: 'Provider validation not implemented', code: 'NOT_IMPLEMENTED' },
        { status: 501 }
      )
    }

    // Encrypt credentials
    const clientIdEnc = encrypt(validatedData.clientId)
    const clientSecretEnc = encrypt(validatedData.clientSecret)

    // Upsert credentials
    const credentials = await prisma.userApiCredentials.upsert({
      where: {
        profileId_provider: {
          profileId,
          provider: normalizedProvider,
        },
      },
      update: {
        clientIdEnc,
        clientSecretEnc,
        appName: validatedData.appName || null,
        isValid: true,
        lastError: null,
        updatedAt: new Date(),
      },
      create: {
        profileId,
        provider: normalizedProvider,
        clientIdEnc,
        clientSecretEnc,
        appName: validatedData.appName || null,
        isValid: true,
      },
    })

    console.log(`[Credentials] Saved ${normalizedProvider} BYOK for user ${profileId}`)

    return NextResponse.json({
      success: true,
      message: 'Credentials saved successfully',
      provider: normalizedProvider,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    })
  } catch (error) {
    console.error('[Credentials POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save credentials', code: 'SAVE_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/credentials/[provider]
 * Remove BYOK credentials
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const profileId = await getUserId(request)
    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { provider } = await params

    // Normalize provider name
    const normalizedProvider = provider === 'x' ? 'twitter' : provider

    if (!SUPPORTED_PROVIDERS.includes(normalizedProvider as SupportedProvider)) {
      return NextResponse.json(
        { error: 'Provider not supported for BYOK', code: 'UNSUPPORTED_PROVIDER' },
        { status: 400 }
      )
    }

    // Delete credentials
    await prisma.userApiCredentials.delete({
      where: {
        profileId_provider: {
          profileId,
          provider: normalizedProvider,
        },
      },
    }).catch(() => {
      // Ignore if doesn't exist
    })

    console.log(`[Credentials] Deleted ${normalizedProvider} BYOK for user ${profileId}`)

    return NextResponse.json({
      success: true,
      message: 'Credentials removed successfully',
      provider: normalizedProvider,
    })
  } catch (error) {
    console.error('[Credentials DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete credentials', code: 'DELETE_ERROR' },
      { status: 500 }
    )
  }
}
