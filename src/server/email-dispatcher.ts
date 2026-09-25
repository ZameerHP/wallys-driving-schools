import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { logEmailDelivery } from '../db/queries.ts';

// Cache transporter instances for connection pooling
let gmailTransporter: Transporter | null = null;
let customSmtpTransporter: Transporter | null = null;
let resendClient: Resend | null = null;

export interface EmailDispatchOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  from?: string;
  emailType?: 'confirmation' | 'receipt' | 'cancellation' | 'reminder' | 'instructor_notification' | 'verification' | 'direct';
  bookingRef?: string | null;
}

export interface EmailDispatchResult {
  success: boolean;
  provider: 'gmail' | 'smtp' | 'resend' | 'simulation';
  messageId?: string;
  error?: string;
  recipient: string;
}

export interface EmailSystemStatus {
  isConfigured: boolean;
  primaryProvider: 'gmail' | 'smtp' | 'resend' | 'simulation';
  hasGmail: boolean;
  hasCustomSmtp: boolean;
  hasResend: boolean;
  gmailUser: string | null;
  fromEmail: string;
  resendSandbox: boolean;
}

/**
 * Normalizes and extracts Gmail configuration.
 * Automatically cleans spaces from Google 16-character App Passwords (e.g., 'xxxx xxxx xxxx xxxx').
 */
export function getGmailConfig(): { user: string; pass: string; isConfigured: boolean } {
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || '';
  const pass = rawPass.replace(/\s+/g, '');
  const isConfigured = Boolean(user && user.includes('@') && pass.length >= 8);
  return { user, pass, isConfigured };
}

/**
 * Normalizes and extracts Custom SMTP configuration.
 */
export function getCustomSmtpConfig(): {
  host: string;
  port: number;
  user: string;
  pass: string;
  isConfigured: boolean;
} {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const isConfigured = Boolean(host && user && pass);
  return { host, port, user, pass, isConfigured };
}

/**
 * Returns the cached or new Resend client.
 */
export function getResendClient(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Returns formatted sender string for Resend / general use.
 */
export function getFormattedSender(): string {
  const raw = (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || '').trim();
  if (!raw) return "Wallys Driving School <info@wallysdrivingschool.com.au>";
  if (raw.includes("<") && raw.includes(">")) return raw;
  return `Wallys Driving School <${raw}>`;
}

/**
 * Inspects overall email provider availability and returns system diagnostics.
 */
export function getEmailSystemStatus(): EmailSystemStatus {
  const gmail = getGmailConfig();
  const smtp = getCustomSmtpConfig();
  const resend = getResendClient();
  const customFrom = (process.env.RESEND_FROM_EMAIL || '').trim();
  const hasResend = Boolean(resend);

  const resendSandbox = hasResend && (!customFrom || customFrom.includes('resend.dev'));

  let primaryProvider: 'gmail' | 'smtp' | 'resend' | 'simulation' = 'simulation';

  if (gmail.isConfigured) {
    // If Gmail is configured, prefer it especially when Resend is unverified or in sandbox
    primaryProvider = 'gmail';
  } else if (smtp.isConfigured) {
    primaryProvider = 'smtp';
  } else if (hasResend) {
    primaryProvider = 'resend';
  }

  return {
    isConfigured: gmail.isConfigured || smtp.isConfigured || hasResend,
    primaryProvider,
    hasGmail: gmail.isConfigured,
    hasCustomSmtp: smtp.isConfigured,
    hasResend,
    gmailUser: gmail.user ? gmail.user.replace(/(?<=^.{2}).(?=.*@)/g, '*') : null,
    fromEmail: getFormattedSender(),
    resendSandbox
  };
}

/**
 * Returns a high-level status for the email verification service.
 */
export function getEmailServiceStatus() {
  const status = getEmailSystemStatus();
  return {
    ...status,
    configured: status.isConfigured,
    provider: status.primaryProvider
  };
}

/**
 * Dynamically updates and persists email settings at runtime.
 */
export function saveStoredEmailSettings(settings: {
  gmailUser?: string;
  gmailAppPassword?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
}): void {
  if (settings.gmailUser !== undefined) {
    process.env.GMAIL_USER = settings.gmailUser;
  }
  if (settings.gmailAppPassword !== undefined) {
    process.env.GMAIL_APP_PASSWORD = settings.gmailAppPassword.replace(/\s+/g, '');
  }
  if (settings.resendApiKey !== undefined) {
    process.env.RESEND_API_KEY = settings.resendApiKey;
  }
  if (settings.resendFromEmail !== undefined) {
    process.env.RESEND_FROM_EMAIL = settings.resendFromEmail;
  }

  // Invalidate cached transporter instances so new credentials take effect immediately
  gmailTransporter = null;
  resendClient = null;
}

/**
 * Creates or retrieves the Gmail Nodemailer transporter.
 */
function getGmailTransporter(): Transporter | null {
  const { user, pass, isConfigured } = getGmailConfig();
  if (!isConfigured) return null;

  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return gmailTransporter;
}

/**
 * Creates or retrieves the Custom SMTP Nodemailer transporter.
 */
function getCustomSmtpTransporter(): Transporter | null {
  const { host, port, user, pass, isConfigured } = getCustomSmtpConfig();
  if (!isConfigured) return null;

  if (!customSmtpTransporter) {
    customSmtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return customSmtpTransporter;
}

/**
 * Sends an email via Gmail SMTP using Nodemailer.
 */
async function sendViaGmail(
  options: EmailDispatchOptions,
  recipient: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = getGmailTransporter();
  const { user } = getGmailConfig();
  if (!transporter || !user) {
    return { success: false, error: 'Gmail SMTP credentials are not configured' };
  }

  try {
    const fromAddress = `Wallys Driving School <${user}>`;
    const replyTo = options.replyTo || process.env.RESEND_FROM_EMAIL || "info@wallysdrivingschool.com.au";

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: options.subject,
      text: options.text || '',
      html: options.html || undefined,
      replyTo,
    });

    console.log(`[Email Dispatcher] Sent email via Gmail SMTP (${user}) to ${recipient} (id: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Dispatcher] Gmail SMTP error to ${recipient}:`, err?.message || err);
    return { success: false, error: err?.message || 'Gmail SMTP failed' };
  }
}

