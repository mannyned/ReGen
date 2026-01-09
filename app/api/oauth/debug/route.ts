import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/oauth/debug
 * Debug endpoint to check OAuth status and database connection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Get authenticated user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Check database connection
    let dbConnected = false
    let connectionCount = 0
    let connections: Array<{ platform: string; username: string | null; isActive: boolean }> = []
    let profileExists = false

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`
      dbConnected = true

      // Check if profile exists for the user
      if (user?.id) {
        const profile = await prisma.profile.findUnique({
          where: { id: user.id }
        })
        profileExists = !!profile
      }

      // Get connections for the user
      const targetUserId = userId || user?.id
      if (targetUserId) {
        // Check oAuthConnection table (new OAuth engine)
        const oauthConnections = await prisma.oAuthConnection.findMany({
          where: { profileId: targetUserId },
          select: {
            provider: true,
            providerAccountId: true,
            metadata: true,
            createdAt: true,
            expiresAt: true,
          }
        })
        connectionCount = oauthConnections.length
        connections = oauthConnections.map(c => {
          const metadata = c.metadata as any
          return {
            platform: c.provider,
            username: metadata?.username || metadata?.displayName || c.providerAccountId,
            isActive: !c.expiresAt || c.expiresAt > new Date(),
          }
        })

        // Also check legacy socialConnection table for comparison
        const legacyConnections = await prisma.socialConnection.findMany({
          where: { profileId: targetUserId },
          select: {
            platform: true,
            username: true,
            isActive: true,
          }
        }).catch(() => []) // Ignore if table doesn't exist
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
    }

    return NextResponse.json({
      success: true,
      debug: {
        // Auth info
        authUser: user ? {
          id: user.id,
          email: user.email,
          emailConfirmed: !!user.email_confirmed_at,
        } : null,
        authError: authError?.message || null,

        // Request info
        requestedUserId: userId,
        effectiveUserId: userId || user?.id || null,

        // Database info
        databaseConnected: dbConnected,
        profileExists,
        connectionCount,
        connections,

        // Environment check
        hasTokenEncryptionKey: !!process.env.TOKEN_ENCRYPTION_KEY,
        hasMetaClientId: !!process.env.META_CLIENT_ID,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
