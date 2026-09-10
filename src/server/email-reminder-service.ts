import { Resend } from 'resend';
import { getBookings, updateBooking, updateBookingByRef } from '../db/queries.ts';

// Lock map to prevent duplicate concurrent executions for the same booking ref/id
const inFlightSendingLocks = new Set<string>();

let resendInstance: Resend | null = null;

export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export function getFormattedSender(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (!raw) return "Wally’s Driving School <info@wallysdrivingschool.com.au>";
  if (raw.includes("<") && raw.includes(">")) return raw;
  return `Wally’s Driving School <${raw}>`;
}

export interface ReminderScheduleResult {
  lessonStartMs: number;
  reminderTimeMs: number;
  isPast: boolean;
  isDue: boolean;
  scheduledForISO: string;
  formattedLessonDate: string;
  formattedLessonTime: string;
}

export interface EmailSendResult {
  success: boolean;
  emailId?: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  recipientEmail: string;
}

/**
 * Calculates the exact lesson start timestamp and 2-hour reminder schedule
 * in the school's configured timezone (defaults to Australia/Sydney for Western Sydney NSW).
 */
export function calculateReminderSchedule(
  dateStr: string,
  timeStr: string,
  timeZone = process.env.SCHOOL_TIMEZONE || 'Australia/Sydney'
): ReminderScheduleResult {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1; // 1-12
  let day = new Date().getDate();

  const cleanDate = (dateStr || '').trim();

  // 1. Parse Date (YYYY-MM-DD, DD/MM/YYYY, or "15 September 2026")
  const isoMatch = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmyMatch = cleanDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  const MONTH_NAMES: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };

  const textMatch = cleanDate.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:,?\s+(\d{4}))?$/i) ||
                    cleanDate.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);

  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else if (textMatch) {
    if (isNaN(Number(textMatch[1]))) {
      const mName = textMatch[1].toLowerCase();
      month = MONTH_NAMES[mName] || month;
      day = parseInt(textMatch[2], 10);
      if (textMatch[3]) year = parseInt(textMatch[3], 10);
    } else {
      day = parseInt(textMatch[1], 10);
      const mName = textMatch[2].toLowerCase();
      month = MONTH_NAMES[mName] || month;
      if (textMatch[3]) year = parseInt(textMatch[3], 10);
    }
  } else {
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  }

  // 2. Parse Start Time (e.g. "10:00 AM", "10:00 AM – 11:00 AM")
  let startHours = 9;
  let startMinutes = 0;
  const cleanTime = (timeStr || '').trim();
  const timeMatch = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);

  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = (timeMatch[3] || '').toUpperCase();

    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    if (!ampm && h >= 1 && h <= 6) {
      h += 12;
    }

    startHours = h;
    startMinutes = m;
  }

  // 3. Compute accurate local UTC timestamp for school's configured timezone
  const probeDate = new Date(Date.UTC(year, month - 1, day, startHours, startMinutes, 0));
  
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = tzFormatter.formatToParts(probeDate);
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = parseInt(p.value, 10);
  }

  const tzYear = partMap.year || year;
  const tzMonth = (partMap.month || month) - 1;
  const tzDay = partMap.day || day;
  let tzHour = partMap.hour || 0;
  if (tzHour === 24) tzHour = 0;
  const tzMinute = partMap.minute || 0;

  const tzDateAsUTC = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, 0);
  const offsetMs = tzDateAsUTC - probeDate.getTime();

  // True UTC timestamp of lesson start time in that timezone:
  const lessonStartMs = Date.UTC(year, month - 1, day, startHours, startMinutes, 0) - offsetMs;

  // Exactly 2 hours before lesson start time
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const reminderTimeMs = lessonStartMs - TWO_HOURS_MS;

  const now = Date.now();
  const isPast = now >= lessonStartMs;
  const isDue = !isPast && now >= reminderTimeMs;

  return {
    lessonStartMs,
    reminderTimeMs,
    isPast,
    isDue,
    scheduledForISO: new Date(reminderTimeMs).toISOString(),
    formattedLessonDate: cleanDate,
    formattedLessonTime: cleanTime,
  };
}

/**
 * Builds the exact required Resend reminder email subject and plain text body.
 */
