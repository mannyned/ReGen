'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [message, setMessage] = useState('');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      setMessage('No invitation token provided.');
      return;
    }

    const acceptInvite = async () => {
      try {
        const response = await fetch('/api/team/invites/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setTeamName(data.team?.name || 'the team');
          setMessage(`You've successfully joined ${data.team?.name || 'the team'}!`);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to accept invitation.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    acceptInvite();
  }, [token]);

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🔄</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Accepting Invitation...
          </h1>
          <p className="text-text-secondary">
            Please wait while we process your invitation.
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Welcome to {teamName}!
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
