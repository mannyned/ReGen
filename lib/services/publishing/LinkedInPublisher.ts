import { BasePlatformPublisher, ContentPayload, PublishOptions } from './BasePlatformPublisher'
import type { SocialPlatform, PublishResult, PostAnalytics } from '../../types/social'
import { API_BASE_URLS } from '../../config/oauth'

// Import providers to register them with the engine
import '@/lib/providers'
import { getAccessToken } from '@/lib/oauth/engine'

// ============================================
// LINKEDIN PUBLISHER
// Uses LinkedIn Marketing API
// Supports: text, images, videos, carousels, and article links
// ============================================

// URL regex pattern to detect links in text
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

export class LinkedInPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'linkedin'
  protected baseUrl = API_BASE_URLS.linkedin

  // Override to use OAuth engine instead of TokenManager
  // LinkedIn tokens are stored in oauth_connections table
  protected async getAccessToken(userId: string): Promise<string> {
    try {
      return await getAccessToken('linkedin', userId)
    } catch (error) {
      throw new Error(`No valid access token for ${this.platform}`)
    }
  }

  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options
    this.validateContent(content, media)

    const accessToken = await this.getAccessToken(userId)

    try {
      // Step 1: Get user URN
      const userUrn = await this.getUserUrn(accessToken)

      // Step 2: Determine post type and prepare media
      let assetUrns: string[] = []
      let mediaCategory: 'NONE' | 'IMAGE' | 'VIDEO' | 'ARTICLE' = 'NONE'

      if (media?.mediaUrl) {
        if (media.mediaType === 'video') {
          // Upload video and wait for processing
          const videoAsset = await this.uploadAndProcessVideo(accessToken, userUrn, media)
          assetUrns = [videoAsset]
          mediaCategory = 'VIDEO'
        } else if (media.mediaType === 'carousel' && media.additionalMediaUrls?.length) {
          // Upload all images for carousel
          const allUrls = [media.mediaUrl, ...media.additionalMediaUrls]
          assetUrns = await this.uploadMultipleImages(accessToken, userUrn, allUrls, media.mimeType)
          mediaCategory = 'IMAGE'
        } else {
          // Single image upload
          const imageAsset = await this.uploadMedia(accessToken, userUrn, media)
          assetUrns = [imageAsset]
          mediaCategory = 'IMAGE'
        }
      } else {
        // Check if caption contains a URL for article sharing
        const urls = content.caption?.match(URL_REGEX)
        if (urls && urls.length > 0) {
          mediaCategory = 'ARTICLE'
        }
      }

      // Step 3: Create share
      const share = await this.createShare(accessToken, userUrn, content, assetUrns, mediaCategory)

      return {
        success: true,
        platform: this.platform,
        platformPostId: share.id,
        platformUrl: `https://www.linkedin.com/feed/update/${share.id}`,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[LinkedIn] Publish error:', error)
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Failed to publish to LinkedIn',
      }
    }
  }

  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    const accessToken = await this.getAccessToken(userId)

    try {
      // Try to get social actions (likes, comments) for the post
      // This works for both personal profiles and organization posts
      const socialActionsResponse = await this.getSocialActions(accessToken, postId)

      // Also try organization statistics if available (requires rw_organization_admin scope)
      let orgStats = null
      try {
        orgStats = await this.getOrganizationShareStats(accessToken, postId)
      } catch (error) {
        // Organization stats may not be available for personal profiles
        console.log('[LinkedIn] Organization stats not available:', error instanceof Error ? error.message : 'Unknown error')
      }

      return {
        views: orgStats?.impressionCount || 0,
        likes: socialActionsResponse.likeCount || orgStats?.likeCount || 0,
        comments: socialActionsResponse.commentCount || orgStats?.commentCount || 0,
        shares: orgStats?.shareCount || 0,
        saves: 0, // LinkedIn doesn't expose saves
        reach: orgStats?.uniqueImpressionsCount || orgStats?.impressionCount || 0,
        impressions: orgStats?.impressionCount || 0,
      }
    } catch (error) {
      console.error('[LinkedIn] Failed to get post analytics:', error)
      // Return zeros if we can't get analytics
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

  /**
   * Get social actions (likes, comments) for a specific share
   * Works for both personal profiles and organization posts
   */
  private async getSocialActions(
    accessToken: string,
    shareUrn: string
  ): Promise<{ likeCount: number; commentCount: number }> {
    try {
      // First, try the socialActions summary endpoint (v2 API)
      // This provides aggregate counts for likes, comments, shares
      const socialActionsResponse = await fetch(
        `${this.baseUrl}/socialActions/${encodeURIComponent(shareUrn)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (socialActionsResponse.ok) {
        const data = await socialActionsResponse.json()
        console.log('[LinkedIn] Social actions response:', JSON.stringify(data))
        return {
          likeCount: data.likesSummary?.totalLikes || data.likesCount || 0,
          commentCount: data.commentsSummary?.totalFirstLevelComments || data.commentsCount || 0,
        }
      }

      console.log('[LinkedIn] socialActions endpoint failed:', socialActionsResponse.status)

      // Fallback: Try reactions endpoint with proper encoding
      // The share URN needs to be URL-encoded within the parentheses
      const encodedUrn = encodeURIComponent(shareUrn)
      const reactionsResponse = await fetch(
        `${this.baseUrl}/reactions?q=entity&entity=${encodedUrn}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      let likeCount = 0
      if (reactionsResponse.ok) {
        const reactionsData = await reactionsResponse.json()
        console.log('[LinkedIn] Reactions response:', JSON.stringify(reactionsData))
        likeCount = reactionsData.paging?.total || reactionsData.elements?.length || 0
      } else {
        console.log('[LinkedIn] reactions endpoint failed:', reactionsResponse.status)
      }

      // Try comments endpoint
      const commentsResponse = await fetch(
        `${this.baseUrl}/socialActions/${encodedUrn}/comments`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      let commentCount = 0
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json()
        console.log('[LinkedIn] Comments response:', JSON.stringify(commentsData))
        commentCount = commentsData.paging?.total || commentsData.elements?.length || 0
      } else {
        console.log('[LinkedIn] comments endpoint failed:', commentsResponse.status)
      }

      return { likeCount, commentCount }
    } catch (error) {
      console.error('[LinkedIn] Failed to get social actions:', error)
      return { likeCount: 0, commentCount: 0 }
    }
  }

  /**
   * Get organization share statistics
   * Only works for organization/company page posts with rw_organization_admin scope
   */
  private async getOrganizationShareStats(
    accessToken: string,
    shareUrn: string
  ): Promise<{
    impressionCount: number
    uniqueImpressionsCount: number
    likeCount: number
    commentCount: number
    shareCount: number
    clickCount: number
    engagement: number
  } | null> {
    // Extract organization URN from the share if possible, or use the share directly
    const response = await fetch(
      `${this.baseUrl}/organizationalEntityShareStatistics?q=organizationalEntity&shares=${encodeURIComponent(shareUrn)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LinkedIn organization stats failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const stats = data.elements?.[0]?.totalShareStatistics

    if (!stats) {
      return null
    }

    return {
      impressionCount: stats.impressionCount || 0,
      uniqueImpressionsCount: stats.uniqueImpressionsCount || 0,
      likeCount: stats.likeCount || 0,
      commentCount: stats.commentCount || 0,
      shareCount: stats.shareCount || 0,
      clickCount: stats.clickCount || 0,
      engagement: stats.engagement || 0,
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

  /**
   * Upload a single image to LinkedIn
   */
  private async uploadMedia(
    accessToken: string,
    ownerUrn: string,
    media: ContentPayload
  ): Promise<string> {
    // Step 1: Fetch the media file from URL
    console.log('[LinkedIn] Fetching image from URL:', media.mediaUrl)
    const mediaResponse = await fetch(media.mediaUrl)
    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch media file: ${mediaResponse.status}`)
    }
    const mediaBuffer = await mediaResponse.arrayBuffer()
    console.log('[LinkedIn] Image fetched, size:', mediaBuffer.byteLength)

    // Step 2: Register upload with LinkedIn
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
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
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
    console.log('[LinkedIn] Got upload URL, asset:', assetUrn)

    // Step 3: Upload the actual binary file data to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': media.mimeType,
      },
      body: mediaBuffer,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('[LinkedIn] Upload failed:', uploadResponse.status, errorText)
      throw new Error(`Failed to upload media to LinkedIn: ${uploadResponse.status}`)
    }

    console.log('[LinkedIn] Image uploaded successfully')
    return assetUrn
  }

  /**
   * Upload multiple images for carousel posts
   */
  private async uploadMultipleImages(
    accessToken: string,
    ownerUrn: string,
    imageUrls: string[],
    mimeType: string
  ): Promise<string[]> {
    console.log('[LinkedIn] Uploading carousel with', imageUrls.length, 'images')

    const assetUrns: string[] = []

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i]
      console.log(`[LinkedIn] Uploading carousel image ${i + 1}/${imageUrls.length}:`, url)

      // Fetch the image
      const mediaResponse = await fetch(url)
      if (!mediaResponse.ok) {
        throw new Error(`Failed to fetch carousel image ${i + 1}: ${mediaResponse.status}`)
      }
      const mediaBuffer = await mediaResponse.arrayBuffer()

      // Register upload
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
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
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

      // Upload the image
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': mimeType || 'image/jpeg',
        },
        body: mediaBuffer,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload carousel image ${i + 1}: ${uploadResponse.status}`)
      }

      assetUrns.push(assetUrn)
      console.log(`[LinkedIn] Carousel image ${i + 1} uploaded:`, assetUrn)
    }

    console.log('[LinkedIn] All carousel images uploaded:', assetUrns.length)
    return assetUrns
  }

  /**
   * Upload video and wait for LinkedIn to process it
   */
  private async uploadAndProcessVideo(
    accessToken: string,
    ownerUrn: string,
    media: ContentPayload
  ): Promise<string> {
    // Step 1: Fetch the video file
    console.log('[LinkedIn] Fetching video from URL:', media.mediaUrl)
    const mediaResponse = await fetch(media.mediaUrl)
    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch video file: ${mediaResponse.status}`)
    }
    const mediaBuffer = await mediaResponse.arrayBuffer()
    console.log('[LinkedIn] Video fetched, size:', mediaBuffer.byteLength)

    // Step 2: Register video upload
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
            recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
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
    console.log('[LinkedIn] Got video upload URL, asset:', assetUrn)

    // Step 3: Upload the video binary data
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': media.mimeType,
      },
      body: mediaBuffer,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('[LinkedIn] Video upload failed:', uploadResponse.status, errorText)
      throw new Error(`Failed to upload video to LinkedIn: ${uploadResponse.status}`)
    }

    console.log('[LinkedIn] Video uploaded successfully')

    // Note: We skip waiting for video processing because:
    // 1. Vercel serverless has 60 second timeout
    // 2. LinkedIn processes videos asynchronously
    // 3. The video will appear in the feed once LinkedIn finishes processing
    // The post will be created with the video asset, and LinkedIn handles the rest

    return assetUrn
  }

  /**
   * Poll LinkedIn until video is processed and ready
   */
  private async waitForVideoProcessing(
    accessToken: string,
    assetUrn: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.makeApiRequest<{
          recipes: Array<{
            recipe: string
            status: string
          }>
          serviceRelationships: Array<{
            relationshipType: string
            identifier: string
          }>
        }>(
          `/assets/${encodeURIComponent(assetUrn)}`,
          { method: 'GET' },
          accessToken
        )

        // Check if any recipe is complete
        const recipe = response.recipes?.[0]
        const status = recipe?.status

        console.log(`[LinkedIn] Video processing status (attempt ${attempt}/${maxAttempts}):`, status)

        if (status === 'AVAILABLE' || status === 'PROCESSING_COMPLETE') {
          return // Video is ready
        }

        if (status === 'FAILED' || status === 'ERROR') {
          throw new Error('LinkedIn video processing failed')
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (error) {
        // If we get a 404 or other error, the asset might not be ready yet
        console.log(`[LinkedIn] Video status check attempt ${attempt} failed, retrying...`)
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    }

    throw new Error('Video processing timed out - please try again')
  }

  /**
   * Create a LinkedIn share/post
   */
  private async createShare(
    accessToken: string,
    authorUrn: string,
    content: { caption: string; hashtags: string[]; settings?: Record<string, unknown> | object },
    assetUrns: string[],
    mediaCategory: 'NONE' | 'IMAGE' | 'VIDEO' | 'ARTICLE'
  ): Promise<{ id: string }> {
    const commentary = this.formatCaption(content)
    const settings = (content.settings || {}) as Record<string, unknown>

    // Build the share content based on media type
    const shareContent: Record<string, unknown> = {
      shareCommentary: {
        text: commentary,
      },
      shareMediaCategory: mediaCategory,
    }

    // Add media array for images/videos
    if (mediaCategory === 'IMAGE' && assetUrns.length > 0) {
      shareContent.media = assetUrns.map(assetUrn => ({
        status: 'READY',
        media: assetUrn,
      }))
    } else if (mediaCategory === 'VIDEO' && assetUrns.length > 0) {
      shareContent.media = [
        {
          status: 'READY',
          media: assetUrns[0],
        },
      ]
    } else if (mediaCategory === 'ARTICLE') {
      // Extract URL from caption for article preview
      const urls = content.caption?.match(URL_REGEX)
      if (urls && urls.length > 0) {
        shareContent.media = [
          {
            status: 'READY',
            originalUrl: urls[0],
          },
        ]
      }
    }

    const shareData: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': shareContent,
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility':
          settings.visibility || 'PUBLIC',
      },
    }

    console.log('[LinkedIn] Creating share with category:', mediaCategory, 'assets:', assetUrns.length)

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
