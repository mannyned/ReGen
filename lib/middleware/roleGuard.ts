import { NextRequest, NextResponse } from 'next/server'
import type { PlanTier } from '../types/social'

// ============================================
// ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================

/**
 * Role hierarchy: PRO > CREATOR > FREE
 * Higher roles have access to all features of lower roles
 */
const ROLE_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  creator: 1,
  pro: 2,
}

// ============================================
// FEATURE ACCESS CONFIGURATION
// ============================================

export type FeatureKey =
  | 'analytics_export_csv'
  | 'analytics_export_pdf'
  | 'analytics_location'
  | 'analytics_retention'
  | 'analytics_save_rate'
  | 'ai_recommendations'
  | 'advanced_metrics'
  | 'scheduled_reports'
  | 'white_label_exports'

/**
 * Minimum role required for each feature
 */
export const FEATURE_REQUIREMENTS: Record<FeatureKey, PlanTier> = {
  // PRO-only features
  analytics_export_csv: 'pro',
  analytics_export_pdf: 'pro',
  analytics_location: 'pro',
  analytics_retention: 'pro',
  ai_recommendations: 'pro',
  advanced_metrics: 'pro',
  scheduled_reports: 'pro',
  white_label_exports: 'pro',

  // Creator+ features
  analytics_save_rate: 'creator',
}

// ============================================
// USER CONTEXT INTERFACE
// ============================================

export interface UserContext {
  userId: string
  email?: string
  name?: string
  plan: PlanTier
  planExpiresAt?: Date
}

// ============================================
// ROLE GUARD FUNCTIONS
// ============================================

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(userPlan: PlanTier, feature: FeatureKey): boolean {
  const requiredPlan = FEATURE_REQUIREMENTS[feature]
  return ROLE_HIERARCHY[userPlan] >= ROLE_HIERARCHY[requiredPlan]
}

/**
 * Check if a user has a minimum plan tier
 */
export function hasMinimumPlan(userPlan: PlanTier, minimumPlan: PlanTier): boolean {
  return ROLE_HIERARCHY[userPlan] >= ROLE_HIERARCHY[minimumPlan]
}

/**
 * Check if user is PRO
 * Handles both uppercase (Prisma) and lowercase plan tiers
 */
export function isProUser(userPlan: PlanTier | string): boolean {
  return userPlan.toLowerCase() === 'pro'
}

/**
 * Check if user is Creator or higher
 * Handles both uppercase (Prisma) and lowercase plan tiers
 */
export function isCreatorOrHigher(userPlan: PlanTier | string): boolean {
  const normalizedPlan = userPlan.toLowerCase() as PlanTier
  return ROLE_HIERARCHY[normalizedPlan] >= ROLE_HIERARCHY.creator
}

// ============================================
// ERROR RESPONSES
// ============================================

export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  )
}

export function forbiddenResponse(
  feature: FeatureKey,
  requiredPlan: PlanTier = 'pro'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `This feature requires a ${requiredPlan.toUpperCase()} plan`,
      code: 'FORBIDDEN',
      feature,
      requiredPlan,
      upgradeUrl: '/settings',
    },
    { status: 403 }
  )
}

// ============================================
// MIDDLEWARE FACTORY
// ============================================

/**
 * Create a role guard middleware for API routes
 * @param requiredFeature - The feature key that requires authorization
 * @returns Middleware function
 */
