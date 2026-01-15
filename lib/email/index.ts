/**
 * Email Service
 *
 * Centralized email sending using Resend.
 *
 * @example
 * ```ts
 * import { sendEmail, EmailTemplates } from '@/lib/email';
 *
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   template: EmailTemplates.WELCOME,
 *   data: { name: 'John' },
 * });
 * ```
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';

// ============================================
// CONFIGURATION
// ============================================

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY is not configured. ' +
        'Get your API key from https://resend.com/api-keys'
      );
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

/**
 * Default sender email
 */
export const DEFAULT_FROM = process.env.EMAIL_FROM || 'ReGenr <noreply@regenr.app>';

/**
 * Email templates available
 */
export enum EmailTemplates {
  // Subscription events
  SUBSCRIPTION_WELCOME = 'subscription_welcome',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_REACTIVATED = 'subscription_reactivated',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_SUCCEEDED = 'payment_succeeded',

  // Account events
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',

  // Beta events
  BETA_INVITE = 'beta_invite',

  // Team events
  TEAM_INVITE = 'team_invite',

  // Scheduled post events
  SCHEDULED_POST_PUBLISHED = 'scheduled_post_published',
  SCHEDULED_POST_FAILED = 'scheduled_post_failed',
}

// ============================================
// EMAIL SENDING
// ============================================

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: EmailTemplates;
  data?: Record<string, unknown>;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, template, data, from = DEFAULT_FROM, replyTo } = options;

  // Skip if not configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured - skipping email', {
      to,
      subject,
      template,
    });
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  console.log('[Email] Preparing to send email', {
    to,
    subject,
    template,
    from,
    hasResendKey: !!process.env.RESEND_API_KEY,
  });

  try {
    const resend = getResend();

    // Generate HTML from template if provided
    let emailHtml = html;
    let emailText = text;

    if (template && data) {
      const rendered = renderTemplate(template, data);
      emailHtml = rendered.html;
      emailText = rendered.text;
    }

    if (!emailHtml && !emailText) {
      throw new Error('Email must have either html or text content');
    }

    // Build email options, only including defined properties
    const emailOptions = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(emailHtml && { html: emailHtml }),
      ...(emailText && { text: emailText }),
      ...(replyTo && { replyTo }),
    };

    console.log('[Email] Calling Resend API...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resend.emails.send(emailOptions as any);
    console.log('[Email] Resend API response:', JSON.stringify(result));

    if (result.error) {
      console.error('[Email] Resend returned error:', result.error);
      logger.error('Failed to send email', {
        to,
        subject,
        error: result.error,
      });
      return { success: false, error: result.error.message };
    }

    console.log('[Email] Email sent successfully!', {
      to,
      subject,
      id: result.data?.id,
    });
    logger.info('Email sent successfully', {
      to,
      subject,
      template,
      id: result.data?.id,
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Email sending failed', {
      to,
      subject,
      error: message,
    });
    return { success: false, error: message };
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(
  recipients: Array<{ email: string; data?: Record<string, unknown> }>,
  options: Omit<SendEmailOptions, 'to' | 'data'>
): Promise<SendEmailResult[]> {
  const results = await Promise.all(
    recipients.map((recipient) =>
      sendEmail({
        ...options,
        to: recipient.email,
        data: recipient.data,
      })
    )
  );

  return results;
}

// ============================================
// TEMPLATE RENDERING
// ============================================

interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Render an email template with data
 */
function renderTemplate(
  template: EmailTemplates,
  data: Record<string, unknown>
): RenderedEmail {
  const templates = getTemplates();
  const templateFn = templates[template];

  if (!templateFn) {
    throw new Error(`Unknown email template: ${template}`);
  }

  return templateFn(data);
}

/**
 * Get all template render functions
 */
function getTemplates(): Record<EmailTemplates, (data: Record<string, unknown>) => RenderedEmail> {
  return {
    [EmailTemplates.SUBSCRIPTION_WELCOME]: renderSubscriptionWelcome,
    [EmailTemplates.SUBSCRIPTION_RENEWED]: renderSubscriptionRenewed,
    [EmailTemplates.SUBSCRIPTION_CANCELLED]: renderSubscriptionCancelled,
    [EmailTemplates.SUBSCRIPTION_REACTIVATED]: renderSubscriptionReactivated,
    [EmailTemplates.SUBSCRIPTION_EXPIRING]: renderSubscriptionExpiring,
    [EmailTemplates.PAYMENT_FAILED]: renderPaymentFailed,
    [EmailTemplates.PAYMENT_SUCCEEDED]: renderPaymentSucceeded,
    [EmailTemplates.WELCOME]: renderWelcome,
    [EmailTemplates.PASSWORD_RESET]: renderPasswordReset,
    [EmailTemplates.EMAIL_VERIFICATION]: renderEmailVerification,
    [EmailTemplates.BETA_INVITE]: renderBetaInvite,
    [EmailTemplates.TEAM_INVITE]: renderTeamInvite,
    [EmailTemplates.SCHEDULED_POST_PUBLISHED]: renderScheduledPostPublished,
    [EmailTemplates.SCHEDULED_POST_FAILED]: renderScheduledPostFailed,
  };
}

// ============================================
// BASE TEMPLATE
// ============================================

function baseTemplate(content: string, previewText: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>ReGenr</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { padding: 0; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/logo.png" alt="ReGenr" width="48" height="48" style="display: block;">
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                &copy; ${new Date().getFullYear()} ReGenr. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/settings/notifications" style="color: #9ca3af;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bgColor = variant === 'primary' ? '#10b981' : '#f3f4f6';
  const textColor = variant === 'primary' ? '#ffffff' : '#374151';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="background-color: ${bgColor}; border-radius: 12px;">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: ${textColor}; text-decoration: none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// ============================================
// SUBSCRIPTION TEMPLATES
// ============================================

function renderSubscriptionWelcome(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const tier = (data.tier as string) || 'Creator';
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/dashboard`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Welcome to ${tier}! 🎉
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, thanks for upgrading to the ${tier} plan! You now have access to all the premium features.
    </p>
    <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #111827;">
      What's next?
    </h2>
    <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4b5563;">
      <li>Connect your social media accounts</li>
      <li>Upload your first video</li>
      <li>Generate AI-powered captions</li>
      <li>Schedule posts across all platforms</li>
    </ul>
    ${button('Go to Dashboard', dashboardUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Questions? Reply to this email or contact us at support@regenr.app
    </p>
  `, `Welcome to ${tier}! Your premium features are now active.`);

  const text = `
Welcome to ${tier}!

Hey ${name}, thanks for upgrading to the ${tier} plan! You now have access to all the premium features.

What's next?
- Connect your social media accounts
- Upload your first video
- Generate AI-powered captions
- Schedule posts across all platforms

Go to Dashboard: ${dashboardUrl}

Questions? Reply to this email or contact us at support@regenr.app
`;

  return { html, text };
}

function renderSubscriptionRenewed(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const tier = (data.tier as string) || 'Creator';
  const amount = (data.amount as string) || '$19.00';
  const nextBillingDate = (data.nextBillingDate as string) || 'next month';
  const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/settings/billing`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Payment Successful
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, your ${tier} subscription has been renewed successfully.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 14px; color: #6b7280;">Amount paid</td>
              <td align="right" style="font-size: 16px; font-weight: 600; color: #111827;">${amount}</td>
            </tr>
            <tr>
              <td style="font-size: 14px; color: #6b7280; padding-top: 12px;">Plan</td>
              <td align="right" style="font-size: 16px; font-weight: 600; color: #111827;">${tier}</td>
            </tr>
            <tr>
              <td style="font-size: 14px; color: #6b7280; padding-top: 12px;">Next billing date</td>
              <td align="right" style="font-size: 16px; font-weight: 600; color: #111827;">${nextBillingDate}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${button('View Billing', billingUrl, 'secondary')}
  `, `Payment successful - Your ${tier} subscription has been renewed.`);

  const text = `
Payment Successful

Hey ${name}, your ${tier} subscription has been renewed successfully.

Amount paid: ${amount}
Plan: ${tier}
Next billing date: ${nextBillingDate}

View Billing: ${billingUrl}
`;

  return { html, text };
}

function renderSubscriptionCancelled(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const tier = (data.tier as string) || 'Creator';
  const endDate = (data.endDate as string) || 'end of billing period';
  const reactivateUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/settings/billing`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Subscription Cancelled
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, your ${tier} subscription has been cancelled. You'll continue to have access until <strong>${endDate}</strong>.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime before the end date.
    </p>
    ${button('Reactivate Subscription', reactivateUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Mind sharing why you cancelled? Reply to this email - we'd love to hear your feedback.
    </p>
  `, `Your ${tier} subscription has been cancelled.`);

  const text = `
Subscription Cancelled

Hey ${name}, your ${tier} subscription has been cancelled. You'll continue to have access until ${endDate}.

We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime before the end date.

Reactivate Subscription: ${reactivateUrl}

Mind sharing why you cancelled? Reply to this email - we'd love to hear your feedback.
`;

  return { html, text };
}