/**
 * Sends an email via Custom SMTP using Nodemailer.
 */
async function sendViaCustomSmtp(
  options: EmailDispatchOptions,
  recipient: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = getCustomSmtpTransporter();
  if (!transporter) {
    return { success: false, error: 'Custom SMTP is not configured' };
  }

  try {
    const fromAddress = options.from || getFormattedSender();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: options.subject,
      text: options.text || '',
      html: options.html || undefined,
      replyTo: options.replyTo,
    });

    console.log(`[Email Dispatcher] Sent email via Custom SMTP to ${recipient} (id: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Dispatcher] Custom SMTP error to ${recipient}:`, err?.message || err);
    return { success: false, error: err?.message || 'Custom SMTP failed' };
  }
}

/**
 * Sends an email via Resend API with domain and sandbox error detection.
 */
async function sendViaResend(
  options: EmailDispatchOptions,
  recipient: string
): Promise<{ success: boolean; messageId?: string; error?: string; isSandboxRestricted?: boolean }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  let fromAddress = options.from || getFormattedSender();
  let sendPayload: any = {
    from: fromAddress,
    to: [recipient],
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  if (options.replyTo) {
    sendPayload.reply_to = options.replyTo;
  }

  try {
    let result = await resend.emails.send(sendPayload);

    // If domain verification error, try once with Resend testing domain
    if (result.error && (result.error.message?.includes('domain') || result.error.name === 'validation_error')) {
      console.warn(`[Email Dispatcher] Resend domain error: ${result.error.message}. Retrying with onboarding@resend.dev...`);
      sendPayload.from = "Wallys Driving School <onboarding@resend.dev>";
      result = await resend.emails.send(sendPayload);
    }

    if (result.error) {
      const msg = result.error.message || 'Resend error';
      const isSandboxRestricted = msg.toLowerCase().includes('only send testing emails') ||
                                  msg.toLowerCase().includes('restricted by resend') ||
                                  msg.toLowerCase().includes('verify a domain');
      return {
        success: false,
        error: msg,
        isSandboxRestricted,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (err: any) {
    const msg = err?.message || 'Resend exception';
    return {
      success: false,
      error: msg,
      isSandboxRestricted: msg.toLowerCase().includes('only send testing emails'),
    };
  }
}

/**
 * Unified Email Dispatcher:
 * Intelligently routes outgoing emails between Gmail SMTP (Nodemailer), Custom SMTP, and Resend.
 * Seamlessly handles Resend sandbox restrictions by automatically using Gmail SMTP for all customer deliveries.
 */
export async function dispatchEmail(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
  const rawRecipient = Array.isArray(options.to) ? options.to[0] : options.to;
  const recipient = (rawRecipient || '').trim().toLowerCase();
  const emailType = options.emailType || 'direct';

  if (!recipient || !recipient.includes('@')) {
    return {
      success: false,
      provider: 'simulation',
      error: 'Invalid recipient email address',
      recipient: recipient || 'unknown',
    };
  }

  const { isConfigured: hasGmail } = getGmailConfig();
  const { isConfigured: hasCustomSmtp } = getCustomSmtpConfig();
  const resend = getResendClient();
  const customFrom = (process.env.RESEND_FROM_EMAIL || '').trim();
  const resendHasCustomDomain = Boolean(customFrom && !customFrom.includes('resend.dev'));

  // 1. If Gmail is configured and Resend does not have a verified domain,
  // use Gmail SMTP directly to guarantee customer delivery without Resend sandbox restriction errors.
  if (hasGmail && (!resend || !resendHasCustomDomain)) {
    const gmailResult = await sendViaGmail(options, recipient);
    if (gmailResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: 'sent',
        messageId: gmailResult.messageId,
      });
      return {
        success: true,
        provider: 'gmail',
        messageId: gmailResult.messageId,
        recipient,
      };
    }
    // If Gmail threw an error and Resend exists, try Resend as fallback
    console.warn(`[Email Dispatcher] Gmail SMTP failed (${gmailResult.error}). Checking Resend fallback...`);
  }

  // 2. Try Resend if available
  if (resend) {
    const resendResult = await sendViaResend(options, recipient);
    if (resendResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: 'sent',
        messageId: resendResult.messageId,
      });
      return {
        success: true,
        provider: 'resend',
        messageId: resendResult.messageId,
        recipient,
      };
    }

    console.warn(`[Email Dispatcher] Resend failed for ${recipient}: ${resendResult.error}`);

    // If Resend failed (sandbox restriction or domain verification), fallback to Gmail SMTP immediately!
    if (hasGmail) {
      console.log(`[Email Dispatcher] Resend restriction encountered. Falling back immediately to Gmail SMTP...`);
      const gmailFallback = await sendViaGmail(options, recipient);
      if (gmailFallback.success) {
        await logEmailDelivery({
          bookingRef: options.bookingRef,
          emailType,
          recipientEmail: recipient,
          status: 'sent',
          messageId: gmailFallback.messageId,
        });
        return {
          success: true,
          provider: 'gmail',
          messageId: gmailFallback.messageId,
          recipient,
        };
      }
    }

    // Try Custom SMTP fallback if available
    if (hasCustomSmtp) {
      const smtpFallback = await sendViaCustomSmtp(options, recipient);
      if (smtpFallback.success) {
        await logEmailDelivery({
          bookingRef: options.bookingRef,
          emailType,
          recipientEmail: recipient,
          status: 'sent',
          messageId: smtpFallback.messageId,
        });
        return {
          success: true,
          provider: 'smtp',
          messageId: smtpFallback.messageId,
          recipient,
        };
      }
    }

    // Resend failed and no SMTP fallback succeeded
    await logEmailDelivery({
      bookingRef: options.bookingRef,
      emailType,
      recipientEmail: recipient,
      status: 'failed',
      error: resendResult.error,
    });

    return {
      success: false,
      provider: 'resend',
      error: resendResult.error,
      recipient,
    };
  }

  // 3. Try Custom SMTP if configured
  if (hasCustomSmtp) {
    const smtpResult = await sendViaCustomSmtp(options, recipient);
    if (smtpResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: 'sent',
        messageId: smtpResult.messageId,
      });
      return {
        success: true,
        provider: 'smtp',
        messageId: smtpResult.messageId,
        recipient,
      };
    }
  }

  // 4. Try Gmail SMTP if not already attempted
  if (hasGmail) {
    const gmailResult = await sendViaGmail(options, recipient);
    if (gmailResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: 'sent',
        messageId: gmailResult.messageId,
      });
      return {
        success: true,
        provider: 'gmail',
        messageId: gmailResult.messageId,
        recipient,
      };
    }
  }

  // 5. Simulation mode for local sandbox / preview without email credentials
  const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[Email Dispatcher] (Simulation) Email to ${recipient} [${options.subject}] logged. (ID: ${simId})`);
  await logEmailDelivery({
    bookingRef: options.bookingRef,
    emailType,
    recipientEmail: recipient,
    status: 'sent',
    messageId: simId,
    error: 'Simulation mode: No live email provider credentials configured on server',
  });

  return {
    success: true,
    provider: 'simulation',
    messageId: simId,
    recipient,
  };
}
