/**
 * Stripe Customer Management
 *
 * Handles creating and managing Stripe customers.
 */

import Stripe from 'stripe';
import { getStripe, METADATA_KEYS } from './config';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ============================================
// CUSTOMER OPERATIONS
// ============================================

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  profileId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  const stripe = getStripe();

  // Check if user already has a Stripe customer ID
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { stripeCustomerId: true },
  });

  if (profile?.stripeCustomerId) {
    try {
      // Verify customer still exists in Stripe
      const customer = await stripe.customers.retrieve(profile.stripeCustomerId);
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch (error) {
      // Customer doesn't exist, create new one
      logger.warn('Stripe customer not found, creating new', { profileId });
    }
  }

  // Check if customer exists by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    const customer = existingCustomers.data[0];

    // Update profile with customer ID
    await prisma.profile.update({
      where: { id: profileId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      [METADATA_KEYS.profileId]: profileId,
    },
  });

  // Save customer ID to profile
  await prisma.profile.update({
    where: { id: profileId },
    data: { stripeCustomerId: customer.id },
  });

  logger.info('Created Stripe customer', {
    profileId,
    customerId: customer.id,
  });

  return customer;
}

/**
 * Get customer by profile ID
 */
export async function getCustomerByProfileId(
  profileId: string
): Promise<Stripe.Customer | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { stripeCustomerId: true },
  });

  if (!profile?.stripeCustomerId) {
    return null;
  }

  const stripe = getStripe();

  try {
    const customer = await stripe.customers.retrieve(profile.stripeCustomerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch {
    return null;
  }
}

/**
 * Update customer email
 */
export async function updateCustomerEmail(
  customerId: string,
  email: string
): Promise<Stripe.Customer> {
  const stripe = getStripe();
  return stripe.customers.update(customerId, { email });
}

// ============================================
// SUBSCRIPTION OPERATIONS
// ============================================

/**
 * Get active subscription for a customer
 */
export async function getActiveSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  return subscriptions.data[0] || null;
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Update subscription to new price
 */
export async function updateSubscriptionPrice(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}

// ============================================
// PAYMENT METHOD OPERATIONS
// ============================================

/**
 * Get customer's default payment method
 */
export async function getDefaultPaymentMethod(
  customerId: string
): Promise<Stripe.PaymentMethod | null> {
  const stripe = getStripe();

  const customer = await stripe.customers.retrieve(customerId, {
    expand: ['invoice_settings.default_payment_method'],
  });

  if (customer.deleted) {
    return null;
  }

  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPm === 'object' && defaultPm !== null) {
    return defaultPm as Stripe.PaymentMethod;
  }

  return null;
}

/**
 * List customer's payment methods
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const stripe = getStripe();

  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return methods.data;
}
