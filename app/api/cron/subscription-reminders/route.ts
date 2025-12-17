/**
 * GET /api/cron/subscription-reminders
 *
 * Cron endpoint for sending subscription expiration reminder emails.
 * Should be called daily by Vercel Cron or an external scheduler.
 *
 * Authentication:
 * - Vercel Cron: Automatically authenticated via CRON_SECRET header
 * - External: Requires Authorization header with Bearer token matching CRON_SECRET
 *
 * Response:
 * {
 *   success: boolean,
 *   processed: number,
 *   sent: number,
 *   skipped: number,
 *   failed: number,
 *   results?: Array<ReminderResult>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processExpiringSubscriptions } from '@/lib/jobs';
import { logger } from '@/lib/logger';

// Vercel Cron jobs run for up to 5 minutes on Pro plan
export const maxDuration = 300;

/**
 * Verify the cron request is authorized
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, deny all requests
  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured - cron endpoint disabled');
    return false;
  }

  // Check for Vercel Cron header (Vercel automatically sends this)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === cronSecret) {
    return true;
  }

  // Check for Authorization header (for external schedulers)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return token === cronSecret;
  }

  return false;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!isAuthorized(request)) {
    logger.warn('Unauthorized cron request', {
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    logger.info('Starting subscription reminders cron job');

    const result = await processExpiringSubscriptions();

    const duration = Date.now() - startTime;

    logger.info('Subscription reminders cron job completed', {
      duration,
      ...result,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      duration,
      // Include detailed results in development
      ...(process.env.NODE_ENV === 'development' && {
        results: result.results,
      }),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Subscription reminders cron job failed', {
      error,
      duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different schedulers
export const POST = GET;
