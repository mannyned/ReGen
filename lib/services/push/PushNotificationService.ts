import webpush from 'web-push'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ============================================
// WEB PUSH NOTIFICATION SERVICE
// ============================================

// VAPID keys for Web Push authentication
// Generate new keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@regenr.app'

// Configure web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// Push subscription type (from browser's PushSubscription)
export interface PushSubscriptionData {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

// Notification payload
export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

// Notification types for checking user preferences
export type NotificationTypeId =
  | 'new-post'
  | 'engagement'
  | 'scheduled'
  | 'published'
  | 'analytics'
  | 'system'

/**
 * Check if Web Push is properly configured
 */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!isPushConfigured()) {
    console.warn('[Push] Web Push not configured - missing VAPID keys')
    return { success: false, error: 'Web Push not configured' }
  }

  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/brand/regenr-icon-192.png',
      badge: payload.badge || '/brand/regenr-icon-72.png',
      url: payload.url || '/',
      tag: payload.tag,
      ...payload.data,
    })

    await webpush.sendNotification(subscription, notificationPayload)
    console.log('[Push] Notification sent successfully')
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Push] Failed to send notification:', errorMessage)

    // Handle expired or invalid subscriptions
    if (error instanceof webpush.WebPushError) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is invalid
        return { success: false, error: 'Subscription expired or invalid' }
      }
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Send a push notification to a user by their profile ID
 * Checks user's notification preferences before sending
 */
export async function sendPushToUser(
  profileId: string,
  notificationType: NotificationTypeId,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: boolean; error?: string }> {
  try {
    // Fetch user's profile with push subscription and notification preferences
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        pushSubscription: true,
        notificationPreferences: true,
      },
    })

    if (!profile) {
      return { success: false, sent: false, error: 'Profile not found' }
    }

    // Check if user has a push subscription
    const subscription = profile.pushSubscription as PushSubscriptionData | null
    if (!subscription) {
      console.log(`[Push] User ${profileId} has no push subscription`)
      return { success: true, sent: false, error: 'No push subscription' }
    }

    // Check if user has enabled push for this notification type
    const preferences = profile.notificationPreferences as Array<{
      id: string
      email: boolean
      push: boolean
    }> | null

    if (preferences) {
      const pref = preferences.find(p => p.id === notificationType)
      if (pref && !pref.push) {
        console.log(`[Push] User ${profileId} has disabled push for ${notificationType}`)
        return { success: true, sent: false, error: 'Push disabled for this type' }
      }
    }

    // Send the push notification
    const result = await sendPushNotification(subscription, payload)

    // If subscription is expired/invalid, remove it from the database
    if (!result.success && result.error?.includes('expired')) {
      await prisma.profile.update({
        where: { id: profileId },
        data: { pushSubscription: Prisma.DbNull },
      })
      console.log(`[Push] Removed expired subscription for user ${profileId}`)
    }

    return { success: result.success, sent: result.success, error: result.error }
  } catch (error) {
    console.error('[Push] Error sending push to user:', error)
    return {
      success: false,
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send scheduled post notification
 */
export async function sendScheduledPostNotification(
  profileId: string,
  platforms: string[],
  scheduledTime: Date
): Promise<{ success: boolean; sent: boolean }> {
  const platformList = platforms.join(', ')
  const timeStr = scheduledTime.toLocaleString()

  return sendPushToUser(profileId, 'scheduled', {
    title: 'Post Scheduled',
    body: `Your post has been scheduled for ${platformList} at ${timeStr}`,
    url: '/schedule',
    tag: 'scheduled-post',
  })
}

/**
 * Send published post notification
 */
export async function sendPublishedPostNotification(
  profileId: string,
  platforms: string[],
  status: 'success' | 'partial' | 'failed',
  failedPlatforms?: string[]
): Promise<{ success: boolean; sent: boolean }> {
  let title: string
  let body: string

  if (status === 'success') {
    title = 'Post Published!'
    body = `Your post has been successfully published to ${platforms.join(', ')}`
  } else if (status === 'partial') {
    title = 'Post Partially Published'
    body = `Post published to some platforms. Failed: ${failedPlatforms?.join(', ')}`
  } else {
    title = 'Post Failed'
    body = `Failed to publish your post to ${platforms.join(', ')}`
  }

  return sendPushToUser(profileId, 'published', {
    title,
    body,
    url: '/schedule',
    tag: 'published-post',
  })
}

/**
 * Store a push subscription for a user
 */
export async function storePushSubscription(
  profileId: string,
  subscription: PushSubscriptionData
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.profile.update({
      where: { id: profileId },
      data: { pushSubscription: subscription as any },
    })
    console.log(`[Push] Stored subscription for user ${profileId}`)
    return { success: true }
  } catch (error) {
    console.error('[Push] Failed to store subscription:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Remove push subscription for a user
 */
export async function removePushSubscription(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.profile.update({
      where: { id: profileId },
      data: { pushSubscription: Prisma.DbNull },
    })
    console.log(`[Push] Removed subscription for user ${profileId}`)
    return { success: true }
  } catch (error) {
    console.error('[Push] Failed to remove subscription:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a user has an active push subscription
 */
export async function hasPushSubscription(profileId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { pushSubscription: true },
  })
  return Boolean(profile?.pushSubscription)
}