export function generateReminderEmailContent(booking: {
  studentName: string;
  date: string;
  time: string;
  pickupAddress?: string | null;
  suburb: string;
}): { subject: string; text: string } {
  const location = (booking.pickupAddress && booking.pickupAddress.trim())
    ? booking.pickupAddress.trim()
    : `${booking.suburb || 'Rooty Hill'}, NSW`;

  const subject = `Reminder: Your Driving Lesson Today – Wally’s Driving School`;

  const text = [
    `Hi ${booking.studentName ? booking.studentName.trim() : 'Student'},`,
    ``,
    `This is a friendly reminder from Wally’s Driving School that your driving lesson is scheduled for today.`,
    ``,
    `Date: ${booking.date.trim()}`,
    `Time: ${booking.time.trim()}`,
    `Location: ${location}`,
    ``,
    `Please be ready a few minutes before your lesson.`,
    ``,
    `Thank you,`,
    `Wally’s Driving School`
  ].join('\n');

  return { subject, text };
}

/**
 * Helper to update booking in Cloud SQL / Supabase / In-Memory
 */
async function updateBookingInDatabase(booking: any, updates: Record<string, any>) {
  const numId = typeof booking.id === 'number' ? booking.id : parseInt(String(booking.id).replace(/\D/g, ''), 10);
  const ref = booking.bookingRef || booking.ref;

  if (ref) {
    await updateBookingByRef(ref, updates as any);
  } else if (!isNaN(numId)) {
    await updateBooking(numId, updates as any);
  }
}

/**
 * Schedules or sends a lesson reminder email to the student via Resend.
 * Automatically respects Resend's `scheduled_at` parameter for 2 hours prior to lesson.
 */
