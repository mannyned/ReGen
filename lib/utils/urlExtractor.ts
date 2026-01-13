/**
 * URL Content Extractor
 *
 * Fetches and extracts content from URLs for AI caption generation.
 * Extracts title, description, main content, and other metadata.
 */

export interface ExtractedUrlContent {
  url: string
  title: string | null
  description: string | null
  siteName: string | null
  content: string | null
  imageUrl: string | null
  author: string | null
  publishedDate: string | null
  error?: string
}

/**
 * Extract content from a URL
 * Fetches the page and extracts relevant metadata and content
 */
export async function extractUrlContent(url: string): Promise<ExtractedUrlContent> {
  const result: ExtractedUrlContent = {
    url,
    title: null,
    description: null,
    siteName: null,
    content: null,
    imageUrl: null,
    author: null,
    publishedDate: null,
  }

  try {
    // Validate URL
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { ...result, error: 'Invalid URL protocol' }
    }

    // Fetch the URL with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReGenrBot/1.0; +https://regenr.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { ...result, error: `Failed to fetch URL: ${response.status}` }
    }

    const html = await response.text()

    // Extract metadata from HTML
    result.title = extractMetaContent(html, 'og:title')
      || extractMetaContent(html, 'twitter:title')
      || extractTagContent(html, 'title')

    result.description = extractMetaContent(html, 'og:description')
      || extractMetaContent(html, 'twitter:description')
      || extractMetaContent(html, 'description')

    result.siteName = extractMetaContent(html, 'og:site_name')
      || extractDomain(url)

    result.imageUrl = extractMetaContent(html, 'og:image')
      || extractMetaContent(html, 'twitter:image')

    result.author = extractMetaContent(html, 'author')
      || extractMetaContent(html, 'article:author')

    result.publishedDate = extractMetaContent(html, 'article:published_time')
      || extractMetaContent(html, 'datePublished')

    // Extract main content (simplified extraction)
    result.content = extractMainContent(html)

    return result

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { ...result, error: 'Request timed out' }
      }
      return { ...result, error: error.message }
    }
    return { ...result, error: 'Failed to extract URL content' }
  }
}

/**
 * Extract content from meta tags
 */
function extractMetaContent(html: string, property: string): string | null {
  // Try property attribute (OpenGraph style)
  let match = html.match(new RegExp(`<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i'))
  if (match) return decodeHtmlEntities(match[1])

  // Try content before property
  match = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegex(property)}["']`, 'i'))
  if (match) return decodeHtmlEntities(match[1])

  // Try name attribute (standard meta style)
  match = html.match(new RegExp(`<meta[^>]+name=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i'))
  if (match) return decodeHtmlEntities(match[1])

  // Try content before name
  match = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegex(property)}["']`, 'i'))
  if (match) return decodeHtmlEntities(match[1])

  return null
}

/**
 * Extract content from HTML tags like <title>
 */
function extractTagContent(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'))
  return match ? decodeHtmlEntities(match[1].trim()) : null
}

/**
 * Extract main content from the page
 * Attempts to find article content, paragraphs, etc.
 */
function extractMainContent(html: string): string | null {
  // Remove script and style tags
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')

  // Try to find article content
  let articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) {
    cleanHtml = articleMatch[1]
  } else {
    // Try main content area
    const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch) {
      cleanHtml = mainMatch[1]
    }
  }

  // Extract paragraphs
  const paragraphs: string[] = []
  const pMatches = cleanHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)

  for (const match of pMatches) {
    const text = stripHtmlTags(match[1]).trim()
    if (text.length > 50) { // Only include substantial paragraphs
      paragraphs.push(text)
    }
  }

  // Join first few paragraphs (limit to ~1000 chars for AI context)
  let content = ''
  for (const para of paragraphs) {
    if (content.length + para.length > 1000) break
    content += para + '\n\n'
  }

  return content.trim() || null
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Format extracted content for AI prompt
 */
export function formatUrlContentForAI(content: ExtractedUrlContent): string {
  const parts: string[] = []

  if (content.title) {
    parts.push(`Title: ${content.title}`)
  }

  if (content.siteName) {
    parts.push(`Source: ${content.siteName}`)
  }

  if (content.author) {
    parts.push(`Author: ${content.author}`)
  }

  if (content.description) {
    parts.push(`Summary: ${content.description}`)
  }

  if (content.content) {
    parts.push(`Content Preview:\n${content.content}`)
  }

  if (parts.length === 0) {
    return `URL: ${content.url} (Could not extract content)`
  }

  return parts.join('\n\n')
}