function renderSubscriptionReactivated(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const tier = (data.tier as string) || 'Creator';
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/dashboard`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Welcome Back! 🎉
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, great news! Your ${tier} subscription has been reactivated. All your premium features are back!
    </p>
    ${button('Go to Dashboard', dashboardUrl)}
  `, `Your ${tier} subscription has been reactivated!`);

  const text = `
Welcome Back!

Hey ${name}, great news! Your ${tier} subscription has been reactivated. All your premium features are back!

Go to Dashboard: ${dashboardUrl}
`;

  return { html, text };
}

function renderSubscriptionExpiring(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const tier = (data.tier as string) || 'Creator';
  const daysLeft = (data.daysLeft as number) || 3;
  const endDate = (data.endDate as string) || 'soon';
  const reactivateUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/settings/billing`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Your Subscription Expires ${daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} Days`}
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, just a reminder that your ${tier} subscription will end on <strong>${endDate}</strong>.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      After that, you'll be switched to our Free plan and lose access to premium features like AI captions, advanced scheduling, and more.
    </p>
    ${button('Reactivate Now', reactivateUrl)}
  `, `Your ${tier} subscription expires ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}.`);

  const text = `
Your Subscription Expires ${daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} Days`}

Hey ${name}, just a reminder that your ${tier} subscription will end on ${endDate}.

After that, you'll be switched to our Free plan and lose access to premium features like AI captions, advanced scheduling, and more.

Reactivate Now: ${reactivateUrl}
`;

  return { html, text };
}

