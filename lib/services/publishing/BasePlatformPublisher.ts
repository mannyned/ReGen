import type {
  SocialPlatform,
  PlatformContent,
  PublishResult,
  PostAnalytics,
} from '../../types/social'
import { tokenManager } from '../oauth/TokenManager'
import { API_BASE_URLS, CONTENT_LIMITS } from '../../config/oauth'

// ============================================
// BASE PLATFORM PUBLISHER INTERFACE
// ============================================

export interface ContentPayload {
  mediaUrl: string
  mediaType: 'image' | 'video' | 'carousel'
  mimeType: string
  fileSize: number
  duration?: number
  // For carousel posts with multiple images
  additionalMediaUrls?: string[]
}

export interface PublishOptions {
  userId: string
  content: PlatformContent
  media?: ContentPayload  // Optional for text-only posts
  scheduledAt?: Date
  contentType?: 'post' | 'story'  // Post to feed or story/reel
}

export abstract class BasePlatformPublisher {
  protected abstract platform: SocialPlatform
  protected abstract baseUrl: string

  // ============================================
  // ABSTRACT METHODS (implement per platform)
  // ============================================

  abstract publishContent(options: PublishOptions): Promise<PublishResult>
  abstract getPostAnalytics(postId: string, userId: string): Promise<PostAnalytics>
  abstract deletePost(postId: string, userId: string): Promise<boolean>

  // ============================================
  // SHARED UTILITIES
  // ============================================

  protected async getAccessToken(userId: string): Promise<string> {
    const token = await tokenManager.getValidAccessToken(userId, this.platform)
    if (!token) {
      throw new Error(`No valid access token for ${this.platform}`)
    }
    return token
  }

  protected validateContent(content: PlatformContent, media?: ContentPayload): void {
    const limits = CONTENT_LIMITS[this.platform]

    // Validate caption length
    if (content.caption && content.caption.length > limits.maxCaptionLength) {
      throw new Error(
        `Caption exceeds maximum length of ${limits.maxCaptionLength} characters for ${this.platform}`
      )
    }

    // Validate hashtag count
    if (content.hashtags && content.hashtags.length > limits.maxHashtags) {
      throw new Error(
        `Too many hashtags. Maximum is ${limits.maxHashtags} for ${this.platform}`
      )
    }

    // Only validate media if provided (allows text-only posts)
    if (media) {
      // Validate video duration
      if (media.duration && media.duration > limits.maxVideoLengthSeconds) {
        throw new Error(
          `Video exceeds maximum duration of ${limits.maxVideoLengthSeconds} seconds for ${this.platform}`
        )
      }

      // Validate file size
      const fileSizeMb = media.fileSize / (1024 * 1024)
      if (fileSizeMb > limits.maxFileSizeMb) {
        throw new Error(
          `File exceeds maximum size of ${limits.maxFileSizeMb}MB for ${this.platform}`
        )
      }

      // Validate format
      const extension = media.mediaUrl.split('.').pop()?.toLowerCase()
      if (extension && !limits.supportedFormats.includes(extension)) {
        throw new Error(
          `File format .${extension} is not supported by ${this.platform}. Supported: ${limits.supportedFormats.join(', ')}`
        )
      }
    }
  }

  protected formatCaption(content: PlatformContent): string {
    let caption = content.caption || ''

    // Add hashtags
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagString = content.hashtags
        .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ')
      caption = `${caption}\n\n${hashtagString}`
    }

    // Add mentions
    if (content.mentionedUsers && content.mentionedUsers.length > 0) {
      const mentionString = content.mentionedUsers
        .map(user => (user.startsWith('@') ? user : `@${user}`))
        .join(' ')
      caption = `${caption}\n\n${mentionString}`
    }

    return caption.trim()
  }

  protected async makeApiRequest<T>(
    endpoint: string,
    options: RequestInit,
    accessToken: string
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API request failed: ${error}`)
    }

    return response.json()
  }
}
