import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { BrandVoiceProfile } from '@/app/types/brandVoice'
import { CONTENT_LIMITS } from '@/lib/config/oauth'
import type { SocialPlatform } from '@/lib/types/social'

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

  // Get platform character limits
  const platformKey = platform.toLowerCase() as SocialPlatform
  const platformLimits = CONTENT_LIMITS[platformKey]
  const maxChars = platformLimits?.maxCaptionLength || 2000

  // Platform-specific guidelines with actual character limits
  const platformGuidelines: Record<string, string> = {
    'tiktok': `Keep it catchy and use trending language. STRICT LIMIT: ${CONTENT_LIMITS.tiktok.maxCaptionLength} characters maximum.`,
    'instagram': `Use line breaks, emojis, and storytelling. Include a call-to-action. STRICT LIMIT: ${CONTENT_LIMITS.instagram.maxCaptionLength} characters maximum.`,
    'youtube': `Make it compelling and SEO-friendly. Include keywords. STRICT LIMIT: ${CONTENT_LIMITS.youtube.maxCaptionLength} characters maximum.`,
    'x': `Keep it concise and impactful. STRICT LIMIT: ${CONTENT_LIMITS.twitter.maxCaptionLength} characters maximum - this is critical.`,
    'twitter': `Keep it concise and impactful. STRICT LIMIT: ${CONTENT_LIMITS.twitter.maxCaptionLength} characters maximum - this is critical.`,
    'linkedin': `Professional and insightful. Focus on value and learning. STRICT LIMIT: ${CONTENT_LIMITS.linkedin.maxCaptionLength} characters maximum.`,
    'linkedin-org': `Professional company voice. Focus on industry insights. STRICT LIMIT: ${CONTENT_LIMITS['linkedin-org'].maxCaptionLength} characters maximum.`,
    'facebook': `Conversational and engaging. Encourage comments and shares. STRICT LIMIT: ${CONTENT_LIMITS.facebook.maxCaptionLength} characters maximum.`,
    'pinterest': `Descriptive and keyword-rich. Focus on searchability. STRICT LIMIT: ${CONTENT_LIMITS.pinterest.maxCaptionLength} characters maximum - Pinterest has a short limit.`,
    'discord': `Casual and community-focused. STRICT LIMIT: ${CONTENT_LIMITS.discord.maxCaptionLength} characters maximum.`,
    'reddit': `Authentic and discussion-oriented. Avoid being promotional. STRICT LIMIT: ${CONTENT_LIMITS.reddit.maxCaptionLength} characters maximum.`
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

  prompt += `\n\nIMPORTANT: Your caption MUST be under ${maxChars} characters. Count characters carefully. If including hashtags, they count toward this limit.`
  prompt += '\n\nGenerate only the caption text. Do not include explanations or metadata.'

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert social media content creator who writes compelling captions that drive engagement. When given a brand voice profile, you MUST write in that exact style, incorporating the specified tone, vocabulary, and patterns. The caption should feel authentic to the brand voice while being optimized for the target platform.

CRITICAL: Always respect character limits. The caption MUST fit within the platform's limit. For short-limit platforms like Twitter (280) or Pinterest (500), be concise and impactful.`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 300,
  })

  let caption = completion.choices[0]?.message?.content?.trim() || content

  // Safety net: Truncate if caption still exceeds platform limit
  if (caption.length > maxChars) {
    console.log(`[Brand Voice] Caption exceeded ${maxChars} char limit (${caption.length} chars), truncating...`)

    // Try to truncate at a sentence boundary
    let truncated = caption.substring(0, maxChars)
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
      // Otherwise truncate at last word boundary
      const lastSpace = truncated.lastIndexOf(' ')
      if (lastSpace > maxChars * 0.8) {
        truncated = truncated.substring(0, lastSpace).trim()
      }
      truncated = truncated.replace(/[,;:\-]$/, '').trim()
      if (truncated.length < maxChars - 3) {
        truncated += '...'
      }
    }

    caption = truncated
  }

  return caption
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