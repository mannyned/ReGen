'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

interface InviteContext {
  teamName: string;
  role: string;
  email: string;
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for invite token in URL
  const inviteToken = searchParams.get('invite_token');
  const prefilledEmail = searchParams.get('email');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteContext, setInviteContext] = useState<InviteContext | null>(null);

  // Form fields
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch invite details if token is present
  useEffect(() => {
    if (inviteToken) {
      fetch(`/api/team/invites/validate?token=${inviteToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setInviteContext({
              teamName: data.invite.teamName,
              role: data.invite.role,
              email: data.invite.email,
            });
            // Pre-fill email if not already set
            if (!email && data.invite.email) {
              setEmail(data.invite.email);
            }
          }
        })
        .catch(() => {});
    }
  }, [inviteToken, email]);

  // Calculate password strength
  const getPasswordStrength = (pwd: string): PasswordStrength => {
    let score = 0;

    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
    if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-green-500' };
    return { score: 5, label: 'Very Strong', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "That doesn't look like an email";
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
    }

    if (!displayName) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.length < 2) {
      newErrors.displayName = 'Must be at least 2 characters';
    } else if (displayName.length > 30) {
      newErrors.displayName = 'Must be 30 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit with Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Determine redirect URL after email verification
      const redirectPath = inviteToken
        ? `/team/invite?token=${inviteToken}`
        : '/dashboard';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
          data: {
            display_name: displayName,
            full_name: displayName,
          },
        },
      });

      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered. Try logging in.' });
        } else if (error.message.includes('password')) {
          setErrors({ password: error.message });
        } else {
          setErrors({ email: error.message });
        }
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required - redirect to verify page
        const verifyUrl = inviteToken
          ? `/auth/verify-email?email=${encodeURIComponent(email)}&invite_token=${inviteToken}`
          : `/auth/verify-email?email=${encodeURIComponent(email)}`;
        router.push(verifyUrl);
      } else if (data.session) {
        // No email confirmation required (or auto-confirmed)
        router.push(redirectPath);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ email: 'Something went wrong. Please try again.' });
      setIsLoading(false);
    }
  };

  // Handle OAuth sign-in with Supabase
  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setErrors({ email: error.message });
        setIsLoading(false);
      }
      // If successful, Supabase redirects to the OAuth provider
    } catch (error) {
      console.error('OAuth error:', error);
      setErrors({ email: 'Failed to connect. Please try again.' });
      setIsLoading(false);
    }
  };

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

        {/* Invite Banner */}
        {inviteContext && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-primary font-medium text-center">
              You've been invited to join <strong>{inviteContext.teamName}</strong> as {inviteContext.role === 'ADMIN' ? 'an Admin' : 'a Member'}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {inviteContext ? 'Create your account' : 'Create your account'}
          </h1>
          <p className="text-text-secondary">
            {inviteContext ? 'Sign up to accept your team invitation' : 'Get started in seconds'}
          </p>
        </div>

        {/* Social Sign-In Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocialSignIn('apple')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span>Continue with Apple</span>
          </button>

          <button
            onClick={() => handleSocialSignIn('google')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl font-medium hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-text-primary">Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-text-secondary">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

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
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              className={`input-primary ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                className={`input-primary pr-12 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                placeholder="Create a password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  passwordStrength.score <= 2 ? 'text-red-500' :
                  passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-text-primary mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) setErrors({ ...errors, displayName: '' });
              }}
              className={`input-primary ${errors.displayName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`}
              placeholder="What should we call you?"
              maxLength={30}
              autoComplete="name"
            />
            {errors.displayName && (
              <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Terms */}
        <p className="text-xs text-text-secondary text-center mt-4">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>

        {/* Sign In Link */}
        <div className="mt-6 text-center">
          <p className="text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary-hover font-semibold transition-colors">
              Log in
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-6">
          <Link href="/" className="flex items-center justify-center gap-2 text-text-secondary hover:text-primary transition-colors group">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-brand p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-6" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignupContent />
    </Suspense>
  );
}
