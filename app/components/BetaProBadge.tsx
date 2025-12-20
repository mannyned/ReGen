'use client';

import { useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface BetaProBadgeProps {
  /** Whether user is on beta pro */
  isBetaPro: boolean;
  /** Days remaining in beta (null if not beta) */
  daysRemaining?: number | null;
  /** Whether to show days remaining */
  showDaysRemaining?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// BADGE COMPONENT
// ============================================

/**
 * Beta Pro Badge
 *
 * Shows a badge indicating the user is on Beta Pro access.
 * Optionally shows days remaining.
 */
export function BetaProBadge({
  isBetaPro,
  daysRemaining,
  showDaysRemaining = false,
  size = 'md',
  className = '',
}: BetaProBadgeProps) {
  if (!isBetaPro) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const isExpiringSoon = daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${isExpiringSoon
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          : 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800'
        }
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className="relative flex h-2 w-2">
        <span className={`
          animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
          ${isExpiringSoon ? 'bg-orange-400' : 'bg-violet-400'}
        `} />
        <span className={`
          relative inline-flex rounded-full h-2 w-2
          ${isExpiringSoon ? 'bg-orange-500' : 'bg-violet-500'}
        `} />
      </span>
      <span>Beta Pro</span>
      {showDaysRemaining && daysRemaining !== null && daysRemaining !== undefined && (
        <span className="opacity-75">
          ({daysRemaining}d left)
        </span>
      )}
    </span>
  );
}

// ============================================
// BETA STATUS BANNER
// ============================================

interface BetaStatusBannerProps {
  /** Whether user is on beta pro */
  isBetaPro: boolean;
  /** Days remaining in beta */
  daysRemaining?: number | null;
  /** Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

/**
 * Beta Status Banner
 *
 * Shows a prominent banner for beta users, especially when expiring soon.
 */
export function BetaStatusBanner({
  isBetaPro,
  daysRemaining,
  onUpgrade,
}: BetaStatusBannerProps) {
  if (!isBetaPro) {
    return null;
  }

  const isExpiringSoon = daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7;

  if (!isExpiringSoon) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-semibold">
              Your Beta Pro access ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </p>
            <p className="text-sm opacity-90">
              Upgrade to keep Pro features and your connected platforms
            </p>
          </div>
        </div>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors whitespace-nowrap"
          >
            View Plans
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// SUBSCRIPTION STATUS CARD (FOR SETTINGS)
// ============================================

interface BetaSubscriptionCardProps {
  /** Whether user is on beta pro */
  isBetaPro: boolean;
  /** Days remaining in beta */
  daysRemaining?: number | null;
  /** Beta expiration date */
  expiresAt?: string | null;
  /** Actual tier (not beta) */
  actualTier: string;
  /** Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

/**
 * Beta Subscription Card
 *
 * Shows beta subscription status in settings page.
 */
export function BetaSubscriptionCard({
  isBetaPro,
  daysRemaining,
  expiresAt,
  actualTier,
  onUpgrade,
}: BetaSubscriptionCardProps) {
  if (!isBetaPro) {
    return null;
  }

  const isExpiringSoon = daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={`
      p-6 rounded-2xl border-2
      ${isExpiringSoon
        ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 dark:from-orange-900/20 dark:to-amber-900/20 dark:border-orange-800'
        : 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 dark:from-violet-900/20 dark:to-purple-900/20 dark:border-violet-800'
      }
    `}>
      <div className="flex items-start gap-4">
        <div className={`
          w-14 h-14 rounded-xl flex items-center justify-center
          ${isExpiringSoon ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-violet-100 dark:bg-violet-900/30'}
        `}>
          <span className="text-3xl">{isExpiringSoon ? '⏰' : '🧪'}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Beta Pro</h3>
            <BetaProBadge isBetaPro={true} daysRemaining={daysRemaining} size="sm" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            You have full Pro access during the beta period.
            {expiresAt && ` Ends ${formatDate(expiresAt)}.`}
          </p>

          {isExpiringSoon ? (
            <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3 mb-4">
              <p className="text-orange-800 dark:text-orange-300 font-medium">
                ⚠️ Beta ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
              </p>
              <p className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                After beta ends, you'll return to the {actualTier} tier.
                Your data and connections will be preserved.
              </p>
            </div>
          ) : (
            <p className="text-violet-700 dark:text-violet-400 text-sm">
              ✨ Pricing coming soon. Enjoy full Pro features during beta!
            </p>
          )}

          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className={`
                mt-4 px-4 py-2 rounded-lg font-medium transition-colors
                ${isExpiringSoon
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
                }
              `}
            >
              View Plans
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// OVER-LIMIT WARNING
// ============================================

interface OverLimitWarningProps {
  /** Number of connections over limit */
  excessCount: number;
  /** Current allowed limit */
  allowedLimit: number;
  /** Current tier name */
  tierName: string;
  /** Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

/**
 * Over Limit Warning
 *
 * Shows when user has more connections than their tier allows
 * (e.g., after beta expiry).
 */
export function OverLimitWarning({
  excessCount,
  allowedLimit,
  tierName,
  onUpgrade,
}: OverLimitWarningProps) {
  if (excessCount <= 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            You're over your plan limit
          </p>
          <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
            Your {tierName} plan allows {allowedLimit} platform{allowedLimit !== 1 ? 's' : ''}.
            You have {excessCount} extra connection{excessCount !== 1 ? 's' : ''}.
            Disconnect accounts or upgrade to add new connections.
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="mt-3 text-amber-800 dark:text-amber-300 font-medium underline hover:no-underline"
            >
              Upgrade to Pro →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch beta status from API
 */
export function useBetaStatus() {
  const [status, setStatus] = useState<{
    isBetaPro: boolean;
    daysRemaining: number | null;
    actualTier: string;
    effectiveTier: string;
    betaExpiresAt: string | null;
    isLoading: boolean;
    error: string | null;
  }>({
    isBetaPro: false,
    daysRemaining: null,
    actualTier: 'FREE',
    effectiveTier: 'FREE',
    betaExpiresAt: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          throw new Error('Failed to fetch user status');
        }

        const data = await response.json();

        setStatus({
          isBetaPro: data.tierInfo?.isBetaPro || false,
          daysRemaining: data.tierInfo?.betaDaysRemaining || null,
          actualTier: data.tierInfo?.actualTier || data.tier || 'FREE',
          effectiveTier: data.tierInfo?.effectiveTier || data.tier || 'FREE',
          betaExpiresAt: data.betaExpiresAt || null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }

    fetchStatus();
  }, []);

  return status;
}
