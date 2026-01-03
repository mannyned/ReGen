/**
 * LinkedIn Service
 *
 * Handles LinkedIn API interactions:
 * - UGC Posts API: Create text/link/image posts
 *
 * Uses the universal OAuth engine for token management.
 *
 * Note: LinkedIn's API has strict rate limits and requirements:
 * - Posts must follow community guidelines
 * - Image uploads require separate media registration
 * - Analytics require LinkedIn Marketing API access (partner program)
 *
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/ugc-post-api
 */

import { getAccessToken } from '@/lib/oauth/engine';
import { prisma } from '@/lib/db';
import type {
  LinkedInPostOptions,
  LinkedInPostResult,
  LinkedInVisibility,
  LinkedInUGCPost,
} from '@/lib/types/linkedin';

// ============================================
// CONFIGURATION
// ============================================

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

// ============================================
// LINKEDIN SERVICE CLASS
// ============================================

export class LinkedInService {
  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Get a valid access token for LinkedIn API calls
   * Automatically refreshes if expired
   */
  private async getValidAccessToken(profileId: string): Promise<string> {
    const accessToken = await getAccessToken('linkedin', profileId);
    return accessToken;
  }

  /**
   * Get the LinkedIn member URN for the authenticated user
   */
  private async getMemberUrn(profileId: string): Promise<string> {
    // Get the OAuth connection to retrieve the provider account ID
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: 'linkedin',
        },
      },
      select: {
        providerAccountId: true,
        metadata: true,
      },
    });

    if (!connection) {
      throw new Error('LinkedIn not connected');
    }

    return `urn:li:person:${connection.providerAccountId}`;
  }

  // ============================================
  // CONNECTION STATUS
  // ============================================

  /**
   * Get LinkedIn connection status
   */
  async getConnectionStatus(profileId: string): Promise<{
    connected: boolean;
    displayName?: string;
    avatarUrl?: string;
    linkedInId?: string;
    expiresAt?: Date;
  }> {
    const connection = await prisma.oAuthConnection.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: 'linkedin',
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
      displayName: metadata?.name as string | undefined,
      avatarUrl: metadata?.picture as string | undefined,
      linkedInId: connection.providerAccountId,
      expiresAt: connection.expiresAt || undefined,
    };
  }

  // ============================================
  // POSTING (UGC Posts API)
  // ============================================

  /**
   * Create a text post on LinkedIn
   */
  async createPost(
    profileId: string,
    options: LinkedInPostOptions
  ): Promise<LinkedInPostResult> {
    try {
      const accessToken = await this.getValidAccessToken(profileId);
      const memberUrn = await this.getMemberUrn(profileId);

      // Build the UGC post payload
      const postPayload = this.buildPostPayload(memberUrn, options);

      // Create the post
      const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202401',
        },
        body: JSON.stringify(postPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[LinkedIn Post Error]', errorData);

        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      // Get the post ID from the response header
      const postId = response.headers.get('x-restli-id');

      // Store the post record
      if (postId) {
        await this.recordPost(profileId, postId, options);
      }

      return {
        success: true,
        postId: postId || undefined,
        postUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
      };
    } catch (error) {
      console.error('[LinkedIn Post Error]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post',
      };
    }
  }

  /**
   * Build the UGC post payload
   */
  private buildPostPayload(
    memberUrn: string,
    options: LinkedInPostOptions
  ): LinkedInUGCPost {
    const visibility = options.visibility || 'PUBLIC';

    const payload: LinkedInUGCPost = {
      author: memberUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    // Add article/link if provided
    if (options.linkUrl) {
      payload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      payload.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          originalUrl: options.linkUrl,
        },
      ];
    }

    return payload;
  }

  /**
   * Record the post in the database
   */
  private async recordPost(
    profileId: string,
    postId: string,
    options: LinkedInPostOptions
  ): Promise<void> {
    try {
      // Check if OutboundPost model exists, if not skip
      // This is a graceful fallback for incremental deployment
      const hasOutboundPost = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'outbound_posts'
        ) as exists
      `;

      if (Array.isArray(hasOutboundPost) && hasOutboundPost[0]?.exists) {
        // Table exists, insert record
        await prisma.$executeRaw`
          INSERT INTO outbound_posts (
            id, user_id, provider, status, external_post_id,
            posted_at, metadata, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            ${profileId}::uuid,
            'linkedin',
            'posted',
            ${postId},
            NOW(),
            ${JSON.stringify({ text: options.text.substring(0, 100) })}::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
    } catch (error) {
      // Log but don't fail the post if recording fails
      console.warn('[LinkedIn] Failed to record post:', error);
    }
  }

  // ============================================
  // IMAGE UPLOAD (Optional - for future use)
  // ============================================

  /**
   * Upload an image for a LinkedIn post
   *
   * LinkedIn requires a 3-step process:
   * 1. Register the upload
   * 2. Upload the image binary
   * 3. Reference the asset URN in the post
   *
   * Note: This is more complex and may be added in a future update.
   */
  async uploadImage(
    _profileId: string,
    _imageUrl: string
  ): Promise<{ assetUrn: string } | null> {
    // TODO: Implement image upload
    // For MVP, only text/link posts are supported
    console.warn('[LinkedIn] Image upload not yet implemented');
    return null;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const linkedinService = new LinkedInService();

export default linkedinService;
