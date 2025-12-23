/**
 * Accept Team Invite API
 *
 * POST /api/team/invites/accept - Accept an invite using token
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/team/invites/accept
 * Accept an invite to join a team
 */
export async function POST(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      );
    }

    // Find the invite
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite token' },
        { status: 404 }
      );
    }

    // Check if invite is expired
    if (invite.expiresAt < new Date()) {
      // Delete expired invite
      await prisma.teamInvite.delete({
        where: { id: invite.id },
      });

      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 400 }
      );
    }

    // Check if invite is for the current user's email
    if (invite.email.toLowerCase() !== user!.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if user already owns a team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (ownedTeam) {
      return NextResponse.json(
        { error: 'You already own a team. Transfer ownership or delete your team first.' },
        { status: 400 }
      );
    }

    // Check if user is already a member of a team
    const existingMembership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of a team. Leave your current team first.' },
        { status: 400 }
      );
    }

    // Create the membership and delete the invite in a transaction
    const [membership] = await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: user!.profileId,
          role: invite.role,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.teamInvite.delete({
        where: { id: invite.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      team: {
        id: membership.team.id,
        name: membership.team.name,
      },
      role: membership.role,
    });
  } catch (error) {
    console.error('[Accept Invite Error]', error);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
