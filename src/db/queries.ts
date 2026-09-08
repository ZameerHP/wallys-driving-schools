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
    createdAt: new Date('2026-06-01T08:30:00Z'),
    updatedAt: new Date('2026-06-01T08:30:00Z'),
  },
  {
    id: 2,
    bookingRef: 'WD-3190',
    userId: null,
    studentName: 'Marcus Chen',
    phone: '0423 456 789',
    email: 'm.chen@example.com',
    suburb: 'Baldivis',
    pickupAddress: '28 Rivergums Blvd, Baldivis WA 6171',
    packageTitle: '2 Hours Lesson',
    packagePrice: 130,
    date: '2026-06-16',
    time: '02:00 PM',
    status: 'Pending',
    notes: 'Focus on parallel parking and roundabout navigation',
    paymentStatus: 'unpaid',
    stripeSessionId: null,
    createdAt: new Date('2026-06-02T11:15:00Z'),
    updatedAt: new Date('2026-06-02T11:15:00Z'),
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
export async function getBookings(filter?: { email?: string; userId?: string }) {
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
  if (filter?.userId || filter?.email) {
    list = list.filter(b => 
      (filter.userId && b.userId === filter.userId) || 
      (filter.email && b.email && b.email.toLowerCase() === filter.email.toLowerCase())
    );
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Retrieve single booking by reference code (e.g. WD-8492)
export async function getBookingByRef(bookingRef: string) {
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
        return mapSupabaseRowToBooking(data[0]);
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

      if (result[0]) return result[0];
    } catch {}
  }

  // 3. Check in-memory
  const found = inMemoryBookings.find(b => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  return found || null;
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
export async function checkSlotBooked(
  date: string, 
  time: string, 
  excludeRef?: string,
  customerEmail?: string,
  customerPhone?: string
): Promise<boolean> {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();
  const cleanEmail = customerEmail?.trim().toLowerCase();
  const cleanPhone = customerPhone?.replace(/\D/g, '');
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1000;

  const isConflict = (r: any): boolean => {
    if (excludeRef && r.bookingRef && r.bookingRef.toUpperCase() === excludeRef.toUpperCase()) {
      return false;
    }

    if (r.date !== normalizedDate || r.time !== normalizedTime) {
      return false;
    }

    if (r.status === 'Cancelled') {
      return false;
    }

    if (r.status === 'Confirmed' || r.paymentStatus === 'paid') {
      return true;
    }

    if (r.status === 'Pending' || r.paymentStatus === 'unpaid') {
      if (cleanEmail && r.email && r.email.toLowerCase() === cleanEmail) {
        return false;
      }
      if (cleanPhone && r.phone && r.phone.replace(/\D/g, '') === cleanPhone) {
        return false;
      }

      const createdAtMs = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (createdAtMs > 0 && (now - createdAtMs) > PENDING_TIMEOUT_MS) {
        return false;
      }

      return true;
    }

    return false;
  };

  const currentBookings = await getBookings();
  return currentBookings.some(isConflict);
}

// Insert new driving lesson booking
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
}) {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 1. Save to Supabase
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

  // 2. Save to Cloud SQL if configured
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

  // 3. Fallback to in-memory store
  inMemoryBookings.unshift(newBooking);
  return newBooking;
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
