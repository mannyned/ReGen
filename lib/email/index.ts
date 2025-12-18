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

  // Skip in development if not configured
  if (!process.env.RESEND_API_KEY) {
    logger.warn('Email not sent - RESEND_API_KEY not configured', {
      to,
      subject,
      template,
    });

    // In development, log the email content
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Email content (dev mode)', {
        to,
        subject,
        html: html?.substring(0, 500),
        data,
      });
    }

    return { success: true, id: 'dev-mode-skipped' };
  }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resend.emails.send(emailOptions as any);

    if (result.error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: result.error,
      });
      return { success: false, error: result.error.message };
    }

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
// EXPORTS
// ============================================

export { getResend };