export async function scheduleOrSendLessonReminder(
  booking: any,
  options?: { force?: boolean }
): Promise<EmailSendResult> {
  const refKey = (booking.bookingRef || booking.ref || String(booking.id)).toUpperCase();
  const recipientEmail = (booking.email || '').trim().toLowerCase();

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return {
      success: false,
      status: 'failed',
      error: `Booking #${refKey} has no valid student email address.`,
      recipientEmail
    };
  }

  // Guard 1: Status must be Confirmed
  if (booking.status !== 'Confirmed') {
    return {
      success: false,
      status: 'failed',
      error: `Cannot send reminder: Booking #${refKey} status is "${booking.status}" (must be Confirmed).`,
      recipientEmail
    };
  }

  // Guard 2: Prevent duplicate emails for the same lesson
  if (!options?.force && booking.reminderStatus === 'sent') {
    return {
      success: true,
      emailId: booking.reminderMessageId || undefined,
      status: 'sent',
      error: `Reminder already sent on ${booking.reminderSentAt || 'previous run'}. Duplicate prevented.`,
      recipientEmail
    };
  }

  // Guard 3: Cancelled bookings do not receive reminders
  if (!options?.force && booking.reminderStatus === 'cancelled') {
    return {
      success: false,
      status: 'cancelled',
      error: `Cannot send reminder: Reminder for booking #${refKey} has been cancelled.`,
      recipientEmail
    };
  }

  // Guard 4: Mutual exclusion / in-flight lock
  if (inFlightSendingLocks.has(refKey)) {
    return {
      success: false,
      status: 'failed',
      error: `A reminder action is already actively in progress for booking #${refKey}.`,
      recipientEmail
    };
  }

  inFlightSendingLocks.add(refKey);

  try {
    const resend = getResend();
    if (!resend) {
      const err = "RESEND_API_KEY is not configured on the server. Please set it in Settings/environment.";
      console.warn(`[Resend Reminder] Cannot process booking #${refKey}: ${err}`);
      await updateBookingInDatabase(booking, {
        reminderStatus: 'failed',
        reminderError: err,
        reminderRecipientEmail: recipientEmail
      });
      return {
        success: false,
        status: 'failed',
        error: err,
        recipientEmail
      };
    }

    // Calculate timing
    const sched = calculateReminderSchedule(booking.date, booking.time);
    if (sched.isPast) {
      await updateBookingInDatabase(booking, {
        reminderStatus: 'cancelled',
        reminderError: 'Lesson start time already passed',
        reminderRecipientEmail: recipientEmail
      });
      return {
        success: false,
        status: 'cancelled',
        error: 'Lesson start time already passed',
        recipientEmail
      };
    }

    const { subject, text } = generateReminderEmailContent({
      studentName: booking.studentName || 'Student',
      date: booking.date,
      time: booking.time,
      pickupAddress: booking.pickupAddress,
      suburb: booking.suburb || 'Rooty Hill'
    });

    const primarySender = getFormattedSender();
    const now = Date.now();

    // Determine whether to send immediately or schedule
    // Resend allows scheduled_at up to 72 hours in advance (72 * 3600 * 1000 ms)
    const MAX_RESEND_SCHEDULE_MS = 72 * 60 * 60 * 1000;
    const msUntilReminder = sched.reminderTimeMs - now;

    let sendPayload: any = {
      from: primarySender,
      to: [recipientEmail],
      subject,
      text,
    };

    let willSchedule = false;
    if (msUntilReminder > 0 && msUntilReminder <= MAX_RESEND_SCHEDULE_MS) {
      // Within Resend's 72-hour scheduling window
      sendPayload.scheduled_at = new Date(sched.reminderTimeMs).toISOString();
      willSchedule = true;
    } else if (msUntilReminder > MAX_RESEND_SCHEDULE_MS) {
      // Too far in advance for Resend's 72h window. Record in DB as scheduled;
      // background runner will schedule with Resend once it is within the 72h window.
      await updateBookingInDatabase(booking, {
        reminderStatus: 'scheduled',
        reminderScheduledFor: sched.scheduledForISO,
        reminderRecipientEmail: recipientEmail,
        reminderError: null
      });
      console.log(`[Resend Reminder] Booking #${refKey} scheduled for future lesson (${sched.scheduledForISO}).`);
      return {
        success: true,
        status: 'scheduled',
        recipientEmail
      };
    } else {
      // Due right now or within 2 hours of lesson start: send immediately!
      willSchedule = false;
    }

    console.log(`[Resend Reminder] Dispatching to Resend for booking #${refKey} to ${recipientEmail} (willSchedule: ${willSchedule}, scheduled_at: ${sendPayload.scheduled_at || 'now'})`);

    let resendResponse = await resend.emails.send(sendPayload);

    // If custom domain is not yet verified in Resend during testing, retry gracefully with verified onboarding domain
    if (resendResponse.error && (resendResponse.error.message.includes('domain') || resendResponse.error.name === 'validation_error')) {
      console.warn(`[Resend Reminder] Primary domain returned: ${resendResponse.error.message}. Retrying with onboarding@resend.dev...`);
      sendPayload.from = "Wally’s Driving School <onboarding@resend.dev>";
      resendResponse = await resend.emails.send(sendPayload);
    }

    if (resendResponse.error) {
      const errorMsg = resendResponse.error.message || 'Unknown Resend API error';
      console.error(`[Resend Reminder] Error sending email for #${refKey}:`, resendResponse.error);
      await updateBookingInDatabase(booking, {
        reminderStatus: 'failed',
        reminderError: errorMsg,
        reminderRecipientEmail: recipientEmail
      });
      return {
        success: false,
        status: 'failed',
        error: errorMsg,
        recipientEmail
      };
    }

    const emailId = resendResponse.data?.id;
    const finalStatus = willSchedule ? 'scheduled' : 'sent';

    await updateBookingInDatabase(booking, {
      reminderStatus: finalStatus,
      reminderScheduledFor: sched.scheduledForISO,
      reminderSentAt: willSchedule ? null : new Date().toISOString(),
      reminderMessageId: emailId || null,
      reminderRecipientEmail: recipientEmail,
      reminderError: null
    });

    console.log(`[Resend Reminder] Successfully ${willSchedule ? 'scheduled' : 'sent'} email for booking #${refKey}! Resend ID: ${emailId}`);

    return {
      success: true,
      emailId,
      status: finalStatus,
      recipientEmail
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unexpected exception calling Resend';
    console.error(`[Resend Reminder] Exception for #${refKey}:`, err);
    await updateBookingInDatabase(booking, {
      reminderStatus: 'failed',
      reminderError: errorMsg,
      reminderRecipientEmail: recipientEmail
    });
    return {
      success: false,
      status: 'failed',
      error: errorMsg,
      recipientEmail
    };
  } finally {
    inFlightSendingLocks.delete(refKey);
  }
}

/**
 * Cancels a scheduled email through Resend and marks the booking's reminder as cancelled.
 */
export async function cancelScheduledLessonReminder(booking: any, reason?: string): Promise<boolean> {
  if (!booking) return false;
  const refKey = (booking.bookingRef || booking.ref || String(booking.id)).toUpperCase();

  const emailId = booking.reminderMessageId;
  const resend = getResend();

  if (emailId && resend) {
    try {
      console.log(`[Resend Reminder] Cancelling scheduled Resend email ${emailId} for #${refKey}...`);
      await resend.emails.cancel(emailId);
      console.log(`[Resend Reminder] Successfully cancelled scheduled email ${emailId} in Resend.`);
    } catch (err: any) {
      console.warn(`[Resend Reminder] Notice cancelling Resend email ${emailId}:`, err?.message || err);
    }
  }

  await updateBookingInDatabase(booking, {
    reminderStatus: 'cancelled',
    reminderError: reason || 'Booking was cancelled'
  });

  return true;
}

