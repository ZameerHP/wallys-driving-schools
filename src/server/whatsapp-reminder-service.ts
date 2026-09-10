import { getBookings, updateBooking, updateBookingByRef } from '../db/queries.ts';

// Lock map to prevent concurrent executions for the same booking ref/id
const inFlightSendingLocks = new Set<string>();

export interface NormalizedPhoneResult {
  e164: string;      // e.g. +61412345678
  digits: string;    // e.g. 61412345678
  isValid: boolean;
  error?: string;
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

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'meta' | 'twilio' | 'none';
  recipientPhone: string;
}

/**
 * Normalizes any phone number into strict E.164 and clean digits format.
 * Specifically converts Australian mobile numbers (04XXXXXXXX, 4XXXXXXXX, 614XXXXXXXX)
 * into standard international +614XXXXXXXX without changing the student's actual number.
 */
export function normalizePhoneNumber(rawPhone: string): NormalizedPhoneResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { e164: '', digits: '', isValid: false, error: 'Student phone number is required.' };
  }

  // Strip all non-digit, non-plus characters (spaces, dashes, parens, dots)
  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, '');

  // Convert international double-zero exit code (e.g. 0061...)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  let e164 = '';

  if (cleaned.startsWith('+')) {
    // Already includes international country prefix
    const digitsOnly = cleaned.slice(1).replace(/\D/g, '');
    e164 = '+' + digitsOnly;
  } else if (cleaned.startsWith('03') && cleaned.length === 11) {
    // Pakistan domestic mobile: 03XXXXXXXXX -> +923XXXXXXXXX
    e164 = '+92' + cleaned.slice(1);
  } else if (cleaned.startsWith('92') && (cleaned.length === 12 || cleaned.length === 13)) {
    // Pakistan international format without '+': 923XXXXXXXXX -> +923XXXXXXXXX
    e164 = '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Australian standard domestic mobile: 04XXXXXXXX -> +614XXXXXXXX
    e164 = '+61' + cleaned.slice(1);
  } else if (cleaned.startsWith('61') && (cleaned.length === 11 || cleaned.length === 12)) {
    // Australian number without '+': 614XXXXXXXX -> +614XXXXXXXX
    e164 = '+' + cleaned;
  } else if (cleaned.startsWith('4') && cleaned.length === 9) {
    // Australian mobile missing leading zero: 4XXXXXXXX -> +614XXXXXXXX
    e164 = '+61' + cleaned;
  } else {
    // Generic fallback: preserve digits with leading +
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
      e164 = '+61' + digitsOnly.slice(1);
    } else {
      e164 = '+' + digitsOnly;
    }
  }

  const digits = e164.replace(/\D/g, '');
  const isValid = digits.length >= 8 && digits.length <= 16;

  if (!isValid) {
    return {
      e164,
      digits,
      isValid: false,
      error: `Invalid international phone number format: "${rawPhone}".`
    };
  }

  return {
    e164,
    digits,
    isValid: true
  };
}

/**
 * Calculates the exact lesson start timestamp and 2-hour reminder schedule
 * in the school's configured timezone (defaults to Australia/Perth).
 */
export function calculateReminderSchedule(
  dateStr: string,
  timeStr: string,
  timeZone = process.env.SCHOOL_TIMEZONE || 'Australia/Perth'
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
      // "September 15, 2026"
      const mName = textMatch[1].toLowerCase();
      month = MONTH_NAMES[mName] || month;
      day = parseInt(textMatch[2], 10);
      if (textMatch[3]) year = parseInt(textMatch[3], 10);
    } else {
      // "15 September 2026"
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

  // 2. Parse Start Time (e.g. "10:00 AM", "10:00 AM – 11:00 AM", "14:00")
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
      // Daytime driving school lesson hours assumption (e.g. 2 -> 2:00 PM)
      h += 12;
    }

    startHours = h;
    startMinutes = m;
  }

  // 3. Compute accurate local UTC timestamp for the school's configured timezone
  // We use Intl.DateTimeFormat to calculate the exact offset of the target timezone
  const probeDate = new Date(Date.UTC(year, month - 1, day, startHours, startMinutes, 0));
  
  // Calculate offset between UTC and the requested timezone
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

  // Calculate local timezone offset in ms
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

  // The true UTC timestamp of the lesson start time in that timezone:
  const lessonStartMs = Date.UTC(year, month - 1, day, startHours, startMinutes, 0) - offsetMs;

  // 2 hours before lesson start time
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const reminderTimeMs = lessonStartMs - TWO_HOURS_MS;

  const now = Date.now();
  const isPast = now >= lessonStartMs;
  // If lesson is in future AND now has reached or passed the 2-hour reminder mark
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
 * Builds the exact required WhatsApp lesson reminder message text.
 */
