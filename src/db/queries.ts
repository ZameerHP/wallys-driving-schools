import fs from 'node:fs';
import path from 'node:path';
import { db, isSqlConfigured } from './index.ts';
import { users, bookings, contactMessages, bookingAuditLogs, emailLogs, webhookEvents, instructorTimeOff, instructorSettings } from './schema.ts';
import { eq, desc, or, and, ne } from 'drizzle-orm';
import { getSupabaseServerClient } from '../lib/supabase-server.ts';
import { InstructorWeeklyDaysOff, InstructorDayOffSettings, WeekdayKey } from '../types/availability.ts';

// In-memory fallback stores for offline/sandbox environments
const inMemoryInstructorSettings: Map<string, any> = new Map();
const inMemoryUsers: Map<string, any> = new Map();
const inMemoryContactMessages: any[] = [];
const inMemoryAuditLogs: any[] = [];
const inMemoryEmailLogs: any[] = [];
const inMemoryWebhookEvents: Set<string> = new Set();
const inMemoryBookings: any[] = [
  {
    id: 1,
    bookingRef: 'WD-8492',
    userId: null,
    studentName: 'Sarah Jenkins',
    phone: '0412 345 678',
    email: 'sarah.j@example.com',
    suburb: 'Wellard',
    pickupAddress: '14 Chiswick Approach, Wellard WA 6170',
    packageTitle: '1 Hour Driving Lesson',
    packagePrice: 65,
    date: '2026-06-15',
    time: '10:00 AM',
    status: 'Confirmed',
    notes: 'Preparing for practical driving assessment at Rockingham DVS',
    paymentStatus: 'paid',
    stripeSessionId: null,
    reminderStatus: 'scheduled',
    reminderScheduledFor: '2026-06-15T00:00:00.000Z',
    reminderSentAt: null,
    reminderMessageId: null,
    reminderError: null,
    reminderRecipientPhone: '+61412345678',
    createdAt: new Date('2026-06-01T08:30:00Z'),
    updatedAt: new Date('2026-06-01T08:30:00Z'),
  },
  {
    id: 3,
    bookingRef: 'WD-7521',
    userId: null,
    studentName: 'Emma Watson',
    phone: '0434 567 890',
    email: 'emma.w@example.com',
    suburb: 'Rockingham',
    pickupAddress: '55 Simpson Ave, Rockingham WA 6168',
    packageTitle: 'Car Hire + 1 Hour Lesson',
    packagePrice: 200,
    date: '2026-06-18',
    time: '09:00 AM',
    status: 'Confirmed',
    notes: 'PDA car hire package. DVS test scheduled at 10:05 AM',
    paymentStatus: 'paid',
    stripeSessionId: null,
    reminderStatus: 'sent',
    reminderScheduledFor: '2026-06-18T00:00:00.000Z',
    reminderSentAt: '2026-06-18T00:00:05.000Z',
    reminderMessageId: 'wamid.HBgM0434567890WA01',
    reminderError: null,
    reminderRecipientPhone: '+61434567890',
    createdAt: new Date('2026-06-03T14:20:00Z'),
    updatedAt: new Date('2026-06-03T14:20:00Z'),
  },
  {
    id: 4,
    bookingRef: 'WD-9943',
    userId: null,
    studentName: 'Liam O\'Connor',
    phone: '0445 678 901',
    email: 'liam.oc@example.com',
    suburb: 'Kwinana',
    pickupAddress: '12 Gilmore Ave, Kwinana WA 6167',
    packageTitle: '1 Hour Driving Lesson',
    packagePrice: 65,
    date: '2026-06-20',
    time: '11:30 AM',
    status: 'Confirmed',
    notes: 'Initial lesson, automatic dual controls requested',
    paymentStatus: 'paid',
    stripeSessionId: null,
    reminderStatus: 'scheduled',
    reminderScheduledFor: '2026-06-20T01:30:00.000Z',
    reminderSentAt: null,
    reminderMessageId: null,
    reminderError: null,
    reminderRecipientPhone: '+61445678901',
    createdAt: new Date('2026-06-04T09:00:00Z'),
    updatedAt: new Date('2026-06-04T09:00:00Z'),
  },
];

let nextBookingId = 10;
let nextUserId = 1;
let nextContactId = 1;

// Helper to convert Supabase row to normalized Booking item
function mapSupabaseRowToBooking(row: any): any {
  let pickup = row.pickup_address || row.pickupAddress || '';
  let ref = row.booking_ref || row.bookingRef || '';
  let suburb = row.suburb || '';
  let price = Number(row.package_price || row.packagePrice || 0);
  let payment = row.payment_status || row.paymentStatus || 'unpaid';

  if (row.notes && typeof row.notes === 'string') {
    if (!pickup) {
      const match = row.notes.match(/\[Pickup:\s*([^\]]+)\]/i) || row.notes.match(/Pickup:\s*([^.]+)/i);
      if (match) pickup = match[1].trim();
    }
    if (!ref) {
      const match = row.notes.match(/\[BookingRef:\s*([^\]]+)\]/i) || row.notes.match(/BookingRef:\s*([A-Z0-9-]+)/i);
      if (match) ref = match[1].trim();
    }
    if (!suburb) {
      const match = row.notes.match(/\[Suburb:\s*([^\]]+)\]/i) || row.notes.match(/Suburb:\s*([^,|]+)/i);
      if (match) suburb = match[1].trim();
    }
    if (!price) {
      const match = row.notes.match(/\[Price:\s*\$?(\d+(?:\.\d+)?)\]/i) || row.notes.match(/Price:\s*\$?(\d+(?:\.\d+)?)/i);
      if (match) price = Number(match[1]);
    }
    if (payment === 'unpaid') {
      const match = row.notes.match(/\[Payment:\s*([^\]]+)\]/i);
      if (match) payment = match[1].trim();
    }
  }

  if (!ref) ref = `WD-${row.id || Math.floor(1000 + Math.random() * 9000)}`;
  if (!price) price = 65;

  return {
    id: row.id || ref,
    bookingRef: ref,
    userId: row.user_id || row.userId || null,
    studentName: row.students?.full_name || row.student_name || row.studentName || 'Learner Driver',
    phone: row.students?.phone || row.phone || '',
    email: row.students?.email || row.email || '',
    suburb: suburb || 'Rockingham & Surrounds',
    pickupAddress: pickup || null,
    packageTitle: row.lesson_type || row.package_title || row.packageTitle || '1 Hour Driving Lesson',
    packagePrice: price,
    date: row.lesson_date || row.date || '',
    time: row.start_time || row.time || '',
    status: row.status || 'Pending',
    notes: row.notes || null,
    paymentStatus: payment,
    stripeSessionId: row.stripe_session_id || row.stripeSessionId || null,
    reminderStatus: row.reminder_status || row.reminderStatus || (row.status === 'Confirmed' ? 'scheduled' : 'pending'),
    reminderScheduledFor: row.reminder_scheduled_for || row.reminderScheduledFor || null,
    reminderSentAt: row.reminder_sent_at || row.reminderSentAt || null,
    reminderMessageId: row.reminder_message_id || row.reminderMessageId || null,
    reminderError: row.reminder_error || row.reminderError || null,
    reminderRecipientPhone: row.reminder_recipient_phone || row.reminderRecipientPhone || null,
    reminderRecipientEmail: row.reminder_recipient_email || row.reminderRecipientEmail || row.email || null,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string
) {
  if (isSqlConfigured && db) {
    try {
      const result = await db
        .insert(users)
        .values({
          uid,
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
          role: 'student',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            displayName: displayName || null,
            photoUrl: photoUrl || null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result[0];
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL getOrCreateUser fallback:', error?.message);
    }
  }

  // In-memory fallback
  let user = inMemoryUsers.get(uid);
  if (!user) {
    user = {
      id: nextUserId++,
      uid,
      email,
      displayName: displayName || null,
      photoUrl: photoUrl || null,
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } else {
    user = {
      ...user,
      email,
      displayName: displayName || user.displayName,
      photoUrl: photoUrl || user.photoUrl,
      updatedAt: new Date(),
    };
  }
  inMemoryUsers.set(uid, user);
  return user;
}

// Fetch bookings with optional email or userId filter
export async function getBookings(filter?: { email?: string; userId?: string; includeUnpaid?: boolean }) {
  const mergedMap = new Map<string, any>();

  // 1. Fetch from Supabase
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, students(*), instructors(*)')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const mapped = mapSupabaseRowToBooking(row);
          if (mapped.bookingRef) {
            mergedMap.set(mapped.bookingRef.toUpperCase(), mapped);
          }
        }
      }
    } catch (err: any) {
      console.warn('[Supabase Server] getBookings notice:', err?.message || err);
    }
  }

  // 2. Fetch from Cloud SQL if configured
  if (isSqlConfigured && db) {
    try {
      const sqlRows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
      for (const row of sqlRows) {
        if (row.bookingRef) {
          mergedMap.set(row.bookingRef.toUpperCase(), row);
        }
      }
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL getBookings notice:', error?.message);
    }
  }

  // 3. Merge in-memory bookings
  for (const b of inMemoryBookings) {
    if (b.bookingRef && !mergedMap.has(b.bookingRef.toUpperCase())) {
      mergedMap.set(b.bookingRef.toUpperCase(), b);
    }
  }

  let list = Array.from(mergedMap.values());
  
  // Strict check: Only paid bookings are returned to students/manage booking
  if (!filter?.includeUnpaid) {
    list = list.filter(b => b.paymentStatus === 'paid');
  }

  if (filter?.userId || filter?.email) {
    list = list.filter(b => 
      (filter.userId && b.userId === filter.userId) || 
      (filter.email && b.email && b.email.toLowerCase() === filter.email.toLowerCase())
    );
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Retrieve single booking by reference code (e.g. WD-8492)
export async function getBookingByRef(bookingRef: string, options?: { allowUnpaid?: boolean }) {
  const cleanRef = bookingRef.trim().toUpperCase();

  // 1. Check Supabase
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, students(*), instructors(*)')
        .ilike('notes', `%${cleanRef}%`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const found = mapSupabaseRowToBooking(data[0]);
        if (found && (options?.allowUnpaid || found.paymentStatus === 'paid')) {
          return found;
        }
      }
    } catch {}
  }

  // 2. Check Cloud SQL
  if (isSqlConfigured && db) {
    try {
      const result = await db
        .select()
        .from(bookings)
        .where(eq(bookings.bookingRef, bookingRef))
        .limit(1);

      if (result[0] && (options?.allowUnpaid || result[0].paymentStatus === 'paid')) {
        return result[0];
      }
    } catch {}
  }

  // 3. Check in-memory
  const found = inMemoryBookings.find(b => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  if (found && (options?.allowUnpaid || found.paymentStatus === 'paid')) {
    return found;
  }
  return null;
}

