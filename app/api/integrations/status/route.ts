/**
 * GET /api/integrations/status
 *
 * Returns connection status for all platforms.
 * Used by the integrations settings page to display which platforms are connected.
 *
 * Response:
 * {
 *   statuses: {
 *     meta: { connected: boolean, accountName?: string, ... },
 *     tiktok: { ... },
 *     youtube: { ... },
 *     twitter: { ... },
 *     linkedin: { ... },
 *     snapchat: { ... }
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

// Import providers to register them with the engine
import '@/lib/providers';

import { OAuthEngine, isProviderRegistered } from '@/lib/oauth/engine';
import { getUserId } from '@/lib/auth/getUser';
import type { PlatformId, ConnectionStatus } from '@/lib/types/integrations';

export const runtime = 'nodejs';

// Map platform IDs to OAuth provider IDs
const platformToProvider: Record<PlatformId, string> = {
  meta: 'meta',
  tiktok: 'tiktok',
  youtube: 'google',
  twitter: 'x',
  linkedin: 'linkedin',
  snapchat: 'snapchat', // Not implemented yet
};

// All platform IDs
const ALL_PLATFORMS: PlatformId[] = ['meta', 'tiktok', 'youtube', 'twitter', 'linkedin', 'snapchat'];

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const profileId = await getUserId(request);

    if (!profileId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // Fetch status for all platforms in parallel
    const statusPromises = ALL_PLATFORMS.map(async (platform): Promise<[PlatformId, ConnectionStatus]> => {
      const provider = platformToProvider[platform];

      // Check if provider is registered (some may not be implemented yet)
      if (!isProviderRegistered(provider)) {
        return [platform, { connected: false }];
      }

      try {
        const status = await OAuthEngine.getConnectionStatus(provider, profileId);

        return [platform, {
          connected: status.connected,
          accountName: status.displayName || status.providerAccountId,
          expiresAt: status.expiresAt?.toISOString(),
        }];
      } catch {
        // Return disconnected status on error
        return [platform, { connected: false }];
      }
    });

    const results = await Promise.all(statusPromises);

    // Convert to object
    const statuses = Object.fromEntries(results) as Record<PlatformId, ConnectionStatus>;

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('[Integrations Status Error]', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch integration statuses',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
