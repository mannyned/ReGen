import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { extractUrlContent, formatUrlContentForAI } from '@/lib/utils/urlExtractor'

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

    if (description) {
      prompt += `\n\nAdditional Description: ${description}`
    }

    if (hashtags) {
      prompt += `\n\nInclude these hashtags: ${hashtags}`
    }

    // Platform-specific guidelines
    const platformGuidelines: Record<string, string> = {
      'TikTok': 'Keep it short, catchy, and use trending language. Max 150 characters.',
      'Instagram': 'Use line breaks, emojis, and storytelling. Include a call-to-action.',
      'YouTube': 'Make it compelling and SEO-friendly. Include keywords.',
      'X (Twitter)': 'Keep it concise and impactful. Max 280 characters.',
      'LinkedIn': 'Professional and insightful. Focus on value and learning.',
      'Facebook': 'Conversational and engaging. Encourage comments and shares.'
    }

    prompt += `\n\nPlatform Guidelines: ${platformGuidelines[platform] || 'Create an engaging caption.'}`

    // Tone-specific guidelines
    const toneGuidelines: Record<string, string> = {
      'professional': 'Use formal language, focus on expertise and credibility.',
      'engaging': 'Use exciting language, emojis, and create FOMO (fear of missing out).',
      'casual': 'Use friendly, conversational language. Be relatable and authentic.'
    }

    prompt += `\n\nTone Guidelines: ${toneGuidelines[tone] || 'Match the selected tone.'}`

    // Add image analysis instruction if image is provided
    if (imageData) {
      prompt += '\n\nAnalyze the uploaded image/video and create a caption that accurately reflects what you see in the visual content.'
    }

    prompt += '\n\nGenerate only the caption text, no explanations or metadata. Do NOT include the URL in the caption - it will be added automatically.'

    // Prepare messages for OpenAI API
    const messages: any[] = [
      {
        role: 'system',
        content: 'You are an expert social media content creator who writes compelling captions that drive engagement. You analyze images, videos, and linked article content to create captions that accurately reflect the content being shared. When article content is provided, reference key points and create engaging hooks that make people want to read more.'
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

    const generatedCaption = completion.choices[0]?.message?.content || 'Failed to generate caption'

    return NextResponse.json({
      caption: generatedCaption.trim(),
      platform,
      tone
    })

  } catch (error: any) {
    console.error('OpenAI API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate caption' },
      { status: 500 }
    )
  }
}
