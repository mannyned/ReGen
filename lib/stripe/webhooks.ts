/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events to sync subscription state.
 */

import Stripe from 'stripe';
import { getStripe, getWebhookSecret, getTierFromPriceId, METADATA_KEYS } from './config';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { UserTier } from '@prisma/client';
import {
  sendSubscriptionWelcomeEmail,
  sendSubscriptionRenewedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionReactivatedEmail,
  sendPaymentFailedEmail,
  sendPaymentSucceededEmail,
} from '@/lib/email/subscription-notifications';

// ============================================
// WEBHOOK VERIFICATION
// ============================================

/**
 * Verify webhook signature and parse event
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe();
  const secret = getWebhookSecret();

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    logger.error('Webhook signature verification failed', { error });
    throw new Error('Invalid webhook signature');
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

export type WebhookHandler = (event: Stripe.Event) => Promise<void>;

/**
 * Handle checkout.session.completed
 *
 * Fired when a checkout session completes successfully.
 */
async function handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  const profileId = session.metadata?.[METADATA_KEYS.profileId];
  const targetTier = session.metadata?.[METADATA_KEYS.targetTier] as UserTier;

  if (!profileId) {
    logger.warn('Checkout completed without profileId', { sessionId: session.id });
    return;
  }

  // Update user tier
  if (targetTier) {
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        tier: targetTier,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      },
    });

    logger.info('User tier updated from checkout', {
      profileId,
      newTier: targetTier,
      subscriptionId: session.subscription,
    });

    // Send welcome email for new subscription
    await sendSubscriptionWelcomeEmail({
      profileId,
      subscriptionId: session.subscription as string,
      tier: targetTier,
    }).catch((error) => {
      logger.error('Failed to send welcome email', { profileId, error });
    });
  }
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  const profileId = subscription.metadata?.[METADATA_KEYS.profileId];
  if (!profileId) {
    logger.warn('Subscription created without profileId', {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Get tier from price
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  if (tier) {
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        tier,
        stripeSubscriptionId: subscription.id,
      },
    });

    logger.info('Subscription created', {
      profileId,
      tier,
      subscriptionId: subscription.id,
    });
  }
}

/**
 * Handle customer.subscription.updated
 *
 * Fired when a subscription is changed (upgrade, downgrade, cancel).
 */
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription & {
    current_period_end: number;
    cancel_at_period_end: boolean;
    cancel_at: number | null;
  };

  // Find profile by subscription ID
  const profile = await prisma.profile.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!profile) {
    // Try by customer ID
    const profileByCustomer = await prisma.profile.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!profileByCustomer) {
      logger.warn('Subscription updated for unknown profile', {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
      });
      return;
    }

    // Update subscription ID
    await prisma.profile.update({
      where: { id: profileByCustomer.id },
      data: { stripeSubscriptionId: subscription.id },
    });
  }

  const profileId = profile?.id || (await prisma.profile.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
  }))?.id;

  if (!profileId) return;

  // Get tier from price
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  // Handle status changes
  if (subscription.status === 'active' && tier) {
    await prisma.profile.update({
      where: { id: profileId },
      data: { tier },
    });

    logger.info('Subscription updated', {
      profileId,
      tier,
      status: subscription.status,
    });
  }

  // Handle scheduled cancellation
  if (subscription.cancel_at_period_end) {
    logger.info('Subscription scheduled for cancellation', {
      profileId,
      cancelAt: subscription.cancel_at,
    });

    // Send cancellation email
    await sendSubscriptionCancelledEmail({
      profileId,
      subscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      tier: tier ?? undefined,
    }).catch((error) => {
      logger.error('Failed to send cancellation email', { profileId, error });
    });
  }

  // Handle reactivation (was scheduled for cancellation, now active again)
  const previousAttributes = (event.data as any).previous_attributes;
  if (
    previousAttributes?.cancel_at_period_end === true &&
    !subscription.cancel_at_period_end
  ) {
    logger.info('Subscription reactivated', {
      profileId,
      subscriptionId: subscription.id,
    });

    // Send reactivation email
    await sendSubscriptionReactivatedEmail({
      profileId,
      subscriptionId: subscription.id,
      tier: tier ?? undefined,
    }).catch((error) => {
      logger.error('Failed to send reactivation email', { profileId, error });
    });
  }
}

/**
 * Handle customer.subscription.deleted
 *
 * Fired when a subscription is canceled/ended.
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  // Find profile
  const profile = await prisma.profile.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        { stripeCustomerId: subscription.customer as string },
      ],
    },
  });

  if (!profile) {
    logger.warn('Subscription deleted for unknown profile', {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Downgrade to FREE
  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      tier: 'FREE',
      stripeSubscriptionId: null,
    },
  });

  logger.info('User downgraded to FREE after subscription ended', {
    profileId: profile.id,
    subscriptionId: subscription.id,
  });
}

/**
 * Handle invoice.paid
 *
 * Fired when an invoice is paid (subscription renewal).
 */
async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice & {
    subscription: string | null;
    billing_reason: string | null;
    hosted_invoice_url: string | null;
  };

  logger.info('Invoice paid', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid,
  });

  // Find profile by customer ID
  const profile = await prisma.profile.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (!profile) {
    logger.warn('Invoice paid for unknown profile', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
    });
    return;
  }

  // Get subscription details for next billing date
  const stripe = getStripe();
  let nextBillingDate: Date | undefined;

  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string) as unknown as Stripe.Subscription & { current_period_end: number };
    nextBillingDate = new Date(subscription.current_period_end * 1000);
  }

  // For subscription renewals (not first payment), send renewal email
  if (invoice.billing_reason === 'subscription_cycle') {
    await sendSubscriptionRenewedEmail({
      profileId: profile.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      invoiceUrl: invoice.hosted_invoice_url || undefined,
      tier: profile.tier,
      nextBillingDate,
    }).catch((error) => {
      logger.error('Failed to send renewal email', { profileId: profile.id, error });
    });
  } else if (invoice.billing_reason === 'subscription_update') {
    // Payment for plan change
    await sendPaymentSucceededEmail({
      profileId: profile.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      invoiceUrl: invoice.hosted_invoice_url || undefined,
    }).catch((error) => {
      logger.error('Failed to send payment succeeded email', { profileId: profile.id, error });
    });
  }
}

/**
 * Handle invoice.payment_failed
 *
 * Fired when payment fails.
 */
async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  const profile = await prisma.profile.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (profile) {
    logger.warn('Payment failed', {
      profileId: profile.id,
      invoiceId: invoice.id,
      amount: invoice.amount_due,
    });

    // Send payment failed email
    await sendPaymentFailedEmail({
      profileId: profile.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
    }).catch((error) => {
      logger.error('Failed to send payment failed email', { profileId: profile.id, error });
    });
  }
}

// ============================================
// EVENT ROUTER
// ============================================

const eventHandlers: Record<string, WebhookHandler> = {
  'checkout.session.completed': handleCheckoutCompleted,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handlePaymentFailed,
};

/**
 * Process a webhook event
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const handler = eventHandlers[event.type];

  if (handler) {
    logger.info(`Processing webhook: ${event.type}`, { eventId: event.id });
    await handler(event);
  } else {
    logger.debug(`Unhandled webhook event: ${event.type}`, { eventId: event.id });
  }
}
