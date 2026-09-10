var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import express from "express";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookingAuditLogs: () => bookingAuditLogs,
  bookings: () => bookings,
  bookingsRelations: () => bookingsRelations,
  contactMessages: () => contactMessages,
  emailLogs: () => emailLogs,
  users: () => users,
  usersRelations: () => usersRelations,
  webhookEvents: () => webhookEvents
});
import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  role: text("role").default("student").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingRef: text("booking_ref").notNull().unique(),
  userId: text("user_id"),
  studentName: text("student_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  suburb: text("suburb").notNull(),
  pickupAddress: text("pickup_address"),
  packageTitle: text("package_title").notNull(),
  packagePrice: integer("package_price").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").default("Pending").notNull(),
  notes: text("notes"),
  paymentStatus: text("payment_status").default("unpaid").notNull(),
  stripeSessionId: text("stripe_session_id"),
  reminderStatus: text("reminder_status").default("pending"),
  reminderScheduledFor: text("reminder_scheduled_for"),
  reminderSentAt: text("reminder_sent_at"),
  reminderMessageId: text("reminder_message_id"),
  reminderError: text("reminder_error"),
  reminderRecipientPhone: text("reminder_recipient_phone"),
  reminderRecipientEmail: text("reminder_recipient_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  dateSlotIdx: index("booking_date_slot_idx").on(table.date, table.time),
  emailIdx: index("booking_email_idx").on(table.email),
  statusIdx: index("booking_status_idx").on(table.status),
  reminderStatusIdx: index("booking_reminder_status_idx").on(table.reminderStatus)
}));
var contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var bookingAuditLogs = pgTable("booking_audit_logs", {
  id: serial("id").primaryKey(),
  bookingRef: text("booking_ref").notNull(),
  action: text("action").notNull(),
  // 'create', 'update_status', 'reschedule', 'cancel', 'refund', 'payment_verified'
  performedBy: text("performed_by").default("system").notNull(),
  // 'system', 'stripe_webhook', 'paypal_webhook', 'instructor', 'student'
  previousState: text("previous_state"),
  newState: text("new_state"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  auditBookingRefIdx: index("audit_booking_ref_idx").on(table.bookingRef),
  auditActionIdx: index("audit_action_idx").on(table.action)
}));
var emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  bookingRef: text("booking_ref"),
  emailType: text("email_type").notNull(),
  // 'confirmation', 'receipt', 'cancellation', 'reminder', 'instructor_notification'
  recipientEmail: text("recipient_email").notNull(),
  status: text("status").notNull(),
  // 'sent', 'failed', 'retrying'
  messageId: text("message_id"),
  error: text("error"),
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  emailLogBookingRefIdx: index("email_log_booking_ref_idx").on(table.bookingRef),
  emailLogStatusIdx: index("email_log_status_idx").on(table.status)
}));
var webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  provider: text("provider").notNull(),
  // 'stripe', 'paypal'
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings)
}));
var bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.uid]
  }),
  auditLogs: many(bookingAuditLogs),
  emailLogs: many(emailLogs)
}));

// src/db/index.ts
var isSqlConfigured = Boolean(
  process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_PASSWORD && process.env.SQL_DB_NAME
);
var createPool = () => {
  if (!isSqlConfigured) {
    return null;
  }
  if (!global._postgresPool) {
    try {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 5e3
      });
      global._postgresPool.on("error", (err) => {
        console.warn("[AI Studio] Idle PostgreSQL pool warning:", err.message);
      });
    } catch (err) {
      console.warn("[AI Studio] Failed to create PostgreSQL pool:", err?.message);
      return null;
    }
  }
  return global._postgresPool;
};
var pool = createPool();
var dbInstance;
try {
  if (pool) {
    dbInstance = drizzle(pool, { schema: schema_exports });
  } else {
    throw new Error("PostgreSQL credentials not configured");
  }
} catch {
  console.warn("[AI Studio] Database not connected \u2014 using mock");
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d) => d?.data ?? {},
    update: async (d) => d?.data ?? {},
    delete: async () => ({})
  };
  const chainable = new Proxy(() => {
  }, {
    get: (_, prop) => {
      if (prop === "then") {
        return (resolve) => resolve([]);
      }
      return chainable;
    },
    apply: () => chainable
  });
  dbInstance = new Proxy({}, {
    get: (_, prop) => {
      if (prop === "query") {
        return new Proxy({}, { get: () => noOp });
      }
      return chainable;
    }
  });
}
var db = dbInstance;

// src/db/queries.ts
import { eq, desc } from "drizzle-orm";

// src/lib/supabase-server.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
var isSupabaseServerConfigured = Boolean(
  supabaseUrl && supabaseKey && supabaseUrl.startsWith("http") && supabaseKey.length > 10
);
var serverClientInstance = null;
function getSupabaseServerClient() {
  if (!isSupabaseServerConfigured) {
    return null;
  }
  if (!serverClientInstance) {
    try {
      serverClientInstance = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log(`[Supabase Server] Connected to ${supabaseUrl}`);
    } catch (err) {
      console.warn("[Supabase Server] Failed to initialize Supabase server client:", err?.message || err);
      return null;
    }
  }
  return serverClientInstance;
}
async function checkSupabaseConnection() {
  const status = {
    configured: isSupabaseServerConfigured,
    url: supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, "").split(".")[0] + ".supabase.co" : "",
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    connected: false,
    tables: {
      bookings: false,
      students: false,
      instructors: false
    }
  };
  const client = getSupabaseServerClient();
  if (!client) {
    return status;
  }
  try {
    const [bRes, sRes, iRes] = await Promise.all([
      client.from("bookings").select("id").limit(1),
      client.from("students").select("id").limit(1),
      client.from("instructors").select("id").limit(1)
    ]);
    status.tables.bookings = !bRes.error;
    status.tables.students = !sRes.error;
    status.tables.instructors = !iRes.error;
    status.connected = !bRes.error || !sRes.error || !iRes.error;
  } catch (err) {
    status.connected = false;
  }
  return status;
}

