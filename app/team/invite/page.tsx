'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface InviteDetails {
  email: string;
  role: string;
  teamName: string;
  expiresAt: string;
}

type InviteStatus =
  | 'loading'
  | 'validating'
  | 'needs-signup'
  | 'needs-login'
  | 'accepting'
  | 'success'
  | 'error'
  | 'no-token';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [message, setMessage] = useState('');
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Step 1: Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setCurrentUserEmail(data.email);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Step 2: Validate invite token once we know auth status
  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      setMessage('No invitation token provided.');
      return;
    }

    if (isAuthenticated === null) {
      // Still checking auth
      return;
    }

    const validateAndProcess = async () => {
      setStatus('validating');

      try {
        // Validate the invite token
        const validateResponse = await fetch(`/api/team/invites/validate?token=${token}`);
        const validateData = await validateResponse.json();

        if (!validateData.valid) {
          setStatus('error');
          setMessage(validateData.error || 'Invalid invitation.');
          return;
        }

        setInviteDetails(validateData.invite);

        // If user is authenticated
        if (isAuthenticated) {
          // Check if logged in with the correct email
          if (currentUserEmail?.toLowerCase() !== validateData.invite.email.toLowerCase()) {
            setStatus('error');
            setMessage(
              `This invitation was sent to ${validateData.invite.email}. ` +
              `You're logged in as ${currentUserEmail}. ` +
              `Please log out and sign in with the correct account.`
            );
            return;
          }

          // Accept the invite
          setStatus('accepting');
          const acceptResponse = await fetch('/api/team/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          const acceptData = await acceptResponse.json();

          if (acceptResponse.ok) {
            setStatus('success');
            setMessage(`You've successfully joined ${acceptData.team?.name || 'the team'}!`);
          } else {
            setStatus('error');
            setMessage(acceptData.error || 'Failed to accept invitation.');
          }
        } else {
          // User is not authenticated
          if (validateData.accountExists) {
            // Account exists, need to log in
            setStatus('needs-login');
          } else {
            // No account, need to sign up
            setStatus('needs-signup');
          }
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    validateAndProcess();
  }, [token, isAuthenticated, currentUserEmail]);

  const handleSignupRedirect = () => {
    // Redirect to signup with the invite token and email pre-filled
    const signupUrl = `/signup?invite_token=${token}&email=${encodeURIComponent(inviteDetails?.email || '')}`;
    router.push(signupUrl);
  };

  const handleLoginRedirect = () => {
    // Redirect to login with return URL back to this page
    const returnUrl = encodeURIComponent(`/team/invite?token=${token}`);
    router.push(`/login?returnUrl=${returnUrl}&email=${encodeURIComponent(inviteDetails?.email || '')}`);
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
      {/* Loading / Validating */}
      {(status === 'loading' || status === 'validating') && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🔄</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {status === 'loading' ? 'Loading...' : 'Validating Invitation...'}
          </h1>
          <p className="text-text-secondary">
            Please wait while we process your invitation.
          </p>
        </>
      )}

      {/* Needs Signup */}
      {status === 'needs-signup' && inviteDetails && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            You're Invited!
          </h1>
          <p className="text-text-secondary mb-4">
            <span className="font-semibold text-text-primary">{inviteDetails.teamName}</span> has invited you to join as {inviteDetails.role === 'ADMIN' ? 'an Admin' : 'a Member'}.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-text-secondary">
              Invitation sent to:
            </p>
            <p className="font-medium text-text-primary">
              {inviteDetails.email}
            </p>
          </div>
          <p className="text-sm text-text-secondary mb-6">
            Create an account to accept this invitation.
          </p>
          <button
            onClick={handleSignupRedirect}
            className="w-full bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Create Account
          </button>
          <p className="text-xs text-text-secondary mt-4">
            Already have an account?{' '}
            <button onClick={handleLoginRedirect} className="text-primary hover:underline">
              Log in
            </button>
          </p>
        </>
      )}

      {/* Needs Login */}
      {status === 'needs-login' && inviteDetails && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            You're Invited!
          </h1>
          <p className="text-text-secondary mb-4">
            <span className="font-semibold text-text-primary">{inviteDetails.teamName}</span> has invited you to join as {inviteDetails.role === 'ADMIN' ? 'an Admin' : 'a Member'}.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-text-secondary">
              Invitation sent to:
            </p>
            <p className="font-medium text-text-primary">
              {inviteDetails.email}
            </p>
          </div>
          <p className="text-sm text-text-secondary mb-6">
            Log in to your account to accept this invitation.
          </p>
          <button
            onClick={handleLoginRedirect}
            className="w-full bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Log In
          </button>
        </>
      )}

      {/* Accepting */}
      {status === 'accepting' && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🔄</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Joining Team...
          </h1>
          <p className="text-text-secondary">
            Please wait while we add you to the team.
          </p>
        </>
      )}

      {/* Success */}
      {status === 'success' && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Welcome to the Team!
          </h1>
          <p className="text-text-secondary mb-6">
            {message}
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
        </>
      )}

      {/* Error */}
      {status === 'error' && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Invitation Failed
          </h1>
          <p className="text-text-secondary mb-6">
            {message}
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-100 text-text-primary font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </>
      )}

      {/* No Token */}
      {status === 'no-token' && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Invalid Link
          </h1>
          <p className="text-text-secondary mb-6">
            {message}
          </p>
          <Link
            href="/"
            className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Go Home
          </Link>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
        <span className="text-3xl">🔄</span>
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Loading...
      </h1>
      <p className="text-text-secondary">
        Please wait while we load your invitation.
      </p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
