/**
 * GET /api/linkedin/status
 *
 * Returns LinkedIn connection status including organizations the user can post to.
 *
 * Response:
 * {
 *   connected: boolean,
 *   displayName?: string,
 *   avatarUrl?: string,
 *   linkedInId?: string,
 *   expiresAt?: string (ISO date),
 *   organizations?: Array<{ id, name, vanityName?, logoUrl? }>,
 *   primaryOrganization?: { id, name, vanityName?, logoUrl? } | null
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/getUser';
import { linkedinService } from '@/lib/services/linkedin';
import type { GetLinkedInStatusResponse } from '@/lib/types/linkedin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const profileId = await getUserId(request);

    if (!profileId) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get LinkedIn connection status with organizations
    const status = await linkedinService.getConnectionStatus(profileId);

    const response: GetLinkedInStatusResponse = {
      connected: status.connected,
      displayName: status.displayName,
      avatarUrl: status.avatarUrl,
      linkedInId: status.linkedInId,
      expiresAt: status.expiresAt?.toISOString(),
      organizations: status.organizations,
      primaryOrganization: status.primaryOrganization,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[LinkedIn Status Error]', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
        code: 'STATUS_ERROR',
      },
      { status: 500 }
    );
  }
}
