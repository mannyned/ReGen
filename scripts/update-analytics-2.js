const fs = require('fs');
let content = fs.readFileSync('app/analytics/page.tsx', 'utf8');

// Update platformData to use real data when available
const oldPlatformData = `  // In production, show empty state. In development, show mock data for testing.
  const platformData = isProduction ? [] : [
    { platform: 'Instagram', posts: 24, engagement: 12.5, reach: 5200, growth: 2.3, bestTime: '6PM-8PM' },
    { platform: 'Twitter', posts: 45, engagement: 8.3, reach: 3800, growth: -1.2, bestTime: '12PM-2PM' },
    { platform: 'LinkedIn', posts: 18, engagement: 15.2, reach: 2900, growth: 5.7, bestTime: '9AM-11AM' },
    { platform: 'Facebook', posts: 32, engagement: 6.8, reach: 4100, growth: 0.8, bestTime: '7PM-9PM' },
    { platform: 'TikTok', posts: 28, engagement: 18.7, reach: 6500, growth: 8.9, bestTime: '5PM-7PM' }
  ]`;

const newPlatformData = `  // Build platform data from real API response when available
  const platformData = (() => {
    if (realStats?.platformEngagement && Object.keys(realStats.platformEngagement).length > 0) {
      const platformNameMap: Record<string, string> = {
        instagram: 'Instagram',
        twitter: 'Twitter',
        linkedin: 'LinkedIn',
        facebook: 'Facebook',
        tiktok: 'TikTok',
        youtube: 'YouTube',
        snapchat: 'Snapchat',
      }
      return Object.entries(realStats.platformEngagement).map(([platform, data]) => {
        const totalEngagement = data.likes + data.comments + data.shares + data.saves
        const engagementRate = data.reach > 0 ? ((totalEngagement / data.reach) * 100) : 0
        return {
          platform: platformNameMap[platform] || platform,
          posts: data.posts,
          engagement: parseFloat(engagementRate.toFixed(1)),
          reach: data.reach,
          growth: 0, // Would need historical data to calculate
          bestTime: '—', // Would need time-based analysis
        }
      })
    }
    // Fallback to mock data in development
    return isProduction ? [] : [
      { platform: 'Instagram', posts: 24, engagement: 12.5, reach: 5200, growth: 2.3, bestTime: '6PM-8PM' },
      { platform: 'Twitter', posts: 45, engagement: 8.3, reach: 3800, growth: -1.2, bestTime: '12PM-2PM' },
      { platform: 'LinkedIn', posts: 18, engagement: 15.2, reach: 2900, growth: 5.7, bestTime: '9AM-11AM' },
      { platform: 'Facebook', posts: 32, engagement: 6.8, reach: 4100, growth: 0.8, bestTime: '7PM-9PM' },
      { platform: 'TikTok', posts: 28, engagement: 18.7, reach: 6500, growth: 8.9, bestTime: '5PM-7PM' }
    ]
  })()`;

content = content.replace(oldPlatformData, newPlatformData);

// Update advancedMetrics to use real data
const oldAdvancedMetrics = `  const advancedMetrics = isProduction ? {
    sentimentScore: 0,
    audienceRetention: 0,
    viralityScore: 0,
    contentVelocity: 0,
    crossPlatformSynergy: 0,
    hashtagPerformance: 0
  } : {
    sentimentScore: 78,
    audienceRetention: 65,
    viralityScore: 42,
    contentVelocity: 3.2,
    crossPlatformSynergy: 85,
    hashtagPerformance: 72
  }`;

const newAdvancedMetrics = `  // Use real advanced metrics from API when available
  const advancedMetrics = (() => {
    if (realStats?.advancedMetrics) {
      return {
        sentimentScore: 0, // Would need sentiment analysis
        audienceRetention: 0, // Would need video retention data
        viralityScore: realStats.advancedMetrics.viralityScore,
        contentVelocity: realStats.advancedMetrics.contentVelocity,
        crossPlatformSynergy: realStats.advancedMetrics.crossPlatformSynergy,
        hashtagPerformance: realStats.advancedMetrics.hashtagPerformance
      }
    }
    return isProduction ? {
      sentimentScore: 0,
      audienceRetention: 0,
      viralityScore: 0,
      contentVelocity: 0,
      crossPlatformSynergy: 0,
      hashtagPerformance: 0
    } : {
      sentimentScore: 78,
      audienceRetention: 65,
      viralityScore: 42,
      contentVelocity: 3.2,
      crossPlatformSynergy: 85,
      hashtagPerformance: 72
    }
  })()`;

content = content.replace(oldAdvancedMetrics, newAdvancedMetrics);

fs.writeFileSync('app/analytics/page.tsx', content);
console.log('Platform data and advanced metrics updated');
