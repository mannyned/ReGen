/**
 * Subscription Expiration Reminders Job
 *
 * Finds subscriptions scheduled for cancellation and sends
 * reminder emails at configured intervals before expiration.
 */

import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendSubscriptionExpiringEmail } from '@/lib/email/subscription-notifications';
import type Stripe from 'stripe';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Days before expiration to send reminders.
 * Reminders are sent once per interval.
 */
const REMINDER_DAYS = [7, 3, 1] as const;

/**
 * Key prefix for tracking sent reminders in profile metadata
 */
const REMINDER_KEY_PREFIX = 'subscription_reminder_sent_';

// ============================================
// TYPES
// ============================================

interface ReminderResult {
  profileId: string;
  email: string;
  daysLeft: number;
  success: boolean;
  error?: string;
}

interface JobResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  results: ReminderResult[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate days until a date
 */
function daysUntil(date: Date): number {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get the appropriate reminder interval for days left
 */
function getReminderInterval(daysLeft: number): number | null {
  for (const days of REMINDER_DAYS) {
    if (daysLeft <= days) {
      return days;
    }
  }
  return null;
}

/**
 * Check if reminder was already sent for this interval
 */
async function wasReminderSent(
  profileId: string,
  subscriptionId: string,
  interval: number
): Promise<boolean> {
  // Check in our database for sent reminders
  const reminders = await prisma.notificationLog.findMany({
    where: {
      profileId,
      type: 'SUBSCRIPTION_EXPIRING',
      createdAt: {
        // Only consider reminders sent in the last 30 days
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Check if this specific interval was already sent for this subscription
  return reminders.some((reminder) => {
    const metadata = reminder.metadata as Record<string, unknown> | null;
    return (
      metadata?.subscriptionId === subscriptionId &&
      metadata?.interval === interval
    );
  });
}

/**
 * Record that a reminder was sent
 */
async function recordReminderSent(
  profileId: string,
  subscriptionId: string,
  interval: number,
  email: string
): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      profileId,
      type: 'SUBSCRIPTION_EXPIRING',
      channel: 'EMAIL',
      recipient: email,
      metadata: {
        subscriptionId,
        interval,
        sentAt: new Date().toISOString(),
      },
    },
  });
}

// ============================================
// MAIN JOB FUNCTION
// ============================================

/**
 * Process expiring subscriptions and send reminders
 */
export async function processExpiringSubscriptions(): Promise<JobResult> {
  const result: JobResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  const stripe = getStripe();

  try {
    // Find all profiles with active subscriptions scheduled for cancellation
    const profiles = await prisma.profile.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        tier: { not: 'FREE' },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        stripeSubscriptionId: true,
        tier: true,
      },
    });

    logger.info('Processing subscription expiration reminders', {
      profileCount: profiles.length,
    });

    for (const profile of profiles) {
      if (!profile.stripeSubscriptionId) continue;

      result.processed++;

      try {
        // Get subscription from Stripe
        const subscriptionResponse = await stripe.subscriptions.retrieve(
          profile.stripeSubscriptionId
        );

        // Cast subscription to access properties (Stripe SDK v20+ type changes)
        const subscription = subscriptionResponse as unknown as {
          id: string;
          cancel_at_period_end: boolean;
          current_period_end: number;
        };

        // Only process subscriptions scheduled for cancellation
        if (!subscription.cancel_at_period_end) {
          result.skipped++;
          continue;
        }

        // Calculate days until expiration
        const expirationDate = new Date(subscription.current_period_end * 1000);
        const daysLeft = daysUntil(expirationDate);

        // Skip if already expired or too far out
        if (daysLeft <= 0 || daysLeft > Math.max(...REMINDER_DAYS)) {
          result.skipped++;
          continue;
        }

        // Determine which reminder interval applies
        const interval = getReminderInterval(daysLeft);
        if (!interval) {
          result.skipped++;
          continue;
        }

        // Check if we already sent this reminder
        const alreadySent = await wasReminderSent(
          profile.id,
          subscription.id,
          interval
        );

        if (alreadySent) {
          result.skipped++;
          result.results.push({
            profileId: profile.id,
            email: profile.email,
            daysLeft,
            success: true,
            error: `Reminder already sent for ${interval}-day interval`,
          });
          continue;
        }

        // Send the reminder email
        await sendSubscriptionExpiringEmail({
          profileId: profile.id,
          subscriptionId: subscription.id,
          email: profile.email,
          name: profile.displayName || undefined,
          tier: profile.tier,
          daysLeft,
          currentPeriodEnd: expirationDate,
        });

        // Record that we sent this reminder
        await recordReminderSent(
          profile.id,
          subscription.id,
          interval,
          profile.email
        );

        result.sent++;
        result.results.push({
          profileId: profile.id,
          email: profile.email,
          daysLeft,
          success: true,
        });

        logger.info('Sent subscription expiring reminder', {
          profileId: profile.id,
          daysLeft,
          interval,
        });
      } catch (error) {
        result.failed++;
        result.results.push({
          profileId: profile.id,
          email: profile.email,
          daysLeft: -1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error('Failed to process subscription reminder', {
          profileId: profile.id,
          error,
        });
      }
    }

    logger.info('Subscription reminder job completed', {
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
    });

    return result;
  } catch (error) {
    logger.error('Subscription reminder job failed', { error });
    throw error;
  }
}

// ============================================
// EXPORTS
// ============================================

export { REMINDER_DAYS, type JobResult, type ReminderResult };
