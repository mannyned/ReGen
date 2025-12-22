'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PricingCard, SubscriptionBanner, type PlanConfig } from '../components/pricing';
import { usePricing, type BillingInterval } from '../hooks/usePricing';
import type { UserTier } from '@prisma/client';

// Plan configurations
const plans: PlanConfig[] = [
  {
    id: 'FREE',
    name: 'Free',
    description: 'For new creators',
    icon: '✨',
    monthlyPrice: 0,
    yearlyPrice: 0,
    seats: 1,
    features: [
      { text: '10 uploads per month', included: true },
      { text: '2 platforms', included: true },
      { text: '1 file per post', included: true },
      { text: 'Content scheduling', included: false },
      { text: 'Analytics', included: false },
    ],
    cta: 'Get Started',
    ctaVariant: 'secondary',
  },
  {
    id: 'CREATOR',
    name: 'Creator',
    description: 'For active creators',
    icon: '🌟',
    monthlyPrice: 9,
    yearlyPrice: 90,
    seats: 1,
    popular: true,
    features: [
      { text: 'Unlimited uploads', included: true, highlight: true },
      { text: '5 platforms', included: true, highlight: true },
      { text: '6 files per post', included: true },
      { text: 'Content scheduling', included: true, highlight: true },
      { text: 'Save Rate Analytics', included: true },
      { text: 'Platform Performance', included: true },
      { text: 'Top Formats Insights', included: true },
    ],
    cta: 'Start Creating',
    ctaVariant: 'gradient',
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'For agencies & power users',
    icon: '🚀',
    monthlyPrice: 29,
    yearlyPrice: 290,
    seats: 3,
    features: [
      { text: 'Everything in Creator', included: true, highlight: true },
      { text: 'Location Analytics', included: true },
      { text: 'Retention Graphs', included: true },
      { text: 'AI Recommendations', included: true, highlight: true },
      { text: 'Advanced Metrics', included: true },
      { text: 'Calendar Insights', included: true },
      { text: 'Team access (3 seats)', included: true, highlight: true },
      { text: 'Role-based analytics permissions', included: true },
    ],
    cta: 'Go Pro',
    ctaVariant: 'primary',
  },
];

const faqs = [
  {
    question: 'Can I switch plans anytime?',
    answer: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the end of your billing cycle.",
  },
  {
    question: 'What happens when I hit my upload limit?',
    answer: "You'll see a friendly reminder to upgrade. Your existing content stays safe, and limits reset on the 1st of each month. Free users can always upgrade mid-month for more uploads.",
  },
  {
    question: 'How does the 14-day free trial work?',
    answer: "Start any paid plan free for 14 days. No credit card required to start. You'll only be charged after the trial ends, and you can cancel anytime before then.",
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through our secure payment provider, Stripe.',
  },
  {
    question: 'Can I add more team seats to Pro?',
    answer: 'Pro includes 3 team seats. Need more? Contact us at support@regenr.app for additional seats and pricing info.',
  },
  {
    question: 'What analytics can team members see?',
    answer: 'By default, team members can view content performance analytics (save rates, engagement metrics). Account-level analytics (location, retention, cross-platform insights) are admin-only. Team owners can enable full analytics access for members in Settings.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use industry-standard encryption, secure OAuth for social connections, and never share your content with third parties. Your creations are yours.',
  },
];

interface UserState {
  isAuthenticated: boolean;
  tier: UserTier;
  email?: string;
}

interface SubscriptionState {
  hasSubscription: boolean;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingInterval>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<UserState>({ isAuthenticated: false, tier: 'FREE' });
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const { isLoading, error, checkout, openPortal, getSubscriptionStatus } = usePricing();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser({
            isAuthenticated: true,
            tier: data.tier || 'FREE',
            email: data.email,
          });

