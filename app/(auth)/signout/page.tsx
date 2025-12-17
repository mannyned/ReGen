'use client';

/**
 * Sign Out Page
 *
 * Handles sign-out flow with:
 * - Session clearing
 * - Local storage cleanup
 * - Redirect to homepage
 * - Optional sign out from all devices
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, signOutAll } from '@/lib/auth/flows';

export default function SignOutPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllDevices, setShowAllDevices] = useState(false);

  // Auto sign out on page load
  useEffect(() => {
    handleSignOut();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);

    const result = await signOut();

    setSigningOut(false);

    if (!result.success) {
      setError(result.error || 'Failed to sign out');
      return;
    }

    // Redirect to homepage after short delay
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  const handleSignOutAllDevices = async () => {
    setSigningOut(true);
    setError(null);

    const result = await signOutAll();

    setSigningOut(false);

    if (!result.success) {
      setError(result.error || 'Failed to sign out from all devices');
      return;
    }

    // Redirect to homepage
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  // Success state
  if (!signingOut && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Signed out</h2>
            <p className="text-gray-600 mb-6">
              You have been successfully signed out.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Redirecting to homepage...
            </p>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to homepage now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign out failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="block w-full px-4 py-2 text-gray-700 bg-gray-100 font-medium rounded-lg hover:bg-gray-200"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Signing out...</h2>
          <p className="text-gray-600 mb-6">
            Please wait while we sign you out securely.
          </p>

          {/* Sign out from all devices option */}
          {!showAllDevices ? (
            <button
              onClick={() => setShowAllDevices(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out from all devices?
            </button>
          ) : (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-600 mb-3">
                This will sign you out from all devices where you're currently logged in.
              </p>
              <button
                onClick={handleSignOutAllDevices}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Sign Out Everywhere
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
