'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * Auth Error Page
 *
 * Displays authentication errors with helpful messages and actions.
 * Handles various error types from Supabase auth callbacks.
 */

// Error code to user-friendly message mapping
const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  // OAuth errors
  access_denied: {
    title: 'Access Denied',
    description: 'You cancelled the sign-in process or denied access.',
  },
  oauth_error: {
    title: 'OAuth Error',
    description: 'There was a problem connecting to the authentication provider.',
  },

  // Code exchange errors
  no_code: {
    title: 'Invalid Link',
    description: 'The authentication link is missing required information.',
  },
  exchange_failed: {
    title: 'Session Error',
    description: 'We couldn\'t complete your sign-in. The link may have expired.',
  },
  invalid_request: {
    title: 'Invalid Request',
    description: 'The authentication request was malformed or invalid.',
  },

  // Email errors
  email_not_confirmed: {
    title: 'Email Not Verified',
    description: 'Please check your email and click the verification link.',
  },
  expired_token: {
    title: 'Link Expired',
    description: 'This authentication link has expired. Please request a new one.',
  },

  // Rate limiting
  over_request_rate_limit: {
    title: 'Too Many Attempts',
    description: 'Please wait a few minutes before trying again.',
  },

  // Generic errors
  unexpected: {
    title: 'Unexpected Error',
    description: 'Something went wrong. Please try again.',
  },
  server_error: {
    title: 'Server Error',
    description: 'Our servers are having trouble. Please try again later.',
  },
};

// Default error for unknown codes
const DEFAULT_ERROR = {
  title: 'Authentication Error',
  description: 'There was a problem signing you in.',
};

function AuthErrorContent() {
  const searchParams = useSearchParams();

  const errorCode = searchParams.get('error') || 'unexpected';
  const customMessage = searchParams.get('message');

  const errorInfo = ERROR_MESSAGES[errorCode] || DEFAULT_ERROR;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h1>

          <p className="text-gray-600 mb-2">
            {customMessage || errorInfo.description}
          </p>

          {/* Show error code in dev mode */}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-gray-400 font-mono mb-6">
              Error code: {errorCode}
            </p>
          )}

          {/* Actions */}
          <div className="space-y-3 mt-6">
            {/* Try Again - context-aware */}
            {errorCode === 'expired_token' || errorCode === 'email_not_confirmed' ? (
              <Link
                href="/forgot-password"
                className="block w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all"
              >
                Request New Link
              </Link>
            ) : (
              <Link
                href="/login"
                className="block w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all"
              >
                Try Again
              </Link>
            )}

            {/* Secondary action */}
            <Link
              href="/signup"
              className="block w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
            >
              Create Account
            </Link>

            {/* Home link */}
            <Link
              href="/"
              className="block text-sm text-gray-500 hover:text-gray-700 transition-colors mt-4"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <a
              href="mailto:support@regenr.com"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>

        {/* Tips for common errors */}
        {(errorCode === 'expired_token' || errorCode === 'exchange_failed') && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-amber-800 mb-2">
              Tips for expired links:
            </h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Check your email for the most recent link</li>
              <li>• Links expire after 24 hours</li>
              <li>• Request a new link from the login page</li>
            </ul>
          </div>
        )}

        {errorCode === 'over_request_rate_limit' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Rate limited
            </h3>
            <p className="text-sm text-blue-700">
              For security, we limit authentication attempts. Please wait 5-10 minutes
              before trying again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