// Retrieve pending booking for a specific customer on a date & time (to reuse ref during checkout retry)
export async function getPendingBookingForCustomer(
  email?: string,
  phone?: string,
  date?: string,
  time?: string
) {
  const cleanEmail = email?.trim().toLowerCase();
  const cleanPhone = phone?.replace(/\D/g, '');
  const normalizedDate = date?.trim();
  const normalizedTime = time?.trim();

  if (!normalizedDate || !normalizedTime || (!cleanEmail && !cleanPhone)) {
    return null;
  }

  const allBookings = await getBookings();
  return allBookings.find(b => 
    b.date === normalizedDate &&
    b.time === normalizedTime &&
    (b.status === 'Pending' || b.paymentStatus === 'unpaid') &&
    ((cleanEmail && b.email?.toLowerCase() === cleanEmail) ||
     (cleanPhone && b.phone?.replace(/\D/g, '') === cleanPhone))
  ) || null;
}

// Check if a time slot on a specific date is already taken by an active booking (prevent double-booking)

// Helper to normalize any date format into canonical YYYY-MM-DD
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const MONTHS: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  // Format: "15 September 2026", "15 September", "15 Sep 2026"
  const textMatch1 = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:,?\s+(\d{4}))?$/i);
  if (textMatch1) {
    const day = textMatch1[1].padStart(2, '0');
    const mon = textMatch1[2].toLowerCase();
    const month = MONTHS[mon];
    const year = textMatch1[3] || new Date().getFullYear().toString();
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Format: "September 15, 2026", "September 15"
  const textMatch2 = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);
  if (textMatch2) {
    const mon = textMatch2[1].toLowerCase();
    const day = textMatch2[2].padStart(2, '0');
    const month = MONTHS[mon];
    const year = textMatch2[3] || new Date().getFullYear().toString();
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback: Date.parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return trimmed.toLowerCase();
}

// Parse time string into start and end minutes from midnight (handles ranges & single times)
export function parseTimeInterval(timeStr: string, defaultDurationMinutes = 60): { start: number; end: number } | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().replace(/\s+/g, ' ');

  // 1. Range match: "10:00 AM – 11:00 AM", "10:00–11:00 AM", "10:00–11:00", "9:30–10:30", "10:15–11:15"
  // Handles -, –, —, to
  const rangeMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i) ||
                     trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);

  if (rangeMatch) {
    const parsePart = (hStr: string, mStr: string | undefined, ampmStr: string | undefined) => {
      let h = parseInt(hStr, 10);
      const m = mStr ? parseInt(mStr, 10) : 0;
      const ampm = (ampmStr || '').toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    let startAmpm = rangeMatch[3];
    let endAmpm = rangeMatch[6];

    const startH = parseInt(rangeMatch[1], 10);
    const endH = parseInt(rangeMatch[4], 10);

    // If neither has AM/PM, infer daytime driving school hours (7:00 AM - 7:00 PM)
    if (!startAmpm && !endAmpm) {
      startAmpm = (startH >= 7 && startH <= 12) ? 'AM' : 'PM';
      endAmpm = (endH >= 7 && endH <= 12) ? 'AM' : 'PM';
    } else if (!startAmpm && endAmpm) {
      if (endAmpm.toUpperCase() === 'PM' && startH <= endH && startH >= 12) {
        startAmpm = 'PM';
      } else if (endAmpm.toUpperCase() === 'PM' && startH > endH && startH <= 12) {
        startAmpm = 'AM';
      } else {
        startAmpm = endAmpm;
      }
    } else if (startAmpm && !endAmpm) {
      if (startAmpm.toUpperCase() === 'AM' && endH < startH) {
        endAmpm = 'PM';
      } else {
        endAmpm = startAmpm;
      }
    }

    const start = parsePart(rangeMatch[1], rangeMatch[2], startAmpm);
    const end = parsePart(rangeMatch[4], rangeMatch[5], endAmpm);
    return { start, end: end > start ? end : start + defaultDurationMinutes };
  }

  // 2. Single time match: "10:00 AM", "10:00AM", "10:00", "9:30 AM", "11:00 AM"
  const singleMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (singleMatch) {
    let h = parseInt(singleMatch[1], 10);
    const m = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    let ampm = (singleMatch[3] || '').toUpperCase();
    if (!ampm) {
      ampm = (h >= 7 && h <= 12) ? 'AM' : 'PM';
    }
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const start = h * 60 + m;
    return { start, end: start + defaultDurationMinutes };
  }

  return null;
}

// Determines if two time intervals overlap when taking the buffer into account
export function isTimeSlotConflicting(
  slot1: { start: number; end: number },
  slot2: { start: number; end: number },
  bufferMinutes = 30
): boolean {
  // With buffer: slot1 conflicts with slot2 if slot1 overlaps the protected window [slot2.start - buffer, slot2.end + buffer]
  // i.e. slot1.start < slot2.end + buffer AND slot1.end > slot2.start - buffer
  return (slot1.start < slot2.end + bufferMinutes) && (slot1.end > slot2.start - bufferMinutes);
}

// Strictly serialized async mutex lock manager to guarantee zero race condition double bookings
export class BookingLockManager {
  private queues = new Map<string, Promise<any>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const normalizedKey = key.trim().toLowerCase();
    const prevPromise = this.queues.get(normalizedKey) || Promise.resolve();

    let releaseLock: () => void;
    const lockGate = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const nextInQueue = prevPromise.then(() => lockGate, () => lockGate);
    this.queues.set(normalizedKey, nextInQueue);

    // Wait strictly for prior operation to finish completely
    await prevPromise.catch(() => {});

    try {
      return await fn();
    } finally {
      releaseLock!();
      if (this.queues.get(normalizedKey) === nextInQueue) {
        this.queues.delete(normalizedKey);
      }
    }
  }
}

export const bookingLock = new BookingLockManager();

// ============================================================================
// Instructor Time Off & Availability Management
// ============================================================================

