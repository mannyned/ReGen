const OpenAI = require('openai');

// Initialize OpenAI client
let openai;
const OPENAI_ENABLED = !!process.env.OPENAI_API_KEY;

if (OPENAI_ENABLED) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI API client initialized');
} else {
  console.warn('⚠️  OPENAI_API_KEY not set - AI features will use fallback responses');
}

/**
 * Generate captions using OpenAI with brand voice support
 */
exports.generateCaptionsWithAI = async (content, platform, brandVoice = 'engaging and authentic') => {
  if (!OPENAI_ENABLED) {
    return [
      `${content.substring(0, 100)}... 🎉`,
      `Check out this amazing content for ${platform}! 🚀`,
      `New post alert! Don't miss this. 💫`,
    ];
  }

  try {
    const platformGuidelines = {
      instagram: 'Use emojis, keep it visual and aspirational. 2-3 sentences max.',
      tiktok: 'Be casual, trendy, use Gen Z language. Include trending phrases.',
      youtube: 'Be descriptive, include timestamps or key points. Can be longer.',
      x: 'Be concise and punchy. Keep under 280 characters. Use wit.',
    };

    const guideline = platformGuidelines[platform] || 'Be engaging and authentic';

    const prompt = `You are a social media content expert creating captions for ${platform}.

Content to repurpose: "${content}"

Brand voice: ${brandVoice}

Platform guidelines: ${guideline}

Generate 3 distinct caption variants:
1. Short & punchy (50-80 characters)
2. Descriptive & engaging (150-200 characters)
3. CTA-focused with hook (200-280 characters)

Return ONLY the 3 captions, separated by "---" (no numbering, no explanations).`;

    console.log('  🤖 Calling OpenAI API for captions...');

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert social media copywriter who creates engaging, platform-optimized captions.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 600,
    });

    const captionsText = response.choices[0].message.content.trim();
    const captions = captionsText
      .split('---')
      .map(caption => caption.trim())
      .filter(caption => caption.length > 0);

    if (captions.length === 0) {
      throw new Error('No captions generated');
    }

    console.log(`  ✅ Generated ${captions.length} caption variants`);

    while (captions.length < 3) {
      captions.push(`Great content for ${platform}! 🎉`);
    }

    return captions.slice(0, 3);

  } catch (error) {
    console.error('OpenAI caption generation error:', error.message);

    return [
      `${content.substring(0, 80)}...`,
      `Check out this amazing ${platform} content! 🚀`,
      `Don't miss this! Link in bio. 💫`,
    ];
  }
};

/**
 * Generate hashtags using OpenAI
 */
exports.generateHashtagsWithAI = async (content, platform, count = 6) => {
  if (!OPENAI_ENABLED) {
    return ['#content', '#socialmedia', '#viral', '#trending', `#${platform}`, '#fyp'];
  }

  try {
    const prompt = `Generate ${count} highly relevant, trending hashtags for this ${platform} content: "${content}"

Requirements:
- Mix of popular and niche hashtags
- Platform-appropriate (${platform})
- Include 2-3 broad reach hashtags
- Include 2-3 niche/specific hashtags

Return ONLY the hashtags, one per line, with the # symbol. No explanations.`;

    console.log('  🏷️  Calling OpenAI API for hashtags...');

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a social media hashtag expert who creates trending, platform-optimized hashtags.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const hashtagsText = response.choices[0].message.content.trim();
    const hashtags = hashtagsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('#'))
      .slice(0, count);

    if (hashtags.length === 0) {
      throw new Error('No hashtags generated');
    }

    console.log(`  ✅ Generated ${hashtags.length} hashtags`);

    return hashtags;

  } catch (error) {
    console.error('OpenAI hashtag generation error:', error.message);

    return [
      '#content',
      '#socialmedia',
      `#${platform}`,
      '#viral',
      '#trending',
      '#fyp',
    ].slice(0, count);
  }
};
