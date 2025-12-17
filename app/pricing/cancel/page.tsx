'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const commonReasons = [
  { id: 'price', label: 'Price is too high', icon: '💰' },
  { id: 'features', label: 'Missing features I need', icon: '🔧' },
  { id: 'compare', label: 'Comparing other options', icon: '🔍' },
  { id: 'timing', label: 'Not the right time', icon: '⏰' },
  { id: 'other', label: 'Other reason', icon: '💭' },
];

export default function CheckoutCancelPage() {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!selectedReason) return;

    try {
      // Optional: Send feedback to your analytics or backend
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkout_cancel',
          reason: selectedReason,
          feedback,
        }),
      }).catch(() => {
        // Silently fail - feedback is optional
      });

      setSubmitted(true);
    } catch {
      // Ignore errors
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col">
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
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <span className="text-4xl">🛒</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Checkout cancelled
            </h1>

            <p className="text-lg text-text-secondary">
              No worries! Your cart is still waiting for you.
            </p>
          </div>

          {/* Feedback Section */}
          {!submitted ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Mind sharing why? (Optional)
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Your feedback helps us improve ReGenr for everyone.
              </p>

              {/* Reason Selection */}
              <div className="grid grid-cols-1 gap-2 mb-4">
                {commonReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedReason === reason.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{reason.icon}</span>
                    <span className={`font-medium ${
                      selectedReason === reason.id ? 'text-primary' : 'text-text-primary'
                    }`}>
                      {reason.label}
                    </span>
                    {selectedReason === reason.id && (
                      <svg className="w-5 h-5 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Additional Feedback */}
              {selectedReason && (
                <div className="mb-4">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us more (optional)..."
                    className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    rows={3}
                  />
                </div>
              )}

              {/* Submit Button */}
              {selectedReason && (
                <button
                  onClick={handleSubmitFeedback}
                  className="w-full py-3 px-4 bg-gray-100 text-text-primary font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Submit Feedback
                </button>
              )}
            </div>
          ) : (
            <div className="bg-green-50 rounded-2xl border border-green-100 p-6 mb-8 text-center">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700 font-medium">Thanks for your feedback!</p>
            </div>
          )}

          {/* Special Offer Card */}
          <div className="bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-2xl p-6 mb-8 border border-primary/20">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🎁</span>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">
                  Still thinking about it?
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  Start with our Free plan and upgrade anytime. No credit card required.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center text-primary font-medium hover:underline"
                >
                  Try Free Plan
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <h3 className="font-semibold text-text-primary mb-3">Have questions?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Our team is here to help you find the right plan for your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@regenr.app"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-text-primary hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Support
              </a>
              <Link
                href="/pricing#faqs"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-text-primary hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View FAQs
              </Link>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/pricing"
              className="flex-1 py-4 px-6 bg-gradient-to-r from-primary to-accent-purple text-white font-semibold rounded-xl text-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Return to Pricing
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 py-4 px-6 bg-white border-2 border-gray-200 text-text-primary font-semibold rounded-xl text-center hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