function renderPaymentFailed(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const amount = (data.amount as string) || '$19.00';
  const updatePaymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/settings/billing`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #dc2626;">
      Payment Failed
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, we couldn't process your payment of <strong>${amount}</strong>.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Please update your payment method to continue using your premium features. We'll try again automatically in a few days.
    </p>
    ${button('Update Payment Method', updatePaymentUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      If you're having trouble, contact us at support@regenr.app
    </p>
  `, `Action required: Payment failed for your ReGenr subscription.`);

  const text = `
Payment Failed

Hey ${name}, we couldn't process your payment of ${amount}.

Please update your payment method to continue using your premium features. We'll try again automatically in a few days.

Update Payment Method: ${updatePaymentUrl}

If you're having trouble, contact us at support@regenr.app
`;

  return { html, text };
}

function renderPaymentSucceeded(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const amount = (data.amount as string) || '$19.00';
  const invoiceUrl = (data.invoiceUrl as string) || '';

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #10b981;">
      Payment Received
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, we've received your payment of <strong>${amount}</strong>. Thank you!
    </p>
    ${invoiceUrl ? button('View Invoice', invoiceUrl, 'secondary') : ''}
  `, `Payment received - ${amount}`);

  const text = `
Payment Received

Hey ${name}, we've received your payment of ${amount}. Thank you!

${invoiceUrl ? `View Invoice: ${invoiceUrl}` : ''}
`;

  return { html, text };
}

// ============================================
// ACCOUNT TEMPLATES (PLACEHOLDERS)
// ============================================

function renderWelcome(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/dashboard`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Welcome to ReGenr! 🎉
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, thanks for signing up! We're excited to have you on board.
    </p>
    ${button('Get Started', dashboardUrl)}
  `, 'Welcome to ReGenr!');

  const text = `Welcome to ReGenr!\n\nHey ${name}, thanks for signing up!\n\nGet Started: ${dashboardUrl}`;
  return { html, text };
}

function renderPasswordReset(data: Record<string, unknown>): RenderedEmail {
  const resetUrl = (data.resetUrl as string) || '#';

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Reset Your Password
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Click the button below to reset your password. This link will expire in 1 hour.
    </p>
    ${button('Reset Password', resetUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `, 'Reset your ReGenr password');

  const text = `Reset Your Password\n\nClick here to reset: ${resetUrl}\n\nThis link expires in 1 hour.`;
  return { html, text };
}

