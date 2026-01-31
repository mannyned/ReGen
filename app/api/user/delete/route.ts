/**
 * DELETE /api/user/delete
 *
 * Permanently deletes the user's account and all associated data.
 * This is a destructive operation and cannot be undone.
 *
 * Required body:
 * - confirmText: string - Must be "DELETE" to confirm the action
 *
 * GDPR Compliance:
 * - Deletes all user data from the database
 * - All related records are cascade-deleted via foreign key constraints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { confirmText } = body;

    // Require explicit confirmation
    if (confirmText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type "DELETE" to confirm account deletion' },
        { status: 400 }
      );
    }

    console.log(`[Delete Account] Starting account deletion for user: ${user.id}`);

    // Get profile to check it exists
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user is a team owner - they must transfer ownership first
    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        role: 'OWNER',
      },
      include: {
        team: {
          include: {
            members: true,
          },
        },
      },
    });

    if (teamMembership && teamMembership.team.members.length > 1) {
      return NextResponse.json(
        {
          error: 'You are the owner of a team with other members. Please transfer ownership or remove all members before deleting your account.',
          code: 'TEAM_OWNER'
        },
        { status: 400 }
      );
    }

    // Delete profile from database (cascades to all related data)
    await prisma.profile.delete({
      where: { id: user.id },
    });

    console.log(`[Delete Account] Profile deleted for user: ${user.id}`);

    // Delete user from Supabase Auth using admin client
    // This requires the service role key
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

      if (deleteAuthError) {
        console.error('[Delete Account] Failed to delete auth user:', deleteAuthError);
        // Don't fail the request - profile is already deleted
        // The orphaned auth record will not be able to access anything
      } else {
        console.log(`[Delete Account] Auth user deleted for user: ${user.id}`);
      }
    } else {
      console.warn('[Delete Account] SUPABASE_SERVICE_ROLE_KEY not set - auth user not deleted');
    }

    // Sign out the user (invalidate current session)
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    });
  } catch (error) {
    console.error('[Delete Account] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
