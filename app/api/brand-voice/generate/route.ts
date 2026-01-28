import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { BrandVoiceProfile } from '@/app/types/brandVoice'

// For App Router - extend timeout for AI generation
export const maxDuration = 60 // 60 seconds timeout

// Generate caption using brand voice profile
export async function POST(request: NextRequest) {
  try {
    const {
      content,
      platform,
      brandVoiceProfile,
      tone = 'default',
      includeEmojis = true,
      includeHashtags = true,
      includeCTA = true
    } = await request.json()

    if (!content || !platform) {
      return NextResponse.json(
        { error: 'Content and platform are required' },
        { status: 400 }
      )
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured.' },
        { status: 500 }
      )
    }

    // Generate caption using AI with brand voice profile
    const caption = await generateBrandVoiceCaption(
      content,
      platform,
      brandVoiceProfile,
      { tone, includeEmojis, includeHashtags, includeCTA }
    )

    // Generate variations for A/B testing
    const variations = generateVariations(caption, brandVoiceProfile)

    return NextResponse.json({
      success: true,
      caption,
      variations,
      appliedProfile: brandVoiceProfile?.name || 'Default',
      confidence: brandVoiceProfile?.confidence?.overall || 85
    })

  } catch (error: any) {
    console.error('Brand voice generation error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

async function generateBrandVoiceCaption(
  content: string,
  platform: string,
  profile: Partial<BrandVoiceProfile> | null,
  options: any
): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Build brand voice instructions from profile
  let brandVoiceInstructions = ''

  if (profile) {
    const { toneAttributes, stylePatterns, contentPreferences, learnedPatterns } = profile

    brandVoiceInstructions = `\n\n**BRAND VOICE PROFILE - "${profile.name || 'Custom'}":**`

    // Tone attributes
    if (toneAttributes) {
      brandVoiceInstructions += `\n- Formality: ${toneAttributes.formality || 'balanced'}`
      brandVoiceInstructions += `\n- Emotion: ${toneAttributes.emotion || 'friendly'}`
      brandVoiceInstructions += `\n- Personality: ${toneAttributes.personality || 'authentic'}`
      if (toneAttributes.humor) brandVoiceInstructions += `\n- Humor: ${toneAttributes.humor}`
    }

    // Style patterns
    if (stylePatterns) {
      if (stylePatterns.sentenceLength) brandVoiceInstructions += `\n- Sentence length: ${stylePatterns.sentenceLength}`
      if (stylePatterns.vocabulary) brandVoiceInstructions += `\n- Vocabulary: ${stylePatterns.vocabulary}`
      if (stylePatterns.punctuation) brandVoiceInstructions += `\n- Punctuation style: ${stylePatterns.punctuation}`
    }

    // Learned patterns
    if (learnedPatterns) {
      if (learnedPatterns.signatureWords?.length) {
        brandVoiceInstructions += `\n- Signature words to use: ${learnedPatterns.signatureWords.slice(0, 5).join(', ')}`
      }
      if (learnedPatterns.commonPhrases?.length) {
        brandVoiceInstructions += `\n- Common phrases: ${learnedPatterns.commonPhrases.slice(0, 3).join('; ')}`
      }
      if (learnedPatterns.openingStyles?.length) {
        brandVoiceInstructions += `\n- Opening style examples: ${learnedPatterns.openingStyles.slice(0, 2).join('; ')}`
      }
    }

    // Content preferences
    if (contentPreferences) {
      if (contentPreferences.emojiUsage) brandVoiceInstructions += `\n- Emoji usage: ${contentPreferences.emojiUsage}`
      if (contentPreferences.hashtagStyle) brandVoiceInstructions += `\n- Hashtag style: ${contentPreferences.hashtagStyle}`
      if (contentPreferences.ctaStyle) brandVoiceInstructions += `\n- CTA style: ${contentPreferences.ctaStyle}`
    }
  }

  // Platform-specific guidelines
  const platformGuidelines: Record<string, string> = {
    'tiktok': 'Keep it short, catchy, and use trending language. Max 150 characters ideal.',
    'instagram': 'Use line breaks, emojis, and storytelling. Include a call-to-action.',
    'youtube': 'Make it compelling and SEO-friendly. Include keywords.',
    'x': 'Keep it concise and impactful. Max 280 characters.',
    'twitter': 'Keep it concise and impactful. Max 280 characters.',
    'linkedin': 'Professional and insightful. Focus on value and learning.',
    'facebook': 'Conversational and engaging. Encourage comments and shares.',
    'pinterest': 'Descriptive and keyword-rich. Focus on searchability.',
    'discord': 'Casual and community-focused.',
    'reddit': 'Authentic and discussion-oriented. Avoid being promotional.'
  }

  // Build the prompt
  let prompt = `Generate a social media caption for ${platform}.

**CONTENT TO WRITE ABOUT:**
${content}

**PLATFORM GUIDELINES:**
${platformGuidelines[platform.toLowerCase()] || 'Create an engaging caption.'}`

  prompt += brandVoiceInstructions

  // Add preferences
  if (options.includeEmojis) {
    prompt += '\n\nInclude appropriate emojis.'
  }
  if (options.includeHashtags) {
    prompt += '\nInclude 3-5 relevant hashtags.'
  }
  if (options.includeCTA) {
    prompt += '\nInclude a call-to-action.'
  }

  // Tone override
  if (options.tone && options.tone !== 'default') {
    prompt += `\n\nOverall tone should be: ${options.tone}`
  }

  prompt += '\n\nGenerate only the caption text. Do not include explanations or metadata.'

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert social media content creator who writes compelling captions that drive engagement. When given a brand voice profile, you MUST write in that exact style, incorporating the specified tone, vocabulary, and patterns. The caption should feel authentic to the brand voice while being optimized for the target platform.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 300,
  })

  return completion.choices[0]?.message?.content?.trim() || content
}

function generateVariations(baseCaption: string, profile: any) {
  const variations = []

  // Variation 1: More casual
  variations.push({
    type: 'casual',
    caption: baseCaption.replace(/\./g, '!').toLowerCase(),
    description: 'More relaxed and friendly tone'
  })

  // Variation 2: More professional
  variations.push({
    type: 'professional',
    caption: baseCaption.replace(/!/g, '.').replace(/u\b/g, 'you'),
    description: 'More formal and business-like'
  })

  // Variation 3: More engaging
  variations.push({
    type: 'engaging',
    caption: `🎯 ${baseCaption}\n\nDrop a ❤️ if you agree!`,
    description: 'Higher engagement potential'
  })

  return variations
}