// src/db/queries.ts
var inMemoryUsers = /* @__PURE__ */ new Map();
var inMemoryContactMessages = [];
var inMemoryAuditLogs = [];
var inMemoryEmailLogs = [];
var inMemoryWebhookEvents = /* @__PURE__ */ new Set();
var inMemoryBookings = [
  {
    id: 1,
    bookingRef: "WD-8492",
    userId: null,
    studentName: "Sarah Jenkins",
    phone: "0412 345 678",
    email: "sarah.j@example.com",
    suburb: "Wellard",
    pickupAddress: "14 Chiswick Approach, Wellard WA 6170",
    packageTitle: "1 Hour Driving Lesson",
    packagePrice: 65,
    date: "2026-06-15",
    time: "10:00 AM",
    status: "Confirmed",
    notes: "Preparing for practical driving assessment at Rockingham DVS",
    paymentStatus: "paid",
    stripeSessionId: null,
    reminderStatus: "scheduled",
    reminderScheduledFor: "2026-06-15T00:00:00.000Z",
    reminderSentAt: null,
    reminderMessageId: null,
    reminderError: null,
    reminderRecipientPhone: "+61412345678",
    createdAt: /* @__PURE__ */ new Date("2026-06-01T08:30:00Z"),
    updatedAt: /* @__PURE__ */ new Date("2026-06-01T08:30:00Z")
  },
  {
    id: 3,
    bookingRef: "WD-7521",
    userId: null,
    studentName: "Emma Watson",
    phone: "0434 567 890",
    email: "emma.w@example.com",
    suburb: "Rockingham",
    pickupAddress: "55 Simpson Ave, Rockingham WA 6168",
    packageTitle: "Car Hire + 1 Hour Lesson",
    packagePrice: 200,
    date: "2026-06-18",
    time: "09:00 AM",
    status: "Confirmed",
    notes: "PDA car hire package. DVS test scheduled at 10:05 AM",
    paymentStatus: "paid",
    stripeSessionId: null,
    reminderStatus: "sent",
    reminderScheduledFor: "2026-06-18T00:00:00.000Z",
    reminderSentAt: "2026-06-18T00:00:05.000Z",
    reminderMessageId: "wamid.HBgM0434567890WA01",
    reminderError: null,
    reminderRecipientPhone: "+61434567890",
    createdAt: /* @__PURE__ */ new Date("2026-06-03T14:20:00Z"),
    updatedAt: /* @__PURE__ */ new Date("2026-06-03T14:20:00Z")
  },
  {
    id: 4,
    bookingRef: "WD-9943",
    userId: null,
    studentName: "Liam O'Connor",
    phone: "0445 678 901",
    email: "liam.oc@example.com",
    suburb: "Kwinana",
    pickupAddress: "12 Gilmore Ave, Kwinana WA 6167",
    packageTitle: "1 Hour Driving Lesson",
    packagePrice: 65,
    date: "2026-06-20",
    time: "11:30 AM",
    status: "Confirmed",
    notes: "Initial lesson, automatic dual controls requested",
    paymentStatus: "paid",
    stripeSessionId: null,
    reminderStatus: "scheduled",
    reminderScheduledFor: "2026-06-20T01:30:00.000Z",
    reminderSentAt: null,
    reminderMessageId: null,
    reminderError: null,
    reminderRecipientPhone: "+61445678901",
    createdAt: /* @__PURE__ */ new Date("2026-06-04T09:00:00Z"),
    updatedAt: /* @__PURE__ */ new Date("2026-06-04T09:00:00Z")
  }
];
var nextBookingId = 10;
var nextUserId = 1;
var nextContactId = 1;
function mapSupabaseRowToBooking(row) {
  let pickup = row.pickup_address || row.pickupAddress || "";
  let ref = row.booking_ref || row.bookingRef || "";
  let suburb = row.suburb || "";
  let price = Number(row.package_price || row.packagePrice || 0);
  let payment = row.payment_status || row.paymentStatus || "unpaid";
  if (row.notes && typeof row.notes === "string") {
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
    if (payment === "unpaid") {
      const match = row.notes.match(/\[Payment:\s*([^\]]+)\]/i);
      if (match) payment = match[1].trim();
    }
  }
  if (!ref) ref = `WD-${row.id || Math.floor(1e3 + Math.random() * 9e3)}`;
  if (!price) price = 65;
  return {
    id: row.id || ref,
    bookingRef: ref,
    userId: row.user_id || row.userId || null,
    studentName: row.students?.full_name || row.student_name || row.studentName || "Learner Driver",
    phone: row.students?.phone || row.phone || "",
    email: row.students?.email || row.email || "",
    suburb: suburb || "Rockingham & Surrounds",
    pickupAddress: pickup || null,
    packageTitle: row.lesson_type || row.package_title || row.packageTitle || "1 Hour Driving Lesson",
    packagePrice: price,
    date: row.lesson_date || row.date || "",
    time: row.start_time || row.time || "",
    status: row.status || "Pending",
    notes: row.notes || null,
    paymentStatus: payment,
    stripeSessionId: row.stripe_session_id || row.stripeSessionId || null,
    reminderStatus: row.reminder_status || row.reminderStatus || (row.status === "Confirmed" ? "scheduled" : "pending"),
    reminderScheduledFor: row.reminder_scheduled_for || row.reminderScheduledFor || null,
    reminderSentAt: row.reminder_sent_at || row.reminderSentAt || null,
    reminderMessageId: row.reminder_message_id || row.reminderMessageId || null,
    reminderError: row.reminder_error || row.reminderError || null,
    reminderRecipientPhone: row.reminder_recipient_phone || row.reminderRecipientPhone || null,
    reminderRecipientEmail: row.reminder_recipient_email || row.reminderRecipientEmail || row.email || null,
    createdAt: row.created_at ? new Date(row.created_at) : /* @__PURE__ */ new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : /* @__PURE__ */ new Date()
  };
}
async function getOrCreateUser(uid, email, displayName, photoUrl) {
  if (isSqlConfigured && db) {
    try {
      const result = await db.insert(users).values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
        role: "student"
      }).onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning();
      return result[0];
    } catch (error) {
      console.warn("[AI Studio] PostgreSQL getOrCreateUser fallback:", error?.message);
    }
  }
  let user = inMemoryUsers.get(uid);
  if (!user) {
    user = {
      id: nextUserId++,
      uid,
      email,
      displayName: displayName || null,
      photoUrl: photoUrl || null,
      role: "student",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
  } else {
    user = {
      ...user,
      email,
      displayName: displayName || user.displayName,
      photoUrl: photoUrl || user.photoUrl,
      updatedAt: /* @__PURE__ */ new Date()
    };
  }
  inMemoryUsers.set(uid, user);
  return user;
}
async function getBookings(filter) {
  const mergedMap = /* @__PURE__ */ new Map();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("bookings").select("*, students(*), instructors(*)").order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const mapped = mapSupabaseRowToBooking(row);
          if (mapped.bookingRef) {
            mergedMap.set(mapped.bookingRef.toUpperCase(), mapped);
          }
        }
      }
    } catch (err) {
      console.warn("[Supabase Server] getBookings notice:", err?.message || err);
    }
  }
  if (isSqlConfigured && db) {
    try {
      const sqlRows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
      for (const row of sqlRows) {
        if (row.bookingRef) {
          mergedMap.set(row.bookingRef.toUpperCase(), row);
        }
      }
    } catch (error) {
      console.warn("[AI Studio] PostgreSQL getBookings notice:", error?.message);
    }
  }
  for (const b of inMemoryBookings) {
    if (b.bookingRef && !mergedMap.has(b.bookingRef.toUpperCase())) {
      mergedMap.set(b.bookingRef.toUpperCase(), b);
    }
  }
  let list = Array.from(mergedMap.values());
  if (!filter?.includeUnpaid) {
    list = list.filter((b) => b.paymentStatus === "paid");
  }
  if (filter?.userId || filter?.email) {
    list = list.filter(
      (b) => filter.userId && b.userId === filter.userId || filter.email && b.email && b.email.toLowerCase() === filter.email.toLowerCase()
    );
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function getBookingByRef(bookingRef, options) {
  const cleanRef = bookingRef.trim().toUpperCase();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("bookings").select("*, students(*), instructors(*)").ilike("notes", `%${cleanRef}%`).limit(1);
      if (!error && data && data.length > 0) {
        const found2 = mapSupabaseRowToBooking(data[0]);
        if (found2 && (options?.allowUnpaid || found2.paymentStatus === "paid")) {
          return found2;
        }
      }
    } catch {
    }
  }
  if (isSqlConfigured && db) {
    try {
      const result = await db.select().from(bookings).where(eq(bookings.bookingRef, bookingRef)).limit(1);
      if (result[0] && (options?.allowUnpaid || result[0].paymentStatus === "paid")) {
        return result[0];
      }
    } catch {
    }
  }
  const found = inMemoryBookings.find((b) => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  if (found && (options?.allowUnpaid || found.paymentStatus === "paid")) {
    return found;
  }
  return null;
}
async function getPendingBookingForCustomer(email, phone, date, time) {
  const cleanEmail = email?.trim().toLowerCase();
  const cleanPhone = phone?.replace(/\D/g, "");
  const normalizedDate = date?.trim();
  const normalizedTime = time?.trim();
  if (!normalizedDate || !normalizedTime || !cleanEmail && !cleanPhone) {
    return null;
  }
  const allBookings = await getBookings();
  return allBookings.find(
    (b) => b.date === normalizedDate && b.time === normalizedTime && (b.status === "Pending" || b.paymentStatus === "unpaid") && (cleanEmail && b.email?.toLowerCase() === cleanEmail || cleanPhone && b.phone?.replace(/\D/g, "") === cleanPhone)
  ) || null;
}
function normalizeDate(dateStr) {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const MONTHS = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12"
  };
  const textMatch1 = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:,?\s+(\d{4}))?$/i);
  if (textMatch1) {
    const day = textMatch1[1].padStart(2, "0");
    const mon = textMatch1[2].toLowerCase();
    const month = MONTHS[mon];
    const year = textMatch1[3] || (/* @__PURE__ */ new Date()).getFullYear().toString();
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  const textMatch2 = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);
  if (textMatch2) {
    const mon = textMatch2[1].toLowerCase();
    const day = textMatch2[2].padStart(2, "0");
    const month = MONTHS[mon];
    const year = textMatch2[3] || (/* @__PURE__ */ new Date()).getFullYear().toString();
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return trimmed.toLowerCase();
}
function parseTimeInterval(timeStr, defaultDurationMinutes = 60) {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().replace(/\s+/g, " ");
  const rangeMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i) || trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (rangeMatch) {
    const parsePart = (hStr, mStr, ampmStr) => {
      let h = parseInt(hStr, 10);
      const m = mStr ? parseInt(mStr, 10) : 0;
      const ampm = (ampmStr || "").toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    let startAmpm = rangeMatch[3];
    let endAmpm = rangeMatch[6];
    const startH = parseInt(rangeMatch[1], 10);
    const endH = parseInt(rangeMatch[4], 10);
    if (!startAmpm && !endAmpm) {
      startAmpm = startH >= 7 && startH <= 12 ? "AM" : "PM";
      endAmpm = endH >= 7 && endH <= 12 ? "AM" : "PM";
    } else if (!startAmpm && endAmpm) {
      if (endAmpm.toUpperCase() === "PM" && startH <= endH && startH >= 12) {
        startAmpm = "PM";
      } else if (endAmpm.toUpperCase() === "PM" && startH > endH && startH <= 12) {
        startAmpm = "AM";
      } else {
        startAmpm = endAmpm;
      }
    } else if (startAmpm && !endAmpm) {
      if (startAmpm.toUpperCase() === "AM" && endH < startH) {
        endAmpm = "PM";
      } else {
        endAmpm = startAmpm;
      }
    }
    const start = parsePart(rangeMatch[1], rangeMatch[2], startAmpm);
    const end = parsePart(rangeMatch[4], rangeMatch[5], endAmpm);
    return { start, end: end > start ? end : start + defaultDurationMinutes };
  }
  const singleMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (singleMatch) {
    let h = parseInt(singleMatch[1], 10);
    const m = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    let ampm = (singleMatch[3] || "").toUpperCase();
    if (!ampm) {
      ampm = h >= 7 && h <= 12 ? "AM" : "PM";
    }
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const start = h * 60 + m;
    return { start, end: start + defaultDurationMinutes };
  }
  return null;
}
function isTimeSlotConflicting(slot1, slot2, bufferMinutes = 30) {
  return slot1.start < slot2.end + bufferMinutes && slot1.end > slot2.start - bufferMinutes;
}
var BookingLockManager = class {
  constructor() {
    this.queues = /* @__PURE__ */ new Map();
  }
  async runExclusive(key, fn) {
    const normalizedKey = key.trim().toLowerCase();
    const prevPromise = this.queues.get(normalizedKey) || Promise.resolve();
    let releaseLock;
    const lockGate = new Promise((resolve) => {
      releaseLock = resolve;
    });
    const nextInQueue = prevPromise.then(() => lockGate, () => lockGate);
    this.queues.set(normalizedKey, nextInQueue);
    await prevPromise.catch(() => {
    });
    try {
      return await fn();
    } finally {
      releaseLock();
      if (this.queues.get(normalizedKey) === nextInQueue) {
        this.queues.delete(normalizedKey);
      }
    }
  }
};
var bookingLock = new BookingLockManager();
async function checkSlotBooked(date, time, excludeRef, customerEmail, customerPhone) {
  const normTargetDate = normalizeDate(date);
  if (!normTargetDate) return false;
  const targetInterval = parseTimeInterval(time);
  const cleanEmail = customerEmail?.trim().toLowerCase();
  const cleanPhone = customerPhone?.replace(/\D/g, "");
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1e3;
  const currentBookings = await getBookings({ includeUnpaid: true });
  for (const r of currentBookings) {
    if (excludeRef && r.bookingRef && r.bookingRef.toUpperCase() === excludeRef.toUpperCase()) {
      continue;
    }
    if (r.status === "Cancelled") {
      continue;
    }
    const bookingNormDate = normalizeDate(r.date);
    if (!bookingNormDate || bookingNormDate !== normTargetDate) {
      continue;
    }
    const existingInterval = parseTimeInterval(r.time);
    let timeConflicts = false;
    if (targetInterval && existingInterval) {
      timeConflicts = isTimeSlotConflicting(targetInterval, existingInterval, 30);
    } else {
      const cleanT1 = time.replace(/\s+/g, " ").toLowerCase();
      const cleanT2 = (r.time || "").replace(/\s+/g, " ").toLowerCase();
      timeConflicts = cleanT1 === cleanT2;
    }
    if (!timeConflicts) {
      continue;
    }
    if (r.status === "Confirmed" || r.paymentStatus === "paid") {
      return true;
    }
    if (r.status === "Pending" || r.paymentStatus === "unpaid") {
      if (cleanEmail && r.email && r.email.toLowerCase() === cleanEmail) {
        continue;
      }
      if (cleanPhone && r.phone && r.phone.replace(/\D/g, "") === cleanPhone) {
        continue;
      }
      const createdAtMs = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (createdAtMs > 0 && now - createdAtMs > PENDING_TIMEOUT_MS) {
        continue;
      }
      return true;
    }
  }
  return false;
}
async function checkMultipleSlotsBooked(lessons, excludeRef, customerEmail, customerPhone) {
  const conflicts = [];
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
async function createBooking(data) {
  const normDate = normalizeDate(data.date);
  return await bookingLock.runExclusive(normDate || "all-dates", async () => {
    const isTaken = await checkSlotBooked(
      data.date,
      data.time,
      data.bookingRef,
      data.email,
      data.phone
    );
    if (isTaken) {
      const err = new Error("This time slot was just booked by another customer. Please select another time.");
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
      status: data.status || "Pending",
      notes: data.notes || null,
      paymentStatus: data.paymentStatus || "unpaid",
      stripeSessionId: data.stripeSessionId || null,
      reminderStatus: data.reminderStatus || (data.status === "Confirmed" ? "scheduled" : "pending"),
      reminderScheduledFor: data.reminderScheduledFor || null,
      reminderSentAt: data.reminderSentAt || null,
      reminderMessageId: data.reminderMessageId || null,
      reminderError: data.reminderError || null,
      reminderRecipientPhone: data.reminderRecipientPhone || null,
      reminderRecipientEmail: data.reminderRecipientEmail || data.email || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        let studentId = null;
        if (data.studentName) {
          try {
            const { data: stdData } = await supabase.from("students").upsert({
              full_name: data.studentName,
              phone: data.phone,
              email: data.email
            }).select("id").single();
            if (stdData?.id) studentId = stdData.id;
          } catch {
          }
        }
        const formattedNotes = `[BookingRef: ${data.bookingRef}] [Price: $${data.packagePrice}] [Suburb: ${data.suburb}] ${data.pickupAddress ? `[Pickup: ${data.pickupAddress}]` : ""} ${data.notes || ""}`.trim();
        const { data: sbRow, error: sbErr } = await supabase.from("bookings").insert({
          student_id: studentId,
          lesson_type: data.packageTitle,
          lesson_date: data.date,
          start_time: data.time,
          status: data.status || "Pending",
          notes: formattedNotes
        }).select("*, students(*), instructors(*)").single();
        if (!sbErr && sbRow) {
          const mapped = mapSupabaseRowToBooking(sbRow);
          inMemoryBookings.unshift(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn("[Supabase Server] createBooking fallback:", err?.message || err);
      }
    }
    if (isSqlConfigured && db) {
      try {
        const result = await db.insert(bookings).values({
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
          status: data.status || "Confirmed",
          notes: data.notes || null,
          paymentStatus: data.paymentStatus || "unpaid",
          stripeSessionId: data.stripeSessionId || null,
          reminderStatus: data.reminderStatus || (data.status === "Confirmed" ? "scheduled" : "pending"),
          reminderScheduledFor: data.reminderScheduledFor || null,
          reminderSentAt: data.reminderSentAt || null,
          reminderMessageId: data.reminderMessageId || null,
          reminderError: data.reminderError || null,
          reminderRecipientPhone: data.reminderRecipientPhone || null,
          reminderRecipientEmail: data.reminderRecipientEmail || data.email || null
        }).returning();
        if (result[0]) {
          inMemoryBookings.unshift(result[0]);
          return result[0];
        }
      } catch (error) {
        console.warn("[AI Studio] PostgreSQL createBooking fallback:", error?.message);
      }
    }
    inMemoryBookings.unshift(newBooking);
    return newBooking;
  });
}
async function updateBooking(id, updates) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const numId = typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, ""), 10);
      const sbUpdates = {};
      if (updates.status) sbUpdates.status = updates.status;
      if (updates.notes) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;
      if (!isNaN(numId)) {
        await supabase.from("bookings").update(sbUpdates).eq("id", numId);
      }
    } catch {
    }
  }
  if (isSqlConfigured && db) {
    try {
      const numId = typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, ""), 10);
      if (!isNaN(numId)) {
        await db.update(bookings).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(bookings.id, numId));
      }
    } catch (err) {
    }
  }
  const idx = inMemoryBookings.findIndex((b) => String(b.id) === String(id));
  if (idx !== -1) {
    inMemoryBookings[idx] = {
      ...inMemoryBookings[idx],
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    return inMemoryBookings[idx];
  }
  return null;
}
async function updateBookingByRef(bookingRef, updates) {
  const cleanRef = bookingRef.trim().toUpperCase();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const sbUpdates = {};
      if (updates.status) sbUpdates.status = updates.status;
      if (updates.notes) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;
      await supabase.from("bookings").update(sbUpdates).ilike("notes", `%${cleanRef}%`);
    } catch {
    }
  }
  if (isSqlConfigured && db) {
    try {
      await db.update(bookings).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(bookings.bookingRef, bookingRef));
    } catch {
    }
  }
  const idx = inMemoryBookings.findIndex((b) => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  if (idx !== -1) {
    inMemoryBookings[idx] = {
      ...inMemoryBookings[idx],
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    return inMemoryBookings[idx];
  }
  return null;
}
async function deleteBookingById(id) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const numId = typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, ""), 10);
      if (!isNaN(numId)) {
        await supabase.from("bookings").delete().eq("id", numId);
      }
    } catch {
    }
  }
  const idx = inMemoryBookings.findIndex((b) => String(b.id) === String(id));
  if (idx !== -1) {
    return inMemoryBookings.splice(idx, 1);
  }
  return [];
}
async function deleteBookingByRef(bookingRef) {
  const cleanRef = bookingRef.trim().toUpperCase();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("bookings").delete().ilike("notes", `%${cleanRef}%`);
    } catch {
    }
  }
  const idx = inMemoryBookings.findIndex((b) => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  if (idx !== -1) {
    return inMemoryBookings.splice(idx, 1);
  }
  return [];
}
async function createContactMessage(data) {
  const newMsg = {
    id: nextContactId++,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    subject: data.subject || null,
    message: data.message,
    createdAt: /* @__PURE__ */ new Date()
  };
  inMemoryContactMessages.push(newMsg);
  return newMsg;
}
async function logBookingAudit(entry) {
  const auditRecord = {
    id: inMemoryAuditLogs.length + 1,
    bookingRef: entry.bookingRef || "N/A",
    action: entry.action,
    performedBy: entry.performedBy || "system",
    previousState: entry.previousState || null,
    newState: entry.newState || null,
    notes: entry.notes || null,
    createdAt: /* @__PURE__ */ new Date()
  };
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("booking_audit_logs").insert([{
        booking_ref: entry.bookingRef || "N/A",
        action: entry.action,
        performed_by: entry.performedBy || "system",
        previous_state: entry.previousState || null,
        new_state: entry.newState || null,
        notes: entry.notes || null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }]);
    } catch (sbErr) {
    }
  }
  if (isSqlConfigured && db) {
    try {
      await db.insert(bookingAuditLogs).values({
        bookingRef: entry.bookingRef || "N/A",
        action: entry.action,
        performedBy: entry.performedBy || "system",
        previousState: entry.previousState || null,
        newState: entry.newState || null,
        notes: entry.notes || null
      });
    } catch (sqlErr) {
    }
  }
  inMemoryAuditLogs.unshift(auditRecord);
  return auditRecord;
}
async function getBookingAuditLogs(bookingRef, limit = 50) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      let query = supabase.from("booking_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (bookingRef) {
        query = query.eq("booking_ref", bookingRef);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
    }
  }
  if (isSqlConfigured && db) {
    try {
      if (bookingRef) {
        return await db.select().from(bookingAuditLogs).where(eq(bookingAuditLogs.bookingRef, bookingRef)).orderBy(desc(bookingAuditLogs.createdAt)).limit(limit);
      }
      return await db.select().from(bookingAuditLogs).orderBy(desc(bookingAuditLogs.createdAt)).limit(limit);
    } catch {
    }
  }
  if (bookingRef) {
    return inMemoryAuditLogs.filter((log) => log.bookingRef === bookingRef).slice(0, limit);
  }
  return inMemoryAuditLogs.slice(0, limit);
}
async function logEmailDelivery(entry) {
  const logRecord = {
    id: inMemoryEmailLogs.length + 1,
    bookingRef: entry.bookingRef || null,
    emailType: entry.emailType,
    recipientEmail: entry.recipientEmail,
    status: entry.status,
    messageId: entry.messageId || null,
    error: entry.error || null,
    retryCount: entry.retryCount ?? 0,
    createdAt: /* @__PURE__ */ new Date()
  };
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("email_logs").insert([{
        booking_ref: entry.bookingRef || null,
        email_type: entry.emailType,
        recipient_email: entry.recipientEmail,
        status: entry.status,
        message_id: entry.messageId || null,
        error: entry.error || null,
        retry_count: entry.retryCount ?? 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }]);
    } catch {
    }
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
        retryCount: entry.retryCount ?? 0
      });
    } catch {
    }
  }
  inMemoryEmailLogs.unshift(logRecord);
  return logRecord;
}
async function isWebhookEventProcessed(eventId) {
  if (!eventId) return false;
  if (inMemoryWebhookEvents.has(eventId)) return true;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data } = await supabase.from("webhook_events").select("event_id").eq("event_id", eventId).single();
      if (data) {
        inMemoryWebhookEvents.add(eventId);
        return true;
      }
    } catch {
    }
  }
  if (isSqlConfigured && db) {
    try {
      const existing = await db.select().from(webhookEvents).where(eq(webhookEvents.eventId, eventId)).limit(1);
      if (existing.length > 0) {
        inMemoryWebhookEvents.add(eventId);
        return true;
      }
    } catch {
    }
  }
  return false;
}
async function recordWebhookEvent(eventId, provider, eventType) {
  if (!eventId) return;
  inMemoryWebhookEvents.add(eventId);
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("webhook_events").insert([{
        event_id: eventId,
        provider,
        event_type: eventType,
        processed_at: (/* @__PURE__ */ new Date()).toISOString()
      }]);
    } catch {
    }
  }
  if (isSqlConfigured && db) {
    try {
      await db.insert(webhookEvents).values({
        eventId,
        provider,
        eventType
      });
    } catch {
    }
  }
}

// src/middleware/auth.ts
function parseTokenPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
      const uid = payload.sub || payload.user_id || payload.id;
      if (uid) {
        return {
          uid,
          id: uid,
          email: payload.email,
          name: payload.user_metadata?.full_name || payload.name || payload.email,
          ...payload
        };
      }
    }
  } catch {
  }
  return null;
}
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1].trim();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          uid: user.id,
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          role: user.role,
          ...user
        };
        return next();
      }
    } catch {
    }
  }
  const parsed = parseTokenPayload(token);
  if (parsed) {
    req.user = parsed;
    return next();
  }
  return res.status(401).json({ error: "Unauthorized: Invalid Supabase token" });
};
var optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1].trim();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.user = {
            uid: user.id,
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
            role: user.role,
            ...user
          };
          return next();
        }
      } catch {
      }
    }
    const parsed = parseTokenPayload(token);
    if (parsed) {
      req.user = parsed;
    }
  }
  next();
};

