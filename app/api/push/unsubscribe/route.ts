import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import { removePushSubscription } from '@/lib/services/push'

// ============================================
// POST /api/push/unsubscribe
// Remove push subscription for the authenticated user
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user ID
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Remove the subscription
    const result = await removePushSubscription(userId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    console.log(`[Push API] Subscription removed for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed',
    })
  } catch (error) {
    console.error('[Push API] Unsubscribe error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      },
      { status: 500 }
    )
  }
}