export function generateReminderMessage(booking: {
  studentName: string;
  date: string;
  time: string;
  pickupAddress?: string | null;
  suburb: string;
}): string {
  const location = booking.pickupAddress
    ? booking.pickupAddress.trim()
    : `${booking.suburb}, WA`;

  return [
    `Hi ${booking.studentName.trim()} 👋`,
    ``,
    `This is a friendly reminder from Wally’s Driving School.`,
    ``,
    `🚗 Your driving lesson is scheduled for:`,
    `📅 ${booking.date.trim()}`,
    `🕐 ${booking.time.trim()}`,
    `📍 ${location}`,
    ``,
    `Please be ready a few minutes before your lesson.`,
    ``,
    `If you need to contact Wally’s Driving School regarding your lesson, please reply to this message.`,
    ``,
    `Thank you,`,
    `Wally’s Driving School`
  ].join('\n');
}

/**
 * Real Server-Side WhatsApp Business Provider Dispatcher.
 * Communicates with either Meta WhatsApp Cloud API or Twilio WhatsApp API.
 * If credentials are missing, returns an explicit unconfigured failure.
 * NEVER exposes tokens or pretends delivery succeeded.
 */
export async function sendWhatsAppMessage(
  recipientPhone: string,
  message: string
): Promise<WhatsAppSendResult> {
  const norm = normalizePhoneNumber(recipientPhone);
  if (!norm.isValid) {
    return {
      success: false,
      error: norm.error || 'Invalid student phone number format.',
      provider: 'none',
      recipientPhone: rawPhoneClean(recipientPhone)
    };
  }

  // 1. Meta WhatsApp Business Cloud API (Official Graph API)
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (metaToken && metaPhoneId) {
    try {
      console.log(`[WhatsApp Reminder] Dispatching via Meta Cloud API to student: ${norm.e164} (PhoneId: ${metaPhoneId})`);

      const res = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: norm.digits, // Meta expects digits only without leading '+'
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      });

      const data = await res.json();
      if (res.ok && data?.messages && data.messages.length > 0) {
        const messageId = data.messages[0].id;
        console.log(`[WhatsApp Reminder] Successfully sent via Meta Cloud API! Message ID: ${messageId}`);
        return {
          success: true,
          messageId,
          provider: 'meta',
          recipientPhone: norm.e164
        };
      }

      const errorMsg = data?.error?.message || `Meta WhatsApp API returned HTTP ${res.status}`;
      console.error(`[WhatsApp Reminder] Meta Cloud API error:`, data);
      return {
        success: false,
        error: `Meta WhatsApp API error: ${errorMsg}`,
        provider: 'meta',
        recipientPhone: norm.e164
      };
    } catch (err: any) {
      console.error(`[WhatsApp Reminder] Network error calling Meta WhatsApp API:`, err);
      return {
        success: false,
        error: `Network error connecting to Meta WhatsApp API: ${err?.message || err}`,
        provider: 'meta',
        recipientPhone: norm.e164
      };
    }
  }

  // 2. Twilio for WhatsApp
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const fromNumber = twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`;
      const toNumber = `whatsapp:${norm.e164}`;

      console.log(`[WhatsApp Reminder] Dispatching via Twilio WhatsApp API to student: ${norm.e164}`);

      const formData = new URLSearchParams();
      formData.append('From', fromNumber);
      formData.append('To', toNumber);
      formData.append('Body', message);

      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      const data = await res.json();
      if (res.ok && data?.sid) {
        console.log(`[WhatsApp Reminder] Successfully sent via Twilio! SID: ${data.sid}`);
        return {
          success: true,
          messageId: data.sid,
          provider: 'twilio',
          recipientPhone: norm.e164
        };
      }

      const errorMsg = data?.message || `Twilio WhatsApp API returned HTTP ${res.status}`;
      console.error(`[WhatsApp Reminder] Twilio WhatsApp API error:`, data);
      return {
        success: false,
        error: `Twilio WhatsApp API error: ${errorMsg}`,
        provider: 'twilio',
        recipientPhone: norm.e164
      };
    } catch (err: any) {
      console.error(`[WhatsApp Reminder] Network error calling Twilio:`, err);
      return {
        success: false,
        error: `Network error connecting to Twilio API: ${err?.message || err}`,
        provider: 'twilio',
        recipientPhone: norm.e164
      };
    }
  }

  // 3. Neither provider configured
  const unconfiguredError = 'WhatsApp provider not configured. Please set WHATSAPP_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID (Meta Cloud API) or TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN in server settings.';
  console.warn(`[WhatsApp Reminder] Cannot send reminder: ${unconfiguredError}`);

  return {
    success: false,
    error: unconfiguredError,
    provider: 'none',
    recipientPhone: norm.e164
  };
}

function rawPhoneClean(phone: string): string {
  return (phone || '').trim().replace(/[\s\-().]/g, '');
}

/**
 * Sends one automatic WhatsApp reminder for a confirmed booking.
 * Strictly guarantees:
 * - Recipient is the exact student's phone number
 * - Duplicate WhatsApp messages are prevented
 * - Reminder status is saved to DB
 */
export async function sendLessonReminderForBooking(
  booking: any,
  options?: { force?: boolean }
): Promise<WhatsAppSendResult> {
  const refKey = (booking.bookingRef || booking.ref || String(booking.id)).toUpperCase();

  // Guard 1: Status must be Confirmed
  if (booking.status !== 'Confirmed') {
    return {
      success: false,
      error: `Cannot send reminder: Booking #${refKey} status is "${booking.status}" (must be Confirmed).`,
      provider: 'none',
      recipientPhone: booking.phone || ''
    };
  }

  // Guard 2: Prevent duplicate WhatsApp messages
  if (!options?.force && booking.reminderStatus === 'sent') {
    return {
      success: false,
      error: `Reminder already sent on ${booking.reminderSentAt || 'previous run'} (Message ID: ${booking.reminderMessageId || 'N/A'}). Duplicate prevented.`,
      provider: 'none',
      recipientPhone: booking.reminderRecipientPhone || booking.phone || ''
    };
  }

  // Guard 3: Cancelled bookings do not receive reminders
  if (!options?.force && booking.reminderStatus === 'cancelled') {
    return {
      success: false,
      error: `Cannot send reminder: Reminder for booking #${refKey} has been cancelled.`,
      provider: 'none',
      recipientPhone: booking.phone || ''
    };
  }

  // Guard 4: Mutual exclusion / In-flight lock
  if (inFlightSendingLocks.has(refKey)) {
    return {
      success: false,
      error: `A reminder dispatch is already actively in progress for booking #${refKey}.`,
      provider: 'none',
      recipientPhone: booking.phone || ''
    };
  }

  inFlightSendingLocks.add(refKey);

  try {
    // 1. Normalize student's exact phone number
    const norm = normalizePhoneNumber(booking.phone);
    if (!norm.isValid) {
      const errResult: WhatsAppSendResult = {
        success: false,
        error: norm.error || 'Student phone number could not be normalized.',
        provider: 'none',
        recipientPhone: booking.phone
      };

      // Record failure on booking
      await updateBookingInDatabase(booking, {
        reminderStatus: 'failed',
        reminderError: errResult.error,
        reminderRecipientPhone: booking.phone
      });

      return errResult;
    }

    // 2. Generate exact message
    const message = generateReminderMessage({
      studentName: booking.studentName || 'Student Driver',
      date: booking.date,
      time: booking.time,
      pickupAddress: booking.pickupAddress,
      suburb: booking.suburb || 'Perth'
    });

    // 3. Dispatch to real WhatsApp API
    const sendResult = await sendWhatsAppMessage(norm.e164, message);

    if (sendResult.success) {
      // Record success
      await updateBookingInDatabase(booking, {
        reminderStatus: 'sent',
        reminderSentAt: new Date().toISOString(),
        reminderMessageId: sendResult.messageId || null,
        reminderRecipientPhone: norm.e164,
        reminderError: null,
      });
      console.log(`[WhatsApp Reminder] Recorded successful reminder for booking #${refKey} to student ${norm.e164}`);
    } else {
      // Record failure
      await updateBookingInDatabase(booking, {
        reminderStatus: 'failed',
        reminderError: sendResult.error || 'WhatsApp message delivery failed',
        reminderRecipientPhone: norm.e164,
      });
      console.warn(`[WhatsApp Reminder] Recorded failure for booking #${refKey}: ${sendResult.error}`);
    }

    return sendResult;
  } finally {
    inFlightSendingLocks.delete(refKey);
  }
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
 * Background Scheduler: Runs periodically (every 60s) on the server.
 * Operates independently of whether users/admins have the website open.
 * Finds all confirmed lessons whose 2-hour reminder is due and dispatches WhatsApp messages.
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
    const now = Date.now();

    for (const booking of allBookings) {
      checked++;

      // Only confirmed bookings qualify
      if (booking.status !== 'Confirmed') {
        skipped++;
        continue;
      }

      // Already sent -> never duplicate
      if (booking.reminderStatus === 'sent') {
        skipped++;
        continue;
      }

      // Cancelled -> skip
      if (booking.reminderStatus === 'cancelled') {
        skipped++;
        continue;
      }

      // Calculate schedule
      const sched = calculateReminderSchedule(booking.date, booking.time);

      // If the lesson start time has already passed in the past, don't send reminder
      if (sched.isPast) {
        if (booking.reminderStatus !== 'cancelled') {
          await updateBookingInDatabase(booking, {
            reminderStatus: 'cancelled',
            reminderError: 'Lesson time already passed'
          });
        }
        skipped++;
        continue;
      }

      // Check if due (less than 2 hours away or past the 2h mark)
      if (sched.isDue) {
        // Prevent continuous retry if already marked as failed in this period unless scheduled
        if (booking.reminderStatus === 'failed') {
          skipped++;
          continue;
        }

        console.log(`[WhatsApp Reminder Scheduler] Reminder DUE for booking #${booking.bookingRef || booking.ref} on ${booking.date} at ${booking.time} (Student: ${booking.studentName}, Phone: ${booking.phone})`);
        
        const res = await sendLessonReminderForBooking(booking);
        if (res.success) {
          sent++;
        } else {
          failed++;
        }
      } else {
        // Reminder is in the future (> 2 hours away)
        // Ensure status is marked as 'scheduled' with the exact reminder time
        if (booking.reminderStatus !== 'scheduled' || booking.reminderScheduledFor !== sched.scheduledForISO) {
          await updateBookingInDatabase(booking, {
            reminderStatus: 'scheduled',
            reminderScheduledFor: sched.scheduledForISO,
            reminderError: null
          });
          scheduled++;
        } else {
          skipped++;
        }
      }
    }
  } catch (err: any) {
    console.error(`[WhatsApp Reminder Scheduler] Error in periodic check:`, err);
  }

  return { checked, sent, scheduled, failed, skipped };
}

