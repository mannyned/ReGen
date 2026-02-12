import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { extractUrlContent, formatUrlContentForAI } from '@/lib/utils/urlExtractor'
import { CONTENT_LIMITS } from '@/lib/config/oauth'
import type { SocialPlatform } from '@/lib/types/social'

// For App Router - extend timeout for AI generation
export const maxDuration = 60 // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Request body too large or invalid. If uploading media, please ensure files are under 10MB.' },
        { status: 413 }
      )
    }

    const { platform, tone, description, hashtags, imageData, urlContent, textContent } = body

    // Debug logging to trace content description
    console.log('[Generate Caption] Received inputs:', {
      platform,
      tone,
      hasDescription: !!description,
      description: description?.substring(0, 100),
      hasHashtags: !!hashtags,
      hashtags: hashtags?.substring(0, 50),
      hasImageData: !!imageData,
      hasUrlContent: !!urlContent,
      hasTextContent: !!textContent,
    })

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // If URL is provided, fetch and extract its content
    let extractedUrlData = null
    if (urlContent && urlContent.startsWith('http')) {
      console.log('[Generate Caption] Extracting content from URL:', urlContent)
      extractedUrlData = await extractUrlContent(urlContent)
      if (extractedUrlData.error) {
        console.warn('[Generate Caption] URL extraction error:', extractedUrlData.error)
      } else {
        console.log('[Generate Caption] Extracted URL content:', {
          title: extractedUrlData.title,
          description: extractedUrlData.description?.substring(0, 100),
          hasContent: !!extractedUrlData.content,
        })
      }
    }

    // Build the prompt based on inputs
    let prompt = `Generate a ${tone} social media caption for ${platform}.`

    // Add content description FIRST - this is the user's primary guidance
    if (description) {
      prompt += `\n\n**USER'S CONTENT DESCRIPTION (IMPORTANT - use this as the primary focus):**\n${description}`
    }

    // Add text content if provided
    if (textContent) {
      prompt += `\n\nUser's Text Content:\n${textContent}`
    }

    // Add URL content analysis if extracted
    if (extractedUrlData && !extractedUrlData.error) {
      const formattedUrlContent = formatUrlContentForAI(extractedUrlData)
      prompt += `\n\nLinked Article/Page Content:\n${formattedUrlContent}`
      prompt += `\n\nIMPORTANT: Create a caption that accurately reflects the linked article content. Reference key points, findings, or stories from the article.`
    } else if (urlContent) {
      // URL provided but couldn't be extracted
      prompt += `\n\nNote: A link will be shared (${urlContent}) but content could not be extracted. Create an engaging caption based on other provided context.`
    }

    if (hashtags) {
      prompt += `\n\nInclude these hashtags: ${hashtags}`
    }

    // Map platform display names to SocialPlatform type for limits lookup
    const platformKeyMap: Record<string, SocialPlatform> = {
      'TikTok': 'tiktok',
      'Instagram': 'instagram',
      'YouTube': 'youtube',
      'X (Twitter)': 'twitter',
      'LinkedIn': 'linkedin',
      'LinkedIn Company': 'linkedin-org',
      'Facebook': 'facebook',
      'Pinterest': 'pinterest',
      'Discord': 'discord',
      'Reddit': 'reddit',
    }

    // Get the platform key for limits lookup
    const platformKey = platformKeyMap[platform] || platform.toLowerCase() as SocialPlatform
    const platformLimits = CONTENT_LIMITS[platformKey]
    const maxChars = platformLimits?.maxCaptionLength || 2000

    // Platform-specific guidelines with actual character limits
    const platformGuidelines: Record<string, string> = {
      'TikTok': `Keep it catchy and use trending language. STRICT LIMIT: ${maxChars} characters maximum.`,
      'Instagram': `Use line breaks, emojis, and storytelling. Include a call-to-action. STRICT LIMIT: ${maxChars} characters maximum.`,
      'YouTube': `Make it compelling and SEO-friendly. Include keywords. STRICT LIMIT: ${maxChars} characters maximum.`,
      'X (Twitter)': `Keep it concise and impactful. STRICT LIMIT: ${maxChars} characters maximum - this is critical.`,
      'LinkedIn': `Professional and insightful. Focus on value and learning. STRICT LIMIT: ${maxChars} characters maximum.`,
      'LinkedIn Company': `Professional company voice. Focus on value and industry insights. STRICT LIMIT: ${maxChars} characters maximum.`,
      'Facebook': `Conversational and engaging. Encourage comments and shares. STRICT LIMIT: ${maxChars} characters maximum.`,
      'Pinterest': `Create a compelling pin description. Keep it descriptive but concise. STRICT LIMIT: ${maxChars} characters maximum - Pinterest has a short limit.`,
      'Discord': `Casual and community-friendly. STRICT LIMIT: ${maxChars} characters maximum.`,
      'Reddit': `Match the subreddit's tone. Be authentic. STRICT LIMIT: ${maxChars} characters maximum.`,
    }

    prompt += `\n\nPlatform Guidelines: ${platformGuidelines[platform] || `Create an engaging caption. STRICT LIMIT: ${maxChars} characters maximum.`}`
    prompt += `\n\nIMPORTANT: Your caption MUST be under ${maxChars} characters. Count your characters carefully. If including hashtags, they count toward this limit.`

    // Tone-specific guidelines
    const toneGuidelines: Record<string, string> = {
      'professional': 'Use formal language, focus on expertise and credibility.',
      'engaging': 'Use exciting language, emojis, and create FOMO (fear of missing out).',
      'casual': 'Use friendly, conversational language. Be relatable and authentic.'
    }

    prompt += `\n\nTone Guidelines: ${toneGuidelines[tone] || 'Match the selected tone.'}`

    // Add image analysis instruction if image is provided
    if (imageData) {
      if (description) {
        prompt += '\n\nAn image/video is attached. Use it to enhance the caption, but prioritize the user\'s content description above for the main message and theme.'
      } else {
        prompt += '\n\nAnalyze the uploaded image/video and create a caption that accurately reflects what you see in the visual content.'
      }
    }

    prompt += '\n\nGenerate only the caption text, no explanations or metadata. If the user included a URL or link in their content description, you may include it in the caption where appropriate.'

    // Prepare messages for OpenAI API
    const messages: any[] = [
      {
        role: 'system',
        content: `You are an expert social media content creator who writes compelling captions that drive engagement.

CRITICAL REQUIREMENTS:
1. ALWAYS respect character limits. The caption MUST fit within the platform's limit. Count characters carefully.
2. When a user provides a content description, incorporate it as the primary theme and message.
3. You can analyze images, videos, and linked article content to enhance the caption, but the user's content description takes priority.
4. When article content is provided, reference key points and create engaging hooks.
5. If hashtags are requested, include them within the character limit - they count toward the total.
6. For short-limit platforms like Twitter (280) or Pinterest (500), be concise and impactful.`
      }
    ]

    // If image data is provided, use vision model to analyze it
    if (imageData) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageData, // Expects base64 data URL or public URL
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      })
    } else {
      // Fallback to text-only if no image provided
      messages.push({
        role: 'user',
        content: prompt
      })
    }

    // Call OpenAI API with vision capabilities
    const completion = await openai.chat.completions.create({
      model: imageData ? 'gpt-4o' : 'gpt-4o-mini', // Use vision model when image is present
      messages,
      temperature: 0.8,
      max_tokens: 300,
    })

    let generatedCaption = completion.choices[0]?.message?.content || 'Failed to generate caption'
    generatedCaption = generatedCaption.trim()

    // Safety net: Truncate if caption still exceeds platform limit
    let wasTruncated = false
    if (generatedCaption.length > maxChars) {
      console.log(`[Generate Caption] Caption exceeded ${maxChars} char limit (${generatedCaption.length} chars), truncating...`)

      // Try to truncate at a sentence boundary
      let truncated = generatedCaption.substring(0, maxChars)
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('! '),
        truncated.lastIndexOf('? '),
        truncated.lastIndexOf('.\n'),
        truncated.lastIndexOf('!\n'),
        truncated.lastIndexOf('?\n')
      )

      // If we found a sentence boundary in the last 20% of the text, use it
      if (lastSentenceEnd > maxChars * 0.8) {
        truncated = truncated.substring(0, lastSentenceEnd + 1).trim()
      } else {
        // Otherwise truncate at last word boundary and add ellipsis
        const lastSpace = truncated.lastIndexOf(' ')
        if (lastSpace > maxChars * 0.8) {
          truncated = truncated.substring(0, lastSpace).trim()
        }
        // Remove trailing punctuation if incomplete and add ellipsis
        truncated = truncated.replace(/[,;:\-]$/, '').trim()
        if (truncated.length < maxChars - 3) {
          truncated += '...'
        }
      }

      generatedCaption = truncated
      wasTruncated = true
    }

    return NextResponse.json({
      caption: generatedCaption,
      platform,
      tone,
      characterLimit: maxChars,
      characterCount: generatedCaption.length,
      wasTruncated
    })

  } catch (error: any) {
    console.error('OpenAI API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate caption' },
      { status: 500 }
    )
  }
}