export interface TimeOffBlock {
  id: number | string;
  instructorId: string;
  instructorName: string;
  date: string; // 'YYYY-MM-DD'
  isFullDay: boolean; // true = full day off, false = partial time window
  startTime?: string | null; // 24-hour e.g. "09:00"
  endTime?: string | null;   // 24-hour e.g. "13:00"
  startMinutes?: number | null; // e.g. 540
  endMinutes?: number | null;   // e.g. 780
  displayStartTime?: string | null; // e.g. "09:00 AM"
  displayEndTime?: string | null;   // e.g. "01:00 PM"
  reason?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const TIME_OFF_FILE = path.join(process.cwd(), 'data', 'instructor-time-off.json');
const TIME_OFF_TMP_FILE = path.join('/tmp', 'instructor-time-off.json');

function readTimeOffFile(): TimeOffBlock[] {
  try {
    let rawData: string | null = null;
    if (fs.existsSync(TIME_OFF_FILE)) {
      rawData = fs.readFileSync(TIME_OFF_FILE, 'utf-8');
    } else if (fs.existsSync(TIME_OFF_TMP_FILE)) {
      rawData = fs.readFileSync(TIME_OFF_TMP_FILE, 'utf-8');
    }

    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        let changed = false;
        const normalized: TimeOffBlock[] = parsed.map((item, idx) => {
          let id = item.id;
          if (id === undefined || id === null || String(id).trim() === '' || String(id) === 'undefined' || String(id) === 'null') {
            id = `block_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
            changed = true;
          }
          const isFull = Boolean(item.isFullDay);
          const sMin = item.startMinutes ?? (item.startTime ? timeStringToMinutes(item.startTime) : null);
          const eMin = item.endMinutes ?? (item.endTime ? timeStringToMinutes(item.endTime) : null);
          return {
            id,
            instructorId: item.instructorId || 'wally',
            instructorName: item.instructorName || 'Wally',
            date: normalizeDate(item.date) || item.date,
            isFullDay: isFull,
            startTime: isFull ? null : (item.startTime ? (to24HourTime(item.startTime) || item.startTime) : null),
            endTime: isFull ? null : (item.endTime ? (to24HourTime(item.endTime) || item.endTime) : null),
            startMinutes: isFull ? null : sMin,
            endMinutes: isFull ? null : eMin,
            displayStartTime: isFull ? null : (sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(item.startTime)),
            displayEndTime: isFull ? null : (eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(item.endTime)),
            reason: item.reason || null,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString()
          };
        });
        if (changed) {
          writeTimeOffFile(normalized);
        }
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[TimeOff] Error reading time-off file:', err);
  }
  return [];
}

function writeTimeOffFile(blocks: TimeOffBlock[]) {
  // Strictly deduplicate before writing
  const seenKeys = new Set<string>();
  const deduped = blocks.filter(b => {
    const idKey = b.id ? `id_${String(b.id)}` : '';
    const dateSlotKey = `date_${b.date}_${b.isFullDay ? 'FULL' : `${b.startTime || ''}-${b.endTime || ''}`}`;
    if (idKey && seenKeys.has(idKey)) return false;
    if (seenKeys.has(dateSlotKey)) return false;
    if (idKey) seenKeys.add(idKey);
    seenKeys.add(dateSlotKey);
    return true;
  });

  const content = JSON.stringify(deduped, null, 2);
  try {
    const dir = path.dirname(TIME_OFF_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TIME_OFF_FILE, content, 'utf-8');
  } catch (err) {
    // Expected on read-only environments like Vercel serverless
  }

  // Also write to /tmp as local fallback in serverless containers
  try {
    fs.writeFileSync(TIME_OFF_TMP_FILE, content, 'utf-8');
  } catch (err) {
    // Ignore /tmp write errors
  }
}

// In-memory cache synced with disk and database
let inMemoryTimeOff: TimeOffBlock[] = readTimeOffFile();

export function timeStringToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().replace(/\s+/g, ' ');
  
  // 12-hour format e.g. "1:00 PM", "01:30 PM", "9:00 AM"
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2] ? parseInt(match12[2], 10) : 0;
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  
  // 24-hour format HH:MM e.g. "13:00", "09:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }

  return null;
}

export function minutesToTimeString(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${h12}:${mStr} ${ampm}`;
}

export function minutesTo24HourTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function to24HourTime(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const mins = timeStringToMinutes(timeStr);
  if (mins === null) return null;
  return minutesTo24HourTime(mins);
}

export function to12HourDisplay(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const mins = timeStringToMinutes(timeStr);
  if (mins === null) return timeStr;
  return minutesToTimeString(mins);
}

let timeOffTableInitialized = false;
async function ensureTimeOffTable() {
  if (!db || !isSqlConfigured || timeOffTableInitialized) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_time_off (
        id SERIAL PRIMARY KEY,
        instructor_id TEXT NOT NULL DEFAULT 'wally',
        instructor_name TEXT NOT NULL DEFAULT 'Wally',
        date TEXT NOT NULL,
        is_full_day INTEGER NOT NULL DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        start_minutes INTEGER,
        end_minutes INTEGER,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS time_off_date_idx ON instructor_time_off(date);
      CREATE INDEX IF NOT EXISTS time_off_instructor_idx ON instructor_time_off(instructor_id);
    `);
    timeOffTableInitialized = true;
  } catch (err) {
    console.warn('[TimeOff] ensureTimeOffTable notice:', err);
  }
}

let settingsTableInitialized = false;
async function ensureInstructorSettingsTable() {
  if (!db || !isSqlConfigured || settingsTableInitialized) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_settings (
        id SERIAL PRIMARY KEY,
        instructor_id TEXT NOT NULL UNIQUE DEFAULT 'wally',
        settings_json TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    settingsTableInitialized = true;
  } catch (err) {
    console.warn('[InstructorSettings] ensureInstructorSettingsTable notice:', err);
  }
}

export async function getInstructorSettingsDb(instructorId = 'wally'): Promise<any | null> {
  const normId = (instructorId || 'wally').trim().toLowerCase();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('instructor_settings')
        .select('settings_json')
        .eq('instructor_id', normId)
        .maybeSingle();
      if (!error && data?.settings_json) {
        const parsed = typeof data.settings_json === 'string' ? JSON.parse(data.settings_json) : data.settings_json;
        inMemoryInstructorSettings.set(normId, parsed);
        return parsed;
      }
    } catch {}
  }

  if (db && isSqlConfigured) {
    try {
      await ensureInstructorSettingsTable();
      const res: any = await db.execute(`
        SELECT settings_json FROM instructor_settings WHERE instructor_id = '${normId.replace(/'/g, "''")}' LIMIT 1;
      `);
      const row = res?.rows?.[0] || res?.[0];
      if (row?.settings_json) {
        const parsed = typeof row.settings_json === 'string' ? JSON.parse(row.settings_json) : row.settings_json;
        inMemoryInstructorSettings.set(normId, parsed);
        return parsed;
      }
    } catch {}
  }

  // Check in-memory store
  if (inMemoryInstructorSettings.has(normId)) {
    return inMemoryInstructorSettings.get(normId);
  }

  // Check file-system fallback
  try {
    const settingsFile = path.join(process.cwd(), 'data', `instructor-settings-${normId}.json`);
    if (fs.existsSync(settingsFile)) {
      const raw = fs.readFileSync(settingsFile, 'utf-8');
      const parsed = JSON.parse(raw);
      inMemoryInstructorSettings.set(normId, parsed);
      return parsed;
    }
  } catch {}

  return null;
}

export async function saveInstructorSettingsDb(instructorId = 'wally', settings: any): Promise<boolean> {
  const normId = (instructorId || 'wally').trim().toLowerCase();
  const jsonStr = JSON.stringify(settings);
  let saved = false;

  // Save to in-memory fallback
  inMemoryInstructorSettings.set(normId, settings);

  // Save to file system
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `instructor-settings-${normId}.json`), jsonStr, 'utf-8');
    saved = true;
  } catch {}

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('instructor_settings')
        .upsert({
          instructor_id: normId,
          settings_json: jsonStr,
          updated_at: new Date().toISOString()
        }, { onConflict: 'instructor_id' });
      if (!error) saved = true;
    } catch {}
  }

  if (db && isSqlConfigured) {
    try {
      await ensureInstructorSettingsTable();
      const safeJson = jsonStr.replace(/'/g, "''");
      const safeId = normId.replace(/'/g, "''");
      await db.execute(`
        INSERT INTO instructor_settings (instructor_id, settings_json, updated_at)
        VALUES ('${safeId}', '${safeJson}', CURRENT_TIMESTAMP)
        ON CONFLICT (instructor_id) DO UPDATE
        SET settings_json = EXCLUDED.settings_json,
            updated_at = CURRENT_TIMESTAMP;
      `);
      saved = true;
    } catch {}
  }

  return saved;
}

export const DEFAULT_WEEKLY_DAYS_OFF: InstructorWeeklyDaysOff = {
  monday: true,    // true = ON (Available), false = OFF (Day Off)
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: true,
};

const DAY_INDEX_MAP: Record<WeekdayKey, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export async function getInstructorWeeklyDaysOff(instructorId = 'wally'): Promise<InstructorDayOffSettings> {
  const normId = (instructorId || 'wally').trim().toLowerCase();
  const settings = await getInstructorSettingsDb(normId);

  const weeklyDaysOff: InstructorWeeklyDaysOff = {
    ...DEFAULT_WEEKLY_DAYS_OFF,
    ...(settings?.weeklyDaysOff || {})
  };

  // If weeklyDaysOff was not explicitly stored but disabledDays was:
  if (!settings?.weeklyDaysOff && Array.isArray(settings?.disabledDays)) {
    const dayNames: WeekdayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    settings.disabledDays.forEach((dayNum: number) => {
      const k = dayNames[dayNum];
      if (k) weeklyDaysOff[k] = false;
    });
  }

  const disabledDays: number[] = [];
  const disabledWeekdays: WeekdayKey[] = [];

  (Object.keys(weeklyDaysOff) as WeekdayKey[]).forEach(day => {
    if (weeklyDaysOff[day] === false) {
      disabledDays.push(DAY_INDEX_MAP[day]);
      disabledWeekdays.push(day);
    }
  });

  return {
    instructorId: normId,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: settings?.updatedAt || new Date().toISOString()
  };
}

export async function saveInstructorWeeklyDaysOff(
  instructorId = 'wally', 
  weeklyDaysOff: InstructorWeeklyDaysOff
): Promise<InstructorDayOffSettings> {
  const normId = (instructorId || 'wally').trim().toLowerCase();
  const existing = (await getInstructorSettingsDb(normId)) || {};

  const disabledDays: number[] = [];
  const disabledWeekdays: WeekdayKey[] = [];

  (Object.keys(weeklyDaysOff) as WeekdayKey[]).forEach(day => {
    if (weeklyDaysOff[day] === false) {
      disabledDays.push(DAY_INDEX_MAP[day]);
      disabledWeekdays.push(day);
    }
  });

  const updated = {
    ...existing,
    instructorId: normId,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: new Date().toISOString()
  };

  await saveInstructorSettingsDb(normId, updated);

  return {
    instructorId: normId,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: updated.updatedAt
  };
}

// Retrieve time-off blocks, filtered by instructorId if provided
export async function getTimeOffBlocks(instructorId?: string): Promise<TimeOffBlock[]> {
  await ensureTimeOffTable();

  // 1. Try fetching from Supabase if configured (essential for Vercel and cloud deployments)
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('instructor_time_off')
        .select('*')
        .order('date', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mapped: TimeOffBlock[] = data.map(r => {
          const sMin = r.start_minutes ?? (r.start_time ? timeStringToMinutes(r.start_time) : null);
          const eMin = r.end_minutes ?? (r.end_time ? timeStringToMinutes(r.end_time) : null);
          const s24 = sMin !== null ? minutesTo24HourTime(sMin) : (r.start_time ? to24HourTime(r.start_time) : null);
          const e24 = eMin !== null ? minutesTo24HourTime(eMin) : (r.end_time ? to24HourTime(r.end_time) : null);
          const isFull = Boolean(r.is_full_day);

          return {
            id: r.id,
            instructorId: r.instructor_id || 'wally',
            instructorName: r.instructor_name || 'Wally',
            date: normalizeDate(r.date) || r.date,
            isFullDay: isFull,
            startTime: isFull ? null : s24,
            endTime: isFull ? null : e24,
            startMinutes: isFull ? null : sMin,
            endMinutes: isFull ? null : eMin,
            displayStartTime: isFull ? null : (sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(r.start_time)),
            displayEndTime: isFull ? null : (eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(r.end_time)),
            reason: r.reason || null,
            createdAt: r.created_at ? new Date(r.created_at) : new Date(),
            updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
          };
        });

        // Keep in-memory store and file synced with latest DB state
        if (mapped.length > 0 || (inMemoryTimeOff.length === 0 && readTimeOffFile().length === 0)) {
          inMemoryTimeOff = mapped;
          writeTimeOffFile(mapped);
        } else if (mapped.length === 0 && (inMemoryTimeOff.length > 0 || readTimeOffFile().length > 0)) {
          // If Supabase table is empty but local file has blocks, retain local blocks
          const localBlocks = inMemoryTimeOff.length > 0 ? inMemoryTimeOff : readTimeOffFile();
          mapped.push(...localBlocks);
        }

        if (instructorId) {
          return mapped.filter(b => b.instructorId.toLowerCase() === instructorId.toLowerCase());
        }
        return mapped;
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Supabase fetch notice:', sbErr);
    }
  }

  // Try fetching from SQL DB if configured
  if (db && isSqlConfigured) {
    try {
      const rows = await db.select().from(instructorTimeOff);
      if (rows) {
        const mapped: TimeOffBlock[] = rows.map(r => {
          const sMin = r.startMinutes ?? (r.startTime ? timeStringToMinutes(r.startTime) : null);
          const eMin = r.endMinutes ?? (r.endTime ? timeStringToMinutes(r.endTime) : null);
          const s24 = sMin !== null ? minutesTo24HourTime(sMin) : (r.startTime ? to24HourTime(r.startTime) : null);
          const e24 = eMin !== null ? minutesTo24HourTime(eMin) : (r.endTime ? to24HourTime(r.endTime) : null);
          const isFull = Boolean(r.isFullDay);

          return {
            id: r.id,
            instructorId: r.instructorId || 'wally',
            instructorName: r.instructorName || 'Wally',
            date: normalizeDate(r.date) || r.date,
            isFullDay: isFull,
            startTime: isFull ? null : s24,
            endTime: isFull ? null : e24,
            startMinutes: isFull ? null : sMin,
            endMinutes: isFull ? null : eMin,
            displayStartTime: isFull ? null : (sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(r.startTime)),
            displayEndTime: isFull ? null : (eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(r.endTime)),
            reason: r.reason,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
          };
        });

        // Keep in-memory store and file synced with latest DB state
        inMemoryTimeOff = mapped;
        writeTimeOffFile(mapped);

        if (instructorId) {
          return mapped.filter(b => b.instructorId.toLowerCase() === instructorId.toLowerCase());
        }
        return mapped;
      }
    } catch (err) {
      console.warn('[TimeOff] SQL fetch error, falling back to cached file/memory store:', err);
    }
  }

  // Always re-read from disk file to ensure 100% real-time synchronization
  inMemoryTimeOff = readTimeOffFile();

  const normalizedMem = inMemoryTimeOff.map(b => {
    const sMin = b.startMinutes ?? (b.startTime ? timeStringToMinutes(b.startTime) : null);
    const eMin = b.endMinutes ?? (b.endTime ? timeStringToMinutes(b.endTime) : null);
    const s24 = sMin !== null ? minutesTo24HourTime(sMin) : (b.startTime ? to24HourTime(b.startTime) : null);
    const e24 = eMin !== null ? minutesTo24HourTime(eMin) : (b.endTime ? to24HourTime(b.endTime) : null);
    const isFull = Boolean(b.isFullDay);
    return {
      ...b,
      instructorId: b.instructorId || 'wally',
      instructorName: b.instructorName || 'Wally',
      date: normalizeDate(b.date) || b.date,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: isFull ? null : sMin,
      endMinutes: isFull ? null : eMin,
      displayStartTime: isFull ? null : (sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(b.startTime)),
      displayEndTime: isFull ? null : (eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(b.endTime)),
    };
  });

  if (instructorId && typeof instructorId === 'string' && instructorId.trim() !== '') {
    const filterId = instructorId.trim().toLowerCase();
    return normalizedMem.filter(b => (b.instructorId || 'wally').toLowerCase() === filterId);
  }
  return normalizedMem;
}

// Check for conflicting active bookings before saving a time-off block
export async function checkTimeOffBookingConflicts(
  date: string,
  isFullDay: boolean,
  startMinutes?: number,
  endMinutes?: number,
  instructorId?: string,
  excludeBlockId?: number | string
): Promise<{ hasConflict: boolean; conflicts: any[] }> {
  const normTargetDate = normalizeDate(date);
  if (!normTargetDate) return { hasConflict: false, conflicts: [] };

  const allBookings = await getBookings({ includeUnpaid: true });
  const activeBookings = allBookings.filter(b => {
    if (b.status === 'Cancelled') return false;
    const bDate = normalizeDate(b.date);
    return bDate === normTargetDate;
  });

  const conflicts: any[] = [];

  for (const b of activeBookings) {
    if (isFullDay) {
      conflicts.push({
        id: b.id,
        bookingRef: b.bookingRef,
        studentName: b.studentName,
        date: b.date,
        time: b.time,
        phone: b.phone,
        email: b.email,
        packageTitle: b.packageTitle,
        suburb: b.suburb,
        pickupAddress: b.pickupAddress,
        status: b.status,
        conflictReason: 'Full day off overlaps this confirmed lesson'
      });
      continue;
    }

    if (startMinutes !== undefined && endMinutes !== undefined) {
      let bInterval = parseTimeInterval(b.time);
      if (!bInterval) {
        const bStart = timeStringToMinutes(b.time);
        if (bStart !== null) {
          bInterval = { start: bStart, end: bStart + 60 };
        }
      }
      if (bInterval) {
        // A lesson overlaps the block if: bookingStart < blockEnd AND bookingEnd > blockStart
        const overlaps = (bInterval.start < endMinutes) && (bInterval.end > startMinutes);
        if (overlaps) {
          conflicts.push({
            id: b.id,
            bookingRef: b.bookingRef,
            studentName: b.studentName,
            date: b.date,
            time: b.time,
            phone: b.phone,
            email: b.email,
            packageTitle: b.packageTitle,
            suburb: b.suburb,
            pickupAddress: b.pickupAddress,
            status: b.status,
            conflictReason: `Lesson (${b.time}) overlaps requested time-off period`
          });
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

// Create a new time off block
export async function createTimeOffBlock(data: {
  instructorId?: string;
  instructorName?: string;
  date: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
  overrideConflicts?: boolean;
}): Promise<TimeOffBlock> {
  await ensureTimeOffTable();

  const normDate = normalizeDate(data.date) || data.date;
  const isFull = Boolean(data.isFullDay);
  let startMin: number | null = null;
  let endMin: number | null = null;
  let s24: string | null = null;
  let e24: string | null = null;

  if (!isFull && data.startTime && data.endTime) {
    startMin = timeStringToMinutes(data.startTime);
    endMin = timeStringToMinutes(data.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) {
      throw new Error("Invalid time window: End time must be after start time.");
    }
    s24 = minutesTo24HourTime(startMin);
    e24 = minutesTo24HourTime(endMin);
  }

  // Pre-check for booking conflicts
  if (!data.overrideConflicts) {
    const conflictCheck = await checkTimeOffBookingConflicts(
      normDate,
      isFull,
      startMin ?? undefined,
      endMin ?? undefined,
      data.instructorId
    );

    if (conflictCheck.hasConflict) {
      const error: any = new Error(`Cannot block time: this period overlaps ${conflictCheck.conflicts.length} existing booking(s). Please resolve them first.`);
      error.code = 'BOOKING_CONFLICT';
      error.conflicts = conflictCheck.conflicts;
      throw error;
    }
  }

  const now = new Date();
  let createdBlock: TimeOffBlock;

  // If Supabase is configured, persist directly to Supabase cloud table (essential for Vercel/cloud serverless)
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const sbPayload = {
        instructor_id: data.instructorId || 'wally',
        instructor_name: data.instructorName || 'Wally',
        date: normDate,
        is_full_day: isFull,
        start_time: isFull ? null : s24,
        end_time: isFull ? null : e24,
        start_minutes: startMin,
        end_minutes: endMin,
        reason: data.reason?.trim() || null,
        updated_at: now.toISOString(),
      };

      // Remove any prior block for the same date in Supabase
      try {
        await supabase.from('instructor_time_off').delete().eq('date', normDate);
      } catch {
        // Ignore
      }
      const { data: insertedRows, error: sbInsertErr } = await supabase
        .from('instructor_time_off')
        .insert([sbPayload])
        .select('*');

      if (!sbInsertErr && insertedRows && insertedRows[0]) {
        createdBlock = {
          id: insertedRows[0].id,
          instructorId: insertedRows[0].instructor_id,
          instructorName: insertedRows[0].instructor_name,
          date: insertedRows[0].date,
          isFullDay: Boolean(insertedRows[0].is_full_day),
          startTime: insertedRows[0].start_time,
          endTime: insertedRows[0].end_time,
          startMinutes: insertedRows[0].start_minutes,
          endMinutes: insertedRows[0].end_minutes,
          displayStartTime: isFull ? null : to12HourDisplay(insertedRows[0].start_time),
          displayEndTime: isFull ? null : to12HourDisplay(insertedRows[0].end_time),
          reason: insertedRows[0].reason,
          createdAt: new Date(insertedRows[0].created_at || now),
          updatedAt: new Date(insertedRows[0].updated_at || now),
        };
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Supabase insert notice:', sbErr);
    }
  }

  if (db && isSqlConfigured) {
    try {
      const [inserted] = await db.insert(instructorTimeOff).values({
        instructorId: data.instructorId || 'wally',
        instructorName: data.instructorName || 'Wally',
        date: normDate,
        isFullDay: isFull ? 1 : 0,
        startTime: isFull ? null : s24,
        endTime: isFull ? null : e24,
        startMinutes: startMin,
        endMinutes: endMin,
        reason: data.reason?.trim() || null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      createdBlock = {
        id: inserted.id,
        instructorId: inserted.instructorId,
        instructorName: inserted.instructorName,
        date: inserted.date,
        isFullDay: Boolean(inserted.isFullDay),
        startTime: inserted.startTime,
        endTime: inserted.endTime,
        startMinutes: inserted.startMinutes,
        endMinutes: inserted.endMinutes,
        displayStartTime: isFull ? null : to12HourDisplay(inserted.startTime),
        displayEndTime: isFull ? null : to12HourDisplay(inserted.endTime),
        reason: inserted.reason,
        createdAt: inserted.createdAt ? new Date(inserted.createdAt) : now,
        updatedAt: inserted.updatedAt ? new Date(inserted.updatedAt) : now,
      };
    } catch (err) {
      console.warn('[TimeOff] Failed inserting to SQL, generating local ID:', err);
      createdBlock = {
        id: Date.now(),
        instructorId: data.instructorId || 'wally',
        instructorName: data.instructorName || 'Wally',
        date: normDate,
        isFullDay: isFull,
        startTime: isFull ? null : s24,
        endTime: isFull ? null : e24,
        startMinutes: startMin,
        endMinutes: endMin,
        displayStartTime: isFull ? null : to12HourDisplay(data.startTime),
        displayEndTime: isFull ? null : to12HourDisplay(data.endTime),
        reason: data.reason?.trim() || null,
        createdAt: now,
        updatedAt: now,
      };
    }
  } else if (!createdBlock) {
    createdBlock = {
      id: Date.now(),
      instructorId: data.instructorId || 'wally',
      instructorName: data.instructorName || 'Wally',
      date: normDate,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: startMin,
      endMinutes: endMin,
      displayStartTime: isFull ? null : to12HourDisplay(data.startTime),
      displayEndTime: isFull ? null : to12HourDisplay(data.endTime),
      reason: data.reason?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Update in-memory and disk file
  inMemoryTimeOff.push(createdBlock);
  writeTimeOffFile(inMemoryTimeOff);

  return createdBlock;
}

// Update an existing time off block
export async function updateTimeOffBlock(
  id: number | string,
  data: {
    date: string;
    isFullDay: boolean;
    startTime?: string;
    endTime?: string;
    reason?: string;
    overrideConflicts?: boolean;
  },
  fallbackDate?: string
): Promise<TimeOffBlock> {
  await ensureTimeOffTable();

  const strId = String(id).trim();
  const numId = (!isNaN(Number(id)) && Number(id) <= 2147483647 && Number(id) > 0) ? Number(id) : null;

  const normDate = normalizeDate(data.date) || data.date;
  const isFull = Boolean(data.isFullDay);
  let startMin: number | null = null;
  let endMin: number | null = null;
  let s24: string | null = null;
  let e24: string | null = null;

  if (!isFull && data.startTime && data.endTime) {
    startMin = timeStringToMinutes(data.startTime);
    endMin = timeStringToMinutes(data.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) {
      throw new Error("Invalid time window: End time must be after start time.");
    }
    s24 = minutesTo24HourTime(startMin);
    e24 = minutesTo24HourTime(endMin);
  }

  // Pre-check for booking conflicts
  if (!data.overrideConflicts) {
    const conflictCheck = await checkTimeOffBookingConflicts(
      normDate,
      isFull,
      startMin ?? undefined,
      endMin ?? undefined,
      undefined,
      id
    );

    if (conflictCheck.hasConflict) {
      const error: any = new Error(`Cannot update block: this period overlaps ${conflictCheck.conflicts.length} existing booking(s). Please resolve them first.`);
      error.code = 'BOOKING_CONFLICT';
      error.conflicts = conflictCheck.conflicts;
      throw error;
    }
  }

  const now = new Date();
  let updatedBlock: TimeOffBlock | null = null;

  // 1. Try SQL update if SQL is configured and numId is a valid Postgres serial integer
  if (db && isSqlConfigured && numId !== null) {
    try {
      const [updated] = await db.update(instructorTimeOff)
        .set({
          date: normDate,
          isFullDay: isFull ? 1 : 0,
          startTime: isFull ? null : s24,
          endTime: isFull ? null : e24,
          startMinutes: startMin,
          endMinutes: endMin,
          reason: data.reason?.trim() || null,
          updatedAt: now,
        })
        .where(eq(instructorTimeOff.id, numId))
        .returning();

      if (updated) {
        updatedBlock = {
          id: updated.id,
          instructorId: updated.instructorId,
          instructorName: updated.instructorName,
          date: updated.date,
          isFullDay: Boolean(updated.isFullDay),
          startTime: updated.startTime,
          endTime: updated.endTime,
          startMinutes: updated.startMinutes,
          endMinutes: updated.endMinutes,
          displayStartTime: isFull ? null : to12HourDisplay(updated.startTime),
          displayEndTime: isFull ? null : to12HourDisplay(updated.endTime),
          reason: updated.reason,
          createdAt: updated.createdAt ? new Date(updated.createdAt) : now,
          updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : now,
        };
      }
    } catch (err) {
      console.warn('[TimeOff] Failed updating in SQL:', err);
    }
  }

  // 2. Locate in in-memory array and file store
  inMemoryTimeOff = readTimeOffFile();

  let idx = inMemoryTimeOff.findIndex(b => {
    const bStr = String(b.id || '').trim();
    if (strId && (bStr === strId || bStr === decodeURIComponent(strId))) return true;
    if (numId !== null && !isNaN(Number(b.id)) && Number(b.id) === numId) return true;
    if (fallbackDate && b.date === fallbackDate) return true;
    return false;
  });

  if (idx !== -1) {
    const existing = inMemoryTimeOff[idx];
    const updatedMem: TimeOffBlock = {
      ...existing,
      date: normDate,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: startMin,
      endMinutes: endMin,
      displayStartTime: isFull ? null : to12HourDisplay(data.startTime || existing.startTime),
      displayEndTime: isFull ? null : to12HourDisplay(data.endTime || existing.endTime),
      reason: data.reason?.trim() || null,
      updatedAt: now,
    };
    inMemoryTimeOff[idx] = updatedMem;
    writeTimeOffFile(inMemoryTimeOff);
    if (!updatedBlock) {
      updatedBlock = updatedMem;
    }
  }

  if (!updatedBlock) {
    // If not found in file or memory, create it as the updated block so state doesn't get lost
    updatedBlock = {
      id: id || `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      instructorId: 'wally',
      instructorName: 'Wally',
      date: normDate,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: startMin,
      endMinutes: endMin,
      displayStartTime: isFull ? null : to12HourDisplay(data.startTime),
      displayEndTime: isFull ? null : to12HourDisplay(data.endTime),
      reason: data.reason?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryTimeOff.push(updatedBlock);
    writeTimeOffFile(inMemoryTimeOff);
  }

  return updatedBlock;
}

// Delete a time off block to restore availability
export async function deleteTimeOffBlock(id: number | string, fallbackDate?: string): Promise<boolean> {
  await ensureTimeOffTable();

  // Read current file to identify the target item if possible
  const currentBlocks = readTimeOffFile();
  const strId = String(id || '').trim();
  const numId = (!isNaN(Number(strId)) && Number(strId) > 0) ? Number(strId) : null;
  const is32Bit = numId !== null && numId <= 2147483647;

  // Find target item to get its exact date
  const targetItem = currentBlocks.find(b => {
    const bStr = String(b.id || '').trim();
    if (strId && (bStr === strId || bStr === decodeURIComponent(strId))) return true;
    if (numId !== null && !isNaN(Number(b.id)) && Number(b.id) === numId) return true;
    if (fallbackDate && (b.date === fallbackDate || normalizeDate(b.date) === normalizeDate(fallbackDate))) return true;
    return false;
  });

  const targetDate = targetItem?.date || fallbackDate;
  const targetNormDate = targetDate ? normalizeDate(targetDate) : undefined;

  // Delete from Supabase if configured (for Vercel & cloud production)
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      if (numId !== null) {
        try {
          await supabase.from('instructor_time_off').delete().eq('id', numId);
        } catch {
          // Ignore
        }
      }
      if (targetNormDate) {
        try {
          await supabase.from('instructor_time_off').delete().eq('date', targetNormDate);
        } catch {
          // Ignore
        }
      }
      if (targetDate && targetDate !== targetNormDate) {
        try {
          await supabase.from('instructor_time_off').delete().eq('date', targetDate);
        } catch {
          // Ignore
        }
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Supabase delete notice:', sbErr);
    }
  }

  if (db && isSqlConfigured) {
    try {
      if (is32Bit && numId !== null) {
        await db.delete(instructorTimeOff).where(eq(instructorTimeOff.id, numId));
      }
      if (targetNormDate) {
        await db.delete(instructorTimeOff).where(eq(instructorTimeOff.date, targetNormDate));
      }
      if (targetDate && targetDate !== targetNormDate) {
        await db.delete(instructorTimeOff).where(eq(instructorTimeOff.date, targetDate));
      }
    } catch (err) {
      console.warn('[TimeOff] Failed deleting from SQL:', err);
    }
  }

  // Filter in-memory & file store
  inMemoryTimeOff = currentBlocks.filter(b => {
    const bStr = String(b.id || '').trim();
    if (strId && (bStr === strId || bStr === decodeURIComponent(strId))) {
      return false;
    }
    if (numId !== null && !isNaN(Number(b.id)) && Number(b.id) === numId) {
      return false;
    }
    if (targetNormDate && normalizeDate(b.date) === targetNormDate) {
      return false;
    }
    if (fallbackDate && (b.date === fallbackDate || normalizeDate(b.date) === normalizeDate(fallbackDate))) {
      return false;
    }
    return true;
  });

  writeTimeOffFile(inMemoryTimeOff);
  return true;
}

export async function clearAllTimeOffBlocks(instructorId?: string): Promise<boolean> {
  await ensureTimeOffTable();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      if (instructorId) {
        await supabase.from('instructor_time_off').delete().eq('instructor_id', instructorId);
      } else {
        await supabase.from('instructor_time_off').delete().neq('id', 0);
      }
    } catch {}
  }
  if (db) {
    try {
      await db.delete(instructorTimeOff);
    } catch {}
  }
  inMemoryTimeOff = [];
  writeTimeOffFile([]);
  return true;
}

