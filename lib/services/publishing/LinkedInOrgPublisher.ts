import { BasePlatformPublisher, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// Import providers to register them with the engine
import '@/lib/providers'
import { getAccessToken } from '@/lib/oauth/engine'

// ============================================
// LINKEDIN ORGANIZATION PUBLISHER
// Uses LinkedIn Community Management API for company pages
// ============================================

// URL regex pattern to detect links in text
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

export class LinkedInOrgPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'linkedin-org' as SocialPlatform
  protected baseUrl = API_BASE_URLS.linkedin

  // Use linkedin-org token (Community Management API scopes)
  protected async getAccessToken(userId: string): Promise<string> {
    try {
      return await getAccessToken('linkedin-org', userId)
    } catch (error) {
      throw new Error('No valid access token for LinkedIn Company Page. Please connect your LinkedIn Company Page account.')
    }
  }

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options
    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Get the user's administered organizations
      const organizations = await this.getAdministeredOrganizations(accessToken)

      if (organizations.length === 0) {
        return {
          success: false,
          platform: this.platform,
          error: 'No LinkedIn organizations found. You must be an administrator of a LinkedIn Company Page to post.',
        }
      }

      // Use the first organization (or could be configured later)
      const organizationUrn = organizations[0].organizationUrn
      console.log('[LinkedIn-Org] Publishing to organization:', organizationUrn)

      // Step 2: Upload media if present
      let mediaContent: Record<string, unknown> | undefined

      if (media?.mediaUrl) {
        if (media.mediaType === 'video') {
          const videoUrn = await this.uploadOrganizationVideo(accessToken, organizationUrn, media)
          mediaContent = {
            media: {
              id: videoUrn,
            }
          }
        } else if (media.mediaType === 'carousel' && media.additionalMediaUrls?.length) {
          const allUrls = [media.mediaUrl, ...media.additionalMediaUrls]
          const imageUrns = await this.uploadMultipleImages(accessToken, organizationUrn, allUrls, media.mimeType || 'image/jpeg')
          mediaContent = {
            multiImage: {
              images: imageUrns.map(urn => ({ id: urn }))
            }
          }
        } else {
          const imageUrn = await this.uploadOrganizationImage(accessToken, organizationUrn, media)
          mediaContent = {
            media: {
              id: imageUrn,
            }
          }
        }
      }

      // Step 3: Create the post using REST Posts API
      const postData: Record<string, unknown> = {
        author: organizationUrn,
        commentary: this.formatCaption(content),
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }

      if (mediaContent) {
        postData.content = mediaContent
      }

      console.log('[LinkedIn-Org] Creating organization post:', JSON.stringify(postData))

      const response = await fetch(
        'https://api.linkedin.com/rest/posts',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202503',
          },
          body: JSON.stringify(postData),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[LinkedIn-Org] Organization post failed:', response.status, errorText)
        throw new Error(`Failed to create organization post: ${response.status} - ${errorText}`)
      }

      const postId = response.headers.get('x-restli-id') || response.headers.get('x-linkedin-id')
      console.log('[LinkedIn-Org] Organization post created:', postId)

      return {
        success: true,
        platform: this.platform,
        platformPostId: postId || undefined,
        platformUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[LinkedIn-Org] Publish error:', error)
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to LinkedIn organization',
      }
    }
  }

  /**
   * Get organizations where the user is an administrator
   */
  private async getAdministeredOrganizations(accessToken: string): Promise<Array<{
    organizationUrn: string
    organizationId: string
    name: string
  }>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202503',
          },
        }
      )

      if (!response.ok) {
        console.log('[LinkedIn-Org] Failed to fetch organizations:', response.status)
        return []
      }

      const data = await response.json()
      const organizations: Array<{
        organizationUrn: string
        organizationId: string
        name: string
      }> = []

      for (const element of data.elements || []) {
        const orgUrn = element.organization
        if (!orgUrn) continue

        const orgId = orgUrn.replace('urn:li:organization:', '')

        try {
          const orgResponse = await fetch(
            `${this.baseUrl}/organizations/${orgId}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202503',
              },
            }
          )

          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            organizations.push({
              organizationUrn: orgUrn,
              organizationId: orgId,
              name: orgData.localizedName || orgData.name || `Organization ${orgId}`,
            })
          } else {
            organizations.push({
              organizationUrn: orgUrn,
              organizationId: orgId,
              name: `Organization ${orgId}`,
            })
          }
        } catch (error) {
          organizations.push({
            organizationUrn: orgUrn,
            organizationId: orgId,
            name: `Organization ${orgId}`,
          })
        }
      }

      console.log('[LinkedIn-Org] Found', organizations.length, 'administered organizations')
      return organizations
    } catch (error) {
      console.error('[LinkedIn-Org] Failed to get administered organizations:', error)
      return []
    }
  }

  /**
   * Upload image for organization post
   */
  private async uploadOrganizationImage(
    accessToken: string,
    ownerUrn: string,
    media: { mediaUrl: string; mimeType?: string }
  ): Promise<string> {
    console.log('[LinkedIn-Org] Uploading organization image')

    const mediaResponse = await fetch(media.mediaUrl)
    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch image: ${mediaResponse.status}`)
    }
    const mediaBuffer = await mediaResponse.arrayBuffer()

    const initResponse = await fetch(
      'https://api.linkedin.com/rest/images?action=initializeUpload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202503',
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: ownerUrn,
          },
        }),
      }
    )

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      throw new Error(`Failed to initialize image upload: ${initResponse.status} - ${errorText}`)
    }

    const initData = await initResponse.json()
    const uploadUrl = initData.value?.uploadUrl
    const imageUrn = initData.value?.image

    if (!uploadUrl || !imageUrn) {
      throw new Error('No upload URL or image URN returned')
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': media.mimeType || 'image/jpeg',
      },
      body: mediaBuffer,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.status}`)
    }

    console.log('[LinkedIn-Org] Organization image uploaded:', imageUrn)
    return imageUrn
  }

  /**
   * Upload multiple images for carousel
   */
  private async uploadMultipleImages(
    accessToken: string,
    ownerUrn: string,
    imageUrls: string[],
    mimeType: string
  ): Promise<string[]> {
    console.log('[LinkedIn-Org] Uploading carousel with', imageUrls.length, 'images')

    const imageUrns: string[] = []

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i]
      const imageUrn = await this.uploadOrganizationImage(accessToken, ownerUrn, {
        mediaUrl: url,
        mimeType,
      })
      imageUrns.push(imageUrn)
    }

    return imageUrns
  }

  /**
   * Upload video for organization post
   */
  private async uploadOrganizationVideo(
    accessToken: string,
    ownerUrn: string,
    media: { mediaUrl: string; mimeType?: string }
  ): Promise<string> {
    console.log('[LinkedIn-Org] Uploading organization video')

    const mediaResponse = await fetch(media.mediaUrl)
    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch video: ${mediaResponse.status}`)
    }
    const mediaBuffer = await mediaResponse.arrayBuffer()
    const fileSize = mediaBuffer.byteLength

    const initResponse = await fetch(
      'https://api.linkedin.com/rest/videos?action=initializeUpload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202503',
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: ownerUrn,
            fileSizeBytes: fileSize,
            uploadCaptions: false,
            uploadThumbnail: false,
          },
        }),
      }
    )

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      throw new Error(`Failed to initialize video upload: ${initResponse.status} - ${errorText}`)
    }

    const initData = await initResponse.json()
    const uploadUrl = initData.value?.uploadInstructions?.[0]?.uploadUrl
    const videoUrn = initData.value?.video

    if (!uploadUrl || !videoUrn) {
      throw new Error('No upload URL or video URN returned')
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': media.mimeType || 'video/mp4',
      },
      body: mediaBuffer,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload video: ${uploadResponse.status}`)
    }

    const finalizeResponse = await fetch(
      'https://api.linkedin.com/rest/videos?action=finalizeUpload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202503',
        },
        body: JSON.stringify({
          finalizeUploadRequest: {
            video: videoUrn,
            uploadToken: '',
            uploadedPartIds: [],
          },
        }),
      }
    )

    if (!finalizeResponse.ok) {
      console.log('[LinkedIn-Org] Video finalize response:', finalizeResponse.status)
    }

    console.log('[LinkedIn-Org] Organization video uploaded:', videoUrn)
    return videoUrn
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    try {
      // Try to get organization share statistics
      const response = await fetch(
        `${this.baseUrl}/organizationalEntityShareStatistics?q=organizationalEntity&shares=${encodeURIComponent(postId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202503',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const stats = data.elements?.[0]?.totalShareStatistics

        if (stats) {
          return {
            views: stats.impressionCount || 0,
            likes: stats.likeCount || 0,
            comments: stats.commentCount || 0,
            shares: stats.shareCount || 0,
            saves: 0,
            reach: stats.uniqueImpressionsCount || stats.impressionCount || 0,
            impressions: stats.impressionCount || 0,
          }
        }
      }

      return {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        impressions: 0,
      }
    } catch (error) {
      console.error('[LinkedIn-Org] Failed to get post analytics:', error)
      return {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        impressions: 0,
      }
    }
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken(userId)

    try {
      const response = await fetch(
        `https://api.linkedin.com/rest/posts/${encodeURIComponent(postId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202503',
          },
        }
      )
      return response.ok
    } catch {
      return false
    }
  }
}

export const linkedinOrgPublisher = new LinkedInOrgPublisher()
