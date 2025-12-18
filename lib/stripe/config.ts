/**
 * Stripe Configuration
 *
 * Centralized Stripe configuration for payment processing.
 * Maps tier IDs to Stripe price IDs.
 */

import Stripe from 'stripe';
import type { UserTier } from '@prisma/client';

// ============================================
// STRIPE CLIENT
// ============================================

let stripeClient: Stripe | null = null;

/**
 * Get Stripe client instance (singleton)
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not configured. ' +
        'Add it to your .env.local file.'
      );
    }

    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }

  return stripeClient;
}

// ============================================
// PRICE CONFIGURATION
// ============================================

export interface TierPricing {
  /** Stripe Price ID for monthly billing */
  monthlyPriceId: string;
  /** Stripe Price ID for yearly billing */
  yearlyPriceId: string;
  /** Monthly price in cents */
  monthlyAmount: number;
  /** Yearly price in cents */
  yearlyAmount: number;
  /** Stripe Product ID */
  productId: string;
}

/**
 * Stripe price IDs for each tier
 *
 * Replace these with your actual Stripe Price IDs from the dashboard.
 * Create products and prices at: https://dashboard.stripe.com/products
 */
export const STRIPE_PRICES: Record<Exclude<UserTier, 'FREE'>, TierPricing> = {
  CREATOR: {
    productId: process.env.STRIPE_PRODUCT_CREATOR || 'prod_creator',
    monthlyPriceId: process.env.STRIPE_PRICE_CREATOR_MONTHLY || 'price_creator_monthly',
    yearlyPriceId: process.env.STRIPE_PRICE_CREATOR_YEARLY || 'price_creator_yearly',
    monthlyAmount: 900, // $9.00
    yearlyAmount: 9000, // $90.00 (2 months free)
  },
  PRO: {
    productId: process.env.STRIPE_PRODUCT_PRO || 'prod_pro',
    monthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    yearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
    monthlyAmount: 2900, // $29.00
    yearlyAmount: 29000, // $290.00 (2 months free)
  },
};

/**
 * Billing intervals
 */
export type BillingInterval = 'monthly' | 'yearly';

/**
 * Get price ID for a tier and interval
 */
export function getPriceId(tier: UserTier, interval: BillingInterval): string | null {
  if (tier === 'FREE') return null;

  const pricing = STRIPE_PRICES[tier];
  return interval === 'monthly' ? pricing.monthlyPriceId : pricing.yearlyPriceId;
}

/**
 * Get tier from Stripe Price ID
 */
export function getTierFromPriceId(priceId: string): UserTier | null {
  for (const [tier, pricing] of Object.entries(STRIPE_PRICES)) {
    if (pricing.monthlyPriceId === priceId || pricing.yearlyPriceId === priceId) {
      return tier as UserTier;
    }
  }
  return null;
}

/**
 * Get tier from Stripe Product ID
 */
export function getTierFromProductId(productId: string): UserTier | null {
  for (const [tier, pricing] of Object.entries(STRIPE_PRICES)) {
    if (pricing.productId === productId) {
      return tier as UserTier;
    }
  }
  return null;
}

// ============================================
// URL CONFIGURATION
// ============================================

/**
 * Get the base URL for redirects
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Checkout URLs
 */
export const CHECKOUT_URLS = {
  success: (sessionId: string) => `${getBaseUrl()}/pricing/success?session_id=${sessionId}`,
  cancel: () => `${getBaseUrl()}/pricing/cancel`,
} as const;

/**
 * Customer portal return URL
 */
export function getPortalReturnUrl(): string {
  return `${getBaseUrl()}/settings/billing`;
}

// ============================================
// WEBHOOK CONFIGURATION
// ============================================

/**
 * Webhook events we handle
 */
export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

/**
 * Get webhook secret
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not configured. ' +
      'Get it from: https://dashboard.stripe.com/webhooks'
    );
  }

  return secret;
}

// ============================================
// METADATA KEYS
// ============================================

/**
 * Metadata keys used in Stripe objects
 */
export const METADATA_KEYS = {
  /** User's profile ID */
  profileId: 'profileId',
  /** Target tier for upgrade */
  targetTier: 'targetTier',
  /** Previous tier (for downgrades) */
  previousTier: 'previousTier',
} as const;
