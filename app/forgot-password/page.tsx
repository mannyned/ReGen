'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ForgotPasswordStep = 'request' | 'sent';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [step, setStep] = useState<ForgotPasswordStep>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Validate email
  const validateEmail = (): boolean => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("That doesn't look like an email");
      return false;
    }
    setError('');
    return true;
  };

  // Start cooldown timer
  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle form submit with Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) return;

    setIsLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        // Handle specific errors
        if (resetError.message.includes('rate limit')) {
          setError('Too many requests. Please wait a few minutes.');
        } else {
          setError(resetError.message);
        }
        setIsLoading(false);
        return;
      }

      // Success - show confirmation
      setIsLoading(false);
      setStep('sent');
      startCooldown();
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle resend
  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        startCooldown();
      }
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mask email for display
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : '';

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

        {/* Step 1: Request Reset */}
        {step === 'request' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Forgot password?</h1>
              <p className="text-text-secondary">No worries, we'll send you reset instructions</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className="input-primary"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send reset link</span>
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-text-secondary hover:text-primary transition-colors group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to login</span>
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Email Sent */}
        {step === 'sent' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Check your email</h1>
              <p className="text-text-secondary">
                We sent a reset link to<br />
                <span className="font-medium text-text-primary">{maskedEmail}</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-text-secondary text-center">
                Click the link in the email to reset your password. The link expires in 24 hours.
              </p>
            </div>

            {/* Open Email App Button */}
            <a
              href="mailto:"
              className="w-full btn-primary flex items-center justify-center gap-2 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Open email app</span>
            </a>

            {/* Resend */}
            <div className="text-center mb-6">
              <p className="text-text-secondary text-sm">
                Didn't receive the email?{' '}
                {cooldown > 0 ? (
                  <span className="text-gray-400">Resend in {cooldown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-primary hover:text-primary-hover font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Click to resend'}
                  </button>
                )}
              </p>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-amber-800 mb-2">Can't find the email?</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• The email might take a few minutes</li>
              </ul>
            </div>

            {/* Back to Login */}
            <div className="mt-6">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-text-secondary hover:text-primary transition-colors group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to login</span>
              </Link>
            </div>

            {/* Try different email */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setStep('request');
                  setError('');
                }}
                className="text-sm text-text-secondary hover:text-primary transition-colors"
              >
                Try a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
