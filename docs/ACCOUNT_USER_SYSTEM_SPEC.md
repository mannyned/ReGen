# ReGenr Account & User System Specification

> A modern, Gen-Z, mobile-first account system for ReGenr SaaS platform.

---

## Table of Contents

1. [User Sign-Up](#1-user-sign-up)
2. [Account Tiers & Capabilities](#2-account-tiers--capabilities)
3. [Roles & Permissions](#3-roles--permissions-pro-only)
4. [Account Settings](#4-account-settings)
5. [Team Access](#5-team-access-pro-only)
6. [UX Principles & Messaging](#6-ux-principles--messaging)

---

## 1. User Sign-Up

### Philosophy
> Get users in fast. Ask for the minimum. Make it feel effortless.

### Required Fields

| Field | Rules | UX Notes |
|-------|-------|----------|
| **Email** | Valid email format | Primary identifier & login |
| **Password** | Min 8 chars, 1 number, 1 special char | Show strength indicator |
| **Display Name** | 2-30 characters | What others see (can be changed later) |

### Optional Fields (collected post-signup or in settings)

| Field | Notes |
|-------|-------|
| **Username** | Unique handle (@username), alphanumeric + underscores only |
| **Profile Photo** | Upload or pick from avatars, max 5MB |
| **Bio** | Short description, 160 char limit |

### Social Sign-In Options

| Provider | Priority | Notes |
|----------|----------|-------|
| **Google** | Primary | One-tap on mobile, most common |
| **Apple** | Primary | Required for iOS, privacy-focused users |

**Social sign-in flow:**
```
[Continue with Google/Apple]
        ↓
  OAuth redirect
        ↓
  Account created (email auto-verified)
        ↓
  Prompt for Display Name (if not provided by OAuth)
        ↓
  Welcome screen → Dashboard
```

### Email Verification

- **Trigger:** Sent immediately after email/password sign-up
- **Method:** 6-digit code (not link) — mobile-friendly
- **Expiry:** 10 minutes
- **Resend:** Available after 60 seconds, max 3 resends per hour
- **Skip social:** Users signing in via Google/Apple are auto-verified

### Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | bcrypt with salt |
| Rate limiting | 5 failed attempts → 15 min cooldown |
| Session tokens | JWT, 7-day expiry (refresh tokens for remember me) |
| HTTPS only | All endpoints |

### Sign-Up Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIGN UP SCREEN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │     🍎  Continue with Apple            │                  │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │     🔵  Continue with Google           │                  │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│                    ─── or ───                                   │
│                                                                 │
│    Email                                                        │
│    ┌─────────────────────────────────────────┐                 │
│    │                                         │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│    Password                                                     │
│    ┌─────────────────────────────────────────┐                 │
│    │ ••••••••                          👁    │                 │
│    └─────────────────────────────────────────┘                 │
│    ░░░░░░░░░░ Strong                                           │
│                                                                 │
│    Display Name                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │                                         │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │           Create Account                │                  │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│    Already have an account? Log in                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    VERIFY YOUR EMAIL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              We sent a code to you@email.com                    │
│                                                                 │
│         ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                   │
│         │ 4 │ │ 2 │ │ 0 │ │ _ │ │ _ │ │ _ │                   │
│         └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                   │
│                                                                 │
│              Didn't get it? Resend code                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     YOU'RE IN! 🎉                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              Welcome to ReGenr, [Name]                          │
│                                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │           Let's go →                    │                  │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Account Tiers & Capabilities

### Tier Overview

| Tier | Price | Seats | Target User |
|------|-------|-------|-------------|
| **Free** | $0 | 1 | Trying it out, casual users |
| **Creator** | $12/mo | 1 | Solo creators, freelancers |
| **Pro** | $29/mo | 3 | Teams, agencies, power users |

### Feature Comparison Matrix

| Feature | Free | Creator | Pro |
|---------|:----:|:-------:|:---:|
| **Core Features** ||||
| Basic content generation | ✓ | ✓ | ✓ |
| Monthly generations | 25 | 500 | Unlimited |
| Export quality | 720p | 1080p | 4K |
| Watermark-free exports | ✗ | ✓ | ✓ |
| **Advanced Tools** ||||
| AI style presets | 5 basic | 25+ | All (50+) |
| Custom brand kit | ✗ | ✓ | ✓ |
| Scheduled posting | ✗ | ✓ | ✓ |
| Analytics dashboard | Basic | Standard | Advanced |
| **Collaboration** ||||
| Team seats | 1 | 1 | 3 |
| Shared workspaces | ✗ | ✗ | ✓ |
| Team comments | ✗ | ✗ | ✓ |
| Shared asset library | ✗ | ✗ | ✓ |
| **Support** ||||
| Community support | ✓ | ✓ | ✓ |
| Email support | ✗ | ✓ | ✓ |
| Priority support | ✗ | ✗ | ✓ |
| **Integrations** ||||
| Instagram direct publish | ✗ | ✓ | ✓ |
| TikTok direct publish | ✗ | ✓ | ✓ |
| API access | ✗ | ✗ | ✓ |

### Tier-Specific Behaviors

#### Free Users
- See "Upgrade" prompts when hitting limits
- Generations reset monthly (1st of each month)
- Can upgrade to Creator or Pro anytime
- Data retained indefinitely (with 90-day inactive account warning)

#### Creator Users
- Individual billing only
- Annual option: $99/year (save 31%)
- Downgrade to Free anytime (features limited immediately, data retained)
- Upgrade to Pro anytime (prorated billing)

#### Pro Users
- Can add up to 2 team members (3 total seats)
- Owner manages all billing
- Annual option: $249/year (save 28%)
- Team data shared across workspace

---

## 3. Roles & Permissions (Pro Only)

### Role Definitions

| Role | Description | Who Gets It |
|------|-------------|-------------|
| **Owner** | Full control, created the account | Account creator (1 per account) |
| **Admin** | Almost full control, can't delete account | Promoted by Owner |
| **Member** | Standard access, no admin capabilities | Invited team members |

### Permissions Matrix

| Permission | Owner | Admin | Member |
|------------|:-----:|:-----:|:------:|
| **Content & Creation** ||||
| Create/edit own content | ✓ | ✓ | ✓ |
| View team content | ✓ | ✓ | ✓ |
| Edit team content | ✓ | ✓ | ✓ |
| Delete own content | ✓ | ✓ | ✓ |
| Delete any content | ✓ | ✓ | ✗ |
| **Workspace** ||||
| Access shared workspace | ✓ | ✓ | ✓ |
| Manage asset library | ✓ | ✓ | ✗ |
| Create folders/organize | ✓ | ✓ | ✓ |
| **Team Management** ||||
| Invite team members | ✓ | ✓ | ✗ |
| Remove team members | ✓ | ✓ | ✗ |
| Change member roles | ✓ | ✓* | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ |
| **Billing & Account** ||||
| View subscription info | ✓ | ✓ | ✗ |
| Update payment method | ✓ | ✗ | ✗ |
| Change plan | ✓ | ✗ | ✗ |
| Cancel subscription | ✓ | ✗ | ✗ |
| Delete account | ✓ | ✗ | ✗ |
| **Settings** ||||
| Update account name/branding | ✓ | ✓ | ✗ |
| Manage integrations | ✓ | ✓ | ✗ |
| View activity log | ✓ | ✓ | ✗ |

*Admin can change Member roles but cannot promote to Admin or demote other Admins.

### Role Assignment Flow

```
Owner creates Pro account
        ↓
Owner invites user@email.com
        ↓
    ┌─────────────────────────┐
    │  Assign role:           │
    │  ○ Admin                │
    │  ● Member (default)     │
    └─────────────────────────┘
        ↓
Invite sent → User accepts
        ↓
User joins with assigned role
```

### Ownership Transfer

Only the Owner can transfer ownership:

```
Settings → Team → Transfer Ownership
        ↓
Select new Owner (must be existing Admin or Member)
        ↓
Confirm with password
        ↓
New Owner notified
        ↓
Previous Owner becomes Admin
```

---

## 4. Account Settings

### Settings Architecture

```
Account Settings
├── Profile
├── Security
├── Notifications
├── Subscription & Billing
├── Team (Pro only)
└── Danger Zone
```

### 4.1 Profile Settings

**Available to:** All users

| Setting | Description | Validation |
|---------|-------------|------------|
| Display Name | Public name | 2-30 chars, required |
| Username | Unique handle | 3-20 chars, alphanumeric + underscore |
| Email | Login & notifications | Valid email, requires re-verification if changed |
| Profile Photo | Avatar image | JPG/PNG/GIF, max 5MB, crops to square |
| Bio | Short description | Max 160 chars |

**Email Change Flow:**
```
User enters new email
        ↓
Verification code sent to NEW email
        ↓
User enters code
        ↓
Email updated
        ↓
Confirmation sent to OLD email (security notice)
```

### 4.2 Security Settings

**Available to:** All users

| Setting | Description | Notes |
|---------|-------------|-------|
| Change Password | Update password | Requires current password |
| Sign Out Everywhere | Invalidate all sessions | Except current session |
| Two-Factor Auth | Enable 2FA | TOTP (authenticator app) |
| Connected Accounts | Google/Apple links | Can connect/disconnect |
| Active Sessions | View logged-in devices | Can revoke individually |

**Password Change Flow:**
```
Enter current password
        ↓
Enter new password
        ↓
Confirm new password
        ↓
    [Update Password]
        ↓
Success → All other sessions invalidated
```

### 4.3 Notification Preferences

**Available to:** All users

| Category | Options | Default |
|----------|---------|---------|
| **Product Updates** | Email, Push, None | Email |
| **Generation Complete** | Push, None | Push |
| **Weekly Digest** | Email, None | Email |
| **Team Activity** (Pro) | Email, Push, Both, None | Push |
| **Marketing** | Email, None | None |

### 4.4 Subscription & Billing

**Available to:** Creator & Pro (Owner only for Pro)

| Setting | Who Can Access | Description |
|---------|----------------|-------------|
| Current Plan | Creator, Pro Owner | View plan details |
| Usage Stats | Creator, Pro Owner | Generations used, storage |
| Payment Method | Creator, Pro Owner | Add/update card |
| Billing History | Creator, Pro Owner | Past invoices |
| Change Plan | Creator, Pro Owner | Upgrade/downgrade |
| Cancel Subscription | Creator, Pro Owner | Cancel with confirmation |

**Billing UI Components:**
```
┌─────────────────────────────────────────────────────────────────┐
│  SUBSCRIPTION                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pro Plan                                    $29/month          │
│  Renews Dec 15, 2025                                           │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │   Change Plan    │  │     Cancel       │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  USAGE THIS PERIOD                                              │
│                                                                 │
│  Generations     ████████████░░░░░░░░  347 / unlimited         │
│  Storage         ██████░░░░░░░░░░░░░░  2.3 GB / 10 GB          │
│  Team Seats      █████████████████░░░  2 / 3 used              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  PAYMENT METHOD                                                 │
│                                                                 │
│  💳 Visa ending in 4242                    [Update]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Team Management (Pro Only)

**Available to:** Owner & Admin

| Setting | Owner | Admin | Member |
|---------|:-----:|:-----:|:------:|
| View team members | ✓ | ✓ | ✓ (list only) |
| Invite members | ✓ | ✓ | ✗ |
| Remove members | ✓ | ✓ | ✗ |
| Change roles | ✓ | ✓* | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ |

### 4.6 Danger Zone

**Available to:** All users (some actions Owner-only)

| Action | Who Can Do It | Confirmation |
|--------|---------------|--------------|
| Leave Team | Member, Admin | Single confirm |
| Delete Account | Individual users, Pro Owner | Password + "DELETE" typed |
| Remove All Data | All users | Password + checkbox |

---

## 5. Team Access (Pro Only)

### Seat System

- **Total seats:** 3 per Pro account
- **Seat 1:** Always the Owner (cannot be removed)
- **Seats 2-3:** Assignable to invited members

### Invitation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  INVITE TEAM MEMBER                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Email address                                                  │
│  ┌─────────────────────────────────────────┐                   │
│  │ teammate@email.com                      │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  Role                                                           │
│  ┌─────────────────────────────────────────┐                   │
│  │ Member                              ▼   │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │         Send Invite                     │                    │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Invite States:**

| State | Duration | Actions |
|-------|----------|---------|
| Pending | 7 days | Resend, Cancel |
| Accepted | — | User joins team |
| Declined | — | Seat freed, can re-invite |
| Expired | After 7 days | Auto-cancelled, seat freed |

**Invitation Email:**
```
Subject: [Name] invited you to join their ReGenr team

Hey!

[Inviter Name] wants you on their ReGenr team.

    [Accept Invite]

This invite expires in 7 days.
Not interested? Just ignore this email.

— The ReGenr Team
```

### Seat Limit Behavior

**When all seats are used:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  All seats taken                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your Pro plan includes 3 seats and they're all in use.        │
│                                                                 │
│  To add someone new:                                            │
│  • Remove a current team member, or                            │
│  • Contact us about Enterprise pricing                         │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │   Manage Team    │  │  Contact Sales   │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Removing Team Members

**Flow:**
```
Settings → Team → [Member Name] → Remove
        ↓
    ┌─────────────────────────────────────────┐
    │  Remove [Name] from team?               │
    │                                         │
    │  They'll lose access to the shared      │
    │  workspace immediately. Their personal  │
    │  content will be kept in their account. │
    │                                         │
    │  [Cancel]  [Remove Member]              │
    └─────────────────────────────────────────┘
        ↓
Member removed → Seat freed → Notification sent to member
```

**What happens to removed member:**
- Immediately loses access to team workspace
- Keeps their personal ReGenr account (as Free user)
- Any content they created stays in team workspace
- Receives email notification

### Downgrade & Cancellation Scenarios

#### Scenario: Pro → Creator Downgrade

```
Owner initiates downgrade
        ↓
    ┌─────────────────────────────────────────┐
    │  ⚠️  You have 2 team members            │
    │                                         │
    │  Creator plans don't include team       │
    │  seats. Your team members will lose     │
    │  access when you downgrade.             │
    │                                         │
    │  [Cancel]  [Continue to Downgrade]      │
    └─────────────────────────────────────────┘
        ↓
Downgrade confirmed at end of billing period
        ↓
Team members notified (7 days before)
        ↓
On downgrade date:
  • Team members removed automatically
  • Team workspace content transferred to Owner
  • Members revert to Free accounts
```

#### Scenario: Pro → Free Downgrade

Same as Pro → Creator, but:
- Owner also loses Creator features
- All team content moves to Owner's individual account

#### Scenario: Pro Subscription Cancelled

```
Owner cancels subscription
        ↓
    ┌─────────────────────────────────────────┐
    │  Cancel your Pro subscription?          │
    │                                         │
    │  Your plan stays active until           │
    │  Dec 15, 2025. After that:              │
    │                                         │
    │  • Team members lose access             │
    │  • You'll switch to the Free plan       │
    │  • Your content stays safe              │
    │                                         │
    │  [Keep Pro]  [Cancel Subscription]      │
    └─────────────────────────────────────────┘
        ↓
Subscription ends at period close
        ↓
Team members notified
        ↓
Same behavior as downgrade to Free
```

#### Scenario: Owner Leaves

```
Owner cannot leave their own team.
Owner must transfer ownership first, then can leave.
        ↓
Transfer ownership → Become Admin → Leave team
```

---

## 6. UX Principles & Messaging

### Voice & Tone Guidelines

| Do | Don't |
|----|-------|
| "You're in!" | "Account successfully created" |
| "Something went wrong" | "Error 500: Internal server exception" |
| "Try again" | "Please retry your request" |
| "All seats taken" | "Maximum seat allocation reached" |
| "Got it" | "Acknowledged" |
| "Let's go" | "Proceed to dashboard" |

### Mobile-First Principles

1. **Thumb-friendly tap targets** — Min 44px height for buttons
2. **Single-column layouts** — No horizontal scrolling
3. **Bottom-sheet modals** — Not center popups on mobile
4. **Swipe actions** — For list items (archive, delete)
5. **Pull-to-refresh** — On all list views

### Loading States

```
Button States:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Save      │ →  │   ○ ○ ○      │ →  │   Saved ✓    │
└──────────────┘    └──────────────┘    └──────────────┘
    Default           Loading            Success (2s)
```

### Success Messages

| Action | Message | Duration |
|--------|---------|----------|
| Account created | "You're in! 🎉" | Sticky until dismissed |
| Settings saved | "Saved" | 2 seconds |
| Invite sent | "Invite sent to [email]" | 3 seconds |
| Member removed | "[Name] has been removed" | 3 seconds |
| Plan upgraded | "Welcome to [Plan]! 🚀" | Sticky |
| Password changed | "Password updated. You're secure." | 3 seconds |

### Error Messages

| Error | Message | Action |
|-------|---------|--------|
| Invalid email | "That doesn't look like an email" | Inline |
| Weak password | "Add a number or special character" | Inline |
| Email taken | "This email's already registered. Log in instead?" | Inline + link |
| Wrong password | "That password isn't right" | Inline |
| Rate limited | "Too many tries. Take a breather and try again in 15 min." | Toast |
| Network error | "Can't connect. Check your internet?" | Toast + retry |
| Generic error | "Something went wrong. Try again?" | Toast + retry |

### Limit-Reached Messages

| Limit | Message | CTA |
|-------|---------|-----|
| Free generations | "You've used all 25 generations this month. Upgrade for more!" | [See Plans] |
| Creator upgrade prompt | "Want team features? Pro has you covered." | [Upgrade to Pro] |
| All seats used | "Your team's full! Remove someone or chat with us about more seats." | [Manage Team] |
| Storage full | "Running low on space. Time to clean up or upgrade?" | [Manage Storage] |

### Empty States

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         👥                                      │
│                                                                 │
│                   No team members yet                           │
│                                                                 │
│         Invite your crew and create together.                   │
│                                                                 │
│              ┌──────────────────────┐                          │
│              │    Invite Someone    │                           │
│              └──────────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Confirmation Dialogs

**Standard destructive action:**
```
┌─────────────────────────────────────────┐
│  Remove [Name]?                         │
│                                         │
│  They'll lose access to your team       │
│  workspace right away.                  │
│                                         │
│  [Cancel]        [Remove]               │
│                  (red)                  │
└─────────────────────────────────────────┘
```

**High-stakes action (delete account):**
```
┌─────────────────────────────────────────┐
│  Delete your account?                   │
│                                         │
│  This can't be undone. All your         │
│  content will be permanently deleted.   │
│                                         │
│  Type DELETE to confirm:                │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Cancel]        [Delete Forever]       │
│                  (red, disabled until   │
│                   DELETE typed)         │
└─────────────────────────────────────────┘
```

---

## Data Model Overview

### User Entity
```
User {
  id: UUID
  email: String (unique)
  password_hash: String
  display_name: String
  username: String? (unique)
  avatar_url: String?
  bio: String?
  email_verified: Boolean
  created_at: DateTime
  updated_at: DateTime

  // Auth
  google_id: String?
  apple_id: String?
  two_factor_enabled: Boolean

  // Subscription (for individual plans)
  subscription_tier: Enum [FREE, CREATOR]
  subscription_status: Enum [ACTIVE, CANCELLED, PAST_DUE]
  subscription_ends_at: DateTime?
}
```

### Team Entity (Pro)
```
Team {
  id: UUID
  name: String
  owner_id: UUID (FK → User)
  subscription_status: Enum [ACTIVE, CANCELLED, PAST_DUE]
  subscription_ends_at: DateTime?
  created_at: DateTime
}
```

### Team Membership
```
TeamMember {
  id: UUID
  team_id: UUID (FK → Team)
  user_id: UUID (FK → User)
  role: Enum [OWNER, ADMIN, MEMBER]
  invited_by: UUID (FK → User)
  joined_at: DateTime
}
```

### Team Invitation
```
TeamInvite {
  id: UUID
  team_id: UUID (FK → Team)
  email: String
  role: Enum [ADMIN, MEMBER]
  invited_by: UUID (FK → User)
  token: String (unique)
  expires_at: DateTime
  status: Enum [PENDING, ACCEPTED, DECLINED, EXPIRED]
  created_at: DateTime
}
```

---

## Implementation Checklist

### Phase 1: Core Auth
- [ ] Email/password sign-up
- [ ] Email verification (6-digit code)
- [ ] Login flow
- [ ] Password reset
- [ ] Session management

### Phase 2: Social Auth
- [ ] Google OAuth integration
- [ ] Apple Sign-In integration
- [ ] Account linking

### Phase 3: Profile & Settings
- [ ] Profile settings UI
- [ ] Security settings
- [ ] Notification preferences
- [ ] Email change flow

### Phase 4: Subscriptions
- [ ] Stripe integration
- [ ] Plan selection UI
- [ ] Upgrade/downgrade flows
- [ ] Billing management

### Phase 5: Teams (Pro)
- [ ] Team creation on Pro signup
- [ ] Invitation system
- [ ] Role management
- [ ] Team settings
- [ ] Downgrade handling

---

*Last updated: December 2024*
*Version: 1.0*