// Authoritatively test if a date or time slot is blocked by instructor availability, operating hours, breaks, or external calendar
export async function checkDateOrSlotBlockedByTimeOff(
  date: string,
  time: string,
  instructorId = 'wally'
): Promise<{ blocked: boolean; reason?: string; isFullDay?: boolean }> {
  try {
    const { getAvailability } = await import('../server/centralAvailabilityService.ts');
    const res = await getAvailability({
      date,
      requestedTime: time,
      instructorId
    });

    if (!res.available && (res.reason === 'INSTRUCTOR_DAY_OFF' || res.reason === 'SCHOOL_CLOSED' || res.reason === 'OUTSIDE_OPERATING_HOURS')) {
      return {
        blocked: true,
        isFullDay: Boolean(res.isDayOff || res.isClosed),
        reason: res.message
      };
    }
    return { blocked: false };
  } catch (err) {
    console.warn('[checkDateOrSlotBlockedByTimeOff] Falling back on error:', err);
    return { blocked: false };
  }
}

async function _legacyCheckDateOrSlotBlockedByTimeOff(
  date: string,
  time: string,
  instructorId?: string
): Promise<{ blocked: boolean; reason?: string; isFullDay?: boolean }> {
  const normDate = normalizeDate(date);
  if (!normDate) return { blocked: false };

  // Parse candidate slot interval
  let bookingStart: number | null = null;
  let bookingEnd: number | null = null;
  const slotInterval = parseTimeInterval(time);
  if (slotInterval) {
    bookingStart = slotInterval.start;
    bookingEnd = slotInterval.end;
  } else {
    bookingStart = timeStringToMinutes(time);
    if (bookingStart !== null) {
      bookingEnd = bookingStart + 60;
    }
  }

  // 1. Check Date-Specific Overrides (Highest priority date exception)
  try {
    const overridesFile = path.join(process.cwd(), 'data', 'date-overrides.json');
    if (fs.existsSync(overridesFile)) {
      const overrides: any[] = JSON.parse(fs.readFileSync(overridesFile, 'utf-8'));
      const override = overrides.find(o => normalizeDate(o.date) === normDate);
      if (override) {
        if (override.type === 'unavailable' || override.isFullDay) {
          return {
            blocked: true,
            isFullDay: true,
            reason: override.reason || 'Instructor unavailable on this date (Date Override)'
          };
        }
        if (override.type === 'custom_hours' && Array.isArray(override.periods) && override.periods.length > 0) {
          if (bookingStart !== null && bookingEnd !== null) {
            const fits = override.periods.some((p: any) => {
              const sMin = p.startMinutes ?? (p.start ? timeStringToMinutes(p.start) : null);
              const eMin = p.endMinutes ?? (p.end ? timeStringToMinutes(p.end) : null);
              return sMin !== null && eMin !== null && bookingStart! >= sMin && bookingEnd! <= eMin;
            });
            if (!fits) {
              return {
                blocked: true,
                reason: 'Requested time is outside instructor custom hours for this date'
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[checkDateOrSlotBlockedByTimeOff] Overrides read error:', err);
  }

  // 2. Check Instructor Time Off Blocks (legacy & current)
  const allBlocks = await getTimeOffBlocks(instructorId);
  const dateBlocks = allBlocks.filter(b => {
    if (normalizeDate(b.date) !== normDate) return false;
    if (instructorId && b.instructorId && b.instructorId.toLowerCase() !== instructorId.toLowerCase()) {
      return false;
    }
    return true;
  });

  const fullDayBlock = dateBlocks.find(b => b.isFullDay);
  if (fullDayBlock) {
    return {
      blocked: true,
      isFullDay: true,
      reason: fullDayBlock.reason || 'Instructor unavailable (Day Off)'
    };
  }

  // Check partial blocks
  if (bookingStart !== null && bookingEnd !== null) {
    for (const b of dateBlocks) {
      let bStart = b.startMinutes;
      let bEnd = b.endMinutes;
      if (bStart === null || bStart === undefined) {
        bStart = b.startTime ? timeStringToMinutes(b.startTime) : null;
      }
      if (bEnd === null || bEnd === undefined) {
        bEnd = b.endTime ? timeStringToMinutes(b.endTime) : null;
      }

      if (bStart !== null && bStart !== undefined && bEnd !== null && bEnd !== undefined) {
        if (bookingStart < bEnd && bookingEnd > bStart) {
          return {
            blocked: true,
            isFullDay: false,
            reason: b.reason || 'Time blocked by instructor'
          };
        }
      }
    }
  }

  // 3. Check Weekly Operating Hours & Breaks
  let bufferMinutes = 15;
  try {
    let settings: any = null;
    try {
      const dbSettings = await getInstructorSettingsDb(instructorId || 'wally');
      if (dbSettings && dbSettings.operatingHours) {
        settings = dbSettings;
      }
    } catch {}

    if (!settings) {
      const hoursFile = path.join(process.cwd(), 'data', 'instructor-operating-hours.json');
      if (fs.existsSync(hoursFile)) {
        settings = JSON.parse(fs.readFileSync(hoursFile, 'utf-8'));
      }
    }

    if (settings) {
      if (typeof settings.bufferMinutes === 'number') {
        bufferMinutes = settings.bufferMinutes;
      }

      const parts = normDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const dayIdx = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
        const mapping = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = mapping[dayIdx];
        const daySchedule = settings.operatingHours?.[dayKey];

        // Explicit instructor day off / disabled days of week check
        const isDayOff = 
          (Array.isArray(settings.disabledDays) && settings.disabledDays.includes(dayIdx)) ||
          (settings.weeklyDaysOff && settings.weeklyDaysOff[dayKey] === false) ||
          (Array.isArray(settings.disabledWeekdays) && settings.disabledWeekdays.includes(dayKey));

        if (isDayOff) {
          const dayLabel = daySchedule?.label || (dayKey.charAt(0).toUpperCase() + dayKey.slice(1));
          return {
            blocked: true,
            isFullDay: true,
            reason: `Instructor Day Off: Instructor does not take bookings on ${dayLabel}s.`
          };
        }

        if (daySchedule) {
          if (!daySchedule.enabled || !daySchedule.periods || daySchedule.periods.length === 0) {
            return {
              blocked: true,
              isFullDay: true,
              reason: `Instructor does not operate on ${daySchedule.label || dayKey}s.`
            };
          }

          if (bookingStart !== null && bookingEnd !== null) {
            const fits = daySchedule.periods.some((p: any) => {
              const sMin = p.startMinutes ?? (p.start ? timeStringToMinutes(p.start) : null);
              const eMin = p.endMinutes ?? (p.end ? timeStringToMinutes(p.end) : null);
              return sMin !== null && eMin !== null && bookingStart! >= sMin && bookingEnd! <= eMin;
            });

            if (!fits) {
              return {
                blocked: true,
                reason: `Requested time is outside instructor operating hours or during a scheduled break on ${daySchedule.label || dayKey}.`
              };
            }
          }
        } else {
          // If no schedule configured for this day at all, default to closed
          return {
            blocked: true,
            isFullDay: true,
            reason: `Instructor does not operate on ${dayKey}s.`
          };
        }
      }
    }
  } catch (err) {
    console.warn('[checkDateOrSlotBlockedByTimeOff] Operating hours read error:', err);
  }

  // 4. Check External Calendar Events (+ buffer)
  try {
    const extEventsFile = path.join(process.cwd(), 'data', 'external-calendar-events.json');
    if (fs.existsSync(extEventsFile)) {
      const extEvents: any[] = JSON.parse(fs.readFileSync(extEventsFile, 'utf-8'));
      const dayEvents = extEvents.filter(e => normalizeDate(e.date) === normDate);

      if (bookingStart !== null && bookingEnd !== null) {
        for (const e of dayEvents) {
          const eStart = e.startMinutes ?? (e.startTime ? timeStringToMinutes(e.startTime) : null);
          const eEnd = e.endMinutes ?? (e.endTime ? timeStringToMinutes(e.endTime) : null);
          if (eStart !== null && eEnd !== null) {
            const eStartWithBuffer = Math.max(0, eStart - bufferMinutes);
            const eEndWithBuffer = eEnd + bufferMinutes;
            if (bookingStart < eEndWithBuffer && bookingEnd > eStartWithBuffer) {
              return {
                blocked: true,
                isFullDay: false,
                reason: `Conflicts with instructor's external calendar appointment (${e.title || 'Busy'})`
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[checkDateOrSlotBlockedByTimeOff] External events read error:', err);
  }

  return { blocked: false };
}

// Check detailed availability for a specific slot, distinguishing instructor time off from bookings
export async function checkSlotDetailed(
  date: string, 
  time: string, 
  excludeRef?: string,
  customerEmail?: string,
  customerPhone?: string,
  instructorId = 'wally'
): Promise<{ available: boolean; isTimeOff?: boolean; code?: string; reason?: string; isFullDay?: boolean }> {
  try {
    const { getAvailability } = await import('../server/centralAvailabilityService.ts');
    const res = await getAvailability({
      date,
      requestedTime: time,
      excludeBookingRef: excludeRef,
      customerEmail,
      customerPhone,
      instructorId
    });

    if (res.available) {
      return { available: true };
    }

    return {
      available: false,
      isTimeOff: res.reason === 'INSTRUCTOR_DAY_OFF',
      isFullDay: Boolean(res.isDayOff),
      code: res.reason,
      reason: res.message
    };
  } catch (err) {
    console.warn('[checkSlotDetailed] Fallback check error:', err);
    return { available: true };
  }
}

// Check if a time slot on a specific date is already taken by an active booking or blocked by instructor time off
export async function checkSlotBooked(
  date: string, 
  time: string, 
  excludeRef?: string,
  customerEmail?: string,
  customerPhone?: string,
  instructorId?: string
): Promise<boolean> {
  const result = await checkSlotDetailed(date, time, excludeRef, customerEmail, customerPhone, instructorId);
  return !result.available;
}

// Authoritatively validate an entire batch of lessons for multi-lesson packages
export async function checkMultipleSlotsBooked(
  lessons: Array<{ date: string; time: string; lessonNumber?: number }>,
  excludeRef?: string,
  customerEmail?: string,
  customerPhone?: string
): Promise<{ available: boolean; conflicts: string[]; hasTimeOff?: boolean; code?: string }> {
  const conflicts: string[] = [];
  let hasTimeOff = false;

  // Check each lesson against DB
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    const num = l.lessonNumber || i + 1;
    if (!l.date || !l.time) {
      conflicts.push(`Lesson ${num} is missing date or time`);
      continue;
    }
    const check = await checkSlotDetailed(l.date, l.time, excludeRef, customerEmail, customerPhone);
    if (!check.available) {
      if (check.isTimeOff) {
        hasTimeOff = true;
        conflicts.push(`Lesson ${num} (${l.date} at ${l.time}): This time is unavailable because the instructor is off. Please choose another time.`);
      } else {
        conflicts.push(`Lesson ${num} (${l.date} at ${l.time}) is no longer available`);
      }
    }
  }

  // Check self-overlaps among lessons in this batch
  for (let i = 0; i < lessons.length; i++) {
    for (let j = i + 1; j < lessons.length; j++) {
      const l1 = lessons[i];
      const l2 = lessons[j];
      const num1 = l1.lessonNumber || i + 1;
      const num2 = l2.lessonNumber || j + 1;
      if (l1.date && l2.date && l1.time && l2.time) {
        if (normalizeDate(l1.date) === normalizeDate(l2.date)) {
          const iv1 = parseTimeInterval(l1.time);
          const iv2 = parseTimeInterval(l2.time);
          if (iv1 && iv2 && isTimeSlotConflicting(iv1, iv2, 30)) {
            conflicts.push(`Lesson ${num1} and Lesson ${num2} have overlapping times on ${l1.date}`);
          }
        }
      }
    }
  }

  return {
    available: conflicts.length === 0,
    conflicts,
    hasTimeOff,
    code: hasTimeOff ? "INSTRUCTOR_TIME_OFF" : "SLOT_ALREADY_BOOKED"
  };
}

// Insert new driving lesson booking with atomic locking and authoritative double-booking check
export async function createBooking(data: {
  bookingRef: string;
  userId?: string | null;
  studentName: string;
  phone: string;
  email: string;
  suburb: string;
  pickupAddress?: string | null;
  packageTitle: string;
  packagePrice: number;
  date: string;
  time: string;
  status?: string;
  notes?: string | null;
  paymentStatus?: string;
  stripeSessionId?: string | null;
  reminderStatus?: string | null;
  reminderScheduledFor?: string | Date | null;
  reminderSentAt?: string | Date | null;
  reminderMessageId?: string | null;
  reminderError?: string | null;
  reminderRecipientPhone?: string | null;
  reminderRecipientEmail?: string | null;
}) {
  const normDate = normalizeDate(data.date);

  // Run check-and-insert under mutual exclusion lock for this date to prevent race conditions
  return await bookingLock.runExclusive(normDate || 'all-dates', async () => {
    // 1. Authoritative double-booking & time-off verification inside the lock
    const slotCheck = await checkSlotDetailed(
      data.date, 
      data.time, 
      data.bookingRef, 
      data.email, 
      data.phone
    );

    if (!slotCheck.available) {
      const err: any = new Error(
        slotCheck.isTimeOff 
          ? "This time is unavailable because the instructor is off. Please choose another time."
          : "This time slot was just booked by another customer. Please select another time."
      );
      err.code = slotCheck.isTimeOff ? "INSTRUCTOR_TIME_OFF" : "SLOT_ALREADY_BOOKED";
      err.status = 409;
      throw err;
    }

    const newBooking = {
      id: nextBookingId++,
      bookingRef: data.bookingRef,
      userId: data.userId || null,
      studentName: data.studentName,
      phone: data.phone,
      email: data.email,
      suburb: data.suburb,
      pickupAddress: data.pickupAddress || null,
      packageTitle: data.packageTitle,
      packagePrice: data.packagePrice,
      date: data.date,
      time: data.time,
      status: data.status || 'Pending',
      notes: data.notes || null,
      paymentStatus: data.paymentStatus || 'unpaid',
      stripeSessionId: data.stripeSessionId || null,
      reminderStatus: data.reminderStatus || (data.status === 'Confirmed' ? 'scheduled' : 'pending'),
      reminderScheduledFor: data.reminderScheduledFor || null,
      reminderSentAt: data.reminderSentAt || null,
      reminderMessageId: data.reminderMessageId || null,
      reminderError: data.reminderError || null,
      reminderRecipientPhone: data.reminderRecipientPhone || null,
      reminderRecipientEmail: data.reminderRecipientEmail || data.email || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 2. Save to Supabase (Priority Data Store for User)
    let savedSupabaseBooking: any = null;
    try {
      const sbResult = await saveBookingToSupabase({
        bookingRef: data.bookingRef,
        studentName: data.studentName,
        phone: data.phone,
        email: data.email,
        suburb: data.suburb,
        pickupAddress: data.pickupAddress,
        packageTitle: data.packageTitle,
        packagePrice: data.packagePrice,
        date: data.date,
        time: data.time,
        status: data.status || 'Confirmed',
        notes: data.notes,
        paymentStatus: data.paymentStatus || 'unpaid',
      });
      if (sbResult.success && sbResult.data) {
        savedSupabaseBooking = sbResult.data;
      }
    } catch (err: any) {
      console.warn('[Supabase Server] createBooking note:', err?.message || err);
    }

    // 3. Save to Cloud SQL if configured
    let savedSqlBooking: any = null;
    if (isSqlConfigured && db) {
      try {
        const result = await db
          .insert(bookings)
          .values({
            bookingRef: data.bookingRef,
            userId: data.userId || null,
            studentName: data.studentName,
            phone: data.phone,
            email: data.email,
            suburb: data.suburb,
            pickupAddress: data.pickupAddress || null,
            packageTitle: data.packageTitle,
            packagePrice: data.packagePrice,
            date: data.date,
            time: data.time,
            status: data.status || 'Confirmed',
            notes: data.notes || null,
            paymentStatus: data.paymentStatus || 'unpaid',
            stripeSessionId: data.stripeSessionId || null,
            reminderStatus: data.reminderStatus || (data.status === 'Confirmed' ? 'scheduled' : 'pending'),
            reminderScheduledFor: data.reminderScheduledFor || null,
            reminderSentAt: data.reminderSentAt || null,
            reminderMessageId: data.reminderMessageId || null,
            reminderError: data.reminderError || null,
            reminderRecipientPhone: data.reminderRecipientPhone || null,
            reminderRecipientEmail: data.reminderRecipientEmail || data.email || null,
          })
          .returning();

        if (result[0]) {
          savedSqlBooking = result[0];
        }
      } catch (error: any) {
        console.warn('[AI Studio] PostgreSQL createBooking fallback:', error?.message);
      }
    }

    // 4. Update in-memory store and return unified object
    const finalBooking = savedSupabaseBooking || savedSqlBooking || newBooking;
    inMemoryBookings.unshift(finalBooking);
    return finalBooking;
  });
}

// Helper to persist a single booking to Supabase
export async function saveBookingToSupabase(data: {
  bookingRef: string;
  studentName: string;
  phone: string;
  email: string;
  suburb: string;
  pickupAddress?: string | null;
  packageTitle: string;
  packagePrice: number;
  date: string;
  time: string;
  status: string;
  notes?: string | null;
  paymentStatus?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    // 1. Resolve or create Student record
    let studentId: any = null;
    if (data.studentName) {
      try {
        let query = supabase.from('students').select('id');
        if (data.email && data.phone) {
          query = query.or(`email.eq.${data.email},phone.eq.${data.phone}`);
        } else if (data.email) {
          query = query.eq('email', data.email);
        } else if (data.phone) {
          query = query.eq('phone', data.phone);
        }
        const { data: existingStudent } = await query.limit(1).maybeSingle();

        if (existingStudent?.id) {
          studentId = existingStudent.id;
        } else {
          const { data: stdData, error: stdErr } = await supabase
            .from('students')
            .insert({
              full_name: data.studentName,
              phone: data.phone || '',
              email: data.email || '',
            })
            .select('id')
            .single();

          if (stdData?.id) {
            studentId = stdData.id;
          } else if (stdErr) {
            console.warn('[Supabase] student insert error:', stdErr.message);
          }
        }
      } catch (err: any) {
        console.warn('[Supabase] student lookup/insert notice:', err?.message || err);
      }
    }

    // 2. Resolve Instructor record if available
    let instructorId: any = null;
    try {
      const { data: inst } = await supabase
        .from('instructors')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (inst?.id) instructorId = inst.id;
    } catch {}

    // 3. Format metadata notes for full fidelity
    const formattedNotes = `[BookingRef: ${data.bookingRef}] [Price: $${data.packagePrice}] [Suburb: ${data.suburb}] ${data.pickupAddress ? `[Pickup: ${data.pickupAddress}]` : ''} [Payment: ${data.paymentStatus || 'unpaid'}] ${data.notes || ''}`.trim();

    let endTime: string | null = null;
    if (data.time && data.time.includes('–')) {
      const parts = data.time.split('–');
      endTime = parts[1]?.trim() || null;
    }

    // 4. Check if this booking ref already exists in Supabase to avoid duplicates
    const { data: existingRows } = await supabase
      .from('bookings')
      .select('id')
      .ilike('notes', `%${data.bookingRef}%`)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      const { data: updatedRow, error: updateErr } = await supabase
        .from('bookings')
        .update({
          student_id: studentId,
          lesson_type: data.packageTitle,
          lesson_date: data.date,
          start_time: data.time,
          ...(endTime ? { end_time: endTime } : {}),
          status: data.status || 'Confirmed',
          notes: formattedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId)
        .select('*, students(*), instructors(*)')
        .single();

      if (!updateErr && updatedRow) {
        return { success: true, data: mapSupabaseRowToBooking(updatedRow) };
      }
    }

    // 5. Insert new booking row
    const insertPayload: Record<string, any> = {
      student_id: studentId,
      lesson_type: data.packageTitle,
      lesson_date: data.date,
      start_time: data.time,
      status: data.status || 'Confirmed',
      notes: formattedNotes,
    };
    if (instructorId) insertPayload.instructor_id = instructorId;
    if (endTime) insertPayload.end_time = endTime;

    const { data: sbRow, error: sbErr } = await supabase
      .from('bookings')
      .insert(insertPayload)
      .select('*, students(*), instructors(*)')
      .single();

    if (sbErr) {
      console.warn('[Supabase Server] insert error:', sbErr.message, sbErr.details || '');
      return { success: false, error: sbErr.message };
    }

    if (sbRow) {
      console.log(`[Supabase Server] Successfully saved booking #${data.bookingRef} to Supabase!`);
      return { success: true, data: mapSupabaseRowToBooking(sbRow) };
    }

    return { success: false, error: 'Unknown Supabase insert response' };
  } catch (err: any) {
    console.warn('[Supabase Server] saveBookingToSupabase catch:', err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

// Sync all existing bookings to Supabase
export async function syncAllBookingsToSupabase(): Promise<{
  total: number;
  synced: number;
  skipped: number;
  errors: string[];
}> {
  const allBookings = await getBookings({ includeUnpaid: true });
  const result = {
    total: allBookings.length,
    synced: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const b of allBookings) {
    const res = await saveBookingToSupabase({
      bookingRef: b.bookingRef,
      studentName: b.studentName,
      phone: b.phone,
      email: b.email,
      suburb: b.suburb,
      pickupAddress: b.pickupAddress,
      packageTitle: b.packageTitle,
      packagePrice: b.packagePrice,
      date: b.date,
      time: b.time,
      status: b.status,
      notes: b.notes,
      paymentStatus: b.paymentStatus,
    });

    if (res.success) {
      result.synced++;
    } else {
      result.skipped++;
      if (res.error && !result.errors.includes(res.error)) {
        result.errors.push(res.error);
      }
    }
  }

  return result;
}

// Update existing booking by ID
export async function updateBooking(
  id: number | string,
  updates: Partial<typeof bookings.$inferInsert>
) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const numId = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10);
      const sbUpdates: Record<string, any> = {};
      if (updates.status) sbUpdates.status = updates.status;
      if (updates.notes !== undefined) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;
      if (updates.packageTitle) sbUpdates.lesson_type = updates.packageTitle;
      if (updates.studentName) sbUpdates.student_name = updates.studentName;
      if (updates.phone) sbUpdates.phone = updates.phone;
      if (updates.email) sbUpdates.email = updates.email;
      if (updates.suburb) sbUpdates.suburb = updates.suburb;
      if (updates.pickupAddress !== undefined) sbUpdates.pickup_address = updates.pickupAddress;
      if (updates.packagePrice !== undefined) sbUpdates.package_price = updates.packagePrice;
      if (updates.paymentStatus) sbUpdates.payment_status = updates.paymentStatus;
      sbUpdates.updated_at = new Date().toISOString();

      if (!isNaN(numId)) {
        await supabase.from('bookings').update(sbUpdates).eq('id', numId);
      }
    } catch {}
  }

  if (isSqlConfigured && db) {
    try {
      const numId = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10);
      if (!isNaN(numId)) {
        await db
          .update(bookings)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, numId));
      }
    } catch (err) {}
  }

  const idx = inMemoryBookings.findIndex(b => String(b.id) === String(id));
  if (idx !== -1) {
    inMemoryBookings[idx] = {
      ...inMemoryBookings[idx],
      ...updates,
      updatedAt: new Date(),
    };
    return inMemoryBookings[idx];
  }
  return null;
}

// Update booking status by bookingRef
export async function updateBookingByRef(
  bookingRef: string,
  updates: Partial<typeof bookings.$inferInsert>
) {
  const cleanRef = bookingRef.trim().toUpperCase();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const sbUpdates: Record<string, any> = {};
      if (updates.status) sbUpdates.status = updates.status;
      if (updates.notes !== undefined) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;
      if (updates.packageTitle) sbUpdates.lesson_type = updates.packageTitle;
      if (updates.studentName) sbUpdates.student_name = updates.studentName;
      if (updates.phone) sbUpdates.phone = updates.phone;
      if (updates.email) sbUpdates.email = updates.email;
      if (updates.suburb) sbUpdates.suburb = updates.suburb;
      if (updates.pickupAddress !== undefined) sbUpdates.pickup_address = updates.pickupAddress;
      if (updates.packagePrice !== undefined) sbUpdates.package_price = updates.packagePrice;
      if (updates.paymentStatus) sbUpdates.payment_status = updates.paymentStatus;
      sbUpdates.updated_at = new Date().toISOString();

      await supabase.from('bookings').update(sbUpdates).ilike('notes', `%${cleanRef}%`);
    } catch {}
  }

  if (isSqlConfigured && db) {
    try {
      await db
        .update(bookings)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(bookings.bookingRef, bookingRef));
    } catch {}
  }

  const idx = inMemoryBookings.findIndex(b => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  if (idx !== -1) {
    inMemoryBookings[idx] = {
      ...inMemoryBookings[idx],
      ...updates,
      updatedAt: new Date(),
    };
    return inMemoryBookings[idx];
  } else {
    // If not currently in inMemoryBookings, add to merge cache
    const existing = await getBookingByRef(cleanRef, { allowUnpaid: true });
    if (existing) {
      const merged = { ...existing, ...updates, updatedAt: new Date() };
      inMemoryBookings.push(merged);
      return merged;
    }
  }
  return null;
}

// Delete booking by ID
export async function deleteBookingById(id: number | string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const numId = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10);
      if (!isNaN(numId)) {
        await supabase.from('bookings').delete().eq('id', numId);
      }
    } catch {}
  }

  const idx = inMemoryBookings.findIndex(b => String(b.id) === String(id));
  if (idx !== -1) {
    return inMemoryBookings.splice(idx, 1);
  }
  return [];
}

// Delete booking by bookingRef
export async function deleteBookingByRef(bookingRef: string) {
  const cleanRef = bookingRef.trim().toUpperCase();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from('bookings').delete().ilike('notes', `%${cleanRef}%`);
    } catch {}
  }

  const idx = inMemoryBookings.findIndex(b => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  if (idx !== -1) {
    return inMemoryBookings.splice(idx, 1);
  }
  return [];
}

// Save contact inquiry
export async function createContactMessage(data: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}) {
  const newMsg = {
    id: nextContactId++,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    subject: data.subject || null,
    message: data.message,
    createdAt: new Date(),
  };

  inMemoryContactMessages.push(newMsg);
  return newMsg;
}

