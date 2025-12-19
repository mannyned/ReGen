'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface SessionDetails {
  tier?: string;
  email?: string;
  amount?: number;
  interval?: string;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);

  // Fetch session details
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stripe/checkout?session_id=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setSessionDetails({
            tier: data.tier,
            email: data.customerEmail,
            amount: data.amountTotal,
            interval: data.interval,
          });
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/dashboard';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="relative w-10 h-10">
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
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce-slow">
              <svg
                className="w-12 h-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Welcome to {sessionDetails?.tier || 'Pro'}!
            </h1>

            <p className="text-xl text-text-secondary mb-2">
              Your payment was successful
            </p>

            {sessionDetails?.email && (
              <p className="text-sm text-text-secondary">
                A confirmation has been sent to <strong>{sessionDetails.email}</strong>
              </p>
            )}
          </div>

          {/* Order Summary Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Order Summary
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-text-secondary">Plan</span>
                  <span className="font-semibold text-text-primary">
                    {sessionDetails?.tier || 'Premium'} Plan
                  </span>
                </div>
                {sessionDetails?.interval && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-text-secondary">Billing</span>
                    <span className="font-medium text-text-primary capitalize">
                      {sessionDetails.interval}
                    </span>
                  </div>
                )}
                {sessionDetails?.amount && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-text-secondary">Amount Paid</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatAmount(sessionDetails.amount)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* What's Next Section */}
          <div className="bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-text-primary mb-4">What's next?</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-bold">
                  1
                </span>
                <span className="text-text-secondary">
                  Connect your social media accounts to start posting
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-bold">
                  2
                </span>
                <span className="text-text-secondary">
                  Upload your first video and generate AI-powered captions
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-bold">
                  3
                </span>
                <span className="text-text-secondary">
                  Schedule posts across all your platforms at once
                </span>
              </li>
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="flex-1 py-4 px-6 bg-gradient-to-r from-primary to-accent-purple text-white font-semibold rounded-xl text-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/settings/billing"
              className="flex-1 py-4 px-6 bg-white border-2 border-gray-200 text-text-primary font-semibold rounded-xl text-center hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              View Billing
            </Link>
          </div>

          {/* Auto-redirect notice */}
          <p className="text-center text-sm text-text-secondary mt-6">
            Redirecting to dashboard in {countdown} seconds...
          </p>
        </div>
      </main>

      {/* Confetti-like decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-3 h-3 bg-green-400 rounded-full animate-float opacity-60" />
        <div className="absolute top-40 right-20 w-2 h-2 bg-primary rounded-full animate-float-delayed opacity-60" />
        <div className="absolute bottom-40 left-1/4 w-4 h-4 bg-accent-purple rounded-full animate-float opacity-40" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-accent-pink rounded-full animate-float-delayed opacity-50" />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-180deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        .animate-bounce-slow {
          animation: bounce 2s ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-primary/5 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
