/**
 * Subscription Email Notifications
 *
 * Sends email notifications for subscription-related events.
 */

import { sendEmail, EmailTemplates } from './index';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { UserTier } from '@prisma/client';

// ============================================
// TYPES
// ============================================

interface NotificationContext {
  profileId: string;
  email?: string;
  name?: string;
  tier?: UserTier;
}

interface PaymentContext extends NotificationContext {
  amount: number;
  currency: string;
  invoiceUrl?: string;
}

interface SubscriptionContext extends NotificationContext {
  subscriptionId: string;
  currentPeriodEnd?: Date;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getProfileDetails(profileId: string): Promise<{
  email: string;
  name: string;
  tier: UserTier;
} | null> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        email: true,
        displayName: true,
        tier: true,
      },
    });

    if (!profile) return null;

    return {
      email: profile.email,
      name: profile.displayName || profile.email.split('@')[0],
      tier: profile.tier,
    };
  } catch (error) {
    logger.error('Failed to get profile for notification', { profileId, error });
    return null;
  }
}

function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getTierDisplayName(tier: UserTier): string {
  const names: Record<UserTier, string> = {
    FREE: 'Free',
    CREATOR: 'Creator',
    PRO: 'Pro',
  };
  return names[tier] || tier;
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * Send welcome email when user subscribes to a paid plan
 */
export async function sendSubscriptionWelcomeEmail(
  context: SubscriptionContext
): Promise<void> {
  const profile = await getProfileDetails(context.profileId);
  if (!profile) return;

  const email = context.email || profile.email;
  const tier = context.tier || profile.tier;

  await sendEmail({
    to: email,
    subject: `Welcome to ${getTierDisplayName(tier)}! 🎉`,
    template: EmailTemplates.SUBSCRIPTION_WELCOME,
    data: {
      name: context.name || profile.name,
      tier: getTierDisplayName(tier),
    },
  });

  logger.info('Sent subscription welcome email', {
    profileId: context.profileId,
    tier,
  });
}

/**
 * Send email when subscription is renewed (payment successful)
 */
export async function sendSubscriptionRenewedEmail(
  context: PaymentContext & { nextBillingDate?: Date }
): Promise<void> {
  const profile = await getProfileDetails(context.profileId);
  if (!profile) return;

  const email = context.email || profile.email;
  const tier = context.tier || profile.tier;

  await sendEmail({
    to: email,
    subject: 'Payment Successful - Subscription Renewed',
    template: EmailTemplates.SUBSCRIPTION_RENEWED,
    data: {
      name: context.name || profile.name,
      tier: getTierDisplayName(tier),
      amount: formatCurrency(context.amount, context.currency),
      nextBillingDate: context.nextBillingDate
        ? formatDate(context.nextBillingDate)
        : 'next month',
    },
  });

  logger.info('Sent subscription renewed email', {
    profileId: context.profileId,
    amount: context.amount,
  });
}

/**
 * Send email when subscription is cancelled
 */
export async function sendSubscriptionCancelledEmail(
  context: SubscriptionContext
): Promise<void> {
  const profile = await getProfileDetails(context.profileId);
  if (!profile) return;

  const email = context.email || profile.email;
  const tier = context.tier || profile.tier;

  await sendEmail({
    to: email,
    subject: 'Subscription Cancelled',
    template: EmailTemplates.SUBSCRIPTION_CANCELLED,
    data: {
      name: context.name || profile.name,
      tier: getTierDisplayName(tier),
      endDate: context.currentPeriodEnd
        ? formatDate(context.currentPeriodEnd)
        : 'end of billing period',
    },
  });

  logger.info('Sent subscription cancelled email', {
    profileId: context.profileId,
    endDate: context.currentPeriodEnd,
  });
}

/**
 * Send email when subscription is reactivated
 */
export async function sendSubscriptionReactivatedEmail(
  context: SubscriptionContext
): Promise<void> {
  const profile = await getProfileDetails(context.profileId);
  if (!profile) return;

  const email = context.email || profile.email;
  const tier = context.tier || profile.tier;

  await sendEmail({
    to: email,
    subject: 'Subscription Reactivated - Welcome Back! 🎉',
    template: EmailTemplates.SUBSCRIPTION_REACTIVATED,
    data: {
      name: context.name || profile.name,
      tier: getTierDisplayName(tier),
    },
  });

  logger.info('Sent subscription reactivated email', {
    profileId: context.profileId,
  });
}

/**
 * Send reminder email when subscription is about to expire
 */
export async function sendSubscriptionExpiringEmail(
  context: SubscriptionContext & { daysLeft: number }
): Promise<void> {
  const profile = await getProfileDetails(context.profileId);
  if (!profile) return;

  const email = context.email || profile.email;
  const tier = context.tier || profile.tier;

  await sendEmail({
    to: email,
    subject: `Your subscription expires ${context.daysLeft === 1 ? 'tomorrow' : `in ${context.daysLeft} days`}`,
    template: EmailTemplates.SUBSCRIPTION_EXPIRING,
    data: {
      name: context.name || profile.name,
      tier: getTierDisplayName(tier),
      daysLeft: context.daysLeft,
      endDate: context.currentPeriodEnd
        ? formatDate(context.currentPeriodEnd)
        : 'soon',
    },
  });

  logger.info('Sent subscription expiring email', {
    profileId: context.profileId,
    daysLeft: context.daysLeft,
  });
}

/**
 * Send email when payment fails
 */
export async function sendPaymentFailedEmail(
  context: PaymentContext
): Promise<void> {
  const profile = await getProfileDetails(context.profileId);
  if (!profile) return;

  const email = context.email || profile.email;

  await sendEmail({
    to: email,
    subject: 'Action Required: Payment Failed',
    template: EmailTemplates.PAYMENT_FAILED,
    data: {
      name: context.name || profile.name,
      amount: formatCurrency(context.amount, context.currency),
    },
  });

  logger.info('Sent payment failed email', {
    profileId: context.profileId,
    amount: context.amount,
  });
}

/**
 * Send email when payment succeeds (for retried payments)
 */
export async function sendPaymentSucceededEmail(
  context: PaymentContext
): Promise<void> {
  const profile = await getProfileDetails(context.profileId);
  if (!profile) return;

  const email = context.email || profile.email;

  await sendEmail({
    to: email,
    subject: 'Payment Received',
    template: EmailTemplates.PAYMENT_SUCCEEDED,
    data: {
      name: context.name || profile.name,
      amount: formatCurrency(context.amount, context.currency),
      invoiceUrl: context.invoiceUrl,
    },
  });

  logger.info('Sent payment succeeded email', {
    profileId: context.profileId,
    amount: context.amount,
  });
}

// ============================================
// EXPORTS
// ============================================

export {
  getProfileDetails,
  formatCurrency,
  formatDate,
  getTierDisplayName,
};
