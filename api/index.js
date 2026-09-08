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
  bookings: () => bookings,
  bookingsRelations: () => bookingsRelations,
  contactMessages: () => contactMessages,
  users: () => users,
  usersRelations: () => usersRelations
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  dateSlotIdx: index("booking_date_slot_idx").on(table.date, table.time),
  emailIdx: index("booking_email_idx").on(table.email),
  statusIdx: index("booking_status_idx").on(table.status)
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
var usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings)
}));
var bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.uid]
  })
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
  dbInstance = new Proxy({}, {
    get: (_, prop) => prop === "query" ? new Proxy({}, { get: () => noOp }) : async () => []
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
    createdAt: /* @__PURE__ */ new Date("2026-06-01T08:30:00Z"),
    updatedAt: /* @__PURE__ */ new Date("2026-06-01T08:30:00Z")
  },
  {
    id: 2,
    bookingRef: "WD-3190",
    userId: null,
    studentName: "Marcus Chen",
    phone: "0423 456 789",
    email: "m.chen@example.com",
    suburb: "Baldivis",
    pickupAddress: "28 Rivergums Blvd, Baldivis WA 6171",
    packageTitle: "2 Hours Lesson",
    packagePrice: 130,
    date: "2026-06-16",
    time: "02:00 PM",
    status: "Pending",
    notes: "Focus on parallel parking and roundabout navigation",
    paymentStatus: "unpaid",
    stripeSessionId: null,
    createdAt: /* @__PURE__ */ new Date("2026-06-02T11:15:00Z"),
    updatedAt: /* @__PURE__ */ new Date("2026-06-02T11:15:00Z")
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
  if (filter?.userId || filter?.email) {
    list = list.filter(
      (b) => filter.userId && b.userId === filter.userId || filter.email && b.email && b.email.toLowerCase() === filter.email.toLowerCase()
    );
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function getBookingByRef(bookingRef) {
  const cleanRef = bookingRef.trim().toUpperCase();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("bookings").select("*, students(*), instructors(*)").ilike("notes", `%${cleanRef}%`).limit(1);
      if (!error && data && data.length > 0) {
        return mapSupabaseRowToBooking(data[0]);
      }
    } catch {
    }
  }
  if (isSqlConfigured && db) {
    try {
      const result = await db.select().from(bookings).where(eq(bookings.bookingRef, bookingRef)).limit(1);
      if (result[0]) return result[0];
    } catch {
    }
  }
  const found = inMemoryBookings.find((b) => b.bookingRef && b.bookingRef.toUpperCase() === cleanRef);
  return found || null;
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
async function checkSlotBooked(date, time, excludeRef, customerEmail, customerPhone) {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();
  const cleanEmail = customerEmail?.trim().toLowerCase();
  const cleanPhone = customerPhone?.replace(/\D/g, "");
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1e3;
  const isConflict = (r) => {
    if (excludeRef && r.bookingRef && r.bookingRef.toUpperCase() === excludeRef.toUpperCase()) {
      return false;
    }
    if (r.date !== normalizedDate || r.time !== normalizedTime) {
      return false;
    }
    if (r.status === "Cancelled") {
      return false;
    }
    if (r.status === "Confirmed" || r.paymentStatus === "paid") {
      return true;
    }
    if (r.status === "Pending" || r.paymentStatus === "unpaid") {
      if (cleanEmail && r.email && r.email.toLowerCase() === cleanEmail) {
        return false;
      }
      if (cleanPhone && r.phone && r.phone.replace(/\D/g, "") === cleanPhone) {
        return false;
      }
      const createdAtMs = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (createdAtMs > 0 && now - createdAtMs > PENDING_TIMEOUT_MS) {
        return false;
      }
      return true;
    }
    return false;
  };
  const currentBookings = await getBookings();
  return currentBookings.some(isConflict);
}
async function createBooking(data) {
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
        stripeSessionId: data.stripeSessionId || null
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

// server.ts
dotenv.config();
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
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
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
  const isOwner = (cleanEmail === "wally@wallysdrivingschool.com.au" || cleanEmail === "wally") && cleanPass === "Wellard44#";
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
      items
    } = req.body;
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({
        error: "STRIPE_NOT_CONFIGURED",
        message: "Stripe API key is not yet set in Settings. Please add your STRIPE_SECRET_KEY to start receiving payments."
      });
    }
    const stripe = getStripe();
    const verified = computeVerifiedOrder(items || (serviceTitle ? [{ name: serviceTitle, unitPrice: totalAmount }] : []));
    const effectiveTotal = verified.totalAmount > 0 ? verified.totalAmount : Number(totalAmount || 65);
    const amountInCents = Math.round(effectiveTotal * 100);
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : `http://localhost:${PORT}`);
    const targetRef = bookingRef || `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: serviceTitle || verified.verifiedItems[0]?.name || "Driving Lesson",
              description: isPackage ? `${packageHours || 10}-Hour Driving Lesson Package with Fast Track Driving School` : `Professional Driving Lesson with ${instructorName || "Certified Instructor"}`,
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
        bookingDate: bookingDate || "",
        bookingTime: bookingTime || "",
        instructorName: instructorName || "",
        bookingRef: targetRef
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
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: "Stripe not configured" });
    }
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({
      id: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      metadata: session.metadata,
      paymentIntentId: session.payment_intent
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
  "2 hour driving lesson": 130,
  "car hire + 1 hour lesson": 200,
  "car hire + 2 hour lesson": 250,
  "10 hours package": 620,
  "5 hours package": 315,
  "srv-1hr": 65,
  "srv-2hr": 130,
  "srv-car-1hr": 200,
  "srv-car-2hr": 250,
  "pkg-10hr": 620,
  "pkg-5hr": 315,
  "10-hours-pack": 620,
  "5-hours-pack": 315,
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
      return res.status(400).json({
        error: "STRIPE_NOT_CONFIGURED",
        message: "Stripe secret key is not configured. Please add STRIPE_SECRET_KEY in Settings."
      });
    }
    const stripe = getStripe();
    let existingBooking = await getBookingByRef(targetRef);
    if (!existingBooking && (customerEmail || customerPhone) && bookingDate && bookingTime) {
      existingBooking = await getPendingBookingForCustomer(customerEmail, customerPhone, bookingDate, bookingTime);
      if (existingBooking) {
        targetRef = existingBooking.bookingRef;
      }
    }
    if (existingBooking) {
      try {
        await updateBookingByRef(targetRef, {
          packageTitle: verifiedItems[0]?.name || existingBooking.packageTitle,
          packagePrice: totalAmount,
          notes: sanitizeText(customerInfo?.notes || existingBooking.notes || "Awaiting Stripe payment"),
          studentName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`.trim() || existingBooking.studentName),
          phone: sanitizeText(customerInfo?.phone || existingBooking.phone),
          pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || existingBooking.pickupAddress || "")
        });
      } catch (upErr) {
        console.warn("[Stripe] Could not update existing pre-booking:", upErr);
      }
    } else if (customerInfo) {
      try {
        existingBooking = await createBooking({
          bookingRef: targetRef,
          userId: customerInfo.userId || null,
          studentName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`.trim() || "Student Driver"),
          phone: sanitizeText(customerInfo?.phone || ""),
          email: customerEmail || "",
          suburb: sanitizeText(customerInfo?.suburb || "Rockingham, WA"),
          pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || ""),
          packageTitle: verifiedItems[0]?.name || "Driving Lesson",
          packagePrice: totalAmount,
          date: bookingDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          time: bookingTime || "09:00 AM",
          status: "Pending",
          paymentStatus: "unpaid",
          notes: sanitizeText(customerInfo?.notes || "Awaiting Stripe payment"),
          stripeSessionId: null
        });
      } catch (dbErr) {
        console.warn("[Stripe] Could not create pre-booking record:", dbErr);
      }
    }
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
    try {
      await updateBookingByRef(targetRef, {
        stripeSessionId: paymentIntent.id
      });
    } catch (saveErr) {
      console.warn("[Stripe] Could not save stripeSessionId to booking:", saveErr);
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
    const { verifiedItems, totalAmount } = computeVerifiedOrder(
      items || (bookingData?.packageTitle ? [{ name: bookingData.packageTitle, unitPrice: bookingData.packagePrice }] : [])
    );
    const paidAmount = paymentIntent.amount / 100;
    const targetRef = bookingRef || paymentIntent.metadata?.bookingRef || bookingData?.bookingRef || bookingData?.ref;
    const paymentMethodName = "Card / Google Pay";
    let finalBooking = null;
    if (targetRef) {
      const existing = await getBookingByRef(targetRef);
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
    if (!finalBooking && (bookingData || paymentIntent.metadata)) {
      const meta = paymentIntent.metadata || {};
      const newRef = targetRef || `WD-${Math.floor(1e3 + Math.random() * 9e3)}`;
      finalBooking = await createBooking({
        bookingRef: newRef,
        userId: bookingData?.userId || null,
        studentName: sanitizeText(bookingData?.studentName || meta.customerName || "Student Driver"),
        phone: sanitizeText(bookingData?.phone || meta.customerPhone || ""),
        email: sanitizeText(bookingData?.email || meta.customerEmail || ""),
        suburb: sanitizeText(bookingData?.suburb || meta.suburb || "Rockingham, WA"),
        pickupAddress: sanitizeText(bookingData?.pickupAddress || meta.pickupAddress || null),
        packageTitle: bookingData?.packageTitle || meta.packageTitle || verifiedItems[0]?.name || "Driving Lesson",
        packagePrice: paidAmount > 0 ? paidAmount : totalAmount,
        date: bookingData?.date || meta.bookingDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        time: bookingData?.time || meta.bookingTime || "09:00 AM",
        status: "Confirmed",
        notes: `[Verified via Stripe: ${paymentIntentId}]`,
        paymentStatus: "paid",
        stripeSessionId: paymentIntentId
      });
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
  if (event.id && processedWebhookEventIds.has(event.id)) {
    console.log(`[Stripe Webhook] Duplicate event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }
  if (event.id) {
    processedWebhookEventIds.add(event.id);
    if (processedWebhookEventIds.size > 2e3) {
      const oldest = processedWebhookEventIds.values().next().value;
      if (oldest) processedWebhookEventIds.delete(oldest);
    }
  }
  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref);
          if (existing) {
            await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: pi.id
            });
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
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              paymentStatus: "failed",
              notes: existing.notes ? `${existing.notes} [Payment Failed: ${failureMsg}]` : `[Payment Failed: ${failureMsg}]`
            });
          }
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "cancelled"
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
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              paymentStatus: "processing",
              status: "Pending"
            });
          }
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object;
        const ref = session.metadata?.bookingRef;
        if (session.payment_status === "paid" && ref) {
          const existing = await getBookingByRef(ref);
          if (existing) {
            await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: session.id
            });
            console.log(`[Stripe Webhook] Checkout session completed for booking ${ref}`);
          }
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        const ref = session.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== "paid") {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "expired"
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
app.get("/api/bookings", optionalAuth, async (req, res) => {
  try {
    const email = req.query.email || void 0;
    const userId = req.user?.uid;
    const list = await getBookings({ email, userId });
    res.json(list);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch bookings" });
  }
});
app.get("/api/bookings/:ref", async (req, res) => {
  try {
    const ref = req.params.ref;
    const booking = await getBookingByRef(ref);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
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
      stripeSessionId
    } = req.body;
    if (!studentName || !phone || !email || !suburb || !packageTitle || !date || !time) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }
    const isSlotTaken = await checkSlotBooked(date, time, void 0, sanitizeText(email).toLowerCase(), sanitizeText(phone));
    if (isSlotTaken) {
      return res.status(409).json({
        error: "SLOT_ALREADY_BOOKED",
        message: `The ${time} slot on ${date} is already reserved by another student. Please select an alternate time.`
      });
    }
    const randomNum = Math.floor(1e3 + Math.random() * 9e3);
    const bookingRef = `WD-${randomNum}`;
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
      date: sanitizeText(date),
      time: sanitizeText(time),
      status: status || "Pending",
      notes: sanitizeText(notes) || null,
      paymentStatus: paymentStatus || "unpaid",
      stripeSessionId: stripeSessionId || null
    });
    res.status(201).json(newBooking);
  } catch (error) {
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
    const updated = await updateBooking(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: error.message || "Failed to update booking" });
  }
});
app.patch("/api/bookings/ref/:ref", optionalAuth, async (req, res) => {
  try {
    const ref = sanitizeText(req.params.ref);
    const updated = await updateBookingByRef(ref, req.body);
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
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
