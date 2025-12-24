'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Beta period - pricing will be available after beta testing ends
export default function PricingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          // API returns user data at top level (id, email, displayName, etc.)
          if (data.id) {
            setIsLoggedIn(true);
            setUserName(data.displayName || data.email?.split('@')[0] || 'there');
          }
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white flex flex-col">
      {/* Back Button - Only show for logged in users */}
      {isLoggedIn && (
        <div className="p-4 md:p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Beta Program Active
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
            Free During Beta
          </h1>

          <p className="text-xl text-text-secondary mb-8 max-w-lg mx-auto">
            We&apos;re currently in beta testing. Enjoy full access to all features for free while we perfect the experience!
          </p>

          {/* Benefits */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-6">Beta Tester Benefits</h2>
            <ul className="space-y-4 text-left max-w-md mx-auto">
              {[
                'Full access to all platform integrations',
                'Unlimited content repurposing',
                'AI-powered caption generation',
                'Complete analytics dashboard',
                'Priority support',
                'Help shape the product with your feedback',
              ].map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons - Different for logged in vs logged out */}
          {isLoading ? (
            <div className="h-14" /> // Placeholder while loading
          ) : isLoggedIn ? (
            <>
              {/* Already logged in message */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-700 font-medium">
                  You&apos;re already part of the beta, {userName}!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="btn-primary px-8 py-3 text-lg font-semibold"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="btn-secondary px-8 py-3 text-lg font-semibold"
                >
                  Manage Settings
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Not logged in - show signup options */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="btn-primary px-8 py-3 text-lg font-semibold"
                >
                  Join Beta Program
                </Link>
                <Link
                  href="/#beta"
                  className="btn-secondary px-8 py-3 text-lg font-semibold"
                >
                  Learn More
                </Link>
              </div>
            </>
          )}

          <p className="text-sm text-text-secondary mt-8">
            Pricing plans will be announced after the beta testing period ends.
            <br />
            Beta testers may receive special discounts!
          </p>
        </div>
      </div>
    </div>
  );
}
