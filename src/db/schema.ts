import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table with Firebase UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  role: text('role').default('student').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Bookings table storing driving lesson bookings
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref').notNull().unique(),
  userId: text('user_id'),
  studentName: text('student_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  suburb: text('suburb').notNull(),
  pickupAddress: text('pickup_address'),
  packageTitle: text('package_title').notNull(),
  packagePrice: integer('package_price').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  status: text('status').default('Pending').notNull(),
  notes: text('notes'),
  paymentStatus: text('payment_status').default('unpaid').notNull(),
  stripeSessionId: text('stripe_session_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Contact inquiry messages
export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject'),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Table relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.uid],
  }),
}));
