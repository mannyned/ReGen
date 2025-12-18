'use client';

import type { UserTier } from '@prisma/client';

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanConfig {
  id: UserTier;
  name: string;
  description: string;
  icon: string;
  monthlyPrice: number;
  yearlyPrice: number;
  seats: number;
  popular?: boolean;
  features: PlanFeature[];
  cta?: string;
  ctaVariant?: 'primary' | 'secondary' | 'gradient';
}

interface PricingCardProps {
  plan: PlanConfig;
  billingCycle: 'monthly' | 'yearly';
  currentTier?: UserTier;
  isAuthenticated: boolean;
  isLoading?: boolean;
  onUpgrade: (tier: Exclude<UserTier, 'FREE'>) => void;
  onManageSubscription?: () => void;
}

export function PricingCard({
  plan,
  billingCycle,
  currentTier,
  isAuthenticated,
  isLoading,
  onUpgrade,
  onManageSubscription,
}: PricingCardProps) {
  const isCurrentPlan = currentTier === plan.id;
  const isDowngrade = currentTier && getTierLevel(currentTier) > getTierLevel(plan.id);
  const canUpgrade = !isCurrentPlan && !isDowngrade && plan.id !== 'FREE';

  const getPrice = () => {
    if (plan.monthlyPrice === 0) return 'Free';
    return billingCycle === 'monthly'
      ? plan.monthlyPrice
      : Math.round(plan.yearlyPrice / 12);
  };

  const getSavings = () => {
    if (plan.monthlyPrice === 0) return 0;
    const monthlyCost = plan.monthlyPrice * 12;
    const yearlyPrice = plan.yearlyPrice;
    return Math.round(((monthlyCost - yearlyPrice) / monthlyCost) * 100);
  };

  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    if (isCurrentPlan) return 'Current Plan';
    if (isDowngrade) return 'Contact Support';
    if (plan.id === 'FREE') {
      return isAuthenticated ? 'Your Free Plan' : 'Get Started Free';
    }
    return isAuthenticated ? 'Upgrade Now' : 'Start Free Trial';
  };

  const getButtonVariant = (): 'primary' | 'secondary' | 'gradient' | 'disabled' => {
    if (isCurrentPlan || isDowngrade) return 'disabled';
    if (plan.popular) return 'gradient';
    if (plan.id === 'PRO') return 'primary';
    return 'secondary';
  };

  const handleClick = () => {
    if (isLoading || isCurrentPlan) return;

    if (isDowngrade && onManageSubscription) {
      onManageSubscription();
      return;
    }

    if (plan.id === 'FREE') {
      if (!isAuthenticated) {
        window.location.href = '/signup';
      }
      return;
    }

    if (!isAuthenticated) {
      window.location.href = `/signup?plan=${plan.id.toLowerCase()}&interval=${billingCycle}`;
      return;
    }

    onUpgrade(plan.id as Exclude<UserTier, 'FREE'>);
  };

  const buttonVariant = getButtonVariant();

  return (
    <div
      className={`relative bg-white rounded-3xl p-8 transition-all duration-300 ${
        plan.popular
          ? 'ring-2 ring-primary shadow-xl scale-[1.02]'
          : 'border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg'
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-primary to-accent-purple text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
            Most Popular
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
            Your Plan
          </span>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-8">
        <span className="text-4xl mb-4 block">{plan.icon}</span>
        <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
        <p className="text-text-secondary text-sm">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-8">
        {plan.monthlyPrice === 0 ? (
          <div className="text-5xl font-bold text-text-primary">Free</div>
        ) : (
          <>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-text-secondary">$</span>
              <span className="text-5xl font-bold text-text-primary">{getPrice()}</span>
              <span className="text-text-secondary">/mo</span>
            </div>
            {billingCycle === 'yearly' && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-text-secondary">
                  ${plan.yearlyPrice} billed annually
                </p>
                <p className="text-sm text-green-600 font-medium">
                  Save {getSavings()}% vs monthly
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Seats Badge */}
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-text-secondary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {plan.seats} {plan.seats === 1 ? 'seat' : 'seats'}
        </span>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleClick}
        disabled={isLoading || (isCurrentPlan && !isDowngrade)}
        className={`w-full flex items-center justify-center py-3.5 px-6 rounded-xl font-semibold transition-all duration-200 mb-8 ${
          buttonVariant === 'gradient'
            ? 'bg-gradient-to-r from-primary to-accent-purple text-white hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
            : buttonVariant === 'primary'
            ? 'bg-primary text-white hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
            : buttonVariant === 'disabled'
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-gray-100 text-text-primary hover:bg-gray-200'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          getButtonText()
        )}
      </button>

      {/* Features List */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-text-primary mb-4">What's included:</p>
        {plan.features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3">
            {feature.included ? (
              <svg className={`w-5 h-5 flex-shrink-0 ${feature.highlight ? 'text-primary' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-sm ${
              feature.included
                ? feature.highlight
                  ? 'text-text-primary font-medium'
                  : 'text-text-secondary'
                : 'text-gray-400'
            }`}>
              {feature.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to get tier level for comparison
function getTierLevel(tier: UserTier): number {
  const levels: Record<UserTier, number> = {
    FREE: 0,
    CREATOR: 1,
    PRO: 2,
  };
  return levels[tier] ?? 0;
}
