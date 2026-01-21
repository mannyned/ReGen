/**
 * Reddit Publishing Service
 *
 * Handles publishing content to Reddit via the Reddit API.
 *
 * Supports:
 * - Text posts (self posts)
 * - Link posts
 * - Image posts
 *
 * Does NOT support:
 * - Video posts (requires video hosting)
 * - Carousel/gallery posts
 *
 * @see https://www.reddit.com/dev/api/#POST_api_submit
 */

import type {
  SocialPlatform,
  PublishResult,
  PostAnalytics,
} from '../../types/social'
import { BasePlatformPublisher, PublishOptions } from './BasePlatformPublisher'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// CONSTANTS
// ============================================

const USER_AGENT = 'ReGen/1.0'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract subreddit from caption (looks for r/subredditname pattern)
 */
function extractSubreddit(caption: string): string | null {
  const match = caption.match(/r\/([a-zA-Z0-9_]+)/)
  return match ? match[1] : null
}

/**
 * Remove subreddit mention from caption
 */
function removeSubredditFromCaption(caption: string): string {
  return caption.replace(/\s*r\/[a-zA-Z0-9_]+\s*/g, ' ').trim()
}

// ============================================
// REDDIT PUBLISHER
// ============================================

class RedditPublisher extends BasePlatformPublisher {
  protected platform: SocialPlatform = 'reddit'
  protected baseUrl: string = API_BASE_URLS.reddit

  /**
   * Publish content to Reddit
   *
   * The subreddit can be specified in settings.subreddit or extracted
   * from the caption using r/subredditname pattern.
   */
  async publishContent(options: PublishOptions): Promise<PublishResult> {
    const { userId, content, media } = options

    try {
      const accessToken = await this.getAccessToken(userId)

      // Get subreddit from settings or extract from caption
      const subreddit =
        content.settings?.subreddit || extractSubreddit(content.caption || '')

      if (!subreddit) {
        return {
          success: false,
          platform: this.platform,
          error:
            'No subreddit specified. Include r/subredditname in your caption or set subreddit in settings.',
        }
      }

      // Prepare title and text
      const cleanCaption = removeSubredditFromCaption(content.caption || '')
      const title =
        content.settings?.title ||
        cleanCaption.substring(0, 300) ||
        'Posted via ReGen'

      // Build form data for Reddit API
      const formData = new URLSearchParams()
      formData.append('sr', subreddit)
      formData.append('title', title)
      formData.append('api_type', 'json')

      // Determine post type
      const postType = content.settings?.postType || this.determinePostType(media)

      if (postType === 'image' && media?.mediaUrl) {
        // Image post
        formData.append('kind', 'image')
        formData.append('url', media.mediaUrl)
      } else if (postType === 'link' && media?.mediaUrl) {
        // Link post
        formData.append('kind', 'link')
        formData.append('url', media.mediaUrl)
      } else {
        // Text (self) post
        formData.append('kind', 'self')
        formData.append('text', cleanCaption)
      }

      // Optional flags
      if (content.settings?.nsfw) {
        formData.append('nsfw', 'true')
      }
      if (content.settings?.spoiler) {
        formData.append('spoiler', 'true')
      }
      if (content.settings?.flair) {
        formData.append('flair_id', content.settings.flair)
      }

      console.log(`[RedditPublisher] Publishing to r/${subreddit}`, {
        postType,
        hasMedia: !!media,
      })

      const response = await fetch(`${this.baseUrl}/api/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[RedditPublisher] API error:', errorText)
        return {
          success: false,
          platform: this.platform,
          error: `Reddit API error: ${response.status} ${response.statusText}`,
        }
      }

      const data = await response.json()
      const result = data?.json

      // Check for Reddit API errors
      if (result?.errors && result.errors.length > 0) {
        const errorMessages = result.errors
          .map((e: string[]) => e[1] || e[0])
          .join(', ')
        return {
          success: false,
          platform: this.platform,
          error: `Reddit error: ${errorMessages}`,
        }
      }

      const postUrl = result?.data?.url || `https://reddit.com/r/${subreddit}`
      const postId = result?.data?.id || result?.data?.name

      console.log(`[RedditPublisher] Published successfully:`, {
        postId,
        postUrl,
      })

      return {
        success: true,
        platform: this.platform,
        platformPostId: postId,
        platformUrl: postUrl,
        publishedAt: new Date(),
      }
    } catch (error) {
      console.error('[RedditPublisher] Publish error:', error)
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Determine post type based on media
   */
  private determinePostType(
    media?: PublishOptions['media']
  ): 'text' | 'link' | 'image' {
    if (!media?.mediaUrl) {
      return 'text'
    }

    // Check if it's an image based on extension or mime type
    const isImage =
      media.mimeType?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif)$/i.test(media.mediaUrl)

    return isImage ? 'image' : 'link'
  }

  /**
   * Get post analytics from Reddit
   *
   * Fetches score, upvote_ratio, and comment count
   */
  async getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics> {
    try {
      const accessToken = await this.getAccessToken(userId)

      // Reddit uses t3_ prefix for posts (links)
      const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`

      const response = await fetch(
        `${this.baseUrl}/api/info?id=${fullPostId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': USER_AGENT,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`)
      }

      const data = await response.json()
      const post = data?.data?.children?.[0]?.data

      if (!post) {
        throw new Error('Post not found')
      }

      return {
        views: 0, // Reddit doesn't provide view counts via API
        likes: post.ups || 0,
        comments: post.num_comments || 0,
        shares: 0, // Reddit doesn't track shares
        saves: 0, // Reddit doesn't expose saves via API
        reach: 0,
        impressions: 0,
        // Reddit-specific metrics
        demographics: {
          ageRanges: {},
          genders: {},
          countries: {},
        },
        locationData: [],
        retentionCurve: [],
      }
    } catch (error) {
      console.error('[RedditPublisher] Analytics error:', error)
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
   * Delete a Reddit post
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(userId)

      // Reddit uses t3_ prefix for posts (links)
      const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`

      const response = await fetch(`${this.baseUrl}/api/del`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: new URLSearchParams({
          id: fullPostId,
        }).toString(),
      })

      if (!response.ok) {
        console.error('[RedditPublisher] Delete error:', response.status)
        return false
      }

      return true
    } catch (error) {
      console.error('[RedditPublisher] Delete error:', error)
      return false
    }
  }

  /**
   * Get user's subscribed subreddits
   *
   * Useful for suggesting subreddits in the UI
   */
  async getSubscribedSubreddits(
    userId: string
  ): Promise<Array<{ name: string; title: string; subscribers: number }>> {
    try {
      const accessToken = await this.getAccessToken(userId)

      const response = await fetch(
        `${this.baseUrl}/subreddits/mine/subscriber?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': USER_AGENT,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch subreddits: ${response.status}`)
      }

      const data = await response.json()

      return (
        data?.data?.children?.map((child: any) => ({
          name: child.data.display_name,
          title: child.data.title,
          subscribers: child.data.subscribers,
        })) || []
      )
    } catch (error) {
      console.error('[RedditPublisher] Subreddits error:', error)
      return []
    }
  }
}

// Export singleton instance
export const redditPublisher = new RedditPublisher()

export default redditPublisher
