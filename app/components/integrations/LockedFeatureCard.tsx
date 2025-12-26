'use client';

import type { UserTier } from '@/lib/types/integrations';
import type { SocialPlatform } from '@/lib/types/social';
import { TierBadge } from './TierBadge';
import { PlatformLogo } from '@/app/components/ui/PlatformLogo';

interface LockedFeatureCardProps {
  requiredTier: UserTier;
  currentTier: UserTier;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  platformName?: SocialPlatform;
  onUpgrade?: () => void;
  className?: string;
}

const upgradeMessages: Record<string, { headline: string; subtext: string }> = {
  FREE_CREATOR: {
    headline: 'unlock more connections',
    subtext: 'Get access to YouTube, X, and up to 5 connected accounts',
  },
  FREE_PRO: {
    headline: 'go pro for teams',
    subtext: '3 seats, unlimited connections, LinkedIn & more',
  },
  CREATOR_PRO: {
    headline: 'unlock team mode',
    subtext: '3 seats + unlimited connections + all platforms',
  },
};

export function LockedFeatureCard({
  requiredTier,
  currentTier,
  title,
  description,
  icon,
  platformName,
  onUpgrade,
  className = '',
}: LockedFeatureCardProps) {
  const upgradeKey = `${currentTier}_${requiredTier}`;
  const message = upgradeMessages[upgradeKey] || upgradeMessages['FREE_PRO'];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border-2 border-dashed
        border-gray-200 dark:border-gray-700
        bg-gray-50/50 dark:bg-gray-900/50
        p-6 text-center
        ${className}
      `}
    >
      {/* Watermark icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl opacity-50 overflow-hidden">
          {platformName ? (
            <PlatformLogo platform={platformName} size="md" variant="monochrome" />
          ) : (
            icon || '🔒'
          )}
        </div>

        {/* Title with badge */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 className="font-semibold text-gray-500 dark:text-gray-400">{title}</h3>
          <TierBadge tier={requiredTier} size="sm" />
        </div>

        {description && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{description}</p>
        )}

        {/* Upgrade CTA */}
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {message.headline}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{message.subtext}</p>

          <button
            onClick={onUpgrade}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium
              hover:from-violet-600 hover:to-blue-600 transition-all
              shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
            </svg>
            Upgrade to {requiredTier === 'CREATOR' ? 'Creator' : 'Pro'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LockedFeatureCard;
