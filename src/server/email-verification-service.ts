import crypto from 'crypto';
import { Resend } from 'resend';
import { validateWorkingEmail } from '../lib/validation.ts';
import { escapeHtml } from './email-reminder-service.ts';

interface OtpEntry {
  email: string;
  otp: string;
  expiresAt: number; // 10 minutes from creation
  attempts: number; // max 5 incorrect tries
  lastSentAt: number;
  sendCountLastHour: number;
  hourWindowStart: number;
}

interface VerifiedTokenEntry {
  email: string;
  token: string;
  verifiedAt: number;
  expiresAt: number; // 60 minutes
}

// In-memory stores with automatic cleanup
const otpStore = new Map<string, OtpEntry>();
const verifiedTokensStore = new Map<string, VerifiedTokenEntry>();

// Configuration constants
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_SENDS_PER_HOUR = 6;
const MAX_ATTEMPTS = 5;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes for booking completion

let resendClient: Resend | null = null;

function getResendInstance(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getSender(): string {
  const customFrom = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (customFrom && customFrom.trim()) {
    const raw = customFrom.trim();
    if (raw.includes('<') && raw.includes('>')) return raw;
    return `Wallys Driving School <${raw}>`;
  }
  return "Wallys Driving School <info@wallysdrivingschool.com.au>";
}

// Periodic cleanup of expired entries (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (now > entry.expiresAt + 60 * 60 * 1000) {
      otpStore.delete(key);
    }
  }
  for (const [key, entry] of verifiedTokensStore.entries()) {
    if (now > entry.expiresAt) {
      verifiedTokensStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function sendVerificationOtp(rawEmail: string): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  error?: string;
}> {
  const emailCheck = validateWorkingEmail(rawEmail);
  if (!emailCheck.isValid || !emailCheck.email) {
    return {
      success: false,
      error: 'INVALID_EMAIL',
      message: emailCheck.error || 'Please enter a valid email address.'
    };
  }

  const email = emailCheck.email.toLowerCase().trim();
  const now = Date.now();

  const existing = otpStore.get(email);
  if (existing) {
    // Check cooldown
    const timeSinceLastSend = now - existing.lastSentAt;
    if (timeSinceLastSend < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - timeSinceLastSend) / 1000);
      return {
        success: false,
        error: 'COOLDOWN',
        message: `Please wait ${waitSec}s before requesting a new code.`,
        cooldownSeconds: waitSec
      };
    }

    // Check hourly limit
    if (now - existing.hourWindowStart < 60 * 60 * 1000) {
      if (existing.sendCountLastHour >= MAX_SENDS_PER_HOUR) {
        return {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many verification attempts. Please try again in an hour.'
        };
      }
    } else {
      existing.hourWindowStart = now;
      existing.sendCountLastHour = 0;
    }
  }

  // Generate cryptographically secure 6-digit random OTP
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Save OTP in store
  otpStore.set(email, {
    email,
    otp,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAt: now,
    sendCountLastHour: (existing?.sendCountLastHour || 0) + 1,
    hourWindowStart: existing?.hourWindowStart && (now - existing.hourWindowStart < 60 * 60 * 1000)
      ? existing.hourWindowStart
      : now
  });

  // Send email using real email provider
  const resend = getResendInstance();
  if (!resend) {
    console.error(`[Email Verification] RESEND_API_KEY / EMAIL_API_KEY is not configured.`);
    return {
      success: false,
      error: 'PROVIDER_NOT_CONFIGURED',
      message: 'Email service is currently unavailable. Please contact the school directly.'
    };
  }

  const primaryFrom = getSender();
  const subject = `Your Booking Verification Code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 30px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520px" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      WALLY'S DRIVING SCHOOL
                    </div>
                    <div style="font-size: 13px; color: #cbd5e1; margin-top: 4px; font-weight: 500;">
                      Sydney NSW • RMS / Service NSW Accredited
                    </div>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px;">
                    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center;">
                      Verify Your Email Address
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
                      Please use the following 6-digit verification code to confirm your booking for <strong>${escapeHtml(email)}</strong>.
                    </p>

                    <!-- OTP Box -->
                    <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: inline-block;">
                        ${otp}
                      </span>
                    </div>

                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #991b1b; font-weight: 600;">
                        ⏱️ This code will expire in 10 minutes.
                      </p>
                    </div>

                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b; text-align: center;">
                      If you did not request this code, you can safely disregard this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                      © ${new Date().getFullYear()} Wally's Driving School. All rights reserved.<br>
                      Questions? Call or text 0416 029 444
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textContent = `
Wally's Driving School - Email Verification

