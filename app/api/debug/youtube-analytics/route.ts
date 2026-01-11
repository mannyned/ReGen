import { NextRequest, NextResponse } from 'next/server'
import { tokenManager } from '@/lib/services/oauth/TokenManager'
import { createClient } from '@/lib/supabase/server'

// ============================================
// DEBUG: Test YouTube Analytics API directly
// ============================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = user.id

    // Get YouTube access token
    const accessToken = await tokenManager.getValidAccessToken(userId, 'youtube')

    if (!accessToken) {
      return NextResponse.json({
        error: 'No YouTube access token',
        suggestion: 'Please reconnect your YouTube account'
      }, { status: 400 })
    }

    // Test 1: Check if we can access basic channel info
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )
    const channelData = await channelResponse.json()

    // Test 2: Try YouTube Analytics API for geographic data
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views&dimensions=country&startDate=${startDate}&endDate=${endDate}&sort=-views&maxResults=20`

    const analyticsResponse = await fetch(analyticsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const analyticsData = await analyticsResponse.json()

    // Test 3: Try basic analytics (views over time) to see if Analytics API works at all
    const basicAnalyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views,estimatedMinutesWatched&startDate=${startDate}&endDate=${endDate}`

    const basicAnalyticsResponse = await fetch(basicAnalyticsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const basicAnalyticsData = await basicAnalyticsResponse.json()

    return NextResponse.json({
      userId,
      tokenLength: accessToken.length,
      channel: {
        status: channelResponse.status,
        data: channelData
      },
      geographicAnalytics: {
        status: analyticsResponse.status,
        url: analyticsUrl,
        data: analyticsData
      },
      basicAnalytics: {
        status: basicAnalyticsResponse.status,
        data: basicAnalyticsData
      }
    })

  } catch (error) {
    console.error('Debug YouTube Analytics error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
