'use client';

import { useState } from 'react';
import type { PlatformConfig, ConnectionStatus, UserTier } from '@/lib/types/integrations';
import type { SocialPlatform } from '@/lib/types/social';
import { TierBadge } from './TierBadge';
import { LockedFeatureCard } from './LockedFeatureCard';
import { PlatformLogo } from '@/app/components/ui/PlatformLogo';

interface PermissionsData {
  permissions: string[];
  requiredPermissions: string[];
  missingPermissions: string[];
  hasAllPermissions: boolean;
  pageInfo?: { id: string; name: string };
  expiresAt?: string;
}

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
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsData, setPermissionsData] = useState<PermissionsData | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const tierOrder: UserTier[] = ['FREE', 'CREATOR', 'PRO'];
  const currentTierIndex = tierOrder.indexOf(currentTier);
  const requiredTierIndex = tierOrder.indexOf(platform.requiredTier);
  const isLocked = currentTierIndex < requiredTierIndex;

  // Check permissions for connected platforms
  const checkPermissions = async () => {
    setPermissionsLoading(true);
    setPermissionsError(null);
    try {
      const response = await fetch(`/api/oauth/permissions?platform=${platform.name}`);
      const data = await response.json();

      if (data.success) {
        setPermissionsData(data);
        setShowPermissions(true);
      } else {
        setPermissionsError(data.error || 'Failed to check permissions');
      }
    } catch (error) {
      setPermissionsError('Failed to check permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

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

          {/* Check Permissions Button - Only for Meta/TikTok */}
          {status.connected && (platform.name === 'meta' || platform.name === 'tiktok' || platform.name === 'facebook' || platform.name === 'instagram') && (
            <div className="mt-3">
              <button
                onClick={checkPermissions}
                disabled={permissionsLoading}
                className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1"
              >
                {permissionsLoading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Check Permissions
                  </>
                )}
              </button>

              {permissionsError && (
                <p className="mt-1 text-xs text-red-500">{permissionsError}</p>
              )}
            </div>
          )}

          {/* Permissions Display Panel */}
          {showPermissions && permissionsData && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Active Permissions</h4>
                <button
                  onClick={() => setShowPermissions(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className="mb-3">
                {permissionsData.hasAllPermissions ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    All permissions granted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                    Missing {permissionsData.missingPermissions.length} permission(s)
                  </span>
                )}
              </div>

              {/* Page Info (for Meta) */}
              {permissionsData.pageInfo && (
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Page:</span> {permissionsData.pageInfo.name}
                </div>
              )}

              {/* Granted Permissions */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Granted:</p>
                <div className="flex flex-wrap gap-1">
                  {permissionsData.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Permissions */}
              {permissionsData.missingPermissions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Missing (reconnect to grant):</p>
                  <div className="flex flex-wrap gap-1">
                    {permissionsData.missingPermissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                      >
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                        {perm}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Disconnect and reconnect to grant missing permissions.
                  </p>
                </div>
              )}
            </div>
          )}
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
