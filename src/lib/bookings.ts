// Data layer for Wallys Driving School bookings
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
  let pickup = row.pickup_location || row.pickup_address || row.pickupAddress || row.address || '';
  let extractedRef = row.booking_reference || row.booking_ref || row.bookingRef || row.ref || '';
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
    status: (() => {
      const s = String(row.status || '').trim().toLowerCase();
      if (s === 'confirmed' || s === 'rescheduled') return 'Confirmed';
      if (s === 'completed') return 'Completed';
      if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
      return 'Pending';
    })() as BookingItem['status'],
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
  const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null);
  const headers: Record<string, string> = {};
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
    headers['x-instructor-token'] = effectiveToken;
  }

  // The server is the single source of truth. Never merge browser cache or direct
  // anon-key Supabase results into the owner dashboard: stale cache can resurrect
  // deleted bookings and client-side writes can create duplicates.
  const res = await fetch('/api/bookings', { headers, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Unable to load bookings (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Booking API returned an invalid response.');
  }

  const items = data.map(mapDbToBookingItem);
  saveBookings(items);
  return items;
}

// Customer-facing lookup is reference-code-only. Do not query or merge the full
// booking list in the browser: that can expose other customers' personal data.
export async function searchCustomerBookings(query: string): Promise<BookingItem[]> {
  const raw = query.trim().replace(/^#/, '').trim();
  if (!raw) return [];

  const normalized = raw.toUpperCase();
  const candidates = normalized.startsWith('WD-')
    ? [normalized]
    : [`WD-${normalized}`, normalized];
  const uniqueCandidates = [...new Set(candidates)];

  for (const ref of uniqueCandidates) {
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(ref)}`, { cache: 'no-store' });
      if (res.status === 404) continue;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || 'Unable to look up this booking right now.');
      }
      const data = await res.json();
      if (data && (data.bookingRef || data.booking_reference || data.booking_ref || data.bookingRef)) {
        return [mapDbToBookingItem(data)];
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
      console.warn('Customer booking lookup temporarily unavailable:', error);
      throw new Error('Booking lookup is temporarily unavailable. Please try again in a moment.');
    }
  }

  return [];
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
// Create bookings through the server only. The server validates availability,
// verifies payment/authentication and persists the canonical Supabase record.
// Never fall back to localStorage or issue a second browser-side Supabase insert:
// either behavior can tell customers a booking succeeded when it was not saved.
export async function createBookingInDb(
  booking: Omit<BookingItem, 'id' | 'ref' | 'createdAt'> & Partial<ManualBookingData> & { verificationToken?: string },
  token?: string | null
): Promise<BookingItem> {
  const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = booking.bookingRef || `WD-${randomNum}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (booking.verificationToken) {
    headers['x-email-verification-token'] = booking.verificationToken;
  }
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
    headers['x-instructor-token'] = effectiveToken;
  }

  let res: Response;
  try {
    res = await fetch('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...booking,
        bookingRef,
        pickupAddress: booking.pickupAddress || null,
        status: booking.status || 'Pending'
      }),
    });
  } catch (error) {
    console.error('Booking API request failed:', error);
    throw new Error('We could not confirm the booking server response. Please check Manage Booking before trying again; do not submit payment again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'The booking could not be saved. Please review the details and try again.');
  }

  const finalItem = mapDbToBookingItem(data);
  if (!finalItem.ref) {
    throw new Error('The server did not return a booking reference. Please contact Wally before retrying.');
  }

  const current = getStoredBookings(true);
  saveBookings([finalItem, ...current.filter(item => item.ref !== finalItem.ref)]);
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
  const refToMatch = targetRef || (/^(WD-|REF-)/i.test(id) ? id : undefined);
  let serverUpdatedItem: any = null;

  let token = typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null;
  if (!token && typeof window !== 'undefined' && isOwnerLoggedIn()) {
    token = 'wally_owner_session';
  }
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
        throw new Error(errData.message || errData.error || 'Failed to update booking');
      }
      serverUpdatedItem = await res.json();
    } else {
      throw new Error('Unable to identify booking reference for update');
    }
  } catch (err: any) {
    console.warn('Failed to patch to Backend API:', err);
    throw err;
  }

  // 2. Backend is the authoritative writer. Direct browser writes are intentionally disabled
  // because production Supabase uses RLS and a relational schema.

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
  const refToMatch = targetRef || (/^(WD-|REF-)/i.test(id) ? id : undefined);
  const cleanId = String(id).replace(/^b-/, '');
  const numId = parseInt(cleanId, 10);
  let token = typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null;
  if (!token && typeof window !== 'undefined' && isOwnerLoggedIn()) {
    token = 'wally_owner_session';
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-instructor-token'] = token;
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

  // 3. Backend is the authoritative deleter. Direct browser deletes are intentionally disabled.

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null;
  sessionStorage.removeItem(OWNER_SESSION_KEY);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('instructor_token');
    if (token) {
      fetch('/api/auth/instructor-logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-instructor-token': token
        }
      }).catch(() => {});
    }
  }
}

// Fetch server Resend email reminder engine status
export async function fetchReminderSystemStatus(): Promise<{
  configured: boolean;
  provider: 'resend' | 'gmail' | 'smtp' | 'simulation' | 'none' | string;
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
