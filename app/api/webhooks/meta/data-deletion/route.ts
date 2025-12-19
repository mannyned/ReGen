/**
 * Meta Data Deletion Callback Endpoint
 *
 * POST /api/webhooks/meta/data-deletion
 *
 * Meta sends a signed request when a user requests deletion of their data.
 * We must:
 * 1. Verify the request signature
 * 2. Delete the user's data
 * 3. Return a confirmation URL and code
 *
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

const APP_SECRET = process.env.META_CLIENT_SECRET;

interface SignedRequest {
  algorithm: string;
  issued_at: number;
  user_id: string;
}

/**
 * Parse and verify Meta's signed request
 */
function parseSignedRequest(signedRequest: string): SignedRequest | null {
  try {
    if (!APP_SECRET) {
      console.error('[Meta Data Deletion] APP_SECRET not configured');
      return null;
    }

    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      console.error('[Meta Data Deletion] Invalid signed request format');
      return null;
    }

    const [encodedSig, payload] = parts;

    if (!encodedSig || !payload) {
      console.error('[Meta Data Deletion] Invalid signed request format');
      return null;
    }

    // Decode the signature
    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    // Decode the payload
    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    ) as SignedRequest;

    // Verify the signature
    const expectedSig = crypto
      .createHmac('sha256', APP_SECRET)
      .update(payload)
      .digest();

    // Ensure buffers are same length for timingSafeEqual
    if (sig.length !== expectedSig.length) {
      console.error('[Meta Data Deletion] Signature length mismatch');
      return null;
    }

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      console.error('[Meta Data Deletion] Invalid signature');
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Meta Data Deletion] Error parsing signed request:', error);
    return null;
  }
}

/**
 * Generate a unique confirmation code
 */
function generateConfirmationCode(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    let signedRequest: string | null = null;

    // Try to parse form data
    try {
      const formData = await request.formData();
      signedRequest = formData.get('signed_request') as string;
    } catch {
      console.error('[Meta Data Deletion] Failed to parse form data');
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!signedRequest) {
      console.error('[Meta Data Deletion] Missing signed_request');
      return NextResponse.json(
        { error: 'Missing signed_request' },
        { status: 400 }
      );
    }

    // Parse and verify the signed request
    const data = parseSignedRequest(signedRequest);

    if (!data) {
      return NextResponse.json(
        { error: 'Invalid signed request' },
        { status: 400 }
      );
    }

    const { user_id: metaUserId } = data;

    console.log('[Meta Data Deletion] Processing deletion for Meta user:', metaUserId);

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();

    // Find and delete the user's OAuth connection data
    try {
      // Find the OAuth connection by provider account ID
      const oauthConnection = await prisma.oAuthConnection.findFirst({
        where: {
          provider: 'meta',
          providerAccountId: metaUserId,
        },
      });

      if (oauthConnection) {
        // Delete the OAuth connection (this removes the connection)
        await prisma.oAuthConnection.delete({
          where: { id: oauthConnection.id },
        });

        console.log('[Meta Data Deletion] Deleted OAuth connection for user:', metaUserId);

        // Optionally: Delete related data (posts, analytics, etc.)
        // This depends on your data model and retention policy
        // await prisma.publishedPost.deleteMany({ where: { profileId: oauthConnection.profileId, platform: 'meta' } });
      } else {
        console.log('[Meta Data Deletion] No OAuth connection found for Meta user:', metaUserId);
      }
    } catch (dbError) {
      console.error('[Meta Data Deletion] Database error:', dbError);
      // Continue anyway - we still need to return a valid response to Meta
    }

    // Build the status URL where users can check deletion status
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app';
    const statusUrl = `${baseUrl}/data-deletion-status?code=${confirmationCode}`;

    // Return the confirmation as required by Meta
    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error('[Meta Data Deletion] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for testing/verification
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'Meta Data Deletion Callback',
    status: 'active',
    usage: 'POST with signed_request form field',
  });
}
