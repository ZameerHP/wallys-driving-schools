import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, index } from 'drizzle-orm/pg-core';

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
  reminderStatus: text('reminder_status').default('pending'),
  reminderScheduledFor: text('reminder_scheduled_for'),
  reminderSentAt: text('reminder_sent_at'),
  reminderMessageId: text('reminder_message_id'),
  reminderError: text('reminder_error'),
  reminderRecipientPhone: text('reminder_recipient_phone'),
  reminderRecipientEmail: text('reminder_recipient_email'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  dateSlotIdx: index('booking_date_slot_idx').on(table.date, table.time),
  emailIdx: index('booking_email_idx').on(table.email),
  statusIdx: index('booking_status_idx').on(table.status),
  reminderStatusIdx: index('booking_reminder_status_idx').on(table.reminderStatus),
}));

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

// Audit logging table for booking state changes (instructor / system / webhook actions)
export const bookingAuditLogs = pgTable('booking_audit_logs', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref').notNull(),
  action: text('action').notNull(), // 'create', 'update_status', 'reschedule', 'cancel', 'refund', 'payment_verified'
  performedBy: text('performed_by').default('system').notNull(), // 'system', 'stripe_webhook', 'paypal_webhook', 'instructor', 'student'
  previousState: text('previous_state'),
  newState: text('new_state'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  auditBookingRefIdx: index('audit_booking_ref_idx').on(table.bookingRef),
  auditActionIdx: index('audit_action_idx').on(table.action),
}));

// Transactional email delivery and retry tracking logs (Resend integration)
export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref'),
  emailType: text('email_type').notNull(), // 'confirmation', 'receipt', 'cancellation', 'reminder', 'instructor_notification'
  recipientEmail: text('recipient_email').notNull(),
  status: text('status').notNull(), // 'sent', 'failed', 'retrying'
  messageId: text('message_id'),
  error: text('error'),
  retryCount: integer('retry_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  emailLogBookingRefIdx: index('email_log_booking_ref_idx').on(table.bookingRef),
  emailLogStatusIdx: index('email_log_status_idx').on(table.status),
}));

// Idempotent webhook event log to prevent duplicate processing
export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  provider: text('provider').notNull(), // 'stripe', 'paypal'
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').defaultNow(),
});

// Table relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.uid],
  }),
  auditLogs: many(bookingAuditLogs),
  emailLogs: many(emailLogs),
}));