// src/lib/validation.ts
var DISPOSABLE_EMAIL_DOMAINS = /* @__PURE__ */ new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "pokemail.net",
  "spam4.me",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "dispostable.com",
  "burnermail.io",
  "getairmail.com",
  "fakeinbox.com",
  "throwawaymail.com",
  "maildrop.cc",
  "crazymailing.com",
  "nada.ltd",
  "mohmal.com",
  "inboxkitten.com",
  "mytemp.email",
  "tempail.com",
  "emailondeck.com",
  "generator.email",
  "mailnesia.com",
  "tempmail.net",
  "disposablemail.com",
  "mytempemail.com",
  "dropmail.me",
  "fakemailgenerator.com",
  "getnada.com",
  "inboxbear.com",
  "harakirimail.com",
  "mailcatch.com",
  "zillamail.com"
]);
var DUMMY_DOMAINS = /* @__PURE__ */ new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "testing.com",
  "tester.com",
  "fake.com",
  "fakeemail.com",
  "fakemail.com",
  "asdf.com",
  "none.com",
  "sample.com",
  "dummy.com",
  "user.com",
  "abc.com",
  "xyz.com",
  "noemail.com",
  "nomail.com",
  "null.com",
  "nowhere.com",
  "domain.com",
  "website.com"
]);
var DUMMY_USERNAMES = /* @__PURE__ */ new Set([
  "test",
  "testing",
  "tester",
  "asdf",
  "fake",
  "dummy",
  "none",
  "noemail",
  "nomail",
  "sample",
  "abc",
  "xyz",
  "qwerty",
  "123456",
  "user",
  "email"
]);
function validateWorkingEmail(rawEmail) {
  const email = (rawEmail || "").trim().toLowerCase();
  if (!email) {
    return { isValid: false, email: "", error: "Email address is required." };
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, email, error: "Please enter a valid email address (e.g. name@gmail.com)." };
  }
  if (email.includes("..") || email.startsWith(".") || email.includes(".@") || email.includes("@.")) {
    return { isValid: false, email, error: "Email contains invalid dot placements." };
  }
  const parts = email.split("@");
  if (parts.length !== 2) {
    return { isValid: false, email, error: "Invalid email format." };
  }
  const [username, domain] = parts;
  if (username.length < 2) {
    return { isValid: false, email, error: "Email username must be at least 2 characters." };
  }
  if (DUMMY_USERNAMES.has(username)) {
    return { isValid: false, email, error: "Please enter your genuine working email, not a test placeholder." };
  }
  const domainParts = domain.split(".");
  if (domainParts.length < 2) {
    return { isValid: false, email, error: "Please enter a full email with domain (e.g. @gmail.com or @outlook.com)." };
  }
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return { isValid: false, email, error: "Invalid domain extension in email address." };
  }
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, email, error: "Temporary or disposable burner emails are not permitted. Please use your real working email." };
  }
  if (DUMMY_DOMAINS.has(domain)) {
    return { isValid: false, email, error: "Placeholder or test email domains are not allowed. Please enter your real email." };
  }
  return { isValid: true, email };
}
function validateAustralianPhone(rawPhone) {
  const input = (rawPhone || "").trim();
  if (!input) {
    return { isValid: false, formatted: "", rawDigits: "", error: "Australian phone number is required." };
  }
  let cleaned = input.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+61")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("61") && cleaned.length === 11) {
    cleaned = cleaned.slice(2);
  }
  let nationalNumber = cleaned;
  if (nationalNumber.startsWith("0")) {
    nationalNumber = nationalNumber.slice(1);
  }
  if (!/^\d+$/.test(nationalNumber)) {
    return { isValid: false, formatted: input, rawDigits: cleaned, error: "Phone number must contain only numbers." };
  }
  if (nationalNumber.length !== 9 || !/^[2-478]/.test(nationalNumber)) {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: "Only Australian phone numbers are allowed (e.g. 0412 345 678)."
    };
  }
  if (/^(\d)\1{8}$/.test(nationalNumber) || nationalNumber === "400000000" || nationalNumber === "412345678") {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: "Please enter your genuine Australian phone number."
    };
  }
  let formatted = "";
  if (nationalNumber.startsWith("4")) {
    formatted = `0${nationalNumber.slice(0, 3)} ${nationalNumber.slice(3, 6)} ${nationalNumber.slice(6)}`;
  } else {
    formatted = `0${nationalNumber.slice(0, 1)} ${nationalNumber.slice(1, 5)} ${nationalNumber.slice(5)}`;
  }
  return { isValid: true, formatted, rawDigits: `0${nationalNumber}` };
}
function validateInternationalPhone(rawPhone, dialCode = "+61") {
  const input = (rawPhone || "").trim();
  if (!input) {
    return { isValid: false, formatted: "", rawDigits: "", error: "Phone number is required." };
  }
  if (dialCode === "+61" || dialCode === "61") {
    return validateAustralianPhone(input);
  }
  let cleaned = input.replace(/[\s\-().]/g, "");
  const normalizedDial = dialCode.replace("+", "");
  if (cleaned.startsWith(dialCode)) {
    cleaned = cleaned.slice(dialCode.length);
  } else if (cleaned.startsWith(normalizedDial)) {
    cleaned = cleaned.slice(normalizedDial.length);
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: "Phone number must contain only numbers."
    };
  }
  if (cleaned.length < 6 || cleaned.length > 14) {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: "Please enter a valid phone number (6 to 14 digits)."
    };
  }
  if (/^(\d)\1{5,}$/.test(cleaned) || cleaned === "12345678" || cleaned === "123456789") {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: "Please enter a genuine phone number."
    };
  }
  const formatted = `${dialCode} ${cleaned}`;
  return {
    isValid: true,
    formatted,
    rawDigits: cleaned
  };
}

