import { NextRequest, NextResponse } from 'next/server'
import { BrandVoiceProfile } from '@/app/types/brandVoice'

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

    // Generate caption based on brand voice profile
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
) {
  // Base caption generation
  let caption = content

  // If no profile, return standard caption
  if (!profile) {
    return generateStandardCaption(content, platform, options)
  }

  // Apply brand voice characteristics
  const { toneAttributes, stylePatterns, contentPreferences, learnedPatterns } = profile

  // Apply tone
  if (toneAttributes) {
    caption = applyTone(caption, toneAttributes, options.tone)
  }

  // Apply style patterns
  if (stylePatterns) {
    caption = applyStyle(caption, stylePatterns)
  }

  // Add learned phrases and signature words
  if (learnedPatterns) {
    caption = incorporateLearnedPatterns(caption, learnedPatterns, platform)
  }

  // Add emojis based on preference
  if (options.includeEmojis && contentPreferences?.emojiUsage !== 'none') {
    caption = addEmojis(caption, contentPreferences.emojiUsage, learnedPatterns?.emojiPreferences)
  }

  // Add hashtags based on style
  if (options.includeHashtags && contentPreferences?.hashtagStyle !== 'minimal') {
    caption = addHashtags(caption, contentPreferences.hashtagStyle, learnedPatterns?.hashtagPatterns)
  }

  // Add CTA based on style
  if (options.includeCTA && contentPreferences?.ctaStyle) {
    caption = addCTA(caption, contentPreferences.ctaStyle, platform)
  }

  return caption
}

function generateStandardCaption(content: string, platform: string, options: any) {
  let caption = content

  // Add platform-specific formatting
  if (platform === 'instagram') {
    caption = `✨ ${content}\n\n`
    if (options.includeHashtags) {
      caption += '#contentcreator #socialmedia #instagram '
    }
    if (options.includeCTA) {
      caption += '\n\n👉 Follow for more!'
    }
  } else if (platform === 'tiktok') {
    caption = content
    if (options.includeHashtags) {
      caption += ' #fyp #viral #trending'
    }
  } else if (platform === 'linkedin') {
    caption = `${content}\n\n`
    if (options.includeCTA) {
      caption += 'What are your thoughts on this?'
    }
  }

  return caption
}

function applyTone(caption: string, toneAttributes: any, requestedTone: string) {
  const { formality, emotion, humor, personality } = toneAttributes

  // Apply formality
  if (formality === 'very_casual') {
    caption = caption.replace(/\byou\b/gi, 'u')
    caption = caption.replace(/\bgoing to\b/gi, 'gonna')
  } else if (formality === 'very_formal') {
    caption = `Dear valued community,\n\n${caption}\n\nBest regards,`
  }

  // Apply emotion
  if (emotion === 'enthusiastic' && requestedTone === 'excited') {
    caption = caption.toUpperCase().replace(/\./g, '!!!')
  } else if (emotion === 'friendly') {
    caption = `Hey friends! ${caption} 😊`
  }

  // Apply personality
  if (personality === 'bold') {
    caption = `🚀 ${caption} 💪`
  } else if (personality === 'inspiring') {
    caption = `✨ ${caption}\n\nBelieve in yourself! 🌟`
  }

  return caption
}

function applyStyle(caption: string, stylePatterns: any) {
  const { sentenceLength, vocabulary, punctuation, capitalization } = stylePatterns

  // Apply sentence length preference
  if (sentenceLength === 'very_short') {
    // Split into shorter sentences
    caption = caption.replace(/,\s/g, '. ')
  }

  // Apply punctuation style
  if (punctuation === 'expressive') {
    caption = caption.replace(/\!/g, '!!!')
    caption = caption.replace(/\?/g, '??')
  } else if (punctuation === 'creative') {
    caption = caption.replace(/\./g, '...')
  }

  // Apply capitalization style
  if (capitalization === 'lowercase') {
    caption = caption.toLowerCase()
  } else if (capitalization === 'emphasis') {
    // Capitalize key words
    const keywords = ['amazing', 'incredible', 'wow', 'new', 'exclusive']
    keywords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      caption = caption.replace(regex, word.toUpperCase())
    })
  }

  return caption
}

