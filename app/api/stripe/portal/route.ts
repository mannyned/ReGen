/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for managing subscription.
 *
 * Response:
 * {
 *   url: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHandler, successResponse } from '@/lib/api';
import { createPortalSessionForUser, getCustomerByProfileId } from '@/lib/stripe';
import { BadRequestError } from '@/lib/errors';

export const POST = createHandler(
  async (request, context, user) => {
    // Check if user has a Stripe customer
    const customer = await getCustomerByProfileId(user!.profileId);

    if (!customer) {
      throw new BadRequestError(
        'No billing account found. Please upgrade your plan first.'
      );
    }

    // Create portal session
    const session = await createPortalSessionForUser(
      user!.profileId,
      user!.email
    );

    return successResponse({ url: session.url });
  },
  { auth: true }
);

/**
 * GET /api/stripe/portal
 *
 * Get current subscription status.
 */
import { getActiveSubscription, getTierFromPriceId } from '@/lib/stripe';

export const GET = createHandler(
  async (request, context, user) => {
    const customer = await getCustomerByProfileId(user!.profileId);

    if (!customer) {
      return successResponse({
        hasSubscription: false,
        tier: user!.tier,
      });
    }

    const subscription = await getActiveSubscription(customer.id);

    if (!subscription) {
      return successResponse({
        hasSubscription: false,
        tier: user!.tier,
        customerId: customer.id,
      });
    }

    const priceId = subscription.items.data[0]?.price.id;
    const subscriptionTier = priceId ? getTierFromPriceId(priceId) : null;

    // Cast subscription to access properties (Stripe SDK v20+ type changes)
    const sub = subscription as unknown as {
      id: string;
      status: string;
      current_period_end: number;
      cancel_at_period_end: boolean;
      cancel_at: number | null;
    };

    return successResponse({
      hasSubscription: true,
      tier: user!.tier,
      subscription: {
        id: sub.id,
        status: sub.status,
        tier: subscriptionTier,
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        cancelAt: sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : null,
      },
    });
  },
  { auth: true }
);
