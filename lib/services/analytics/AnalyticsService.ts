import type {
  SocialPlatform,
  PostAnalytics,
  AccountAnalytics,
  Demographics,
  LocationData,
  RetentionPoint,
} from '../../types/social'
import { tokenManager } from '../oauth/TokenManager'
import { API_BASE_URLS } from '../../config/oauth'

// ============================================
// ANALYTICS SERVICE
// Fetches analytics from all connected platforms
// ============================================

export class AnalyticsService {
  // ============================================
  // ACCOUNT-LEVEL ANALYTICS
  // ============================================

  async getAccountAnalytics(
    userId: string,
    platform: SocialPlatform,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    const accessToken = await tokenManager.getValidAccessToken(userId, platform)

    if (!accessToken) {
      throw new Error(`No valid access token for ${platform}`)
    }

    const fetchers: Record<SocialPlatform, () => Promise<AccountAnalytics>> = {
      instagram: () => this.getInstagramAccountAnalytics(accessToken, dateRange),
      tiktok: () => this.getTikTokAccountAnalytics(accessToken, dateRange),
      youtube: () => this.getYouTubeAccountAnalytics(accessToken, dateRange),
      twitter: () => this.getTwitterAccountAnalytics(accessToken, dateRange),
      linkedin: () => this.getLinkedInAccountAnalytics(accessToken, dateRange),
      facebook: () => this.getFacebookAccountAnalytics(accessToken, dateRange),
      meta: () => this.getInstagramAccountAnalytics(accessToken, dateRange), // Meta uses Instagram analytics
      snapchat: () => this.getSnapchatAccountAnalytics(accessToken, dateRange),
      pinterest: () => this.getPinterestAccountAnalytics(accessToken, dateRange),
      discord: () => this.getDiscordAccountAnalytics(accessToken, dateRange),
    }

    return fetchers[platform]()
  }

  // ============================================
  // AGGREGATED ANALYTICS (All Platforms)
  // ============================================

  async getAggregatedAnalytics(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalFollowers: number
    totalEngagement: number
    platformBreakdown: Record<SocialPlatform, AccountAnalytics | null>
    topPerformingPlatform: SocialPlatform | null
    growthRate: number
  }> {
    const connections = await tokenManager.getUserConnections(userId)
    const platformBreakdown: Record<SocialPlatform, AccountAnalytics | null> = {
      instagram: null,
      tiktok: null,
      youtube: null,
      twitter: null,
      linkedin: null,
      facebook: null,
      meta: null,
      snapchat: null,
      pinterest: null,
      discord: null,
    }

    let totalFollowers = 0
    let totalEngagement = 0
    let topEngagement = 0
    let topPerformingPlatform: SocialPlatform | null = null

    for (const connection of connections) {
      try {
        const analytics = await this.getAccountAnalytics(
          userId,
          connection.platform,
          dateRange
        )

        platformBreakdown[connection.platform] = analytics
        totalFollowers += analytics.followers
        totalEngagement += analytics.avgEngagementRate * analytics.followers

        if (analytics.avgEngagementRate > topEngagement) {
          topEngagement = analytics.avgEngagementRate
          topPerformingPlatform = connection.platform
        }
      } catch (error) {
        console.error(`Failed to get analytics for ${connection.platform}:`, error)
        platformBreakdown[connection.platform] = null
      }
    }

    return {
      totalFollowers,
      totalEngagement: totalFollowers > 0 ? totalEngagement / totalFollowers : 0,
      platformBreakdown,
      topPerformingPlatform,
      growthRate: 0, // Would calculate from historical data
    }
  }

  // ============================================
  // LOCATION ANALYTICS
  // ============================================

  async getLocationAnalytics(
    userId: string,
    platform: SocialPlatform
  ): Promise<LocationData[]> {
    const accessToken = await tokenManager.getValidAccessToken(userId, platform)

    if (!accessToken) {
      throw new Error(`No valid access token for ${platform}`)
    }

    // Platform-specific location analytics
    switch (platform) {
      case 'instagram':
        return this.getInstagramLocationData(accessToken)
      case 'youtube':
        return this.getYouTubeLocationData(accessToken)
      case 'facebook':
        return this.getFacebookLocationData(accessToken)
      default:
        // Other platforms may not provide detailed location data
        return []
    }
  }

  // ============================================
  // RETENTION ANALYTICS (Video)
  // ============================================

  async getRetentionAnalytics(
    userId: string,
    platform: SocialPlatform,
    postId: string
  ): Promise<RetentionPoint[]> {
    const accessToken = await tokenManager.getValidAccessToken(userId, platform)

    if (!accessToken) {
      throw new Error(`No valid access token for ${platform}`)
    }

    switch (platform) {
      case 'youtube':
        return this.getYouTubeRetention(accessToken, postId)
      case 'tiktok':
        return this.getTikTokRetention(accessToken, postId)
      default:
        return []
    }
  }

  // ============================================
  // SAVE RATE ANALYTICS
  // ============================================