// src/server/email-reminder-service.ts
import { Resend } from "resend";
var inFlightSendingLocks = /* @__PURE__ */ new Set();
var resendInstance = null;
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}
function getFormattedSender() {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (!raw) return "Wally\u2019s Driving School <info@wallysdrivingschool.com.au>";
  if (raw.includes("<") && raw.includes(">")) return raw;
  return `Wally\u2019s Driving School <${raw}>`;
}
function calculateReminderSchedule(dateStr, timeStr, timeZone = process.env.SCHOOL_TIMEZONE || "Australia/Sydney") {
  let year = (/* @__PURE__ */ new Date()).getFullYear();
  let month = (/* @__PURE__ */ new Date()).getMonth() + 1;
  let day = (/* @__PURE__ */ new Date()).getDate();
  const cleanDate = (dateStr || "").trim();
  const isoMatch = cleanDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmyMatch = cleanDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const MONTH_NAMES = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12
  };
  const textMatch = cleanDate.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:,?\s+(\d{4}))?$/i) || cleanDate.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else if (textMatch) {
    if (isNaN(Number(textMatch[1]))) {
      const mName = textMatch[1].toLowerCase();
      month = MONTH_NAMES[mName] || month;
      day = parseInt(textMatch[2], 10);
      if (textMatch[3]) year = parseInt(textMatch[3], 10);
    } else {
      day = parseInt(textMatch[1], 10);
      const mName = textMatch[2].toLowerCase();
      month = MONTH_NAMES[mName] || month;
      if (textMatch[3]) year = parseInt(textMatch[3], 10);
    }
  } else {
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  }
  let startHours = 9;
  let startMinutes = 0;
  const cleanTime = (timeStr || "").trim();
  const timeMatch = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = (timeMatch[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    if (!ampm && h >= 1 && h <= 6) {
      h += 12;
    }
    startHours = h;
    startMinutes = m;
  }
  const probeDate = new Date(Date.UTC(year, month - 1, day, startHours, startMinutes, 0));
  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const parts = tzFormatter.formatToParts(probeDate);
  const partMap = {};
  for (const p of parts) {
    if (p.type !== "literal") partMap[p.type] = parseInt(p.value, 10);
  }
  const tzYear = partMap.year || year;
  const tzMonth = (partMap.month || month) - 1;
  const tzDay = partMap.day || day;
  let tzHour = partMap.hour || 0;
  if (tzHour === 24) tzHour = 0;
  const tzMinute = partMap.minute || 0;
  const tzDateAsUTC = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, 0);
  const offsetMs = tzDateAsUTC - probeDate.getTime();
  const lessonStartMs = Date.UTC(year, month - 1, day, startHours, startMinutes, 0) - offsetMs;
  const TWO_HOURS_MS = 2 * 60 * 60 * 1e3;
  const reminderTimeMs = lessonStartMs - TWO_HOURS_MS;
  const now = Date.now();
  const isPast = now >= lessonStartMs;
  const isDue = !isPast && now >= reminderTimeMs;
  return {
    lessonStartMs,
    reminderTimeMs,
    isPast,
    isDue,
    scheduledForISO: new Date(reminderTimeMs).toISOString(),
    formattedLessonDate: cleanDate,
    formattedLessonTime: cleanTime
  };
}
function generateReminderEmailContent(booking) {
  const location = booking.pickupAddress && booking.pickupAddress.trim() ? booking.pickupAddress.trim() : `${booking.suburb || "Rooty Hill"}, NSW`;
  const subject = `Reminder: Your Driving Lesson Today \u2013 Wally\u2019s Driving School`;
  const text2 = [
    `Hi ${booking.studentName ? booking.studentName.trim() : "Student"},`,
    ``,
    `This is a friendly reminder from Wally\u2019s Driving School that your driving lesson is scheduled for today.`,
    ``,
    `Date: ${booking.date.trim()}`,
    `Time: ${booking.time.trim()}`,
    `Location: ${location}`,
    ``,
    `Please be ready a few minutes before your lesson.`,
    ``,
    `Thank you,`,
    `Wally\u2019s Driving School`
  ].join("\n");
  return { subject, text: text2 };
}
async function updateBookingInDatabase(booking, updates) {
  const numId = typeof booking.id === "number" ? booking.id : parseInt(String(booking.id).replace(/\D/g, ""), 10);
  const ref = booking.bookingRef || booking.ref;
  if (ref) {
    await updateBookingByRef(ref, updates);
  } else if (!isNaN(numId)) {
    await updateBooking(numId, updates);
  }
}
async function scheduleOrSendLessonReminder(booking, options) {
  const refKey = (booking.bookingRef || booking.ref || String(booking.id)).toUpperCase();
  const recipientEmail = (booking.email || "").trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes("@")) {
    return {
      success: false,
      status: "failed",
      error: `Booking #${refKey} has no valid student email address.`,
      recipientEmail
    };
  }
  if (booking.status !== "Confirmed") {
    return {
      success: false,
      status: "failed",
      error: `Cannot send reminder: Booking #${refKey} status is "${booking.status}" (must be Confirmed).`,
      recipientEmail
    };
  }
  if (!options?.force && booking.reminderStatus === "sent") {
    return {
      success: true,
      emailId: booking.reminderMessageId || void 0,
      status: "sent",
      error: `Reminder already sent on ${booking.reminderSentAt || "previous run"}. Duplicate prevented.`,
      recipientEmail
    };
  }
  if (!options?.force && booking.reminderStatus === "cancelled") {
    return {
      success: false,
      status: "cancelled",
      error: `Cannot send reminder: Reminder for booking #${refKey} has been cancelled.`,
      recipientEmail
    };
  }
  if (inFlightSendingLocks.has(refKey)) {
    return {
      success: false,
      status: "failed",
      error: `A reminder action is already actively in progress for booking #${refKey}.`,
      recipientEmail
    };
  }
  inFlightSendingLocks.add(refKey);
  try {
    const resend = getResend();
    if (!resend) {
      const err = "RESEND_API_KEY is not configured on the server. Please set it in Settings/environment.";
      console.warn(`[Resend Reminder] Cannot process booking #${refKey}: ${err}`);
      await updateBookingInDatabase(booking, {
        reminderStatus: "failed",
        reminderError: err,
        reminderRecipientEmail: recipientEmail
      });
      return {
        success: false,
        status: "failed",
        error: err,
        recipientEmail
      };
    }
    const sched = calculateReminderSchedule(booking.date, booking.time);
    if (sched.isPast) {
      await updateBookingInDatabase(booking, {
        reminderStatus: "cancelled",
        reminderError: "Lesson start time already passed",
        reminderRecipientEmail: recipientEmail
      });
      return {
        success: false,
        status: "cancelled",
        error: "Lesson start time already passed",
        recipientEmail
      };
    }
    const { subject, text: text2 } = generateReminderEmailContent({
      studentName: booking.studentName || "Student",
      date: booking.date,
      time: booking.time,
      pickupAddress: booking.pickupAddress,
      suburb: booking.suburb || "Rooty Hill"
    });
    const primarySender = getFormattedSender();
    const now = Date.now();
    const MAX_RESEND_SCHEDULE_MS = 72 * 60 * 60 * 1e3;
    const msUntilReminder = sched.reminderTimeMs - now;
    let sendPayload = {
      from: primarySender,
      to: [recipientEmail],
      subject,
      text: text2
    };
    let willSchedule = false;
    if (msUntilReminder > 0 && msUntilReminder <= MAX_RESEND_SCHEDULE_MS) {
      sendPayload.scheduled_at = new Date(sched.reminderTimeMs).toISOString();
      willSchedule = true;
    } else if (msUntilReminder > MAX_RESEND_SCHEDULE_MS) {
      await updateBookingInDatabase(booking, {
        reminderStatus: "scheduled",
        reminderScheduledFor: sched.scheduledForISO,
        reminderRecipientEmail: recipientEmail,
        reminderError: null
      });
      console.log(`[Resend Reminder] Booking #${refKey} scheduled for future lesson (${sched.scheduledForISO}).`);
      return {
        success: true,
        status: "scheduled",
        recipientEmail
      };
    } else {
      willSchedule = false;
    }
    console.log(`[Resend Reminder] Dispatching to Resend for booking #${refKey} to ${recipientEmail} (willSchedule: ${willSchedule}, scheduled_at: ${sendPayload.scheduled_at || "now"})`);
    let resendResponse = await resend.emails.send(sendPayload);
    if (resendResponse.error && (resendResponse.error.message.includes("domain") || resendResponse.error.name === "validation_error")) {
      console.warn(`[Resend Reminder] Primary domain returned: ${resendResponse.error.message}. Retrying with onboarding@resend.dev...`);
      sendPayload.from = "Wally\u2019s Driving School <onboarding@resend.dev>";
      resendResponse = await resend.emails.send(sendPayload);
    }
    if (resendResponse.error) {
      const errorMsg = resendResponse.error.message || "Unknown Resend API error";
      console.error(`[Resend Reminder] Error sending email for #${refKey}:`, resendResponse.error);
      await updateBookingInDatabase(booking, {
        reminderStatus: "failed",
        reminderError: errorMsg,
        reminderRecipientEmail: recipientEmail
      });
      return {
        success: false,
        status: "failed",
        error: errorMsg,
        recipientEmail
      };
    }
    const emailId = resendResponse.data?.id;
    const finalStatus = willSchedule ? "scheduled" : "sent";
    await updateBookingInDatabase(booking, {
      reminderStatus: finalStatus,
      reminderScheduledFor: sched.scheduledForISO,
      reminderSentAt: willSchedule ? null : (/* @__PURE__ */ new Date()).toISOString(),
      reminderMessageId: emailId || null,
      reminderRecipientEmail: recipientEmail,
      reminderError: null
    });
    console.log(`[Resend Reminder] Successfully ${willSchedule ? "scheduled" : "sent"} email for booking #${refKey}! Resend ID: ${emailId}`);
    return {
      success: true,
      emailId,
      status: finalStatus,
      recipientEmail
    };
  } catch (err) {
    const errorMsg = err?.message || "Unexpected exception calling Resend";
    console.error(`[Resend Reminder] Exception for #${refKey}:`, err);
    await updateBookingInDatabase(booking, {
      reminderStatus: "failed",
      reminderError: errorMsg,
      reminderRecipientEmail: recipientEmail
    });
    return {
      success: false,
      status: "failed",
      error: errorMsg,
      recipientEmail
    };
  } finally {
    inFlightSendingLocks.delete(refKey);
  }
}
async function cancelScheduledLessonReminder(booking, reason) {
  if (!booking) return false;
  const refKey = (booking.bookingRef || booking.ref || String(booking.id)).toUpperCase();
  const emailId = booking.reminderMessageId;
  const resend = getResend();
  if (emailId && resend) {
    try {
      console.log(`[Resend Reminder] Cancelling scheduled Resend email ${emailId} for #${refKey}...`);
      await resend.emails.cancel(emailId);
      console.log(`[Resend Reminder] Successfully cancelled scheduled email ${emailId} in Resend.`);
    } catch (err) {
      console.warn(`[Resend Reminder] Notice cancelling Resend email ${emailId}:`, err?.message || err);
    }
  }
  await updateBookingInDatabase(booking, {
    reminderStatus: "cancelled",
    reminderError: reason || "Booking was cancelled"
  });
  return true;
}
async function handleBookingConfirmed(booking) {
  if (!booking) {
    return { success: false, status: "failed", error: "No booking provided", recipientEmail: "" };
  }
  return await scheduleOrSendLessonReminder(booking);
}
async function handleBookingRescheduled(booking, newDate, newTime) {
  if (!booking) {
    return { success: false, status: "failed", error: "No booking provided", recipientEmail: "" };
  }
  await cancelScheduledLessonReminder(booking, "Rescheduled to new date/time");
  const updatedBooking = {
    ...booking,
    date: newDate,
    time: newTime,
    status: "Confirmed",
    reminderStatus: "pending",
    reminderMessageId: null,
    reminderSentAt: null
  };
  return await scheduleOrSendLessonReminder(updatedBooking, { force: true });
}
async function handleBookingCancelled(booking, reason) {
  return await cancelScheduledLessonReminder(booking, reason || "Booking was cancelled");
}
async function processPendingLessonReminders() {
  let checked = 0;
  let sent = 0;
  let scheduled = 0;
  let failed = 0;
  let skipped = 0;
  try {
    const allBookings = await getBookings({ includeUnpaid: false });
    for (const booking of allBookings) {
      checked++;
      if (booking.status !== "Confirmed") {
        skipped++;
        continue;
      }
      if (booking.reminderStatus === "sent" || booking.reminderStatus === "cancelled") {
        skipped++;
        continue;
      }
      if (booking.reminderStatus === "scheduled" && booking.reminderMessageId) {
        skipped++;
        continue;
      }
      const sched = calculateReminderSchedule(booking.date, booking.time);
      if (sched.isPast) {
        await updateBookingInDatabase(booking, {
          reminderStatus: "cancelled",
          reminderError: "Lesson time already passed"
        });
        skipped++;
        continue;
      }
      const msUntilReminder = sched.reminderTimeMs - Date.now();
      const MAX_RESEND_SCHEDULE_MS = 72 * 60 * 60 * 1e3;
      if (sched.isDue || msUntilReminder <= MAX_RESEND_SCHEDULE_MS) {
        const res = await scheduleOrSendLessonReminder(booking);
        if (res.success) {
          if (res.status === "sent") sent++;
          else scheduled++;
        } else {
          failed++;
        }
      } else {
        if (booking.reminderStatus !== "scheduled" || booking.reminderScheduledFor !== sched.scheduledForISO) {
          await updateBookingInDatabase(booking, {
            reminderStatus: "scheduled",
            reminderScheduledFor: sched.scheduledForISO,
            reminderRecipientEmail: (booking.email || "").trim().toLowerCase(),
            reminderError: null
          });
          scheduled++;
        } else {
          skipped++;
        }
      }
    }
  } catch (err) {
    console.error(`[Resend Reminder Scheduler] Error in periodic check:`, err);
  }
  return { checked, sent, scheduled, failed, skipped };
}
async function sendEmailWithRetry(payload, options) {
  const resend = getResend();
  const maxRetries = options.maxRetries ?? 3;
  const primarySender = payload.from || getFormattedSender();
  const recipient = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
  if (!resend) {
    console.warn(`[Resend] RESEND_API_KEY is not configured. Email to ${recipient} simulated.`);
    await logEmailDelivery({
      bookingRef: options.bookingRef,
      emailType: options.emailType,
      recipientEmail: recipient,
      status: "sent",
      messageId: `sim_${Date.now()}`,
      error: "RESEND_API_KEY missing - simulated delivery",
      retryCount: 0
    });
    return { success: true, id: `sim_${Date.now()}` };
  }
  let attempt = 0;
  let lastError = "";
  let activePayload = { ...payload, from: primarySender };
  while (attempt < maxRetries) {
    attempt++;
    try {
      let res = await resend.emails.send(activePayload);
      if (res.error && (res.error.message.includes("domain") || res.error.name === "validation_error")) {
        console.warn(`[Resend] Domain notice: ${res.error.message}. Retrying with onboarding@resend.dev...`);
        activePayload.from = "Wally\u2019s Driving School <onboarding@resend.dev>";
        res = await resend.emails.send(activePayload);
      }
      if (res.error) {
        lastError = res.error.message || "Unknown Resend error";
        console.warn(`[Resend] Attempt ${attempt}/${maxRetries} failed for ${recipient}: ${lastError}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 1e3));
          continue;
        }
      } else {
        const messageId = res.data?.id;
        await logEmailDelivery({
          bookingRef: options.bookingRef,
          emailType: options.emailType,
          recipientEmail: recipient,
          status: "sent",
          messageId,
          retryCount: attempt - 1
        });
        return { success: true, id: messageId };
      }
    } catch (err) {
      lastError = err?.message || "Network exception calling Resend";
      console.warn(`[Resend] Attempt ${attempt}/${maxRetries} threw exception for ${recipient}: ${lastError}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 1e3));
      }
    }
  }
  await logEmailDelivery({
    bookingRef: options.bookingRef,
    emailType: options.emailType,
    recipientEmail: recipient,
    status: "failed",
    error: lastError,
    retryCount: maxRetries
  });
  return { success: false, error: lastError };
}
async function sendBookingConfirmationEmail(booking) {
  const recipient = (booking.email || "").trim();
  if (!recipient) return { success: false, error: "Recipient email missing" };
  const safeName = escapeHtml(booking.studentName || "Student");
  const safeRef = escapeHtml(booking.bookingRef);
  const safeDate = escapeHtml(booking.date);
  const safeTime = escapeHtml(booking.time);
  const safePackage = escapeHtml(booking.packageTitle || "Driving Lesson");
  const safePrice = booking.packagePrice ? `$${Number(booking.packagePrice).toFixed(2)} AUD` : "Paid";
  const safeAddress = escapeHtml(booking.pickupAddress || `${booking.suburb || "Rooty Hill"}, NSW`);
  let testCentreInfo = "";
  if (booking.notes && booking.notes.toLowerCase().includes("test centre:")) {
    const match = booking.notes.match(/test centre:\s*([^.]+)/i);
    if (match && match[1] && match[1].trim() !== "N/A") {
      testCentreInfo = `
        <tr>
          <td style="padding: 8px 0; color: #555555; font-size: 14px;">RMS Test Centre:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #111111; font-size: 14px; text-align: right;">${escapeHtml(match[1].trim())}</td>
        </tr>
      `;
    }
  }
  const subject = `Booking Confirmed: ${booking.packageTitle} with Wally (${booking.bookingRef})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f9; margin: 0; padding: 24px; color: #111111;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e7;">
        <tr>
          <td style="background-color: #E3222A; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">Wally's Driving School</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Western Sydney & Hills District, NSW</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 24px;">
            <h2 style="font-size: 18px; margin: 0 0 12px; color: #111111;">Your booking is confirmed, ${safeName}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #444444; margin: 0 0 24px;">
              Thank you for booking with Wally's Driving School. Your session is locked in with accredited RMS instructor Wally.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; color: #555555; font-size: 14px;">Booking Reference:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #E3222A; font-size: 14px; text-align: right; font-family: monospace;">${safeRef}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555555; font-size: 14px;">Instructor:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #111111; font-size: 14px; text-align: right;">Wally (Accredited RMS Instructor)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555555; font-size: 14px;">Lesson Package:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #111111; font-size: 14px; text-align: right;">${safePackage}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555555; font-size: 14px;">Date:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #111111; font-size: 14px; text-align: right;">${safeDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555555; font-size: 14px;">Time Slot:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #111111; font-size: 14px; text-align: right;">${safeTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555555; font-size: 14px;">Pickup Location:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #111111; font-size: 14px; text-align: right;">${safeAddress}</td>
              </tr>
              ${testCentreInfo}
              <tr>
                <td style="padding: 8px 0; color: #555555; font-size: 14px;">Amount Paid:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #111111; font-size: 14px; text-align: right;">${safePrice}</td>
              </tr>
            </table>

            <div style="background-color: #fff8f8; border-left: 4px solid #E3222A; padding: 14px 16px; margin-bottom: 24px; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #333333;">
                <strong>What to prepare:</strong> Please ensure you have your physical or digital NSW Learner Licence, your logbook (or app), and wear comfortable flat closed-toe shoes.
              </p>
            </div>

            <p style="font-size: 12px; line-height: 1.5; color: #777777; margin: 0 0 8px;">
              <strong>Cancellation & Rescheduling Policy:</strong> Free rescheduling or cancellation is available with at least 24 hours notice.
            </p>
            <p style="font-size: 12px; line-height: 1.5; color: #777777; margin: 0;">
              Questions? Call Wally directly at <a href="tel:0412345678" style="color: #E3222A; text-decoration: none;">0412 345 678</a> or reply to this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f7f7f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888;">
            Wally's Driving School \u2022 Rooty Hill NSW 2766 \u2022 Australia
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  const text2 = `
Hi ${booking.studentName || "Student"},

Your booking with Wally's Driving School is confirmed!

Booking Reference: ${booking.bookingRef}
Instructor: Wally (Accredited RMS Instructor)
Lesson Package: ${booking.packageTitle}
Date: ${booking.date}
Time: ${booking.time}
Pickup: ${booking.pickupAddress || booking.suburb}
Amount: ${safePrice}

Please have your NSW Learner Licence and logbook ready.
If you need to reschedule or have questions, contact Wally on 0412 345 678.
  `.trim();
  return await sendEmailWithRetry(
    { to: recipient, subject, html, text: text2 },
    { bookingRef: booking.bookingRef, emailType: "confirmation" }
  );
}
async function sendPaymentReceiptEmail(booking, payment) {
  const recipient = (booking.email || "").trim();
  if (!recipient) return { success: false, error: "Recipient email missing" };
  const safeName = escapeHtml(booking.studentName || "Customer");
  const safeRef = escapeHtml(booking.bookingRef);
  const safeMethod = escapeHtml(
    payment.method === "google_pay" ? "Google Pay" : payment.method === "link" ? "Stripe Link" : payment.method === "paypal" ? "PayPal" : "Credit / Debit Card"
  );
  const safeTxId = escapeHtml(payment.transactionId);
  const safeAmount = `$${Number(payment.amount || booking.packagePrice).toFixed(2)} AUD`;
  const safePackage = escapeHtml(booking.packageTitle || "Driving Lesson");
  const subject = `Payment Receipt: ${safeAmount} for Wally's Driving School (${booking.bookingRef})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f9; margin: 0; padding: 24px; color: #111111;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e7;">
        <tr>
          <td style="background-color: #111111; padding: 20px 24px; color: #ffffff;">
            <div style="font-size: 18px; font-weight: bold;">Wally's Driving School</div>
            <div style="font-size: 12px; color: #aaaaaa;">Tax Invoice / Official Receipt</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="font-size: 14px; margin: 0 0 16px;">Dear ${safeName},</p>
            <p style="font-size: 14px; line-height: 1.5; color: #444444; margin: 0 0 20px;">
              Thank you for your payment. Here is your official payment receipt:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px;">
              <tr style="border-bottom: 2px solid #eeeeee;">
                <th align="left" style="padding: 10px 0; font-size: 13px; color: #666666;">Item</th>
                <th align="right" style="padding: 10px 0; font-size: 13px; color: #666666;">Amount</th>
              </tr>
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="padding: 12px 0; font-size: 14px; font-weight: 500;">${safePackage}</td>
                <td style="padding: 12px 0; font-size: 14px; font-weight: bold; text-align: right;">${safeAmount}</td>
              </tr>
              <tr>
                <td style="padding: 14px 0; font-size: 15px; font-weight: bold;">Total Paid</td>
                <td style="padding: 14px 0; font-size: 16px; font-weight: bold; color: #E3222A; text-align: right;">${safeAmount}</td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9fb; border-radius: 8px; padding: 14px; font-size: 12px; color: #555555; line-height: 1.6;">
              <tr>
                <td style="width: 40%;">Booking Reference:</td>
                <td style="font-weight: bold; color: #111111;">${safeRef}</td>
              </tr>
              <tr>
                <td>Payment Method:</td>
                <td style="font-weight: bold; color: #111111;">${safeMethod}</td>
              </tr>
              <tr>
                <td>Transaction ID:</td>
                <td style="font-family: monospace; font-size: 11px;">${safeTxId}</td>
              </tr>
              <tr>
                <td>Date of Payment:</td>
                <td>${(/* @__PURE__ */ new Date()).toLocaleDateString("en-AU")}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f7f7f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888;">
            Wally's Driving School \u2022 info@wallysdrivingschool.com.au \u2022 0412 345 678
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  return await sendEmailWithRetry(
    { to: recipient, subject, html, text: `Receipt for ${safeAmount}. Ref: ${booking.bookingRef}, Tx: ${safeTxId}` },
    { bookingRef: booking.bookingRef, emailType: "receipt" }
  );
}
async function sendBookingCancellationNoticeEmail(booking, details) {
  const recipient = (booking.email || "").trim();
  if (!recipient) return { success: false, error: "Recipient email missing" };
  const safeName = escapeHtml(booking.studentName || "Student");
  const safeRef = escapeHtml(booking.bookingRef);
  const safeDate = escapeHtml(booking.date);
  const safeTime = escapeHtml(booking.time);
  const safeReason = escapeHtml(details?.reason || "Customer or instructor requested cancellation");
  const isRefunded = Boolean(details?.refundStatus === "refunded" || details?.amountRefunded);
  const refundAmount = details?.amountRefunded ? `$${Number(details.amountRefunded).toFixed(2)} AUD` : "";
  const subject = `Booking Cancellation Notice: ${booking.bookingRef} \u2013 Wally's Driving School`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f9; margin: 0; padding: 24px; color: #111111;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e7;">
        <tr>
          <td style="background-color: #333333; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px;">Wally's Driving School</h1>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.8;">Booking Cancellation Confirmation</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="font-size: 14px;">Hi ${safeName},</p>
            <p style="font-size: 14px; line-height: 1.6; color: #444444;">
              This email confirms that your driving lesson booking (<strong>${safeRef}</strong>) scheduled for <strong>${safeDate} at ${safeTime}</strong> has been cancelled.
            </p>

            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 13px; color: #555555;">
              <div><strong>Reason:</strong> ${safeReason}</div>
              ${isRefunded ? `
                <div style="margin-top: 8px; color: #166534; font-weight: bold;">
                  Refund Status: A refund of ${refundAmount} has been initiated to your original payment method.
                </div>
              ` : ""}
            </div>

            <p style="font-size: 13px; color: #666666;">
              If you wish to re-book at another time that suits your schedule, please visit our website at <a href="https://wallysdrivingschool.com.au/book-now" style="color: #E3222A;">wallysdrivingschool.com.au/book-now</a>.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  return await sendEmailWithRetry(
    { to: recipient, subject, html, text: `Booking ${booking.bookingRef} has been cancelled.` },
    { bookingRef: booking.bookingRef, emailType: "cancellation" }
  );
}
async function sendInstructorNotificationEmail(booking) {
  const instructorEmail = process.env.INSTRUCTOR_NOTIFICATION_EMAIL?.trim() || "info@wallysdrivingschool.com.au";
  const safeName = escapeHtml(booking.studentName);
  const safePhone = escapeHtml(booking.phone);
  const safeEmail = escapeHtml(booking.email);
  const safeRef = escapeHtml(booking.bookingRef);
  const safeDate = escapeHtml(booking.date);
  const safeTime = escapeHtml(booking.time);
  const safePackage = escapeHtml(booking.packageTitle);
  const safeAddress = escapeHtml(booking.pickupAddress || booking.suburb || "Not provided");
  const safeNotes = escapeHtml(booking.notes || "None");
  const subject = `NEW LESSON BOOKING: ${safeName} \u2013 ${safeDate} @ ${safeTime} (${safeRef})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f9; margin: 0; padding: 24px; color: #111111;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e7;">
        <tr>
          <td style="background-color: #E3222A; padding: 20px 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px;">New Student Booking Alert!</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="font-size: 14px; margin: 0 0 16px;">Wally, a new paid driving lesson has been booked:</p>
            <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px; line-height: 1.6;">
              <tr><td style="color: #666;">Booking Ref:</td><td><strong>${safeRef}</strong></td></tr>
              <tr><td style="color: #666;">Student Name:</td><td><strong>${safeName}</strong></td></tr>
              <tr><td style="color: #666;">Phone:</td><td><a href="tel:${safePhone}">${safePhone}</a></td></tr>
              <tr><td style="color: #666;">Email:</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
              <tr><td style="color: #666;">Date:</td><td><strong>${safeDate}</strong></td></tr>
              <tr><td style="color: #666;">Time Slot:</td><td><strong>${safeTime}</strong></td></tr>
              <tr><td style="color: #666;">Package:</td><td>${safePackage}</td></tr>
              <tr><td style="color: #666;">Pickup Address:</td><td><strong>${safeAddress}</strong></td></tr>
              <tr><td style="color: #666;">Notes:</td><td>${safeNotes}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  return await sendEmailWithRetry(
    { to: instructorEmail, subject, html, text: `New Booking: ${booking.studentName} on ${booking.date} at ${booking.time}. Ref: ${booking.bookingRef}` },
    { bookingRef: booking.bookingRef, emailType: "instructor_notification" }
  );
}

// server.ts
dotenv.config();
var simulatedCheckoutSessions = /* @__PURE__ */ new Map();
function getBookingTimestamp(date, time) {
  let hours = 9;
  let minutes = 0;
  const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (timeMatch) {
    let [_, h, m, ampm] = timeMatch;
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10) || 0;
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
    }
  }
  if (date.includes("/")) {
    const parts = date.split("/").map(Number);
    if (parts.length === 3 && parts[0] <= 31 && parts[1] <= 12) {
      const [day, month, year] = parts;
      const d2 = new Date(year, month - 1, day, hours, minutes, 0, 0);
      if (!isNaN(d2.getTime())) return d2.getTime();
    }
  }
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
  }
  return Date.now();
}
var app = express();
var PORT = 3e3;
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, stripe-signature");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use((req, _res, next) => {
  if (req.query?.path) {
    const rawPath = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path);
    const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    req.url = `/api${cleanPath}`;
  } else if (req.url === "/api/index" || req.url === "/api" || req.url === "/api/" || req.url.startsWith("/api/index?") || req.url.startsWith("/api?")) {
    const matchedPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"] || req.headers["x-vercel-original-url"] || req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || (req.originalUrl && req.originalUrl !== "/api" && req.originalUrl !== "/api/" ? req.originalUrl : void 0);
    if (matchedPath) {
      const normalizedPath = matchedPath.startsWith("/api") ? matchedPath : `/api${matchedPath.startsWith("/") ? matchedPath : `/${matchedPath}`}`;
      const qIdx = req.url.indexOf("?");
      const query = qIdx !== -1 ? req.url.slice(qIdx) : "";
      req.url = `${normalizedPath}${query && !normalizedPath.includes("?") ? query : ""}`;
    }
  }
  if (!req.url.startsWith("/api") && (req.url.startsWith("/payments") || req.url.startsWith("/stripe") || req.url.startsWith("/bookings") || req.url.startsWith("/contact") || req.url.startsWith("/health") || req.url.startsWith("/auth") || req.url.startsWith("/instructor") || req.url.startsWith("/create-checkout-session") || req.url.startsWith("/verify-checkout-session"))) {
    req.url = `/api${req.url}`;
  }
  next();
});
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    return next();
  }
  express.json({
    verify: (req2, _res, buf) => {
      req2.rawBody = buf;
    }
  })(req, res, next);
});
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
var rateLimits = /* @__PURE__ */ new Map();
function createRateLimiter(windowMs, maxRequests, message) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "ip_default";
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();
    const record = rateLimits.get(key);
    if (!record || now > record.resetTime) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message
      });
    }
    record.count++;
    next();
  };
}
var loginLimiter = createRateLimiter(15 * 60 * 1e3, 5, "Too many login attempts. Please try again in 15 minutes.");
var bookingLimiter = createRateLimiter(60 * 1e3, 25, "Too many booking requests. Please wait a moment.");
var contactLimiter = createRateLimiter(60 * 1e3, 5, "Too many contact inquiries. Please wait a moment.");
function sanitizeText(val) {
  if (typeof val !== "string") return "";
  return val.replace(/<[^>]*>?/gm, "").trim();
}
var activeInstructorSessions = /* @__PURE__ */ new Map();
function requireInstructorOrAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Instructor or authorized authentication required." });
  }
  const token = authHeader.split(" ")[1];
  const instructorSession = activeInstructorSessions.get(token);
  if (instructorSession && Date.now() <= instructorSession.expiresAt) {
    req.instructor = instructorSession;
    return next();
  }
  return next();
}
app.post("/api/auth/instructor-login", loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = sanitizeText(email).toLowerCase();
  const cleanPass = (password || "").trim();
  const expectedPassword = process.env.INSTRUCTOR_PORTAL_PASSWORD || "Wellard44#";
  const isOwner = (cleanEmail === "wally@wallysdrivingschool.com.au" || cleanEmail === "wally") && cleanPass === expectedPassword;
  if (!isOwner) {
    return res.status(401).json({
      success: false,
      error: "INVALID_CREDENTIALS",
      message: "Access Denied: Only the owner (Wally) is authorized to access the instructor portal."
    });
  }
  const token = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const session = {
    token,
    email: "wally@wallysdrivingschool.com.au",
    name: "Wally (Owner & Lead Instructor)",
    role: "instructor",
    expiresAt: Date.now() + 8 * 60 * 60 * 1e3
    // 8 hours
  };
  activeInstructorSessions.set(token, session);
  res.json({
    success: true,
    token,
    user: {
      email: session.email,
      name: session.name,
      role: session.role
    }
  });
});
app.get("/api/auth/instructor-verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ authenticated: false });
  }
  const token = authHeader.split(" ")[1];
  const session = activeInstructorSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) activeInstructorSessions.delete(token);
    return res.status(401).json({ authenticated: false, message: "Session expired" });
  }
  res.json({ authenticated: true, user: { email: session.email, name: session.name, role: session.role } });
});
app.post("/api/auth/instructor-logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    activeInstructorSessions.delete(token);
  }
  res.json({ success: true, message: "Instructor logged out successfully" });
});
var stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    const key = (process.env.STRIPE_SECRET_KEY || "").trim();
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
app.get("/api/stripe/status", (req, res) => {
  const secretKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  const publishableKey = (process.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();
  const isConfigured = Boolean(secretKey);
  const isLive = Boolean(secretKey.startsWith("sk_live_"));
  const isTest = Boolean(secretKey.startsWith("sk_test_"));
  res.json({
    configured: isConfigured,
    mode: isLive ? "live" : isTest ? "test" : isConfigured ? "custom" : "none",
    publishableKey,
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    message: isConfigured ? `Stripe is connected in ${isLive ? "LIVE" : "TEST"} mode. Ready to receive real payments.` : "Stripe Secret Key not found. Please add STRIPE_SECRET_KEY in Settings."
  });
});
app.get("/api/payments/capabilities", async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({
        configured: false,
        card: false,
        link: false,
        googlePay: false,
        applePay: false,
        paypal: false,
        paypalReason: "Stripe Secret Key is not configured."
      });
    }
    const stripe = getStripe();
    let account = null;
    try {
      if (stripe.account?.retrieve) {
        account = await stripe.account.retrieve();
      } else {
        account = await stripe.accounts.retrieve("acct_1SQQjBITqby17yse");
      }
    } catch (err) {
      console.warn("[Stripe] Could not retrieve account details:", err?.message);
    }
    const cardActive = account ? account.capabilities?.card_payments === "active" : true;
    res.json({
      configured: true,
      card: cardActive,
      googlePay: true,
      // Google Pay is supported via card wallets on eligible browsers/devices
      link: false,
      // Disabled per instructions
      applePay: false,
      // Disabled per instructions
      paypal: false
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Failed to query payment capabilities" });
  }
});
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const {
      serviceTitle,
      totalAmount,
      studentName,
      studentEmail,
      studentPhone,
      pickupAddress,
      bookingDate,
      bookingTime,
      instructorName,
      isPackage,
      packageHours,
      bookingRef,
      items,
      lessons
    } = req.body;
    const verified = computeVerifiedOrder(items || (serviceTitle ? [{ name: serviceTitle, unitPrice: totalAmount }] : []));
    const effectiveTotal = verified.totalAmount > 0 ? verified.totalAmount : Number(totalAmount || 65);
    const amountInCents = Math.round(effectiveTotal * 100);
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : `http://localhost:${PORT}`);
    const targetRef = bookingRef || `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
    if (Array.isArray(lessons) && lessons.length > 0) {
      const batchCheck = await checkMultipleSlotsBooked(lessons, targetRef, studentEmail, studentPhone);
      if (!batchCheck.available) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: batchCheck.conflicts[0] || "One or more selected time slots are no longer available. Please select another time."
        });
      }
    } else if (bookingDate && bookingTime) {
      const isTaken = await checkSlotBooked(bookingDate, bookingTime, targetRef, studentEmail, studentPhone);
      if (isTaken) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: "This time slot is no longer available. Please select another time."
        });
      }
    }
    let minifiedLessonsJson = void 0;
    if (Array.isArray(lessons) && lessons.length > 0) {
      const minified = lessons.slice(0, 10).map((l, i) => ({
        n: l.lessonNumber || i + 1,
        d: l.date,
        t: l.time
      }));
      const str = JSON.stringify(minified);
      if (str.length <= 500) {
        minifiedLessonsJson = str;
      }
    }
    const firstLessonDate = Array.isArray(lessons) && lessons.length > 0 ? lessons[0]?.date : bookingDate;
    const firstLessonTime = Array.isArray(lessons) && lessons.length > 0 ? lessons[0]?.time : bookingTime;
    if (!process.env.STRIPE_SECRET_KEY) {
      const simSessionId = `cs_sim_${Date.now()}_${targetRef}`;
      simulatedCheckoutSessions.set(simSessionId, {
        id: simSessionId,
        amount_total: amountInCents,
        payment_status: "paid",
        currency: "aud",
        customer_details: {
          name: studentName || "Student Driver",
          email: studentEmail || "student@example.com"
        },
        metadata: {
          studentName: studentName || "Student Driver",
          studentPhone: studentPhone || "",
          serviceTitle: serviceTitle || verified.verifiedItems[0]?.name || "Driving Lesson",
          pickupAddress: pickupAddress || "",
          bookingDate: firstLessonDate || "",
          bookingTime: firstLessonTime || "",
          instructorName: instructorName || "Wally",
          bookingRef: targetRef,
          lessonsJson: minifiedLessonsJson || ""
        }
      });
      return res.json({
        sessionId: simSessionId,
        url: `${origin}/book-now?session_id=${simSessionId}&step=confirmed`
      });
    }
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: serviceTitle || verified.verifiedItems[0]?.name || "Driving Lesson",
              description: isPackage ? `${packageHours || 10}-Hour Driving Lesson Package with Wally's Driving School` : `Professional Driving Lesson with ${instructorName || "Certified Instructor Wally"}`,
              images: [
                "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&auto=format&fit=crop&q=80"
              ]
            },
            unit_amount: amountInCents
          },
          quantity: 1
        }
      ],
      mode: "payment",
      customer_email: studentEmail || void 0,
      metadata: {
        studentName: studentName || "Student",
        studentPhone: studentPhone || "",
        serviceTitle: serviceTitle || verified.verifiedItems[0]?.name || "",
        pickupAddress: pickupAddress || "",
        bookingDate: firstLessonDate || "",
        bookingTime: firstLessonTime || "",
        instructorName: instructorName || "Wally",
        bookingRef: targetRef,
        lessonsJson: minifiedLessonsJson || ""
      },
      success_url: `${origin}/book-now?session_id={CHECKOUT_SESSION_ID}&step=confirmed`,
      cancel_url: `${origin}/book-now?cancelled=true`
    });
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).json({
      error: "STRIPE_SESSION_ERROR",
      message: error?.message || "Failed to create checkout session"
    });
  }
});
app.get("/api/verify-checkout-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    let sessionData = null;
    if (sessionId.startsWith("cs_sim_")) {
      sessionData = simulatedCheckoutSessions.get(sessionId);
      if (!sessionData) {
        return res.status(404).json({ error: "SIMULATED_SESSION_NOT_FOUND" });
      }
    } else {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(400).json({ error: "Stripe not configured" });
      }
      const stripe = getStripe();
      sessionData = await stripe.checkout.sessions.retrieve(sessionId);
    }
    const isPaid = sessionData.payment_status === "paid";
    let finalBooking = null;
    if (isPaid) {
      const meta = sessionData.metadata || {};
      const targetRef = meta.bookingRef || `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
      let parsedLessons = [];
      try {
        if (meta.lessonsJson) {
          parsedLessons = JSON.parse(meta.lessonsJson);
        }
      } catch {
      }
      if (Array.isArray(parsedLessons) && parsedLessons.length > 1) {
        for (let i = 0; i < parsedLessons.length; i++) {
          const l = parsedLessons[i];
          const lessonNum = l.n || i + 1;
          const lessonRef = i === 0 ? targetRef : `${targetRef}-L${lessonNum}`;
          const existing = await getBookingByRef(lessonRef, { allowUnpaid: true });
          const lessonPrice = i === 0 ? sessionData.amount_total ? sessionData.amount_total / 100 : 620 : 0;
          const lessonNote = `[Verified via Stripe Checkout: ${sessionData.id}] [Package: ${meta.serviceTitle || "Multi-Lesson Package"}] [Lesson ${lessonNum} of ${parsedLessons.length}]`;
          let lessonBooking = null;
          if (existing) {
            lessonBooking = await updateBookingByRef(lessonRef, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: sessionData.id,
              date: sanitizeText(l.d),
              time: sanitizeText(l.t),
              packagePrice: lessonPrice,
              notes: lessonNote
            });
          } else {
            lessonBooking = await createBooking({
              bookingRef: lessonRef,
              userId: null,
              studentName: sanitizeText(meta.studentName || sessionData.customer_details?.name || "Student Driver"),
              phone: sanitizeText(meta.studentPhone || ""),
              email: sanitizeText(sessionData.customer_details?.email || ""),
              suburb: sanitizeText(meta.suburb || "Rooty Hill, NSW"),
              pickupAddress: sanitizeText(meta.pickupAddress || null),
              packageTitle: sanitizeText(meta.serviceTitle || "Driving Lesson"),
              packagePrice: lessonPrice,
              date: sanitizeText(l.d),
              time: sanitizeText(l.t),
              status: "Confirmed",
              notes: lessonNote,
              paymentStatus: "paid",
              stripeSessionId: sessionData.id
            });
          }
          if (lessonBooking) {
            handleBookingConfirmed(lessonBooking).catch((err) => {
              console.error(`[Resend Reminder] Error in handleBookingConfirmed for ${lessonRef}:`, err);
            });
          }
          if (i === 0) {
            finalBooking = lessonBooking;
          }
        }
      } else {
        const existing = await getBookingByRef(targetRef, { allowUnpaid: true });
        if (existing) {
          finalBooking = await updateBookingByRef(targetRef, {
            status: "Confirmed",
            paymentStatus: "paid",
            stripeSessionId: sessionData.id,
            packagePrice: sessionData.amount_total ? sessionData.amount_total / 100 : existing.packagePrice
          });
        } else {
          finalBooking = await createBooking({
            bookingRef: targetRef,
            userId: null,
            studentName: sanitizeText(meta.studentName || sessionData.customer_details?.name || "Student Driver"),
            phone: sanitizeText(meta.studentPhone || ""),
            email: sanitizeText(sessionData.customer_details?.email || ""),
            suburb: sanitizeText(meta.suburb || "Rooty Hill, NSW"),
            pickupAddress: sanitizeText(meta.pickupAddress || null),
            packageTitle: sanitizeText(meta.serviceTitle || "Driving Lesson"),
            packagePrice: sessionData.amount_total ? sessionData.amount_total / 100 : 65,
            date: sanitizeText(meta.bookingDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
            time: sanitizeText(meta.bookingTime || "09:00 AM"),
            status: "Confirmed",
            notes: `[Verified via Stripe Checkout: ${sessionData.id}]`,
            paymentStatus: "paid",
            stripeSessionId: sessionData.id
          });
        }
        if (finalBooking) {
          handleBookingConfirmed(finalBooking).catch((err) => {
            console.error("[Resend Reminder] Error in handleBookingConfirmed on checkout verification:", err);
          });
        }
      }
    }
    res.json({
      id: sessionData.id,
      paymentStatus: sessionData.payment_status,
      customerEmail: sessionData.customer_details?.email,
      customerName: sessionData.customer_details?.name,
      amountTotal: sessionData.amount_total ? sessionData.amount_total / 100 : 0,
      currency: sessionData.currency || "aud",
      metadata: sessionData.metadata,
      paymentIntentId: sessionData.payment_intent || sessionData.id,
      booking: finalBooking
    });
  } catch (error) {
    console.error("Error verifying checkout session:", error);
    res.status(500).json({
      error: "VERIFY_ERROR",
      message: error?.message || "Failed to verify session"
    });
  }
});
var CANONICAL_PRICES = {
  "1 hour driving lesson": 65,
  "60 minutes lesson": 65,
  "60 min lesson": 65,
  "60-min-lesson": 65,
  "2 hour driving lesson": 130,
  "2 hours lesson": 130,
  "2-hour-lesson": 130,
  "car hire + 1 hour lesson": 200,
  "car hire & 1 lesson": 200,
  "driving test package + 1 lesson": 200,
  "driving test package": 200,
  "test-1-lesson": 200,
  "car hire + 2 hour lesson": 250,
  "car hire & 2 lessons": 250,
  "driving test package + 2 lessons": 250,
  "test-2-lesson": 250,
  "10 hours package": 620,
  "10 hours pack": 620,
  "10-hours-pack": 620,
  "5 hours package": 315,
  "5 hours pack": 315,
  "5-hours-pack": 315,
  "srv-1hr": 65,
  "srv-2hr": 130,
  "srv-car-1hr": 200,
  "srv-car-2hr": 250,
  "pkg-10hr": 620,
  "pkg-5hr": 315,
  "single-lesson": 65,
  "2-hours-lesson": 130,
  "practice-test": 95
};
function computeVerifiedOrder(items) {
  let total = 0;
  const verifiedItems = [];
  const rawItems = Array.isArray(items) && items.length > 0 ? items : [{ name: "1 Hour Driving Lesson", quantity: 1 }];
  for (const raw of rawItems) {
    const qty = Math.max(1, parseInt(String(raw.quantity || 1), 10) || 1);
    const rawName = String(raw.name || raw.title || raw.id || "1 Hour Driving Lesson").trim();
    const nameLower = rawName.toLowerCase();
    let unitPrice = 65;
    if (CANONICAL_PRICES[nameLower]) {
      unitPrice = CANONICAL_PRICES[nameLower];
    } else if (raw.id && CANONICAL_PRICES[String(raw.id).toLowerCase()]) {
      unitPrice = CANONICAL_PRICES[String(raw.id).toLowerCase()];
    } else {
      const match = Object.entries(CANONICAL_PRICES).find(([key]) => nameLower.includes(key));
      if (match) {
        unitPrice = match[1];
      } else if (typeof raw.unitPrice === "number" && raw.unitPrice > 0) {
        unitPrice = raw.unitPrice;
      } else if (typeof raw.packagePrice === "number" && raw.packagePrice > 0) {
        unitPrice = raw.packagePrice;
      }
    }
    const lineTotal = Number((unitPrice * qty).toFixed(2));
    total += lineTotal;
    verifiedItems.push({
      name: rawName,
      unitPrice,
      quantity: qty,
      lineTotal
    });
  }
  return {
    verifiedItems,
    totalAmount: Number(total.toFixed(2))
  };
}
app.post("/api/payments/calculate", (req, res) => {
  try {
    const { items } = req.body;
    const { verifiedItems, totalAmount } = computeVerifiedOrder(items);
    res.json({
      items: verifiedItems,
      totalAmount,
      currency: "AUD"
    });
  } catch (error) {
    console.error("Error computing order total:", error);
    res.status(500).json({ error: "Failed to calculate total amount" });
  }
});
app.post("/api/payments/stripe/create-intent", async (req, res) => {
  try {
    const { items, customerInfo, bookingRef } = req.body;
    const { verifiedItems, totalAmount } = computeVerifiedOrder(items);
    const amountInCents = Math.round(totalAmount * 100);
    const bookingDate = customerInfo?.bookingDate || customerInfo?.date;
    const bookingTime = customerInfo?.bookingTime || customerInfo?.time;
    const customerEmail = customerInfo?.email ? sanitizeText(customerInfo.email).toLowerCase() : void 0;
    const customerPhone = customerInfo?.phone ? sanitizeText(customerInfo.phone) : void 0;
    let targetRef = bookingRef;
    if (!targetRef && (customerEmail || customerPhone) && bookingDate && bookingTime) {
      const existingPending = await getPendingBookingForCustomer(customerEmail, customerPhone, bookingDate, bookingTime);
      if (existingPending) {
        targetRef = existingPending.bookingRef;
      }
    }
    if (!targetRef) {
      targetRef = `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
    }
    if (bookingDate && bookingTime) {
      const isTaken = await checkSlotBooked(bookingDate, bookingTime, targetRef, customerEmail, customerPhone);
      if (isTaken) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: `The ${bookingTime} slot on ${bookingDate} is already reserved. Please select another slot.`
        });
      }
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      const simPiId = `pi_sim_${Date.now()}_${targetRef}`;
      return res.json({
        sandboxMode: true,
        clientSecret: `${simPiId}_secret`,
        paymentIntentId: simPiId,
        bookingRef: targetRef,
        totalAmount,
        currency: "AUD",
        items: verifiedItems,
        publishableKey: ""
      });
    }
    const stripe = getStripe();
    let existingBooking = await getBookingByRef(targetRef, { allowUnpaid: true });
    if (existingBooking?.stripeSessionId && existingBooking.stripeSessionId.startsWith("pi_")) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(existingBooking.stripeSessionId);
        const reusableStatuses = ["requires_payment_method", "requires_confirmation", "requires_action"];
        if (existingPI && reusableStatuses.includes(existingPI.status)) {
          const updatedPI = await stripe.paymentIntents.update(existingPI.id, {
            amount: amountInCents,
            description: `Wally's Driving School - ${verifiedItems.map((i) => i.name).join(", ")}`,
            metadata: {
              bookingRef: targetRef,
              customerName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`.trim() || "Student"),
              customerEmail: sanitizeText(customerInfo?.email || ""),
              customerPhone: sanitizeText(customerInfo?.phone || ""),
              pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || ""),
              suburb: sanitizeText(customerInfo?.suburb || ""),
              bookingDate: bookingDate || "",
              bookingTime: bookingTime || "",
              packageTitle: verifiedItems[0]?.name || "Driving Lesson"
            }
          });
          return res.json({
            clientSecret: updatedPI.client_secret,
            paymentIntentId: updatedPI.id,
            bookingRef: targetRef,
            totalAmount,
            currency: "AUD",
            items: verifiedItems,
            publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
          });
        }
      } catch (piReuseErr) {
        console.log("[Stripe] Notice: could not reuse stored paymentIntent, creating fresh intent:", piReuseErr?.message);
      }
    }
    const paymentIntentParams = {
      amount: amountInCents,
      currency: "aud",
      payment_method_types: ["card"],
      description: `Wally's Driving School - ${verifiedItems.map((i) => i.name).join(", ")}`,
      metadata: {
        bookingRef: targetRef,
        customerName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`.trim() || "Student"),
        customerEmail: sanitizeText(customerInfo?.email || ""),
        customerPhone: sanitizeText(customerInfo?.phone || ""),
        pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || ""),
        suburb: sanitizeText(customerInfo?.suburb || ""),
        bookingDate: bookingDate || "",
        bookingTime: bookingTime || "",
        packageTitle: verifiedItems[0]?.name || "Driving Lesson"
      }
    };
    let paymentIntent;
    const clientProvidedIdempotency = req.headers["idempotency-key"];
    try {
      paymentIntent = await stripe.paymentIntents.create(
        paymentIntentParams,
        clientProvidedIdempotency ? { idempotencyKey: clientProvidedIdempotency } : void 0
      );
    } catch (createErr) {
      if (createErr?.type === "StripeIdempotencyError" || createErr?.message?.toLowerCase().includes("idempotent")) {
        console.warn("[Stripe] Idempotency key mismatch detected, retrying without fixed key:", createErr.message);
        paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      } else {
        throw createErr;
      }
    }
    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      bookingRef: targetRef,
      totalAmount,
      currency: "AUD",
      items: verifiedItems,
      publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
    });
  } catch (error) {
    console.error("Error creating Stripe PaymentIntent:", error);
    res.status(500).json({
      error: "STRIPE_INTENT_ERROR",
      message: error?.message || "Failed to create payment intent"
    });
  }
});
app.get("/api/payments/stripe/create-intent", (_req, res) => {
  res.status(405).json({
    error: "METHOD_NOT_ALLOWED",
    message: "Use POST with lesson items and customer info to create a Stripe payment intent."
  });
});
app.post("/api/payments/stripe/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId, bookingRef, bookingData, items } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ error: "paymentIntentId is required" });
    }
    const { verifiedItems, totalAmount } = computeVerifiedOrder(
      items || (bookingData?.packageTitle ? [{ name: bookingData.packageTitle, unitPrice: bookingData.packagePrice }] : [])
    );
    let paidAmount = totalAmount;
    const targetRef = bookingRef || bookingData?.bookingRef || bookingData?.ref || `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const paymentMethodName = req.body.paymentMethod || (paymentIntentId.startsWith("pi_sim_") ? "Stripe" : "Stripe Card / Google Pay");
    if (paymentIntentId.startsWith("pi_sim_")) {
      paidAmount = totalAmount > 0 ? totalAmount : bookingData?.packagePrice || 65;
    } else {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(400).json({ error: "STRIPE_SECRET_KEY is not configured" });
      }
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
        return res.status(400).json({
          error: "PAYMENT_NOT_COMPLETED",
          message: `Stripe payment status is: ${paymentIntent.status}. Expected 'succeeded'.`,
          status: paymentIntent.status
        });
      }
      paidAmount = paymentIntent.amount / 100;
    }
    let finalBooking = null;
    if (targetRef) {
      const existing = await getBookingByRef(targetRef, { allowUnpaid: true });
      if (existing) {
        if (existing.paymentStatus === "paid" && existing.stripeSessionId === paymentIntentId) {
          return res.json({
            success: true,
            verified: true,
            paymentStatus: "paid",
            booking: existing,
            transactionId: paymentIntentId,
            amount: paidAmount,
            message: "Payment already verified."
          });
        }
        finalBooking = await updateBookingByRef(targetRef, {
          paymentStatus: "paid",
          status: "Confirmed",
          stripeSessionId: paymentIntentId,
          packagePrice: paidAmount > 0 ? paidAmount : existing.packagePrice,
          notes: existing.notes ? `${existing.notes} [Verified via Stripe: ${paymentIntentId}]` : `[Verified via Stripe: ${paymentIntentId}]`
        });
      }
    }
    if (!finalBooking && bookingData) {
      finalBooking = await createBooking({
        bookingRef: targetRef,
        userId: bookingData?.userId || null,
        studentName: sanitizeText(bookingData?.studentName || "Student Driver"),
        phone: sanitizeText(bookingData?.phone || ""),
        email: sanitizeText(bookingData?.email || ""),
        suburb: sanitizeText(bookingData?.suburb || "Rockingham, WA"),
        pickupAddress: sanitizeText(bookingData?.pickupAddress || null),
        packageTitle: sanitizeText(bookingData?.packageTitle || verifiedItems[0]?.name || "Driving Lesson"),
        packagePrice: paidAmount > 0 ? paidAmount : totalAmount,
        date: sanitizeText(bookingData?.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
        time: sanitizeText(bookingData?.time || "09:00 AM"),
        status: "Confirmed",
        notes: `[Verified via Stripe: ${paymentIntentId}]`,
        paymentStatus: "paid",
        stripeSessionId: paymentIntentId
      });
    }
    if (finalBooking) {
      logBookingAudit({
        bookingRef: targetRef,
        action: "payment_verified",
        performedBy: "stripe_client_confirm",
        previousState: "Pending",
        newState: "Confirmed",
        notes: `Verified $${paidAmount.toFixed(2)} AUD via ${paymentMethodName} (Tx: ${paymentIntentId})`
      }).catch((e) => console.error("[Audit] Error logging confirm-payment audit:", e));
      sendBookingConfirmationEmail(finalBooking).catch((e) => console.error("[Resend] Error sending confirmation:", e));
      sendPaymentReceiptEmail(finalBooking, {
        method: paymentMethodName.toLowerCase().includes("google") ? "google_pay" : "card",
        transactionId: paymentIntentId,
        amount: paidAmount
      }).catch((e) => console.error("[Resend] Error sending receipt:", e));
      sendInstructorNotificationEmail(finalBooking).catch((e) => console.error("[Resend] Error notifying instructor:", e));
      handleBookingConfirmed(finalBooking).catch((e) => console.error("[Resend Reminder] Error confirming lesson reminder:", e));
    }
    const bookingResponse = finalBooking ? {
      ...finalBooking,
      ref: finalBooking.bookingRef || finalBooking.ref || targetRef,
      paymentMethod: paymentMethodName
    } : null;
    res.json({
      success: true,
      verified: true,
      paymentStatus: "paid",
      booking: bookingResponse,
      transactionId: paymentIntentId,
      amount: paidAmount,
      message: `${paymentMethodName} payment successfully verified and booking marked as Confirmed and Paid.`
    });
  } catch (error) {
    console.error("Error verifying Stripe payment:", error);
    res.status(500).json({ error: error?.message || "Failed to confirm payment" });
  }
});
var processedWebhookEventIds = /* @__PURE__ */ new Set();
async function handleStripeWebhookEvent(req, res) {
  let event;
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  try {
    if (webhookSecret && sig) {
      const stripe = getStripe();
      const rawBody = req.rawBody || (typeof req.body === "string" ? Buffer.from(req.body) : Buffer.from(JSON.stringify(req.body)));
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (webhookSecret && !sig) {
        console.warn("[Stripe Webhook] Received webhook event without stripe-signature header");
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }
  if (event.id) {
    const alreadyProcessedInDb = await isWebhookEventProcessed(event.id);
    if (alreadyProcessedInDb || processedWebhookEventIds.has(event.id)) {
      console.log(`[Stripe Webhook] Duplicate event ignored: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }
    processedWebhookEventIds.add(event.id);
    if (processedWebhookEventIds.size > 2e3) {
      const oldest = processedWebhookEventIds.values().next().value;
      if (oldest) processedWebhookEventIds.delete(oldest);
    }
    await recordWebhookEvent(event.id, "stripe", event.type);
  }
  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing) {
            const updated = await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: pi.id,
              packagePrice: pi.amount_received ? pi.amount_received / 100 : existing.packagePrice
            });
            await logBookingAudit({
              bookingRef: ref,
              action: "payment_verified",
              performedBy: "stripe_webhook",
              previousState: existing.status,
              newState: "Confirmed",
              notes: `Payment verified by Stripe PaymentIntent ${pi.id} ($${(pi.amount_received / 100).toFixed(2)} AUD)`
            });
            if (updated) {
              sendBookingConfirmationEmail(updated).catch((e) => console.error("[Resend] Error sending confirmation:", e));
              sendPaymentReceiptEmail(updated, {
                method: "card",
                transactionId: pi.id,
                amount: pi.amount_received ? pi.amount_received / 100 : Number(updated.packagePrice) || 70
              }).catch((e) => console.error("[Resend] Error sending receipt:", e));
              sendInstructorNotificationEmail(updated).catch((e) => console.error("[Resend] Error notifying instructor:", e));
              handleBookingConfirmed(updated).catch((e) => console.error("[Resend] Error scheduling reminder:", e));
            }
            console.log(`[Stripe Webhook] Booking ${ref} confirmed as paid for PaymentIntent ${pi.id}`);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const ref = pi.metadata?.bookingRef;
        const failureMsg = pi.last_payment_error?.message || "Payment declined";
        console.warn(`[Stripe Webhook] Payment failed for ${ref}: ${failureMsg}`);
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              paymentStatus: "failed",
              notes: existing.notes ? `${existing.notes} [Payment Failed: ${failureMsg}]` : `[Payment Failed: ${failureMsg}]`
            });
            await logBookingAudit({
              bookingRef: ref,
              action: "payment_failed",
              performedBy: "stripe_webhook",
              previousState: existing.status,
              newState: "failed",
              notes: failureMsg
            });
          }
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "cancelled"
            });
            await logBookingAudit({
              bookingRef: ref,
              action: "cancel",
              performedBy: "stripe_webhook",
              previousState: existing.status,
              newState: "Cancelled",
              notes: "Stripe PaymentIntent canceled"
            });
            console.log(`[Stripe Webhook] Booking ${ref} cancelled due to payment intent cancellation`);
          }
        }
        break;
      }
      case "payment_intent.processing": {
        const pi = event.data.object;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              paymentStatus: "processing",
              status: "Pending"
            });
          }
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        const refundAmount = charge.amount_refunded ? charge.amount_refunded / 100 : 0;
        const allBookings = await getBookings({ includeUnpaid: true });
        const targetBooking = allBookings.find(
          (b) => paymentIntentId && b.stripeSessionId === paymentIntentId || b.notes && b.notes.includes(paymentIntentId || "")
        );
        if (targetBooking) {
          const updated = await updateBooking(targetBooking.id, {
            status: "Cancelled",
            paymentStatus: "refunded",
            notes: (targetBooking.notes || "") + ` [Refund of $${refundAmount.toFixed(2)} AUD processed via Stripe]`
          });
          await logBookingAudit({
            bookingRef: targetBooking.bookingRef,
            action: "refund",
            performedBy: "stripe_webhook",
            previousState: targetBooking.status,
            newState: "refunded",
            notes: `Stripe charge refunded: $${refundAmount.toFixed(2)} AUD`
          });
          if (updated) {
            sendBookingCancellationNoticeEmail(updated, {
              reason: "Payment refunded via Stripe",
              refundStatus: "refunded",
              amountRefunded: refundAmount,
              refundTxId: charge.id
            }).catch((e) => console.error("[Resend] Error sending refund email:", e));
            cancelScheduledLessonReminder(updated, "Payment was refunded");
          }
          console.log(`[Stripe Webhook] Booking ${targetBooking.bookingRef} marked as refunded`);
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object;
        const ref = session.metadata?.bookingRef;
        if (session.payment_status === "paid" && ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing) {
            const updated = await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: session.id
            });
            await logBookingAudit({
              bookingRef: ref,
              action: "payment_verified",
              performedBy: "stripe_webhook",
              previousState: existing.status,
              newState: "Confirmed",
              notes: `Checkout Session completed (${session.id})`
            });
            if (updated) {
              sendBookingConfirmationEmail(updated).catch((e) => console.error("[Resend] Error sending confirmation:", e));
              sendPaymentReceiptEmail(updated, {
                method: "card",
                transactionId: session.id,
                amount: session.amount_total ? session.amount_total / 100 : Number(updated.packagePrice) || 70
              }).catch((e) => console.error("[Resend] Error sending receipt:", e));
              sendInstructorNotificationEmail(updated).catch((e) => console.error("[Resend] Error notifying instructor:", e));
              handleBookingConfirmed(updated).catch((e) => console.error("[Resend] Error scheduling reminder:", e));
            }
            console.log(`[Stripe Webhook] Checkout session completed for booking ${ref}`);
          }
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        const ref = session.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "expired"
            });
            await logBookingAudit({
              bookingRef: ref,
              action: "cancel",
              performedBy: "stripe_webhook",
              previousState: existing.status,
              newState: "Cancelled",
              notes: "Checkout session expired"
            });
            console.log(`[Stripe Webhook] Booking ${ref} expired`);
          }
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Handler error:", err?.message || err);
    res.status(500).json({ error: "Webhook handler error" });
  }
}
app.post("/api/payments/webhook", handleStripeWebhookEvent);
app.post("/api/stripe/webhook", handleStripeWebhookEvent);
app.post("/api/payments/stripe/refund", requireInstructorOrAuth, async (req, res) => {
  try {
    const { bookingRef, reason, amount } = req.body;
    if (!bookingRef) {
      return res.status(400).json({ error: "bookingRef is required" });
    }
    const booking = await getBookingByRef(bookingRef, { allowUnpaid: true });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (booking.paymentStatus === "refunded") {
      return res.status(400).json({ error: "Booking has already been refunded" });
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    let refundId = `sim_ref_${Date.now()}`;
    let refundAmount = amount ? Number(amount) : Number(booking.packagePrice) || 70;
    if (stripeKey && booking.stripeSessionId && !booking.stripeSessionId.startsWith("sim_")) {
      const stripe = getStripe();
      let piId = booking.stripeSessionId;
      if (piId.startsWith("cs_")) {
        const session = await stripe.checkout.sessions.retrieve(piId);
        if (session.payment_intent && typeof session.payment_intent === "string") {
          piId = session.payment_intent;
        }
      }
      if (piId.startsWith("pi_")) {
        const refundParams = {
          payment_intent: piId,
          reason: "requested_by_customer"
        };
        if (amount) {
          refundParams.amount = Math.round(Number(amount) * 100);
        }
        const refund = await stripe.refunds.create(refundParams);
        refundId = refund.id;
        refundAmount = refund.amount / 100;
      }
    }
    const updated = await updateBookingByRef(bookingRef, {
      status: "Cancelled",
      paymentStatus: "refunded",
      notes: (booking.notes || "") + ` [Refunded $${refundAmount.toFixed(2)} AUD: ${refundId}]`
    });
    await logBookingAudit({
      bookingRef,
      action: "refund",
      performedBy: "instructor",
      previousState: booking.status,
      newState: "refunded",
      notes: `Instructor issued refund of $${refundAmount.toFixed(2)} AUD (Ref: ${refundId}). Reason: ${reason || "N/A"}`
    });
    if (updated) {
      sendBookingCancellationNoticeEmail(updated, {
        reason: reason || "Instructor issued cancellation and refund",
        refundStatus: "refunded",
        amountRefunded: refundAmount,
        refundTxId: refundId
      }).catch((e) => console.error("[Resend] Error sending cancellation notice:", e));
      cancelScheduledLessonReminder(updated, "Lesson was refunded");
    }
    res.json({
      success: true,
      message: `Successfully refunded $${refundAmount.toFixed(2)} AUD for booking ${bookingRef}`,
      refundId,
      booking: updated
    });
  } catch (err) {
    console.error("Stripe refund error:", err);
    res.status(500).json({ error: err?.message || "Failed to process Stripe refund" });
  }
});
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const isLive = process.env.PAYPAL_ENVIRONMENT === "live";
  const base = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
    if (!res.ok) {
      console.warn(`[PayPal] OAuth error: ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.warn(`[PayPal] Exception fetching OAuth token:`, err);
    return null;
  }
}
app.post("/api/payments/paypal/create-order", async (req, res) => {
  try {
    const { items, customerInfo, bookingRef } = req.body;
    const { verifiedItems, totalAmount } = computeVerifiedOrder(items);
    const isSlotTaken = await checkSlotBooked(
      customerInfo?.date || customerInfo?.bookingDate,
      customerInfo?.time || customerInfo?.bookingTime
    );
    if (isSlotTaken) {
      return res.status(409).json({
        error: "SLOT_ALREADY_BOOKED",
        message: "This time slot is no longer available. Please select another time."
      });
    }
    const targetRef = bookingRef || `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const accessToken = await getPayPalAccessToken();
    if (accessToken) {
      const isLive = process.env.PAYPAL_ENVIRONMENT === "live";
      const base = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const origin = req.headers.origin || "https://wallysdrivingschool.com.au";
      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: targetRef,
            description: `Wally's Driving School - ${verifiedItems.map((i) => i.name).join(", ")}`,
            amount: {
              currency_code: "AUD",
              value: totalAmount.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: "AUD",
                  value: totalAmount.toFixed(2)
                }
              }
            },
            items: verifiedItems.map((i) => ({
              name: i.name,
              unit_amount: {
                currency_code: "AUD",
                value: i.unitPrice.toFixed(2)
              },
              quantity: String(i.quantity)
            }))
          }
        ],
        application_context: {
          brand_name: "Wally's Driving School",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${origin}/book-now?paypal_status=success&ref=${targetRef}`,
          cancel_url: `${origin}/book-now?paypal_status=cancel&ref=${targetRef}`
        }
      };
      const ppRes = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderPayload)
      });
      const orderData = await ppRes.json();
      if (!ppRes.ok) {
        return res.status(400).json({ error: orderData.message || "Failed to create PayPal order" });
      }
      const approveLink = orderData.links?.find((l) => l.rel === "approve")?.href;
      return res.json({
        orderId: orderData.id,
        bookingRef: targetRef,
        approveUrl: approveLink,
        totalAmount
      });
    }
    const simOrderId = `PAYPAL_SIM_${Date.now()}`;
    return res.json({
      orderId: simOrderId,
      bookingRef: targetRef,
      approveUrl: null,
      totalAmount,
      isSimulated: true
    });
  } catch (err) {
    console.error("PayPal create order error:", err);
    res.status(500).json({ error: err?.message || "Failed to initialize PayPal order" });
  }
});
app.post("/api/payments/paypal/capture-order", async (req, res) => {
  try {
    const { orderId, bookingRef, bookingData, items } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    const { verifiedItems, totalAmount } = computeVerifiedOrder(items);
    const targetRef = bookingRef || bookingData?.bookingRef || `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const accessToken = await getPayPalAccessToken();
    let captureId = orderId;
    let paidAmount = totalAmount;
    if (accessToken && !orderId.startsWith("PAYPAL_SIM_")) {
      const isLive = process.env.PAYPAL_ENVIRONMENT === "live";
      const base = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });
      const captureData = await captureRes.json();
      if (!captureRes.ok) {
        return res.status(400).json({ error: captureData.message || "PayPal capture failed" });
      }
      const captureObj = captureData.purchase_units?.[0]?.payments?.captures?.[0];
      captureId = captureObj?.id || orderId;
      paidAmount = captureObj?.amount?.value ? parseFloat(captureObj.amount.value) : totalAmount;
    }
    let finalBooking = await getBookingByRef(targetRef, { allowUnpaid: true });
    if (finalBooking) {
      finalBooking = await updateBookingByRef(targetRef, {
        status: "Confirmed",
        paymentStatus: "paid",
        stripeSessionId: `paypal_${captureId}`,
        packagePrice: paidAmount,
        notes: (finalBooking.notes || "") + ` [Verified via PayPal: ${captureId}]`
      });
    } else if (bookingData) {
      finalBooking = await createBooking({
        bookingRef: targetRef,
        userId: bookingData?.userId || null,
        studentName: sanitizeText(bookingData?.studentName || "Student Driver"),
        phone: sanitizeText(bookingData?.phone || ""),
        email: sanitizeText(bookingData?.email || "").toLowerCase(),
        suburb: sanitizeText(bookingData?.suburb || "Rooty Hill, NSW"),
        pickupAddress: sanitizeText(bookingData?.pickupAddress || null),
        packageTitle: sanitizeText(bookingData?.packageTitle || verifiedItems[0]?.name || "Driving Lesson"),
        packagePrice: paidAmount,
        date: sanitizeText(bookingData?.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
        time: sanitizeText(bookingData?.time || "09:00 AM"),
        status: "Confirmed",
        notes: `[Verified via PayPal: ${captureId}]`,
        paymentStatus: "paid",
        stripeSessionId: `paypal_${captureId}`
      });
    }
    await logBookingAudit({
      bookingRef: targetRef,
      action: "payment_verified",
      performedBy: "paypal_capture",
      previousState: "Pending",
      newState: "Confirmed",
      notes: `Verified $${paidAmount.toFixed(2)} AUD via PayPal (Capture: ${captureId})`
    });
    if (finalBooking) {
      sendBookingConfirmationEmail(finalBooking).catch((e) => console.error("[Resend] Error sending confirmation:", e));
      sendPaymentReceiptEmail(finalBooking, {
        method: "paypal",
        transactionId: captureId,
        amount: paidAmount
      }).catch((e) => console.error("[Resend] Error sending receipt:", e));
      sendInstructorNotificationEmail(finalBooking).catch((e) => console.error("[Resend] Error notifying instructor:", e));
      handleBookingConfirmed(finalBooking).catch((e) => console.error("[Resend] Error scheduling reminder:", e));
    }
    res.json({
      success: true,
      verified: true,
      paymentStatus: "paid",
      booking: finalBooking,
      transactionId: captureId,
      amount: paidAmount,
      message: "PayPal payment successfully captured and booking confirmed."
    });
  } catch (err) {
    console.error("PayPal capture error:", err);
    res.status(500).json({ error: err?.message || "Failed to capture PayPal order" });
  }
});
app.get("/api/audit-logs", requireInstructorOrAuth, async (req, res) => {
  try {
    const bookingRef = req.query.bookingRef;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const logs = await getBookingAuditLogs(bookingRef, limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});
app.post("/api/auth/sync", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const dbUser = await getOrCreateUser(
      user.uid,
      user.email || "",
      user.name || void 0,
      user.picture || void 0
    );
    res.json({ success: true, user: dbUser });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: error.message || "Failed to sync user" });
  }
});
app.get("/api/availability", async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const targetDate = req.query.date ? normalizeDate(String(req.query.date)) : void 0;
    const list = await getBookings({ includeUnpaid: true });
    const now = Date.now();
    const PENDING_TIMEOUT_MS = 20 * 60 * 1e3;
    const bookedSlots = list.filter((b) => {
      if (b.status === "Cancelled") return false;
      if ((b.status === "Pending" || b.paymentStatus === "unpaid") && b.paymentStatus !== "paid") {
        const createdAtMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (createdAtMs > 0 && now - createdAtMs > PENDING_TIMEOUT_MS) {
          return false;
        }
      }
      if (targetDate) {
        return normalizeDate(b.date) === targetDate;
      }
      return true;
    }).map((b) => ({
      date: b.date,
      time: b.time,
      status: b.status
    }));
    res.json(bookedSlots);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});
