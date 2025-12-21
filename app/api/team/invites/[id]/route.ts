/**
 * Individual Team Invite API
 *
 * DELETE /api/team/invites/[id] - Cancel an invite (Owner/Admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, forbiddenResponse } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/team/invites/[id]
 * Cancel a pending invite
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { id: inviteId } = await context.params;

  try {
    // Check if user owns a team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (ownedTeam) {
      // Find the invite
      const invite = await prisma.teamInvite.findFirst({
        where: {
          id: inviteId,
          teamId: ownedTeam.id,
        },
      });

      if (!invite) {
        return NextResponse.json(
          { error: 'Invite not found' },
          { status: 404 }
        );
      }

      await prisma.teamInvite.delete({
        where: { id: inviteId },
      });

      return NextResponse.json({ success: true });
    }

    // Check if user is an admin of a team
    const membership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
    });

    if (membership && membership.role === 'ADMIN') {
      // Find the invite
      const invite = await prisma.teamInvite.findFirst({
        where: {
          id: inviteId,
          teamId: membership.teamId,
        },
      });

      if (!invite) {
        return NextResponse.json(
          { error: 'Invite not found' },
          { status: 404 }
        );
      }

      await prisma.teamInvite.delete({
        where: { id: inviteId },
      });

      return NextResponse.json({ success: true });
    }

    return forbiddenResponse('Only team owners and admins can cancel invites');
  } catch (error) {
    console.error('[Team Invite DELETE Error]', error);
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    );
  }
}
