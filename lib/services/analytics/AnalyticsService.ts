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
      'linkedin-org': () => this.getLinkedInAccountAnalytics(accessToken, dateRange), // Uses same analytics as LinkedIn
      facebook: () => this.getFacebookAccountAnalytics(accessToken, dateRange),
      meta: () => this.getInstagramAccountAnalytics(accessToken, dateRange), // Meta uses Instagram analytics
      snapchat: () => this.getSnapchatAccountAnalytics(accessToken, dateRange),
      pinterest: () => this.getPinterestAccountAnalytics(accessToken, dateRange),
      discord: () => this.getDiscordAccountAnalytics(accessToken, dateRange),
      reddit: () => this.getRedditAccountAnalytics(accessToken, dateRange),
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
      'linkedin-org': null,
      facebook: null,
      meta: null,
      snapchat: null,
      pinterest: null,
      discord: null,
      reddit: null,
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
    console.log(`[AnalyticsService] Getting location analytics for ${platform}, userId: ${userId}`)

    const accessToken = await tokenManager.getValidAccessToken(userId, platform)

    if (!accessToken) {
      console.error(`[AnalyticsService] No valid access token for ${platform}`)
      throw new Error(`No valid access token for ${platform}. You may need to reconnect your account.`)
    }

    console.log(`[AnalyticsService] Got access token for ${platform}, length: ${accessToken.length}`)

    // Platform-specific location analytics
    try {
      switch (platform) {
        case 'instagram':
          return await this.getInstagramLocationData(accessToken)
        case 'youtube':
          return await this.getYouTubeLocationData(accessToken)
        case 'facebook':
          return await this.getFacebookLocationData(accessToken)
        default:
          // Other platforms may not provide detailed location data
          console.log(`[AnalyticsService] Platform ${platform} doesn't support location analytics`)
          return []
      }
    } catch (error) {
      console.error(`[AnalyticsService] Error fetching location data for ${platform}:`, error)
      throw error
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
    // Full analytics require organization/company page with rw_organization_admin scope

    let followers = 0
    let totalPosts = 0
    let totalEngagement = 0
    let totalImpressions = 0
    const topPosts: PostAnalytics[] = []

    try {
      // Try to get organization statistics if user has admin access to an organization
      const orgFollowers = await this.getLinkedInOrganizationFollowers(accessToken)
      if (orgFollowers) {
        followers = orgFollowers.followerCount
      }

      // Try to get share statistics for recent posts
      const shareStats = await this.getLinkedInShareStatistics(accessToken, dateRange)
      if (shareStats) {
        totalImpressions = shareStats.totalImpressions
        totalEngagement = shareStats.totalEngagement
        totalPosts = shareStats.postCount
        topPosts.push(...shareStats.topPosts)
      }
    } catch (error) {
      // LinkedIn analytics may not be available for personal profiles
      console.log('[LinkedIn Analytics] Limited analytics available:', error instanceof Error ? error.message : 'Unknown error')
    }

    const avgEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0

    return {
      followers,
      following: 0, // LinkedIn doesn't expose this
      totalPosts,
      avgEngagementRate,
      avgReach: totalImpressions,
      avgImpressions: totalImpressions,
      followerGrowth: 0, // Would need historical data
      topPosts: topPosts.slice(0, 5),
    }
  }

  /**
   * Get LinkedIn organization follower count
   * Requires rw_organization_admin scope
   */
  private async getLinkedInOrganizationFollowers(
    accessToken: string
  ): Promise<{ followerCount: number; organizationUrn: string } | null> {
    try {
      // First, get the user's administered organizations
      const orgsResponse = await fetch(
        `${API_BASE_URLS.linkedin}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~))`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (!orgsResponse.ok) {
        return null
      }

      const orgsData = await orgsResponse.json()
      const org = orgsData.elements?.[0]?.['organization~']

      if (!org) {
        return null
      }

      // Get follower statistics for the organization
      const statsResponse = await fetch(
        `${API_BASE_URLS.linkedin}/networkSizes/${encodeURIComponent(org.id)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (!statsResponse.ok) {
        return null
      }

      const statsData = await statsResponse.json()

      return {
        followerCount: statsData.firstDegreeSize || 0,
        organizationUrn: org.id,
      }
    } catch (error) {
      console.error('[LinkedIn Analytics] Failed to get organization followers:', error)
      return null
    }
  }

  /**
   * Get LinkedIn share statistics for organization posts
   * Requires rw_organization_admin scope
   */
  private async getLinkedInShareStatistics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    totalImpressions: number
    totalEngagement: number
    postCount: number
    topPosts: PostAnalytics[]
  } | null> {
    try {
      // This endpoint requires organization context
      // For personal profiles, this will return limited or no data
      const response = await fetch(
        `${API_BASE_URLS.linkedin}/organizationalEntityShareStatistics?q=organizationalEntity&count=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      let totalImpressions = 0
      let totalEngagement = 0
      const topPosts: PostAnalytics[] = []

      for (const element of data.elements || []) {
        const stats = element.totalShareStatistics
        if (stats) {
          const likes = stats.likeCount || 0
          const comments = stats.commentCount || 0
          const shares = stats.shareCount || 0
          const impressions = stats.impressionCount || 0
          const engagement = likes + comments + shares

          totalImpressions += impressions
          totalEngagement += engagement

          if (element.share) {
            topPosts.push({
              views: impressions,
              likes,
              comments,
              shares,
              saves: 0, // LinkedIn doesn't expose saves
              reach: stats.uniqueImpressionsCount || impressions,
              impressions,
            })
          }
        }
      }

      // Sort by total engagement (likes + comments + shares) descending
      topPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))

      return {
        totalImpressions,
        totalEngagement,
        postCount: data.elements?.length || 0,
        topPosts,
      }
    } catch (error) {
      console.error('[LinkedIn Analytics] Failed to get share statistics:', error)
      return null
    }
  }

  private async getFacebookAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    // Step 1: Get page info with access token
    const pagesResponse = await fetch(
      `${API_BASE_URLS.facebook}/me/accounts?fields=id,name,fan_count,access_token&access_token=${accessToken}`
    )

    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch Facebook pages')
    }

    const pagesData = await pagesResponse.json()
    const page = pagesData.data?.[0]

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

    const pageAccessToken = page.access_token
    const pageId = page.id

    // Step 2: Get page insights using pages_read_engagement
    // Metrics: page_impressions, page_engaged_users, page_post_engagements, page_fans
    const since = Math.floor(dateRange.start.getTime() / 1000)
    const until = Math.floor(dateRange.end.getTime() / 1000)

    let pageInsights = {
      impressions: 0,
      reach: 0,
      engagedUsers: 0,
      postEngagements: 0,
    }

    try {
      const insightsResponse = await fetch(
        `${API_BASE_URLS.facebook}/${pageId}/insights?metric=page_impressions,page_impressions_unique,page_engaged_users,page_post_engagements&period=day&since=${since}&until=${until}&access_token=${pageAccessToken}`
      )

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json()

        for (const metric of insightsData.data || []) {
          const totalValue = metric.values?.reduce((sum: number, v: { value: number }) => sum + (v.value || 0), 0) || 0
          switch (metric.name) {
            case 'page_impressions':
              pageInsights.impressions = totalValue
              break
            case 'page_impressions_unique':
              pageInsights.reach = totalValue
              break
            case 'page_engaged_users':
              pageInsights.engagedUsers = totalValue
              break
            case 'page_post_engagements':
              pageInsights.postEngagements = totalValue
              break
          }
        }
      }
    } catch (error) {
      console.error('[Facebook Analytics] Failed to fetch page insights:', error)
    }

    // Step 3: Get recent posts for engagement calculation
    let totalPosts = 0
    let totalEngagement = 0
    const topPosts: PostAnalytics[] = []

    try {
      const postsResponse = await fetch(
        `${API_BASE_URLS.facebook}/${pageId}/posts?fields=id,message,created_time,shares,reactions.summary(true),comments.summary(true)&limit=25&access_token=${pageAccessToken}`
      )

      if (postsResponse.ok) {
        const postsData = await postsResponse.json()

        for (const post of postsData.data || []) {
          const reactions = post.reactions?.summary?.total_count || 0
          const comments = post.comments?.summary?.total_count || 0
          const shares = post.shares?.count || 0
          const engagement = reactions + comments + shares

          totalPosts++
          totalEngagement += engagement

          topPosts.push({
            views: 0,
            likes: reactions,
            comments,
            shares,
            saves: 0,
            reach: 0,
            impressions: 0,
          })
        }

        // Sort by engagement (likes + comments + shares) descending
        topPosts.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
      }
    } catch (error) {
      console.error('[Facebook Analytics] Failed to fetch posts:', error)
    }

    // Calculate average engagement rate
    const avgEngagementRate = page.fan_count > 0 && totalPosts > 0
      ? ((totalEngagement / totalPosts) / page.fan_count) * 100
      : 0

    return {
      followers: page.fan_count || 0,
      following: 0, // Facebook pages don't have following
      totalPosts,
      avgEngagementRate,
      avgReach: pageInsights.reach,
      avgImpressions: pageInsights.impressions,
      followerGrowth: 0, // Would need historical data
      topPosts: topPosts.slice(0, 5),
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

  private async getRedditAccountAnalytics(
    accessToken: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AccountAnalytics> {
    // Reddit analytics - fetch user karma and post stats
    try {
      const response = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'ReGen/1.0',
        },
      })

      if (!response.ok) {
        return this.getEmptyAnalytics()
      }

      const data = await response.json()

      return {
        followers: 0, // Reddit doesn't expose follower count via API
        following: 0,
        totalPosts: 0,
        avgEngagementRate: 0,
        avgReach: 0,
        avgImpressions: 0,
        followerGrowth: 0,
        topPosts: [],
      }
    } catch (error) {
      console.error('[AnalyticsService] Reddit analytics error:', error)
      return this.getEmptyAnalytics()
    }
  }

  private getEmptyAnalytics(): AccountAnalytics {
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
    // YouTube Analytics API requires startDate and endDate
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views&dimensions=country&startDate=${startDate}&endDate=${endDate}&sort=-views&maxResults=20`

    console.log('[YouTube Analytics] Fetching location data:', url.replace(/Bearer.*/, 'Bearer ***'))

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[YouTube Analytics] Location data error:', response.status, errorText)
      return []
    }

    const data = await response.json()
    console.log('[YouTube Analytics] Location data response:', JSON.stringify(data).slice(0, 500))

    if (!data.rows || data.rows.length === 0) {
      console.log('[YouTube Analytics] No location rows returned')
      return []
    }

    const totalViews = data.rows.reduce((sum: number, row: [string, number]) => sum + row[1], 0) || 1

    return data.rows.map((row: [string, number]) => ({
      country: row[0],
      percentage: (row[1] / totalViews) * 100,
      engagement: row[1],
    }))
  }

  private async getFacebookLocationData(accessToken: string): Promise<LocationData[]> {
    // Step 1: Get page access token
    const pagesResponse = await fetch(
      `${API_BASE_URLS.facebook}/me/accounts?fields=id,access_token&access_token=${accessToken}`
    )

    if (!pagesResponse.ok) {
      console.error('[Facebook Analytics] Failed to fetch pages for location data')
      return []
    }

    const pagesData = await pagesResponse.json()
    const page = pagesData.data?.[0]

    if (!page) {
      console.log('[Facebook Analytics] No page found for location data')
      return []
    }

    // Step 2: Fetch location insights using page access token (pages_read_engagement)
    const response = await fetch(
      `${API_BASE_URLS.facebook}/${page.id}/insights?metric=page_fans_country&period=lifetime&access_token=${page.access_token}`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Facebook Analytics] Location insights error:', errorText)
      return []
    }

    const data = await response.json()
    const countryData = data.data?.[0]?.values?.[0]?.value || {}

    if (Object.keys(countryData).length === 0) {
      console.log('[Facebook Analytics] No country data available')
      return []
    }

    const total = Object.values(countryData).reduce((sum: number, val) => sum + (val as number), 0)

    const locationData = Object.entries(countryData)
      .map(([country, count]) => ({
        country,
        percentage: total > 0 ? ((count as number) / total) * 100 : 0,
        engagement: count as number,
      }))
      .sort((a, b) => b.engagement - a.engagement) // Sort by engagement descending

    console.log(`[Facebook Analytics] Found location data for ${locationData.length} countries`)
    return locationData
  }

  // ============================================
  // RETENTION DATA FETCHERS
  // ============================================

  private async getYouTubeRetention(
    accessToken: string,
    videoId: string
  ): Promise<RetentionPoint[]> {
    // YouTube Analytics API requires startDate and endDate
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=audienceWatchRatio&dimensions=elapsedVideoTimeRatio&filters=video==${videoId}&startDate=${startDate}&endDate=${endDate}`

    console.log('[YouTube Analytics] Fetching retention for video:', videoId)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[YouTube Analytics] Retention error:', response.status, errorText)
      return []
    }

    const data = await response.json()
    console.log('[YouTube Analytics] Retention response rows:', data.rows?.length || 0)

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
