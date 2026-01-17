/**
 * GET/PUT /api/user/preferences
 *
 * Manages user notification preferences.
 * - GET: Returns current notification preferences
 * - PUT: Updates notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Default notification preferences
const DEFAULT_NOTIFICATIONS = [
  { id: 'product', email: true, push: false },
  { id: 'generation', email: false, push: true },
  { id: 'scheduled', email: false, push: true },
  { id: 'published', email: true, push: true },
  { id: 'weekly', email: true, push: false },
  { id: 'team', email: true, push: true },
  { id: 'marketing', email: false, push: false },
];

export async function GET() {
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

    // Get profile with notification preferences
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        notificationPreferences: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Return saved preferences or defaults
    const preferences = profile.notificationPreferences || DEFAULT_NOTIFICATIONS;

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || !Array.isArray(preferences)) {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    // Validate preferences structure
    const validIds = DEFAULT_NOTIFICATIONS.map(n => n.id);
    const isValid = preferences.every(
      (p: { id: string; email: boolean; push: boolean }) =>
        validIds.includes(p.id) &&
        typeof p.email === 'boolean' &&
        typeof p.push === 'boolean'
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid preferences structure' },
        { status: 400 }
      );
    }

    // Update profile with new preferences
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        notificationPreferences: preferences,
      },
    });

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
