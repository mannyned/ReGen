export interface BrandVoiceProfile {
  id: string
  userId: string
  name: string
  description: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  // Tone characteristics
  toneAttributes: {
    formality: 'very_casual' | 'casual' | 'neutral' | 'professional' | 'very_formal'
    emotion: 'enthusiastic' | 'friendly' | 'neutral' | 'serious' | 'authoritative'
    humor: 'playful' | 'witty' | 'occasional' | 'minimal' | 'none'
    personality: 'bold' | 'approachable' | 'inspiring' | 'educational' | 'mysterious'
  }

  // Writing style patterns
  stylePatterns: {
    sentenceLength: 'very_short' | 'short' | 'medium' | 'long' | 'varied'
    vocabulary: 'simple' | 'conversational' | 'standard' | 'sophisticated' | 'technical'
    punctuation: 'minimal' | 'standard' | 'expressive' | 'creative'
    capitalization: 'standard' | 'lowercase' | 'emphasis' | 'creative'
  }

  // Content preferences
  contentPreferences: {
    emojiUsage: 'heavy' | 'moderate' | 'minimal' | 'none'
    hashtagStyle: 'trendy' | 'branded' | 'descriptive' | 'minimal'
    ctaStyle: 'direct' | 'soft' | 'question' | 'inspirational'
    storytelling: 'personal' | 'factual' | 'narrative' | 'data_driven'
  }

  // Learned patterns from user content
  learnedPatterns: {
    commonPhrases: string[]
    signatureWords: string[]
    openingStyles: string[]
    closingStyles: string[]
    hashtagPatterns: string[]
    emojiPreferences: string[]
  }

  // Sample content for training
  trainingContent: {
    samples: Array<{
      id: string
      content: string
      platform: string
      performance: {
        engagement: number
        reach: number
      }
      analyzedAt: Date
    }>
    totalSamples: number
    lastAnalyzedAt: Date
  }

  // AI confidence score
  confidence: {
    overall: number // 0-100
    toneAccuracy: number
    styleAccuracy: number
    vocabularyMatch: number
  }
}

export interface BrandVoiceAnalysis {
  detectedTone: BrandVoiceProfile['toneAttributes']
  detectedStyle: BrandVoiceProfile['stylePatterns']
  detectedPreferences: BrandVoiceProfile['contentPreferences']
  suggestedImprovements: string[]
  confidenceScore: number
}

export interface BrandVoiceGenerationOptions {
  profileId: string
  platform: string
  contentType: 'post' | 'story' | 'reel' | 'thread'
  tone?: 'default' | 'excited' | 'professional' | 'casual' | 'urgent'
  includeEmojis: boolean
  includeHashtags: boolean
  includeCTA: boolean
  maxLength?: number
}