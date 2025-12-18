/**
 * Stripe Checkout and Portal
 *
 * Handles checkout session creation and customer portal access.
 */

import Stripe from 'stripe';
import {
  getStripe,
  getPriceId,
  getBaseUrl,
  CHECKOUT_URLS,
  getPortalReturnUrl,
  METADATA_KEYS,
  type BillingInterval,
} from './config';
import { getOrCreateCustomer, getActiveSubscription } from './customers';
import { logger } from '@/lib/logger';
import type { UserTier } from '@prisma/client';

// ============================================
// CHECKOUT SESSION
// ============================================

export interface CreateCheckoutOptions {
  /** User's profile ID */
  profileId: string;
  /** User's email */
  email: string;
  /** User's name (optional) */
  name?: string;
  /** Target tier */
  targetTier: Exclude<UserTier, 'FREE'>;
  /** Billing interval */
  interval: BillingInterval;
  /** Current tier (for metadata) */
  currentTier?: UserTier;
  /** Allow promotion codes */
  allowPromotionCodes?: boolean;
  /** Trial period days (for new customers) */
  trialDays?: number;
}

/**
 * Create a Stripe Checkout session for tier upgrade
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<Stripe.Checkout.Session> {
  const {
    profileId,
    email,
    name,
    targetTier,
    interval,
    currentTier,
    allowPromotionCodes = true,
    trialDays,
  } = options;

  const stripe = getStripe();

  // Get or create customer
  const customer = await getOrCreateCustomer(profileId, email, name);

  // Check for existing subscription
  const existingSubscription = await getActiveSubscription(customer.id);
  if (existingSubscription) {
    throw new Error(
      'You already have an active subscription. ' +
      'Please manage it from the billing portal.'
    );
  }

  // Get price ID
  const priceId = getPriceId(targetTier, interval);
  if (!priceId) {
    throw new Error(`No price configured for tier: ${targetTier}`);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: CHECKOUT_URLS.success('{CHECKOUT_SESSION_ID}'),
    cancel_url: CHECKOUT_URLS.cancel(),
    allow_promotion_codes: allowPromotionCodes,
    billing_address_collection: 'auto',
    subscription_data: {
      metadata: {
        [METADATA_KEYS.profileId]: profileId,
        [METADATA_KEYS.targetTier]: targetTier,
        ...(currentTier && { [METADATA_KEYS.previousTier]: currentTier }),
      },
      ...(trialDays && { trial_period_days: trialDays }),
    },
    metadata: {
      [METADATA_KEYS.profileId]: profileId,
      [METADATA_KEYS.targetTier]: targetTier,
    },
  });

  logger.info('Created checkout session', {
    profileId,
    targetTier,
    interval,
    sessionId: session.id,
  });

  return session;
}

/**
 * Retrieve checkout session details
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  const stripe = getStripe();

  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer', 'line_items.data.price'],
    });
  } catch {
    return null;
  }
}

// ============================================
// CUSTOMER PORTAL
// ============================================

/**
 * Create a customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || getPortalReturnUrl(),
  });

  logger.info('Created portal session', {
    customerId,
    sessionId: session.id,
  });

  return session;
}

/**
 * Create portal session for a user
 */
export async function createPortalSessionForUser(
  profileId: string,
  email: string
): Promise<Stripe.BillingPortal.Session> {
  const customer = await getOrCreateCustomer(profileId, email);
  return createPortalSession(customer.id);
}

// ============================================
// UPGRADE/DOWNGRADE
// ============================================

export interface ChangeSubscriptionOptions {
  /** User's profile ID */
  profileId: string;
  /** User's email */
  email: string;
  /** New tier */
  newTier: UserTier;
  /** Billing interval (for upgrades) */
  interval?: BillingInterval;
}

/**
 * Change subscription tier
 *
 * For upgrades: Creates checkout session
 * For downgrades: Schedules downgrade at period end
 * For cancel: Cancels at period end
 */
export async function changeSubscription(
  options: ChangeSubscriptionOptions
): Promise<{
  action: 'checkout' | 'updated' | 'canceled' | 'none';
  url?: string;
  subscription?: Stripe.Subscription;
}> {
  const { profileId, email, newTier, interval = 'monthly' } = options;

  // Get customer
  const customer = await getOrCreateCustomer(profileId, email);
  const subscription = await getActiveSubscription(customer.id);

  // No subscription - create checkout for paid tier
  if (!subscription) {
    if (newTier === 'FREE') {
      return { action: 'none' };
    }

    const session = await createCheckoutSession({
      profileId,
      email,
      targetTier: newTier as Exclude<UserTier, 'FREE'>,
      interval,
    });

    return { action: 'checkout', url: session.url! };
  }

  // Has subscription

  // Downgrade to FREE - cancel subscription
  if (newTier === 'FREE') {
    const stripe = getStripe();
    const canceled = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });
    return { action: 'canceled', subscription: canceled };
  }

  // Change to different paid tier
  const priceId = getPriceId(newTier, interval);
  if (!priceId) {
    throw new Error(`No price configured for tier: ${newTier}`);
  }

  const stripe = getStripe();
  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      [METADATA_KEYS.targetTier]: newTier,
    },
  });

  return { action: 'updated', subscription: updated };
}

// ============================================
// INVOICE PREVIEW
// ============================================

/**
 * Preview upcoming invoice for subscription change
 */
export async function previewProration(
  customerId: string,
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Invoice> {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const invoice = await stripe.invoices.createPreview({
    customer: customerId,
    subscription: subscriptionId,
    subscription_details: {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    },
  });

  return invoice;
}