// -------------------------------------------------------------
// Audit Logging System (Section 2.3 & 5.1 of Master Prompt)
// -------------------------------------------------------------

export interface BookingAuditLogEntry {
  bookingRef?: string | null;
  action: string; // 'create' | 'update_status' | 'reschedule' | 'cancel' | 'refund' | 'payment_verified'
  performedBy?: string; // 'system' | 'stripe_webhook' | 'paypal_webhook' | 'instructor' | 'student'
  previousState?: string | null;
  newState?: string | null;
  notes?: string | null;
}

export async function logBookingAudit(entry: BookingAuditLogEntry) {
  const auditRecord = {
    id: inMemoryAuditLogs.length + 1,
    bookingRef: entry.bookingRef || 'N/A',
    action: entry.action,
    performedBy: entry.performedBy || 'system',
    previousState: entry.previousState || null,
    newState: entry.newState || null,
    notes: entry.notes || null,
    createdAt: new Date(),
  };

  // 1. Supabase attempt
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from('booking_audit_logs').insert([{
        booking_ref: entry.bookingRef || 'N/A',
        action: entry.action,
        performed_by: entry.performedBy || 'system',
        previous_state: entry.previousState || null,
        new_state: entry.newState || null,
        notes: entry.notes || null,
        created_at: new Date().toISOString(),
      }]);
    } catch (sbErr) {
      // Non-fatal if table doesn't exist yet
    }
  }

  // 2. Drizzle SQL attempt
  if (isSqlConfigured && db) {
    try {
      await db.insert(bookingAuditLogs).values({
        bookingRef: entry.bookingRef || 'N/A',
        action: entry.action,
        performedBy: entry.performedBy || 'system',
        previousState: entry.previousState || null,
        newState: entry.newState || null,
        notes: entry.notes || null,
      });
    } catch (sqlErr) {
      // Non-fatal fallback
    }
  }

  // 3. In-memory store
  inMemoryAuditLogs.unshift(auditRecord);
  return auditRecord;
}

