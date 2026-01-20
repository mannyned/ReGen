import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import {
  storePushSubscription,
  isPushConfigured,
  getVapidPublicKey,
} from '@/lib/services/push'
import type { PushSubscriptionData } from '@/lib/services/push'

// ============================================
// GET /api/push/subscribe
// Get the VAPID public key for client-side subscription
// ============================================

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Push notifications not configured' },
      { status: 503 }
    )
  }

  return NextResponse.json({
    success: true,
    publicKey: getVapidPublicKey(),
  })
}

// ============================================
// POST /api/push/subscribe
// Store a push subscription for the authenticated user
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

    if (!isPushConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Push notifications not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { subscription } = body as { subscription: PushSubscriptionData }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Validate subscription structure
    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription keys' },
        { status: 400 }
      )
    }

    // Store the subscription
    const result = await storePushSubscription(userId, subscription)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    console.log(`[Push API] Subscription stored for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved',
    })
  } catch (error) {
    console.error('[Push API] Subscribe error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      },
      { status: 500 }
    )
  }
}
