/**
 * POST /api/feedback/events
 *
 * Mark a first-time event as completed for the current user.
 * Used to track when users complete milestones like first post, first analytics view, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { prisma } from '@/lib/db';
import { eventCompletionSchema } from '@/lib/validation/feedbackSchemas';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = eventCompletionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event type', code: 'INVALID_EVENT' },
        { status: 400 }
      );
    }

    const { event } = parsed.data;

    // Build update data based on event type
    const updateData: Record<string, boolean> = {};

    switch (event) {
      case 'first_post':
        updateData.hasCompletedFirstPost = true;
        break;
      case 'first_analytics':
        updateData.hasViewedAnalyticsFirst = true;
        break;
      case 'first_auto_share':
        updateData.hasCompletedFirstAutoShare = true;
        break;
    }

    await prisma.profile.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log('[Feedback] Event marked completed:', {
      userId: user.id,
      event,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Feedback] Error marking event:', error);
    return NextResponse.json(
      { error: 'Failed to mark event', code: 'EVENT_ERROR' },
      { status: 500 }
    );
  }
}