          // Get subscription status for authenticated users
          const subStatus = await getSubscriptionStatus();
          if (subStatus) {
            setSubscription({
              hasSubscription: subStatus.hasSubscription,
              status: subStatus.subscription?.status,
              currentPeriodEnd: subStatus.subscription?.currentPeriodEnd,
              cancelAtPeriodEnd: subStatus.subscription?.cancelAtPeriodEnd,
            });
          }
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoadingUser(false);
      }
    };

    checkAuth();
  }, [getSubscriptionStatus]);

  const handleUpgrade = useCallback((tier: Exclude<UserTier, 'FREE'>) => {
    checkout(tier, billingCycle);
  }, [checkout, billingCycle]);

  const handleManageSubscription = useCallback(() => {
    openPortal();
  }, [openPortal]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
                <Image
                  src="/logo.png"
                  alt="ReGenr Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                ReGenr
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {isLoadingUser ? (
                <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
              ) : user.isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="flex items-center gap-2 text-text-secondary hover:text-primary font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                  </Link>
                  <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {user.tier}
                  </span>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-text-secondary hover:text-primary font-medium transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary text-sm py-2 px-4">
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20">
        {/* Error Banner */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8 px-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center px-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium text-sm mb-6">
            <span>🎉</span>
            <span>14-day free trial on all paid plans</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-4 tracking-tight">
            Simple pricing,<br />
            <span className="bg-gradient-to-r from-primary via-accent-purple to-accent-pink bg-clip-text text-transparent">
              powerful results
            </span>
          </h1>

          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-gray-100 rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Annual
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                Save 17%
              </span>
            </button>
          </div>
        </section>

        {/* Subscription Banner for authenticated users with subscription */}
        {user.isAuthenticated && subscription?.hasSubscription && user.tier !== 'FREE' && (
          <section className="px-4 mb-8">
            <SubscriptionBanner
              subscription={{
                tier: user.tier,
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              }}
              isLoading={isLoading}
              onManageSubscription={handleManageSubscription}
            />
          </section>
        )}

        {/* Pricing Cards */}
        <section className="max-w-7xl mx-auto px-4 mb-24">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                currentTier={user.isAuthenticated ? user.tier : undefined}
                isAuthenticated={user.isAuthenticated}
                isLoading={isLoading || isLoadingUser}
                onUpgrade={handleUpgrade}
                onManageSubscription={handleManageSubscription}
              />
            ))}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="max-w-5xl mx-auto px-4 mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-4">Compare all features</h2>
            <p className="text-text-secondary">See exactly what you get with each plan</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-6 font-semibold text-text-primary">Feature</th>
                    <th className="p-6 text-center">
                      <span className="text-2xl block mb-1">✨</span>
                      <span className="font-semibold text-text-primary">Free</span>
                    </th>
                    <th className="p-6 text-center bg-primary/5">
                      <span className="text-2xl block mb-1">🌟</span>
                      <span className="font-semibold text-text-primary">Creator</span>
                    </th>
                    <th className="p-6 text-center">
                      <span className="text-2xl block mb-1">🚀</span>
                      <span className="font-semibold text-text-primary">Pro</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Monthly uploads', free: '10', creator: 'Unlimited', pro: 'Unlimited' },
                    { feature: 'Platforms', free: '2', creator: '5', pro: '5' },
                    { feature: 'Files per post', free: '1', creator: '6', pro: '6' },
                    { feature: 'Content scheduling', free: false, creator: true, pro: true },
                    { feature: 'Save Rate Analytics', free: false, creator: true, pro: true },
                    { feature: 'Platform Performance', free: false, creator: true, pro: true },
                    { feature: 'Top Formats Insights', free: false, creator: true, pro: true },
                    { feature: 'Location Analytics', free: false, creator: false, pro: true },
                    { feature: 'Retention Graphs', free: false, creator: false, pro: true },
                    { feature: 'AI Recommendations', free: false, creator: false, pro: true },
                    { feature: 'Advanced Metrics', free: false, creator: false, pro: true },
                    { feature: 'Calendar Insights', free: false, creator: false, pro: true },
                    { feature: 'Role-based analytics', free: false, creator: false, pro: true },
                    { feature: 'Team seats', free: '1', creator: '1', pro: '3' },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="p-4 pl-6 text-text-primary font-medium">{row.feature}</td>
                      <td className="p-4 text-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? (
                            <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-text-secondary">{row.free}</span>
                        )}
                      </td>
                      <td className="p-4 text-center bg-primary/5">
                        {typeof row.creator === 'boolean' ? (
                          row.creator ? (
                            <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-text-primary font-medium">{row.creator}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? (
                            <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-text-primary font-medium">{row.pro}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="max-w-4xl mx-auto px-4 mb-24">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-center">
            <span className="text-4xl mb-4 block">🏢</span>
            <h2 className="text-3xl font-bold text-white mb-4">Need more for your team?</h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
              Enterprise plans include custom seat limits, SSO, dedicated support, custom integrations, and SLA guarantees.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:enterprise@regenr.app"
                className="px-8 py-3.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Contact sales
              </a>
              <a
                href="#"
                className="px-8 py-3.5 text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-white/10 transition-colors"
              >
                Book a demo
              </a>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="max-w-3xl mx-auto px-4 mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-4">Frequently asked questions</h2>
            <p className="text-text-secondary">Everything you need to know about our pricing</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-text-primary pr-4">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-text-secondary flex-shrink-0 transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6">
                    <p className="text-text-secondary">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Ready to create amazing content?
            </h2>
            <p className="text-text-secondary mb-8">
              Join thousands of creators already using ReGenr. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user.isAuthenticated ? (
                user.tier === 'FREE' ? (
                  <button
                    onClick={() => handleUpgrade('CREATOR')}
                    disabled={isLoading}
                    className="px-8 py-4 bg-gradient-to-r from-primary to-accent-purple text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Upgrade to Creator'}
                  </button>
                ) : (
                  <Link
                    href="/dashboard"
                    className="px-8 py-4 bg-gradient-to-r from-primary to-accent-purple text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    Go to Dashboard
                  </Link>
                )
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="px-8 py-4 bg-gradient-to-r from-primary to-accent-purple text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    Start free trial
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 text-text-secondary font-semibold hover:text-primary transition-colors"
                  >
                    Already have an account? Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="relative w-8 h-8">
              <Image
                src="/logo.png"
                alt="ReGenr Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              ReGenr
            </span>
          </div>
          <p className="text-text-secondary text-sm">
            © {new Date().getFullYear()} ReGenr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