function renderEmailVerification(data: Record<string, unknown>): RenderedEmail {
  const verifyUrl = (data.verifyUrl as string) || '#';

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      Verify Your Email
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Please verify your email address by clicking the button below.
    </p>
    ${button('Verify Email', verifyUrl)}
  `, 'Verify your ReGenr email address');

  const text = `Verify Your Email\n\nClick here to verify: ${verifyUrl}`;
  return { html, text };
}

// ============================================
// BETA TEMPLATES
// ============================================

function renderBetaInvite(data: Record<string, unknown>): RenderedEmail {
  const durationDays = (data.durationDays as number) || 30;
  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/signup`;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      You're Invited to ReGenr Pro Beta! 🎉
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Great news! You've been invited to join the exclusive <strong>ReGenr Pro Beta</strong> program.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-radius: 12px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">
            What you get:
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #15803d;">
            <li><strong>${durationDays} days</strong> of free Pro access</li>
            <li>AI-powered caption generation</li>
            <li>Advanced scheduling & analytics</li>
            <li>Priority support</li>
            <li>All Pro features unlocked</li>
          </ul>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Simply sign up with this email address and you'll automatically receive Pro access for ${durationDays} days - no credit card required!
    </p>
    ${button('Sign Up Now', signupUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Questions? Reply to this email or reach out at support@regenr.app
    </p>
  `, `You're invited to ReGenr Pro Beta - ${durationDays} days free!`);

  const text = `
You're Invited to ReGenr Pro Beta!

Great news! You've been invited to join the exclusive ReGenr Pro Beta program.

What you get:
- ${durationDays} days of free Pro access
- AI-powered caption generation
- Advanced scheduling & analytics
- Priority support
- All Pro features unlocked

Simply sign up with this email address and you'll automatically receive Pro access for ${durationDays} days - no credit card required!

Sign Up Now: ${signupUrl}

Questions? Reply to this email or reach out at support@regenr.app
`;

  return { html, text };
}

// ============================================
// TEAM TEMPLATES
// ============================================

function renderTeamInvite(data: Record<string, unknown>): RenderedEmail {
  const teamName = (data.teamName as string) || 'a team';
  const inviterEmail = (data.inviterEmail as string) || 'A team owner';
  const role = (data.role as string) || 'Member';
  const token = (data.token as string) || '';
  const expiresAt = (data.expiresAt as string) || '';

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/team/invite?token=${token}`;

  // Calculate days until expiration
  let expiresIn = '7 days';
  if (expiresAt) {
    const expDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expiresIn = daysLeft === 1 ? '1 day' : `${daysLeft} days`;
  }

  const roleDescription = role === 'ADMIN'
    ? 'As an Admin, you can invite new members and manage the team.'
    : 'As a Member, you can collaborate on content with the team.';

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
      You're Invited to Join ${teamName}! 🎉
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      <strong>${inviterEmail}</strong> has invited you to join their team on ReGenr as a <strong>${role}</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-radius: 12px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">
            What you get as a team member:
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #15803d;">
            <li>Full access to Pro features</li>
            <li>Shared workspace with ${teamName}</li>
            <li>Collaborate on content and scheduling</li>
            <li>Access to team analytics</li>
          </ul>
          <p style="margin: 16px 0 0; font-size: 14px; color: #166534;">
            ${roleDescription}
          </p>
        </td>
      </tr>
    </table>
    ${button('Accept Invitation', acceptUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      This invitation expires in <strong>${expiresIn}</strong>. If you don't want to join, you can safely ignore this email.
    </p>
  `, `You're invited to join ${teamName} on ReGenr!`);

  const text = `
You're Invited to Join ${teamName}!

${inviterEmail} has invited you to join their team on ReGenr as a ${role}.

What you get as a team member:
- Full access to Pro features
- Shared workspace with ${teamName}
- Collaborate on content and scheduling
- Access to team analytics

${roleDescription}

Accept Invitation: ${acceptUrl}

This invitation expires in ${expiresIn}. If you don't want to join, you can safely ignore this email.
`;

  return { html, text };
}

// ============================================
// SCHEDULED POST TEMPLATES
// ============================================

function renderScheduledPostPublished(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const platforms = (data.platforms as string[]) || ['your platforms'];
  const postCount = (data.postCount as number) || 1;
  const caption = (data.caption as string) || '';
  const thumbnailUrl = (data.thumbnailUrl as string) || '';
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/dashboard`;

  const platformList = platforms.join(', ');
  const truncatedCaption = caption.length > 100 ? caption.substring(0, 100) + '...' : caption;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #10b981;">
      Your Scheduled Post is Live! 🎉
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, great news! Your scheduled post has been successfully published to <strong>${platformList}</strong>.
    </p>
    ${thumbnailUrl ? `
    <div style="margin: 0 0 24px; text-align: center;">
      <img src="${thumbnailUrl}" alt="Post thumbnail" style="max-width: 100%; max-height: 200px; border-radius: 12px; object-fit: cover;">
    </div>
    ` : ''}
    ${truncatedCaption ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">
            "${truncatedCaption}"
          </p>
        </td>
      </tr>
    </table>
    ` : ''}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-radius: 12px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 14px; color: #166534;">Platforms</td>
              <td align="right" style="font-size: 16px; font-weight: 600; color: #166534;">${platformList}</td>
            </tr>
            <tr>
              <td style="font-size: 14px; color: #166534; padding-top: 8px;">Status</td>
              <td align="right" style="font-size: 16px; font-weight: 600; color: #166534;">Published ✓</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${button('View Dashboard', dashboardUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Check your analytics to see how your post is performing!
    </p>
  `, `Your scheduled post is now live on ${platformList}!`);

  const text = `
Your Scheduled Post is Live!

Hey ${name}, great news! Your scheduled post has been successfully published to ${platformList}.

${truncatedCaption ? `Caption: "${truncatedCaption}"` : ''}

Platforms: ${platformList}
Status: Published

View Dashboard: ${dashboardUrl}

Check your analytics to see how your post is performing!
`;

  return { html, text };
}

function renderScheduledPostFailed(data: Record<string, unknown>): RenderedEmail {
  const name = (data.name as string) || 'there';
  const platforms = (data.platforms as string[]) || ['your platforms'];
  const failedPlatforms = (data.failedPlatforms as string[]) || platforms;
  const successPlatforms = (data.successPlatforms as string[]) || [];
  const errorMessage = (data.errorMessage as string) || 'An error occurred while publishing';
  const caption = (data.caption as string) || '';
  const scheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://regenr.app'}/schedule`;

  const failedList = failedPlatforms.join(', ');
  const successList = successPlatforms.join(', ');
  const truncatedCaption = caption.length > 100 ? caption.substring(0, 100) + '...' : caption;
  const isPartialFailure = successPlatforms.length > 0;

  const html = baseTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${isPartialFailure ? '#f59e0b' : '#dc2626'};">
      ${isPartialFailure ? 'Scheduled Post Partially Published' : 'Scheduled Post Failed'}
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      Hey ${name}, ${isPartialFailure
        ? `your scheduled post was published to some platforms but failed on others.`
        : `we encountered an issue publishing your scheduled post.`}
    </p>
    ${truncatedCaption ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">
            "${truncatedCaption}"
          </p>
        </td>
      </tr>
    </table>
    ` : ''}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-radius: 12px; margin-bottom: 24px; border: 1px solid #fecaca;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 14px; color: #991b1b;">Failed Platforms</td>
              <td align="right" style="font-size: 16px; font-weight: 600; color: #991b1b;">${failedList}</td>
            </tr>
            ${isPartialFailure ? `
            <tr>
              <td style="font-size: 14px; color: #166534; padding-top: 8px;">Succeeded Platforms</td>
              <td align="right" style="font-size: 16px; font-weight: 600; color: #166534;">${successList}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="padding-top: 12px;">
                <p style="margin: 0; font-size: 13px; color: #991b1b;">
                  <strong>Error:</strong> ${errorMessage}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4b5563;">
      You can try publishing again from your schedule page. Common issues include expired tokens or platform rate limits.
    </p>
    ${button('Go to Schedule', scheduleUrl)}
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
      Need help? Contact us at support@regenr.app
    </p>
  `, `${isPartialFailure ? 'Partial failure' : 'Failed'}: Your scheduled post couldn't be published to ${failedList}`);

  const text = `
${isPartialFailure ? 'Scheduled Post Partially Published' : 'Scheduled Post Failed'}

Hey ${name}, ${isPartialFailure
    ? `your scheduled post was published to some platforms but failed on others.`
    : `we encountered an issue publishing your scheduled post.`}

${truncatedCaption ? `Caption: "${truncatedCaption}"` : ''}

Failed Platforms: ${failedList}
${isPartialFailure ? `Succeeded Platforms: ${successList}` : ''}
Error: ${errorMessage}

You can try publishing again from your schedule page. Common issues include expired tokens or platform rate limits.

Go to Schedule: ${scheduleUrl}

Need help? Contact us at support@regenr.app
`;

  return { html, text };
}

// ============================================
// SCHEDULED POST NOTIFICATION HELPER
// ============================================

export interface ScheduledPostNotificationData {
  email: string;
  name?: string;
  platforms: string[];
  status: 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED';
  successPlatforms?: string[];
  failedPlatforms?: string[];
  errorMessage?: string;
  caption?: string;
  thumbnailUrl?: string;
}

/**
 * Send notification for scheduled post result
 */
export async function sendScheduledPostNotification(
  data: ScheduledPostNotificationData
): Promise<SendEmailResult> {
  const {
    email,
    name,
    platforms,
    status,
    successPlatforms = [],
    failedPlatforms = [],
    errorMessage,
    caption,
    thumbnailUrl,
  } = data;

  if (status === 'COMPLETED') {
    return sendEmail({
      to: email,
      subject: `Your scheduled post is live on ${platforms.join(', ')}!`,
      template: EmailTemplates.SCHEDULED_POST_PUBLISHED,
      data: {
        name,
        platforms,
        postCount: platforms.length,
        caption,
        thumbnailUrl,
      },
    });
  } else {
    // PARTIAL_FAILURE or FAILED
    return sendEmail({
      to: email,
      subject: status === 'PARTIAL_FAILURE'
        ? `Scheduled post partially published`
        : `Scheduled post failed to publish`,
      template: EmailTemplates.SCHEDULED_POST_FAILED,
      data: {
        name,
        platforms,
        failedPlatforms: failedPlatforms.length > 0 ? failedPlatforms : platforms,
        successPlatforms,
        errorMessage: errorMessage || 'An unexpected error occurred',
        caption,
      },
    });
  }
}

// ============================================
// EXPORTS
// ============================================

export { getResend };
