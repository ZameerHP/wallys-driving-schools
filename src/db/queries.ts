import { db, isSqlConfigured } from './index.ts';
import { users, bookings, contactMessages } from './schema.ts';
import { eq, desc, or, and, ne } from 'drizzle-orm';
import { getSupabaseServerClient } from '../lib/supabase-server.ts';

// In-memory fallback stores for offline/sandbox environments
const inMemoryUsers: Map<string, any> = new Map();
const inMemoryContactMessages: any[] = [];
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

// Check if a time slot on a specific date is already taken by an active booking (authoritative double-booking prevention)
export async function checkSlotBooked(
  date: string, 
  time: string, 
  excludeRef?: string,
  customerEmail?: string,
  customerPhone?: string
): Promise<boolean> {
  const normTargetDate = normalizeDate(date);
  if (!normTargetDate) return false;

  const targetInterval = parseTimeInterval(time);
  const cleanEmail = customerEmail?.trim().toLowerCase();
  const cleanPhone = customerPhone?.replace(/\D/g, '');
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1000;

  // Authoritative check must examine ALL non-cancelled bookings including unpaid/pending
  const currentBookings = await getBookings({ includeUnpaid: true });

  for (const r of currentBookings) {
    // 1. Exclude self if customer is updating their own booking reference
    if (excludeRef && r.bookingRef && r.bookingRef.toUpperCase() === excludeRef.toUpperCase()) {
      continue;
    }

    // 2. Ignore cancelled bookings (both inside and outside 24h release the instructor's schedule)
    if (r.status === 'Cancelled') {
      continue;
    }

    // 3. Match date using canonical date normalization
    // IMPORTANT: Different date + same time must be allowed!
    const bookingNormDate = normalizeDate(r.date);
    if (!bookingNormDate || bookingNormDate !== normTargetDate) {
      continue;
    }

    // 4. Overlap & 30-minute buffer calculation
    const existingInterval = parseTimeInterval(r.time);
    let timeConflicts = false;

    if (targetInterval && existingInterval) {
      timeConflicts = isTimeSlotConflicting(targetInterval, existingInterval, 30);
    } else {
      // Fallback exact match if parsing fails
      const cleanT1 = time.replace(/\s+/g, ' ').toLowerCase();
      const cleanT2 = (r.time || '').replace(/\s+/g, ' ').toLowerCase();
      timeConflicts = cleanT1 === cleanT2;
    }

    if (!timeConflicts) {
      continue;
    }

    // 5. Confirmed or paid bookings unconditionally block the slot
    if (r.status === 'Confirmed' || r.paymentStatus === 'paid') {
      return true;
    }

    // 6. Pending bookings block the slot unless it is the same customer resuming checkout or timed out
    if (r.status === 'Pending' || r.paymentStatus === 'unpaid') {
      if (cleanEmail && r.email && r.email.toLowerCase() === cleanEmail) {
        continue;
      }
      if (cleanPhone && r.phone && r.phone.replace(/\D/g, '') === cleanPhone) {
        continue;
      }

      const createdAtMs = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (createdAtMs > 0 && (now - createdAtMs) > PENDING_TIMEOUT_MS) {
        continue;
      }

      return true;
    }
  }

  return false;
}

// Authoritatively validate an entire batch of lessons for multi-lesson packages
export async function checkMultipleSlotsBooked(
  lessons: Array<{ date: string; time: string; lessonNumber?: number }>,
  excludeRef?: string,
  customerEmail?: string,
  customerPhone?: string
): Promise<{ available: boolean; conflicts: string[] }> {
  const conflicts: string[] = [];

  // Check each lesson against DB
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    const num = l.lessonNumber || i + 1;
    if (!l.date || !l.time) {
      conflicts.push(`Lesson ${num} is missing date or time`);
      continue;
    }
    const isBooked = await checkSlotBooked(l.date, l.time, excludeRef, customerEmail, customerPhone);
    if (isBooked) {
      conflicts.push(`Lesson ${num} (${l.date} at ${l.time}) is no longer available`);
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
    conflicts
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
}) {
  const normDate = normalizeDate(data.date);

  // Run check-and-insert under mutual exclusion lock for this date to prevent race conditions
  return await bookingLock.runExclusive(normDate || 'all-dates', async () => {
    // 1. Authoritative double-booking verification inside the lock
    const isTaken = await checkSlotBooked(
      data.date, 
      data.time, 
      data.bookingRef, 
      data.email, 
      data.phone
    );

    if (isTaken) {
      const err: any = new Error("This time slot was just booked by another customer. Please select another time.");
      err.code = "SLOT_ALREADY_BOOKED";
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 2. Save to Supabase if configured
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        let studentId: any = null;
        if (data.studentName) {
          try {
            const { data: stdData } = await supabase
              .from('students')
              .upsert({
                full_name: data.studentName,
                phone: data.phone,
                email: data.email,
              })
              .select('id')
              .single();
            if (stdData?.id) studentId = stdData.id;
          } catch {}
        }

        const formattedNotes = `[BookingRef: ${data.bookingRef}] [Price: $${data.packagePrice}] [Suburb: ${data.suburb}] ${data.pickupAddress ? `[Pickup: ${data.pickupAddress}]` : ''} ${data.notes || ''}`.trim();

        const { data: sbRow, error: sbErr } = await supabase
          .from('bookings')
          .insert({
            student_id: studentId,
            lesson_type: data.packageTitle,
            lesson_date: data.date,
            start_time: data.time,
            status: data.status || 'Pending',
            notes: formattedNotes,
          })
          .select('*, students(*), instructors(*)')
          .single();

        if (!sbErr && sbRow) {
          const mapped = mapSupabaseRowToBooking(sbRow);
          inMemoryBookings.unshift(mapped);
          return mapped;
        }
      } catch (err: any) {
        console.warn('[Supabase Server] createBooking fallback:', err?.message || err);
      }
    }

    // 3. Save to Cloud SQL if configured
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
          })
          .returning();

        if (result[0]) {
          inMemoryBookings.unshift(result[0]);
          return result[0];
        }
      } catch (error: any) {
        console.warn('[AI Studio] PostgreSQL createBooking fallback:', error?.message);
      }
    }

    // 4. Fallback to in-memory store
    inMemoryBookings.unshift(newBooking);
    return newBooking;
  });
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
      if (updates.notes) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;

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
      if (updates.notes) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;

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
