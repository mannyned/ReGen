import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { platform, tone, description, hashtags, imageData } = await request.json()

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

    // Build the prompt based on inputs
    let prompt = `Generate a ${tone} social media caption for ${platform}.`

    if (description) {
      prompt += `\n\nContent Description: ${description}`
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

    prompt += '\n\nAnalyze the uploaded image/video and create a caption that accurately reflects what you see in the visual content.'
    prompt += '\n\nGenerate only the caption text, no explanations or metadata.'

    // Prepare messages for OpenAI API
    const messages: any[] = [
      {
        role: 'system',
        content: 'You are an expert social media content creator who writes compelling captions that drive engagement. You analyze images and videos to create captions that accurately reflect the visual content.'
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
