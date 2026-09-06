import { db, isSqlConfigured } from './index.ts';
import { users, bookings, contactMessages } from './schema.ts';
import { eq, desc, or } from 'drizzle-orm';

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
    date: '2025-06-15',
    time: '10:00 AM',
    status: 'Confirmed',
    notes: 'Preparing for practical driving assessment at Rockingham DVS',
    paymentStatus: 'paid',
    stripeSessionId: null,
    createdAt: new Date('2025-06-01T08:30:00Z'),
    updatedAt: new Date('2025-06-01T08:30:00Z'),
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
    date: '2025-06-16',
    time: '02:00 PM',
    status: 'Pending',
    notes: 'Focus on parallel parking and roundabout navigation',
    paymentStatus: 'unpaid',
    stripeSessionId: null,
    createdAt: new Date('2025-06-02T11:15:00Z'),
    updatedAt: new Date('2025-06-02T11:15:00Z'),
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
    date: '2025-06-18',
    time: '09:30 AM',
    status: 'Confirmed',
    notes: 'PDA Test appointment at 10:45 AM, Rockingham Licensing Centre',
    paymentStatus: 'paid',
    stripeSessionId: null,
    createdAt: new Date('2025-06-03T14:20:00Z'),
    updatedAt: new Date('2025-06-03T14:20:00Z'),
  }
];

let nextBookingId = 4;
let nextUserId = 1;
let nextContactId = 1;

// Synchronize or create user upon Firebase Auth login
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
      console.warn('[AI Studio] PostgreSQL getOrCreateUser failed, using in-memory store:', error?.message);
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
  if (isSqlConfigured && db) {
    try {
      if (filter?.userId || filter?.email) {
        return await db
          .select()
          .from(bookings)
          .where(
            or(
              filter.userId ? eq(bookings.userId, filter.userId) : undefined,
              filter.email ? eq(bookings.email, filter.email) : undefined
            )
          )
          .orderBy(desc(bookings.createdAt));
      }
      return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL getBookings failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
  let list = [...inMemoryBookings];
  if (filter?.userId || filter?.email) {
    list = list.filter(b => 
      (filter.userId && b.userId === filter.userId) || 
      (filter.email && b.email.toLowerCase() === filter.email.toLowerCase())
    );
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Retrieve single booking by reference code (e.g. WD-8492)
export async function getBookingByRef(bookingRef: string) {
  if (isSqlConfigured && db) {
    try {
      const result = await db
        .select()
        .from(bookings)
        .where(eq(bookings.bookingRef, bookingRef))
        .limit(1);

      return result[0] || null;
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL getBookingByRef failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
  const cleanRef = bookingRef.trim().toUpperCase();
  const found = inMemoryBookings.find(b => b.bookingRef.toUpperCase() === cleanRef);
  return found || null;
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

      return result[0];
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL createBooking failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
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

  inMemoryBookings.unshift(newBooking);
  return newBooking;
}

// Update existing booking by ID
export async function updateBooking(
  id: number,
  updates: Partial<typeof bookings.$inferInsert>
) {
  if (isSqlConfigured && db) {
    try {
      const result = await db
        .update(bookings)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, id))
        .returning();

      return result[0];
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL updateBooking failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
  const idx = inMemoryBookings.findIndex(b => b.id === id);
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
  if (isSqlConfigured && db) {
    try {
      const result = await db
        .update(bookings)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(bookings.bookingRef, bookingRef))
        .returning();

      return result[0];
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL updateBookingByRef failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
  const cleanRef = bookingRef.trim().toUpperCase();
  const idx = inMemoryBookings.findIndex(b => b.bookingRef.toUpperCase() === cleanRef);
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
export async function deleteBookingById(id: number) {
  if (isSqlConfigured && db) {
    try {
      return await db.delete(bookings).where(eq(bookings.id, id)).returning();
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL deleteBookingById failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
  const idx = inMemoryBookings.findIndex(b => b.id === id);
  if (idx !== -1) {
    const deleted = inMemoryBookings.splice(idx, 1);
    return deleted;
  }
  return [];
}

// Delete booking by ref
export async function deleteBookingByRef(bookingRef: string) {
  if (isSqlConfigured && db) {
    try {
      return await db.delete(bookings).where(eq(bookings.bookingRef, bookingRef)).returning();
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL deleteBookingByRef failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
  const cleanRef = bookingRef.trim().toUpperCase();
  const idx = inMemoryBookings.findIndex(b => b.bookingRef.toUpperCase() === cleanRef);
  if (idx !== -1) {
    const deleted = inMemoryBookings.splice(idx, 1);
    return deleted;
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
  if (isSqlConfigured && db) {
    try {
      const result = await db
        .insert(contactMessages)
        .values({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          subject: data.subject || null,
          message: data.message,
        })
        .returning();

      return result[0];
    } catch (error: any) {
      console.warn('[AI Studio] PostgreSQL createContactMessage failed, using in-memory store:', error?.message);
    }
  }

  // In-memory fallback
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

