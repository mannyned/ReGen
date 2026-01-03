import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// SNAPCHAT PUBLISHER
// Uses Snapchat Marketing API for business accounts
// ============================================

export class SnapchatPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'snapchat'
  protected baseUrl = API_BASE_URLS.snapchat

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

    // Snapchat requires media (image or video)
    if (!media) {
      return {
        success: false,
        platform: this.platform,
        error: 'Snapchat requires media (image or video). Text-only posts are not supported.',
      }
    }

    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Get organization ID
      const orgId = await this.getOrganizationId(accessToken)

      // Step 2: Create media
      const mediaId = await this.uploadMedia(accessToken, orgId, media)

      // Step 3: Create creative
      const creativeId = await this.createCreative(
        accessToken,
        orgId,
        mediaId,
        content
      )

      // Step 4: Create ad (or organic post for eligible accounts)
      const result = await this.createPost(accessToken, orgId, creativeId, content)

      return {
        success: true,
        platform: this.platform,
        platformPostId: result.id,
        platformUrl: result.url,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to Snapchat',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    // Snapchat analytics are available through their reporting API
    const response = await this.makeApiRequest<{
      total_stats: {
        impressions: number
        swipes: number
        view_time_millis: number
        screen_time_millis: number
        quartile_1: number
        quartile_2: number
        quartile_3: number
        view_completion: number
        shares: number
        saves: number
      }
    }>(
      `/ads/${postId}/stats`,
      { method: 'GET' },
      accessToken
    )

    const stats = response.total_stats

    return {
      views: stats.impressions,
      likes: 0, // Snapchat doesn't have traditional likes
      comments: 0,
      shares: stats.shares,
      saves: stats.saves,
      reach: stats.impressions,
      impressions: stats.impressions,
      avgWatchTime: stats.view_time_millis / 1000,
      completionRate: stats.view_completion,
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      await this.makeApiRequest(
        `/ads/${postId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'DELETED' }),
        },
        accessToken
      )
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // SNAPCHAT-SPECIFIC HELPERS
  // ============================================

  private async getOrganizationId(accessToken: string): Promise<string> {
    const response = await this.makeApiRequest<{
      me: {
        organizations: Array<{ id: string; name: string }>
      }
    }>(
      '/me/organizations',
      { method: 'GET' },
      accessToken
    )

    const org = response.me.organizations[0]
    if (!org) {
      throw new Error('No Snapchat organization found')
    }

    return org.id
  }

  private async uploadMedia(
    accessToken: string,
    orgId: string,
    media: ContentPayload
  ): Promise<string> {
    // Step 1: Create media object
    const createResponse = await this.makeApiRequest<{
      media: Array<{ id: string; upload_link: string }>
    }>(
      `/organizations/${orgId}/media`,
      {
        method: 'POST',
        body: JSON.stringify({
          media: [
            {
              name: `regen-${Date.now()}`,
              type: media.mediaType === 'video' ? 'VIDEO' : 'IMAGE',
              ad_account_id: orgId,
            },
          ],
        }),
      },
      accessToken
    )

    const mediaObj = createResponse.media[0]

    // Step 2: Upload to the provided URL
    const uploadResponse = await fetch(mediaObj.upload_link, {
      method: 'PUT',
      headers: {
        'Content-Type': media.mimeType,
      },
      body: media.mediaUrl, // In production, actual file buffer
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload media to Snapchat')
    }

    return mediaObj.id
  }

  private async createCreative(
    accessToken: string,
    orgId: string,
    mediaId: string,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> | object }
  ): Promise<string> {
    const headline = this.formatCaption(content).substring(0, 34) // Snapchat headline limit

    const response = await this.makeApiRequest<{
      creatives: Array<{ id: string }>
    }>(
      `/organizations/${orgId}/creatives`,
      {
        method: 'POST',
        body: JSON.stringify({
          creatives: [
            {
              name: `regen-creative-${Date.now()}`,
              type: 'SNAP_AD',
              top_snap_media_id: mediaId,
              headline,
              ad_account_id: orgId,
            },
          ],
        }),
      },
      accessToken
    )

    return response.creatives[0].id
  }

  private async createPost(
    accessToken: string,
    orgId: string,
    creativeId: string,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> | object }
  ): Promise<{ id: string; url: string }> {
    // For business accounts, this creates an ad
    // For creator accounts with organic access, this would be different

    const settings = content.settings || {}

    const response = await this.makeApiRequest<{
      ads: Array<{
        id: string
        effective_status: string
      }>
    }>(
      `/organizations/${orgId}/ads`,
      {
        method: 'POST',
        body: JSON.stringify({
          ads: [
            {
              name: `regen-ad-${Date.now()}`,
              creative_id: creativeId,
              status: 'ACTIVE',
              type: 'SNAP_AD',
              ad_account_id: orgId,
            },
          ],
        }),
      },
      accessToken
    )

    const ad = response.ads[0]

    return {
      id: ad.id,
      url: `https://www.snapchat.com/spotlight/${ad.id}`, // Approximate URL
    }
  }

  // ============================================
  // SNAPCHAT SPOTLIGHT SUPPORT
  // ============================================

  async publishToSpotlight(options: PublishOptions): Promise<PublishResult> {
    // Spotlight is Snapchat's TikTok-like short video feature
    // Requires specific API access and video format requirements

    const { media } = options

    if (!media || media.mediaType !== 'video') {
      throw new Error('Spotlight requires video content')
    }

    if (media.duration && media.duration > 60) {
      throw new Error('Spotlight videos must be 60 seconds or less')
    }

    // Spotlight uses the same publishing flow but with different parameters
    return this.publishContent(options)
  }
}

export const snapchatPublisher = new SnapchatPublisher()
