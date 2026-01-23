/**
 * Metadata Extractor Service
 *
 * Extracts Open Graph and canonical metadata from article URLs.
 * Used by Blog Auto-Share to get og:title, og:description, og:image, and canonical URL.
 */

import crypto from 'crypto'

// ============================================
// TYPES
// ============================================

export interface ArticleMetadata {
  url: string
  canonicalUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  ogSiteName: string | null
  articleAuthor: string | null
  articlePublishedTime: string | null
  twitterTitle: string | null
  twitterDescription: string | null
  twitterImage: string | null
  // Fallbacks from regular meta tags
  metaTitle: string | null
  metaDescription: string | null
  // Final resolved values
  title: string
  description: string
  image: string | null
}

export interface ExtractionResult {
  success: boolean
  metadata: ArticleMetadata | null
  error?: string
  fetchDurationMs: number
}

// ============================================
// CONFIGURATION
// ============================================

const FETCH_TIMEOUT_MS = 10000 // 10 second timeout
const MAX_HTML_SIZE = 1024 * 1024 // 1MB max HTML size
const USER_AGENT = 'ReGenr-Bot/1.0 (+https://regenr.app/bot)'

// ============================================
// METADATA EXTRACTOR CLASS
// ============================================

export class MetadataExtractor {
  /**
   * Extract metadata from an article URL
   */
  async extractMetadata(url: string): Promise<ExtractionResult> {
    const startTime = Date.now()

    try {
      // Validate URL
      const parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          success: false,
          metadata: null,
          error: 'Invalid URL protocol - must be http or https',
          fetchDurationMs: Date.now() - startTime,
        }
      }

      // Fetch the page
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return {
          success: false,
          metadata: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          fetchDurationMs: Date.now() - startTime,
        }
      }

      // Check content type
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return {
          success: false,
          metadata: null,
          error: 'URL does not return HTML content',
          fetchDurationMs: Date.now() - startTime,
        }
      }

      // Get HTML content
      const html = await response.text()
      if (html.length > MAX_HTML_SIZE) {
        console.warn(`[MetadataExtractor] HTML size ${html.length} exceeds max, truncating`)
      }

      // Parse metadata from HTML
      const metadata = this.parseMetadata(url, html.slice(0, MAX_HTML_SIZE))

      return {
        success: true,
        metadata,
        fetchDurationMs: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Handle abort specifically
      if (errorMessage.includes('abort')) {
        return {
          success: false,
          metadata: null,
          error: 'Request timed out',
          fetchDurationMs: Date.now() - startTime,
        }
      }

      return {
        success: false,
        metadata: null,
        error: errorMessage,
        fetchDurationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Parse metadata from HTML content
   */
  private parseMetadata(url: string, html: string): ArticleMetadata {
    // Helper to extract meta content
    const getMeta = (nameOrProperty: string): string | null => {
      // Try property first (for Open Graph)
      const propertyMatch = html.match(
        new RegExp(`<meta[^>]+property=["']${nameOrProperty}["'][^>]+content=["']([^"']*)["']`, 'i')
      ) || html.match(
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${nameOrProperty}["']`, 'i')
      )
      if (propertyMatch) return propertyMatch[1]

      // Try name attribute
      const nameMatch = html.match(
        new RegExp(`<meta[^>]+name=["']${nameOrProperty}["'][^>]+content=["']([^"']*)["']`, 'i')
      ) || html.match(
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${nameOrProperty}["']`, 'i')
      )
      return nameMatch ? nameMatch[1] : null
    }

    // Extract canonical URL
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
      || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)
    const canonicalUrl = canonicalMatch ? canonicalMatch[1] : null

    // Extract Open Graph metadata
    const ogTitle = getMeta('og:title')
    const ogDescription = getMeta('og:description')
    const ogImage = getMeta('og:image')
    const ogSiteName = getMeta('og:site_name')

    // Extract article metadata
    const articleAuthor = getMeta('article:author') || getMeta('author')
    const articlePublishedTime = getMeta('article:published_time')

    // Extract Twitter Card metadata
    const twitterTitle = getMeta('twitter:title')
    const twitterDescription = getMeta('twitter:description')
    const twitterImage = getMeta('twitter:image')

    // Extract regular meta tags
    const metaDescription = getMeta('description')

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const metaTitle = titleMatch ? titleMatch[1].trim() : null

    // Resolve final values with fallback chain
    const title = ogTitle || twitterTitle || metaTitle || 'Untitled'
    const description = ogDescription || twitterDescription || metaDescription || ''
    const image = this.resolveImageUrl(url, ogImage || twitterImage)

    return {
      url,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
      ogSiteName,
      articleAuthor,
      articlePublishedTime,
      twitterTitle,
      twitterDescription,
      twitterImage,
      metaTitle,
      metaDescription,
      title,
      description,
      image,
    }
  }

  /**
   * Resolve relative image URLs to absolute
   */
  private resolveImageUrl(baseUrl: string, imageUrl: string | null): string | null {
    if (!imageUrl) return null

    try {
      // If already absolute, return as-is
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl
      }

      // Resolve relative URL
      const base = new URL(baseUrl)
      return new URL(imageUrl, base).href
    } catch {
      return null
    }
  }

  /**
   * Generate deduplication hash from RSS guid and canonical URL
   */
  static generateDedupeHash(guid: string, canonicalUrl: string | null): string {
    const input = `${guid}|${canonicalUrl || ''}`
    return crypto.createHash('sha256').update(input).digest('hex')
  }

  /**
   * Decode HTML entities in extracted text
   */
  static decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x27;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&#8211;': '–',
      '&#8212;': '—',
      '&#8216;': '\u2018',
      '&#8217;': '\u2019',
      '&#8220;': '\u201C',
      '&#8221;': '\u201D',
      '&hellip;': '…',
    }

    let decoded = text
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char)
    }

    // Handle numeric entities
    decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))

    return decoded
  }

  /**
   * Clean and truncate description for use as excerpt
   */
  static cleanExcerpt(description: string, maxLength: number = 200): string {
    // Decode HTML entities
    let clean = MetadataExtractor.decodeHtmlEntities(description)

    // Remove HTML tags
    clean = clean.replace(/<[^>]+>/g, '')

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim()

    // Truncate if needed
    if (clean.length > maxLength) {
      clean = clean.slice(0, maxLength - 3) + '...'
    }

    return clean
  }
}

// Singleton instance
export const metadataExtractor = new MetadataExtractor()
