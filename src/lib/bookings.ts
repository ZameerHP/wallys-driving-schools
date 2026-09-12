// Data layer for Wally's Driving School bookings
// Seamlessly syncs between Supabase, Cloud SQL PostgreSQL (/api/bookings), and local cache

import { getSupabase, isSupabaseConfigured } from './supabase';

export interface BookingItem {
  id: string;
  ref: string;
  bookingRef?: string;
  studentName: string;
  phone: string;
  email: string;
  suburb: string;
  pickupAddress?: string;
  packageTitle: string;
  packagePrice: number;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: string;
  isRescheduled?: boolean;
  paymentStatus?: 'paid' | 'unpaid' | string;
  paymentMethod?: string;
  stripeSessionId?: string | null;
  reminderStatus?: 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled';
  reminderScheduledFor?: string | null;
  reminderSentAt?: string | null;
  reminderMessageId?: string | null;
  reminderError?: string | null;
  reminderRecipientPhone?: string | null;
  reminderRecipientEmail?: string | null;
  lessons?: Array<{ lessonNumber: number; date: string; time: string }>;
}

const STORAGE_KEY = 'wallys_bookings_v3';

// Retrieve bookings cached in local storage
export function getStoredBookings(includeUnpaid = false): BookingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    if (includeUnpaid || isOwnerLoggedIn()) return list;
    return list.filter(b => b.paymentStatus === 'paid' || b.status === 'Confirmed');
  } catch (err) {
    console.error('Failed to parse cached bookings:', err);
    return [];
  }
}

// Persist bookings to local storage
export function saveBookings(bookings: BookingItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch (err) {
    console.error('Failed to save bookings to localStorage:', err);
  }
}

// Completely clear local bookings cache
export function clearAllLocalBookings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('wallys_bookings_v2');
    localStorage.removeItem('wallys_bookings');
    localStorage.removeItem('wallys_real_bookings');
  } catch (err) {
    console.error('Failed to clear local bookings cache:', err);
  }
}

