# Stripe Payment Integration

ReGenr uses Stripe for subscription-based tier upgrades.

## Overview

| Tier | Monthly | Yearly | Features |
|------|---------|--------|----------|
| FREE | $0 | $0 | Basic features, 2 platforms |
| CREATOR | $9 | $90 | AI captions, 5 platforms |
| PRO | $29 | $290 | Team access, unlimited |

## Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Get API keys from [Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys)

### 2. Create Products and Prices

In [Stripe Dashboard > Products](https://dashboard.stripe.com/products):

**Creator Plan:**
- Product name: "Creator"
- Monthly price: $9.00/month (recurring)
- Yearly price: $90.00/year (recurring)

**Pro Plan:**
- Product name: "Pro"
- Monthly price: $29.00/month (recurring)
- Yearly price: $290.00/year (recurring)

### 3. Configure Environment

```bash
# .env.local

# API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Product IDs (from dashboard)
STRIPE_PRODUCT_CREATOR=prod_...
STRIPE_PRODUCT_PRO=prod_...

# Price IDs (from dashboard)
STRIPE_PRICE_CREATOR_MONTHLY=price_...
STRIPE_PRICE_CREATOR_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

### 4. Set Up Webhooks

1. Go to [Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook secret to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 5. Configure Customer Portal

1. Go to [Dashboard > Settings > Billing > Customer portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable features:
   - Update payment methods
   - Cancel subscriptions
   - View invoices

## API Endpoints

### POST /api/stripe/checkout

Create a checkout session for tier upgrade.

**Request:**
```json
{
  "tier": "CREATOR",
  "interval": "monthly"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### GET /api/stripe/checkout

Get pricing information.

**Response:**
```json
{
  "pricing": {
    "CREATOR": {
      "monthly": { "amount": 9, "currency": "USD" },
      "yearly": { "amount": 90, "currency": "USD", "savings": 18 }
    },
    "PRO": {
      "monthly": { "amount": 29, "currency": "USD" },
      "yearly": { "amount": 290, "currency": "USD", "savings": 58 }
    }
  }
}
```

### POST /api/stripe/portal

Create a customer portal session.

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### GET /api/stripe/portal

Get subscription status.

**Response:**
```json
{
  "hasSubscription": true,
  "tier": "CREATOR",
  "subscription": {
    "id": "sub_...",
    "status": "active",
    "currentPeriodEnd": "2024-02-15T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

### POST /api/stripe/webhook

Handles Stripe webhook events (called by Stripe).

## Frontend Integration

### Upgrade Button

```typescript
async function handleUpgrade(tier: 'CREATOR' | 'PRO') {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier, interval: 'monthly' }),
  });

  const { url } = await response.json();

  // Redirect to Stripe Checkout
  window.location.href = url;
}
```

### Manage Subscription Button

```typescript
async function handleManageSubscription() {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
  });

  const { url } = await response.json();

  // Redirect to Customer Portal
  window.location.href = url;
}
```

### Check Subscription Status

```typescript
async function getSubscriptionStatus() {
  const response = await fetch('/api/stripe/portal');
  const data = await response.json();

  if (data.subscription?.cancelAtPeriodEnd) {
    console.log('Subscription cancels on:', data.subscription.currentPeriodEnd);
  }

  return data;
}
```

## Webhook Flow

```
User clicks "Upgrade" → Create Checkout Session → Redirect to Stripe
                                                        ↓
                                              User completes payment
                                                        ↓
                                              Stripe fires webhook
                                                        ↓
                                    POST /api/stripe/webhook receives event
                                                        ↓
                                              Update user tier in DB
                                                        ↓
                                    User redirected to success page (already upgraded)
```

## Database Schema

Add these fields to the Profile model:

```prisma
model Profile {
  id                   String    @id @default(uuid()) @db.Uuid
  // ... existing fields

  // Stripe fields
  stripeCustomerId     String?   @unique @map("stripe_customer_id")
  stripeSubscriptionId String?   @unique @map("stripe_subscription_id")

  @@map("profiles")
}
```

## Testing

### Test Cards

| Number | Description |
|--------|-------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 3220 | 3D Secure required |

Use any future date for expiry and any 3 digits for CVC.

### Test Webhooks Locally

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login:
   ```bash
   stripe login
   ```

3. Forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret shown and add to `.env.local`

### Trigger Test Events

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

## Handling Edge Cases

### User Already Has Subscription

```typescript
// In createCheckoutSession
const existingSubscription = await getActiveSubscription(customer.id);
if (existingSubscription) {
  throw new Error('You already have an active subscription.');
}
```

### Subscription Downgrade

Use the customer portal or:

```typescript
// Cancel at period end (downgrade to FREE)
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});
```

### Payment Failed

The webhook handler logs failed payments:

```typescript
async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  logger.warn('Payment failed', { invoiceId: invoice.id });
  // Could send email notification
}
```

## Module Structure

```
lib/stripe/
├── index.ts      # Public exports
├── config.ts     # Configuration and price IDs
├── customers.ts  # Customer management
├── checkout.ts   # Checkout and portal sessions
└── webhooks.ts   # Webhook event handlers

app/api/stripe/
├── checkout/route.ts  # Create checkout session
├── portal/route.ts    # Customer portal
└── webhook/route.ts   # Webhook handler
```

## Security

1. **Webhook Verification**: All webhooks are verified using `stripe-signature` header
2. **Server-Only Keys**: Secret key only used on server
3. **Metadata Validation**: Profile ID stored in Stripe metadata for verification
4. **Idempotency**: Webhook events are processed idempotently

## Troubleshooting

### "STRIPE_SECRET_KEY is not configured"

Add the secret key to `.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_...
```

### Webhook Signature Verification Failed

1. Check `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret
2. Ensure raw body is used for verification (not parsed JSON)

### Subscription Not Updating

1. Check webhook endpoint is receiving events
2. Verify webhook secret is correct
3. Check logs for errors in webhook handler

### Customer Portal Not Working

1. Enable portal features in Stripe Dashboard
2. Ensure customer has a Stripe customer ID saved
