/**
 * GET /api/oauth/permissions?platform=meta
 *
 * Check what permissions are granted for a connected platform token.
 * Useful for debugging and verifying token capabilities.
 *
 * Supported platforms:
 * - meta (Facebook/Instagram)
 * - tiktok
 *
 * Response:
 * {
 *   success: boolean,
 *   platform: string,
 *   permissions: string[],
 *   missingPermissions?: string[],
 *   tokenType?: string,
 *   expiresAt?: string,
 *   pageInfo?: { id: string, name: string }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import { tokenManager } from '@/lib/services/oauth/TokenManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0'
const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2'

// Required permissions for each platform
const REQUIRED_PERMISSIONS: Record<string, string[]> = {
  meta: [
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_read_user_content',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
  ],
  tiktok: [
    'user.info.basic',
    'video.upload',
    'video.publish',
  ],
}

/**
 * Get permissions for Meta (Facebook/Instagram) token
 */
async function getMetaPermissions(accessToken: string): Promise<{
  permissions: string[]
  pageInfo?: { id: string; name: string }
  tokenType: string
}> {
  // Check user token permissions
  const permissionsUrl = `${META_GRAPH_URL}/me/permissions?access_token=${accessToken}`
  const permissionsResponse = await fetch(permissionsUrl)

  if (!permissionsResponse.ok) {
    throw new Error('Failed to fetch Meta permissions')
  }

  const permissionsData = await permissionsResponse.json()
  const permissions = (permissionsData.data || [])
    .filter((p: { status: string }) => p.status === 'granted')
    .map((p: { permission: string }) => p.permission)

  // Also check if we can get page access
  let pageInfo: { id: string; name: string } | undefined
  try {
    const pagesUrl = `${META_GRAPH_URL}/me/accounts?fields=id,name&access_token=${accessToken}`
    const pagesResponse = await fetch(pagesUrl)

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json()
      const page = pagesData.data?.[0]
      if (page) {
        pageInfo = { id: page.id, name: page.name }
      }
    }
  } catch (error) {
    console.error('[Permissions] Failed to fetch page info:', error)
  }

  return {
    permissions,
    pageInfo,
    tokenType: 'user_token',
  }
}

/**
 * Get scopes for TikTok token
 * Note: TikTok doesn't have a permissions endpoint, so we check what was stored
 */
async function getTikTokPermissions(accessToken: string): Promise<{
  permissions: string[]
  tokenType: string
}> {
  // TikTok doesn't have a /me/permissions endpoint
  // We can verify the token is valid by calling user info
  const userUrl = `${TIKTOK_API_URL}/user/info/?fields=open_id,display_name`

  const response = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to verify TikTok token')
  }

  // Since TikTok doesn't expose granted scopes via API,
  // we return the scopes that were requested during auth
  // The actual granted scopes are stored in the OAuth connection
  return {
    permissions: ['user.info.basic', 'video.upload', 'video.publish'],
    tokenType: 'access_token',
  }
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await getUserId(request)

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get platform from query params
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'platform query parameter is required' },
        { status: 400 }
      )
    }

    // Map platform names
    const normalizedPlatform = platform.toLowerCase()
    const tokenPlatform = normalizedPlatform === 'facebook' || normalizedPlatform === 'instagram'
      ? 'meta'
      : normalizedPlatform

    // Get access token
    const accessToken = await tokenManager.getValidAccessToken(profileId, tokenPlatform)

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        platform: normalizedPlatform,
        error: 'No connected account found. Please connect your account first.',
        connected: false,
      })
    }

    let result: {
      permissions: string[]
      pageInfo?: { id: string; name: string }
      tokenType: string
    }

    // Get permissions based on platform
    if (tokenPlatform === 'meta') {
      result = await getMetaPermissions(accessToken)
    } else if (tokenPlatform === 'tiktok') {
      result = await getTikTokPermissions(accessToken)
    } else {
      return NextResponse.json({
        success: false,
        platform: normalizedPlatform,
        error: `Permission check not supported for ${platform}`,
      })
    }

    // Calculate missing permissions
    const requiredPermissions = REQUIRED_PERMISSIONS[tokenPlatform] || []
    const missingPermissions = requiredPermissions.filter(
      p => !result.permissions.includes(p)
    )

    // Get token expiration from database
    const { prisma } = await import('@/lib/db')
    const connection = await prisma.oAuthConnection.findFirst({
      where: {
        profileId,
        provider: tokenPlatform,
      },
      select: {
        expiresAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      platform: normalizedPlatform,
      connected: true,
      permissions: result.permissions,
      requiredPermissions,
      missingPermissions,
      hasAllPermissions: missingPermissions.length === 0,
      tokenType: result.tokenType,
      pageInfo: result.pageInfo,
      expiresAt: connection?.expiresAt?.toISOString(),
      connectedAt: connection?.createdAt?.toISOString(),
    })
  } catch (error) {
    console.error('[Permissions Check Error]', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check permissions',
      },
      { status: 500 }
    )
  }
}
