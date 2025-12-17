'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppHeader, Card, Badge } from '../../components/ui';
import { usePricing } from '../../hooks/usePricing';
import type { UserTier } from '@prisma/client';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  tier: UserTier;
  hasSubscription: boolean;
  subscriptionStatus?: string;
}

interface SubscriptionDetails {
  id: string;
  status: string;
  tier: UserTier | null;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl?: string;
}

interface UsageStats {
  uploads: { used: number; limit: number };
  storage: { used: number; limit: number; unit: string };
  platforms: { used: number; limit: number };
  scheduledPosts: { used: number; limit: number };
}

const TIER_DISPLAY: Record<UserTier, { name: string; icon: string; color: string }> = {
  FREE: { name: 'Free', icon: '✨', color: 'from-gray-400 to-gray-500' },
  CREATOR: { name: 'Creator', icon: '🌟', color: 'from-primary to-accent-purple' },
  PRO: { name: 'Pro', icon: '🚀', color: 'from-purple-500 to-indigo-600' },
};

const TIER_PRICING: Record<Exclude<UserTier, 'FREE'>, { monthly: number; yearly: number }> = {
  CREATOR: { monthly: 19, yearly: 190 },
  PRO: { monthly: 49, yearly: 490 },
};

export default function BillingPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { isLoading, error, checkout, openPortal, getSubscriptionStatus } = usePricing();

  // Fetch user profile and subscription
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile
        const profileResponse = await fetch('/api/auth/me');
        if (!profileResponse.ok) {
          window.location.href = '/login?redirect=/settings/billing';
          return;
        }
        const profileData = await profileResponse.json();
        setUser(profileData);

        // Fetch subscription status
        const subStatus = await getSubscriptionStatus();
        if (subStatus?.subscription) {
          setSubscription(subStatus.subscription);
        }

        // Fetch usage stats
        try {
          const usageResponse = await fetch('/api/usage');
          if (usageResponse.ok) {
            const usageData = await usageResponse.json();
            setUsage(usageData);
          }
        } catch {
          // Usage endpoint may not exist yet
        }

        // Fetch invoices
        setIsLoadingInvoices(true);
        try {
          const invoicesResponse = await fetch('/api/stripe/invoices');
          if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json();
            setInvoices(invoicesData.invoices || []);
          }
        } catch {
          // Invoices endpoint may not exist yet
        } finally {
          setIsLoadingInvoices(false);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, [getSubscriptionStatus]);

  const handleUpgrade = useCallback((tier: Exclude<UserTier, 'FREE'>) => {
    checkout(tier, 'monthly');
  }, [checkout]);

  const handleManagePayment = useCallback(() => {
    openPortal();
  }, [openPortal]);

  const handleCancelSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/stripe/subscription/cancel', {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh subscription status
        const subStatus = await getSubscriptionStatus();
        if (subStatus?.subscription) {
          setSubscription(subStatus.subscription);
        }
        setShowCancelModal(false);
      }
    } catch (err) {
      console.error('Error canceling subscription:', err);
    }
  }, [getSubscriptionStatus]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 10; // Show minimal for unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader currentPage="settings" />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tierDisplay = TIER_DISPLAY[user.tier];
  const canUpgrade = user.tier !== 'PRO';
  const hasActiveSubscription = subscription && subscription.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24 lg:pt-28">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href="/settings" className="text-text-secondary hover:text-primary transition-colors">
            Settings
          </Link>
          <span className="text-text-secondary">/</span>
          <span className="text-text-primary font-medium">Billing</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
            Billing & Subscription
          </h1>
          <p className="text-text-secondary">
            Manage your subscription, payment methods, and view invoices
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Current Plan Card */}
        <Card className="p-6 lg:p-8 mb-6" hover={false}>
          <h2 className="text-xl font-bold text-text-primary mb-6">Current Plan</h2>

          <div className={`p-6 bg-gradient-to-r ${tierDisplay.color} rounded-2xl text-white mb-6`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{tierDisplay.icon}</span>
                <div>
                  <h3 className="text-2xl font-bold">{tierDisplay.name} Plan</h3>
                  {user.tier !== 'FREE' && subscription ? (
                    <p className="text-white/80">
                      {subscription.cancelAtPeriodEnd
                        ? `Cancels ${formatDate(subscription.currentPeriodEnd)}`
                        : `Renews ${formatDate(subscription.currentPeriodEnd)}`}
                    </p>
                  ) : user.tier !== 'FREE' ? (
                    <p className="text-white/80">
                      ${TIER_PRICING[user.tier as Exclude<UserTier, 'FREE'>].monthly}/month
                    </p>
                  ) : (
                    <p className="text-white/80">Free forever</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {canUpgrade && (
                  <button
                    onClick={() => handleUpgrade(user.tier === 'FREE' ? 'CREATOR' : 'PRO')}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : `Upgrade to ${user.tier === 'FREE' ? 'Creator' : 'Pro'}`}
                  </button>
                )}
                {hasActiveSubscription && (
                  <button
                    onClick={handleManagePayment}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors disabled:opacity-50"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>
            </div>

            {subscription?.cancelAtPeriodEnd && (
              <div className="mt-4 p-3 bg-white/10 rounded-lg">
                <p className="text-sm">
                  Your subscription will be cancelled at the end of the billing period.
                  You can reactivate anytime before {formatDate(subscription.currentPeriodEnd)}.
                </p>
              </div>
            )}
          </div>

          {/* Plan Comparison for Free Users */}
          {user.tier === 'FREE' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 border-2 border-gray-100 rounded-xl hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🌟</span>
                  <div>
                    <h4 className="font-bold text-text-primary">Creator</h4>
                    <p className="text-sm text-text-secondary">$19/month</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-text-secondary mb-4">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    200 uploads/month
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI-powered captions
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    5 platforms
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgrade('CREATOR')}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  Upgrade to Creator
                </button>
              </div>

              <div className="p-5 border-2 border-purple-200 rounded-xl bg-purple-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <h4 className="font-bold text-text-primary">Pro</h4>
                    <p className="text-sm text-text-secondary">$49/month</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-text-secondary mb-4">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited uploads
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Team collaboration (10 seats)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    API access
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgrade('PRO')}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}

          {/* Upgrade Option for Creator Users */}
          {user.tier === 'CREATOR' && (
            <div className="p-5 border-2 border-purple-200 rounded-xl bg-purple-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🚀</span>
                  <div>
                    <h4 className="font-bold text-text-primary">Upgrade to Pro</h4>
                    <p className="text-sm text-text-secondary">
                      Unlimited uploads, team collaboration, API access, and more
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade('PRO')}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                >
                  $49/month
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Usage Stats */}
        {usage && (
          <Card className="p-6 lg:p-8 mb-6" hover={false}>
            <h2 className="text-xl font-bold text-text-primary mb-6">Usage This Period</h2>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Uploads</span>
                  <span className="font-medium text-text-primary">
                    {usage.uploads.used} / {formatLimit(usage.uploads.limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${getUsagePercentage(usage.uploads.used, usage.uploads.limit)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Storage</span>
                  <span className="font-medium text-text-primary">
                    {usage.storage.used} {usage.storage.unit} / {formatLimit(usage.storage.limit)} {usage.storage.unit}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${getUsagePercentage(usage.storage.used, usage.storage.limit)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Connected Platforms</span>
                  <span className="font-medium text-text-primary">
                    {usage.platforms.used} / {formatLimit(usage.platforms.limit)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${getUsagePercentage(usage.platforms.used, usage.platforms.limit)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Payment Method */}
        {hasActiveSubscription && (
          <Card className="p-6 lg:p-8 mb-6" hover={false}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary">Payment Method</h2>
              <button
                onClick={handleManagePayment}
                disabled={isLoading}
                className="text-primary font-medium hover:underline disabled:opacity-50"
              >
                Update
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                <svg className="w-8 h-5 text-white" viewBox="0 0 32 20" fill="currentColor">
                  <path d="M0 4a4 4 0 014-4h24a4 4 0 014 4v12a4 4 0 01-4 4H4a4 4 0 01-4-4V4z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-text-primary">Card ending in ****</p>
                <p className="text-sm text-text-secondary">
                  Manage via Stripe Customer Portal
                </p>
              </div>
            </div>

            <p className="text-sm text-text-secondary mt-4">
              Click "Update" to add, remove, or change your payment method through our secure payment provider.
            </p>
          </Card>
        )}

        {/* Billing History */}
        <Card className="p-6 lg:p-8 mb-6" hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">Billing History</h2>
            {invoices.length > 0 && (
              <button
                onClick={handleManagePayment}
                className="text-primary text-sm font-medium hover:underline"
              >
                View all in Stripe
              </button>
            )}
          </div>

          {isLoadingInvoices ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{invoice.number}</p>
                      <p className="text-sm text-text-secondary">{formatDate(invoice.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-text-primary">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </span>
                    <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-text-secondary">No invoices yet</p>
              <p className="text-sm text-text-secondary mt-1">
                Your billing history will appear here after your first payment.
              </p>
            </div>
          )}
        </Card>

        {/* Cancel Subscription */}
        {hasActiveSubscription && !subscription?.cancelAtPeriodEnd && (
          <Card className="p-6 lg:p-8 border-orange-200" hover={false}>
            <h2 className="text-xl font-bold text-orange-600 mb-2">Cancel Subscription</h2>
            <p className="text-text-secondary mb-6">
              Your plan will remain active until the end of your billing period.
              After that, you'll be switched to the Free plan.
            </p>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-5 py-2.5 border-2 border-orange-200 text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors"
            >
              Cancel subscription
            </button>
          </Card>
        )}

        {/* Reactivate Subscription */}
        {subscription?.cancelAtPeriodEnd && (
          <Card className="p-6 lg:p-8 border-green-200 bg-green-50/50" hover={false}>
            <h2 className="text-xl font-bold text-green-700 mb-2">Reactivate Subscription</h2>
            <p className="text-text-secondary mb-6">
              Your subscription is scheduled to cancel on {formatDate(subscription.currentPeriodEnd)}.
              Reactivate to keep your {tierDisplay.name} features.
            </p>
            <button
              onClick={handleManagePayment}
              disabled={isLoading}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Reactivate Subscription
            </button>
          </Card>
        )}

        {/* Need Help */}
        <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
          <h3 className="font-semibold text-text-primary mb-2">Need help with billing?</h3>
          <p className="text-sm text-text-secondary mb-4">
            Contact our support team for questions about your subscription, refunds, or payment issues.
          </p>
          <a
            href="mailto:billing@regenr.app"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            billing@regenr.app
          </a>
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Cancel Subscription?</h3>
              <p className="text-text-secondary">
                You'll lose access to {tierDisplay.name} features at the end of your billing period.
                You can reactivate anytime before then.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3 bg-gray-100 text-text-primary font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isLoading}
                className="w-full py-3 border-2 border-orange-200 text-orange-600 font-medium rounded-xl hover:bg-orange-50 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Canceling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