export function createRoleGuardMiddleware(requiredFeature: FeatureKey) {
  return async function roleGuardMiddleware(
    request: NextRequest,
    handler: (request: NextRequest, user: UserContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Get user context from request
      const user = await getUserFromRequest(request)

      if (!user) {
        return unauthorizedResponse()
      }

      // Check plan expiration
      if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
        // Plan expired, treat as FREE user
        user.plan = 'free'
      }

      // Check feature access
      if (!hasFeatureAccess(user.plan, requiredFeature)) {
        const requiredPlan = FEATURE_REQUIREMENTS[requiredFeature]
        return forbiddenResponse(requiredFeature, requiredPlan)
      }

      // User has access, proceed with handler
      return handler(request, user)
    } catch (error) {
      console.error('Role guard error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication error',
          code: 'AUTH_ERROR',
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Create a PRO-only middleware (convenience function)
 */
export function createProOnlyMiddleware() {
  return async function proOnlyMiddleware(
    request: NextRequest,
    handler: (request: NextRequest, user: UserContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      const user = await getUserFromRequest(request)

      if (!user) {
        return unauthorizedResponse()
      }

      // Check plan expiration
      if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
        user.plan = 'free'
      }

      if (!isProUser(user.plan)) {
        return NextResponse.json(
          {
            success: false,
            error: 'This feature is only available for PRO users',
            code: 'PRO_REQUIRED',
            upgradeUrl: '/settings',
          },
          { status: 403 }
        )
      }

      return handler(request, user)
    } catch (error) {
      console.error('PRO middleware error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication error',
          code: 'AUTH_ERROR',
        },
        { status: 500 }
      )
    }
  }
}

// ============================================
// USER EXTRACTION
// ============================================

/**
 * Extract user context from request
 * In a real implementation, this would:
 * 1. Validate JWT/session token
 * 2. Fetch user from database
 * 3. Return user context
 */
async function getUserFromRequest(request: NextRequest): Promise<UserContext | null> {
  try {
    // Get userId from query params or headers
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || request.headers.get('x-user-id')

    if (!userId) {
      return null
    }

    // Get user plan from header or query (for development/testing)
    // In production, this should fetch from database
    const planHeader = request.headers.get('x-user-plan')
    const planParam = searchParams.get('userPlan')
    const plan = (planHeader || planParam || 'free') as PlanTier

    // Validate plan value
    const validPlans: PlanTier[] = ['free', 'creator', 'pro']
    const validatedPlan = validPlans.includes(plan) ? plan : 'free'

    // In production, fetch full user data from database:
    // const user = await prisma.user.findUnique({ where: { id: userId } })
    // if (!user) return null
    // return {
    //   userId: user.id,
    //   email: user.email,
    //   name: user.name,
    //   plan: user.plan.toLowerCase() as PlanTier,
    //   planExpiresAt: user.planExpiresAt,
    // }

    return {
      userId,
      plan: validatedPlan,
    }
  } catch (error) {
    console.error('Error extracting user from request:', error)
    return null
  }
}

// ============================================
// HELPER FUNCTIONS FOR SERVICE LAYER
// ============================================

/**
 * Assert that user has PRO access (for use in services)
 * Throws an error if user is not PRO
 */
export function assertProAccess(userPlan: PlanTier): void {
  if (!isProUser(userPlan)) {
    const error = new Error('PRO plan required for this operation')
    ;(error as Error & { code: string }).code = 'PRO_REQUIRED'
    throw error
  }
}

/**
 * Assert that user has feature access (for use in services)
 * Throws an error if user doesn't have access
 */
export function assertFeatureAccess(userPlan: PlanTier, feature: FeatureKey): void {
  if (!hasFeatureAccess(userPlan, feature)) {
    const requiredPlan = FEATURE_REQUIREMENTS[feature]
    const error = new Error(`${requiredPlan.toUpperCase()} plan required for ${feature}`)
    ;(error as Error & { code: string; requiredPlan: string }).code = 'PLAN_REQUIRED'
    ;(error as Error & { code: string; requiredPlan: string }).requiredPlan = requiredPlan
    throw error
  }
}

// ============================================
// RATE LIMITING BY PLAN
// ============================================

export const EXPORT_RATE_LIMITS: Record<PlanTier, { maxPerDay: number; maxPerHour: number }> = {
  free: { maxPerDay: 0, maxPerHour: 0 }, // No exports for free users
  creator: { maxPerDay: 5, maxPerHour: 2 }, // Limited for creator (if we ever enable)
  pro: { maxPerDay: 50, maxPerHour: 10 }, // Generous limits for PRO
}

export function getExportRateLimit(plan: PlanTier) {
  return EXPORT_RATE_LIMITS[plan]
}
