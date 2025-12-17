'use client';

/**
 * ProtectedContent Component
 *
 * Wrapper that only renders children for authenticated users.
 * Shows loading state or fallback for unauthenticated users.
 *
 * @example
 * ```tsx
 * <ProtectedContent fallback={<LoginForm />}>
 *   <Dashboard />
 * </ProtectedContent>
 * ```
 */

import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedContentProps {
  children: React.ReactNode;
  /** Content to show when not authenticated */
  fallback?: React.ReactNode;
  /** Redirect to this path if not authenticated */
  redirectTo?: string;
  /** Required tier for access */
  requiredTier?: 'FREE' | 'CREATOR' | 'PRO';
  /** Loading component */
  loadingComponent?: React.ReactNode;
}

const TIER_LEVELS = { FREE: 0, CREATOR: 1, PRO: 2 };

export function ProtectedContent({
  children,
  fallback,
  redirectTo,
  requiredTier,
  loadingComponent,
}: ProtectedContentProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && redirectTo) {
      router.push(redirectTo);
    }
  }, [loading, user, redirectTo, router]);

  // Loading state
  if (loading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )
    );
  }

  // Not authenticated
  if (!user) {
    if (redirectTo) {
      // Will redirect via useEffect
      return loadingComponent || null;
    }
    return fallback || null;
  }

  // TODO: Check tier when profile data is available in useAuth
  // For now, allow all authenticated users

  return <>{children}</>;
}

export default ProtectedContent;
