/**
 * GET /api/pinterest/boards
 *
 * Fetches the authenticated user's Pinterest boards.
 * Used for board selection when publishing pins.
 *
 * Query params:
 * - userId: The user ID to fetch boards for
 *
 * Response:
 * {
 *   success: boolean
 *   boards: Array<{
 *     id: string
 *     name: string
 *     description?: string
 *     pinCount?: number
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId is required' },
      { status: 400 }
    )
  }

  try {
    // Get valid access token for Pinterest
    const accessToken = await tokenManager.getValidAccessToken(userId, 'pinterest')

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Pinterest not connected or token expired' },
        { status: 401 }
      )
    }

    // Fetch boards from Pinterest API
    const response = await fetch(`${PINTEREST_API_BASE}/boards?page_size=100`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Pinterest Boards] API error:', errorData)
      return NextResponse.json(
        { success: false, error: errorData.message || `Pinterest API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    const boards = (data.items || []).map((board: any) => ({
      id: board.id,
      name: board.name,
      description: board.description || '',
      pinCount: board.pin_count || 0,
      privacy: board.privacy || 'PUBLIC',
    }))

    return NextResponse.json({
      success: true,
      boards,
    })
  } catch (error) {
    console.error('[Pinterest Boards] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}
