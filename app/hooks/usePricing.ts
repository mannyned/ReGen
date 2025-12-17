'use client';

import { useState, useCallback } from 'react';
import type { UserTier } from '@prisma/client';

export type BillingInterval = 'monthly' | 'yearly';

interface CheckoutResponse {
  requiresPayment?: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  success?: boolean;
  message?: string;
  tier?: {
    id: string;
    name: string;
    price?: { monthly: number; yearly: number };
  };
  error?: string;
}

interface PortalResponse {
  url?: string;
  error?: string;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  tier: UserTier;
  subscription?: {
    id: string;
    status: string;
    tier: UserTier | null;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    cancelAt: string | null;
  };
  customerId?: string;
}

interface UsePricingReturn {
  isLoading: boolean;
  error: string | null;
  checkout: (targetTier: Exclude<UserTier, 'FREE'>, interval: BillingInterval) => Promise<void>;
  openPortal: () => Promise<void>;
  getSubscriptionStatus: () => Promise<SubscriptionStatus | null>;
}

export function usePricing(): UsePricingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async (
    targetTier: Exclude<UserTier, 'FREE'>,
    interval: BillingInterval
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tiers/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTier, interval }),
      });

      const data: CheckoutResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      // Direct upgrade (dev mode) - refresh page
      if (data.success) {
        window.location.reload();
        return;
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Fallback to pricing page with params
      if (data.requiresPayment && !data.checkoutUrl) {
        window.location.href = `/pricing?tier=${targetTier}&interval=${interval}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openPortal = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data: PortalResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open portal';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSubscriptionStatus = useCallback(async (): Promise<SubscriptionStatus | null> => {
    try {
      const response = await fetch('/api/stripe/portal');

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }, []);

  return {
    isLoading,
    error,
    checkout,
    openPortal,
    getSubscriptionStatus,
  };
}
