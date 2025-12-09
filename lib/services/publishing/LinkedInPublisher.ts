import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// LINKEDIN PUBLISHER
// Uses LinkedIn Marketing API
// ============================================

export class LinkedInPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'linkedin'
  protected baseUrl = API_BASE_URLS.linkedin

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options
    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Get user URN
      const userUrn = await this.getUserUrn(accessToken)

      // Step 2: Upload media if present
      let assetUrn: string | undefined
      if (media.mediaUrl) {
        assetUrn = await this.uploadMedia(accessToken, userUrn, media)
      }

      // Step 3: Create share
      const share = await this.createShare(accessToken, userUrn, content, assetUrn)

      return {
        success: true,
        platform: this.platform,
        platformPostId: share.id,
        platformUrl: `https://www.linkedin.com/feed/update/${share.id}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to LinkedIn',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    // LinkedIn analytics require special access
    const response = await this.makeApiRequest<{
      elements: Array<{
        totalShareStatistics: {
          impressionCount: number
          likeCount: number
          commentCount: number
          shareCount: number
          clickCount: number
          engagement: number
        }
      }>
    }>(
      `/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encodeURIComponent(postId)}`,
      { method: 'GET' },
      accessToken
    )

    const stats = response.elements[0]?.totalShareStatistics

    return {
      views: stats?.impressionCount || 0,
      likes: stats?.likeCount || 0,
      comments: stats?.commentCount || 0,
      shares: stats?.shareCount || 0,
      saves: 0, // LinkedIn doesn't expose saves
      reach: stats?.impressionCount || 0,
      impressions: stats?.impressionCount || 0,
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      await this.makeApiRequest(
        `/shares/${encodeURIComponent(postId)}`,
        { method: 'DELETE' },
        accessToken
      )
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // LINKEDIN-SPECIFIC HELPERS
  // ============================================

  private async getUserUrn(accessToken: string): Promise<string> {
    const response = await this.makeApiRequest<{
      sub: string
    }>(
      '/userinfo',
      { method: 'GET' },
      accessToken
    )

    return `urn:li:person:${response.sub}`
  }

  private async uploadMedia(
    accessToken: string,
    ownerUrn: string,
    media: ContentPayload
  ): Promise<string> {
    // Step 1: Register upload
    const registerResponse = await this.makeApiRequest<{
      value: {
        uploadMechanism: {
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
            uploadUrl: string
          }
        }
        asset: string
      }
    }>(
      '/assets?action=registerUpload',
      {
        method: 'POST',
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: [
              media.mediaType === 'video'
                ? 'urn:li:digitalmediaRecipe:feedshare-video'
                : 'urn:li:digitalmediaRecipe:feedshare-image',
            ],
            owner: ownerUrn,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      },
      accessToken
    )

    const uploadUrl =
      registerResponse.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl
    const assetUrn = registerResponse.value.asset

    // Step 2: Upload the file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': media.mimeType,
      },
      body: media.mediaUrl, // In production, actual file buffer
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload media to LinkedIn')
    }

    return assetUrn
  }

  private async createShare(
    accessToken: string,
    authorUrn: string,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> },
    assetUrn?: string
  ): Promise<{ id: string }> {
    const commentary = this.formatCaption(content)
    const settings = content.settings || {}

    const shareData: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: commentary,
          },
          shareMediaCategory: assetUrn
            ? assetUrn.includes('video')
              ? 'VIDEO'
              : 'IMAGE'
            : 'NONE',
          media: assetUrn
            ? [
                {
                  status: 'READY',
                  media: assetUrn,
                },
              ]
            : undefined,
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility':
          settings.visibility || 'PUBLIC',
      },
    }

    const response = await this.makeApiRequest<{
      id: string
    }>(
      '/ugcPosts',
      {
        method: 'POST',
        body: JSON.stringify(shareData),
      },
      accessToken
    )

    return response
  }
}

export const linkedinPublisher = new LinkedInPublisher()
