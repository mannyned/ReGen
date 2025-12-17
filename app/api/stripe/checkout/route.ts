/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for tier upgrade.
 *
 * Request body:
 * {
 *   tier: 'CREATOR' | 'PRO',
 *   interval: 'monthly' | 'yearly'
 * }
 *
 * Response:
 * {
 *   sessionId: string,
 *   url: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createValidatedHandler, z, successResponse } from '@/lib/api';
import { createCheckoutSession, STRIPE_PRICES } from '@/lib/stripe';
import { ForbiddenError, BadRequestError } from '@/lib/errors';

const checkoutSchema = z.object({
  tier: z.enum(['CREATOR', 'PRO']),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
});

export const POST = createValidatedHandler(
  async (request, context, { body, user }) => {
    const { tier, interval } = body;

    // Check if user is upgrading (not downgrading)
    const tierLevels = { FREE: 0, CREATOR: 1, PRO: 2 };
    if (tierLevels[tier] <= tierLevels[user!.tier]) {
      throw new BadRequestError(
        `You already have ${user!.tier} tier. Use the billing portal to manage your subscription.`
      );
    }

    // Create checkout session
    const session = await createCheckoutSession({
      profileId: user!.profileId,
      email: user!.email,
      targetTier: tier,
      interval,
      currentTier: user!.tier,
    });

    return successResponse({
      sessionId: session.id,
      url: session.url,
    });
  },
  {
    auth: true,
    body: checkoutSchema,
    rateLimit: true,
  }
);

/**
 * GET /api/stripe/checkout
 *
 * Get pricing information for all tiers, or checkout session details.
 *
 * Query params:
 * - session_id: Optional. If provided, returns session details instead of pricing.
 */
import { getCheckoutSession, getTierFromPriceId } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  // If session_id provided, return session details
  if (sessionId) {
    try {
      const session = await getCheckoutSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Get tier from line items
      let tier: string | null = null;
      let interval: string | null = null;

      if (session.line_items?.data?.[0]?.price) {
        const price = session.line_items.data[0].price;
        tier = getTierFromPriceId(price.id);
        interval = price.recurring?.interval || null;
      }

      // Fallback to metadata
      if (!tier && session.metadata?.targetTier) {
        tier = session.metadata.targetTier;
      }

      return successResponse({
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email || session.customer_email,
        amountTotal: session.amount_total,
        currency: session.currency,
        tier,
        interval,
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      );
    }
  }

  // Return pricing information
  const pricing = {
    CREATOR: {
      monthly: {
        amount: STRIPE_PRICES.CREATOR.monthlyAmount / 100,
        currency: 'USD',
      },
      yearly: {
        amount: STRIPE_PRICES.CREATOR.yearlyAmount / 100,
        currency: 'USD',
        savings: (STRIPE_PRICES.CREATOR.monthlyAmount * 12 - STRIPE_PRICES.CREATOR.yearlyAmount) / 100,
      },
    },
    PRO: {
      monthly: {
        amount: STRIPE_PRICES.PRO.monthlyAmount / 100,
        currency: 'USD',
      },
      yearly: {
        amount: STRIPE_PRICES.PRO.yearlyAmount / 100,
        currency: 'USD',
        savings: (STRIPE_PRICES.PRO.monthlyAmount * 12 - STRIPE_PRICES.PRO.yearlyAmount) / 100,
      },
    },
  };

  return successResponse({ pricing });
}
