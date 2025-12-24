'use client';

import Link from 'next/link';

// Beta period - pricing will be available after beta testing ends
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white flex items-center justify-center px-4">
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

        {/* CTA Buttons */}
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

        <p className="text-sm text-text-secondary mt-8">
          Pricing plans will be announced after the beta testing period ends.
          <br />
          Beta testers may receive special discounts!
        </p>
      </div>
    </div>
  );
}
