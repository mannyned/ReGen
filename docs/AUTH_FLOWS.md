# Authentication Flows

Complete guide to the authentication flows in ReGenr, including sign-up, sign-in, and sign-out.

## Overview

ReGenr supports multiple authentication methods:
- **Email/Password**: Traditional sign-up and sign-in
- **Magic Link**: Passwordless authentication via email
- **OAuth**: Google and Apple sign-in
- **Password Reset**: Self-service password recovery

## 1. Sign-Up Flow

### Email/Password Sign-Up

```
User                    Client                   Supabase                  Database
  |                        |                         |                         |
  |-- Enter details ------>|                         |                         |
  |                        |-- auth.signUp() ------->|                         |
  |                        |                         |-- Create auth.user ---->|
  |                        |                         |-- Send confirm email -->|
  |                        |<-- User + requires_confirmation                   |
  |<-- "Check email" ------|                         |                         |
  |                        |                         |                         |
  |-- Click email link --->|                         |                         |
  |                        |-- /auth/callback ------>|                         |
  |                        |                         |-- Verify email -------->|
  |                        |                         |-- Create session ------>|
  |                        |<-- Session              |                         |
  |                        |-- Create Profile -------------------------------->|
  |<-- Redirect dashboard -|                         |                         |
```

### Implementation

```tsx
// Using the flow utilities
import { signUp, validateSignUpData } from '@/lib/auth/flows';

const handleSignUp = async () => {
  // Validate input
  const validation = validateSignUpData({ email, password, displayName });
  if (!validation.valid) {
    setError(Object.values(validation.errors)[0]);
    return;
  }

  // Sign up
  const result = await signUp({ email, password, displayName });

  if (!result.success) {
    setError(result.error);
    return;
  }

  if (result.requiresConfirmation) {
    // Show "check your email" message
    setShowVerification(true);
  } else {
    // Email confirmation disabled, redirect to dashboard
    router.push('/dashboard');
  }
};
```

### Magic Link Sign-Up (Passwordless)

```tsx
import { signUpWithMagicLink } from '@/lib/auth/flows';

const handleMagicLink = async () => {
  const result = await signUpWithMagicLink({
    email,
    displayName
  });

  if (result.success) {
    setShowCheckEmail(true);
  }
};
```

### Profile Creation

Profile is created automatically when:

1. **API signup**: Profile created in `/api/auth/signup` route
2. **OAuth callback**: Profile created in `/auth/callback` route
3. **First access**: Profile created in `getUser()` if missing

```typescript
// Profile creation in auth callback
await prisma.profile.create({
  data: {
    id: user.id,  // Same as Supabase auth.users.id
    email: user.email.toLowerCase(),
    displayName: user.user_metadata?.display_name || email.split('@')[0],
    tier: 'FREE',
  },
});
```

### Email Verification

```tsx
// Resend verification email
import { resendVerificationEmail } from '@/lib/auth/flows';

const handleResend = async () => {
  const result = await resendVerificationEmail(email);
  if (result.success) {
    setMessage('Verification email sent!');
  }
};
```

## 2. Sign-In Flow

### Email/Password Sign-In

```
User                    Client                   Supabase
  |                        |                         |
  |-- Enter credentials -->|                         |
  |                        |-- auth.signInWithPassword()
  |                        |                         |
  |                        |<-- Session + User       |
  |                        |-- Store in cookies ---->|
  |<-- Redirect dashboard -|                         |
```

### Implementation

```tsx
import { signIn } from '@/lib/auth/flows';

const handleSignIn = async () => {
  const result = await signIn({ email, password });

  if (!result.success) {
    setError(result.error);
    return;
  }

  // Remember email if requested
  if (rememberMe) {
    localStorage.setItem('remembered-email', email);
  }

  router.push(redirectTo || '/dashboard');
};
```

### Magic Link Sign-In

```tsx
import { signInWithMagicLink } from '@/lib/auth/flows';

const handleMagicLink = async () => {
  const result = await signInWithMagicLink({ email });

  if (result.success) {
    setShowCheckEmail(true);
  } else if (result.error?.includes('No account')) {
    // User doesn't exist, redirect to sign-up
    router.push('/signup?email=' + email);
  }
};
```

### OAuth Sign-In

```tsx
import { signInWithOAuth } from '@/lib/auth/flows';

const handleGoogleSignIn = async () => {
  await signInWithOAuth('google', '/dashboard');
  // User is redirected to Google, then back to /auth/callback
};

const handleAppleSignIn = async () => {
  await signInWithOAuth('apple', '/dashboard');
};
```

### Session Management

#### Automatic Session Refresh

Sessions are automatically refreshed by the middleware on every request:

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // This refreshes the session if needed
  await supabase.auth.getUser();

  return response;
}
```

#### Remember Me

```tsx
// Sign in with remember me
const { signInWithPassword } = useAuth();

await signInWithPassword(email, password);

// Store preference
if (rememberMe) {
  localStorage.setItem('remembered-email', email);
}
```

#### Manual Session Refresh

```tsx
import { refreshSession } from '@/lib/auth/flows';

