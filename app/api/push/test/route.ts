/**
 * POST /api/push/test
 * Send a test push notification to the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import { sendPushToUser, isPushConfigured, getUserSubscriptions } from '@/lib/services/push'

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
        { success: false, error: 'Push notifications not configured on server' },
        { status: 503 }
      )
    }

    // Check if user has any subscriptions
    const subscriptions = await getUserSubscriptions(userId)
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No push subscriptions found for your account. Please enable notifications in Settings.',
        subscriptionCount: 0,
      })
    }

    console.log(`[Push Test] Sending test notification to user ${userId} with ${subscriptions.length} subscription(s)`)

    // Send a test notification
    const result = await sendPushToUser(userId, 'system', {
      title: 'Test Notification',
      body: 'Push notifications are working! You will receive notifications when your blog posts are auto-shared.',
      url: '/automations',
      tag: 'push-test',
    })

    console.log(`[Push Test] Result:`, result)

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Test notification sent to ${result.sent} device(s)`
        : 'Failed to send test notification',
      sent: result.sent,
      failed: result.failed,
      subscriptionCount: subscriptions.length,
      error: result.error,
    })
  } catch (error) {
    console.error('[Push Test] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test notification',
      },
      { status: 500 }
    )
  }
}
