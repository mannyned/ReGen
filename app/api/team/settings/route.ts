/**
 * Team Settings API
 *
 * PATCH /api/team/settings - Update team settings (Owner/Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, forbiddenResponse } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { ANALYTICS_COPY } from '@/lib/permissions/analytics';

export const runtime = 'nodejs';

/**
 * PATCH /api/team/settings
 * Update team settings like analytics permissions
 */
export async function PATCH(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { allowMemberAccountAnalytics } = body;

    // Validate input
    if (typeof allowMemberAccountAnalytics !== 'boolean') {
      return NextResponse.json(
        { error: 'allowMemberAccountAnalytics must be a boolean' },
        { status: 400 }
      );
    }

    // Check if user owns a team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (ownedTeam) {
      await prisma.team.update({
        where: { id: ownedTeam.id },
        data: { allowMemberAccountAnalytics },
      });

      return NextResponse.json({
        success: true,
        allowMemberAccountAnalytics,
        message: allowMemberAccountAnalytics
          ? ANALYTICS_COPY.toggleOnSuccess
          : ANALYTICS_COPY.toggleOffSuccess,
      });
    }

    // Check if user is an admin of a team
    const membership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
      include: { team: true },
    });

    if (membership && membership.role === 'ADMIN') {
      await prisma.team.update({
        where: { id: membership.teamId },
        data: { allowMemberAccountAnalytics },
      });

      return NextResponse.json({
        success: true,
        allowMemberAccountAnalytics,
        message: allowMemberAccountAnalytics
          ? ANALYTICS_COPY.toggleOnSuccess
          : ANALYTICS_COPY.toggleOffSuccess,
      });
    }

    // User is either a regular member or not in a team
    return forbiddenResponse('Only team owners and admins can manage settings');
  } catch (error) {
    console.error('[Team Settings PATCH Error]', error);
    return NextResponse.json(
      { error: 'Failed to update team settings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/team/settings
 * Get team settings
 */
export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    // Check if user owns a team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
      select: {
        id: true,
        allowMemberAccountAnalytics: true,
      },
    });

    if (ownedTeam) {
      return NextResponse.json({
        allowMemberAccountAnalytics: ownedTeam.allowMemberAccountAnalytics,
        canManage: true,
      });
    }

    // Check if user is a member of a team
    const membership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
      include: {
        team: {
          select: {
            id: true,
            allowMemberAccountAnalytics: true,
          },
        },
      },
    });

    if (membership) {
      return NextResponse.json({
        allowMemberAccountAnalytics: membership.team.allowMemberAccountAnalytics,
        canManage: membership.role === 'ADMIN',
      });
    }

    return NextResponse.json({ error: 'Not part of a team' }, { status: 404 });
  } catch (error) {
    console.error('[Team Settings GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to get team settings' },
      { status: 500 }
    );
  }
}
