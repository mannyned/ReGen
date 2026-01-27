/**
 * POST /api/feedback
 *
 * Submit beta feedback from authenticated beta users.
 * Collects structured feedback including usage intent, ratings, and pricing input.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { prisma } from '@/lib/db';
import { feedbackFormSchema } from '@/lib/validation/feedbackSchemas';
import { FeedbackType } from '@prisma/client';

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

    // Check if user is a beta user (including team members who inherit from owner)
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        betaUser: true,
        tier: true,
        outboundPosts: { select: { id: true }, take: 1 },
        socialConnections: { select: { provider: true } },
        // Check team membership for inherited beta status
        teamMembership: {
          select: {
            team: {
              select: {
                owner: {
                  select: { betaUser: true },
                },
              },
            },
          },
        },
      },
    });

    // Check if user is beta (directly or inherited from team owner)
    const isBetaUser = profile?.betaUser || profile?.teamMembership?.team?.owner?.betaUser || false;

    if (!isBetaUser) {
      return NextResponse.json(
        { error: 'Feedback is only available for beta users', code: 'BETA_ONLY' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = feedbackFormSchema.safeParse(body);

    if (!parsed.success) {
      console.warn('[Feedback] Validation failed:', parsed.error.flatten());
      return NextResponse.json(
        { error: 'Invalid feedback data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build pricing context if pricing feedback is provided
    const pricingContext =
      data.creatorPriceInput !== undefined || data.proPriceInput !== undefined
        ? {
            role: profile.tier,
            featuresUsed: profile.socialConnections.map((c) => c.provider),
            postsCount: profile.outboundPosts.length > 0 ? 'has_posts' : 'no_posts',
          }
        : undefined;

    // Create feedback record
    const feedback = await prisma.betaFeedback.create({
      data: {
        profileId: user.id,
        feedbackType: data.feedbackType as FeedbackType,
        usageIntent: data.usageIntent,
        featureValueRating: data.featureValueRating,
        usefulnessRating: data.usefulnessRating,
        confusionPoints: data.confusionPoints,
        missingFeatures: data.missingFeatures,
        creatorPriceInput: data.creatorPriceInput,
        proPriceInput: data.proPriceInput,
        pricingContext,
        browserInfo: data.browserInfo,
        feedbackContext: {
          submittedAt: new Date().toISOString(),
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        },
      },
    });

    // Update last feedback prompt time
    await prisma.profile.update({
      where: { id: user.id },
      data: { lastFeedbackPromptAt: new Date() },
    });

    console.log('[Feedback] Submitted successfully:', {
      feedbackId: feedback.id,
      userId: user.id,
      type: data.feedbackType,
      hasRatings: !!(data.featureValueRating || data.usefulnessRating),
      hasPricing: !!(data.creatorPriceInput || data.proPriceInput),
    });

    return NextResponse.json(
      { success: true, id: feedback.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Feedback] Error submitting feedback:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit feedback',
        code: 'SUBMIT_ERROR',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
