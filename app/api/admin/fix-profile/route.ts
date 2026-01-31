/**
 * POST /api/admin/fix-profile
 *
 * Emergency endpoint to create/fix a profile that wasn't created properly.
 * Protected by admin API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UserTier } from '@prisma/client';

export async function POST(request: NextRequest) {
  // Validate admin key
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = request.headers.get('x-admin-key');

  if (!adminKey || !providedKey || providedKey !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, email, displayName, applyBeta, durationDays = 30 } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    let betaExpiresAt: Date | null = null;
    if (applyBeta) {
      betaExpiresAt = new Date();
      betaExpiresAt.setDate(betaExpiresAt.getDate() + durationDays);
    }

    if (existingProfile) {
      // Update existing profile
      const updated = await prisma.profile.update({
        where: { id: userId },
        data: {
          displayName: displayName || existingProfile.displayName,
          ...(applyBeta && {
            tier: UserTier.PRO,
            betaUser: true,
            betaExpiresAt,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        action: 'updated',
        profile: {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          tier: updated.tier,
          betaUser: updated.betaUser,
          betaExpiresAt: updated.betaExpiresAt,
        },
      });
    } else {
      // Create new profile
      const created = await prisma.profile.create({
        data: {
          id: userId,
          email: normalizedEmail,
          displayName: displayName || normalizedEmail.split('@')[0],
          tier: applyBeta ? UserTier.PRO : UserTier.FREE,
          betaUser: applyBeta || false,
          betaExpiresAt: applyBeta ? betaExpiresAt : null,
        },
      });

      // Mark beta invite as used if it exists
      if (applyBeta) {
        await prisma.betaInvite.updateMany({
          where: { email: normalizedEmail, usedAt: null },
          data: { usedAt: new Date() },
        });
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        profile: {
          id: created.id,
          email: created.email,
          displayName: created.displayName,
          tier: created.tier,
          betaUser: created.betaUser,
          betaExpiresAt: created.betaExpiresAt,
        },
      });
    }
  } catch (error) {
    console.error('[Admin] Fix profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fix profile', details: String(error) },
      { status: 500 }
    );
  }
}
