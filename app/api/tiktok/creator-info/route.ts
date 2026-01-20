/**
 * GET /api/tiktok/creator-info
 *
 * Fetches TikTok creator information including:
 * - Display name (nickname)
 * - Avatar URL
 * - Privacy level options available to the creator
 * - Posting limitations (comment, duet, stitch disabled options)
 * - Max video post per day
 *
 * Required for TikTok Content Sharing Guidelines compliance.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get TikTok access token
    const accessToken = await tokenManager.getValidAccessToken(user.id, 'tiktok')
    if (!accessToken) {
      return NextResponse.json(
        { error: 'TikTok not connected', connected: false },
        { status: 400 }
      )
    }

    // Fetch creator info from TikTok API
    // This endpoint returns privacy options and posting capabilities
    const response = await fetch(
      `${TIKTOK_API_BASE}/post/publish/creator_info/query/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[TikTok Creator Info] API error:', response.status, errorData)
      return NextResponse.json(
        {
          error: errorData.error?.message || 'Failed to fetch creator info',
          code: errorData.error?.code,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const creatorInfo = data.data

    // Also fetch user info for display name
    const userInfoResponse = await fetch(
      `${TIKTOK_API_BASE}/user/info/?fields=display_name,avatar_url,follower_count`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    let userInfo = null
    if (userInfoResponse.ok) {
      const userInfoData = await userInfoResponse.json()
      userInfo = userInfoData.data?.user
    }

    return NextResponse.json({
      success: true,
      connected: true,
      creatorInfo: {
        // User display info
        displayName: userInfo?.display_name || creatorInfo?.creator_nickname || 'TikTok User',
        avatarUrl: userInfo?.avatar_url || creatorInfo?.creator_avatar_url,
        followerCount: userInfo?.follower_count,

        // Privacy options available to this creator
        privacyLevelOptions: creatorInfo?.privacy_level_options || [
          'PUBLIC_TO_EVERYONE',
          'MUTUAL_FOLLOW_FRIENDS',
          'FOLLOWER_OF_CREATOR',
          'SELF_ONLY',
        ],

        // Interaction settings
        commentDisabled: creatorInfo?.comment_disabled ?? false,
        duetDisabled: creatorInfo?.duet_disabled ?? false,
        stitchDisabled: creatorInfo?.stitch_disabled ?? false,

        // Posting limits
        maxVideoPostPerDay: creatorInfo?.max_video_post_per_day ?? 10,
      },
    })
  } catch (error) {
    console.error('[TikTok Creator Info] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
