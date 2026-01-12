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
    const { userId, content, media, contentType = 'post' } = options

    // Instagram requires media - text-only posts not supported
    if (!media) {
      return {
        success: false,
        platform: this.platform,
        error: 'Instagram requires media (image or video). Text-only posts are not supported.',
      }
    }

    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Get Instagram Business Account ID
      const accountId = await this.getInstagramAccountId(accessToken)

      // Determine if this is a story/reel or regular post
      const isStoryOrReel = contentType === 'story'
      const isStory = isStoryOrReel && media.mediaType !== 'video' // Stories are for images
      const isReel = isStoryOrReel && media.mediaType === 'video'  // Reels are for videos

      // Step 2: Create media container with appropriate type
      const containerId = await this.createMediaContainer(
        accountId,
        media,
        content,
        accessToken,
        isStoryOrReel
      )

      // Step 3: Wait for container to be ready (skip for Stories - they auto-publish)
      // Stories are published immediately when container is created
      // Reels and regular posts need to wait for processing
      if (!isStory) {
        await this.waitForContainerReady(
          containerId,
          accessToken,
          media.mediaType === 'video' ? 60 : 10 // Videos need more time (60 attempts = 2 min), images less (10 attempts = 20 sec)
        )
      }

      // Step 4: Publish the container (skip for Stories - they auto-publish)
      // Instagram Stories are automatically published when the container is created
      let resultId = containerId
      if (!isStory) {
        const result = await this.publishContainer(accountId, containerId, accessToken)
        resultId = result.id
      }

      // Build the appropriate URL based on content type
      let platformUrl = `https://www.instagram.com/p/${resultId}`
      if (isStory) {
        // Stories don't have a permanent URL, but we can link to the profile
        platformUrl = `https://www.instagram.com/stories/`
      } else if (isReel) {
        platformUrl = `https://www.instagram.com/reel/${resultId}`
      }

      return {
        success: true,
        platform: this.platform,
        platformPostId: resultId,
        platformUrl,
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
    accessToken: string,
    isStoryOrReel: boolean = false
  ): Promise<string> {
    const caption = this.formatCaption(content)

    const params: Record<string, string> = {
      caption,
      access_token: accessToken,
    }

    if (media.mediaType === 'video') {
      // For videos: use REELS when contentType is 'story', otherwise regular VIDEO
      if (isStoryOrReel) {
        params.media_type = 'REELS'
        params.video_url = media.mediaUrl
        // Reels can optionally share to feed
        params.share_to_feed = 'true'
      } else {
        params.media_type = 'VIDEO'
        params.video_url = media.mediaUrl
      }
    } else {
      // For images: use STORIES when contentType is 'story', otherwise regular image post
      if (isStoryOrReel) {
        params.media_type = 'STORIES'
        params.image_url = media.mediaUrl
      } else {
        params.image_url = media.mediaUrl
      }
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
      try {
        const response = await fetch(
          `${this.baseUrl}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
          { method: 'GET' }
        )

        if (!response.ok) {
          // If we can't check status, wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }

        const data = await response.json()

        if (data.status_code === 'FINISHED') {
          return
        }

        if (data.status_code === 'ERROR') {
          throw new Error(`Container processing failed: ${data.status || 'Unknown error'}`)
        }

        // Status is IN_PROGRESS or PUBLISHED, wait and check again
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        // On network error, wait and retry
        if (i === maxAttempts - 1) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    throw new Error('Container processing timed out. The media may still be processing on Instagram.')
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
