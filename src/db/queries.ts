import { db } from './index.ts';
import { users, bookings, contactMessages } from './schema.ts';
import { eq, desc, or } from 'drizzle-orm';

// Synchronize or create user upon Firebase Auth login
export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string
) {
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
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

// Fetch bookings with optional email or userId filter
export async function getBookings(filter?: { email?: string; userId?: string }) {
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
  } catch (error) {
    console.error('Database getBookings failed:', error);
    throw new Error('Failed to retrieve bookings.', { cause: error });
  }
}

// Retrieve single booking by reference code (e.g. WD-8492)
export async function getBookingByRef(bookingRef: string) {
  try {
    const result = await db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingRef, bookingRef))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Database getBookingByRef failed:', error);
    throw new Error('Failed to retrieve booking by reference.', { cause: error });
  }
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
  } catch (error) {
    console.error('Database createBooking failed:', error);
    throw new Error('Failed to create booking.', { cause: error });
  }
}

// Update existing booking by ID
export async function updateBooking(
  id: number,
  updates: Partial<typeof bookings.$inferInsert>
) {
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
  } catch (error) {
    console.error('Database updateBooking failed:', error);
    throw new Error('Failed to update booking.', { cause: error });
  }
}

// Update booking status by bookingRef
export async function updateBookingByRef(
  bookingRef: string,
  updates: Partial<typeof bookings.$inferInsert>
) {
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
  } catch (error) {
    console.error('Database updateBookingByRef failed:', error);
    throw new Error('Failed to update booking.', { cause: error });
  }
}

// Delete booking by ID
export async function deleteBookingById(id: number) {
  try {
    return await db.delete(bookings).where(eq(bookings.id, id)).returning();
  } catch (error) {
    console.error('Database deleteBookingById failed:', error);
    throw new Error('Failed to delete booking.', { cause: error });
  }
}

// Delete booking by ref
export async function deleteBookingByRef(bookingRef: string) {
  try {
    return await db.delete(bookings).where(eq(bookings.bookingRef, bookingRef)).returning();
  } catch (error) {
    console.error('Database deleteBookingByRef failed:', error);
    throw new Error('Failed to delete booking by ref.', { cause: error });
  }
}

// Save contact inquiry
export async function createContactMessage(data: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}) {
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
  } catch (error) {
    console.error('Database createContactMessage failed:', error);
    throw new Error('Failed to save contact message.', { cause: error });
  }
}