// Add a booking to local storage
export function addBooking(booking: Omit<BookingItem, 'id' | 'ref' | 'createdAt'> & { ref?: string }): BookingItem {
  const current = getStoredBookings();
  const newItem: BookingItem = {
    ...booking,
    status: booking.status || 'Pending',
    id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    ref: booking.ref || `WD-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString().split('T')[0],
  };

  const updated = [newItem, ...current.filter(c => c.ref !== newItem.ref)];
  saveBookings(updated);
  return newItem;
}

// Update booking status in local storage
export function updateBookingStatus(id: string, newStatus: BookingItem['status']): BookingItem[] {
  const current = getStoredBookings();
  const updated = current.map(b => (b.id === id || b.ref === id ? { ...b, status: newStatus } : b));
  saveBookings(updated);
  return updated;
}

// Update arbitrary booking details in local storage
export function updateBookingDetails(id: string, updates: Partial<BookingItem>): BookingItem[] {
  const current = getStoredBookings();
  const updated = current.map(b => {
    if (b.id === id || b.ref === id) {
      return { ...b, ...updates };
    }
    return b;
  });
  saveBookings(updated);
  return updated;
}

// Delete a booking from local storage
export function deleteBooking(id: string): BookingItem[] {
  const current = getStoredBookings();
  const updated = current.filter(b => b.id !== id && b.ref !== id);
  saveBookings(updated);
  return updated;
}

// Convert database record to standard BookingItem
export function mapDbToBookingItem(row: any): BookingItem {
  let pickup = row.pickup_address || row.pickupAddress || row.address || '';
  let extractedRef = row.booking_ref || row.bookingRef || row.ref || '';
  let extractedSuburb = row.suburb || '';
  let extractedPrice = Number(row.package_price || row.packagePrice || row.price || 0);
  let extractedPayment = row.payment_status || row.paymentStatus || 'unpaid';

  if (row.notes && typeof row.notes === 'string') {
    if (!pickup) {
      const pickupMatch = row.notes.match(/\[Pickup:\s*([^\]]+)\]/i) || row.notes.match(/Pickup:\s*([^.]+)/i);
      if (pickupMatch) {
        pickup = pickupMatch[1].trim();
      }
    }
    if (!extractedRef) {
      const refMatch = row.notes.match(/\[BookingRef:\s*([^\]]+)\]/i) || row.notes.match(/BookingRef:\s*([A-Z0-9-]+)/i);
      if (refMatch) {
        extractedRef = refMatch[1].trim();
      }
    }
    if (!extractedSuburb) {
      const suburbMatch = row.notes.match(/\[Suburb:\s*([^\]]+)\]/i) || row.notes.match(/Suburb:\s*([^,|]+)/i);
      if (suburbMatch) {
        extractedSuburb = suburbMatch[1].trim();
      }
    }
    if (!extractedPrice) {
      const priceMatch = row.notes.match(/\[Price:\s*\$?(\d+(?:\.\d+)?)\]/i) || row.notes.match(/Price:\s*\$?(\d+(?:\.\d+)?)/i);
      if (priceMatch) {
        extractedPrice = Number(priceMatch[1]);
      }
    }
    if (extractedPayment === 'unpaid') {
      const paymentMatch = row.notes.match(/\[Payment:\s*([^\]]+)\]/i);
      if (paymentMatch) {
        extractedPayment = paymentMatch[1].trim();
      }
    }
  }

  if (!extractedRef) {
    extractedRef = `WD-${row.id || Math.floor(1000 + Math.random() * 9000)}`;
  }
  if (!extractedPrice) {
    extractedPrice = 65;
  }

  return {
    id: String(row.id || extractedRef),
    ref: extractedRef,
    studentName: row.students?.full_name || row.student_name || row.studentName || row.name || 'Learner Driver',
    phone: row.students?.phone || row.phone || '',
    email: row.students?.email || row.email || '',
    suburb: extractedSuburb || 'Rockingham & Surrounds',
    pickupAddress: pickup || undefined,
    packageTitle: row.lesson_type || row.package_title || row.packageTitle || row.package || '1 Hour Driving Lesson',
    packagePrice: extractedPrice,
    date: row.lesson_date || row.date || '',
    time: row.start_time || row.time || '',
    status: (row.status as BookingItem['status']) || 'Pending',
    notes: row.notes || undefined,
    createdAt: row.created_at || row.createdAt 
      ? new Date(row.created_at || row.createdAt).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    isRescheduled: Boolean(row.is_rescheduled || row.isRescheduled || (row.notes && row.notes.includes('[RESCHEDULED]'))),
    paymentStatus: extractedPayment,
    stripeSessionId: row.stripe_session_id || row.stripeSessionId || null,
  };
}

// Fetch all bookings from backend database (Cloud SQL), Supabase, and local storage
export async function fetchBookingsFromDb(token?: string | null): Promise<BookingItem[]> {
  const bookingMap = new Map<string, BookingItem>();

  const addItems = (items: BookingItem[]) => {
    for (const item of items) {
      if (!item || !item.ref) continue;
      const existing = bookingMap.get(item.ref);
      if (!existing) {
        bookingMap.set(item.ref, item);
      } else {
        // Merge updates, prioritizing newer fields
        bookingMap.set(item.ref, {
          ...existing,
          ...item,
          pickupAddress: item.pickupAddress || existing.pickupAddress,
          isRescheduled: item.isRescheduled || existing.isRescheduled
        });
      }
    }
  };

  // 1. Load from Backend API (/api/bookings) - primary source of truth
  try {
    const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null);
    const headers: Record<string, string> = {};
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
      headers['x-instructor-token'] = effectiveToken;
    }
    const res = await fetch('/api/bookings', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        addItems(data.map(mapDbToBookingItem));
      }
    }
  } catch (err) {
    console.warn('Backend API fetch error:', err);
  }

  // 2. Load from Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('bookings')
          .select('*, students(*), instructors(*)')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          addItems(data.map(mapDbToBookingItem));
        }
      } catch (err) {
        console.warn('Supabase fetch error:', err);
      }
    }
  }

  // 3. Merge local cached bookings
  const local = getStoredBookings();
  addItems(local);

  const combined = Array.from(bookingMap.values());
  if (combined.length > 0) {
    saveBookings(combined);
  }

  return combined;
}

// Search bookings by booking code / number (e.g. "8492", "WD-8492"), email, or phone
export async function searchCustomerBookings(query: string): Promise<BookingItem[]> {
  const raw = query.trim();
  if (!raw) return [];

  const clean = raw.replace(/^#/, '').trim();
  const digitsOnly = clean.replace(/[^0-9]/g, '');
  const withPrefix = clean.toUpperCase().startsWith('WD-') ? clean.toUpperCase() : `WD-${clean.toUpperCase()}`;

  const resultsMap = new Map<string, BookingItem>();
  const addItems = (items: BookingItem[]) => {
    for (const item of items) {
      if (item && item.ref && !resultsMap.has(item.ref)) {
        // Only return paid, completed bookings to the customer Manage Booking screen
        if (item.paymentStatus === 'paid') {
          resultsMap.set(item.ref, item);
        }
      }
    }
  };

  // 1. Direct query to Backend API by reference
  try {
    const res = await fetch(`/api/bookings/${encodeURIComponent(withPrefix)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.bookingRef || data.booking_ref)) {
        addItems([mapDbToBookingItem(data)]);
      }
    }
  } catch {}

  // 2. Query all backend API bookings to match by email, phone, or digits
  try {
    const res = await fetch('/api/bookings');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const qLower = clean.toLowerCase();
        const matches = data.filter((b: any) => {
          const ref = (b.bookingRef || b.booking_ref || '').toLowerCase();
          const email = (b.email || '').toLowerCase();
          const phone = (b.phone || '').toLowerCase();
          const name = (b.studentName || b.student_name || '').toLowerCase();
          return (
            ref.includes(qLower) ||
            ref.replace('wd-', '').includes(qLower) ||
            (digitsOnly && ref.includes(digitsOnly)) ||
            email.includes(qLower) ||
            phone.includes(qLower) ||
            name.includes(qLower)
          );
        });
        addItems(matches.map(mapDbToBookingItem));
      }
    }
  } catch {}

  // 3. Query Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        const orClauses = [
          `booking_ref.ilike.%${clean}%`,
          `booking_ref.ilike.%${withPrefix}%`,
          `email.ilike.%${clean}%`,
          `phone.ilike.%${clean}%`,
          `student_name.ilike.%${clean}%`
        ];
        if (digitsOnly.length >= 3) {
          orClauses.push(`booking_ref.ilike.%${digitsOnly}%`);
        }

        const { data, error } = await sb
          .from('bookings')
          .select('*')
          .or(orClauses.join(','));
        
        if (!error && Array.isArray(data) && data.length > 0) {
          addItems(data.map(mapDbToBookingItem));
        }
      } catch (err) {
        console.warn('Supabase customer booking search error:', err);
      }
    }
  }

  // 4. Local storage fallback match
  const local = getStoredBookings();
  const qLower = clean.toLowerCase();
  const localMatches = local.filter(b => 
    b.ref.toLowerCase().includes(qLower) ||
    b.ref.toLowerCase().replace('wd-', '').includes(qLower) ||
    (digitsOnly && b.ref.includes(digitsOnly)) ||
    b.email.toLowerCase().includes(qLower) ||
    b.phone.toLowerCase().includes(qLower) ||
    b.studentName.toLowerCase().includes(qLower)
  );
  addItems(localMatches);

  return Array.from(resultsMap.values());
}

