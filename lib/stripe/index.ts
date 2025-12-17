/**
 * Stripe Integration Module
 *
 * Provides payment processing for tier upgrades.
 *
 * @example
 * ```ts
 * import { createCheckoutSession, createPortalSession } from '@/lib/stripe';
 *
 * // Create checkout for upgrade
 * const session = await createCheckoutSession({
 *   profileId: user.profileId,
 *   email: user.email,
 *   targetTier: 'CREATOR',
 *   interval: 'monthly',
 * });
 *
 * // Redirect to: session.url
 * ```
 */

// Configuration
export {
  getStripe,
  STRIPE_PRICES,
  getPriceId,
  getTierFromPriceId,
  getTierFromProductId,
  getBaseUrl,
  CHECKOUT_URLS,
  getPortalReturnUrl,
  WEBHOOK_EVENTS,
  getWebhookSecret,
  METADATA_KEYS,
  type TierPricing,
  type BillingInterval,
  type WebhookEvent,
} from './config';

// Customer management
export {
  getOrCreateCustomer,
  getCustomerByProfileId,
  updateCustomerEmail,
  getActiveSubscription,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  updateSubscriptionPrice,
  getDefaultPaymentMethod,
  listPaymentMethods,
} from './customers';

// Checkout and portal
export {
  createCheckoutSession,
  getCheckoutSession,
  createPortalSession,
  createPortalSessionForUser,
  changeSubscription,
  previewProration,
  type CreateCheckoutOptions,
  type ChangeSubscriptionOptions,
} from './checkout';

// Webhooks
export {
  verifyWebhookSignature,
  handleWebhookEvent,
  type WebhookHandler,
} from './webhooks';
