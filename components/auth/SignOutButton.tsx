'use client';

/**
 * SignOutButton Component
 *
 * A styled sign out button that can be used anywhere in the app.
 * Supports different variants and sizes for flexible placement.
 *
 * @example
 * ```tsx
 * // Primary button style
 * <SignOutButton />
 *
 * // Ghost style for navigation
 * <SignOutButton variant="ghost" />
 *
 * // Small size for compact layouts
 * <SignOutButton size="sm" />
 *
 * // With custom redirect
 * <SignOutButton redirectTo="/" />
 * ```
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface SignOutButtonProps {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom redirect URL after sign out */
  redirectTo?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Custom button text */
  children?: React.ReactNode;
}

export function SignOutButton({
  variant = 'ghost',
  size = 'md',
  redirectTo = '/',
  className = '',
  showIcon = true,
  children,
}: SignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      // Sign out via Supabase client
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        // Still redirect even if there's an error (session might be invalid anyway)
      }

      // Navigate to redirect URL
      router.push(redirectTo);
      router.refresh(); // Refresh to update server components
    } catch (err) {
      console.error('Sign out failed:', err);
      // Force redirect anyway
      window.location.href = redirectTo;
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-sm',
    lg: 'py-3 px-6 text-base',
  };

  // Variant classes
  const variantClasses = {
    primary:
      'bg-primary text-white font-semibold rounded-xl shadow-lg hover:bg-primary-hover hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0',
    secondary:
      'bg-white text-primary border-2 border-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-all duration-300',
    ghost:
      'bg-transparent text-text-secondary font-medium rounded-lg hover:bg-gray-100 hover:text-text-primary transition-all duration-200',
    danger:
      'bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0',
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Signing out...</span>
        </>
      ) : (
        <>
          {showIcon && (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          )}
          <span>{children || 'Sign out'}</span>
        </>
      )}
    </button>
  );
}

export default SignOutButton;