/**
 * Hook called when a booking is confirmed.
 * Automatically schedules or sends the reminder 2 hours before the lesson.
 * For multi-lesson packages, this is called for each individual lesson record.
 */
export async function handleBookingConfirmed(booking: any): Promise<EmailSendResult> {
  if (!booking) {
    return { success: false, status: 'failed', error: 'No booking provided', recipientEmail: '' };
  }
  return await scheduleOrSendLessonReminder(booking);
}

/**
 * Hook called when a booking/lesson is rescheduled.
 * Cancels the old scheduled Resend email and schedules the new reminder for 2 hours before the new lesson time.
 */
export async function handleBookingRescheduled(
  booking: any,
  newDate: string,
  newTime: string
): Promise<EmailSendResult> {
  if (!booking) {
    return { success: false, status: 'failed', error: 'No booking provided', recipientEmail: '' };
  }

  // Cancel old Resend scheduled email
  await cancelScheduledLessonReminder(booking, 'Rescheduled to new date/time');

  // Update date/time on the booking object
  const updatedBooking = {
    ...booking,
    date: newDate,
    time: newTime,
    status: 'Confirmed',
    reminderStatus: 'pending',
    reminderMessageId: null,
    reminderSentAt: null
  };

  return await scheduleOrSendLessonReminder(updatedBooking, { force: true });
}

/**
 * Hook called when a booking/lesson is cancelled.
 * Cancels the scheduled Resend email so no reminder is sent.
 */
export async function handleBookingCancelled(booking: any, reason?: string): Promise<boolean> {
  return await cancelScheduledLessonReminder(booking, reason || 'Booking was cancelled');
}

/**
 * Background Scheduler: Runs periodically (every 60s) on the server.
 * Ensures:
 * 1. Bookings approaching the 72-hour Resend window get scheduled with Resend.
 * 2. Bookings that reached the 2-hour mark without a scheduled email get dispatched.
 * 3. Never sends duplicate reminders.
 */
export async function processPendingLessonReminders(): Promise<{
  checked: number;
  sent: number;
  scheduled: number;
  failed: number;
  skipped: number;
}> {
  let checked = 0;
  let sent = 0;
  let scheduled = 0;
  let failed = 0;
  let skipped = 0;

  try {
    const allBookings = await getBookings({ includeUnpaid: false });

    for (const booking of allBookings) {
      checked++;

      if (booking.status !== 'Confirmed') {
        skipped++;
        continue;
      }

      if (booking.reminderStatus === 'sent' || booking.reminderStatus === 'cancelled') {
        skipped++;
        continue;
      }

      // If already scheduled in Resend (has a Resend message ID and status is 'scheduled')
      if (booking.reminderStatus === 'scheduled' && booking.reminderMessageId) {
        skipped++;
        continue;
      }

      const sched = calculateReminderSchedule(booking.date, booking.time);
      if (sched.isPast) {
        await updateBookingInDatabase(booking, {
          reminderStatus: 'cancelled',
          reminderError: 'Lesson time already passed'
        });
        skipped++;
        continue;
      }

      // If due or within 72h window, schedule or send via Resend
      const msUntilReminder = sched.reminderTimeMs - Date.now();
      const MAX_RESEND_SCHEDULE_MS = 72 * 60 * 60 * 1000;

      if (sched.isDue || msUntilReminder <= MAX_RESEND_SCHEDULE_MS) {
        const res = await scheduleOrSendLessonReminder(booking);
        if (res.success) {
          if (res.status === 'sent') sent++;
          else scheduled++;
        } else {
          failed++;
        }
      } else {
        // More than 72h away: record as scheduled locally
        if (booking.reminderStatus !== 'scheduled' || booking.reminderScheduledFor !== sched.scheduledForISO) {
          await updateBookingInDatabase(booking, {
            reminderStatus: 'scheduled',
            reminderScheduledFor: sched.scheduledForISO,
            reminderRecipientEmail: (booking.email || '').trim().toLowerCase(),
            reminderError: null
          });
          scheduled++;
        } else {
          skipped++;
        }
      }
    }
  } catch (err: any) {
    console.error(`[Resend Reminder Scheduler] Error in periodic check:`, err);
  }

  return { checked, sent, scheduled, failed, skipped };
}
