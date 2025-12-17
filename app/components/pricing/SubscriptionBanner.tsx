'use client';

import type { UserTier } from '@prisma/client';

interface SubscriptionInfo {
  tier: UserTier;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

interface SubscriptionBannerProps {
  subscription: SubscriptionInfo;
  isLoading?: boolean;
  onManageSubscription: () => void;
}

export function SubscriptionBanner({
  subscription,
  isLoading,
  onManageSubscription,
}: SubscriptionBannerProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTierColor = (tier: UserTier) => {
    switch (tier) {
      case 'PRO':
        return 'from-purple-500 to-indigo-600';
      case 'CREATOR':
        return 'from-primary to-accent-purple';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getTierIcon = (tier: UserTier) => {
    switch (tier) {
      case 'PRO':
        return '🚀';
      case 'CREATOR':
        return '🌟';
      default:
        return '✨';
    }
  };

  return (
    <div className="max-w-3xl mx-auto mb-12">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getTierColor(subscription.tier)} p-6 text-white shadow-xl`}>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{getTierIcon(subscription.tier)}</span>
            <div>
              <h3 className="text-xl font-bold">
                {subscription.tier} Plan
              </h3>
              {subscription.cancelAtPeriodEnd ? (
                <p className="text-white/80 text-sm mt-1">
                  Cancels on {subscription.currentPeriodEnd && formatDate(subscription.currentPeriodEnd)}
                </p>
              ) : subscription.currentPeriodEnd ? (
                <p className="text-white/80 text-sm mt-1">
                  Renews {formatDate(subscription.currentPeriodEnd)}
                </p>
              ) : (
                <p className="text-white/80 text-sm mt-1">
                  Active subscription
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onManageSubscription}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            Manage Subscription
          </button>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="relative mt-4 p-3 bg-white/10 rounded-lg">
            <p className="text-sm text-white/90">
              Your subscription will be cancelled at the end of the billing period.
              You can reactivate anytime before then.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
