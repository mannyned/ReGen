/**
 * Snapchat Service
 *
 * Handles Snapchat integration:
 * - Connection status via Login Kit
 * - Share URL generation for Creative Kit (user-initiated sharing)
 *
 * IMPORTANT: Snapchat does NOT have a public server-side posting API.
 * All content sharing is user-initiated via Creative Kit.
 * The share flow opens Snapchat's composer where the user completes the share.
 *
 * @see https://developers.snap.com/creative-kit/integrate
 */

import { prisma } from '@/lib/db';
import type {
  SnapchatShareOptions,
  SnapchatSharePayload,
  SnapchatShareType,
} from '@/lib/types/snapchat';

// ============================================
// CONFIGURATION
// ============================================

// Snapchat web share base URL
const SNAPCHAT_SHARE_URL = 'https://www.snapchat.com/scan';

// ============================================
// SNAPCHAT SERVICE CLASS
// ============================================

export class SnapchatService {
  // ============================================
  // CONNECTION STATUS
  // ============================================

  /**
   * Get Snapchat connection status
   */
  async getConnectionStatus(profileId: string): Promise<{
    connected: boolean;
    displayName?: string;
    avatarUrl?: string;
    snapchatId?: string;
    expiresAt?: Date;
  }> {
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: 'snapchat',
        },
      },
      select: {
        providerAccountId: true,
        expiresAt: true,
        metadata: true,
      },
    });

    if (!connection) {
      return { connected: false };
    }

    const metadata = connection.metadata as Record<string, unknown> | null;

    return {
      connected: true,
      displayName: metadata?.displayName as string | undefined,
      avatarUrl: metadata?.bitmojiAvatar as string | undefined,
      snapchatId: connection.providerAccountId,
      expiresAt: connection.expiresAt || undefined,
    };
  }

  // ============================================
  // CREATIVE KIT SHARE URL GENERATION
  // ============================================

  /**
   * Generate a Snapchat share URL for Creative Kit
   *
   * This creates a URL that opens Snapchat's share composer.
   * The user completes the share in Snapchat.
   *
   * For web, we use the Snapchat scan URL with a deep link.
   * On mobile, native Creative Kit SDK would be used instead.
   *
   * @param options Share configuration
   * @returns Share URLs for web and mobile
   */
  async generateShareUrl(options: SnapchatShareOptions): Promise<SnapchatSharePayload> {
    const clientId = process.env.SNAPCHAT_CLIENT_ID;

    if (!clientId) {
      throw new Error('Snapchat client ID not configured');
    }

    // Validate options
    if (!options.attachmentUrl && !options.mediaUrl) {
      throw new Error('Either attachmentUrl or mediaUrl is required');
    }

    // Build the share URL based on type
    let shareUrl: string;
    let webShareUrl: string;
    let deepLinkUrl: string;

    switch (options.type) {
      case 'url':
        // URL sharing - attaches a swipe-up link
        shareUrl = this.buildUrlShareLink(options.attachmentUrl!, clientId);
        webShareUrl = shareUrl;
        deepLinkUrl = `snapchat://creative?attachmentUrl=${encodeURIComponent(options.attachmentUrl!)}`;
        break;

      case 'photo':
      case 'video':
        // Media sharing - opens with media attached
        shareUrl = this.buildMediaShareLink(options.mediaUrl!, options.type, clientId);
        webShareUrl = shareUrl;
        deepLinkUrl = `snapchat://creative?mediaUrl=${encodeURIComponent(options.mediaUrl!)}`;
        break;

      case 'lens':
        // Lens sharing
        if (!options.lensUUID) {
          throw new Error('lensUUID is required for lens sharing');
        }
        shareUrl = `https://www.snapchat.com/unlock/?type=SNAPCODE&uuid=${options.lensUUID}`;
        webShareUrl = shareUrl;
        deepLinkUrl = `snapchat://unlock/?type=SNAPCODE&uuid=${options.lensUUID}`;
        break;

      default:
        throw new Error(`Unsupported share type: ${options.type}`);
    }

    return {
      shareUrl,
      webShareUrl,
      deepLinkUrl,
    };
  }

  /**
   * Build a URL share link (swipe-up attachment)
   */
  private buildUrlShareLink(attachmentUrl: string, clientId: string): string {
    // Snapchat's web share uses a specific format
    // For the most reliable sharing, use the Snapchat Share button HTML
    // This generates a fallback URL
    const params = new URLSearchParams({
      attachmentUrl: attachmentUrl,
      'utm_source': 'regenr',
      'utm_campaign': 'share',
    });

    // Return a share URL that will prompt the user to open in Snapchat
    return `https://www.snapchat.com/add?${params.toString()}`;
  }

  /**
   * Build a media share link
   */
  private buildMediaShareLink(
    mediaUrl: string,
    type: 'photo' | 'video',
    clientId: string
  ): string {
    // For media sharing on web, we provide a link that opens Snapchat
    // with the media pre-attached (requires the media to be accessible)
    const params = new URLSearchParams({
      mediaUrl: mediaUrl,
      mediaType: type,
      'utm_source': 'regenr',
    });

    return `https://www.snapchat.com/add?${params.toString()}`;
  }

  /**
   * Generate HTML for Snapchat Share Button
   *
   * This generates an embeddable HTML snippet that uses Snapchat's
   * official share button SDK.
   *
   * @param attachmentUrl URL to attach to the snap
   * @returns HTML snippet for embedding
   */
  generateShareButtonHtml(attachmentUrl: string): string {
    const encodedUrl = encodeURIComponent(attachmentUrl);

    return `
<div data-snapchat-share-btn data-attachment-url="${encodedUrl}"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://sdk.snapkit.com/js/v1/create.js';
    script.async = true;
    document.body.appendChild(script);
  })();
</script>
    `.trim();
  }

  /**
   * Record a share event (for tracking)
   *
   * Since we can't confirm completion server-side,
   * this just records the share was initiated.
   */
  async recordShareInitiated(
    profileId: string,
    contentId: string | null,
    shareType: SnapchatShareType
  ): Promise<void> {
    try {
      // Check if outbound_posts table exists
      const hasTable = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'outbound_posts'
        ) as exists
      `;

      if (Array.isArray(hasTable) && hasTable[0]?.exists) {
        await prisma.$executeRaw`
          INSERT INTO outbound_posts (
            id, user_id, provider, status, content_id,
            metadata, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            ${profileId}::uuid,
            'snapchat',
            'initiated',
            ${contentId}::uuid,
            ${JSON.stringify({ shareType, initiatedAt: new Date().toISOString() })}::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
    } catch (error) {
      console.warn('[Snapchat] Failed to record share:', error);
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const snapchatService = new SnapchatService();

export default snapchatService;