/**
 * Hook called when a booking is confirmed (e.g. after payment or admin approval).
 * Automatically schedules the reminder for 2 hours before the lesson,
 * or immediately dispatches if the lesson is less than 2 hours away.
 */
export async function handleBookingConfirmed(booking: any): Promise<void> {
  if (!booking) return;

  const sched = calculateReminderSchedule(booking.date, booking.time);

  if (sched.isPast) {
    await updateBookingInDatabase(booking, {
      reminderStatus: 'cancelled',
      reminderError: 'Lesson start time already passed'
    });
    return;
  }

  if (sched.isDue) {
    // Lesson is less than 2 hours away: send reminder as soon as possible, once!
    console.log(`[WhatsApp Reminder] Confirmed lesson is <2h away (${booking.date} ${booking.time}). Dispatching reminder immediately.`);
    await sendLessonReminderForBooking(booking);
  } else {
    // Schedule for 2 hours before
    await updateBookingInDatabase(booking, {
      reminderStatus: 'scheduled',
      reminderScheduledFor: sched.scheduledForISO,
      reminderError: null
    });
    console.log(`[WhatsApp Reminder] Scheduled reminder for ${sched.scheduledForISO} (2 hours before ${booking.date} ${booking.time})`);
  }
}

/**
 * Hook called when a booking is rescheduled.
 * Cancels old scheduled reminder and recalculates reminder for the new date and time.
 */
