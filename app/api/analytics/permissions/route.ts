/**
 * Analytics Permissions API
 *
 * GET /api/analytics/permissions - Get current user's analytics permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/guards';
import { getAnalyticsPermissions, ANALYTICS_COPY } from '@/lib/permissions/analytics';

export const runtime = 'nodejs';

/**
 * GET /api/analytics/permissions
 * Returns the current user's analytics permissions based on their role
 */
export async function GET(request: NextRequest) {
  const { user, response } = await withAuth(request);
  if (response) return response;

  try {
    const permissions = await getAnalyticsPermissions(user!.profileId);

    console.log('[Analytics Permissions] User:', user!.profileId, 'Permissions:', JSON.stringify(permissions, null, 2));

    return NextResponse.json({
      ...permissions,
      copy: ANALYTICS_COPY,
      // Debug info (remove in production)
      _debug: {
        userId: user!.profileId,
        teamContext: permissions.teamContext,
      },
    });
  } catch (error) {
    console.error('[Analytics Permissions Error]', error);
    return NextResponse.json(
      { error: 'Failed to get analytics permissions' },
      { status: 500 }
    );
  }
}
