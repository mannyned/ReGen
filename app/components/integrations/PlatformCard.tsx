'use client';

import { useState } from 'react';
import type { PlatformConfig, ConnectionStatus, UserTier } from '@/lib/types/integrations';
import type { SocialPlatform } from '@/lib/types/social';
import { TierBadge } from './TierBadge';
import { LockedFeatureCard } from './LockedFeatureCard';
import { PlatformLogo } from '@/app/components/ui/PlatformLogo';

interface PlatformCardProps {
  platform: PlatformConfig;
  status: ConnectionStatus;
  currentTier: UserTier;
  onConnect: () => void;
  onDisconnect: () => void;
  onUpgrade: () => void;
  isLoading?: boolean;
}

export function PlatformCard({
  platform,
  status,
  currentTier,
  onConnect,
  onDisconnect,
  onUpgrade,
  isLoading = false,
}: PlatformCardProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const tierOrder: UserTier[] = ['FREE', 'CREATOR', 'PRO'];
  const currentTierIndex = tierOrder.indexOf(currentTier);
  const requiredTierIndex = tierOrder.indexOf(platform.requiredTier);
  const isLocked = currentTierIndex < requiredTierIndex;

  if (platform.comingSoon) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 opacity-60">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            <PlatformLogo platform={platform.name as SocialPlatform} size="md" variant="color" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{platform.displayName}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{platform.description}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <LockedFeatureCard
        requiredTier={platform.requiredTier}
        currentTier={currentTier}
        title={platform.displayName}
        description={platform.description}
        platformName={platform.name as SocialPlatform}
        onUpgrade={onUpgrade}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shadow-lg">
          <PlatformLogo platform={platform.name as SocialPlatform} size="md" variant="color" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white">{platform.displayName}</h3>
            {platform.requiredTier !== 'FREE' && <TierBadge tier={platform.requiredTier} size="sm" />}
            {status.connected && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
                Connected
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{platform.description}</p>

          {status.connected && status.accountName && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              {status.avatarUrl && <img src={status.avatarUrl} alt="" className="w-6 h-6 rounded-full" />}
              <span className="text-gray-600 dark:text-gray-300">@{status.accountName}</span>
            </div>
          )}

          {status.connected && status.expiresAt && new Date(status.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              Access expires soon - reconnect to refresh
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {platform.features.slice(0, 3).map((feature) => (
              <span key={feature} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          {status.connected ? (
            <div className="relative">
              {showDisconnectConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onDisconnect();
                      setShowDisconnectConfirm(false);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Confirm
                  </button>
                  <button onClick={() => setShowDisconnectConfirm(false)} className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-600">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                    hover:text-red-600 dark:hover:text-red-400
                    border border-gray-200 dark:border-gray-700 rounded-xl
                    hover:border-red-200 dark:hover:border-red-800 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white
                bg-gradient-to-r from-violet-500 to-blue-500 rounded-xl
                hover:from-violet-600 hover:to-blue-600 transition-all
                shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlatformCard;