export async function getBookingAuditLogs(bookingRef?: string, limit: number = 50): Promise<any[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      let query = supabase.from('booking_audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (bookingRef) {
        query = query.eq('booking_ref', bookingRef);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {}
  }

  if (isSqlConfigured && db) {
    try {
      if (bookingRef) {
        return await db
          .select()
          .from(bookingAuditLogs)
          .where(eq(bookingAuditLogs.bookingRef, bookingRef))
          .orderBy(desc(bookingAuditLogs.createdAt))
          .limit(limit);
      }
      return await db
        .select()
        .from(bookingAuditLogs)
        .orderBy(desc(bookingAuditLogs.createdAt))
        .limit(limit);
    } catch {}
  }

  if (bookingRef) {
    return inMemoryAuditLogs.filter(log => log.bookingRef === bookingRef).slice(0, limit);
  }
  return inMemoryAuditLogs.slice(0, limit);
}

// -------------------------------------------------------------
// Transactional Email Delivery Logging (Section 4.3)
// -------------------------------------------------------------

export interface EmailLogEntry {
  bookingRef?: string | null;
  emailType: string;
  recipientEmail: string;
  status: 'sent' | 'failed' | 'retrying';
  messageId?: string | null;
  error?: string | null;
  retryCount?: number;
}

