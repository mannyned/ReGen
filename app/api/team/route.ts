/**
 * Team Management API
 *
 * GET /api/team - Get current user's team (as owner or member)
 * POST /api/team - Create a new team (PRO users only)
 * PUT /api/team - Update team name (Owner/Admin only)
 * DELETE /api/team - Delete team (Owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, forbiddenResponse } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { TeamRole } from '@prisma/client';

export const runtime = 'nodejs';

// Maximum team seats for PRO plan
const MAX_TEAM_SEATS = 3;

/**
 * GET /api/team
 * Get the current user's team information
 */
export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    // Check if user owns a team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        members: {
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
          orderBy: { joinedAt: 'asc' },
        },
        invites: {
          where: {
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (ownedTeam) {
      // Calculate seats
      const usedSeats = 1 + ownedTeam.members.length; // Owner + members
      const pendingInvites = ownedTeam.invites.length;
      const availableSeats = MAX_TEAM_SEATS - usedSeats - pendingInvites;

      // Debug logging
      console.log('[Team API - Owner View]', {
        userId: user!.profileId,
        teamId: ownedTeam.id,
        membersCount: ownedTeam.members.length,
        usedSeats,
        pendingInvites,
        availableSeats,
        canInvite: availableSeats > 0,
      });

      return NextResponse.json({
        team: {
          id: ownedTeam.id,
          name: ownedTeam.name,
          createdAt: ownedTeam.createdAt,
          role: 'OWNER' as TeamRole,
          // Analytics permissions
          allowMemberAccountAnalytics: (ownedTeam as any).allowMemberAccountAnalytics ?? false,
          members: [
            // Include owner as first member
            {
              id: 'owner',
              userId: user!.profileId,
              role: 'OWNER' as TeamRole,
              joinedAt: ownedTeam.createdAt,
              user: ownedTeam.owner,
            },
            ...ownedTeam.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              role: m.role,
              joinedAt: m.joinedAt,
              user: m.user,
            })),
          ],
          invites: ownedTeam.invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            expiresAt: i.expiresAt,
            createdAt: i.createdAt,
          })),
          seats: {
            total: MAX_TEAM_SEATS,
            used: usedSeats,
            pending: pendingInvites,
            available: availableSeats,
          },
          // Explicit flag for whether this user can send invites
          canInvite: availableSeats > 0,
        },
      });
    }

    // Check if user is a member of a team
    console.log('[Team API] Looking for membership with userId:', user!.profileId, 'email:', user!.email);

    const membership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            members: {
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
              orderBy: { joinedAt: 'asc' },
            },
            invites: {
              where: {
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    console.log('[Team API] Membership found:', membership ? 'YES' : 'NO');

    if (membership) {
      const team = membership.team;
      const usedSeats = 1 + team.members.length; // Owner + all team members
      const pendingInvites = team.invites.length;
      const availableSeats = MAX_TEAM_SEATS - usedSeats - pendingInvites;
      const canManageInvites = membership.role === 'ADMIN';

      // Debug logging
      console.log('[Team API - Member View]', {
        userId: user!.profileId,
        teamId: team.id,
        membersCount: team.members.length,
        usedSeats,
        pendingInvites,
        availableSeats,
        canInvite: canManageInvites && availableSeats > 0,
      });

      return NextResponse.json({
        team: {
          id: team.id,
          name: team.name,
          createdAt: team.createdAt,
          role: membership.role,
          // Analytics permissions (read-only for members)
          allowMemberAccountAnalytics: (team as any).allowMemberAccountAnalytics ?? false,
          members: [
            // Include owner as first member
            {
              id: 'owner',
              userId: team.ownerId,
              role: 'OWNER' as TeamRole,
              joinedAt: team.createdAt,
              user: team.owner,
            },
            ...team.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              role: m.role,
              joinedAt: m.joinedAt,
              user: m.user,
            })),
          ],
          // Only show invites to admins
          invites: canManageInvites
            ? team.invites.map((i) => ({
                id: i.id,
                email: i.email,
                role: i.role,
                expiresAt: i.expiresAt,
                createdAt: i.createdAt,
              }))
            : [],
          seats: {
            total: MAX_TEAM_SEATS,
            used: usedSeats,
            pending: pendingInvites,
            available: availableSeats,
          },
          // Explicit flag for whether this user can send invites
          canInvite: canManageInvites && availableSeats > 0,
        },
      });
    }

    // No team
    return NextResponse.json({ team: null });
  } catch (error) {
    console.error('[Team GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team
 * Create a new team (PRO users only)
 */
export async function POST(request: NextRequest) {
  const { user, response } = await withAuth(request, { requiredTier: 'PRO' });
  if (response) return response;

  try {
    // Check if user already owns a team
    const existingTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: 'You already have a team' },
        { status: 400 }
      );
    }

    // Check if user is a member of another team
    const existingMembership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of a team. Leave your current team first.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const teamName = body.name || 'My Team';

    // Create the team
    const team = await prisma.team.create({
      data: {
        name: teamName,
        ownerId: user!.profileId,
      },
    });

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    console.error('[Team POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/team
 * Update team name (Owner/Admin only)
 */
export async function PUT(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Check if user owns the team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (ownedTeam) {
      const updated = await prisma.team.update({
        where: { id: ownedTeam.id },
        data: { name: name.trim() },
      });

      return NextResponse.json({
        success: true,
        team: { id: updated.id, name: updated.name },
      });
    }

    // Check if user is an admin of a team
    const membership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
      include: { team: true },
    });

    if (membership && membership.role === 'ADMIN') {
      const updated = await prisma.team.update({
        where: { id: membership.teamId },
        data: { name: name.trim() },
      });

      return NextResponse.json({
        success: true,
        team: { id: updated.id, name: updated.name },
      });
    }

    return forbiddenResponse('Only team owners and admins can update the team');
  } catch (error) {
    console.error('[Team PUT Error]', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team
 * Delete team (Owner only)
 */
export async function DELETE(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    // Only owner can delete the team
    const team = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
    });

    if (!team) {
      return forbiddenResponse('Only team owners can delete the team');
    }

    // Delete the team (cascade will delete members and invites)
    await prisma.team.delete({
      where: { id: team.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Team DELETE Error]', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
