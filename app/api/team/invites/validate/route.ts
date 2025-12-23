/**
 * Validate Team Invite API (No Auth Required)
 *
 * GET /api/team/invites/validate?token=xxx - Validate invite token without authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/team/invites/validate
 * Validate an invite token and return invite details
 * This endpoint does NOT require authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invite token is required', valid: false },
        { status: 400 }
      );
    }

    // Find the invite
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite token', valid: false },
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
        { error: 'This invite has expired', valid: false },
        { status: 400 }
      );
    }

    // Check if an account exists for this email
    const existingProfile = await prisma.profile.findUnique({
      where: { email: invite.email.toLowerCase() },
      select: { id: true },
    });

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        role: invite.role,
        teamName: invite.team.name,
        expiresAt: invite.expiresAt,
      },
      accountExists: !!existingProfile,
    });
  } catch (error) {
    console.error('[Validate Invite Error]', error);
    return NextResponse.json(
      { error: 'Failed to validate invite', valid: false },
      { status: 500 }
    );
  }
}
