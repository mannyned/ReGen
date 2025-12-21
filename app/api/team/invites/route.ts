/**
 * Team Invites API
 *
 * POST /api/team/invites - Send an invite (Owner/Admin)
 * GET /api/team/invites - List pending invites (Owner/Admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, forbiddenResponse } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { TeamRole } from '@prisma/client';
import { sendEmail, EmailTemplates } from '@/lib/email';

export const runtime = 'nodejs';

// Maximum team seats for PRO plan
const MAX_TEAM_SEATS = 3;
// Invite expiration in days
const INVITE_EXPIRATION_DAYS = 7;

/**
 * GET /api/team/invites
 * List pending invites for the team
 */
export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    // Check if user owns a team
    const ownedTeam = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
      include: {
        invites: {
          where: {
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (ownedTeam) {
      return NextResponse.json({
        invites: ownedTeam.invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        })),
      });
    }

    // Check if user is an admin of a team
    const membership = await prisma.teamMember.findUnique({
      where: { userId: user!.profileId },
      include: {
        team: {
          include: {
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

    if (membership && membership.role === 'ADMIN') {
      return NextResponse.json({
        invites: membership.team.invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        })),
      });
    }

    return forbiddenResponse('Only team owners and admins can view invites');
  } catch (error) {
    console.error('[Team Invites GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team/invites
 * Send an invite to join the team
 */
export async function POST(request: NextRequest) {
  const { user, response } = await withAuth(request, { requiredTier: 'PRO' });
  if (response) return response;

  try {
    const body = await request.json();
    const { email, role = 'MEMBER' } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or MEMBER.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get or create team
    let team = await prisma.team.findUnique({
      where: { ownerId: user!.profileId },
      include: {
        members: true,
        invites: {
          where: {
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    // Check if user is admin of a team
    if (!team) {
      const membership = await prisma.teamMember.findUnique({
        where: { userId: user!.profileId },
        include: {
          team: {
            include: {
              members: true,
              invites: {
                where: {
                  expiresAt: { gt: new Date() },
                },
              },
            },
          },
        },
      });

      if (membership && membership.role === 'ADMIN') {
        team = membership.team;
      }
    }

    // If still no team, create one (only owner can do this)
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: 'My Team',
          ownerId: user!.profileId,
        },
        include: {
          members: true,
          invites: true,
        },
      });
    }

    // Check seat availability
    const usedSeats = 1 + team.members.length; // Owner + members
    const pendingInvites = team.invites.length;
    const availableSeats = MAX_TEAM_SEATS - usedSeats - pendingInvites;

    if (availableSeats <= 0) {
      return NextResponse.json(
        { error: 'No seats available. Remove a member or cancel a pending invite first.' },
        { status: 400 }
      );
    }

    // Check if inviting self
    if (normalizedEmail === user!.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'You cannot invite yourself' },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingProfile = await prisma.profile.findUnique({
      where: { email: normalizedEmail },
      include: {
        teamMembership: true,
      },
    });

    if (existingProfile) {
      // Check if this user is the team owner
      if (existingProfile.id === team.ownerId) {
        return NextResponse.json(
          { error: 'This user is already the team owner' },
          { status: 400 }
        );
      }

      // Check if already a member of this team
      if (existingProfile.teamMembership?.teamId === team.id) {
        return NextResponse.json(
          { error: 'This user is already a team member' },
          { status: 400 }
        );
      }

      // Check if member of another team
      if (existingProfile.teamMembership) {
        return NextResponse.json(
          { error: 'This user is already a member of another team' },
          { status: 400 }
        );
      }
    }

    // Check if invite already exists
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId: team.id,
        email: normalizedEmail,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      );
    }

    // Create the invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRATION_DAYS);

    const invite = await prisma.teamInvite.create({
      data: {
        teamId: team.id,
        email: normalizedEmail,
        role: role as TeamRole,
        invitedById: user!.profileId,
        expiresAt,
      },
    });

    // Send invite email
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: `You've been invited to join ${team.name} on ReGenr`,
        template: EmailTemplates.TEAM_INVITE,
        data: {
          teamName: team.name,
          inviterEmail: user!.email,
          role,
          token: invite.token,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (emailError) {
      console.error('[Team Invite Email Error]', emailError);
      // Don't fail the invite if email fails
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      },
    });
  } catch (error) {
    console.error('[Team Invites POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to send invite' },
      { status: 500 }
    );
  }
}