export async function lookupBookingFromDb(ref: string): Promise<BookingItem | null> {
  const matches = await searchCustomerBookings(ref);
  return matches.length > 0 ? matches[0] : null;
}

export interface ManualBookingData {
  studentName: string;
  phone: string;
  email: string;
  suburb: string;
  pickupAddress?: string;
  packageTitle: string;
  packagePrice: number;
  date: string;
  time: string;
  status?: BookingItem['status'];
  paymentStatus?: 'paid' | 'unpaid' | string;
  paymentMethod?: string;
  notes?: string;
  transmission?: 'Automatic' | 'Manual' | string;
  allowOverride?: boolean;
  sendConfirmation?: boolean;
  bookingRef?: string;
  lessons?: Array<{ lessonNumber: number; date: string; time: string }>;
}

// Create new driving lesson booking across database, Supabase, and local storage
export async function createBookingInDb(
  booking: Omit<BookingItem, 'id' | 'ref' | 'createdAt'> & Partial<ManualBookingData>, 
  token?: string | null
): Promise<BookingItem> {
  const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = booking.bookingRef || `WD-${randomNum}`;

  let finalItem: BookingItem | null = null;

  // 1. Authoritative Backend Check and Insert
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
      headers['x-instructor-token'] = effectiveToken;
    }
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        ...booking, 
        bookingRef,
        pickupAddress: booking.pickupAddress || null,
        status: booking.status || 'Pending'
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || 'Failed to create booking in database.');
    }

    const data = await res.json();
    finalItem = mapDbToBookingItem(data);
  } catch (err: any) {
    // If backend threw an availability error or validation error, rethrow immediately
    if (err?.message?.includes('time slot') || err?.message?.includes('reserved') || err?.message?.includes('available') || err?.message?.includes('required') || err?.message?.includes('phone') || err?.message?.includes('email')) {
      throw err;
    }
    console.warn('Backend API error, falling back:', err);
  }

  // Fallback if backend was unreachable (e.g. static preview)
  if (!finalItem) {
    finalItem = addBooking({
      ...booking,
      ref: bookingRef,
    } as any);
  } else {
    // Update local storage cache
    const current = getStoredBookings(true);
    saveBookings([finalItem, ...current.filter(c => c.ref !== finalItem!.ref)]);
  }

  // 2. Send to Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        let studentId: any = null;
        if (booking.studentName) {
          try {
            const { data: stdData } = await sb
              .from('students')
              .upsert({
                full_name: booking.studentName,
                phone: booking.phone,
                email: booking.email,
              })
              .select('id')
              .single();
            if (stdData?.id) {
              studentId = stdData.id;
            }
          } catch {}
        }

        const notesWithMeta = `[BookingRef: ${bookingRef}] [Price: $${booking.packagePrice}] [Suburb: ${booking.suburb}] ${booking.pickupAddress ? `[Pickup: ${booking.pickupAddress}]` : ''} ${booking.notes || ''}`.trim();

        // Attempt relational schema insert
        const relationalPayload: Record<string, any> = {
          student_id: studentId,
          lesson_type: booking.packageTitle,
          lesson_date: booking.date,
          start_time: booking.time,
          status: booking.status || 'Pending',
          notes: notesWithMeta,
        };

        const { data: relData, error: relError } = await sb
          .from('bookings')
          .insert(relationalPayload)
          .select('*, students(*), instructors(*)')
          .single();

        if (!relError && relData) {
          finalItem = mapDbToBookingItem(relData);
        } else {
          // Fallback to flat schema insert if columns exist
          const flatPayload = {
            booking_ref: bookingRef,
            student_name: booking.studentName,
            phone: booking.phone,
            email: booking.email,
            suburb: booking.suburb,
            pickup_address: booking.pickupAddress || null,
            package_title: booking.packageTitle,
            package_price: booking.packagePrice,
            date: booking.date,
            time: booking.time,
            status: booking.status || 'Pending',
            notes: notesWithMeta,
            payment_status: 'unpaid',
          };
          const { data: flatData, error: flatError } = await sb.from('bookings').insert(flatPayload).select().single();
          if (!flatError && flatData) {
            finalItem = mapDbToBookingItem(flatData);
          }
        }
      } catch (err) {
        console.warn('Supabase booking insert failed:', err);
      }
    }
  }

  // Update local storage with final synced item
  const current = getStoredBookings();
  saveBookings([finalItem, ...current.filter(c => c.ref !== finalItem.ref)]);
  return finalItem;
}

