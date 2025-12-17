/**
 * POST /api/stripe/subscription/cancel
 *
 * Cancels the user's subscription at the end of the billing period.
 * The subscription will remain active until the current period ends.
 *
 * Response:
 * {
 *   success: true,
 *   subscription: {
 *     id: string,
 *     status: string,
 *     cancelAtPeriodEnd: boolean,
 *     currentPeriodEnd: string
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHandler, successResponse } from '@/lib/api';
import { getStripe, getCustomerByProfileId, getActiveSubscription } from '@/lib/stripe';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const POST = createHandler(
  async (request, context, user) => {
    // Get customer from Stripe
    const customer = await getCustomerByProfileId(user!.profileId);

    if (!customer) {
      throw new NotFoundError('No billing account found');
    }

    // Get active subscription
    const subscription = await getActiveSubscription(customer.id);

    if (!subscription) {
      throw new NotFoundError('No active subscription found');
    }

    if (subscription.cancel_at_period_end) {
      throw new BadRequestError('Subscription is already scheduled for cancellation');
    }

    const stripe = getStripe();

    // Cancel at period end (not immediately)
    const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    logger.info('Subscription cancelled', {
      profileId: user!.profileId,
      subscriptionId: subscription.id,
      currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
    });

    return successResponse({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
      },
    });
  },
  { auth: true }
);

/**
 * DELETE /api/stripe/subscription/cancel
 *
 * Reactivates a subscription that was scheduled for cancellation.
 */
export const DELETE = createHandler(
  async (request, context, user) => {
    // Get customer from Stripe
    const customer = await getCustomerByProfileId(user!.profileId);

    if (!customer) {
      throw new NotFoundError('No billing account found');
    }

    // Get active subscription
    const subscription = await getActiveSubscription(customer.id);

    if (!subscription) {
      throw new NotFoundError('No active subscription found');
    }

    if (!subscription.cancel_at_period_end) {
      throw new BadRequestError('Subscription is not scheduled for cancellation');
    }

    const stripe = getStripe();

    // Reactivate subscription
    const reactivatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });

    logger.info('Subscription reactivated', {
      profileId: user!.profileId,
      subscriptionId: subscription.id,
    });

    return successResponse({
      success: true,
      subscription: {
        id: reactivatedSubscription.id,
        status: reactivatedSubscription.status,
        cancelAtPeriodEnd: reactivatedSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(reactivatedSubscription.current_period_end * 1000).toISOString(),
      },
    });
  },
  { auth: true }
);
