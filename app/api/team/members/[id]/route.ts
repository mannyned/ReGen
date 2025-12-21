/**
 * Team Member Management API
 *
 * PATCH /api/team/members/[id] - Change member role (Owner only)
 * DELETE /api/team/members/[id] - Remove member (Owner/Admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, forbiddenResponse } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { TeamRole } from '@prisma/client';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/team/members/[id]
 * Change a member's role (Owner only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { id: memberId } = await context.params;

  try {
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or MEMBER.' },
        { status: 400 }
      );
    }

    // Only team owner can change roles
    const team = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (!team) {
      return forbiddenResponse('Only team owners can change member roles');
    }

    // Find the member
    const member = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        teamId: team.id,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Update the role
    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: role as TeamRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
        joinedAt: updated.joinedAt,
        user: updated.user,
      },
    });
  } catch (error) {
    console.error('[Team Member PATCH Error]', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/members/[id]
 * Remove a member from the team
 * - Owner can remove anyone
 * - Admin can remove members (not other admins)
 * - Members can remove themselves (leave team)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  const { id: memberId } = await context.params;

  try {
    // Check if user owns a team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (ownedTeam) {
      // User is the owner - can remove anyone from their team
      const member = await prisma.teamMember.findFirst({
        where: {
          id: memberId,
          teamId: ownedTeam.id,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        );
      }

      await prisma.teamMember.delete({
        where: { id: memberId },
      });

      return NextResponse.json({ success: true });
    }

    // Check if user is a member of a team
    const membership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
      include: { team: true },
    });

    if (!membership) {
      return forbiddenResponse('You are not part of a team');
    }

    // Check if user is removing themselves (leaving the team)
    if (membership.id === memberId) {
      await prisma.teamMember.delete({
        where: { id: memberId },
      });

      return NextResponse.json({ success: true, leftTeam: true });
    }

    // User is trying to remove someone else - check if they're an admin
    if (membership.role !== 'ADMIN') {
      return forbiddenResponse('Only owners and admins can remove members');
    }

    // Find the target member
    const targetMember = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        teamId: membership.teamId,
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Admins cannot remove other admins
    if (targetMember.role === 'ADMIN') {
      return forbiddenResponse('Admins cannot remove other admins. Only the owner can do that.');
    }

    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Team Member DELETE Error]', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
