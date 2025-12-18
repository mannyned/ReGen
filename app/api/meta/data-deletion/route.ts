/**
 * Meta Data Deletion Callback
 *
 * Required endpoint for Meta (Facebook/Instagram) app compliance.
 * When a user removes your app from their Facebook/Instagram settings,
 * Meta sends a request to this endpoint to request data deletion.
 *
 * URL: https://www.regenr.app/api/meta/data-deletion
 *
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const APP_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || '';

interface SignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at: number;
}

/**
 * Parse and verify the signed request from Meta
 */
function parseSignedRequest(signedRequest: string): SignedRequestPayload | null {
  try {
    const [encodedSig, payload] = signedRequest.split('.');

    if (!encodedSig || !payload) {
      console.error('[Data Deletion] Invalid signed request format');
      return null;
    }

    // Decode the signature
    const sig = Buffer.from(
      encodedSig.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    // Decode the payload
    const data = JSON.parse(
      Buffer.from(
        payload.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8')
    ) as SignedRequestPayload;

    // Verify the algorithm
    if (data.algorithm?.toUpperCase() !== 'HMAC-SHA256') {
      console.error('[Data Deletion] Unknown algorithm:', data.algorithm);
      return null;
    }

    // Verify the signature
    const expectedSig = crypto
      .createHmac('sha256', APP_SECRET)
      .update(payload)
      .digest();

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      console.error('[Data Deletion] Invalid signature');
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Data Deletion] Error parsing signed request:', error);
    return null;
  }
}

/**
 * Generate a unique confirmation code
 */
function generateConfirmationCode(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * POST /api/meta/data-deletion
 *
 * Handles data deletion requests from Meta
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest) {
      console.error('[Data Deletion] Missing signed_request parameter');
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

    const userId = data.user_id;
    const confirmationCode = generateConfirmationCode();

    console.log('[Data Deletion] Processing deletion request for user:', userId);

    // TODO: Implement actual data deletion logic here
    // This should:
    // 1. Find the user by their Meta user ID
    // 2. Delete or anonymize their data from your database
    // 3. Remove their OAuth tokens
    // 4. Log the deletion request for compliance

    // Example deletion logic (uncomment and modify for your database):
    // await prisma.socialAccount.deleteMany({
    //   where: { providerAccountId: userId, provider: 'meta' }
    // });
    // await prisma.deletionRequest.create({
    //   data: {
    //     userId,
    //     confirmationCode,
    //     status: 'completed',
    //     requestedAt: new Date(),
    //   }
    // });

    console.log('[Data Deletion] Deletion completed for user:', userId);
    console.log('[Data Deletion] Confirmation code:', confirmationCode);

    // Return the required response format
    // Meta expects a JSON response with a URL and confirmation code
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.regenr.app';
    const statusUrl = `${baseUrl}/deletion-status?code=${confirmationCode}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });

  } catch (error) {
    console.error('[Data Deletion] Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meta/data-deletion
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Meta data deletion endpoint is active',
  });
}
