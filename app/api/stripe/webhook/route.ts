/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events.
 *
 * IMPORTANT: This endpoint must:
 * 1. NOT use the standard auth middleware
 * 2. Read raw body for signature verification
 * 3. Return 200 quickly to acknowledge receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/stripe';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Get signature header
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('Webhook request missing signature');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify signature and parse event
    const event = await verifyWebhookSignature(body, signature);

    // Handle the event
    await handleWebhookEvent(event);

    const duration = Date.now() - startTime;
    logger.info(`Webhook processed: ${event.type}`, {
      eventId: event.id,
      durationMs: duration,
    });

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Webhook error', { error: message });

    // Return 400 for signature errors, 500 for processing errors
    const status = message.includes('signature') ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs';
