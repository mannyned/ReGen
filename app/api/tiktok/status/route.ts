/**
 * GET /api/tiktok/status
 *
 * Get TikTok connection status for the current user
 *
 * Response:
 * {
 *   connected: boolean,
 *   username?: string,
 *   avatarUrl?: string,
 *   scopes?: string[],
 *   expiresAt?: string (ISO date)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import type { GetTikTokStatusResponse } from '@/lib/types/tiktok'

export const runtime = 'nodejs'

// Lazy import to avoid circular dependency
async function getTikTokService() {
  const { tiktokService } = await import('@/lib/services/tiktok')
  return tiktokService
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Get service instance (lazy loaded to avoid circular dependency)
    const tiktokService = await getTikTokService()

    // Get connection status
    const status = await tiktokService.getConnectionStatus(profileId)

    const response: GetTikTokStatusResponse = {
      connected: status.connected,
      username: status.username,
      avatarUrl: status.avatarUrl,
      scopes: status.scopes,
      expiresAt: status.expiresAt,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[TikTok Status Error]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
        code: 'STATUS_ERROR',
      },
      { status: 500 }
    )
  }
}