  async getSaveRateAnalytics(
    userId: string,
    platform: SocialPlatform,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalSaves: number
    saveRate: number
    topSavedPosts: Array<{ postId: string; saves: number; format: string }>
    formatBreakdown: Record<string, { saves: number; posts: number; rate: number }>
  }> {
    const accessToken = await tokenManager.getValidAccessToken(userId, platform)

    if (!accessToken) {
      throw new Error(`No valid access token for ${platform}`)
    }

    // Platform-specific save rate analytics
    switch (platform) {
      case 'instagram':
        return this.getInstagramSaveRate(accessToken, dateRange)
      default:
        return {
          totalSaves: 0,
          saveRate: 0,
          topSavedPosts: [],
          formatBreakdown: {},
        }
    }
  }

  // ============================================
  // PLATFORM-SPECIFIC IMPLEMENTATIONS
  // ============================================

  private async getInstagramAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    const response = await fetch(
      `${API_BASE_URLS.instagram}/me?fields=id,username,followers_count,follows_count,media_count&access_token=${accessToken}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram account analytics')
    }

    const data = await response.json()

    // Get insights
    const insightsResponse = await fetch(
      `${API_BASE_URLS.instagram}/${data.id}/insights?metric=impressions,reach,profile_views&period=day&since=${Math.floor(dateRange.start.getTime() / 1000)}&until=${Math.floor(dateRange.end.getTime() / 1000)}&access_token=${accessToken}`
    )

    const insights = await insightsResponse.json()

    return {
      followers: data.followers_count || 0,
      following: data.follows_count || 0,
      totalPosts: data.media_count || 0,
      avgEngagementRate: 0, // Calculate from post data
      avgReach: this.extractMetricValue(insights, 'reach'),
      avgImpressions: this.extractMetricValue(insights, 'impressions'),
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getTikTokAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    const response = await fetch(
      `${API_BASE_URLS.tiktok}/user/info/?fields=follower_count,following_count,video_count,likes_count`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch TikTok account analytics')
    }

    const { data } = await response.json()

    return {
      followers: data.user?.follower_count || 0,
      following: data.user?.following_count || 0,
      totalPosts: data.user?.video_count || 0,
      avgEngagementRate: 0,
      avgReach: 0,
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getYouTubeAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    const channelResponse = await fetch(
      `${API_BASE_URLS.youtube}/channels?part=statistics,snippet&mine=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!channelResponse.ok) {
      throw new Error('Failed to fetch YouTube account analytics')
    }

    const channelData = await channelResponse.json()
    const channel = channelData.items?.[0]

    if (!channel) {
      throw new Error('No YouTube channel found')
    }

