/**
 * Meta Webhook Endpoint
 *
 * GET: Webhook verification (Meta sends challenge)
 * POST: Receive webhook events (comments, messages, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WEBHOOK_VERIFY_TOKEN;

/**
 * GET /api/webhooks/meta
 *
 * Meta webhook verification. Meta sends:
 * - hub.mode: "subscribe"
 * - hub.verify_token: Your verify token
 * - hub.challenge: Random string to echo back
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('[Meta Webhook] Verification request:', { mode, token: token ? '***' : null, challenge: challenge ? '***' : null });

  // Check if this is a subscription verification
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verification successful');
    // Return the challenge as plain text
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.log('[Meta Webhook] Verification failed - token mismatch');
  return NextResponse.json(
    { error: 'Verification failed' },
    { status: 403 }
  );
}

/**
 * POST /api/webhooks/meta
 *
 * Receive webhook events from Meta.
 * Events include: comments, messages, mentions, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[Meta Webhook] Event received:', JSON.stringify(body, null, 2));

    // Process different event types
    const { object, entry } = body;

    if (object === 'instagram') {
      // Handle Instagram events
      for (const event of entry || []) {
        // Process Instagram webhooks (comments, mentions, etc.)
        console.log('[Meta Webhook] Instagram event:', event);
      }
    }

    if (object === 'page') {
      // Handle Facebook Page events
      for (const event of entry || []) {
        console.log('[Meta Webhook] Page event:', event);
      }
    }

    // Always return 200 quickly to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Meta Webhook] Error processing event:', error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ received: true });
  }
}
