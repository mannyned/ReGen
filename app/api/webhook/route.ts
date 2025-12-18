/**
 * Webhook Endpoint
 *
 * Handles webhook verification and events from social platforms.
 *
 * Verification (GET):
 * - Meta (Facebook/Instagram): hub.mode, hub.verify_token, hub.challenge
 * - TikTok: challenge parameter
 *
 * Events (POST):
 * - Receives webhook events from connected platforms
 */

import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

/**
 * GET /api/webhook
 *
 * Handles webhook verification requests from Meta and TikTok
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Meta (Facebook/Instagram) verification
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && challenge) {
    if (token === VERIFY_TOKEN) {
      console.log('[Webhook] Meta verification successful');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error('[Webhook] Meta verification failed: token mismatch');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // TikTok verification
  const tiktokChallenge = searchParams.get('challenge');
  if (tiktokChallenge) {
    console.log('[Webhook] TikTok verification successful');
    return NextResponse.json({ challenge: tiktokChallenge }, { status: 200 });
  }

  // No valid verification request
  return NextResponse.json(
    { error: 'Missing verification parameters' },
    { status: 400 }
  );
}

/**
 * POST /api/webhook
 *
 * Handles incoming webhook events from social platforms
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[Webhook] Received event:', JSON.stringify(body, null, 2));

    // Meta webhook events
    if (body.object === 'instagram' || body.object === 'page') {
      // Handle Instagram/Facebook events
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          console.log('[Webhook] Meta event:', {
            field: change.field,
            value: change.value,
          });

          // TODO: Process specific events (mentions, comments, messages, etc.)
        }
      }

      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    // TikTok webhook events
    if (body.event) {
      console.log('[Webhook] TikTok event:', {
        event: body.event,
        data: body.data,
      });

      // TODO: Process TikTok specific events

      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    // Unknown webhook source
    console.log('[Webhook] Unknown event format:', body);
    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