    // Get analytics from YouTube Analytics API
    const analyticsResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained&dimensions=day&startDate=${dateRange.start.toISOString().split('T')[0]}&endDate=${dateRange.end.toISOString().split('T')[0]}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    return {
      followers: parseInt(channel.statistics?.subscriberCount || '0'),
      following: 0, // YouTube doesn't have following
      totalPosts: parseInt(channel.statistics?.videoCount || '0'),
      avgEngagementRate: 0,
      avgReach: parseInt(channel.statistics?.viewCount || '0'),
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getTwitterAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    const response = await fetch(
      `${API_BASE_URLS.twitter}/users/me?user.fields=public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Twitter account analytics')
    }

    const { data } = await response.json()

    return {
      followers: data.public_metrics?.followers_count || 0,
      following: data.public_metrics?.following_count || 0,
      totalPosts: data.public_metrics?.tweet_count || 0,
      avgEngagementRate: 0,
      avgReach: 0,
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getLinkedInAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    // LinkedIn analytics are limited for personal profiles
    const response = await fetch(
      `${API_BASE_URLS.linkedin}/connections?q=viewer&count=0`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    return {
      followers: 0, // LinkedIn doesn't expose follower count easily
      following: 0,
      totalPosts: 0,
      avgEngagementRate: 0,
      avgReach: 0,
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getFacebookAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    const response = await fetch(
      `${API_BASE_URLS.facebook}/me/accounts?fields=id,name,fan_count&access_token=${accessToken}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Facebook account analytics')
    }

    const data = await response.json()
    const page = data.data?.[0]

    if (!page) {
      return {
        followers: 0,
        following: 0,
        totalPosts: 0,
        avgEngagementRate: 0,
        avgReach: 0,
        avgImpressions: 0,
        followerGrowth: 0,
        topPosts: [],
      }
    }

    return {
      followers: page.fan_count || 0,
      following: 0,
      totalPosts: 0,
      avgEngagementRate: 0,
      avgReach: 0,
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getSnapchatAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    // Snapchat analytics are primarily for ads
    return {
      followers: 0,
      following: 0,
      totalPosts: 0,
      avgEngagementRate: 0,
      avgReach: 0,
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getPinterestAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    // Pinterest analytics - coming soon
    return {
      followers: 0,
      following: 0,
      totalPosts: 0,
      avgEngagementRate: 0,
      avgReach: 0,
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  private async getDiscordAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    // Discord analytics - coming soon
    return {
      followers: 0,
      following: 0,
      totalPosts: 0,
      avgEngagementRate: 0,
      avgReach: 0,
      avgImpressions: 0,
      followerGrowth: 0,
      topPosts: [],
    }
  }

  // ============================================
  // LOCATION DATA FETCHERS
  // ============================================

  private async getInstagramLocationData(accessToken: string): Promise<LocationData[]> {
    const response = await fetch(
      `${API_BASE_URLS.instagram}/me/insights?metric=audience_country,audience_city&period=lifetime&access_token=${accessToken}`
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const countryData = data.data?.find((d: { name: string }) => d.name === 'audience_country')

    if (!countryData?.values?.[0]?.value) {
      return []
    }

    return Object.entries(countryData.values[0].value).map(([country, percentage]) => ({
      country,
      percentage: percentage as number,
      engagement: 0,
    }))
  }

  private async getYouTubeLocationData(accessToken: string): Promise<LocationData[]> {
    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views&dimensions=country&sort=-views&maxResults=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const totalViews = data.rows?.reduce((sum: number, row: number[]) => sum + row[1], 0) || 1

    return (data.rows || []).map((row: [string, number]) => ({
      country: row[0],
      percentage: (row[1] / totalViews) * 100,
      engagement: row[1],
    }))
  }

  private async getFacebookLocationData(accessToken: string): Promise<LocationData[]> {
    const response = await fetch(
      `${API_BASE_URLS.facebook}/me/insights?metric=page_fans_country&period=lifetime&access_token=${accessToken}`
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const countryData = data.data?.[0]?.values?.[0]?.value || {}

    const total = Object.values(countryData).reduce((sum: number, val) => sum + (val as number), 0)

    return Object.entries(countryData).map(([country, count]) => ({
      country,
      percentage: total > 0 ? ((count as number) / total) * 100 : 0,
      engagement: count as number,
    }))
  }

  // ============================================
  // RETENTION DATA FETCHERS
  // ============================================

  private async getYouTubeRetention(
    accessToken: string,
    videoId: string
  ): Promise<RetentionPoint[]> {
    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=audienceWatchRatio&dimensions=elapsedVideoTimeRatio&filters=video==${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    return (data.rows || []).map((row: [number, number]) => ({
      timestamp: row[0] * 100, // Convert ratio to percentage
      retention: row[1] * 100,
    }))
  }

  private async getTikTokRetention(
    accessToken: string,
    videoId: string
  ): Promise<RetentionPoint[]> {
    // TikTok doesn't provide detailed retention data via API
    return []
  }

  // ============================================
  // SAVE RATE ANALYTICS
  // ============================================

  private async getInstagramSaveRate(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalSaves: number
    saveRate: number
    topSavedPosts: Array<{ postId: string; saves: number; format: string }>
    formatBreakdown: Record<string, { saves: number; posts: number; rate: number }>
  }> {
    const response = await fetch(
      `${API_BASE_URLS.instagram}/me/media?fields=id,media_type,insights.metric(saved,impressions)&access_token=${accessToken}`
    )

    if (!response.ok) {
      return {
        totalSaves: 0,
        saveRate: 0,
        topSavedPosts: [],
        formatBreakdown: {},
      }
    }

    const data = await response.json()
    let totalSaves = 0
    let totalImpressions = 0
    const topSavedPosts: Array<{ postId: string; saves: number; format: string }> = []
    const formatBreakdown: Record<string, { saves: number; posts: number; rate: number }> = {}

    for (const post of data.data || []) {
      const saves = post.insights?.data?.find((i: { name: string }) => i.name === 'saved')?.values?.[0]?.value || 0
      const impressions = post.insights?.data?.find((i: { name: string }) => i.name === 'impressions')?.values?.[0]?.value || 1
      const format = post.media_type || 'IMAGE'

      totalSaves += saves
      totalImpressions += impressions

      topSavedPosts.push({
        postId: post.id,
        saves,
        format,
      })

      if (!formatBreakdown[format]) {
        formatBreakdown[format] = { saves: 0, posts: 0, rate: 0 }
      }
      formatBreakdown[format].saves += saves
      formatBreakdown[format].posts += 1
    }

    // Sort top saved posts
    topSavedPosts.sort((a, b) => b.saves - a.saves)

    // Calculate format rates
    for (const format of Object.keys(formatBreakdown)) {
      const fb = formatBreakdown[format]
      fb.rate = fb.posts > 0 ? fb.saves / fb.posts : 0
    }

    return {
      totalSaves,
      saveRate: totalImpressions > 0 ? (totalSaves / totalImpressions) * 100 : 0,
      topSavedPosts: topSavedPosts.slice(0, 5),
      formatBreakdown,
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private extractMetricValue(insights: { data?: Array<{ name: string; values?: Array<{ value: number }> }> }, metricName: string): number {
    const metric = insights.data?.find(d => d.name === metricName)
    return metric?.values?.[0]?.value || 0
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService()