// Create a manual booking for a client by the owner/instructor with auto database sync
export async function createManualBookingByInstructor(
  data: ManualBookingData,
  token?: string | null
): Promise<BookingItem> {
  const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null);
  return createBookingInDb({
    ...data,
    status: data.status || 'Confirmed',
    paymentStatus: data.paymentStatus || 'paid',
    paymentMethod: data.paymentMethod || 'cash',
    transmission: data.transmission || 'Automatic',
    allowOverride: data.allowOverride !== false,
    sendConfirmation: data.sendConfirmation !== false,
  }, effectiveToken);
}

// Update booking in backend API, Supabase, and local storage
export async function updateBookingInDb(
  id: string, 
  updates: Partial<BookingItem>,
  targetRef?: string
): Promise<BookingItem | null> {
  const refToMatch = targetRef || (id.startsWith('WD-') ? id : undefined);
  let serverUpdatedItem: any = null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-instructor-token'] = token;
  }

  // 1. Update Backend API
  try {
    let res: Response | null = null;
    if (refToMatch) {
      res = await fetch(`/api/bookings/ref/${encodeURIComponent(refToMatch)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
    } else {
      const numId = parseInt(id.replace(/^b-/, ''), 10);
      if (!isNaN(numId)) {
        res = await fetch(`/api/bookings/${numId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updates),
        });
      }
    }
    if (res) {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update booking');
      }
      serverUpdatedItem = await res.json();
    }
  } catch (err: any) {
    if (err?.message?.includes('already booked') || err?.message?.includes('available')) {
      throw err;
    }
    console.warn('Failed to patch to Backend API:', err);
  }

  // 2. Update Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        const sbUpdates: Record<string, any> = {};
        if (updates.status) sbUpdates.status = updates.status;
        if (updates.date) sbUpdates.lesson_date = updates.date;
        if (updates.time) sbUpdates.start_time = updates.time;
        if (updates.packageTitle) sbUpdates.lesson_type = updates.packageTitle;
        if (updates.notes !== undefined) sbUpdates.notes = updates.notes;
        else if (serverUpdatedItem?.notes) sbUpdates.notes = serverUpdatedItem.notes;
        sbUpdates.updated_at = new Date().toISOString();

        if (refToMatch) {
          await sb.from('bookings').update(sbUpdates).ilike('notes', `%${refToMatch}%`);
        } else {
          const numId = parseInt(id.replace(/^b-/, ''), 10);
          if (!isNaN(numId)) {
            await sb.from('bookings').update(sbUpdates).eq('id', numId);
          } else {
            await sb.from('bookings').update(sbUpdates).ilike('notes', `%${id}%`);
          }
        }
      } catch (err) {
        console.warn('Supabase booking update notice:', err);
      }
    }
  }

  // 3. Update local state
  const mergedUpdates: Partial<BookingItem> = {
    ...updates,
    ...(serverUpdatedItem?.paymentStatus ? { paymentStatus: serverUpdatedItem.paymentStatus } : {}),
    ...(serverUpdatedItem?.notes ? { notes: serverUpdatedItem.notes } : {}),
  };
  updateBookingDetails(id, mergedUpdates);
  if (refToMatch && refToMatch !== id) {
    updateBookingDetails(refToMatch, mergedUpdates);
  }

  return serverUpdatedItem;
}

