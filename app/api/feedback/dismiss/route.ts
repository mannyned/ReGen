/**
 * POST /api/feedback/dismiss
 *
 * Dismiss a feedback prompt trigger for the current user.
 * Stores the dismissed trigger type so it won't show again.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { prisma } from '@/lib/db';
import { dismissFeedbackSchema } from '@/lib/validation/feedbackSchemas';

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
    const parsed = dismissFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid trigger type', code: 'INVALID_TRIGGER' },
        { status: 400 }
      );
    }

    const { trigger } = parsed.data;

    // Get current dismissed types
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { feedbackDismissedTypes: true },
    });

    const currentDismissed = profile?.feedbackDismissedTypes || [];

    // Only update if not already dismissed
    if (!currentDismissed.includes(trigger)) {
      await prisma.profile.update({
        where: { id: user.id },
        data: {
          feedbackDismissedTypes: [...currentDismissed, trigger],
          lastFeedbackPromptAt: new Date(),
        },
      });

      console.log('[Feedback] Dismissed trigger:', {
        userId: user.id,
        trigger,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Feedback] Error dismissing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss feedback', code: 'DISMISS_ERROR' },
      { status: 500 }
    );
  }
}
