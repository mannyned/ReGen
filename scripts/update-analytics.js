const fs = require('fs');
let content = fs.readFileSync('app/analytics/page.tsx', 'utf8');

// Update the AnalyticsStats interface
const oldInterface = `// Real analytics stats interface
interface AnalyticsStats {
  totalPosts: number
  postsThisWeek: number
  postsInRange: number
  deletedPosts: number
  queuedPosts: number
  failedPosts: number
  aiGenerated: number
  platformStats: Record<string, number>
}`;

const newInterface = `// Real analytics stats interface - matches /api/analytics/stats response
interface AnalyticsStats {
  totalPosts: number
  postsThisWeek: number
  postsInRange: number
  deletedPosts: number
  queuedPosts: number
  failedPosts: number
  aiGenerated: number
  platformStats: Record<string, number>
  timeRange: number
  engagement: {
    totalLikes: number
    totalComments: number
    totalShares: number
    totalSaves: number
    totalViews: number
    totalReach: number
    totalImpressions: number
    avgEngagementRate: string | null
    postsWithMetrics: number
  }
  platformEngagement: Record<string, {
    posts: number
    likes: number
    comments: number
    shares: number
    reach: number
    impressions: number
    saves: number
    views: number
  }>
  advancedMetrics: {
    contentVelocity: number
    viralityScore: number
    crossPlatformSynergy: number
    hashtagPerformance: number
    postsPerWeek: number
    avgReachPerPost: number
  }
}`;

content = content.replace(oldInterface, newInterface);

// Update the stats object to use real engagement data
const oldStats = `  // Stats using real data from API
  const stats = {
    totalPosts: realStats?.totalPosts?.toString() || '0',
    totalReach: '—', // Requires platform API access
    avgEngagement: '—', // Requires platform API access
    aiGenerated: realStats?.aiGenerated?.toString() || '0'
  }`;

const newStats = `  // Stats using real data from API
  const stats = {
    totalPosts: realStats?.totalPosts?.toString() || '0',
    totalReach: realStats?.engagement?.totalReach
      ? realStats.engagement.totalReach.toLocaleString()
      : '—',
    avgEngagement: realStats?.engagement?.avgEngagementRate
      ? realStats.engagement.avgEngagementRate + '%'
      : '—',
    aiGenerated: realStats?.aiGenerated?.toString() || '0'
  }`;

content = content.replace(oldStats, newStats);

fs.writeFileSync('app/analytics/page.tsx', content);
console.log('Analytics page updated successfully');