// Delete booking from backend API, Supabase, and local storage
export async function deleteBookingFromDb(id: string, targetRef?: string): Promise<void> {
  const refToMatch = targetRef || (id.startsWith('WD-') ? id : undefined);
  const cleanId = String(id).replace(/^b-/, '');
  const numId = parseInt(cleanId, 10);
  const token = typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 1. Delete from Backend API (Cloud SQL) by Ref
  if (refToMatch) {
    try {
      await fetch(`/api/bookings/ref/${encodeURIComponent(refToMatch)}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.warn('Failed to delete from API by ref:', err);
    }
  }

  // 2. Also delete from Backend API (Cloud SQL) by ID if numeric
  if (!isNaN(numId)) {
    try {
      await fetch(`/api/bookings/${numId}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.warn('Failed to delete from API by ID:', err);
    }
  }

  // 3. Delete from Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        if (refToMatch) {
          await sb.from('bookings').delete().ilike('notes', `%${refToMatch}%`);
        } else if (!isNaN(numId)) {
          await sb.from('bookings').delete().eq('id', numId);
        } else {
          await sb.from('bookings').delete().ilike('notes', `%${id}%`);
        }
      } catch (err) {
        console.warn('Supabase booking deletion notice:', err);
      }
    }
  }

  // 4. Delete from local state
  deleteBooking(id);
  if (refToMatch && refToMatch !== id) {
    deleteBooking(refToMatch);
  }
}

// Default Owner Identity
export const OWNER_CREDENTIALS = {
  username: "Wally@wallysdrivingschool.com.au",
  name: "Wally (Owner & Lead Instructor)",
  role: "Instructor"
};

// Check owner credentials via server authentication
export function checkOwnerAuth(_user: string, _pass: string): boolean {
  // Authentication must be performed server-side via /api/auth/instructor-login
  return false;
}

const OWNER_SESSION_KEY = 'wallys_owner_authenticated_session';

export function isOwnerLoggedIn(): boolean {
  return sessionStorage.getItem(OWNER_SESSION_KEY) === 'true';
}

export function setOwnerLoggedIn(val: boolean): void {
  if (val) {
    sessionStorage.setItem(OWNER_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(OWNER_SESSION_KEY);
  }
}

export function logoutOwner(): void {
  sessionStorage.removeItem(OWNER_SESSION_KEY);
}

// Fetch server Resend email reminder engine status
export async function fetchReminderSystemStatus(): Promise<{
  configured: boolean;
  provider: 'resend' | 'none';
  fromEmail?: string;
  timezone: string;
  intervalSeconds: number;
  stats?: {
    totalConfirmed: number;
    scheduled: number;
    sent: number;
    failed: number;
    cancelled: number;
  };
}> {
  try {
    const res = await fetch('/api/reminders/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch reminder status:', err);
  }
  return {
    configured: false,
    provider: 'none',
    timezone: 'Australia/Sydney',
    intervalSeconds: 60
  };
}

// Admin trigger to immediately schedule/send or retry Resend email reminder for a booking
export async function triggerLessonReminder(
  bookingRefOrId: string, 
  force = false
): Promise<{
  success: boolean;
  emailId?: string;
  messageId?: string;
  error?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status?: string;
}> {
  const token = localStorage.getItem('instructor_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/reminders/send/${encodeURIComponent(bookingRefOrId)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ force })
  });

  const data = await res.json();
  return data;
}

// Compatibility alias
export const triggerWhatsAppReminder = triggerLessonReminder;
