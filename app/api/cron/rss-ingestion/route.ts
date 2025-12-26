/**
 * GET /api/cron/rss-ingestion
 *
 * Cron endpoint for polling RSS feeds and ingesting new items.
 * Should be called every 15-30 minutes by Vercel Cron.
 *
 * Authentication:
 * - Vercel Cron: Automatically authenticated via CRON_SECRET header
 * - External: Requires Authorization header with Bearer token matching CRON_SECRET
 *
 * Response:
 * {
 *   success: boolean,
 *   processed: number,
 *   successful: number,
 *   failed: number,
 *   itemsCreated: number,
 *   durationMs: number,
 *   results?: Array<IngestionResult>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runIngestionJob } from '@/lib/rss';

// Vercel Cron jobs run for up to 5 minutes on Pro plan
export const maxDuration = 300;

/**
 * Verify the cron request is authorized
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, deny all requests
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - cron endpoint disabled');
    return false;
  }

  // Check for Vercel Cron header (Vercel automatically sends this)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === cronSecret) {
    return true;
  }

  // Check for Authorization header (for external schedulers or manual triggers)
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
    console.warn('Unauthorized RSS cron request', {
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
    console.log('Starting RSS ingestion cron job');

    const result = await runIngestionJob();

    console.log('RSS ingestion cron job completed', {
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      itemsCreated: result.itemsCreated,
      durationMs: result.durationMs,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      itemsCreated: result.itemsCreated,
      durationMs: result.durationMs,
      // Include detailed results in development
      ...(process.env.NODE_ENV === 'development' && {
        results: result.results,
      }),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('RSS ingestion cron job failed', {
      error,
      duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different schedulers
export const POST = GET;
