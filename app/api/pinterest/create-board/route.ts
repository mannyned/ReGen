/**
 * POST /api/pinterest/create-board
 *
 * Creates a test board in Pinterest (useful for sandbox testing)
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URLS } from '@/lib/config/oauth'

const PINTEREST_API_BASE = API_BASE_URLS.pinterest

export async function POST(request: NextRequest) {
  try {
    const sandboxToken = process.env.PINTEREST_SANDBOX_TOKEN

    if (!sandboxToken) {
      return NextResponse.json(
        { success: false, error: 'Sandbox token not configured' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const boardName = body.name || 'Test Board'
    const description = body.description || 'Created for testing'

    console.log('[Pinterest Create Board] Creating board:', boardName)

    const response = await fetch(`${PINTEREST_API_BASE}/boards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sandboxToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: boardName,
        description: description,
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
