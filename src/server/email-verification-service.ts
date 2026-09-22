import crypto from 'crypto';
import { Resend } from 'resend';
import nodemailer, { type Transporter } from 'nodemailer';
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
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes validity
const COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_SENDS_PER_HOUR = 10;
const MAX_ATTEMPTS = 5;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes for booking completion

let resendClient: Resend | null = null;
let smtpTransporter: Transporter | null = null;

function getResendInstance(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getSmtpTransporter(): Transporter | null {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || '').trim();
  const host = (process.env.SMTP_HOST || '').trim();

  // If Gmail credentials are provided (either GMAIL_USER or user@gmail.com)
  if (user && pass && (host === 'smtp.gmail.com' || user.toLowerCase().endsWith('@gmail.com') || process.env.GMAIL_USER)) {
    if (!smtpTransporter) {
      smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
    return smtpTransporter;
  }

  // If custom SMTP host is provided
  if (host && user && pass) {
    if (!smtpTransporter) {
      const port = Number(process.env.SMTP_PORT) || 587;
      smtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    }
    return smtpTransporter;
  }

  return null;
}

function getSender(): string {
  const customFrom = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (customFrom && customFrom.trim()) {
    const raw = customFrom.trim();
    if (raw.includes('<') && raw.includes('>')) return raw;
    return `Wally's Driving School <${raw}>`;
  }
  if (process.env.GMAIL_USER) {
    return `Wally's Driving School <${process.env.GMAIL_USER.trim()}>`;
  }
  return "Wally's Driving School <onboarding@resend.dev>";
}

// Periodic cleanup of expired entries (runs every 5 minutes)
const cleanupTimer = setInterval(() => {
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
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

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

  // Send email using configured providers
  const primaryFrom = getSender();
  const subject = `Your Wally's Driving School verification code is: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wally's Driving School Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                <!-- Header -->
                <tr>
                  <td style="background-color: #E3222A; padding: 24px 32px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">Wally's Driving School</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #fee2e2;">Sydney, NSW • Driving Lesson Verification</p>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #111827;">Your Verification Code</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                      Please enter the following 6-digit verification code on the booking page to verify your email address and schedule your driving lesson.
                    </p>
                    <!-- Code Box -->
                    <div style="background-color: #fef2f2; border: 2px dashed #f87171; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #dc2626; line-height: 1;">
                        ${otp}
                      </div>
                      <p style="margin: 10px 0 0 0; font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 1px;">
                        Valid for 10 minutes
                      </p>
                    </div>
                    <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                      • This code is unique and expires in 10 minutes.<br>
                      • Never share this code with anyone.<br>
                      • If you did not request this booking, you can safely disregard this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      Wally's Driving School • Sydney, NSW • <a href="tel:0412345678" style="color: #E3222A; text-decoration: none;">0412 345 678</a>
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
Wally's Driving School
Verification Code: ${otp}

Please enter this 6-digit verification code on the booking page to verify your email address.
This code is valid for 10 minutes.

If you did not request this booking, you can safely disregard this email.
  `.trim();

  let emailSent = false;

  // 1. Try Resend if configured
  const resend = getResendInstance();
  if (resend) {
    try {
      let payload = {
        from: primaryFrom,
        to: email,
        subject,
        html: htmlContent,
        text: textContent
      };

      let result = await resend.emails.send(payload);

      if (result.error && (result.error.message?.includes('domain') || result.error.name === 'validation_error' || result.error.message?.includes('verify'))) {
        console.warn(`[Email Verification] Domain notice: ${result.error.message}. Retrying with onboarding@resend.dev...`);
        payload.from = "Wallys Driving School <onboarding@resend.dev>";
        result = await resend.emails.send(payload);
      }

      if (!result.error && result.data?.id) {
        console.log(`[Email Verification] Successfully sent verification code to ${email} via Resend (${result.data.id}).`);
        emailSent = true;
      } else if (result.error) {
        console.warn(`[Email Verification] Resend notice for ${email}:`, result.error);
      }
    } catch (err: any) {
      console.warn(`[Email Verification] Exception sending via Resend to ${email}:`, err);
    }
  }

  // 2. Try SMTP / Gmail Nodemailer if Resend was not used or failed
  if (!emailSent) {
    const smtp = getSmtpTransporter();
    if (smtp) {
      try {
        const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER || primaryFrom;
        await smtp.sendMail({
          from: `Wally's Driving School <${fromAddress}>`,
          to: email,
          subject,
          html: htmlContent,
          text: textContent
        });
        console.log(`[Email Verification] Successfully sent verification code to ${email} via SMTP/Gmail.`);
        emailSent = true;
      } catch (err: any) {
        console.warn(`[Email Verification] Exception sending via SMTP to ${email}:`, err);
      }
    }
  }

  if (!emailSent) {
    console.error(`[Email Verification] Failed to deliver verification email to ${email}. Check Resend or Gmail credentials.`);
    return {
      success: false,
      error: 'DELIVERY_FAILED',
      message: 'Could not send verification email. Please verify your email address or ensure email service (Resend or Gmail) is configured in Settings.'
    };
  }

  console.log(`[Email Verification] Successfully delivered verification code to ${email}`);
  return {
    success: true,
    message: 'Verification code sent to your email. Please check your Gmail or email inbox (and spam folder).',
    cooldownSeconds: 60
  };
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
      message: 'This verification code has expired or was not requested. Please request a new code.'
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

  // STRICT VALIDATION: ONLY the exact code generated and sent to the email works
  if (record.otp !== code) {
    record.attempts += 1;
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: 'INVALID_OTP',
      message: remaining > 0
        ? `Incorrect verification code. Please enter the exact 6-digit code sent to your email (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining).`
        : 'Incorrect verification code. Maximum attempts exceeded. Please request a new code.'
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
 * Directly issues a secure verification token for an email (e.g. for Google verified auth).
 */
export function issueVerificationToken(rawEmail: string): string {
  const email = (rawEmail || '').toLowerCase().trim();
  const now = Date.now();
  const verificationToken = crypto.randomBytes(32).toString('hex');
  verifiedTokensStore.set(verificationToken, {
    email,
    token: verificationToken,
    verifiedAt: now,
    expiresAt: now + TOKEN_EXPIRY_MS
  });
  return verificationToken;
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