function incorporateLearnedPatterns(caption: string, patterns: any, platform: string) {
  const { commonPhrases, signatureWords, openingStyles, closingStyles } = patterns

  // Add opening style
  if (openingStyles && openingStyles.length > 0) {
    const opening = openingStyles[Math.floor(Math.random() * openingStyles.length)]
    caption = `${opening} ${caption}`
  }

  // Add signature words
  if (signatureWords && signatureWords.length > 0) {
    const word = signatureWords[Math.floor(Math.random() * signatureWords.length)]
    caption = caption.replace(/great/gi, word)
  }

  // Add closing style
  if (closingStyles && closingStyles.length > 0) {
    const closing = closingStyles[Math.floor(Math.random() * closingStyles.length)]
    caption = `${caption}\n\n${closing}`
  }

  return caption
}

function addEmojis(caption: string, usage: string, preferences?: string[]) {
  const defaultEmojis = ['✨', '🎉', '💫', '🌟', '💕', '🔥', '👏', '💯', '🚀', '💪']
  const emojis = preferences && preferences.length > 0 ? preferences : defaultEmojis

  if (usage === 'heavy') {
    // Add 5-8 emojis
    for (let i = 0; i < 6; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)]
      const position = Math.floor(Math.random() * caption.length)
      caption = caption.slice(0, position) + emoji + caption.slice(position)
    }
  } else if (usage === 'moderate') {
    // Add 2-3 emojis
    caption = `${emojis[0]} ${caption} ${emojis[1]}`
  } else if (usage === 'minimal') {
    // Add 1 emoji
    caption = `${caption} ${emojis[0]}`
  }

  return caption
}

function addHashtags(caption: string, style: string, patterns?: string[]) {
  const defaultHashtags = {
    trendy: ['#viral', '#fyp', '#trending', '#explore', '#foryou'],
    branded: ['#brandvoice', '#authentic', '#realcontent', '#brandstory'],
    descriptive: ['#contentcreation', '#socialmediamarketing', '#digitalstrategy']
  }

  let hashtags: string[] = []

  if (patterns && patterns.length > 0) {
    hashtags = patterns.slice(0, 5)
  } else {
    hashtags = defaultHashtags[style as keyof typeof defaultHashtags] || defaultHashtags.descriptive
  }

  if (style === 'trendy') {
    caption += '\n\n' + hashtags.slice(0, 10).join(' ')
  } else if (style === 'branded') {
    caption += '\n\n' + hashtags.slice(0, 5).join(' ')
  } else {
    caption += '\n\n' + hashtags.slice(0, 3).join(' ')
  }

  return caption
}

function addCTA(caption: string, style: string, platform: string) {
  const ctas = {
    direct: {
      instagram: '👉 Click the link in bio!',
      tiktok: '👆 Follow for more!',
      linkedin: '🔗 Connect with me for insights'
    },
    soft: {
      instagram: 'Would love to hear your thoughts below 💭',
      tiktok: 'Let me know if this helped! 🤗',
      linkedin: 'Feel free to share your experiences'
    },
    question: {
      instagram: 'What's your take on this? 🤔',
      tiktok: 'Have you tried this yet?',
      linkedin: 'What strategies have worked for you?'
    },
    inspirational: {
      instagram: 'Together we can achieve amazing things! ✨',
      tiktok: 'You've got this! 💪',
      linkedin: 'Let's elevate each other to success 🚀'
    }
  }

  const ctaText = ctas[style as keyof typeof ctas]?.[platform as keyof typeof ctas.direct] ||
                  'Thanks for reading!'

  return `${caption}\n\n${ctaText}`
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