/**
 * POST /api/pinterest/create-board
 *
 * Creates a new board in Pinterest
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URLS } from '@/lib/config/oauth'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

const PINTEREST_API_BASE = API_BASE_URLS.pinterest

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, description } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const accessToken = await tokenManager.getValidAccessToken(userId, 'pinterest')

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Pinterest not connected or token expired' },
        { status: 401 }
      )
    }

    const boardName = name || 'New Board'
    const boardDescription = description || ''

    console.log('[Pinterest Create Board] Creating board:', boardName)

    const response = await fetch(`${PINTEREST_API_BASE}/boards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: boardName,
        description: boardDescription,
        privacy: 'PUBLIC',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Pinterest Create Board] Error:', errorData)
      return NextResponse.json(
        { success: false, error: errorData.message || `Pinterest API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Pinterest Create Board] Created:', data)

    return NextResponse.json({
      success: true,
      board: {
        id: data.id,
        name: data.name,
        description: data.description,
      },
    })
  } catch (error) {
    console.error('[Pinterest Create Board] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create board' },
      { status: 500 }
    )
  }
}