Your verification code is: ${otp}

This code will expire in 10 minutes.
If you did not request this code, you can safely ignore this email.

© ${new Date().getFullYear()} Wally's Driving School.
  `.trim();

  try {
    let payload = {
      from: primaryFrom,
      to: email,
      subject,
      html: htmlContent,
      text: textContent
    };

    let result = await resend.emails.send(payload);

    // If custom domain fails verification, fallback to Resend verified onboarding domain
    if (result.error && (result.error.message.includes('domain') || result.error.name === 'validation_error')) {
      console.warn(`[Email Verification] Domain notice: ${result.error.message}. Retrying with onboarding@resend.dev...`);
      payload.from = "Wallys Driving School <onboarding@resend.dev>";
      result = await resend.emails.send(payload);
    }

    if (result.error) {
      console.error(`[Email Verification] Resend error for ${email}:`, result.error);
      return {
        success: false,
        error: 'SEND_FAILED',
        message: 'Unable to send the verification code. Please try again.'
      };
    }

    console.log(`[Email Verification] Successfully sent verification code to ${email}. ID: ${result.data?.id}`);
    return {
      success: true,
      message: 'Verification code sent to your email.',
      cooldownSeconds: 60
    };
  } catch (err: any) {
    console.error(`[Email Verification] Exception sending email to ${email}:`, err);
    return {
      success: false,
      error: 'SEND_FAILED',
      message: 'Unable to send the verification code. Please try again.'
    };
  }
}

export function verifyVerificationOtp(rawEmail: string, rawCode: string): {
  success: boolean;
  message: string;
  error?: string;
  verificationToken?: string;
} {
  const email = (rawEmail || '').toLowerCase().trim();
  const code = (rawCode || '').replace(/\D/g, '').trim();

  if (!email) {
    return {
      success: false,
      error: 'MISSING_EMAIL',
      message: 'Email address is required.'
    };
  }

  if (!code || code.length !== 6) {
    return {
      success: false,
      error: 'INVALID_FORMAT',
      message: 'Please enter the complete 6-digit verification code.'
    };
  }

  const record = otpStore.get(email);
  if (!record) {
    return {
      success: false,
      error: 'EXPIRED_OTP',
      message: 'This verification code has expired. Please request a new code.'
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    otpStore.delete(email);
    return {
      success: false,
      error: 'EXPIRED_OTP',
      message: 'This verification code has expired. Please request a new code.'
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(email);
    return {
      success: false,
      error: 'MAX_ATTEMPTS_EXCEEDED',
      message: 'Too many incorrect attempts. Please request a new code.'
    };
  }

  if (record.otp !== code) {
    record.attempts += 1;
    return {
      success: false,
      error: 'INVALID_OTP',
      message: 'Invalid verification code. Please try again.'
    };
  }

  // Code is valid! Consume OTP so it cannot be used again
  otpStore.delete(email);

  // Generate cryptographically secure verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  verifiedTokensStore.set(verificationToken, {
    email,
    token: verificationToken,
    verifiedAt: now,
    expiresAt: now + TOKEN_EXPIRY_MS
  });

  return {
    success: true,
    message: '✓ Email verified successfully',
    verificationToken
  };
}

/**
 * Validates that an email has been genuinely verified via OTP within the last 60 minutes.
 */
export function isEmailVerified(rawEmail: string, token?: string | null): boolean {
  if (!rawEmail) return false;
  const email = rawEmail.toLowerCase().trim();

  if (!token) return false;

  const entry = verifiedTokensStore.get(token);
  if (!entry) return false;

  if (entry.email !== email) return false;

  if (Date.now() > entry.expiresAt) {
    verifiedTokensStore.delete(token);
    return false;
  }

  return true;
}

export function invalidateVerificationToken(token: string): void {
  if (token) {
    verifiedTokensStore.delete(token);
  }
}
