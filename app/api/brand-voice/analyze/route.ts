import { NextRequest, NextResponse } from 'next/server'
import { BrandVoiceAnalysis } from '@/app/types/brandVoice'

// Analyze user's content to learn their brand voice
export async function POST(request: NextRequest) {
  try {
    const { content, platform } = await request.json()

    if (!content || content.length < 50) {
      return NextResponse.json(
        { error: 'Please provide at least 50 characters of content for analysis' },
        { status: 400 }
      )
    }

    // Simulate AI analysis of the content
    const analysis = analyzeContent(content, platform)

    // In production, this would use GPT-4 or Claude for sophisticated analysis
    const brandVoiceAnalysis: BrandVoiceAnalysis = {
      detectedTone: {
        formality: analysis.formality as BrandVoiceAnalysis['detectedTone']['formality'],
        emotion: analysis.emotion as BrandVoiceAnalysis['detectedTone']['emotion'],
        humor: analysis.humor as BrandVoiceAnalysis['detectedTone']['humor'],
        personality: analysis.personality as BrandVoiceAnalysis['detectedTone']['personality']
      },
      detectedStyle: {
        sentenceLength: analysis.sentenceLength as BrandVoiceAnalysis['detectedStyle']['sentenceLength'],
        vocabulary: analysis.vocabulary as BrandVoiceAnalysis['detectedStyle']['vocabulary'],
        punctuation: analysis.punctuation as BrandVoiceAnalysis['detectedStyle']['punctuation'],
        capitalization: analysis.capitalization as BrandVoiceAnalysis['detectedStyle']['capitalization']
      },
      detectedPreferences: {
        emojiUsage: analysis.emojiUsage as BrandVoiceAnalysis['detectedPreferences']['emojiUsage'],
        hashtagStyle: analysis.hashtagStyle as BrandVoiceAnalysis['detectedPreferences']['hashtagStyle'],
        ctaStyle: analysis.ctaStyle as BrandVoiceAnalysis['detectedPreferences']['ctaStyle'],
        storytelling: analysis.storytelling as BrandVoiceAnalysis['detectedPreferences']['storytelling']
      },
      suggestedImprovements: [
        'Consider maintaining consistent emoji usage across posts',
        'Your CTAs are highly effective - keep using action-oriented language',
        'Try varying sentence length for better rhythm'
      ],
      confidenceScore: Math.round(75 + Math.random() * 20) // 75-95%
    }

    return NextResponse.json({
      success: true,
      analysis: brandVoiceAnalysis,
      summary: generateAnalysisSummary(brandVoiceAnalysis)
    })

  } catch (error: any) {
    console.error('Brand voice analysis error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function analyzeContent(content: string, platform: string) {
  const words = content.split(' ').length
  const sentences = content.split(/[.!?]+/).filter(s => s.trim()).length
  const avgWordPerSentence = words / sentences

  // Check for emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/gu
  const emojiCount = (content.match(emojiRegex) || []).length

  // Check for hashtags
  const hashtagCount = (content.match(/#\w+/g) || []).length

  // Analyze formality based on word choices
  const formalWords = ['therefore', 'however', 'furthermore', 'nevertheless', 'accordingly']
  const casualWords = ['gonna', 'wanna', 'lol', 'omg', 'hey', 'yeah', 'cool', 'awesome']

  let formalityScore = 0
  formalWords.forEach(word => {
    if (content.toLowerCase().includes(word)) formalityScore++
  })
  casualWords.forEach(word => {
    if (content.toLowerCase().includes(word)) formalityScore--
  })

  // Determine characteristics
  return {
    formality: formalityScore > 1 ? 'professional' :
               formalityScore < -1 ? 'casual' : 'neutral',

    emotion: content.includes('!') && content.includes('🎉') ? 'enthusiastic' :
             content.includes('😊') || content.includes('😄') ? 'friendly' :
             'neutral',

    humor: content.includes('😂') || content.includes('lol') ? 'playful' :
           content.includes('😉') ? 'witty' : 'minimal',

    personality: content.includes('🚀') || content.includes('💪') ? 'bold' :
                 content.includes('❤️') || content.includes('🤗') ? 'approachable' :
                 content.includes('✨') || content.includes('🌟') ? 'inspiring' :
                 'educational',

    sentenceLength: avgWordPerSentence < 10 ? 'short' :
                   avgWordPerSentence < 20 ? 'medium' : 'long',

    vocabulary: formalityScore > 1 ? 'sophisticated' :
                formalityScore < -1 ? 'conversational' : 'standard',

    punctuation: content.includes('!!!') || content.includes('...') ? 'expressive' : 'standard',

    capitalization: content === content.toLowerCase() ? 'lowercase' :
                   content.includes('AMAZING') || content.includes('WOW') ? 'emphasis' :
                   'standard',

    emojiUsage: emojiCount > 5 ? 'heavy' :
                emojiCount > 2 ? 'moderate' :
                emojiCount > 0 ? 'minimal' : 'none',

    hashtagStyle: hashtagCount > 10 ? 'trendy' :
                  hashtagCount > 5 ? 'descriptive' :
                  hashtagCount > 0 ? 'minimal' : 'minimal',

    ctaStyle: content.includes('?') && content.includes('you') ? 'question' :
              content.includes('Click') || content.includes('Shop') ? 'direct' :
              content.includes('Join') || content.includes('Discover') ? 'soft' :
              'inspirational',

    storytelling: content.includes('I') || content.includes('we') ? 'personal' :
                 content.includes('%') || content.includes('data') ? 'data_driven' :
                 content.length > 500 ? 'narrative' : 'factual'
  }
}

function generateAnalysisSummary(analysis: BrandVoiceAnalysis): string {
  const tone = analysis.detectedTone
  const style = analysis.detectedStyle
  const prefs = analysis.detectedPreferences

  return `Your brand voice is ${tone.formality} and ${tone.emotion} with ${tone.humor} humor. ` +
         `You write in ${style.sentenceLength} sentences using ${style.vocabulary} vocabulary. ` +
         `Your content shows ${prefs.emojiUsage} emoji usage and ${prefs.storytelling} storytelling style. ` +
         `Confidence: ${analysis.confidenceScore}%`
}