export async function logEmailDelivery(entry: EmailLogEntry) {
  const logRecord = {
    id: inMemoryEmailLogs.length + 1,
    bookingRef: entry.bookingRef || null,
    emailType: entry.emailType,
    recipientEmail: entry.recipientEmail,
    status: entry.status,
    messageId: entry.messageId || null,
    error: entry.error || null,
    retryCount: entry.retryCount ?? 0,
    createdAt: new Date(),
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from('email_logs').insert([{
        booking_ref: entry.bookingRef || null,
        email_type: entry.emailType,
        recipient_email: entry.recipientEmail,
        status: entry.status,
        message_id: entry.messageId || null,
        error: entry.error || null,
        retry_count: entry.retryCount ?? 0,
        created_at: new Date().toISOString(),
      }]);
    } catch {}
  }

  if (isSqlConfigured && db) {
    try {
      await db.insert(emailLogs).values({
        bookingRef: entry.bookingRef || null,
        emailType: entry.emailType,
        recipientEmail: entry.recipientEmail,
        status: entry.status,
        messageId: entry.messageId || null,
        error: entry.error || null,
        retryCount: entry.retryCount ?? 0,
      });
    } catch {}
  }

  inMemoryEmailLogs.unshift(logRecord);
  return logRecord;
}

// -------------------------------------------------------------
// Webhook Idempotency Tracking (Section 3.3)
// -------------------------------------------------------------

export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  if (inMemoryWebhookEvents.has(eventId)) return true;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data } = await supabase.from('webhook_events').select('event_id').eq('event_id', eventId).single();
      if (data) {
        inMemoryWebhookEvents.add(eventId);
        return true;
      }
    } catch {}
  }

  if (isSqlConfigured && db) {
    try {
      const existing = await db.select().from(webhookEvents).where(eq(webhookEvents.eventId, eventId)).limit(1);
      if (existing.length > 0) {
        inMemoryWebhookEvents.add(eventId);
        return true;
      }
    } catch {}
  }

  return false;
}

export async function recordWebhookEvent(eventId: string, provider: string, eventType: string): Promise<void> {
  if (!eventId) return;
  inMemoryWebhookEvents.add(eventId);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from('webhook_events').insert([{
        event_id: eventId,
        provider,
        event_type: eventType,
        processed_at: new Date().toISOString(),
      }]);
    } catch {}
  }

  if (isSqlConfigured && db) {
    try {
      await db.insert(webhookEvents).values({
        eventId,
        provider,
        eventType,
      });
    } catch {}
  }
}