const handleRefresh = async () => {
  const result = await refreshSession();
  if (!result.success) {
    // Session expired, redirect to login
    router.push('/login');
  }
};
```

### Password Reset

```
User                    Client                   Supabase
  |                        |                         |
  |-- Request reset ------>|                         |
  |                        |-- resetPasswordForEmail()
  |                        |                         |-- Send reset email
  |<-- "Check email" ------|                         |
  |                        |                         |
  |-- Click reset link --->|                         |
  |                        |-- /auth/reset-password  |
  |                        |<-- Session (from link)  |
  |-- Enter new password ->|                         |
  |                        |-- updateUser() -------->|
  |                        |<-- Success              |
  |<-- "Password updated" -|                         |
```

```tsx
import { requestPasswordReset, updatePassword } from '@/lib/auth/flows';

// Request reset
const handleForgotPassword = async () => {
  const result = await requestPasswordReset(email);
  if (result.success) {
    setShowCheckEmail(true);
  }
};

// Update password (on reset page)
const handleUpdatePassword = async () => {
  const result = await updatePassword(newPassword);
  if (result.success) {
    router.push('/dashboard');
  }
};
```

## 3. Sign-Out Flow

### Standard Sign-Out

```
User                    Client                   Supabase
  |                        |                         |
  |-- Click Sign Out ----->|                         |
  |                        |-- auth.signOut() ------>|
  |                        |                         |-- Invalidate session
  |                        |<-- Success              |
  |                        |-- Clear localStorage -->|
  |<-- Redirect homepage --|                         |
```

### Implementation

```tsx
import { signOut } from '@/lib/auth/flows';

const handleSignOut = async () => {
  const result = await signOut();

  if (result.success) {
    router.push('/');
  }
};
```

### Sign Out from All Devices

```tsx
import { signOutAll } from '@/lib/auth/flows';

const handleSignOutAll = async () => {
  const result = await signOutAll();

  if (result.success) {
    // User is signed out from all devices
    router.push('/');
  }
};
```

### Cleanup on Sign-Out

The `signOut` function automatically:

1. Clears Supabase session
2. Removes application localStorage:
   - `regen-user-preferences`
   - `regen-last-provider`
3. Clears sessionStorage

```typescript
// From lib/auth/flows.ts
export async function signOut(): Promise<AuthResult> {
  const supabase = createClient();
  await supabase.auth.signOut();

  // Clear application state
  if (typeof window !== 'undefined') {
    localStorage.removeItem('regen-user-preferences');
    localStorage.removeItem('regen-last-provider');
    sessionStorage.clear();
  }

  return { success: true };
}
```

## 4. Auth Pages

### Page Structure

```
app/
├── (auth)/
│   ├── layout.tsx          # Auth pages layout
│   ├── login/
│   │   └── page.tsx        # Sign-in page
│   ├── signup/
│   │   └── page.tsx        # Sign-up page
│   ├── signout/
│   │   └── page.tsx        # Sign-out page
│   └── reset-password/
│       └── page.tsx        # Password reset page
└── auth/
    └── callback/
        └── route.ts        # OAuth/magic link callback
```

### Login Page Features

- Email/password sign-in
- Magic link option
- OAuth buttons (Google, Apple)
- Remember me checkbox
- Forgot password link
- Redirect after login

### Sign-Up Page Features

- Email/password registration
- Magic link option
- OAuth buttons (Google, Apple)
- Password strength indicator
- Display name (optional)
- Terms of service link

### Sign-Out Page Features

- Automatic sign-out on load
- Success confirmation
- Sign out from all devices option
- Auto-redirect to homepage

## 5. Validation

### Password Requirements

```typescript
function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return { valid: errors.length === 0, errors };
}
```

### Email Validation

```typescript
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

## 6. Error Handling

### User-Friendly Error Messages

```typescript
const errorMap: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password. Please try again.',
  'Email not confirmed': 'Please verify your email address before signing in.',
  'User already registered': 'An account with this email already exists.',
  'Email rate limit exceeded': 'Too many requests. Please wait and try again.',
  'User not found': 'No account found with this email address.',
};
```

### Common Error Scenarios

| Error | User Message | Action |
|-------|--------------|--------|
| Invalid credentials | "Invalid email or password" | Show error, allow retry |
| Email not confirmed | "Please verify your email" | Show resend option |
| User exists | "Account already exists" | Link to sign-in |
| Rate limited | "Too many requests" | Show countdown |
| Session expired | "Session expired" | Redirect to login |

## 7. Security Best Practices

### Password Security

- Minimum 8 characters
- Require uppercase, lowercase, number
- Never store plain passwords
- Rate limit failed attempts

### Session Security

- HttpOnly cookies for tokens
- Automatic session refresh
- Secure flag in production
- SameSite=Lax for CSRF protection

### OAuth Security

- State parameter for CSRF protection
- PKCE for public clients
- Validate redirect URLs
- Scope limitations

## Related Documentation

- [Supabase Authentication](./SUPABASE_AUTH.md)
- [Next.js Integration](./NEXTJS_AUTH_INTEGRATION.md)
- [Row Level Security](./ROW_LEVEL_SECURITY.md)
