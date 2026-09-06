// Data layer for Wally's Driving School bookings
// Seamlessly syncs between Supabase, Cloud SQL PostgreSQL (/api/bookings), and local cache

import { getSupabase, isSupabaseConfigured } from './supabase';

export interface BookingItem {
  id: string;
  ref: string;
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
  stripeSessionId?: string | null;
}

const STORAGE_KEY = 'wallys_bookings_v3';

// Retrieve bookings cached in local storage
export function getStoredBookings(): BookingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
  if (!pickup && row.notes && typeof row.notes === 'string') {
    const pickupMatch = row.notes.match(/Pickup:\s*([^.]+)/i);
    if (pickupMatch) {
      pickup = pickupMatch[1].trim();
    }
  }

  return {
    id: String(row.id || row.booking_ref || row.bookingRef || Math.random()),
    ref: row.booking_ref || row.bookingRef || row.ref || `WD-${row.id || Math.floor(1000 + Math.random() * 9000)}`,
    studentName: row.student_name || row.studentName || row.name || 'Learner Driver',
    phone: row.phone || '',
    email: row.email || '',
    suburb: row.suburb || '',
    pickupAddress: pickup || undefined,
    packageTitle: row.package_title || row.packageTitle || row.package || 'Driving Lesson',
    packagePrice: Number(row.package_price || row.packagePrice || row.price || 70),
    date: row.date || '',
    time: row.time || '',
    status: (row.status as BookingItem['status']) || 'Pending',
    notes: row.notes || undefined,
    createdAt: row.created_at || row.createdAt 
      ? new Date(row.created_at || row.createdAt).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    isRescheduled: Boolean(row.is_rescheduled || row.isRescheduled || (row.notes && row.notes.includes('[RESCHEDULED]'))),
    paymentStatus: row.payment_status || row.paymentStatus || 'unpaid',
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
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
          .select('*')
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
        resultsMap.set(item.ref, item);
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

// Create new driving lesson booking across database, Supabase, and local storage
export async function createBookingInDb(
  booking: Omit<BookingItem, 'id' | 'ref' | 'createdAt'>, 
  token?: string | null
): Promise<BookingItem> {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = `WD-${randomNum}`;

  // 1. First create local booking item
  const localItem = addBooking({
    ...booking,
    ref: bookingRef,
  } as any);

  let finalItem: BookingItem = localItem;

  // 2. Send to Express Backend API (Cloud SQL)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
    if (res.ok) {
      const data = await res.json();
      finalItem = mapDbToBookingItem(data);
    }
  } catch (err) {
    console.warn('Failed to save to backend API directly:', err);
  }

  // 3. Send to Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        const payload = {
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
          notes: booking.notes || null,
          payment_status: 'unpaid',
        };
        const { data, error } = await sb.from('bookings').insert(payload).select().single();
        if (!error && data) {
          finalItem = mapDbToBookingItem(data);
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

// Update booking in backend API, Supabase, and local storage
export async function updateBookingInDb(
  id: string, 
  updates: Partial<BookingItem>,
  targetRef?: string
): Promise<void> {
  const refToMatch = targetRef || (id.startsWith('WD-') ? id : undefined);

  // 1. Update Backend API
  try {
    if (refToMatch) {
      await fetch(`/api/bookings/ref/${encodeURIComponent(refToMatch)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } else {
      const numId = parseInt(id.replace(/^b-/, ''), 10);
      if (!isNaN(numId)) {
        await fetch(`/api/bookings/${numId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      }
    }
  } catch (err) {
    console.warn('Failed to patch to Backend API:', err);
  }

  // 2. Update Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        const sbUpdates: Record<string, any> = {};
        if (updates.status) sbUpdates.status = updates.status;
        if (updates.studentName) sbUpdates.student_name = updates.studentName;
        if (updates.phone) sbUpdates.phone = updates.phone;
        if (updates.email) sbUpdates.email = updates.email;
        if (updates.suburb) sbUpdates.suburb = updates.suburb;
        if (updates.pickupAddress !== undefined) sbUpdates.pickup_address = updates.pickupAddress;
        if (updates.date) sbUpdates.date = updates.date;
        if (updates.time) sbUpdates.time = updates.time;
        if (updates.packageTitle) sbUpdates.package_title = updates.packageTitle;
        if (updates.packagePrice) sbUpdates.package_price = updates.packagePrice;
        if (updates.notes !== undefined) sbUpdates.notes = updates.notes;
        if (updates.isRescheduled !== undefined) sbUpdates.is_rescheduled = updates.isRescheduled;

        if (refToMatch) {
          await sb.from('bookings').update(sbUpdates).eq('booking_ref', refToMatch);
        } else {
          const numId = parseInt(id.replace(/^b-/, ''), 10);
          if (!isNaN(numId)) {
            await sb.from('bookings').update(sbUpdates).eq('id', numId);
          } else {
            await sb.from('bookings').update(sbUpdates).eq('booking_ref', id);
          }
        }
      } catch (err) {
        console.warn('Supabase booking update failed:', err);
      }
    }
  }

  // 3. Update local state
  updateBookingDetails(id, updates);
  if (refToMatch && refToMatch !== id) {
    updateBookingDetails(refToMatch, updates);
  }
}

// Delete booking from backend API, Supabase, and local storage
export async function deleteBookingFromDb(id: string, targetRef?: string): Promise<void> {
  const refToMatch = targetRef || (id.startsWith('WD-') ? id : undefined);
  const cleanId = String(id).replace(/^b-/, '');
  const numId = parseInt(cleanId, 10);

  // 1. Delete from Backend API (Cloud SQL) by Ref
  if (refToMatch) {
    try {
      await fetch(`/api/bookings/ref/${encodeURIComponent(refToMatch)}`, {
        method: 'DELETE',
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
      });
    } catch (err) {
      console.warn('Failed to delete from API by id:', err);
    }
  }

  // 3. Delete from Supabase if configured
  if (isSupabaseConfigured) {
    const sb = getSupabase();
    if (sb) {
      try {
        if (refToMatch) {
          await sb.from('bookings').delete().eq('booking_ref', refToMatch);
        }
        if (!isNaN(numId)) {
          await sb.from('bookings').delete().eq('id', numId);
        }
      } catch (err) {
        console.warn('Supabase booking deletion failed:', err);
      }
    }
  }

  // 4. Delete from local state
  deleteBooking(id);
  if (refToMatch && refToMatch !== id) {
    deleteBooking(refToMatch);
  }
}

// Default Owner Credentials
export const OWNER_CREDENTIALS = {
  username: "Wally@wallysdrivingschool.com.au",
  password: "Wellard44#",
  name: "Wally (Owner & Lead Instructor)",
  role: "Instructor"
};

// Check owner credentials
export function checkOwnerAuth(user: string, pass: string): boolean {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();
  
  return (
    (cleanUser === OWNER_CREDENTIALS.username.toLowerCase() || 
     cleanUser === "wally" || 
     cleanUser === "wally@wallysdrivingschool.com.au") &&
    cleanPass === OWNER_CREDENTIALS.password
  );
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
