import webpush from 'web-push'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ============================================
// WEB PUSH NOTIFICATION SERVICE
// Supports multiple devices per user
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

// Extended subscription with device info for multi-device support
export interface DeviceSubscription extends PushSubscriptionData {
  deviceId: string      // Unique identifier for this device
  deviceName?: string   // Optional friendly name (e.g., "iPhone", "Chrome on Windows")
  createdAt: string     // ISO timestamp when subscription was created
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
): Promise<{ success: boolean; error?: string; expired?: boolean }> {
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
    console.log('[Push] Notification sent successfully to endpoint:', subscription.endpoint.substring(0, 50))
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Push] Failed to send notification:', errorMessage)

    // Handle expired or invalid subscriptions
    if (error instanceof webpush.WebPushError) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is invalid
        return { success: false, error: 'Subscription expired or invalid', expired: true }
      }
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Get all push subscriptions for a user
 * Handles both legacy single subscription and new multi-device array format
 */
async function getUserSubscriptions(profileId: string): Promise<DeviceSubscription[]> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { pushSubscription: true },
  })

  if (!profile?.pushSubscription) {
    return []
  }

  const data = profile.pushSubscription as unknown

  // Handle array format (new multi-device)
  if (Array.isArray(data)) {
    return data as DeviceSubscription[]
  }

  // Handle legacy single subscription format - convert to array
  const legacySub = data as PushSubscriptionData
  if (legacySub.endpoint) {
    return [{
      ...legacySub,
      deviceId: 'legacy-device',
      createdAt: new Date().toISOString(),
    }]
  }

  return []
}

/**
 * Send a push notification to ALL of a user's devices
 * Checks user's notification preferences before sending
 */
export async function sendPushToUser(
  profileId: string,
  notificationType: NotificationTypeId,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  try {
    // Fetch user's profile with notification preferences
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        pushSubscription: true,
        notificationPreferences: true,
      },
    })

    if (!profile) {
      return { success: false, sent: 0, failed: 0, error: 'Profile not found' }
    }

    // Get all subscriptions
    const subscriptions = await getUserSubscriptions(profileId)
    if (subscriptions.length === 0) {
      console.log(`[Push] User ${profileId} has no push subscriptions`)
      return { success: true, sent: 0, failed: 0, error: 'No push subscriptions' }
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
        return { success: true, sent: 0, failed: 0, error: 'Push disabled for this type' }
      }
    }

    // Send to ALL subscriptions
    console.log(`[Push] Sending notification to ${subscriptions.length} device(s) for user ${profileId}`)
    let sent = 0
    let failed = 0
    const expiredDeviceIds: string[] = []

    for (const subscription of subscriptions) {
      const result = await sendPushNotification(subscription, payload)
      if (result.success) {
        sent++
      } else {
        failed++
        // Track expired subscriptions for cleanup
        if (result.expired) {
          expiredDeviceIds.push(subscription.deviceId)
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredDeviceIds.length > 0) {
      const validSubscriptions = subscriptions.filter(
        s => !expiredDeviceIds.includes(s.deviceId)
      )
      await prisma.profile.update({
        where: { id: profileId },
        data: {
          pushSubscription: validSubscriptions.length > 0
            ? (validSubscriptions as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      })
      console.log(`[Push] Removed ${expiredDeviceIds.length} expired subscription(s) for user ${profileId}`)
    }

    return { success: sent > 0, sent, failed }
  } catch (error) {
    console.error('[Push] Error sending push to user:', error)
    return {
      success: false,
      sent: 0,
      failed: 0,
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
): Promise<{ success: boolean; sent: number }> {
  const platformList = platforms.join(', ')
  const timeStr = scheduledTime.toLocaleString()

  const result = await sendPushToUser(profileId, 'scheduled', {
    title: 'Post Scheduled',
    body: `Your post has been scheduled for ${platformList} at ${timeStr}`,
    url: '/schedule',
    tag: 'scheduled-post',
  })
  return { success: result.success, sent: result.sent }
}

/**
 * Send published post notification
 */
export async function sendPublishedPostNotification(
  profileId: string,
  platforms: string[],
  status: 'success' | 'partial' | 'failed',
  failedPlatforms?: string[]
): Promise<{ success: boolean; sent: number }> {
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

  const result = await sendPushToUser(profileId, 'published', {
    title,
    body,
    url: '/schedule',
    tag: 'published-post',
  })
  return { success: result.success, sent: result.sent }
}

/**
 * Store a push subscription for a user's device
 * Supports multiple devices - adds to existing subscriptions
 */
export async function storePushSubscription(
  profileId: string,
  subscription: PushSubscriptionData,
  deviceId?: string,
  deviceName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get existing subscriptions
    const existingSubscriptions = await getUserSubscriptions(profileId)

    // Generate device ID if not provided
    const newDeviceId = deviceId || `device-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    // Create new device subscription
    const newSubscription: DeviceSubscription = {
      ...subscription,
      deviceId: newDeviceId,
      deviceName: deviceName,
      createdAt: new Date().toISOString(),
    }

    // Check if this device already exists (by endpoint)
    const existingIndex = existingSubscriptions.findIndex(
      s => s.endpoint === subscription.endpoint
    )

    let updatedSubscriptions: DeviceSubscription[]
    if (existingIndex >= 0) {
      // Update existing subscription for this device
      updatedSubscriptions = [...existingSubscriptions]
      updatedSubscriptions[existingIndex] = {
        ...newSubscription,
        deviceId: existingSubscriptions[existingIndex].deviceId, // Keep original device ID
        deviceName: deviceName || existingSubscriptions[existingIndex].deviceName,
      }
      console.log(`[Push] Updated subscription for device ${updatedSubscriptions[existingIndex].deviceId}`)
    } else {
      // Add new subscription
      updatedSubscriptions = [...existingSubscriptions, newSubscription]
      console.log(`[Push] Added new subscription for device ${newDeviceId}`)
    }

    await prisma.profile.update({
      where: { id: profileId },
      data: { pushSubscription: updatedSubscriptions as unknown as Prisma.InputJsonValue },
    })

    console.log(`[Push] User ${profileId} now has ${updatedSubscriptions.length} device(s) subscribed`)
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
 * Remove push subscription for a specific device
 */
export async function removePushSubscription(
  profileId: string,
  deviceId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!deviceId) {
      // Remove all subscriptions
      await prisma.profile.update({
        where: { id: profileId },
        data: { pushSubscription: Prisma.DbNull },
      })
      console.log(`[Push] Removed all subscriptions for user ${profileId}`)
      return { success: true }
    }

    // Remove specific device
    const existingSubscriptions = await getUserSubscriptions(profileId)
    const updatedSubscriptions = existingSubscriptions.filter(s => s.deviceId !== deviceId)

    await prisma.profile.update({
      where: { id: profileId },
      data: {
        pushSubscription: updatedSubscriptions.length > 0
          ? (updatedSubscriptions as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    })

    console.log(`[Push] Removed device ${deviceId} for user ${profileId}`)
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
 * Check if a user has any active push subscriptions
 */
export async function hasPushSubscription(profileId: string): Promise<boolean> {
  const subscriptions = await getUserSubscriptions(profileId)
  return subscriptions.length > 0
}

/**
 * Get count of subscribed devices for a user
 */
export async function getSubscribedDeviceCount(profileId: string): Promise<number> {
  const subscriptions = await getUserSubscriptions(profileId)
  return subscriptions.length
}
