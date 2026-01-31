'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense, useRef, useEffect } from 'react';

/**
 * Email Verification Page
 *
 * Shown after signup when email verification is required.
 * Uses custom Resend-based verification with 6-digit code.
 */

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get('email');
  const inviteToken = searchParams.get('invite_token');

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5 && newCode.every(digit => digit)) {
      handleVerify(newCode.join(''));
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  // Verify code
  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeToVerify }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setIsVerifying(false);
        return;
      }

      // Success - redirect to dashboard or team invite
      const redirectPath = inviteToken
        ? `/team/invite?token=${inviteToken}`
        : '/dashboard';
      router.push(redirectPath);
    } catch {
      setError('Something went wrong. Please try again.');
      setIsVerifying(false);
    }
  };

  // Resend verification email via Resend
  const handleResend = async () => {
    if (!email || cooldown > 0) return;

    setIsResending(true);
    setResendStatus('idle');
    setError('');

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setResendStatus('error');
        setError(data.error || 'Failed to send email');
      } else {
        setResendStatus('success');
        // Start 60-second cooldown
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
      }
    } catch {
      setResendStatus('error');
      setError('Failed to send email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Mask email for privacy
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'your email';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Email Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verify your email
          </h1>

          <p className="text-gray-600 mb-6">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-gray-900">{maskedEmail}</span>
          </p>

          {/* Code Input */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all
                  ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'}
                  ${isVerifying ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900'}
                  outline-none`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {resendStatus === 'success' && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                New code sent!
              </p>
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isVerifying || code.some(d => !d)}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all mb-4 ${
              isVerifying || code.some(d => !d)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
            }`}
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify Email'
            )}
          </button>

          {/* Resend Button */}
          <button
            onClick={handleResend}
            disabled={isResending || cooldown > 0 || !email}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isResending ? (
              'Sending...'
            ) : cooldown > 0 ? (
              `Resend code in ${cooldown}s`
            ) : (
              "Didn't receive the code? Resend"
            )}
          </button>

          {/* Secondary Actions */}
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
            >
              Back to Login
            </Link>

            <p className="text-sm text-gray-500">
              Wrong email?{' '}
              <Link
                href="/signup"
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                Sign up again
              </Link>
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-teal-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Can't find the email?
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Check your spam or junk folder
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Make sure you entered the correct email
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              The email might take a few minutes to arrive
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Add <span className="font-medium">noreply@regenr.app</span> to your contacts
            </li>
          </ul>
        </div>

        {/* Help Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Still having trouble?{' '}
            <a
              href="mailto:support@regenr.app"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading state
function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg
            className="w-8 h-8 text-teal-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
