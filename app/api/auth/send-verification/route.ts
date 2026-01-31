import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { verificationStore } from '@/lib/verification-store'

// Lazy initialize Resend client
let resendClient: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export async function POST(request: NextRequest) {
  try {
    const { email, displayName } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Generate and store verification code in database
    const code = verificationStore.generateCode()
    await verificationStore.setCode(email, code, 10) // 10 minutes expiry

    // Check if Resend API key is configured
    const resend = getResend()
    if (!resend) {
      // Development mode: return the code in response for testing
      console.log(`[DEV MODE] Verification code for ${email}: ${code}`)
      return NextResponse.json({
        success: true,
        message: 'Verification code sent (dev mode)',
        devCode: code, // Include code in dev mode for testing
      })
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'ReGenr <noreply@regenr.app>', // Update with your verified domain
      to: email,
      subject: 'Your ReGenr verification code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">ReGenr</h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 32px;">
                        <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                          Hey${displayName ? ` ${displayName}` : ''}!
                        </h2>
                        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 24px;">
                          Welcome to ReGenr! Use this code to verify your email address:
                        </p>

                        <!-- Verification Code -->
                        <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #7c3aed; font-family: monospace;">
                            ${code}
                          </span>
                        </div>

                        <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 14px;">
                          This code expires in <strong>10 minutes</strong>.
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                          If you didn't request this code, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                          &copy; 2024 ReGenr. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      messageId: data?.id,
    })
  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