export async function handleBookingRescheduled(
  booking: any,
  newDate: string,
  newTime: string
): Promise<void> {
  if (!booking) return;

  const sched = calculateReminderSchedule(newDate, newTime);

  const updates: Record<string, any> = {
    reminderStatus: sched.isDue ? 'scheduled' : 'scheduled',
    reminderScheduledFor: sched.scheduledForISO,
    reminderSentAt: null,
    reminderMessageId: null,
    reminderError: null,
  };

  await updateBookingInDatabase(booking, updates);

  // If new lesson is already within 2 hours, send immediately
  if (sched.isDue && !sched.isPast && booking.status === 'Confirmed') {
    const updatedBooking = { ...booking, date: newDate, time: newTime, ...updates };
    await sendLessonReminderForBooking(updatedBooking);
  }
}

/**
 * Hook called when a booking is cancelled.
 * Cancels the scheduled reminder so no WhatsApp is sent.
 */
export async function handleBookingCancelled(booking: any, reason?: string): Promise<void> {
  if (!booking) return;

  await updateBookingInDatabase(booking, {
    reminderStatus: 'cancelled',
    reminderError: reason || 'Booking was cancelled'
  });
  console.log(`[WhatsApp Reminder] Cancelled reminder for booking #${booking.bookingRef || booking.ref}`);
}
