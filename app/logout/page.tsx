'use client';

/**
 * Logout Page
 *
 * Provides a dedicated logout page with:
 * - Confirmation before signing out
 * - Success message after sign out
 * - Automatic redirect to home
 *
 * Users can navigate here directly or be redirected after sign out actions.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type LogoutStep = 'confirm' | 'signing-out' | 'success';

export default function LogoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<LogoutStep>('confirm');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);

  // Handle sign out
  const handleSignOut = async () => {
    setStep('signing-out');
    setError('');

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Sign out error:', signOutError);
        // Continue anyway - session might be invalid
      }

      setStep('success');
    } catch (err) {
      console.error('Sign out failed:', err);
      setError('Failed to sign out. Please try again.');
      setStep('confirm');
    }
  };

  // Countdown and redirect after success
  useEffect(() => {
    if (step !== 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-brand p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-float-delayed" />
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-8 md:p-10 w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
              <Image
                src="/brand/regenr-icon-clean-1024.png"
                alt="ReGenr Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              ReGenr
            </span>
          </Link>
        </div>

        {/* Confirm Step */}
        {step === 'confirm' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Sign out?
              </h1>
              <p className="text-text-secondary">
                Are you sure you want to sign out of your account?
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                className="w-full bg-red-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Yes, sign me out</span>
              </button>

              <Link
                href="/dashboard"
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>No, go back</span>
              </Link>
            </div>
          </div>
        )}

        {/* Signing Out Step */}
        {step === 'signing-out' && (
          <div className="animate-fade-in">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="animate-spin h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Signing out...
              </h1>
              <p className="text-text-secondary">
                Please wait while we sign you out
              </p>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                Signed out
              </h1>
              <p className="text-text-secondary">
                You have been successfully signed out
              </p>
            </div>

            {/* Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm text-text-secondary">
                Redirecting to home in{' '}
                <span className="font-semibold text-primary">{countdown}</span>{' '}
                seconds...
              </p>
            </div>

            {/* Manual Navigation */}
            <div className="space-y-3">
              <Link
                href="/"
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <span>Go to home now</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>

              <Link
                href="/login"
                className="w-full btn-ghost flex items-center justify-center gap-2"
              >
                <span>Sign in again</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