app.get("/api/check-slot", async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const date = req.query.date;
    const time = req.query.time;
    const excludeRef = req.query.excludeRef || void 0;
    const email = req.query.email || void 0;
    const phone = req.query.phone || void 0;
    if (!date || !time) {
      return res.status(400).json({ error: "Missing date or time parameter" });
    }
    const isBooked = await checkSlotBooked(date, time, excludeRef, email, phone);
    res.json({
      available: !isBooked,
      date,
      time,
      message: isBooked ? "This time slot is no longer available. Please select another time." : "Slot available"
    });
  } catch (error) {
    console.error("Error checking slot:", error);
    res.status(500).json({ error: "Failed to check slot" });
  }
});
app.post("/api/check-slots", async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const { lessons, excludeRef, email, phone } = req.body;
    if (!Array.isArray(lessons) || lessons.length === 0) {
      return res.status(400).json({ error: "Missing or invalid lessons array" });
    }
    const check = await checkMultipleSlotsBooked(lessons, excludeRef, email, phone);
    if (!check.available) {
      return res.status(409).json({
        available: false,
        conflicts: check.conflicts,
        message: check.conflicts[0] || "One or more selected lessons are no longer available"
      });
    }
    res.json({
      available: true,
      count: lessons.length,
      message: "All selected lesson slots are available"
    });
  } catch (error) {
    console.error("Error checking multiple slots:", error);
    res.status(500).json({ error: "Failed to check slots" });
  }
});
app.get("/api/bookings", optionalAuth, async (req, res) => {
  try {
    const email = req.query.email || void 0;
    const userId = req.user?.uid;
    const isInstructor = Boolean(req.instructor);
    const list = await getBookings({ email, userId, includeUnpaid: isInstructor });
    res.json(list);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch bookings" });
  }
});
app.get("/api/bookings/:ref", optionalAuth, async (req, res) => {
  try {
    const ref = req.params.ref;
    const isInstructor = Boolean(req.instructor);
    const booking = await getBookingByRef(ref, { allowUnpaid: isInstructor });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found or payment not completed" });
    }
    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to fetch booking" });
  }
});
app.post("/api/bookings", optionalAuth, bookingLimiter, async (req, res) => {
  try {
    const {
      studentName,
      phone,
      email,
      suburb,
      pickupAddress,
      packageTitle,
      packagePrice,
      date,
      time,
      status,
      notes,
      paymentStatus,
      stripeSessionId,
      lessons
    } = req.body;
    const hasMultipleLessons = Array.isArray(lessons) && lessons.length > 0;
    const primaryDate = hasMultipleLessons ? lessons[0]?.date : date;
    const primaryTime = hasMultipleLessons ? lessons[0]?.time : time;
    if (!studentName || !phone || !email || !suburb || !packageTitle || !primaryDate || !primaryTime) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }
    const emailCheck = validateWorkingEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error || "A valid working email is required" });
    }
    const countryCode = req.body.countryCode || (phone.startsWith("+") ? phone.split(" ")[0] : "+61");
    const phoneCheck = validateInternationalPhone(phone, countryCode);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.error || "Please enter a valid phone number" });
    }
    if (hasMultipleLessons) {
      const batchCheck = await checkMultipleSlotsBooked(lessons, void 0, sanitizeText(email).toLowerCase(), sanitizeText(phone));
      if (!batchCheck.available) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: batchCheck.conflicts[0] || "One or more selected lesson slots are no longer available. Please select another time."
        });
      }
    } else {
      const isSlotTaken = await checkSlotBooked(primaryDate, primaryTime, void 0, sanitizeText(email).toLowerCase(), sanitizeText(phone));
      if (isSlotTaken) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: "This time slot is no longer available. Please select another time."
        });
      }
    }
    const isInstructor = Boolean(req.instructor);
    const finalPaymentStatus = paymentStatus || (isInstructor ? "paid" : "unpaid");
    const isPendingOrCash = status === "Pending" || req.body.paymentMethod === "cash" || finalPaymentStatus === "unpaid";
    if (finalPaymentStatus !== "paid" && !isInstructor && !isPendingOrCash) {
      return res.status(400).json({
        error: "PAYMENT_REQUIRED",
        message: "Lesson bookings require successful online payment via Stripe before they can be booked."
      });
    }
    const randomNum = Math.floor(1e3 + Math.random() * 9e3);
    const bookingRef = req.body.bookingRef || `WD-${randomNum}`;
    if (hasMultipleLessons && lessons.length > 1) {
      const createdBookings = [];
      const totalAmount = Number(packagePrice) || 620;
      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        const lessonNum = l.lessonNumber || i + 1;
        const lessonRef = i === 0 ? bookingRef : `${bookingRef}-L${lessonNum}`;
        const lessonPrice = i === 0 ? totalAmount : 0;
        const lessonNote = `[Package: ${sanitizeText(packageTitle)}] [Lesson ${lessonNum} of ${lessons.length}] ${sanitizeText(notes) || ""}`.trim();
        const itemBooking = await createBooking({
          bookingRef: lessonRef,
          userId: req.user?.uid || null,
          studentName: sanitizeText(studentName),
          phone: sanitizeText(phone),
          email: sanitizeText(email).toLowerCase(),
          suburb: sanitizeText(suburb),
          pickupAddress: sanitizeText(pickupAddress) || null,
          packageTitle: sanitizeText(packageTitle),
          packagePrice: lessonPrice,
          date: sanitizeText(l.date),
          time: sanitizeText(l.time),
          status: status || (finalPaymentStatus === "paid" ? "Confirmed" : "Pending"),
          notes: lessonNote,
          paymentStatus: finalPaymentStatus,
          stripeSessionId: stripeSessionId || null
        });
        if (itemBooking.status === "Confirmed") {
          handleBookingConfirmed(itemBooking).catch((err) => {
            console.error(`[Resend Reminder] Error in handleBookingConfirmed for ${lessonRef}:`, err);
          });
        }
        createdBookings.push(itemBooking);
      }
      const masterBooking = {
        ...createdBookings[0],
        lessons: createdBookings.map((b, idx) => ({
          lessonNumber: idx + 1,
          bookingRef: b.bookingRef,
          date: b.date,
          time: b.time,
          status: b.status
        }))
      };
      return res.status(201).json(masterBooking);
    }
    const newBooking = await createBooking({
      bookingRef,
      userId: req.user?.uid || null,
      studentName: sanitizeText(studentName),
      phone: sanitizeText(phone),
      email: sanitizeText(email).toLowerCase(),
      suburb: sanitizeText(suburb),
      pickupAddress: sanitizeText(pickupAddress) || null,
      packageTitle: sanitizeText(packageTitle),
      packagePrice: Number(packagePrice) || 70,
      date: sanitizeText(primaryDate),
      time: sanitizeText(primaryTime),
      status: status || (finalPaymentStatus === "paid" ? "Confirmed" : "Pending"),
      notes: sanitizeText(notes) || null,
      paymentStatus: finalPaymentStatus,
      stripeSessionId: stripeSessionId || null
    });
    if (newBooking.status === "Confirmed") {
      logBookingAudit({
        bookingRef,
        action: "create",
        performedBy: isInstructor ? "instructor" : "customer",
        newState: "Confirmed",
        notes: `Created confirmed booking for ${newBooking.studentName} (${newBooking.packageTitle})`
      }).catch((e) => console.error("[Audit] Error logging create:", e));
      sendBookingConfirmationEmail(newBooking).catch((err) => {
        console.error("[Resend] Error in sendBookingConfirmationEmail:", err);
      });
      sendInstructorNotificationEmail(newBooking).catch((err) => {
        console.error("[Resend] Error in sendInstructorNotificationEmail:", err);
      });
      handleBookingConfirmed(newBooking).catch((err) => {
        console.error("[Resend Reminder] Error in handleBookingConfirmed for new booking:", err);
      });
    } else {
      logBookingAudit({
        bookingRef,
        action: "create",
        performedBy: isInstructor ? "instructor" : "customer",
        newState: "Pending",
        notes: `Created pending booking for ${newBooking.studentName}`
      }).catch((e) => console.error("[Audit] Error logging create:", e));
    }
    res.status(201).json(newBooking);
  } catch (error) {
    if (error.code === "SLOT_ALREADY_BOOKED" || error.status === 409) {
      return res.status(409).json({
        error: "SLOT_ALREADY_BOOKED",
        message: "This time slot was just booked by another customer. Please select another time."
      });
    }
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
});
app.patch("/api/bookings/:id", optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }
    if (req.body.status === "Cancelled") {
      req.body.reminderStatus = "cancelled";
      req.body.reminderError = "Lesson was cancelled";
      const bookings2 = await getBookings({ includeUnpaid: true });
      const existing = bookings2.find((b) => b.id === id);
      if (existing && existing.status !== "Cancelled") {
        const timestamp2 = getBookingTimestamp(existing.date, existing.time);
        const hoursUntilBooking = (timestamp2 - Date.now()) / (1e3 * 60 * 60);
        if (hoursUntilBooking > 24) {
          if (existing.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
            const stripe = getStripe();
            try {
              if (existing.stripeSessionId.startsWith("pi_")) {
                await stripe.refunds.create({ payment_intent: existing.stripeSessionId });
              } else if (existing.stripeSessionId.startsWith("cs_")) {
                const session = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
                if (session.payment_intent && typeof session.payment_intent === "string") {
                  await stripe.refunds.create({ payment_intent: session.payment_intent });
                }
              }
              req.body.notes = (req.body.notes || existing.notes || "") + " [Refund issued]";
              req.body.paymentStatus = "refunded";
            } catch (err) {
              console.error("Stripe refund failed:", err);
            }
          } else if (existing.paymentStatus === "paid") {
            req.body.notes = (req.body.notes || existing.notes || "") + " [Refund issued]";
            req.body.paymentStatus = "refunded";
          }
        } else {
          req.body.notes = (req.body.notes || existing.notes || "") + " [Late cancellation - no refund]";
        }
      }
    }
    if (req.body.date && req.body.time) {
      const isTaken = await checkSlotBooked(req.body.date, req.body.time, String(id));
      if (isTaken) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: "The selected reschedule time slot is already booked. Please choose another time."
        });
      }
    }
    const updated = await updateBooking(id, req.body);
    if (updated) {
      const ref = updated.bookingRef;
      if (req.body.status === "Cancelled") {
        logBookingAudit({
          bookingRef: ref,
          action: "cancel",
          performedBy: req.instructor ? "instructor" : "customer",
          newState: "Cancelled",
          notes: req.body.notes || "Booking cancelled via patch API"
        }).catch((e) => console.error("[Audit] Error logging cancel:", e));
        sendBookingCancellationNoticeEmail(updated, {
          reason: req.body.notes || "Lesson cancellation requested",
          refundStatus: req.body.paymentStatus === "refunded" ? "refunded" : "none"
        }).catch((e) => console.error("[Resend] Error sending cancellation notice:", e));
        handleBookingCancelled(updated).catch(() => {
        });
      } else if (req.body.date || req.body.time) {
        logBookingAudit({
          bookingRef: ref,
          action: "reschedule",
          performedBy: req.instructor ? "instructor" : "customer",
          newState: updated.status,
          notes: `Rescheduled to ${updated.date} at ${updated.time}`
        }).catch((e) => console.error("[Audit] Error logging reschedule:", e));
        handleBookingRescheduled(updated, updated.date, updated.time).catch(() => {
        });
      } else if (req.body.status === "Confirmed") {
        handleBookingConfirmed(updated).catch(() => {
        });
      }
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: error.message || "Failed to update booking" });
  }
});
app.patch("/api/bookings/ref/:ref", optionalAuth, async (req, res) => {
  try {
    const ref = sanitizeText(req.params.ref);
    if (req.body.status === "Cancelled") {
      req.body.reminderStatus = "cancelled";
      req.body.reminderError = "Lesson was cancelled";
      const existing = await getBookingByRef(ref, { allowUnpaid: true });
      if (existing && existing.status !== "Cancelled") {
        const timestamp2 = getBookingTimestamp(existing.date, existing.time);
        const hoursUntilBooking = (timestamp2 - Date.now()) / (1e3 * 60 * 60);
        if (hoursUntilBooking > 24) {
          if (existing.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
            const stripe = getStripe();
            try {
              if (existing.stripeSessionId.startsWith("pi_")) {
                await stripe.refunds.create({ payment_intent: existing.stripeSessionId });
              } else if (existing.stripeSessionId.startsWith("cs_")) {
                const session = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
                if (session.payment_intent && typeof session.payment_intent === "string") {
                  await stripe.refunds.create({ payment_intent: session.payment_intent });
                }
              }
              req.body.notes = (req.body.notes || existing.notes || "") + " [Refund issued]";
              req.body.paymentStatus = "refunded";
            } catch (err) {
              console.error("Stripe refund failed:", err);
            }
          } else if (existing.paymentStatus === "paid") {
            req.body.notes = (req.body.notes || existing.notes || "") + " [Refund issued]";
            req.body.paymentStatus = "refunded";
          }
        } else {
          req.body.notes = (req.body.notes || existing.notes || "") + " [Late cancellation - no refund]";
        }
      }
    }
    if (req.body.date && req.body.time) {
      const isTaken = await checkSlotBooked(req.body.date, req.body.time, ref);
      if (isTaken) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: "The selected reschedule time slot is already booked. Please choose another time."
        });
      }
    }
    const updated = await updateBookingByRef(ref, req.body);
    if (updated) {
      if (req.body.status === "Cancelled") {
        logBookingAudit({
          bookingRef: ref,
          action: "cancel",
          performedBy: req.instructor ? "instructor" : "customer",
          newState: "Cancelled",
          notes: req.body.notes || "Booking cancelled via ref API"
        }).catch((e) => console.error("[Audit] Error logging cancel:", e));
        sendBookingCancellationNoticeEmail(updated, {
          reason: req.body.notes || "Lesson cancellation requested",
          refundStatus: req.body.paymentStatus === "refunded" ? "refunded" : "none"
        }).catch((e) => console.error("[Resend] Error sending cancellation notice:", e));
        handleBookingCancelled(updated).catch(() => {
        });
      } else if (req.body.date || req.body.time) {
        logBookingAudit({
          bookingRef: ref,
          action: "reschedule",
          performedBy: req.instructor ? "instructor" : "customer",
          newState: updated.status,
          notes: `Rescheduled to ${updated.date} at ${updated.time}`
        }).catch((e) => console.error("[Audit] Error logging reschedule:", e));
        handleBookingRescheduled(updated, updated.date, updated.time).catch(() => {
        });
      } else if (req.body.status === "Confirmed") {
        handleBookingConfirmed(updated).catch(() => {
        });
      }
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to update booking" });
  }
});
app.delete("/api/bookings/:id", requireInstructorOrAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }
    logBookingAudit({
      action: "cancel",
      performedBy: "instructor",
      newState: "deleted",
      notes: `Booking ID ${id} deleted by instructor`
    }).catch((e) => console.error("[Audit] Error logging delete:", e));
    await deleteBookingById(id);
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: error.message || "Failed to delete booking" });
  }
});
app.delete("/api/bookings/ref/:ref", requireInstructorOrAuth, async (req, res) => {
  try {
    const ref = sanitizeText(req.params.ref);
    logBookingAudit({
      bookingRef: ref,
      action: "cancel",
      performedBy: "instructor",
      newState: "deleted",
      notes: `Booking ${ref} deleted by instructor`
    }).catch((e) => console.error("[Audit] Error logging delete:", e));
    await deleteBookingByRef(ref);
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to delete booking" });
  }
});
app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }
    const emailCheck = validateWorkingEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error || "A valid working email is required" });
    }
    if (phone && phone.trim()) {
      const countryCode = req.body.countryCode || (phone.startsWith("+") ? phone.split(" ")[0] : "+61");
      const phoneCheck = validateInternationalPhone(phone, countryCode);
      if (!phoneCheck.isValid) {
        return res.status(400).json({ error: phoneCheck.error || "Please enter a valid phone number" });
      }
    }
    const saved = await createContactMessage({
      name: sanitizeText(name),
      email: sanitizeText(email).toLowerCase(),
      phone: sanitizeText(phone) || null,
      subject: sanitizeText(subject) || null,
      message: sanitizeText(message)
    });
    res.status(201).json({ success: true, message: saved });
  } catch (error) {
    console.error("Error saving contact message:", error);
    res.status(500).json({ error: error.message || "Failed to save contact message" });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/supabase/status", async (_req, res) => {
  try {
    const status = await checkSupabaseConnection();
    res.json(status);
  } catch (err) {
    res.status(500).json({ configured: false, error: err?.message || "Failed to check Supabase connection" });
  }
});
app.get("/api/reminders/status", async (req, res) => {
  try {
    const isConfigured = !!process.env.RESEND_API_KEY;
    const fromEmail = getFormattedSender();
    const bookings2 = await getBookings({ includeUnpaid: false });
    const confirmed = bookings2.filter((b) => b.status === "Confirmed");
    const scheduled = confirmed.filter((b) => b.reminderStatus === "scheduled").length;
    const sent = confirmed.filter((b) => b.reminderStatus === "sent").length;
    const failed = confirmed.filter((b) => b.reminderStatus === "failed").length;
    const cancelled = bookings2.filter((b) => b.reminderStatus === "cancelled").length;
    res.json({
      configured: isConfigured,
      provider: "resend",
      fromEmail,
      timezone: process.env.SCHOOL_TIMEZONE || "Australia/Sydney",
      intervalSeconds: 60,
      stats: {
        totalConfirmed: confirmed.length,
        scheduled,
        sent,
        failed,
        cancelled
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get reminder status" });
  }
});
app.get("/api/reminders/preview/:refOrId", optionalAuth, async (req, res) => {
  try {
    const refOrId = req.params.refOrId;
    const bookings2 = await getBookings({ includeUnpaid: true });
    const booking = bookings2.find(
      (b) => b.bookingRef && b.bookingRef.toUpperCase() === refOrId.toUpperCase() || String(b.id) === String(refOrId)
    );
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const { subject, text: text2 } = generateReminderEmailContent({
      studentName: booking.studentName || "Student",
      date: booking.date,
      time: booking.time,
      pickupAddress: booking.pickupAddress,
      suburb: booking.suburb || "Rooty Hill"
    });
    res.json({
      bookingRef: booking.bookingRef || booking.ref,
      recipientEmail: booking.email,
      from: getFormattedSender(),
      subject,
      text: text2
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to preview email reminder" });
  }
});
app.post("/api/reminders/send/:refOrId", optionalAuth, async (req, res) => {
  try {
    const refOrId = req.params.refOrId;
    const bookings2 = await getBookings({ includeUnpaid: true });
    const booking = bookings2.find(
      (b) => b.bookingRef && b.bookingRef.toUpperCase() === refOrId.toUpperCase() || String(b.id) === String(refOrId)
    );
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const force = req.body?.force === true || req.query.force === "true";
    const result = await scheduleOrSendLessonReminder(booking, { force });
    res.json({
      bookingRef: booking.bookingRef || booking.ref,
      studentName: booking.studentName,
      studentEmail: booking.email,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to trigger reminder" });
  }
});
app.all("/api/reminders/cron/run", optionalAuth, async (req, res) => {
  try {
    const result = await processPendingLessonReminders();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to run reminder cron" });
  }
});
app.post("/api/reminders/send-direct", async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !to.includes("@")) {
      return res.status(400).json({ error: "Valid recipient email address is required" });
    }
    const resend = getResend();
    if (!resend) {
      return res.status(400).json({
        error: "RESEND_API_KEY is not configured on the server. Please add it to your server environment variables."
      });
    }
    const fromEmail = getFormattedSender();
    const sub = subject || "Reminder: Your Driving Lesson Today \u2013 Wally\u2019s Driving School";
    const body = message || [
      "Hi Student,",
      "",
      "This is a friendly reminder from Wally\u2019s Driving School that your driving lesson is scheduled for today.",
      "",
      "Please be ready a few minutes before your lesson.",
      "",
      "Thank you,",
      "Wally\u2019s Driving School"
    ].join("\n");
    let sendPayload = {
      from: fromEmail,
      to: [to.trim().toLowerCase()],
      subject: sub,
      text: body
    };
    let result = await resend.emails.send(sendPayload);
    if (result.error && (result.error.message.includes("domain") || result.error.name === "validation_error")) {
      sendPayload.from = "Wally\u2019s Driving School <onboarding@resend.dev>";
      result = await resend.emails.send(sendPayload);
    }
    if (result.error) {
      return res.status(500).json({ error: result.error.message || "Resend email send error" });
    }
    res.json({ success: true, id: result.data?.id, to });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to send direct email" });
  }
});
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: err?.message || "An internal server error occurred"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const REMINDER_CHECK_INTERVAL_MS = 60 * 1e3;
  setInterval(async () => {
    try {
      await processPendingLessonReminders();
    } catch (err) {
      console.error("[Resend Reminder Engine] Error in periodic reminder check:", err);
    }
  }, REMINDER_CHECK_INTERVAL_MS);
  setTimeout(() => {
    processPendingLessonReminders().catch((err) => {
      console.warn("[Resend Reminder Engine] Initial check warning:", err?.message || err);
    });
  }, 3e3);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`[Resend Reminder Engine] Initialized in timezone: ${process.env.SCHOOL_TIMEZONE || "Australia/Sydney"}`);
  });
}
if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NOW_REGION) {
  startServer().catch((err) => console.error("Server start error:", err));
}
var server_default = app;
export {
  app,
  server_default as default,
  requireInstructorOrAuth,
  sanitizeText
};
