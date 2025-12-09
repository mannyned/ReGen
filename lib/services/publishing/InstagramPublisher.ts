import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// INSTAGRAM PUBLISHER
// Uses Facebook Graph API for Instagram Business/Creator accounts
// ============================================

export class InstagramPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'instagram'
  protected baseUrl = API_BASE_URLS.instagram

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options
    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Get Instagram Business Account ID
      const accountId = await this.getInstagramAccountId(accessToken)

      // Step 2: Create media container
      const containerId = await this.createMediaContainer(
        accountId,
        media,
        content,
        accessToken
      )

      // Step 3: Wait for container to be ready (for videos)
      if (media.mediaType === 'video') {
        await this.waitForContainerReady(containerId, accessToken)
      }

      // Step 4: Publish the container
      const result = await this.publishContainer(accountId, containerId, accessToken)

      return {
        success: true,
        platform: this.platform,
        platformPostId: result.id,
        platformUrl: `https://www.instagram.com/p/${result.id}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to Instagram',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    const response = await this.makeApiRequest<{
      impressions: { value: number }
      reach: { value: number }
      likes: { value: number }
      comments: { value: number }
      saved: { value: number }
      shares: { value: number }
      video_views?: { value: number }
    }>(
      `/${postId}/insights?metric=impressions,reach,likes,comments,saved,shares,video_views`,
      { method: 'GET' },
      accessToken
    )

    return {
      views: response.video_views?.value || 0,
      likes: response.likes?.value || 0,
      comments: response.comments?.value || 0,
      shares: response.shares?.value || 0,
      saves: response.saved?.value || 0,
      reach: response.reach?.value || 0,
      impressions: response.impressions?.value || 0,
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      await this.makeApiRequest(
        `/${postId}`,
        { method: 'DELETE' },
        accessToken
      )
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // INSTAGRAM-SPECIFIC HELPERS
  // ============================================

  private async getInstagramAccountId(accessToken: string): Promise<string> {
    const response = await this.makeApiRequest<{
      data: Array<{ instagram_business_account?: { id: string } }>
    }>(
      '/me/accounts?fields=instagram_business_account',
      { method: 'GET' },
      accessToken
    )

    const account = response.data.find(a => a.instagram_business_account)
    if (!account?.instagram_business_account) {
      throw new Error('No Instagram Business account found')
    }

    return account.instagram_business_account.id
  }

  private async createMediaContainer(
    accountId: string,
    media: ContentPayload,
    content: { caption: string; hashtags: string[] },
    accessToken: string
  ): Promise<string> {
    const caption = this.formatCaption(content)

    const params: Record<string, string> = {
      caption,
      access_token: accessToken,
    }

    if (media.mediaType === 'video') {
      params.media_type = 'VIDEO'
      params.video_url = media.mediaUrl
    } else {
      params.image_url = media.mediaUrl
    }

    const response = await fetch(
      `${this.baseUrl}/${accountId}/media?${new URLSearchParams(params)}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create media container: ${error}`)
    }

    const data = await response.json()
    return data.id
  }

  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
    maxAttempts = 30
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.makeApiRequest<{
        status_code: string
        status: string
      }>(
        `/${containerId}?fields=status_code,status`,
        { method: 'GET' },
        accessToken
      )

      if (response.status_code === 'FINISHED') {
        return
      }

      if (response.status_code === 'ERROR') {
        throw new Error(`Container processing failed: ${response.status}`)
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    throw new Error('Container processing timed out')
  }

  private async publishContainer(
    accountId: string,
    containerId: string,
    accessToken: string
  ): Promise<{ id: string }> {
    const response = await fetch(
      `${this.baseUrl}/${accountId}/media_publish?creation_id=${containerId}&access_token=${accessToken}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to publish container: ${error}`)
    }

    return response.json()
  }
}

export const instagramPublisher = new InstagramPublisher()
