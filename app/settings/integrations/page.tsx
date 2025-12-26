'use client';

import { useEffect } from 'react';
import { PLATFORMS, TIER_LIMITS, type UserTier, type PlatformId, type TeamSeat } from '@/lib/types/integrations';
import { useIntegration, useConnectionStatuses } from '@/lib/hooks/useIntegration';
import { PlatformCard } from '@/app/components/integrations/PlatformCard';
import { TeamSeatsCard } from '@/app/components/integrations/TeamSeatsCard';
import { TierBadge } from '@/app/components/integrations/TierBadge';
import { useToast } from '@/app/components/ui/Toast';

// Mock data - replace with real data from your auth/subscription context
const mockUserTier: UserTier = 'CREATOR';
const mockTeamSeats: TeamSeat[] = [
  {
    id: '1',
    email: 'you@example.com',
    displayName: 'You',
    role: 'owner',
    joinedAt: new Date(),
    invitedAt: new Date(),
  },
];

export default function IntegrationsPage() {
  const { addToast } = useToast();
  const { statuses, isLoading, refresh } = useConnectionStatuses();
  const { connect, disconnect, isConnecting, isDisconnecting, error } = useIntegration({
    onSuccess: (platform) => {
      addToast('success', `Successfully connected to ${platform}`);
      refresh();
    },
    onError: (platform, err) => {
      addToast('error', `Failed to connect to ${platform}: ${err}`);
    },
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (error) {
      addToast('error', error);
    }
  }, [error, addToast]);

  const currentTier = mockUserTier;
  const tierLimits = TIER_LIMITS[currentTier];
  const connectedCount = Object.values(statuses).filter((s) => s.connected).length;

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  const handleInviteTeamMember = () => {
    // TODO: Open invite modal
    addToast('info', 'Team invites coming soon!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
            <TierBadge tier={currentTier} size="md" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Connect your social accounts to start repurposing content
          </p>
        </div>

        {/* Connection Stats */}
        <div className="mb-8 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Connected Accounts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {connectedCount}
                <span className="text-gray-400 dark:text-gray-500 text-lg font-normal">
                  /{tierLimits.connections === -1 ? '∞' : tierLimits.connections}
                </span>
              </p>
            </div>
            {currentTier !== 'PRO' && (
              <button
                onClick={handleUpgrade}
                className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                Upgrade for more connections
              </button>
            )}
          </div>

          {tierLimits.connections !== -1 && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                  style={{ width: `${Math.min((connectedCount / tierLimits.connections) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Platform Cards */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Platforms</h2>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {PLATFORMS.map((platform) => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  status={statuses[platform.id]}
                  currentTier={currentTier}
                  onConnect={() => connect(platform.id)}
                  onDisconnect={() => disconnect(platform.id)}
                  onUpgrade={handleUpgrade}
                  isLoading={isConnecting === platform.id || isDisconnecting === platform.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Team Seats (Pro Feature) */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team</h2>
          <TeamSeatsCard
            currentTier={currentTier}
            seats={mockTeamSeats}
            maxSeats={tierLimits.teamSeats}
            onInvite={handleInviteTeamMember}
            onUpgrade={handleUpgrade}
          />
        </div>

        {/* Help Section */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-100 dark:border-violet-800/50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Need help connecting?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Check out our FAQ for setting up each platform integration, or reach out to support.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/help#meta-connection"
              className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              Connection Help →
            </a>
            <a
              href="/help#plans-access"
              className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              Plan Limits →
            </a>
            <a
              href="mailto:support@regenr.app"
              className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              Contact Support →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
