import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/getUser'
import { linkedinPublisher } from '@/lib/services/publishing/LinkedInPublisher'

/**
 * GET /api/linkedin/organizations
 * Fetch LinkedIn organizations where the authenticated user is an administrator
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const organizations = await linkedinPublisher.getAdministeredOrganizations(userId)

    return NextResponse.json({
      success: true,
      organizations,
      count: organizations.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch LinkedIn organizations:', error)

    // Check if it's a token error
    if (error instanceof Error && error.message.includes('No valid access token')) {
      return NextResponse.json(
        {
          error: 'LinkedIn not connected',
          code: 'NOT_CONNECTED',
          message: 'Please connect your LinkedIn account first',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch organizations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
