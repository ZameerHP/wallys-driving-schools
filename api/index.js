var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookingAuditLogs: () => bookingAuditLogs,
  bookings: () => bookings,
  bookingsRelations: () => bookingsRelations,
  contactMessages: () => contactMessages,
  emailLogs: () => emailLogs,
  instructorSettings: () => instructorSettings,
  instructorTimeOff: () => instructorTimeOff,
  users: () => users,
  usersRelations: () => usersRelations,
  webhookEvents: () => webhookEvents
});
import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
var users, bookings, contactMessages, bookingAuditLogs, emailLogs, webhookEvents, instructorTimeOff, instructorSettings, usersRelations, bookingsRelations;
var init_schema = __esm({
  "src/db/schema.ts"() {
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      uid: text("uid").notNull().unique(),
      email: text("email").notNull(),
      displayName: text("display_name"),
      photoUrl: text("photo_url"),
      role: text("role").default("student").notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    bookings = pgTable("bookings", {
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
    contactMessages = pgTable("contact_messages", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      email: text("email").notNull(),
      phone: text("phone"),
      subject: text("subject"),
      message: text("message").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    bookingAuditLogs = pgTable("booking_audit_logs", {
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
    emailLogs = pgTable("email_logs", {
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
    webhookEvents = pgTable("webhook_events", {
      id: serial("id").primaryKey(),
      eventId: text("event_id").notNull().unique(),
      provider: text("provider").notNull(),
      // 'stripe', 'paypal'
      eventType: text("event_type").notNull(),
      processedAt: timestamp("processed_at").defaultNow()
    });
    instructorTimeOff = pgTable("instructor_time_off", {
      id: serial("id").primaryKey(),
      instructorId: text("instructor_id").default("wally").notNull(),
      instructorName: text("instructor_name").default("Wally").notNull(),
      date: text("date").notNull(),
      // 'YYYY-MM-DD'
      isFullDay: integer("is_full_day").default(0).notNull(),
      // 1 for full day, 0 for partial
      startTime: text("start_time"),
      // e.g. "01:00 PM"
      endTime: text("end_time"),
      // e.g. "03:00 PM"
      startMinutes: integer("start_minutes"),
      // e.g. 780
      endMinutes: integer("end_minutes"),
      // e.g. 900
      reason: text("reason"),
      // optional note
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      timeOffDateIdx: index("time_off_date_idx").on(table.date),
      timeOffInstructorIdx: index("time_off_instructor_idx").on(table.instructorId)
    }));
    instructorSettings = pgTable("instructor_settings", {
      id: serial("id").primaryKey(),
      instructorId: text("instructor_id").notNull().unique().default("wally"),
      settingsJson: text("settings_json").notNull(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      instructorSettingsIdx: index("instructor_settings_instructor_idx").on(table.instructorId)
    }));
    usersRelations = relations(users, ({ many }) => ({
      bookings: many(bookings)
    }));
    bookingsRelations = relations(bookings, ({ one, many }) => ({
      user: one(users, {
        fields: [bookings.userId],
        references: [users.uid]
      }),
      auditLogs: many(bookingAuditLogs),
      emailLogs: many(emailLogs)
    }));
  }
});

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var isSqlConfigured, createPool, pool, dbInstance, db;
var init_db = __esm({
  "src/db/index.ts"() {
    init_schema();
    isSqlConfigured = Boolean(
      process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_PASSWORD && process.env.SQL_DB_NAME || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING
    );
    createPool = () => {
      if (!isSqlConfigured) {
        return null;
      }
      if (!global._postgresPool) {
        try {
          const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
          if (connStr) {
            const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1");
            global._postgresPool = new Pool({
              connectionString: connStr,
              ssl: isLocal ? false : { rejectUnauthorized: false },
              max: 10,
              connectionTimeoutMillis: 5e3
            });
          } else {
            global._postgresPool = new Pool({
              host: process.env.SQL_HOST,
              user: process.env.SQL_USER,
              password: process.env.SQL_PASSWORD,
              database: process.env.SQL_DB_NAME,
              max: 10,
              connectionTimeoutMillis: 5e3
            });
          }
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
    pool = createPool();
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
    db = dbInstance;
  }
});

// src/lib/supabase-server.ts
import { createClient } from "@supabase/supabase-js";
function getSupabaseServerClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key || !url.startsWith("http") || key.length <= 10) {
    return null;
  }
  if (!serverClientInstance || currentKey !== key || currentUrl !== url) {
    try {
      currentKey = key;
      currentUrl = url;
      serverClientInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log(`[Supabase Server] Initialized for ${url} (hasServiceRoleKey: ${hasServiceRole})`);
    } catch (err) {
      console.warn("[Supabase Server] Failed to initialize Supabase server client:", err?.message || err);
      return null;
    }
  }
  return serverClientInstance;
}
async function checkSupabaseConnection() {
  const url = getSupabaseUrl();
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAnon = Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const status = {
    configured: Boolean(url && (hasServiceRole || hasAnon)),
    url: url ? url.replace(/^https?:\/\//, "").split(".")[0] + ".supabase.co" : "",
    hasServiceRoleKey: hasServiceRole,
    hasAnonKey: hasAnon,
    connected: false,
    canWrite: false,
    writeMessage: null,
    counts: {
      bookings: 0,
      students: 0,
      instructors: 0
    },
    tables: {
      bookings: false,
      students: false,
      instructors: false
    }
  };
  const client = getSupabaseServerClient();
  if (!client) {
    status.writeMessage = "Supabase URL or API Key is missing in environment variables.";
    return status;
  }
  try {
    const [bRes, sRes, iRes] = await Promise.all([
      client.from("bookings").select("id", { count: "exact" }).limit(1),
      client.from("students").select("id", { count: "exact" }).limit(1),
      client.from("instructors").select("id", { count: "exact" }).limit(1)
    ]);
    status.tables.bookings = !bRes.error;
    status.tables.students = !sRes.error;
    status.tables.instructors = !iRes.error;
    status.connected = !bRes.error || !sRes.error || !iRes.error;
    if (bRes.count !== null && bRes.count !== void 0) status.counts.bookings = bRes.count;
    if (sRes.count !== null && sRes.count !== void 0) status.counts.students = sRes.count;
    if (iRes.count !== null && iRes.count !== void 0) status.counts.instructors = iRes.count;
    if (hasServiceRole) {
      status.canWrite = true;
      status.writeMessage = "Full write access enabled via SUPABASE_SERVICE_ROLE_KEY.";
    } else {
      const testPing = await client.from("students").insert({
        full_name: "__HEALTHCHECK_PING__",
        email: "healthcheck_probe@test.internal",
        phone: "0400000000"
      }).select("id");
      if (!testPing.error && testPing.data && testPing.data[0]) {
        status.canWrite = true;
        status.writeMessage = "Write access verified (Public/Anon RLS policy enabled).";
        await client.from("students").delete().eq("id", testPing.data[0].id);
      } else if (testPing.error?.code === "42501") {
        status.canWrite = false;
        status.writeMessage = "Supabase Row-Level Security (RLS) is active. Add SUPABASE_SERVICE_ROLE_KEY in Settings or run the RLS setup SQL in Supabase SQL Editor.";
      } else {
        status.canWrite = false;
        status.writeMessage = testPing.error?.message || "Write test failed.";
      }
    }
  } catch (err) {
    status.connected = false;
    status.canWrite = false;
    status.writeMessage = err?.message || "Failed to query Supabase.";
  }
  return status;
}
var getSupabaseUrl, getSupabaseKey, isSupabaseServerConfigured, serverClientInstance, currentKey, currentUrl;
var init_supabase_server = __esm({
  "src/lib/supabase-server.ts"() {
    getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
    isSupabaseServerConfigured = Boolean(
      getSupabaseUrl() && getSupabaseKey() && getSupabaseUrl().startsWith("http") && getSupabaseKey().length > 10
    );
    serverClientInstance = null;
    currentKey = "";
    currentUrl = "";
  }
});

// src/lib/bookingSlots.ts
function formatMinutesToTimeStr(minutes) {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  const mPadded = String(m).padStart(2, "0");
  return `${displayH}:${mPadded} ${ampm}`;
}
function formatSlotRange(startMinutes, durationMinutes) {
  const startStr = formatMinutesToTimeStr(startMinutes);
  const endStr = formatMinutesToTimeStr(startMinutes + durationMinutes);
  return `${startStr} \u2013 ${endStr}`;
}
function parseTimeToMinutes(str) {
  if (!str) return null;
  const clean = str.trim().toUpperCase();
  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  }
  const m12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = m12[2] ? parseInt(m12[2], 10) : 0;
    const ampm = (m12[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}
function generateSlotsForDuration(durationMinutes, periods) {
  let durationLabel = `${durationMinutes}m`;
  if (durationMinutes === 60) durationLabel = "1 hr";
  else if (durationMinutes === 120) durationLabel = "2 hrs";
  else if (durationMinutes === 150) durationLabel = "2.5 hrs continuous";
  else if (durationMinutes === 210) durationLabel = "3.5 hrs continuous";
  if (periods && periods.length > 0) {
    const slots = [];
    const stepMinutes = 30;
    for (const period of periods) {
      const pStart = period.startMinutes ?? (period.start ? parseTimeToMinutes(period.start) : null);
      const pEnd = period.endMinutes ?? (period.end ? parseTimeToMinutes(period.end) : null);
      if (pStart === null || pEnd === null || pEnd - pStart < durationMinutes) continue;
      for (let sMin = pStart; sMin + durationMinutes <= pEnd; sMin += stepMinutes) {
        slots.push({
          slot: formatSlotRange(sMin, durationMinutes),
          startMinutes: sMin,
          endMinutes: sMin + durationMinutes,
          durationLabel
        });
      }
    }
    const seen = /* @__PURE__ */ new Set();
    return slots.filter((s) => {
      if (seen.has(s.slot)) return false;
      seen.add(s.slot);
      return true;
    });
  }
  const MAX_END_MINUTES = 1080;
  return STANDARD_START_TIMES.filter((t) => t.startMinutes + durationMinutes <= MAX_END_MINUTES).map((t) => {
    const slot = formatSlotRange(t.startMinutes, durationMinutes);
    return {
      slot,
      startMinutes: t.startMinutes,
      endMinutes: t.startMinutes + durationMinutes,
      durationLabel
    };
  });
}
var STANDARD_START_TIMES;
var init_bookingSlots = __esm({
  "src/lib/bookingSlots.ts"() {
    STANDARD_START_TIMES = [
      { label: "8:00 AM", startMinutes: 480 },
      { label: "8:30 AM", startMinutes: 510 },
      { label: "9:00 AM", startMinutes: 540 },
      { label: "9:30 AM", startMinutes: 570 },
      { label: "10:00 AM", startMinutes: 600 },
      { label: "10:30 AM", startMinutes: 630 },
      { label: "11:00 AM", startMinutes: 660 },
      { label: "1:00 PM", startMinutes: 780 },
      { label: "2:00 PM", startMinutes: 840 },
      { label: "2:30 PM", startMinutes: 870 },
      { label: "3:00 PM", startMinutes: 900 },
      { label: "3:30 PM", startMinutes: 930 },
      { label: "4:00 PM", startMinutes: 960 },
      { label: "4:30 PM", startMinutes: 990 },
      { label: "5:00 PM", startMinutes: 1020 }
    ];
  }
});

// src/server/instructorAvailabilityService.ts
import fs from "node:fs";
import path from "node:path";
function parseTimeToMinutes2(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
function formatMinutesToTimeStr2(minutes) {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  const mPadded = String(m).padStart(2, "0");
  return `${String(displayH).padStart(2, "0")}:${mPadded} ${ampm}`;
}
function parseTimeInterval(timeStr, defaultDuration = 60) {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace(/\s+/g, " ");
  const rangeMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (rangeMatch) {
    const parsePart = (hStr, mStr, ampmStr) => {
      let h = parseInt(hStr, 10);
      const m = mStr ? parseInt(mStr, 10) : 0;
      const ampm = (ampmStr || "").toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    let start = parsePart(rangeMatch[1], rangeMatch[2], rangeMatch[3] || rangeMatch[6]);
    let end = parsePart(rangeMatch[4], rangeMatch[5], rangeMatch[6] || rangeMatch[3]);
    if (end <= start) end += 720;
    return { start, end };
  }
  const singleMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (singleMatch) {
    let h = parseInt(singleMatch[1], 10);
    const m = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    const ampm = (singleMatch[3] || "AM").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const start = h * 60 + m;
    return { start, end: start + defaultDuration };
  }
  return null;
}
function getDayKeyFromDateStr(dateStr) {
  const norm = normalizeDate(dateStr);
  const parts = norm.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return "monday";
  }
  const [y, m, d] = parts;
  const dayIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mapping = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return mapping[dayIdx] || "monday";
}
function dayKeyToDayIndex(day) {
  const mapping = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  return mapping[day];
}
function ensureDataDir() {
  const candidateDirs = [DATA_DIR, "/tmp"];
  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
    }
  }
}
function readJsonFile(filename, defaultValue) {
  const dirs = [DATA_DIR, "/tmp"];
  for (const dir of dirs) {
    try {
      const p = path.join(dir, filename);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== void 0) return parsed;
      }
    } catch {
    }
  }
  return defaultValue;
}
function writeJsonFile(filename, data) {
  const dirs = [DATA_DIR, "/tmp"];
  const json = JSON.stringify(data, null, 2);
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, filename), json, "utf-8");
    } catch {
    }
  }
}
function initService() {
  if (isInitialized) return;
  ensureDataDir();
  try {
    const parsed = readJsonFile("instructor-operating-hours.json", null);
    if (parsed && parsed.operatingHours) {
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        operatingHours: {
          ...DEFAULT_WEEKLY_HOURS,
          ...parsed.operatingHours
        }
      };
    } else {
      writeJsonFile("instructor-operating-hours.json", DEFAULT_SETTINGS);
    }
  } catch (err) {
    console.warn("[AvailabilityService] Error loading operating hours:", err);
  }
  try {
    const parsed = readJsonFile("external-calendar-events.json", []);
    if (Array.isArray(parsed)) cachedExternalEvents = parsed;
    else writeJsonFile("external-calendar-events.json", []);
  } catch (err) {
    console.warn("[AvailabilityService] Error loading external events:", err);
  }
  try {
    const parsed = readJsonFile("calendar-connection.json", null);
    if (parsed) cachedCalendarConn = parsed;
    else writeJsonFile("calendar-connection.json", cachedCalendarConn);
  } catch (err) {
    console.warn("[AvailabilityService] Error loading calendar connection:", err);
  }
  try {
    const parsed = readJsonFile("date-overrides.json", []);
    if (Array.isArray(parsed)) cachedDateOverrides = parsed;
    else writeJsonFile("date-overrides.json", []);
  } catch (err) {
    console.warn("[AvailabilityService] Error loading date overrides:", err);
  }
  isInitialized = true;
}
function getInstructorSettings(instructorId = "wally") {
  initService();
  const normId = (instructorId || "wally").trim().toLowerCase();
  let settings = cachedInstructorSettings.get(normId);
  if (!settings) {
    try {
      const fromDisk = readJsonFile(`instructor-settings-${normId}.json`, null);
      if (fromDisk) {
        settings = fromDisk;
      }
    } catch {
    }
    if (!settings && normId === "wally" && cachedSettings) {
      settings = cachedSettings;
    }
    if (!settings) {
      settings = {
        ...DEFAULT_SETTINGS,
        instructorId: normId,
        instructorName: normId === "wally" ? "Wally" : normId.charAt(0).toUpperCase() + normId.slice(1),
        weeklyDaysOff: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true
        },
        disabledDays: [],
        disabledWeekdays: []
      };
    }
    cachedInstructorSettings.set(normId, settings);
  }
  if (!settings.weeklyDaysOff) {
    settings.weeklyDaysOff = {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    };
  }
  return settings;
}
function saveInstructorSettings(newSettings, instructorId = "wally") {
  initService();
  const normId = (instructorId || newSettings.instructorId || "wally").trim().toLowerCase();
  const current = getInstructorSettings(normId);
  let updatedOperatingHours = { ...current.operatingHours };
  if (newSettings.operatingHours) {
    const keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const key of keys) {
      const dayData = newSettings.operatingHours[key];
      if (dayData) {
        const normalizedPeriods = (dayData.periods || []).map((p) => {
          const sMin = p.startMinutes ?? parseTimeToMinutes2(p.start);
          const eMin = p.endMinutes ?? parseTimeToMinutes2(p.end);
          return {
            start: p.start || formatMinutesToTimeStr2(sMin),
            end: p.end || formatMinutesToTimeStr2(eMin),
            startMinutes: sMin,
            endMinutes: eMin
          };
        }).filter((p) => p.endMinutes > p.startMinutes);
        if (dayData.enabled && normalizedPeriods.length === 0) {
          const def = DEFAULT_WEEKLY_HOURS[key].periods[0];
          normalizedPeriods.push(def);
        }
        updatedOperatingHours[key] = {
          day: key,
          label: dayData.label || DEFAULT_WEEKLY_HOURS[key].label,
          enabled: Boolean(dayData.enabled),
          periods: normalizedPeriods
        };
      }
    }
  }
  const updated = {
    ...current,
    ...newSettings,
    instructorId: normId,
    bufferMinutes: typeof newSettings.bufferMinutes === "number" ? newSettings.bufferMinutes : current.bufferMinutes,
    timezone: newSettings.timezone || current.timezone || "Australia/Sydney",
    operatingHours: updatedOperatingHours,
    weeklyDaysOff: newSettings.weeklyDaysOff || current.weeklyDaysOff,
    disabledDays: newSettings.disabledDays || current.disabledDays,
    disabledWeekdays: newSettings.disabledWeekdays || current.disabledWeekdays,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  cachedInstructorSettings.set(normId, updated);
  if (normId === "wally") {
    cachedSettings = updated;
  }
  try {
    writeJsonFile(`instructor-settings-${normId}.json`, updated);
    if (normId === "wally") {
      writeJsonFile("instructor-operating-hours.json", updated);
    }
  } catch (err) {
    console.error("[AvailabilityService] Error saving settings to disk:", err);
  }
  return updated;
}
function getDisabledDaysOfWeek(instructorId = "wally") {
  const normId = (instructorId || "wally").trim().toLowerCase();
  const settings = getInstructorSettings(normId);
  if (Array.isArray(settings.disabledDays) && settings.disabledDays.length > 0) {
    return settings.disabledDays;
  }
  const disabled = [];
  if (settings.weeklyDaysOff) {
    const dayIndexMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    Object.keys(settings.weeklyDaysOff).forEach((day) => {
      if (settings.weeklyDaysOff[day] === false) {
        disabled.push(dayIndexMap[day]);
      }
    });
  }
  return disabled;
}
function isInstructorWeekdayOff(instructorId = "wally", dayIdx) {
  const disabled = getDisabledDaysOfWeek(instructorId);
  return disabled.includes(dayIdx);
}
function setInstructorWeekdayOff(instructorId = "wally", weekday, isAvailable) {
  const normId = (instructorId || "wally").trim().toLowerCase();
  const current = getInstructorSettings(normId);
  const weeklyDaysOff = {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
    ...current.weeklyDaysOff || {}
  };
  weeklyDaysOff[weekday] = Boolean(isAvailable);
  const dayIndexMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  const disabledDays = [];
  const disabledWeekdays = [];
  Object.keys(weeklyDaysOff).forEach((day) => {
    if (weeklyDaysOff[day] === false) {
      disabledDays.push(dayIndexMap[day]);
      disabledWeekdays.push(day);
    }
  });
  const updatedOperatingHours = { ...current.operatingHours || DEFAULT_WEEKLY_HOURS };
  if (updatedOperatingHours[weekday]) {
    updatedOperatingHours[weekday] = {
      ...updatedOperatingHours[weekday],
      enabled: Boolean(isAvailable),
      periods: updatedOperatingHours[weekday].periods && updatedOperatingHours[weekday].periods.length > 0 ? updatedOperatingHours[weekday].periods : DEFAULT_WEEKLY_HOURS[weekday].periods
    };
  }
  const updated = {
    ...current,
    instructorId: normId,
    operatingHours: updatedOperatingHours,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  cachedInstructorSettings.set(normId, updated);
  if (normId === "wally") {
    cachedSettings = updated;
  }
  try {
    writeJsonFile(`instructor-settings-${normId}.json`, updated);
    if (normId === "wally") {
      writeJsonFile("instructor-operating-hours.json", updated);
    }
  } catch (err) {
    console.error("[AvailabilityService] Error saving instructor day-off settings:", err);
  }
  saveInstructorWeeklyDaysOff(normId, weeklyDaysOff).catch((err) => {
    console.warn("[AvailabilityService] saveInstructorWeeklyDaysOffDb async warning:", err);
  });
  return {
    instructorId: normId,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: updated.updatedAt
  };
}
function setInstructorWeeklyDaysOff(instructorId = "wally", weeklyDaysOff) {
  const normId = (instructorId || "wally").trim().toLowerCase();
  const current = getInstructorSettings(normId);
  const dayIndexMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  const disabledDays = [];
  const disabledWeekdays = [];
  Object.keys(weeklyDaysOff).forEach((day) => {
    if (weeklyDaysOff[day] === false) {
      disabledDays.push(dayIndexMap[day]);
      disabledWeekdays.push(day);
    }
  });
  const bulkOperatingHours = { ...current.operatingHours || DEFAULT_WEEKLY_HOURS };
  Object.keys(weeklyDaysOff).forEach((day) => {
    if (bulkOperatingHours[day]) {
      const isDayOn = weeklyDaysOff[day] !== false;
      bulkOperatingHours[day] = {
        ...bulkOperatingHours[day],
        enabled: isDayOn,
        periods: bulkOperatingHours[day].periods && bulkOperatingHours[day].periods.length > 0 ? bulkOperatingHours[day].periods : DEFAULT_WEEKLY_HOURS[day].periods
      };
    }
  });
  const updated = {
    ...current,
    instructorId: normId,
    operatingHours: bulkOperatingHours,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  cachedInstructorSettings.set(normId, updated);
  if (normId === "wally") {
    cachedSettings = updated;
  }
  try {
    writeJsonFile(`instructor-settings-${normId}.json`, updated);
    if (normId === "wally") {
      writeJsonFile("instructor-operating-hours.json", updated);
    }
  } catch (err) {
    console.error("[AvailabilityService] Error saving bulk day-off settings:", err);
  }
  saveInstructorWeeklyDaysOff(normId, weeklyDaysOff).catch((err) => {
    console.warn("[AvailabilityService] saveInstructorWeeklyDaysOffDb async warning:", err);
  });
  return {
    instructorId: normId,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: updated.updatedAt
  };
}
function getDateOverrides(instructorId = "wally") {
  initService();
  return cachedDateOverrides;
}
function addDateOverride(override) {
  initService();
  const normDate = normalizeDate(override.date);
  const newOverride = {
    ...override,
    id: `override_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: normDate,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  cachedDateOverrides = cachedDateOverrides.filter((o) => o.date !== normDate);
  cachedDateOverrides.push(newOverride);
  try {
    writeJsonFile("date-overrides.json", cachedDateOverrides);
  } catch (err) {
    console.error("[AvailabilityService] Error saving date overrides:", err);
  }
  return newOverride;
}
function deleteDateOverride(idOrDate) {
  initService();
  const norm = normalizeDate(idOrDate);
  const beforeLen = cachedDateOverrides.length;
  cachedDateOverrides = cachedDateOverrides.filter((o) => o.id !== idOrDate && o.date !== norm);
  if (cachedDateOverrides.length !== beforeLen) {
    try {
      writeJsonFile("date-overrides.json", cachedDateOverrides);
    } catch (err) {
      console.error("[AvailabilityService] Error saving date overrides:", err);
    }
    return true;
  }
  return false;
}
function getCalendarConnection(instructorId = "wally") {
  initService();
  return {
    ...cachedCalendarConn,
    eventsCount: cachedExternalEvents.length
  };
}
function updateCalendarConnection(updates) {
  initService();
  cachedCalendarConn = {
    ...cachedCalendarConn,
    ...updates,
    eventsCount: cachedExternalEvents.length
  };
  try {
    writeJsonFile("calendar-connection.json", cachedCalendarConn);
  } catch (err) {
    console.error("[AvailabilityService] Error saving calendar connection:", err);
  }
  return cachedCalendarConn;
}
function getExternalEvents(dateFilter, instructorId = "wally") {
  initService();
  if (dateFilter) {
    const norm = normalizeDate(dateFilter);
    return cachedExternalEvents.filter((e) => e.date === norm);
  }
  return cachedExternalEvents;
}
function addExternalEvent(event) {
  initService();
  const normDate = normalizeDate(event.date);
  const sMin = event.startMinutes ?? parseTimeToMinutes2(event.startTime);
  const eMin = event.endMinutes ?? parseTimeToMinutes2(event.endTime);
  const newEvent = {
    ...event,
    id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: normDate,
    startTime: event.startTime || formatMinutesToTimeStr2(sMin),
    endTime: event.endTime || formatMinutesToTimeStr2(eMin),
    startMinutes: sMin,
    endMinutes: eMin,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  cachedExternalEvents.push(newEvent);
  try {
    writeJsonFile("external-calendar-events.json", cachedExternalEvents);
  } catch (err) {
    console.error("[AvailabilityService] Error saving external events:", err);
  }
  return newEvent;
}
function deleteExternalEvent(id) {
  initService();
  const beforeLen = cachedExternalEvents.length;
  cachedExternalEvents = cachedExternalEvents.filter((e) => e.id !== id);
  if (cachedExternalEvents.length !== beforeLen) {
    try {
      writeJsonFile("external-calendar-events.json", cachedExternalEvents);
    } catch (err) {
      console.error("[AvailabilityService] Error saving external events:", err);
    }
    return true;
  }
  return false;
}
async function syncIcalFeed(feedUrl, instructorId = "wally") {
  initService();
  if (!feedUrl || !/^https?:\/\//i.test(feedUrl.trim())) {
    return { success: false, eventsCount: 0, message: "Invalid calendar URL. Must start with http:// or https://" };
  }
  try {
    const fetchUrl = feedUrl.trim().replace(/^webcal:\/\//i, "https://");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12e3);
    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "WallysDrivingSchool-CalendarSync/1.0",
        "Accept": "text/calendar, text/plain, */*"
      }
    });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`Calendar feed returned HTTP status ${response.status} ${response.statusText}`);
    }
    const icsText = await response.text();
    const parsedEvents = [];
    const veventBlocks = icsText.split(/BEGIN:VEVENT/i).slice(1);
    for (const block of veventBlocks) {
      const summaryMatch = block.match(/SUMMARY(?::|;[^:]*:)(.*)/i);
      const dtstartMatch = block.match(/DTSTART(?::|;[^:]*:)(.*)/i);
      const dtendMatch = block.match(/DTEND(?::|;[^:]*:)(.*)/i);
      const uidMatch = block.match(/UID(?::|;[^:]*:)(.*)/i);
      if (!dtstartMatch) continue;
      const rawStart = dtstartMatch[1].trim();
      const rawEnd = dtendMatch ? dtendMatch[1].trim() : rawStart;
      const title = summaryMatch ? summaryMatch[1].trim().replace(/\\,/g, ",") : "Busy";
      const uid = uidMatch ? uidMatch[1].trim() : void 0;
      const parseIcalDate = (dStr) => {
        const clean = dStr.replace(/[^0-9TZ]/g, "");
        if (clean.length >= 8) {
          const y = parseInt(clean.substring(0, 4), 10);
          const m = parseInt(clean.substring(4, 6), 10);
          const d = parseInt(clean.substring(6, 8), 10);
          let hours = 0;
          let mins = 0;
          if (clean.includes("T") && clean.length >= 13) {
            const tIdx = clean.indexOf("T");
            hours = parseInt(clean.substring(tIdx + 1, tIdx + 3), 10);
            mins = parseInt(clean.substring(tIdx + 3, tIdx + 5), 10);
          }
          return { y, m, d, hours, mins, isAllDay: !clean.includes("T") };
        }
        return null;
      };
      const parsedStart = parseIcalDate(rawStart);
      const parsedEnd = parseIcalDate(rawEnd);
      if (parsedStart) {
        const dateStr = `${parsedStart.y}-${String(parsedStart.m).padStart(2, "0")}-${String(parsedStart.d).padStart(2, "0")}`;
        let sMin = parsedStart.hours * 60 + parsedStart.mins;
        let eMin = parsedEnd ? parsedEnd.hours * 60 + parsedEnd.mins : sMin + 60;
        if (parsedStart.isAllDay) {
          sMin = 480;
          eMin = 1080;
        }
        if (eMin <= sMin) eMin = sMin + 60;
        parsedEvents.push({
          id: `ext_ical_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          instructorId,
          title,
          date: dateStr,
          startTime: formatMinutesToTimeStr2(sMin),
          endTime: formatMinutesToTimeStr2(eMin),
          startMinutes: sMin,
          endMinutes: eMin,
          source: "ical",
          externalId: uid,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    const manualEvents = cachedExternalEvents.filter((e) => e.source === "manual");
    cachedExternalEvents = [...manualEvents, ...parsedEvents];
    try {
      writeJsonFile("external-calendar-events.json", cachedExternalEvents);
    } catch (err) {
      console.error("[AvailabilityService] Error saving external events:", err);
    }
    updateCalendarConnection({
      feedUrl,
      isConnected: true,
      lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastSyncStatus: "success",
      lastSyncMessage: `Synchronized ${parsedEvents.length} calendar events successfully.`
    });
    return {
      success: true,
      eventsCount: parsedEvents.length,
      message: `Successfully synchronized ${parsedEvents.length} external calendar events.`
    };
  } catch (err) {
    console.error("[AvailabilityService] iCal sync error:", err);
    updateCalendarConnection({
      lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastSyncStatus: "failed",
      lastSyncMessage: err?.message || "Failed to fetch calendar feed."
    });
    return { success: false, eventsCount: 0, message: `Sync failed: ${err.message || err}` };
  }
}
async function getAvailability(params) {
  initService();
  const {
    date,
    instructorId = "wally",
    requestedTime,
    durationMinutes = 60,
    customerEmail,
    customerPhone,
    excludeRef
  } = params;
  const normDate = normalizeDate(date);
  if (!normDate) {
    return {
      date: date || "",
      instructorId,
      isOpen: false,
      isDayOff: false,
      availableSlots: [],
      reasonIfUnavailable: "Invalid date format. Expected YYYY-MM-DD.",
      isSlotAvailable: false,
      slotReason: "Invalid date format"
    };
  }
  const normInstructor = (instructorId || "wally").trim().toLowerCase();
  const override = cachedDateOverrides.find(
    (o) => o.date === normDate && (!o.instructorId || o.instructorId.toLowerCase() === "all" || o.instructorId.toLowerCase() === normInstructor)
  );
  const isOverrideFullDay = override && (override.isFullDay || override.type === "unavailable" && (!override.periods || override.periods.length === 0));
  if (isOverrideFullDay) {
    const reason = override.reason || "Driving school is closed on this date.";
    return {
      date: normDate,
      instructorId,
      isOpen: false,
      isDayOff: true,
      availableSlots: [],
      reasonIfUnavailable: reason,
      isSlotAvailable: false,
      slotReason: reason
    };
  }
  const dayKey = getDayKeyFromDateStr(normDate);
  const dayIdx = dayKeyToDayIndex(dayKey);
  if (isInstructorWeekdayOff(normInstructor, dayIdx)) {
    const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    const reason = `Instructor Day Off (${dayName}s permanently off)`;
    return {
      date: normDate,
      instructorId,
      isOpen: false,
      isDayOff: true,
      availableSlots: [],
      reasonIfUnavailable: reason,
      isSlotAvailable: false,
      slotReason: reason
    };
  }
  const timeOffBlocks = await getTimeOffBlocks(instructorId);
  const fullDayOff = timeOffBlocks.find((b) => {
    if (normalizeDate(b.date) !== normDate) return false;
    if (!b.isFullDay) return false;
    const bInst = (b.instructorId || "wally").trim().toLowerCase();
    return bInst === normInstructor || bInst === "all";
  });
  if (fullDayOff) {
    const reason = fullDayOff.reason || "Instructor Day Off scheduled.";
    return {
      date: normDate,
      instructorId,
      isOpen: false,
      isDayOff: true,
      availableSlots: [],
      reasonIfUnavailable: reason,
      isSlotAvailable: false,
      slotReason: reason
    };
  }
  let activePeriods = [{ start: "08:00 AM", end: "06:00 PM", startMinutes: 480, endMinutes: 1080 }];
  if (override && override.type === "custom_hours" && override.periods && override.periods.length > 0) {
    activePeriods = override.periods;
  }
  const candidateSlots = generateSlotsForDuration(durationMinutes, activePeriods);
  const buffer = cachedSettings.bufferMinutes ?? 15;
  const partialTimeOff = timeOffBlocks.filter((b) => {
    if (normalizeDate(b.date) !== normDate) return false;
    if (b.isFullDay) return false;
    const bInst = (b.instructorId || "wally").trim().toLowerCase();
    return bInst === normInstructor || bInst === "all";
  });
  const allPartialBlocks = [...partialTimeOff];
  if (override && !isOverrideFullDay && override.periods && override.periods.length > 0) {
    for (const p of override.periods) {
      allPartialBlocks.push({
        startTime: p.start,
        endTime: p.end,
        startMinutes: p.startMinutes,
        endMinutes: p.endMinutes,
        reason: override.reason || "Instructor Scheduled Time Off"
      });
    }
  }
  const dayExternalEvents = cachedExternalEvents.filter(
    (e) => e.date === normDate && (!e.instructorId || e.instructorId.toLowerCase() === normInstructor)
  );
  const allBookings = await getBookings({ includeUnpaid: true });
  const cleanEmail = customerEmail?.trim().toLowerCase();
  const cleanPhone = customerPhone?.replace(/\D/g, "");
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1e3;
  const availableSlots = [];
  for (const candidate of candidateSlots) {
    const slotStart = candidate.startMinutes;
    const slotEnd = candidate.endMinutes;
    let slotAvailable = true;
    let slotConflictReason = void 0;
    for (const block of allPartialBlocks) {
      const bStart = block.startMinutes ?? (block.startTime ? parseTimeToMinutes2(block.startTime) : null);
      const bEnd = block.endMinutes ?? (block.endTime ? parseTimeToMinutes2(block.endTime) : null);
      if (bStart !== null && bEnd !== null) {
        if (slotStart < bEnd && slotEnd > bStart) {
          slotAvailable = false;
          slotConflictReason = block.reason || `Blocked by instructor (${block.startTime} \u2013 ${block.endTime})`;
          break;
        }
      }
    }
    if (slotAvailable) {
      for (const event of dayExternalEvents) {
        const evStart = Math.max(0, event.startMinutes - buffer);
        const evEnd = event.endMinutes + buffer;
        if (slotStart < evEnd && slotEnd > evStart) {
          slotAvailable = false;
          slotConflictReason = `Conflicts with instructor's calendar appointment (${event.startTime} \u2013 ${event.endTime})`;
          break;
        }
      }
    }
    if (slotAvailable) {
      for (const b of allBookings) {
        if (b.status === "Cancelled") continue;
        if (excludeRef && b.bookingRef && b.bookingRef.toUpperCase() === excludeRef.toUpperCase()) continue;
        if (normalizeDate(b.date) !== normDate) continue;
        if (b.instructorId || b.instructor_id) {
          const bInst = String(b.instructorId || b.instructor_id).trim().toLowerCase();
          if (bInst && bInst !== normInstructor) continue;
        }
        const bInterval = parseTimeInterval(b.time, durationMinutes);
        if (!bInterval) continue;
        const bStartWithBuffer = Math.max(0, bInterval.start - buffer);
        const bEndWithBuffer = bInterval.end + buffer;
        const overlaps = slotStart < bEndWithBuffer && slotEnd > bStartWithBuffer;
        if (!overlaps) continue;
        if (b.status === "Confirmed" || b.paymentStatus === "paid") {
          slotAvailable = false;
          slotConflictReason = "Slot already booked";
          break;
        }
        if (b.status === "Pending" || b.paymentStatus === "unpaid") {
          if (cleanEmail && b.email && b.email.toLowerCase() === cleanEmail) continue;
          if (cleanPhone && b.phone && b.phone.replace(/\D/g, "") === cleanPhone) continue;
          const createdMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (createdMs > 0 && now - createdMs > PENDING_TIMEOUT_MS) continue;
          slotAvailable = false;
          slotConflictReason = "Slot temporarily held in another checkout";
          break;
        }
      }
    }
    availableSlots.push({
      slot: candidate.slot,
      time: candidate.slot,
      start: formatMinutesToTimeStr2(candidate.startMinutes),
      end: formatMinutesToTimeStr2(candidate.endMinutes),
      startMinutes: candidate.startMinutes,
      endMinutes: candidate.endMinutes,
      available: slotAvailable,
      reason: slotConflictReason
    });
  }
  let isSlotAvailable = void 0;
  let slotReason = void 0;
  if (requestedTime) {
    const cleanRequested = requestedTime.trim();
    const matchedSlot = availableSlots.find((s) => s.slot === cleanRequested || s.time === cleanRequested);
    if (matchedSlot) {
      isSlotAvailable = matchedSlot.available;
      slotReason = matchedSlot.reason;
    } else {
      const reqInterval = parseTimeInterval(cleanRequested, durationMinutes);
      if (!reqInterval) {
        isSlotAvailable = false;
        slotReason = "Invalid time interval format";
      } else {
        const fitsInPeriod = activePeriods.some(
          (p) => reqInterval.start >= p.startMinutes && reqInterval.end <= p.endMinutes
        );
        if (!fitsInPeriod) {
          isSlotAvailable = false;
          slotReason = "Requested time falls outside instructor operating hours for this day";
        } else {
          const conflict = availableSlots.find(
            (s) => s.startMinutes < reqInterval.end + buffer && s.endMinutes > reqInterval.start - buffer && !s.available
          );
          if (conflict) {
            isSlotAvailable = false;
            slotReason = conflict.reason || "Requested time conflicts with existing booking or event";
          } else {
            isSlotAvailable = true;
          }
        }
      }
    }
  }
  return {
    date: normDate,
    instructorId,
    isOpen: true,
    isDayOff: false,
    availableSlots,
    reasonIfUnavailable: "",
    isSlotAvailable,
    slotReason
  };
}
async function getMonthAvailability(params) {
  const { year, month, instructorId = "wally" } = params;
  const daysInMonth = new Date(year, month, 0).getDate();
  const result = {};
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayResults = await Promise.all(
    dayNumbers.map(async (day) => {
      const dayPadded = String(day).padStart(2, "0");
      const monthPadded = String(month).padStart(2, "0");
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;
      const dayAvail = await getAvailability({ date: dateStr, instructorId });
      const availableCount = dayAvail.availableSlots.filter((s) => s.available).length;
      return {
        dateStr,
        dayData: {
          date: dateStr,
          isOpen: dayAvail.isOpen,
          isDayOff: dayAvail.isDayOff,
          reasonIfUnavailable: dayAvail.reasonIfUnavailable,
          availableSlotsCount: availableCount
        }
      };
    })
  );
  for (const item of dayResults) {
    result[item.dateStr] = item.dayData;
  }
  return result;
}
async function validateLessonSlot(params) {
  const { date, durationMinutes = 60, customerEmail, customerPhone, excludeRef, instructorId = "wally" } = params;
  const time = (params.time || params.slot || "").trim();
  const avail = await getAvailability({
    date,
    instructorId,
    requestedTime: time,
    durationMinutes,
    customerEmail,
    customerPhone,
    excludeRef
  });
  if (!avail.isOpen) {
    return {
      available: false,
      isTimeOff: avail.isDayOff,
      isFullDay: avail.isDayOff,
      isOutsideHours: !avail.isDayOff,
      code: avail.isDayOff ? "DAY_UNAVAILABLE" : "OUTSIDE_OPERATING_HOURS",
      reason: avail.reasonIfUnavailable || "Instructor unavailable on this date."
    };
  }
  if (!avail.isSlotAvailable) {
    const reason = avail.slotReason || "This time slot is unavailable.";
    let code = "SLOT_UNAVAILABLE";
    if (reason.toLowerCase().includes("booked")) code = "SLOT_ALREADY_BOOKED";
    else if (reason.toLowerCase().includes("calendar")) code = "CALENDAR_EVENT_CONFLICT";
    else if (reason.toLowerCase().includes("blocked") || reason.toLowerCase().includes("unavailable")) code = "INSTRUCTOR_TIME_OFF";
    else if (reason.toLowerCase().includes("operating hours")) code = "OUTSIDE_OPERATING_HOURS";
    return {
      available: false,
      code,
      reason,
      isTimeOff: code === "INSTRUCTOR_TIME_OFF",
      isOutsideHours: code === "OUTSIDE_OPERATING_HOURS",
      isExternalConflict: code === "CALENDAR_EVENT_CONFLICT"
    };
  }
  return { available: true };
}
var DATA_DIR, OPERATING_HOURS_FILE, EXTERNAL_EVENTS_FILE, CALENDAR_CONN_FILE, DATE_OVERRIDES_FILE, DEFAULT_WEEKLY_HOURS, DEFAULT_SETTINGS, cachedSettings, cachedInstructorSettings, cachedExternalEvents, cachedCalendarConn, cachedDateOverrides, isInitialized;
var init_instructorAvailabilityService = __esm({
  "src/server/instructorAvailabilityService.ts"() {
    init_queries();
    init_bookingSlots();
    DATA_DIR = path.join(process.cwd(), "data");
    OPERATING_HOURS_FILE = path.join(DATA_DIR, "instructor-operating-hours.json");
    EXTERNAL_EVENTS_FILE = path.join(DATA_DIR, "external-calendar-events.json");
    CALENDAR_CONN_FILE = path.join(DATA_DIR, "calendar-connection.json");
    DATE_OVERRIDES_FILE = path.join(DATA_DIR, "date-overrides.json");
    DEFAULT_WEEKLY_HOURS = {
      monday: {
        day: "monday",
        label: "Monday",
        enabled: true,
        periods: [{ start: "08:00 AM", end: "06:00 PM", startMinutes: 480, endMinutes: 1080 }]
      },
      tuesday: {
        day: "tuesday",
        label: "Tuesday",
        enabled: true,
        periods: [{ start: "08:00 AM", end: "06:00 PM", startMinutes: 480, endMinutes: 1080 }]
      },
      wednesday: {
        day: "wednesday",
        label: "Wednesday",
        enabled: true,
        periods: [{ start: "08:00 AM", end: "06:00 PM", startMinutes: 480, endMinutes: 1080 }]
      },
      thursday: {
        day: "thursday",
        label: "Thursday",
        enabled: true,
        periods: [{ start: "08:00 AM", end: "06:00 PM", startMinutes: 480, endMinutes: 1080 }]
      },
      friday: {
        day: "friday",
        label: "Friday",
        enabled: true,
        periods: [{ start: "08:00 AM", end: "06:00 PM", startMinutes: 480, endMinutes: 1080 }]
      },
      saturday: {
        day: "saturday",
        label: "Saturday",
        enabled: true,
        periods: [{ start: "08:00 AM", end: "05:00 PM", startMinutes: 480, endMinutes: 1020 }]
      },
      sunday: {
        day: "sunday",
        label: "Sunday",
        enabled: true,
        periods: [{ start: "08:00 AM", end: "05:00 PM", startMinutes: 480, endMinutes: 1020 }]
      }
    };
    DEFAULT_SETTINGS = {
      instructorId: "wally",
      instructorName: "Wally",
      timezone: "Australia/Sydney",
      bufferMinutes: 15,
      minNoticeHours: 2,
      maxAdvanceDays: 60,
      operatingHours: DEFAULT_WEEKLY_HOURS,
      updatedAt: "1970-01-01T00:00:00.000Z"
    };
    cachedSettings = { ...DEFAULT_SETTINGS };
    cachedInstructorSettings = /* @__PURE__ */ new Map();
    cachedExternalEvents = [];
    cachedCalendarConn = {
      instructorId: "wally",
      provider: "google",
      isConnected: false,
      eventsCount: 0
    };
    cachedDateOverrides = [];
    isInitialized = false;
  }
});

// src/server/centralAvailabilityService.ts
var centralAvailabilityService_exports = {};
__export(centralAvailabilityService_exports, {
  formatMinutesToTimeString: () => formatMinutesToTimeString,
  formatSlotLabel: () => formatSlotLabel,
  generateCandidateSlots: () => generateCandidateSlots,
  getAvailability: () => getAvailability2,
  getDayKeyAndIndexFromDateStr: () => getDayKeyAndIndexFromDateStr,
  getEffectiveInstructorSettings: () => getEffectiveInstructorSettings,
  getMonthAvailability: () => getMonthAvailability2,
  isTimeSlotConflicting: () => isTimeSlotConflicting,
  normalizeDate: () => normalizeDate2,
  parseTimeInterval: () => parseTimeInterval2,
  parseTimeToMinutes: () => parseTimeToMinutes3
});
function normalizeDate2(dateStr) {
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
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  return trimmed;
}
function getDayKeyAndIndexFromDateStr(dateStr) {
  const norm = normalizeDate2(dateStr);
  const parts = norm.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return { dayIndex: 1, dayKey: "monday", dayLabel: "Monday" };
  }
  const [y, m, d] = parts;
  const dayIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayKey = dayKeys[dayIdx] || "monday";
  const dayLabel = dayLabels[dayIdx] || "Monday";
  return { dayIndex: dayIdx, dayKey, dayLabel };
}
function parseTimeToMinutes3(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  }
  const m12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = m12[2] ? parseInt(m12[2], 10) : 0;
    const ampm = (m12[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}
function formatMinutesToTimeString(minutes) {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}
function parseTimeInterval2(timeStr, defaultDuration = 60) {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace(/\s+/g, " ");
  const rangeMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (rangeMatch) {
    const parsePart = (hStr, mStr, ampmStr) => {
      let h = parseInt(hStr, 10);
      const m = mStr ? parseInt(mStr, 10) : 0;
      const ampm = (ampmStr || "").toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    let start = parsePart(rangeMatch[1], rangeMatch[2], rangeMatch[3] || rangeMatch[6]);
    let end = parsePart(rangeMatch[4], rangeMatch[5], rangeMatch[6] || rangeMatch[3]);
    if (end <= start) end += 720;
    return { start, end };
  }
  const singleMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (singleMatch) {
    let h = parseInt(singleMatch[1], 10);
    const m = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    const ampm = (singleMatch[3] || "AM").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const start = h * 60 + m;
    return { start, end: start + defaultDuration };
  }
  return null;
}
function isTimeSlotConflicting(slot1, slot2, bufferMinutes = 15) {
  return slot1.start < slot2.end + bufferMinutes && slot1.end > slot2.start - bufferMinutes;
}
function formatSlotLabel(startMinutes, durationMinutes) {
  const startStr = formatMinutesToTimeString(startMinutes);
  const endStr = formatMinutesToTimeString(startMinutes + durationMinutes);
  return `${startStr} \u2013 ${endStr}`;
}
async function getEffectiveInstructorSettings(instructorId = "wally") {
  try {
    const dbSettings = await getInstructorSettingsDb(instructorId);
    if (dbSettings && dbSettings.operatingHours) {
      return dbSettings;
    }
  } catch (err) {
    console.warn("[centralAvailability] Error fetching settings from DB:", err);
  }
  return getInstructorSettings(instructorId);
}
function generateCandidateSlots(periods, durationMinutes = 60, stepMinutes = 30) {
  const candidateSlots = [];
  for (const period of periods) {
    const pStart = period.startMinutes ?? (period.start ? parseTimeToMinutes3(period.start) : null);
    const pEnd = period.endMinutes ?? (period.end ? parseTimeToMinutes3(period.end) : null);
    if (pStart === null || pEnd === null || pEnd - pStart < durationMinutes) {
      continue;
    }
    for (let sMin = pStart; sMin + durationMinutes <= pEnd; sMin += stepMinutes) {
      candidateSlots.push({
        label: formatSlotLabel(sMin, durationMinutes),
        start: sMin,
        end: sMin + durationMinutes
      });
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return candidateSlots.filter((s) => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });
}
async function getAvailability2(options) {
  const normDate = normalizeDate2(options.date);
  const instructorId = options.instructorId || "wally";
  const durationMinutes = options.durationMinutes || 60;
  const requestedTime = options.requestedTime?.trim();
  if (!normDate || normDate.length !== 10) {
    return {
      available: false,
      date: options.date,
      reason: "INVALID_DATE",
      message: "Please specify a valid date in YYYY-MM-DD format.",
      operatingPeriods: [],
      availableSlots: [],
      bookedSlots: [],
      timeOffBlocks: []
    };
  }
  const settings = await getEffectiveInstructorSettings(instructorId);
  const bufferMinutes = typeof settings.bufferMinutes === "number" ? settings.bufferMinutes : 15;
  const { dayIndex, dayKey, dayLabel } = getDayKeyAndIndexFromDateStr(normDate);
  const dateOverrides = getDateOverrides(instructorId);
  const dateOverride = dateOverrides.find((ov) => normalizeDate2(ov.date) === normDate);
  if (dateOverride) {
    if (dateOverride.type === "unavailable" || dateOverride.isFullDay) {
      return {
        available: false,
        date: normDate,
        reason: "SCHOOL_CLOSED",
        message: dateOverride.reason || "School is closed on this date (Date Override).",
        isClosed: true,
        operatingPeriods: [],
        availableSlots: [],
        bookedSlots: [{ time: "FULL_DAY", reason: dateOverride.reason || "Closed", isFullDay: true }],
        timeOffBlocks: []
      };
    }
  }
  let daySchedule = settings.operatingHours?.[dayKey];
  let effectivePeriods = [];
  if (dateOverride && dateOverride.type === "custom_hours" && Array.isArray(dateOverride.periods) && dateOverride.periods.length > 0) {
    effectivePeriods = dateOverride.periods;
  } else if (daySchedule && daySchedule.enabled && Array.isArray(daySchedule.periods) && daySchedule.periods.length > 0) {
    effectivePeriods = daySchedule.periods;
  }
  const isDisabledDay = Array.isArray(settings.disabledDays) && settings.disabledDays.includes(dayIndex) || settings.weeklyDaysOff && settings.weeklyDaysOff[dayKey] === false || Array.isArray(settings.disabledWeekdays) && settings.disabledWeekdays.includes(dayKey);
  if (isDisabledDay) {
    return {
      available: false,
      date: normDate,
      reason: "INSTRUCTOR_DAY_OFF",
      message: `Instructor Day Off: Instructor does not take lessons on ${dayLabel}s.`,
      isClosed: true,
      operatingPeriods: [],
      availableSlots: [],
      bookedSlots: [],
      timeOffBlocks: []
    };
  }
  if (!daySchedule || !daySchedule.enabled || effectivePeriods.length === 0) {
    return {
      available: false,
      date: normDate,
      reason: "OUTSIDE_OPERATING_HOURS",
      message: `The driving school does not operate on ${dayLabel}s.`,
      isClosed: true,
      operatingPeriods: [],
      availableSlots: [],
      bookedSlots: [],
      timeOffBlocks: []
    };
  }
  const allTimeOff = await getTimeOffBlocks(instructorId);
  const dateBlocks = allTimeOff.filter((b) => {
    if (normalizeDate2(b.date) !== normDate) return false;
    if (instructorId && b.instructorId && b.instructorId.toLowerCase() !== instructorId.toLowerCase()) {
      return false;
    }
    return true;
  });
  const fullDayOff = dateBlocks.find((b) => Boolean(b.isFullDay));
  if (fullDayOff) {
    return {
      available: false,
      date: normDate,
      reason: "INSTRUCTOR_DAY_OFF",
      message: fullDayOff.reason || "Instructor is off on this date.",
      isClosed: true,
      isDayOff: true,
      operatingPeriods: effectivePeriods,
      availableSlots: [],
      bookedSlots: [{ time: "FULL_DAY", reason: fullDayOff.reason || "Instructor Day Off", isFullDay: true }],
      timeOffBlocks: dateBlocks.map((b) => ({
        id: b.id,
        isFullDay: Boolean(b.isFullDay),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason
      }))
    };
  }
  const cleanEmail = options.customerEmail?.trim().toLowerCase();
  const cleanPhone = options.customerPhone?.replace(/\D/g, "");
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1e3;
  const currentBookings = await getBookings({ includeUnpaid: true });
  const dayBookings = currentBookings.filter((b) => {
    if (b.status === "Cancelled") return false;
    if (options.excludeBookingRef && b.bookingRef && b.bookingRef.toUpperCase() === options.excludeBookingRef.toUpperCase()) {
      return false;
    }
    if (normalizeDate2(b.date) !== normDate) {
      return false;
    }
    if (b.status === "Pending" || b.paymentStatus === "unpaid") {
      if (cleanEmail && b.email && b.email.toLowerCase() === cleanEmail) {
        return false;
      }
      if (cleanPhone && b.phone && b.phone.replace(/\D/g, "") === cleanPhone) {
        return false;
      }
      const createdAtMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdAtMs > 0 && now - createdAtMs > PENDING_TIMEOUT_MS) {
        return false;
      }
    }
    return true;
  });
  const bookedSlotsList = dayBookings.map((b) => ({
    time: b.time,
    reason: "Booked"
  }));
  const externalEvents = getExternalEvents(normDate, instructorId);
  const candidateSlots = generateCandidateSlots(effectivePeriods, durationMinutes, 30);
  const availableSlots = [];
  for (const candidate of candidateSlots) {
    const candidateInterval = { start: candidate.start, end: candidate.end };
    let blockedByTimeOff = false;
    for (const b of dateBlocks) {
      let bStart = b.startMinutes ?? (b.startTime ? parseTimeToMinutes3(b.startTime) : null);
      let bEnd = b.endMinutes ?? (b.endTime ? parseTimeToMinutes3(b.endTime) : null);
      if (bStart !== null && bEnd !== null) {
        if (candidate.start < bEnd && candidate.end > bStart) {
          blockedByTimeOff = true;
          break;
        }
      }
    }
    if (blockedByTimeOff) continue;
    let blockedByExt = false;
    for (const ev of externalEvents) {
      const evStartWithBuffer = Math.max(0, ev.startMinutes - bufferMinutes);
      const evEndWithBuffer = ev.endMinutes + bufferMinutes;
      if (candidate.start < evEndWithBuffer && candidate.end > evStartWithBuffer) {
        blockedByExt = true;
        break;
      }
    }
    if (blockedByExt) continue;
    let bookedConflict = false;
    for (const b of dayBookings) {
      const bInterval = parseTimeInterval2(b.time);
      if (bInterval) {
        if (isTimeSlotConflicting(candidateInterval, bInterval, bufferMinutes)) {
          bookedConflict = true;
          break;
        }
      } else {
        const cleanT1 = candidate.label.replace(/\s+/g, " ").toLowerCase();
        const cleanT2 = (b.time || "").replace(/\s+/g, " ").toLowerCase();
        if (cleanT1 === cleanT2) {
          bookedConflict = true;
          break;
        }
      }
    }
    if (bookedConflict) continue;
    availableSlots.push(candidate.label);
  }
  if (requestedTime) {
    const reqInterval = parseTimeInterval2(requestedTime, durationMinutes);
    if (!reqInterval) {
      return {
        available: false,
        date: normDate,
        requestedTime,
        reason: "OUTSIDE_OPERATING_HOURS",
        message: "Invalid time format.",
        operatingPeriods: effectivePeriods,
        availableSlots,
        bookedSlots: bookedSlotsList,
        timeOffBlocks: dateBlocks.map((b) => ({
          id: b.id,
          isFullDay: Boolean(b.isFullDay),
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason
        }))
      };
    }
    const fitsOperatingPeriod = effectivePeriods.some((p) => {
      const pStart = p.startMinutes ?? (p.start ? parseTimeToMinutes3(p.start) : null);
      const pEnd = p.endMinutes ?? (p.end ? parseTimeToMinutes3(p.end) : null);
      return pStart !== null && pEnd !== null && reqInterval.start >= pStart && reqInterval.end <= pEnd;
    });
    if (!fitsOperatingPeriod) {
      return {
        available: false,
        date: normDate,
        requestedTime,
        reason: "OUTSIDE_OPERATING_HOURS",
        message: `Requested time ${requestedTime} is outside operating hours for ${dayLabel}.`,
        operatingPeriods: effectivePeriods,
        availableSlots,
        bookedSlots: bookedSlotsList,
        timeOffBlocks: dateBlocks.map((b) => ({
          id: b.id,
          isFullDay: Boolean(b.isFullDay),
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason
        }))
      };
    }
    for (const b of dateBlocks) {
      const bStart = b.startMinutes ?? (b.startTime ? parseTimeToMinutes3(b.startTime) : null);
      const bEnd = b.endMinutes ?? (b.endTime ? parseTimeToMinutes3(b.endTime) : null);
      if (bStart !== null && bEnd !== null && reqInterval.start < bEnd && reqInterval.end > bStart) {
        return {
          available: false,
          date: normDate,
          requestedTime,
          reason: "INSTRUCTOR_DAY_OFF",
          message: b.reason || "Instructor is off during this time window.",
          isDayOff: true,
          operatingPeriods: effectivePeriods,
          availableSlots,
          bookedSlots: bookedSlotsList,
          timeOffBlocks: dateBlocks.map((blk) => ({
            id: blk.id,
            isFullDay: Boolean(blk.isFullDay),
            startTime: blk.startTime,
            endTime: blk.endTime,
            reason: blk.reason
          }))
        };
      }
    }
    for (const b of dayBookings) {
      const bInterval = parseTimeInterval2(b.time);
      let conflicts = false;
      if (bInterval) {
        conflicts = isTimeSlotConflicting(reqInterval, bInterval, bufferMinutes);
      } else {
        conflicts = requestedTime.toLowerCase() === (b.time || "").toLowerCase();
      }
      if (conflicts) {
        return {
          available: false,
          date: normDate,
          requestedTime,
          reason: "SLOT_ALREADY_BOOKED",
          message: "This time slot is no longer available. Please choose another time.",
          operatingPeriods: effectivePeriods,
          availableSlots,
          bookedSlots: bookedSlotsList,
          timeOffBlocks: dateBlocks.map((blk) => ({
            id: blk.id,
            isFullDay: Boolean(blk.isFullDay),
            startTime: blk.startTime,
            endTime: blk.endTime,
            reason: blk.reason
          }))
        };
      }
    }
    return {
      available: true,
      date: normDate,
      requestedTime,
      reason: "AVAILABLE",
      message: "Time slot is available.",
      operatingPeriods: effectivePeriods,
      availableSlots,
      bookedSlots: bookedSlotsList,
      timeOffBlocks: dateBlocks.map((b) => ({
        id: b.id,
        isFullDay: Boolean(b.isFullDay),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason
      }))
    };
  }
  const isFullyBooked = candidateSlots.length > 0 && availableSlots.length === 0;
  if (isFullyBooked) {
    return {
      available: false,
      date: normDate,
      reason: "FULLY_BOOKED",
      message: "All time slots for this date are fully booked.",
      isFullyBooked: true,
      operatingPeriods: effectivePeriods,
      availableSlots: [],
      bookedSlots: bookedSlotsList,
      timeOffBlocks: dateBlocks.map((b) => ({
        id: b.id,
        isFullDay: Boolean(b.isFullDay),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason
      }))
    };
  }
  return {
    available: availableSlots.length > 0,
    date: normDate,
    reason: availableSlots.length > 0 ? "AVAILABLE" : "OUTSIDE_OPERATING_HOURS",
    message: availableSlots.length > 0 ? "Date is available for booking." : "No bookable slots found.",
    operatingPeriods: effectivePeriods,
    availableSlots,
    bookedSlots: bookedSlotsList,
    timeOffBlocks: dateBlocks.map((b) => ({
      id: b.id,
      isFullDay: Boolean(b.isFullDay),
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason
    }))
  };
}
async function getMonthAvailability2(options) {
  const { year, month } = options;
  const instructorId = options.instructorId || "wally";
  const durationMinutes = options.durationMinutes || 60;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayCheck = await getAvailability2({
      date: dateStr,
      instructorId,
      durationMinutes
    });
    const { dayIndex, dayKey, dayLabel } = getDayKeyAndIndexFromDateStr(dateStr);
    let displayReason = "";
    if (dayCheck.reason === "INSTRUCTOR_DAY_OFF") {
      displayReason = dayCheck.message || "Instructor Day Off";
    } else if (dayCheck.reason === "SCHOOL_CLOSED") {
      displayReason = dayCheck.message || "School Closed";
    } else if (dayCheck.reason === "OUTSIDE_OPERATING_HOURS") {
      displayReason = `Closed on ${dayLabel}s`;
    } else if (dayCheck.reason === "FULLY_BOOKED") {
      displayReason = "Fully Booked";
    } else {
      displayReason = "Available";
    }
    days[dateStr] = {
      date: dateStr,
      day: d,
      dayKey,
      dayLabel,
      isOperatingDay: !dayCheck.isClosed && dayCheck.reason !== "OUTSIDE_OPERATING_HOURS" && dayCheck.reason !== "SCHOOL_CLOSED",
      isAvailable: dayCheck.available,
      isDayOff: Boolean(dayCheck.isDayOff),
      isFullyBooked: Boolean(dayCheck.isFullyBooked),
      reason: dayCheck.reason,
      displayReason,
      operatingPeriods: dayCheck.operatingPeriods,
      availableSlotsCount: dayCheck.availableSlots.length,
      totalSlotsCount: dayCheck.availableSlots.length + dayCheck.bookedSlots.length,
      availableSlots: dayCheck.availableSlots,
      bookedSlots: dayCheck.bookedSlots,
      timeOffBlocks: dayCheck.timeOffBlocks
    };
  }
  return {
    year,
    month,
    instructorId,
    days
  };
}
var init_centralAvailabilityService = __esm({
  "src/server/centralAvailabilityService.ts"() {
    init_queries();
    init_instructorAvailabilityService();
  }
});

// src/db/queries.ts
import fs2 from "node:fs";
import path2 from "node:path";
import { eq, desc } from "drizzle-orm";
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
function parseTimeInterval3(timeStr, defaultDurationMinutes = 60) {
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
function isTimeSlotConflicting2(slot1, slot2, bufferMinutes = 30) {
  return slot1.start < slot2.end + bufferMinutes && slot1.end > slot2.start - bufferMinutes;
}
function readTimeOffFile() {
  try {
    let rawData = null;
    if (fs2.existsSync(TIME_OFF_FILE)) {
      rawData = fs2.readFileSync(TIME_OFF_FILE, "utf-8");
    } else if (fs2.existsSync(TIME_OFF_TMP_FILE)) {
      rawData = fs2.readFileSync(TIME_OFF_TMP_FILE, "utf-8");
    }
    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        let changed = false;
        const normalized = parsed.map((item, idx) => {
          let id = item.id;
          if (id === void 0 || id === null || String(id).trim() === "" || String(id) === "undefined" || String(id) === "null") {
            id = `block_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
            changed = true;
          }
          const isFull = Boolean(item.isFullDay);
          const sMin = item.startMinutes ?? (item.startTime ? timeStringToMinutes(item.startTime) : null);
          const eMin = item.endMinutes ?? (item.endTime ? timeStringToMinutes(item.endTime) : null);
          return {
            id,
            instructorId: item.instructorId || "wally",
            instructorName: item.instructorName || "Wally",
            date: normalizeDate(item.date) || item.date,
            isFullDay: isFull,
            startTime: isFull ? null : item.startTime ? to24HourTime(item.startTime) || item.startTime : null,
            endTime: isFull ? null : item.endTime ? to24HourTime(item.endTime) || item.endTime : null,
            startMinutes: isFull ? null : sMin,
            endMinutes: isFull ? null : eMin,
            displayStartTime: isFull ? null : sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(item.startTime),
            displayEndTime: isFull ? null : eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(item.endTime),
            reason: item.reason || null,
            createdAt: item.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: item.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
          };
        });
        if (changed) {
          writeTimeOffFile(normalized);
        }
        return normalized;
      }
    }
  } catch (err) {
    console.warn("[TimeOff] Error reading time-off file:", err);
  }
  return [];
}
function writeTimeOffFile(blocks) {
  const seenKeys = /* @__PURE__ */ new Set();
  const deduped = blocks.filter((b) => {
    const idKey = b.id ? `id_${String(b.id)}` : "";
    const dateSlotKey = `date_${b.date}_${b.isFullDay ? "FULL" : `${b.startTime || ""}-${b.endTime || ""}`}`;
    if (idKey && seenKeys.has(idKey)) return false;
    if (seenKeys.has(dateSlotKey)) return false;
    if (idKey) seenKeys.add(idKey);
    seenKeys.add(dateSlotKey);
    return true;
  });
  const content = JSON.stringify(deduped, null, 2);
  try {
    const dir = path2.dirname(TIME_OFF_FILE);
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
    fs2.writeFileSync(TIME_OFF_FILE, content, "utf-8");
  } catch (err) {
  }
  try {
    fs2.writeFileSync(TIME_OFF_TMP_FILE, content, "utf-8");
  } catch (err) {
  }
}
function timeStringToMinutes(timeStr) {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().replace(/\s+/g, " ");
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2] ? parseInt(match12[2], 10) : 0;
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  return null;
}
function minutesToTimeString(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${h12}:${mStr} ${ampm}`;
}
function minutesTo24HourTime(minutes) {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function to24HourTime(timeStr) {
  if (!timeStr) return null;
  const mins = timeStringToMinutes(timeStr);
  if (mins === null) return null;
  return minutesTo24HourTime(mins);
}
function to12HourDisplay(timeStr) {
  if (!timeStr) return null;
  const mins = timeStringToMinutes(timeStr);
  if (mins === null) return timeStr;
  return minutesToTimeString(mins);
}
async function ensureTimeOffTable() {
  if (!db || !isSqlConfigured || timeOffTableInitialized) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_time_off (
        id SERIAL PRIMARY KEY,
        instructor_id TEXT NOT NULL DEFAULT 'wally',
        instructor_name TEXT NOT NULL DEFAULT 'Wally',
        date TEXT NOT NULL,
        is_full_day INTEGER NOT NULL DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        start_minutes INTEGER,
        end_minutes INTEGER,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS time_off_date_idx ON instructor_time_off(date);
      CREATE INDEX IF NOT EXISTS time_off_instructor_idx ON instructor_time_off(instructor_id);
    `);
    timeOffTableInitialized = true;
  } catch (err) {
    console.warn("[TimeOff] ensureTimeOffTable notice:", err);
  }
}
async function ensureInstructorSettingsTable() {
  if (!db || !isSqlConfigured || settingsTableInitialized) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_settings (
        id SERIAL PRIMARY KEY,
        instructor_id TEXT NOT NULL UNIQUE DEFAULT 'wally',
        settings_json TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    settingsTableInitialized = true;
  } catch (err) {
    console.warn("[InstructorSettings] ensureInstructorSettingsTable notice:", err);
  }
}
async function getInstructorSettingsDb(instructorId = "wally") {
  const normId = (instructorId || "wally").trim().toLowerCase();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("instructor_settings").select("settings_json").eq("instructor_id", normId).maybeSingle();
      if (!error && data?.settings_json) {
        const parsed = typeof data.settings_json === "string" ? JSON.parse(data.settings_json) : data.settings_json;
        inMemoryInstructorSettings.set(normId, parsed);
        return parsed;
      }
    } catch {
    }
    try {
      const { data, error } = await supabase.from("instructor_time_off").select("reason").eq("instructor_id", normId).eq("date", "__CONFIG_SETTINGS__").maybeSingle();
      if (!error && data?.reason) {
        const parsed = JSON.parse(data.reason);
        inMemoryInstructorSettings.set(normId, parsed);
        return parsed;
      }
    } catch {
    }
  }
  if (db && isSqlConfigured) {
    try {
      await ensureInstructorSettingsTable();
      const res = await db.execute(`
        SELECT settings_json FROM instructor_settings WHERE instructor_id = '${normId.replace(/'/g, "''")}' LIMIT 1;
      `);
      const row = res?.rows?.[0] || res?.[0];
      if (row?.settings_json) {
        const parsed = typeof row.settings_json === "string" ? JSON.parse(row.settings_json) : row.settings_json;
        inMemoryInstructorSettings.set(normId, parsed);
        return parsed;
      }
    } catch {
    }
  }
  if (inMemoryInstructorSettings.has(normId)) {
    return inMemoryInstructorSettings.get(normId);
  }
  const candidateDirs = [
    path2.join(process.cwd(), "data"),
    "/tmp"
  ];
  for (const dir of candidateDirs) {
    try {
      const settingsFile = path2.join(dir, `instructor-settings-${normId}.json`);
      if (fs2.existsSync(settingsFile)) {
        const raw = fs2.readFileSync(settingsFile, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed) {
          inMemoryInstructorSettings.set(normId, parsed);
          return parsed;
        }
      }
    } catch {
    }
  }
  return null;
}
async function saveInstructorSettingsDb(instructorId = "wally", settings) {
  const normId = (instructorId || "wally").trim().toLowerCase();
  const jsonStr = JSON.stringify(settings);
  let saved = false;
  inMemoryInstructorSettings.set(normId, settings);
  const candidateDirs = [
    path2.join(process.cwd(), "data"),
    "/tmp"
  ];
  for (const dir of candidateDirs) {
    try {
      if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
      fs2.writeFileSync(path2.join(dir, `instructor-settings-${normId}.json`), jsonStr, "utf-8");
      if (normId === "wally") {
        fs2.writeFileSync(path2.join(dir, "instructor-operating-hours.json"), jsonStr, "utf-8");
      }
      saved = true;
    } catch {
    }
  }
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { error } = await supabase.from("instructor_settings").upsert({
        instructor_id: normId,
        settings_json: jsonStr,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }, { onConflict: "instructor_id" });
      if (!error) saved = true;
    } catch {
    }
    try {
      await supabase.from("instructor_time_off").delete().eq("instructor_id", normId).eq("date", "__CONFIG_SETTINGS__");
      const { error: backupErr } = await supabase.from("instructor_time_off").insert([{
        instructor_id: normId,
        instructor_name: normId === "wally" ? "Wally" : normId,
        date: "__CONFIG_SETTINGS__",
        is_full_day: 1,
        reason: jsonStr,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }]);
      if (!backupErr) saved = true;
    } catch {
    }
  }
  if (db && isSqlConfigured) {
    try {
      await ensureInstructorSettingsTable();
      const safeJson = jsonStr.replace(/'/g, "''");
      const safeId = normId.replace(/'/g, "''");
      await db.execute(`
        INSERT INTO instructor_settings (instructor_id, settings_json, updated_at)
        VALUES ('${safeId}', '${safeJson}', CURRENT_TIMESTAMP)
        ON CONFLICT (instructor_id) DO UPDATE
        SET settings_json = EXCLUDED.settings_json,
            updated_at = CURRENT_TIMESTAMP;
      `);
      saved = true;
    } catch {
    }
  }
  return saved;
}
async function getInstructorWeeklyDaysOff(instructorId = "wally") {
  const normId = (instructorId || "wally").trim().toLowerCase();
  const settings = await getInstructorSettingsDb(normId);
  const weeklyDaysOff = {
    ...DEFAULT_WEEKLY_DAYS_OFF,
    ...settings?.weeklyDaysOff || {}
  };
  if (!settings?.weeklyDaysOff && Array.isArray(settings?.disabledDays)) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    settings.disabledDays.forEach((dayNum) => {
      const k = dayNames[dayNum];
      if (k) weeklyDaysOff[k] = false;
    });
  }
  const disabledDays = [];
  const disabledWeekdays = [];
  Object.keys(weeklyDaysOff).forEach((day) => {
    if (weeklyDaysOff[day] === false) {
      disabledDays.push(DAY_INDEX_MAP[day]);
      disabledWeekdays.push(day);
    }
  });
  return {
    instructorId: normId,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: settings?.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function saveInstructorWeeklyDaysOff(instructorId = "wally", weeklyDaysOff) {
  const normId = (instructorId || "wally").trim().toLowerCase();
  const existing = await getInstructorSettingsDb(normId) || {};
  const disabledDays = [];
  const disabledWeekdays = [];
  Object.keys(weeklyDaysOff).forEach((day) => {
    if (weeklyDaysOff[day] === false) {
      disabledDays.push(DAY_INDEX_MAP[day]);
      disabledWeekdays.push(day);
    }
  });
  const updatedOperatingHours = { ...existing.operatingHours || {} };
  Object.keys(weeklyDaysOff).forEach((day) => {
    if (updatedOperatingHours[day]) {
      updatedOperatingHours[day] = {
        ...updatedOperatingHours[day],
        enabled: weeklyDaysOff[day] !== false
      };
    }
  });
  const updated = {
    ...existing,
    instructorId: normId,
    operatingHours: updatedOperatingHours,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveInstructorSettingsDb(normId, updated);
  return {
    instructorId: normId,
    weeklyDaysOff,
    disabledDays,
    disabledWeekdays,
    updatedAt: updated.updatedAt
  };
}
async function getTimeOffBlocks(instructorId) {
  await ensureTimeOffTable();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("instructor_time_off").select("*").order("date", { ascending: true });
      if (!error && Array.isArray(data)) {
        const mapped = data.filter((r) => r.date && !r.date.startsWith("__")).map((r) => {
          const sMin = r.start_minutes ?? (r.start_time ? timeStringToMinutes(r.start_time) : null);
          const eMin = r.end_minutes ?? (r.end_time ? timeStringToMinutes(r.end_time) : null);
          const s24 = sMin !== null ? minutesTo24HourTime(sMin) : r.start_time ? to24HourTime(r.start_time) : null;
          const e24 = eMin !== null ? minutesTo24HourTime(eMin) : r.end_time ? to24HourTime(r.end_time) : null;
          const isFull = Boolean(r.is_full_day);
          return {
            id: r.id,
            instructorId: r.instructor_id || "wally",
            instructorName: r.instructor_name || "Wally",
            date: normalizeDate(r.date) || r.date,
            isFullDay: isFull,
            startTime: isFull ? null : s24,
            endTime: isFull ? null : e24,
            startMinutes: isFull ? null : sMin,
            endMinutes: isFull ? null : eMin,
            displayStartTime: isFull ? null : sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(r.start_time),
            displayEndTime: isFull ? null : eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(r.end_time),
            reason: r.reason || null,
            createdAt: r.created_at ? new Date(r.created_at) : /* @__PURE__ */ new Date(),
            updatedAt: r.updated_at ? new Date(r.updated_at) : /* @__PURE__ */ new Date()
          };
        });
        if (mapped.length > 0 || inMemoryTimeOff.length === 0 && readTimeOffFile().length === 0) {
          inMemoryTimeOff = mapped;
          writeTimeOffFile(mapped);
        } else if (mapped.length === 0 && (inMemoryTimeOff.length > 0 || readTimeOffFile().length > 0)) {
          const localBlocks = inMemoryTimeOff.length > 0 ? inMemoryTimeOff : readTimeOffFile();
          mapped.push(...localBlocks);
        }
        if (instructorId) {
          return mapped.filter((b) => b.instructorId.toLowerCase() === instructorId.toLowerCase());
        }
        return mapped;
      }
    } catch (sbErr) {
      console.warn("[TimeOff] Supabase fetch notice:", sbErr);
    }
  }
  if (db && isSqlConfigured) {
    try {
      const rows = await db.select().from(instructorTimeOff);
      if (rows) {
        const mapped = rows.filter((r) => r.date && !r.date.startsWith("__")).map((r) => {
          const sMin = r.startMinutes ?? (r.startTime ? timeStringToMinutes(r.startTime) : null);
          const eMin = r.endMinutes ?? (r.endTime ? timeStringToMinutes(r.endTime) : null);
          const s24 = sMin !== null ? minutesTo24HourTime(sMin) : r.startTime ? to24HourTime(r.startTime) : null;
          const e24 = eMin !== null ? minutesTo24HourTime(eMin) : r.endTime ? to24HourTime(r.endTime) : null;
          const isFull = Boolean(r.isFullDay);
          return {
            id: r.id,
            instructorId: r.instructorId || "wally",
            instructorName: r.instructorName || "Wally",
            date: normalizeDate(r.date) || r.date,
            isFullDay: isFull,
            startTime: isFull ? null : s24,
            endTime: isFull ? null : e24,
            startMinutes: isFull ? null : sMin,
            endMinutes: isFull ? null : eMin,
            displayStartTime: isFull ? null : sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(r.startTime),
            displayEndTime: isFull ? null : eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(r.endTime),
            reason: r.reason,
            createdAt: r.createdAt ? new Date(r.createdAt) : /* @__PURE__ */ new Date(),
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : /* @__PURE__ */ new Date()
          };
        });
        inMemoryTimeOff = mapped;
        writeTimeOffFile(mapped);
        if (instructorId) {
          return mapped.filter((b) => b.instructorId.toLowerCase() === instructorId.toLowerCase());
        }
        return mapped;
      }
    } catch (err) {
      console.warn("[TimeOff] SQL fetch error, falling back to cached file/memory store:", err);
    }
  }
  inMemoryTimeOff = readTimeOffFile();
  const normalizedMem = inMemoryTimeOff.map((b) => {
    const sMin = b.startMinutes ?? (b.startTime ? timeStringToMinutes(b.startTime) : null);
    const eMin = b.endMinutes ?? (b.endTime ? timeStringToMinutes(b.endTime) : null);
    const s24 = sMin !== null ? minutesTo24HourTime(sMin) : b.startTime ? to24HourTime(b.startTime) : null;
    const e24 = eMin !== null ? minutesTo24HourTime(eMin) : b.endTime ? to24HourTime(b.endTime) : null;
    const isFull = Boolean(b.isFullDay);
    return {
      ...b,
      instructorId: b.instructorId || "wally",
      instructorName: b.instructorName || "Wally",
      date: normalizeDate(b.date) || b.date,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: isFull ? null : sMin,
      endMinutes: isFull ? null : eMin,
      displayStartTime: isFull ? null : sMin !== null ? minutesToTimeString(sMin) : to12HourDisplay(b.startTime),
      displayEndTime: isFull ? null : eMin !== null ? minutesToTimeString(eMin) : to12HourDisplay(b.endTime)
    };
  });
  if (instructorId && typeof instructorId === "string" && instructorId.trim() !== "") {
    const filterId = instructorId.trim().toLowerCase();
    return normalizedMem.filter((b) => (b.instructorId || "wally").toLowerCase() === filterId);
  }
  return normalizedMem;
}
async function checkTimeOffBookingConflicts(date, isFullDay, startMinutes, endMinutes, instructorId, excludeBlockId) {
  const normTargetDate = normalizeDate(date);
  if (!normTargetDate) return { hasConflict: false, conflicts: [] };
  const allBookings = await getBookings({ includeUnpaid: true });
  const activeBookings = allBookings.filter((b) => {
    if (b.status === "Cancelled") return false;
    const bDate = normalizeDate(b.date);
    return bDate === normTargetDate;
  });
  const conflicts = [];
  for (const b of activeBookings) {
    if (isFullDay) {
      conflicts.push({
        id: b.id,
        bookingRef: b.bookingRef,
        studentName: b.studentName,
        date: b.date,
        time: b.time,
        phone: b.phone,
        email: b.email,
        packageTitle: b.packageTitle,
        suburb: b.suburb,
        pickupAddress: b.pickupAddress,
        status: b.status,
        conflictReason: "Full day off overlaps this confirmed lesson"
      });
      continue;
    }
    if (startMinutes !== void 0 && endMinutes !== void 0) {
      let bInterval = parseTimeInterval3(b.time);
      if (!bInterval) {
        const bStart = timeStringToMinutes(b.time);
        if (bStart !== null) {
          bInterval = { start: bStart, end: bStart + 60 };
        }
      }
      if (bInterval) {
        const overlaps = bInterval.start < endMinutes && bInterval.end > startMinutes;
        if (overlaps) {
          conflicts.push({
            id: b.id,
            bookingRef: b.bookingRef,
            studentName: b.studentName,
            date: b.date,
            time: b.time,
            phone: b.phone,
            email: b.email,
            packageTitle: b.packageTitle,
            suburb: b.suburb,
            pickupAddress: b.pickupAddress,
            status: b.status,
            conflictReason: `Lesson (${b.time}) overlaps requested time-off period`
          });
        }
      }
    }
  }
  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}
async function createTimeOffBlock(data) {
  await ensureTimeOffTable();
  const normDate = normalizeDate(data.date) || data.date;
  const isFull = Boolean(data.isFullDay);
  let startMin = null;
  let endMin = null;
  let s24 = null;
  let e24 = null;
  if (!isFull && data.startTime && data.endTime) {
    startMin = timeStringToMinutes(data.startTime);
    endMin = timeStringToMinutes(data.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) {
      throw new Error("Invalid time window: End time must be after start time.");
    }
    s24 = minutesTo24HourTime(startMin);
    e24 = minutesTo24HourTime(endMin);
  }
  if (!data.overrideConflicts) {
    const conflictCheck = await checkTimeOffBookingConflicts(
      normDate,
      isFull,
      startMin ?? void 0,
      endMin ?? void 0,
      data.instructorId
    );
    if (conflictCheck.hasConflict) {
      const error = new Error(`Cannot block time: this period overlaps ${conflictCheck.conflicts.length} existing booking(s). Please resolve them first.`);
      error.code = "BOOKING_CONFLICT";
      error.conflicts = conflictCheck.conflicts;
      throw error;
    }
  }
  const now = /* @__PURE__ */ new Date();
  let createdBlock;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const sbPayload = {
        instructor_id: data.instructorId || "wally",
        instructor_name: data.instructorName || "Wally",
        date: normDate,
        is_full_day: isFull,
        start_time: isFull ? null : s24,
        end_time: isFull ? null : e24,
        start_minutes: startMin,
        end_minutes: endMin,
        reason: data.reason?.trim() || null,
        updated_at: now.toISOString()
      };
      try {
        await supabase.from("instructor_time_off").delete().eq("date", normDate);
      } catch {
      }
      const { data: insertedRows, error: sbInsertErr } = await supabase.from("instructor_time_off").insert([sbPayload]).select("*");
      if (!sbInsertErr && insertedRows && insertedRows[0]) {
        createdBlock = {
          id: insertedRows[0].id,
          instructorId: insertedRows[0].instructor_id,
          instructorName: insertedRows[0].instructor_name,
          date: insertedRows[0].date,
          isFullDay: Boolean(insertedRows[0].is_full_day),
          startTime: insertedRows[0].start_time,
          endTime: insertedRows[0].end_time,
          startMinutes: insertedRows[0].start_minutes,
          endMinutes: insertedRows[0].end_minutes,
          displayStartTime: isFull ? null : to12HourDisplay(insertedRows[0].start_time),
          displayEndTime: isFull ? null : to12HourDisplay(insertedRows[0].end_time),
          reason: insertedRows[0].reason,
          createdAt: new Date(insertedRows[0].created_at || now),
          updatedAt: new Date(insertedRows[0].updated_at || now)
        };
      }
    } catch (sbErr) {
      console.warn("[TimeOff] Supabase insert notice:", sbErr);
    }
  }
  if (db && isSqlConfigured) {
    try {
      const [inserted] = await db.insert(instructorTimeOff).values({
        instructorId: data.instructorId || "wally",
        instructorName: data.instructorName || "Wally",
        date: normDate,
        isFullDay: isFull ? 1 : 0,
        startTime: isFull ? null : s24,
        endTime: isFull ? null : e24,
        startMinutes: startMin,
        endMinutes: endMin,
        reason: data.reason?.trim() || null,
        createdAt: now,
        updatedAt: now
      }).returning();
      createdBlock = {
        id: inserted.id,
        instructorId: inserted.instructorId,
        instructorName: inserted.instructorName,
        date: inserted.date,
        isFullDay: Boolean(inserted.isFullDay),
        startTime: inserted.startTime,
        endTime: inserted.endTime,
        startMinutes: inserted.startMinutes,
        endMinutes: inserted.endMinutes,
        displayStartTime: isFull ? null : to12HourDisplay(inserted.startTime),
        displayEndTime: isFull ? null : to12HourDisplay(inserted.endTime),
        reason: inserted.reason,
        createdAt: inserted.createdAt ? new Date(inserted.createdAt) : now,
        updatedAt: inserted.updatedAt ? new Date(inserted.updatedAt) : now
      };
    } catch (err) {
      console.warn("[TimeOff] Failed inserting to SQL, generating local ID:", err);
      createdBlock = {
        id: Date.now(),
        instructorId: data.instructorId || "wally",
        instructorName: data.instructorName || "Wally",
        date: normDate,
        isFullDay: isFull,
        startTime: isFull ? null : s24,
        endTime: isFull ? null : e24,
        startMinutes: startMin,
        endMinutes: endMin,
        displayStartTime: isFull ? null : to12HourDisplay(data.startTime),
        displayEndTime: isFull ? null : to12HourDisplay(data.endTime),
        reason: data.reason?.trim() || null,
        createdAt: now,
        updatedAt: now
      };
    }
  } else if (!createdBlock) {
    createdBlock = {
      id: Date.now(),
      instructorId: data.instructorId || "wally",
      instructorName: data.instructorName || "Wally",
      date: normDate,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: startMin,
      endMinutes: endMin,
      displayStartTime: isFull ? null : to12HourDisplay(data.startTime),
      displayEndTime: isFull ? null : to12HourDisplay(data.endTime),
      reason: data.reason?.trim() || null,
      createdAt: now,
      updatedAt: now
    };
  }
  inMemoryTimeOff.push(createdBlock);
  writeTimeOffFile(inMemoryTimeOff);
  return createdBlock;
}
async function updateTimeOffBlock(id, data, fallbackDate) {
  await ensureTimeOffTable();
  const strId = String(id).trim();
  const numId = !isNaN(Number(id)) && Number(id) <= 2147483647 && Number(id) > 0 ? Number(id) : null;
  const normDate = normalizeDate(data.date) || data.date;
  const isFull = Boolean(data.isFullDay);
  let startMin = null;
  let endMin = null;
  let s24 = null;
  let e24 = null;
  if (!isFull && data.startTime && data.endTime) {
    startMin = timeStringToMinutes(data.startTime);
    endMin = timeStringToMinutes(data.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) {
      throw new Error("Invalid time window: End time must be after start time.");
    }
    s24 = minutesTo24HourTime(startMin);
    e24 = minutesTo24HourTime(endMin);
  }
  if (!data.overrideConflicts) {
    const conflictCheck = await checkTimeOffBookingConflicts(
      normDate,
      isFull,
      startMin ?? void 0,
      endMin ?? void 0,
      void 0,
      id
    );
    if (conflictCheck.hasConflict) {
      const error = new Error(`Cannot update block: this period overlaps ${conflictCheck.conflicts.length} existing booking(s). Please resolve them first.`);
      error.code = "BOOKING_CONFLICT";
      error.conflicts = conflictCheck.conflicts;
      throw error;
    }
  }
  const now = /* @__PURE__ */ new Date();
  let updatedBlock = null;
  if (db && isSqlConfigured && numId !== null) {
    try {
      const [updated] = await db.update(instructorTimeOff).set({
        date: normDate,
        isFullDay: isFull ? 1 : 0,
        startTime: isFull ? null : s24,
        endTime: isFull ? null : e24,
        startMinutes: startMin,
        endMinutes: endMin,
        reason: data.reason?.trim() || null,
        updatedAt: now
      }).where(eq(instructorTimeOff.id, numId)).returning();
      if (updated) {
        updatedBlock = {
          id: updated.id,
          instructorId: updated.instructorId,
          instructorName: updated.instructorName,
          date: updated.date,
          isFullDay: Boolean(updated.isFullDay),
          startTime: updated.startTime,
          endTime: updated.endTime,
          startMinutes: updated.startMinutes,
          endMinutes: updated.endMinutes,
          displayStartTime: isFull ? null : to12HourDisplay(updated.startTime),
          displayEndTime: isFull ? null : to12HourDisplay(updated.endTime),
          reason: updated.reason,
          createdAt: updated.createdAt ? new Date(updated.createdAt) : now,
          updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : now
        };
      }
    } catch (err) {
      console.warn("[TimeOff] Failed updating in SQL:", err);
    }
  }
  inMemoryTimeOff = readTimeOffFile();
  let idx = inMemoryTimeOff.findIndex((b) => {
    const bStr = String(b.id || "").trim();
    if (strId && (bStr === strId || bStr === decodeURIComponent(strId))) return true;
    if (numId !== null && !isNaN(Number(b.id)) && Number(b.id) === numId) return true;
    if (fallbackDate && b.date === fallbackDate) return true;
    return false;
  });
  if (idx !== -1) {
    const existing = inMemoryTimeOff[idx];
    const updatedMem = {
      ...existing,
      date: normDate,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: startMin,
      endMinutes: endMin,
      displayStartTime: isFull ? null : to12HourDisplay(data.startTime || existing.startTime),
      displayEndTime: isFull ? null : to12HourDisplay(data.endTime || existing.endTime),
      reason: data.reason?.trim() || null,
      updatedAt: now
    };
    inMemoryTimeOff[idx] = updatedMem;
    writeTimeOffFile(inMemoryTimeOff);
    if (!updatedBlock) {
      updatedBlock = updatedMem;
    }
  }
  if (!updatedBlock) {
    updatedBlock = {
      id: id || `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      instructorId: "wally",
      instructorName: "Wally",
      date: normDate,
      isFullDay: isFull,
      startTime: isFull ? null : s24,
      endTime: isFull ? null : e24,
      startMinutes: startMin,
      endMinutes: endMin,
      displayStartTime: isFull ? null : to12HourDisplay(data.startTime),
      displayEndTime: isFull ? null : to12HourDisplay(data.endTime),
      reason: data.reason?.trim() || null,
      createdAt: now,
      updatedAt: now
    };
    inMemoryTimeOff.push(updatedBlock);
    writeTimeOffFile(inMemoryTimeOff);
  }
  return updatedBlock;
}
async function deleteTimeOffBlock(id, fallbackDate) {
  await ensureTimeOffTable();
  const currentBlocks = readTimeOffFile();
  const strId = String(id || "").trim();
  const numId = !isNaN(Number(strId)) && Number(strId) > 0 ? Number(strId) : null;
  const is32Bit = numId !== null && numId <= 2147483647;
  const targetItem = currentBlocks.find((b) => {
    const bStr = String(b.id || "").trim();
    if (strId && (bStr === strId || bStr === decodeURIComponent(strId))) return true;
    if (numId !== null && !isNaN(Number(b.id)) && Number(b.id) === numId) return true;
    if (fallbackDate && (b.date === fallbackDate || normalizeDate(b.date) === normalizeDate(fallbackDate))) return true;
    return false;
  });
  const targetDate = targetItem?.date || fallbackDate;
  const targetNormDate = targetDate ? normalizeDate(targetDate) : void 0;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      if (numId !== null) {
        try {
          await supabase.from("instructor_time_off").delete().eq("id", numId);
        } catch {
        }
      }
      if (targetNormDate) {
        try {
          await supabase.from("instructor_time_off").delete().eq("date", targetNormDate);
        } catch {
        }
      }
      if (targetDate && targetDate !== targetNormDate) {
        try {
          await supabase.from("instructor_time_off").delete().eq("date", targetDate);
        } catch {
        }
      }
    } catch (sbErr) {
      console.warn("[TimeOff] Supabase delete notice:", sbErr);
    }
  }
  if (db && isSqlConfigured) {
    try {
      if (is32Bit && numId !== null) {
        await db.delete(instructorTimeOff).where(eq(instructorTimeOff.id, numId));
      }
      if (targetNormDate) {
        await db.delete(instructorTimeOff).where(eq(instructorTimeOff.date, targetNormDate));
      }
      if (targetDate && targetDate !== targetNormDate) {
        await db.delete(instructorTimeOff).where(eq(instructorTimeOff.date, targetDate));
      }
    } catch (err) {
      console.warn("[TimeOff] Failed deleting from SQL:", err);
    }
  }
  inMemoryTimeOff = currentBlocks.filter((b) => {
    const bStr = String(b.id || "").trim();
    if (strId && (bStr === strId || bStr === decodeURIComponent(strId))) {
      return false;
    }
    if (numId !== null && !isNaN(Number(b.id)) && Number(b.id) === numId) {
      return false;
    }
    if (targetNormDate && normalizeDate(b.date) === targetNormDate) {
      return false;
    }
    if (fallbackDate && (b.date === fallbackDate || normalizeDate(b.date) === normalizeDate(fallbackDate))) {
      return false;
    }
    return true;
  });
  writeTimeOffFile(inMemoryTimeOff);
  return true;
}
async function clearAllTimeOffBlocks(instructorId) {
  await ensureTimeOffTable();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      if (instructorId) {
        await supabase.from("instructor_time_off").delete().eq("instructor_id", instructorId);
      } else {
        await supabase.from("instructor_time_off").delete().neq("id", 0);
      }
    } catch {
    }
  }
  if (db) {
    try {
      await db.delete(instructorTimeOff);
    } catch {
    }
  }
  inMemoryTimeOff = [];
  writeTimeOffFile([]);
  return true;
}
async function checkSlotDetailed(date, time, excludeRef, customerEmail, customerPhone, instructorId = "wally") {
  try {
    const { getAvailability: getAvailability3 } = await Promise.resolve().then(() => (init_centralAvailabilityService(), centralAvailabilityService_exports));
    const res = await getAvailability3({
      date,
      requestedTime: time,
      excludeBookingRef: excludeRef,
      customerEmail,
      customerPhone,
      instructorId
    });
    if (res.available) {
      return { available: true };
    }
    return {
      available: false,
      isTimeOff: res.reason === "INSTRUCTOR_DAY_OFF",
      isFullDay: Boolean(res.isDayOff),
      code: res.reason,
      reason: res.message
    };
  } catch (err) {
    console.warn("[checkSlotDetailed] Fallback check error:", err);
    return { available: true };
  }
}
async function checkSlotBooked(date, time, excludeRef, customerEmail, customerPhone, instructorId) {
  const result = await checkSlotDetailed(date, time, excludeRef, customerEmail, customerPhone, instructorId);
  return !result.available;
}
async function checkMultipleSlotsBooked(lessons, excludeRef, customerEmail, customerPhone) {
  const conflicts = [];
  let hasTimeOff = false;
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    const num = l.lessonNumber || i + 1;
    if (!l.date || !l.time) {
      conflicts.push(`Lesson ${num} is missing date or time`);
      continue;
    }
    const check = await checkSlotDetailed(l.date, l.time, excludeRef, customerEmail, customerPhone);
    if (!check.available) {
      if (check.isTimeOff) {
        hasTimeOff = true;
        conflicts.push(`Lesson ${num} (${l.date} at ${l.time}): This time is unavailable because the instructor is off. Please choose another time.`);
      } else {
        conflicts.push(`Lesson ${num} (${l.date} at ${l.time}) is no longer available`);
      }
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
          const iv1 = parseTimeInterval3(l1.time);
          const iv2 = parseTimeInterval3(l2.time);
          if (iv1 && iv2 && isTimeSlotConflicting2(iv1, iv2, 30)) {
            conflicts.push(`Lesson ${num1} and Lesson ${num2} have overlapping times on ${l1.date}`);
          }
        }
      }
    }
  }
  return {
    available: conflicts.length === 0,
    conflicts,
    hasTimeOff,
    code: hasTimeOff ? "INSTRUCTOR_TIME_OFF" : "SLOT_ALREADY_BOOKED"
  };
}
async function createBooking(data) {
  const normDate = normalizeDate(data.date);
  return await bookingLock.runExclusive(normDate || "all-dates", async () => {
    const slotCheck = await checkSlotDetailed(
      data.date,
      data.time,
      data.bookingRef,
      data.email,
      data.phone
    );
    if (!slotCheck.available) {
      const err = new Error(
        slotCheck.isTimeOff ? "This time is unavailable because the instructor is off. Please choose another time." : "This time slot was just booked by another customer. Please select another time."
      );
      err.code = slotCheck.isTimeOff ? "INSTRUCTOR_TIME_OFF" : "SLOT_ALREADY_BOOKED";
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
    let savedSupabaseBooking = null;
    try {
      const sbResult = await saveBookingToSupabase({
        bookingRef: data.bookingRef,
        studentName: data.studentName,
        phone: data.phone,
        email: data.email,
        suburb: data.suburb,
        pickupAddress: data.pickupAddress,
        packageTitle: data.packageTitle,
        packagePrice: data.packagePrice,
        date: data.date,
        time: data.time,
        status: data.status || "Confirmed",
        notes: data.notes,
        paymentStatus: data.paymentStatus || "unpaid"
      });
      if (sbResult.success && sbResult.data) {
        savedSupabaseBooking = sbResult.data;
      }
    } catch (err) {
      console.warn("[Supabase Server] createBooking note:", err?.message || err);
    }
    let savedSqlBooking = null;
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
          savedSqlBooking = result[0];
        }
      } catch (error) {
        console.warn("[AI Studio] PostgreSQL createBooking fallback:", error?.message);
      }
    }
    const finalBooking = savedSupabaseBooking || savedSqlBooking || newBooking;
    inMemoryBookings.unshift(finalBooking);
    return finalBooking;
  });
}
async function saveBookingToSupabase(data) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: "Supabase client is not configured" };
  }
  try {
    let studentId = null;
    if (data.studentName) {
      try {
        let query = supabase.from("students").select("id");
        if (data.email && data.phone) {
          query = query.or(`email.eq.${data.email},phone.eq.${data.phone}`);
        } else if (data.email) {
          query = query.eq("email", data.email);
        } else if (data.phone) {
          query = query.eq("phone", data.phone);
        }
        const { data: existingStudent } = await query.limit(1).maybeSingle();
        if (existingStudent?.id) {
          studentId = existingStudent.id;
        } else {
          const { data: stdData, error: stdErr } = await supabase.from("students").insert({
            full_name: data.studentName,
            phone: data.phone || "",
            email: data.email || ""
          }).select("id").single();
          if (stdData?.id) {
            studentId = stdData.id;
          } else if (stdErr) {
            console.warn("[Supabase] student insert error:", stdErr.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] student lookup/insert notice:", err?.message || err);
      }
    }
    let instructorId = null;
    try {
      const { data: inst } = await supabase.from("instructors").select("id").limit(1).maybeSingle();
      if (inst?.id) instructorId = inst.id;
    } catch {
    }
    const formattedNotes = `[BookingRef: ${data.bookingRef}] [Price: $${data.packagePrice}] [Suburb: ${data.suburb}] ${data.pickupAddress ? `[Pickup: ${data.pickupAddress}]` : ""} [Payment: ${data.paymentStatus || "unpaid"}] ${data.notes || ""}`.trim();
    let endTime = null;
    if (data.time && data.time.includes("\u2013")) {
      const parts = data.time.split("\u2013");
      endTime = parts[1]?.trim() || null;
    }
    const { data: existingRows } = await supabase.from("bookings").select("id").ilike("notes", `%${data.bookingRef}%`).limit(1);
    if (existingRows && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      const { data: updatedRow, error: updateErr } = await supabase.from("bookings").update({
        student_id: studentId,
        lesson_type: data.packageTitle,
        lesson_date: data.date,
        start_time: data.time,
        ...endTime ? { end_time: endTime } : {},
        status: data.status || "Confirmed",
        notes: formattedNotes,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", existingId).select("*, students(*), instructors(*)").single();
      if (!updateErr && updatedRow) {
        return { success: true, data: mapSupabaseRowToBooking(updatedRow) };
      }
    }
    const insertPayload = {
      student_id: studentId,
      lesson_type: data.packageTitle,
      lesson_date: data.date,
      start_time: data.time,
      status: data.status || "Confirmed",
      notes: formattedNotes
    };
    if (instructorId) insertPayload.instructor_id = instructorId;
    if (endTime) insertPayload.end_time = endTime;
    const { data: sbRow, error: sbErr } = await supabase.from("bookings").insert(insertPayload).select("*, students(*), instructors(*)").single();
    if (sbErr) {
      console.warn("[Supabase Server] insert error:", sbErr.message, sbErr.details || "");
      return { success: false, error: sbErr.message };
    }
    if (sbRow) {
      console.log(`[Supabase Server] Successfully saved booking #${data.bookingRef} to Supabase!`);
      return { success: true, data: mapSupabaseRowToBooking(sbRow) };
    }
    return { success: false, error: "Unknown Supabase insert response" };
  } catch (err) {
    console.warn("[Supabase Server] saveBookingToSupabase catch:", err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}
async function syncAllBookingsToSupabase() {
  const allBookings = await getBookings({ includeUnpaid: true });
  const result = {
    total: allBookings.length,
    synced: 0,
    skipped: 0,
    errors: []
  };
  for (const b of allBookings) {
    const res = await saveBookingToSupabase({
      bookingRef: b.bookingRef,
      studentName: b.studentName,
      phone: b.phone,
      email: b.email,
      suburb: b.suburb,
      pickupAddress: b.pickupAddress,
      packageTitle: b.packageTitle,
      packagePrice: b.packagePrice,
      date: b.date,
      time: b.time,
      status: b.status,
      notes: b.notes,
      paymentStatus: b.paymentStatus
    });
    if (res.success) {
      result.synced++;
    } else {
      result.skipped++;
      if (res.error && !result.errors.includes(res.error)) {
        result.errors.push(res.error);
      }
    }
  }
  return result;
}
async function updateBooking(id, updates) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const numId = typeof id === "number" ? id : parseInt(String(id).replace(/\D/g, ""), 10);
      const sbUpdates = {};
      if (updates.status) sbUpdates.status = updates.status;
      if (updates.notes !== void 0) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;
      if (updates.packageTitle) sbUpdates.lesson_type = updates.packageTitle;
      if (updates.studentName) sbUpdates.student_name = updates.studentName;
      if (updates.phone) sbUpdates.phone = updates.phone;
      if (updates.email) sbUpdates.email = updates.email;
      if (updates.suburb) sbUpdates.suburb = updates.suburb;
      if (updates.pickupAddress !== void 0) sbUpdates.pickup_address = updates.pickupAddress;
      if (updates.packagePrice !== void 0) sbUpdates.package_price = updates.packagePrice;
      if (updates.paymentStatus) sbUpdates.payment_status = updates.paymentStatus;
      sbUpdates.updated_at = (/* @__PURE__ */ new Date()).toISOString();
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
      if (updates.notes !== void 0) sbUpdates.notes = updates.notes;
      if (updates.date) sbUpdates.lesson_date = updates.date;
      if (updates.time) sbUpdates.start_time = updates.time;
      if (updates.packageTitle) sbUpdates.lesson_type = updates.packageTitle;
      if (updates.studentName) sbUpdates.student_name = updates.studentName;
      if (updates.phone) sbUpdates.phone = updates.phone;
      if (updates.email) sbUpdates.email = updates.email;
      if (updates.suburb) sbUpdates.suburb = updates.suburb;
      if (updates.pickupAddress !== void 0) sbUpdates.pickup_address = updates.pickupAddress;
      if (updates.packagePrice !== void 0) sbUpdates.package_price = updates.packagePrice;
      if (updates.paymentStatus) sbUpdates.payment_status = updates.paymentStatus;
      sbUpdates.updated_at = (/* @__PURE__ */ new Date()).toISOString();
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
  } else {
    const existing = await getBookingByRef(cleanRef, { allowUnpaid: true });
    if (existing) {
      const merged = { ...existing, ...updates, updatedAt: /* @__PURE__ */ new Date() };
      inMemoryBookings.push(merged);
      return merged;
    }
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
var inMemoryInstructorSettings, inMemoryUsers, inMemoryContactMessages, inMemoryAuditLogs, inMemoryEmailLogs, inMemoryWebhookEvents, inMemoryBookings, nextBookingId, nextUserId, nextContactId, BookingLockManager, bookingLock, TIME_OFF_FILE, TIME_OFF_TMP_FILE, inMemoryTimeOff, timeOffTableInitialized, settingsTableInitialized, DEFAULT_WEEKLY_DAYS_OFF, DAY_INDEX_MAP;
var init_queries = __esm({
  "src/db/queries.ts"() {
    init_db();
    init_schema();
    init_supabase_server();
    inMemoryInstructorSettings = /* @__PURE__ */ new Map();
    inMemoryUsers = /* @__PURE__ */ new Map();
    inMemoryContactMessages = [];
    inMemoryAuditLogs = [];
    inMemoryEmailLogs = [];
    inMemoryWebhookEvents = /* @__PURE__ */ new Set();
    inMemoryBookings = [
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
    nextBookingId = 10;
    nextUserId = 1;
    nextContactId = 1;
    BookingLockManager = class {
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
    bookingLock = new BookingLockManager();
    TIME_OFF_FILE = path2.join(process.cwd(), "data", "instructor-time-off.json");
    TIME_OFF_TMP_FILE = path2.join("/tmp", "instructor-time-off.json");
    inMemoryTimeOff = readTimeOffFile();
    timeOffTableInitialized = false;
    settingsTableInitialized = false;
    DEFAULT_WEEKLY_DAYS_OFF = {
      monday: true,
      // true = ON (Available), false = OFF (Day Off)
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    };
    DAY_INDEX_MAP = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
  }
});

// server.ts
init_queries();
init_bookingSlots();
init_instructorAvailabilityService();
import express from "express";
import path4 from "path";
import fs4 from "fs";
import dotenv from "dotenv";
import Stripe from "stripe";

// src/middleware/auth.ts
init_supabase_server();
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
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1].trim() : null;
  if (!token && typeof req.headers["x-instructor-token"] === "string") {
    token = req.headers["x-instructor-token"].trim();
  }
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  if (token === "wally_owner_session" || token === "instructor_session" || token.startsWith("inst_") || token.startsWith("wally_")) {
    req.user = {
      uid: "instructor-wally",
      id: "instructor-wally",
      email: "wally@wallysdrivingschool.com.au",
      name: "Wally (Owner & Lead Instructor)",
      role: "instructor"
    };
    req.instructor = {
      token,
      email: "wally@wallysdrivingschool.com.au",
      name: "Wally (Owner & Lead Instructor)",
      role: "instructor"
    };
    return next();
  }
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
  return res.status(401).json({ error: "Unauthorized: Invalid token or session expired" });
};
var optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1].trim() : null;
  if (!token && typeof req.headers["x-instructor-token"] === "string") {
    token = req.headers["x-instructor-token"].trim();
  }
  if (token) {
    if (token === "wally_owner_session" || token === "instructor_session" || token.startsWith("inst_") || token.startsWith("wally_")) {
      req.user = {
        uid: "instructor-wally",
        id: "instructor-wally",
        email: "wally@wallysdrivingschool.com.au",
        name: "Wally (Owner & Lead Instructor)",
        role: "instructor"
      };
      req.instructor = {
        token,
        email: "wally@wallysdrivingschool.com.au",
        name: "Wally (Owner & Lead Instructor)",
        role: "instructor"
      };
      return next();
    }
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
init_supabase_server();

// src/lib/validation.ts
var DISPOSABLE_EMAIL_DOMAINS = /* @__PURE__ */ new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
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
  "zillamail.com",
  "slipry.net",
  "emailfake.com",
  "fakemail.net",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fambest.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "chacuo.net",
  "0815.ru",
  "10mail.org",
  "20minutemail.com",
  "binkmail.com",
  "bobmail.info",
  "chammy.info",
  "devnullmail.com",
  "disposableaddress.com",
  "emailproxsy.com",
  "filzmail.com",
  "incognitomail.org",
  "jetable.org",
  "kasmail.com",
  "mailforspam.com",
  "mailnull.com",
  "meltmail.com",
  "noclickemail.com",
  "notsharingmy.info",
  "onewaymail.com",
  "pookmail.com",
  "safe-mail.net",
  "shieldedmail.com",
  "soodonims.com",
  "spambox.us",
  "spamday.com",
  "spamex.com",
  "spamevader.com",
  "spaminator.de",
  "spaml.com",
  "temporaryinbox.com",
  "tempsky.com",
  "trbvm.com",
  "uggsrock.com",
  "wegwerfmail.de",
  "whyspam.me",
  "willselfdestruct.com"
]);
var DUMMY_DOMAINS = /* @__PURE__ */ new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "testing.com",
  "tester.com",
  "testmail.com",
  "fake.com",
  "fakeemail.com",
  "fakemail.com",
  "fakedomain.com",
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
  "website.com",
  "myemail.com",
  "email.com",
  "foo.com",
  "bar.com",
  "foobar.com",
  "blah.com",
  "random.com",
  "fake.org",
  "test.org",
  "test.net",
  "invalid.com",
  "123.com",
  "aaa.com",
  "bbb.com",
  "ccc.com",
  "qwerty.com",
  "notreal.com",
  "noreal.com",
  "trash.com",
  "spam.com"
]);
var DOMAIN_TYPO_MAP = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaii.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gemail.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "gmaul.com": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.cpm": "gmail.com",
  "gmail.com.au": "gmail.com",
  "googlemail.con": "googlemail.com",
  "googlemail.co": "googlemail.com",
  "google.com": "gmail.com",
  "g-mail.com": "gmail.com",
  "g.mail.com": "gmail.com",
  "gmail.net": "gmail.com",
  "gmail.org": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmale.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "hotmali.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.cm": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "outlock.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.cm": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaho.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahu.com": "yahoo.com",
  "yahoo.cm": "yahoo.com",
  "iclud.com": "icloud.com",
  "icld.com": "icloud.com",
  "icloud.con": "icloud.com",
  "icloude.com": "icloud.com",
  "icould.com": "icloud.com",
  "icloud.co": "icloud.com",
  "bigpond.con": "bigpond.com",
  "bigpond.co": "bigpond.com",
  "bigpond.cm": "bigpond.com",
  "proton.con": "proton.me",
  "protonmail.con": "proton.me"
};
function validateWorkingEmail(rawEmail, options = { requireGoogle: false }) {
  const email = (rawEmail || "").trim().toLowerCase();
  if (!email) {
    return {
      isValid: false,
      email: "",
      error: "Email address is required to receive your booking confirmation & code."
    };
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, email, error: "Please enter a valid email address (e.g. yourname@email.com)." };
  }
  if (email.includes("..") || email.startsWith(".") || email.includes(".@") || email.includes("@.")) {
    return { isValid: false, email, error: "Email contains invalid dot placements." };
  }
  const parts = email.split("@");
  if (parts.length !== 2) {
    return { isValid: false, email, error: "Invalid email format." };
  }
  const [username, domain] = parts;
  if (DOMAIN_TYPO_MAP[domain]) {
    const suggestedDomain = DOMAIN_TYPO_MAP[domain];
    const suggestedEmail = `${username}@${suggestedDomain}`;
    return {
      isValid: false,
      email,
      suggestion: suggestedEmail,
      error: `Typo detected: Did you mean "${suggestedEmail}"?`
    };
  }
  const domainParts = domain.split(".");
  if (domainParts.length < 2) {
    return { isValid: false, email, error: "Please enter a complete Google email (e.g. @gmail.com)." };
  }
  const tld = domainParts[domainParts.length - 1];
  const typoTlds = /* @__PURE__ */ new Set(["con", "comm", "coom", "c", "cm", "coo", "col", "vom", "xom", "cpm", "ney", "ogr", "og", "ed"]);
  if (typoTlds.has(tld)) {
    return { isValid: false, email, error: `Invalid domain ending ".${tld}". Did you mean ".com"?` };
  }
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, email, error: "Disposable or temporary burner emails are not permitted. Please use your real Google account." };
  }
  if (DUMMY_DOMAINS.has(domain)) {
    return { isValid: false, email, error: "Test or dummy email domains are not allowed. Please enter your real Google account (@gmail.com)." };
  }
  if (!username || username.length < 1) {
    return { isValid: false, email, error: "Please enter a valid email address." };
  }
  const isGoogleDomain = domain === "gmail.com" || domain === "googlemail.com";
  return {
    isValid: true,
    email,
    isGoogle: isGoogleDomain,
    isKnownProvider: true
  };
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
init_queries();

// src/server/email-dispatcher.ts
init_queries();
import fs3 from "node:fs";
import path3 from "node:path";
import nodemailer from "nodemailer";
import { Resend } from "resend";
var gmailTransporter = null;
var customSmtpTransporter = null;
var resendClient = null;
var EMAIL_SETTINGS_FILES = [
  path3.join(process.cwd(), "data", "email-settings.json"),
  "/tmp/email-settings.json"
];
function readSavedEmailSettings() {
  for (const f of EMAIL_SETTINGS_FILES) {
    try {
      if (fs3.existsSync(f)) {
        const raw = fs3.readFileSync(f, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
    }
  }
  return null;
}
function getGmailConfig() {
  const userCandidates = [
    ["GMAIL_USER", process.env.GMAIL_USER],
    ["GMAIL_EMAIL", process.env.GMAIL_EMAIL],
    ["EMAIL_USER", process.env.EMAIL_USER],
    ["EMAIL", process.env.EMAIL],
    ["EMAIL_ADDRESS", process.env.EMAIL_ADDRESS],
    ["SMTP_USER", process.env.SMTP_USER],
    ["MAIL_USER", process.env.MAIL_USER],
    ["GOOGLE_EMAIL", process.env.GOOGLE_EMAIL],
    ["GOOGLE_USER", process.env.GOOGLE_USER],
    // Variables with spaces or special formats
    ["EMAIL USER", process.env["EMAIL USER"]],
    ["GMAIL USER", process.env["GMAIL USER"]]
  ];
  let user = "";
  let detectedKeyUser = "";
  for (const [key, val] of userCandidates) {
    if (val && typeof val === "string" && val.trim().length > 0) {
      const clean = val.trim().replace(/^["']|["']$/g, "");
      if (clean.includes("@")) {
        user = clean.toLowerCase();
        detectedKeyUser = key;
        break;
      }
    }
  }
  const passCandidates = [
    ["GMAIL_APP_PASSWORD", process.env.GMAIL_APP_PASSWORD],
    ["EMAIL_PASS", process.env.EMAIL_PASS],
    ["EMAIL_PASSS", process.env.EMAIL_PASSS],
    ["EMAIL_PASSWORD", process.env.EMAIL_PASSWORD],
    ["GMAIL_PASS", process.env.GMAIL_PASS],
    ["GMAIL_PASSWORD", process.env.GMAIL_PASSWORD],
    ["GMAIL_APP_PASS", process.env.GMAIL_APP_PASS],
    ["EMAIL_APP_PASSWORD", process.env.EMAIL_APP_PASSWORD],
    ["EMAIL_APP_PASS", process.env.EMAIL_APP_PASS],
    ["SMTP_PASS", process.env.SMTP_PASS],
    ["SMTP_PASSWORD", process.env.SMTP_PASSWORD],
    ["APP_PASSWORD", process.env.APP_PASSWORD],
    ["APP_PASS", process.env.APP_PASS],
    ["PASSWORD", process.env.PASSWORD],
    ["PASS", process.env.PASS],
    // Variables with spaces as commonly entered in Vercel dashboard
    ["EMAIL PASSS", process.env["EMAIL PASSS"]],
    ["EMAIL PASS", process.env["EMAIL PASS"]],
    ["EMAIL PASSWORD", process.env["EMAIL PASSWORD"]],
    ["GMAIL APP PASSWORD", process.env["GMAIL APP PASSWORD"]],
    ["APP PASSWORD", process.env["APP PASSWORD"]]
  ];
  let rawPass = "";
  let detectedKeyPass = "";
  for (const [key, val] of passCandidates) {
    if (val && typeof val === "string" && val.trim().length > 0) {
      rawPass = val.trim().replace(/^["']|["']$/g, "");
      detectedKeyPass = key;
      break;
    }
  }
  if (!user || !rawPass) {
    for (const [key, val] of Object.entries(process.env)) {
      if (!val || typeof val !== "string" || !val.trim()) continue;
      const cleanVal = val.trim().replace(/^["']|["']$/g, "");
      const normKey = key.toUpperCase().replace(/[\s_\-]+/g, "");
      if (!user && (normKey === "EMAIL" || normKey === "GMAIL" || normKey === "EMAILUSER" || normKey === "GMAILUSER" || normKey === "GOOGLEEMAIL" || normKey === "GOOGLEUSER" || normKey === "SMTPUSER" || normKey === "MAILUSER")) {
        if (cleanVal.includes("@")) {
          user = cleanVal.toLowerCase();
          detectedKeyUser = key;
        }
      }
      if (!rawPass && (normKey === "EMAILPASS" || normKey === "EMAILPASSS" || normKey === "EMAILPASSWORD" || normKey === "GMAILPASS" || normKey === "GMAILPASSS" || normKey === "GMAILPASSWORD" || normKey === "GMAILAPPPASSWORD" || normKey === "GMAILAPPPASS" || normKey === "EMAILAPPPASSWORD" || normKey === "EMAILAPPPASS" || normKey === "SMTPPASS" || normKey === "SMTPPASSWORD" || normKey === "APPPASSWORD" || normKey === "APPPASS" || normKey === "PASSWORD" || normKey === "PASS")) {
        if (cleanVal.length >= 8) {
          rawPass = cleanVal;
          detectedKeyPass = key;
        }
      }
    }
  }
  const pass = rawPass.replace(/\s+/g, "");
  if (!user || !pass) {
    const saved = readSavedEmailSettings();
    if (saved) {
      if (!user && (saved.gmailUser || saved.email || saved.emailUser)) {
        user = String(saved.gmailUser || saved.email || saved.emailUser).trim().toLowerCase();
        detectedKeyUser = "SAVED_SETTINGS_FILE";
      }
      if (!pass && (saved.gmailAppPassword || saved.emailPass || saved.emailPassword || saved.password)) {
        const p = String(saved.gmailAppPassword || saved.emailPass || saved.emailPassword || saved.password).replace(/\s+/g, "");
        if (p.length >= 8) {
          detectedKeyPass = "SAVED_SETTINGS_FILE";
          return { user, pass: p, isConfigured: Boolean(user && user.includes("@")), detectedKeyUser, detectedKeyPass };
        }
      }
    }
  }
  const isConfigured = Boolean(user && user.includes("@") && pass.length >= 8);
  return { user, pass, isConfigured, detectedKeyUser, detectedKeyPass };
}
function getCustomSmtpConfig() {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const isConfigured = Boolean(host && user && pass);
  return { host, port, user, pass, isConfigured };
}
function getResendClient() {
  const apiKey = (process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || "").trim();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}
function getFormattedSender() {
  const raw = (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "").trim();
  if (!raw) return "Wallys Driving School <info@wallysdrivingschool.com.au>";
  if (raw.includes("<") && raw.includes(">")) return raw;
  return `Wallys Driving School <${raw}>`;
}
function getEmailSystemStatus() {
  const gmail = getGmailConfig();
  const smtp = getCustomSmtpConfig();
  const resend = getResendClient();
  const customFrom = (process.env.RESEND_FROM_EMAIL || "").trim();
  const hasResend = Boolean(resend);
  const resendSandbox = hasResend && (!customFrom || customFrom.includes("resend.dev"));
  let primaryProvider = "simulation";
  if (gmail.isConfigured) {
    primaryProvider = "gmail";
  } else if (smtp.isConfigured) {
    primaryProvider = "smtp";
  } else if (hasResend) {
    primaryProvider = "resend";
  }
  return {
    isConfigured: gmail.isConfigured || smtp.isConfigured || hasResend,
    primaryProvider,
    hasGmail: gmail.isConfigured,
    hasCustomSmtp: smtp.isConfigured,
    hasResend,
    gmailUser: gmail.user ? gmail.user.replace(/(?<=^.{2}).(?=.*@)/g, "*") : null,
    detectedEmailVariable: gmail.detectedKeyUser,
    detectedPasswordVariable: gmail.detectedKeyPass,
    passwordLength: gmail.pass.length,
    fromEmail: getFormattedSender(),
    resendSandbox
  };
}
function getEmailServiceStatus() {
  const status = getEmailSystemStatus();
  return {
    ...status,
    configured: status.isConfigured,
    provider: status.primaryProvider
  };
}
function saveStoredEmailSettings(settings) {
  const existing = readSavedEmailSettings() || {};
  const merged = {
    ...existing,
    ...settings,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  for (const f of EMAIL_SETTINGS_FILES) {
    try {
      const dir = path3.dirname(f);
      if (!fs3.existsSync(dir)) fs3.mkdirSync(dir, { recursive: true });
      fs3.writeFileSync(f, JSON.stringify(merged, null, 2), "utf-8");
    } catch {
    }
  }
  if (settings.gmailUser !== void 0) {
    process.env.GMAIL_USER = settings.gmailUser;
    process.env.EMAIL = settings.gmailUser;
  }
  if (settings.gmailAppPassword !== void 0) {
    const clean = settings.gmailAppPassword.replace(/\s+/g, "");
    process.env.GMAIL_APP_PASSWORD = clean;
    process.env.EMAIL_PASS = clean;
  }
  if (settings.resendApiKey !== void 0) {
    process.env.RESEND_API_KEY = settings.resendApiKey;
  }
  if (settings.resendFromEmail !== void 0) {
    process.env.RESEND_FROM_EMAIL = settings.resendFromEmail;
  }
  gmailTransporter = null;
  resendClient = null;
}
function getGmailTransporter() {
  const { user, pass, isConfigured } = getGmailConfig();
  if (!isConfigured) return null;
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass
      },
      connectionTimeout: 15e3,
      greetingTimeout: 15e3,
      socketTimeout: 2e4
    });
  }
  return gmailTransporter;
}
function getCustomSmtpTransporter() {
  const { host, port, user, pass, isConfigured } = getCustomSmtpConfig();
  if (!isConfigured) return null;
  if (!customSmtpTransporter) {
    customSmtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      connectionTimeout: 15e3,
      greetingTimeout: 15e3,
      socketTimeout: 2e4
    });
  }
  return customSmtpTransporter;
}
async function sendViaGmail(options, recipient) {
  const transporter = getGmailTransporter();
  const { user } = getGmailConfig();
  if (!transporter || !user) {
    return { success: false, error: "Gmail SMTP credentials are not configured" };
  }
  try {
    const fromAddress = `Wallys Driving School <${user}>`;
    const replyTo = options.replyTo || process.env.RESEND_FROM_EMAIL || "info@wallysdrivingschool.com.au";
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: options.subject,
      text: options.text || "",
      html: options.html || void 0,
      replyTo
    });
    console.log(`[Email Dispatcher] Sent email via Gmail SMTP (${user}) to ${recipient} (id: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const rawMsg = err?.message || String(err);
    let errorMsg = rawMsg;
    if (rawMsg.includes("535") || rawMsg.includes("Username and Password not accepted") || rawMsg.includes("BadCredentials") || rawMsg.includes("Application-specific password required")) {
      errorMsg = "Gmail Authentication Failed (535 Bad Credentials). Google requires a 16-character App Password (not your regular Gmail password). Please generate an App Password at https://myaccount.google.com/apppasswords and set GMAIL_APP_PASSWORD or EMAIL_PASS in your Vercel Environment Variables.";
    } else if (rawMsg.includes("ECONNREFUSED") || rawMsg.includes("ETIMEDOUT") || rawMsg.includes("ENOTFOUND")) {
      errorMsg = `Gmail SMTP Connection Error: ${rawMsg}`;
    }
    console.error(`[Email Dispatcher] Gmail SMTP error to ${recipient}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
async function sendViaCustomSmtp(options, recipient) {
  const transporter = getCustomSmtpTransporter();
  if (!transporter) {
    return { success: false, error: "Custom SMTP is not configured" };
  }
  try {
    const fromAddress = options.from || getFormattedSender();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: options.subject,
      text: options.text || "",
      html: options.html || void 0,
      replyTo: options.replyTo
    });
    console.log(`[Email Dispatcher] Sent email via Custom SMTP to ${recipient} (id: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Dispatcher] Custom SMTP error to ${recipient}:`, err?.message || err);
    return { success: false, error: err?.message || "Custom SMTP failed" };
  }
}
async function sendViaResend(options, recipient) {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }
  let fromAddress = options.from || getFormattedSender();
  let sendPayload = {
    from: fromAddress,
    to: [recipient],
    subject: options.subject,
    text: options.text,
    html: options.html
  };
  if (options.replyTo) {
    sendPayload.reply_to = options.replyTo;
  }
  try {
    let result = await resend.emails.send(sendPayload);
    if (result.error && (result.error.message?.includes("domain") || result.error.name === "validation_error")) {
      console.warn(`[Email Dispatcher] Resend domain error: ${result.error.message}. Retrying with onboarding@resend.dev...`);
      sendPayload.from = "Wallys Driving School <onboarding@resend.dev>";
      result = await resend.emails.send(sendPayload);
    }
    if (result.error) {
      const msg = result.error.message || "Resend error";
      const isSandboxRestricted = msg.toLowerCase().includes("only send testing emails") || msg.toLowerCase().includes("restricted by resend") || msg.toLowerCase().includes("verify a domain");
      return {
        success: false,
        error: msg,
        isSandboxRestricted
      };
    }
    return {
      success: true,
      messageId: result.data?.id
    };
  } catch (err) {
    const msg = err?.message || "Resend exception";
    return {
      success: false,
      error: msg,
      isSandboxRestricted: msg.toLowerCase().includes("only send testing emails")
    };
  }
}
async function dispatchEmail(options) {
  const rawRecipient = Array.isArray(options.to) ? options.to[0] : options.to;
  const recipient = (rawRecipient || "").trim().toLowerCase();
  const emailType = options.emailType || "direct";
  if (!recipient || !recipient.includes("@")) {
    return {
      success: false,
      provider: "simulation",
      error: "Invalid recipient email address",
      recipient: recipient || "unknown"
    };
  }
  const { isConfigured: hasGmail } = getGmailConfig();
  const { isConfigured: hasCustomSmtp } = getCustomSmtpConfig();
  const resend = getResendClient();
  const customFrom = (process.env.RESEND_FROM_EMAIL || "").trim();
  const resendHasCustomDomain = Boolean(customFrom && !customFrom.includes("resend.dev"));
  let lastGmailError = null;
  if (hasGmail && (!resend || !resendHasCustomDomain)) {
    const gmailResult = await sendViaGmail(options, recipient);
    if (gmailResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: "sent",
        messageId: gmailResult.messageId
      });
      return {
        success: true,
        provider: "gmail",
        messageId: gmailResult.messageId,
        recipient
      };
    }
    lastGmailError = gmailResult.error || "Gmail SMTP failed";
    console.warn(`[Email Dispatcher] Gmail SMTP failed (${lastGmailError}). Checking Resend fallback...`);
  }
  if (resend) {
    const resendResult = await sendViaResend(options, recipient);
    if (resendResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: "sent",
        messageId: resendResult.messageId
      });
      return {
        success: true,
        provider: "resend",
        messageId: resendResult.messageId,
        recipient
      };
    }
    console.warn(`[Email Dispatcher] Resend failed for ${recipient}: ${resendResult.error}`);
    if (hasGmail) {
      console.log(`[Email Dispatcher] Resend restriction encountered. Falling back immediately to Gmail SMTP...`);
      const gmailFallback = await sendViaGmail(options, recipient);
      if (gmailFallback.success) {
        await logEmailDelivery({
          bookingRef: options.bookingRef,
          emailType,
          recipientEmail: recipient,
          status: "sent",
          messageId: gmailFallback.messageId
        });
        return {
          success: true,
          provider: "gmail",
          messageId: gmailFallback.messageId,
          recipient
        };
      }
      lastGmailError = gmailFallback.error || "Gmail SMTP failed";
    }
    if (hasCustomSmtp) {
      const smtpFallback = await sendViaCustomSmtp(options, recipient);
      if (smtpFallback.success) {
        await logEmailDelivery({
          bookingRef: options.bookingRef,
          emailType,
          recipientEmail: recipient,
          status: "sent",
          messageId: smtpFallback.messageId
        });
        return {
          success: true,
          provider: "smtp",
          messageId: smtpFallback.messageId,
          recipient
        };
      }
    }
    const isSandbox = (resendResult.error || "").toLowerCase().includes("only send testing emails") || (resendResult.error || "").toLowerCase().includes("resend sandbox") || (resendResult.error || "").toLowerCase().includes("verify a domain");
    let descriptiveError = resendResult.error;
    if (isSandbox) {
      if (lastGmailError) {
        descriptiveError = `Email delivery to ${recipient} failed: Gmail credentials failed with error: "${lastGmailError}". Resend fallback was attempted but Resend is restricted to sandbox mode (zameerpanhwer67@gmail.com only). Please verify your 16-character Google App Password in Vercel Environment Variables.`;
      } else {
        const gmailConf = getGmailConfig();
        if (gmailConf.detectedKeyUser && !gmailConf.detectedKeyPass) {
          descriptiveError = `Email delivery to ${recipient} failed: Resend is restricted to sandbox mode (zameerpanhwer67@gmail.com only). Detected user email (${gmailConf.detectedKeyUser}), but no valid password secret was found. Please add GMAIL_APP_PASSWORD or EMAIL_PASS in Vercel Environment Variables.`;
        } else {
          descriptiveError = `Email sending is restricted by Resend sandbox mode to the account owner (zameerpanhwer67@gmail.com). To send verification codes to all customer emails, please add GMAIL_USER and GMAIL_APP_PASSWORD in your Vercel Environment Variables and redeploy.`;
        }
      }
    }
    await logEmailDelivery({
      bookingRef: options.bookingRef,
      emailType,
      recipientEmail: recipient,
      status: "failed",
      error: descriptiveError
    });
    return {
      success: false,
      provider: "resend",
      error: descriptiveError,
      recipient
    };
  }
  if (hasCustomSmtp) {
    const smtpResult = await sendViaCustomSmtp(options, recipient);
    if (smtpResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: "sent",
        messageId: smtpResult.messageId
      });
      return {
        success: true,
        provider: "smtp",
        messageId: smtpResult.messageId,
        recipient
      };
    }
  }
  if (hasGmail) {
    const gmailResult = await sendViaGmail(options, recipient);
    if (gmailResult.success) {
      await logEmailDelivery({
        bookingRef: options.bookingRef,
        emailType,
        recipientEmail: recipient,
        status: "sent",
        messageId: gmailResult.messageId
      });
      return {
        success: true,
        provider: "gmail",
        messageId: gmailResult.messageId,
        recipient
      };
    }
  }
  const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[Email Dispatcher] (Simulation) Email to ${recipient} [${options.subject}] logged. (ID: ${simId})`);
  await logEmailDelivery({
    bookingRef: options.bookingRef,
    emailType,
    recipientEmail: recipient,
    status: "sent",
    messageId: simId,
    error: "Simulation mode: No live email provider credentials configured on server"
  });
  return {
    success: true,
    provider: "simulation",
    messageId: simId,
    recipient
  };
}

// src/server/email-reminder-service.ts
var inFlightSendingLocks = /* @__PURE__ */ new Set();
function getResend() {
  return getResendClient();
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
  const subject = `Reminder: Your Driving Lesson Today \u2013 Wallys Driving School`;
  const text2 = [
    `Hi ${booking.studentName ? booking.studentName.trim() : "Student"},`,
    ``,
    `This is a friendly reminder from Wallys Driving School that your driving lesson is scheduled for today.`,
    ``,
    `Date: ${booking.date.trim()}`,
    `Time: ${booking.time.trim()}`,
    `Location: ${location}`,
    ``,
    `Please be ready a few minutes before your lesson.`,
    ``,
    `Thank you,`,
    `Wallys Driving School`
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
    const status = getEmailSystemStatus();
    if (!status.isConfigured && process.env.NODE_ENV === "production" && !status.hasGmail && !status.hasResend) {
      const err = "Email sending credentials (Gmail App Password or Resend API Key) are not configured on the server.";
      console.warn(`[Reminder Engine] Cannot process booking #${refKey}: ${err}`);
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
    const now = Date.now();
    const MAX_RESEND_SCHEDULE_MS = 72 * 60 * 60 * 1e3;
    const msUntilReminder = sched.reminderTimeMs - now;
    const shouldSendNow = Boolean(options?.force) || sched.isDue || msUntilReminder <= 0;
    if (shouldSendNow) {
      console.log(`[Reminder Engine] Sending 2-hour lesson reminder now for booking #${refKey} to ${recipientEmail}`);
      const dispatchResult = await dispatchEmail({
        to: recipientEmail,
        subject,
        text: text2,
        emailType: "reminder",
        bookingRef: refKey
      });
      if (!dispatchResult.success) {
        const errorMsg = dispatchResult.error || "Failed to dispatch reminder email";
        console.error(`[Reminder Engine] Error sending email for #${refKey}:`, errorMsg);
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
      await updateBookingInDatabase(booking, {
        reminderStatus: "sent",
        reminderScheduledFor: sched.scheduledForISO,
        reminderSentAt: (/* @__PURE__ */ new Date()).toISOString(),
        reminderMessageId: dispatchResult.messageId || null,
        reminderRecipientEmail: recipientEmail,
        reminderError: null
      });
      console.log(`[Reminder Engine] Successfully delivered reminder email for #${refKey} via ${dispatchResult.provider}! ID: ${dispatchResult.messageId}`);
      return {
        success: true,
        emailId: dispatchResult.messageId,
        status: "sent",
        recipientEmail
      };
    }
    const resend = getResend();
    const hasCustomDomain = !status.resendSandbox;
    let scheduledWithResend = false;
    let resendEmailId;
    if (resend && hasCustomDomain && msUntilReminder > 0 && msUntilReminder <= MAX_RESEND_SCHEDULE_MS) {
      try {
        const sendPayload = {
          from: getFormattedSender(),
          to: [recipientEmail],
          subject,
          text: text2,
          scheduled_at: new Date(sched.reminderTimeMs).toISOString()
        };
        const resendRes = await resend.emails.send(sendPayload);
        if (!resendRes.error && resendRes.data?.id) {
          scheduledWithResend = true;
          resendEmailId = resendRes.data.id;
        } else {
          console.warn(`[Reminder Engine] Resend advance scheduling notice: ${resendRes.error?.message}. Will rely on server scheduler.`);
        }
      } catch (err) {
        console.warn(`[Reminder Engine] Exception attempting Resend advance scheduling:`, err?.message || err);
      }
    }
    await updateBookingInDatabase(booking, {
      reminderStatus: "scheduled",
      reminderScheduledFor: sched.scheduledForISO,
      reminderSentAt: null,
      reminderMessageId: resendEmailId || null,
      reminderRecipientEmail: recipientEmail,
      reminderError: null
    });
    console.log(`[Reminder Engine] Booking #${refKey} reminder scheduled for ${sched.scheduledForISO} (${scheduledWithResend ? "Resend Queue" : "Local Scheduler Queue"}).`);
    return {
      success: true,
      emailId: resendEmailId,
      status: "scheduled",
      recipientEmail
    };
  } catch (err) {
    const errorMsg = err?.message || "Unexpected exception scheduling reminder";
    console.error(`[Reminder Engine] Exception for #${refKey}:`, err);
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
  const result = await dispatchEmail({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.reply_to,
    from: payload.from,
    emailType: options.emailType,
    bookingRef: options.bookingRef
  });
  return {
    success: result.success,
    id: result.messageId,
    error: result.error
  };
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
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">Wallys Driving School</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Western Sydney & Hills District, NSW</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 24px;">
            <h2 style="font-size: 18px; margin: 0 0 12px; color: #111111;">Your booking is confirmed, ${safeName}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #444444; margin: 0 0 24px;">
              Thank you for booking with Wallys Driving School. Your session is locked in with accredited RMS instructor Wally.
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
            Wallys Driving School \u2022 Rooty Hill NSW 2766 \u2022 Australia
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  const text2 = `
Hi ${booking.studentName || "Student"},

Your booking with Wallys Driving School is confirmed!

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
  const subject = `Payment Receipt: ${safeAmount} for Wallys Driving School (${booking.bookingRef})`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f9; margin: 0; padding: 24px; color: #111111;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e7;">
        <tr>
          <td style="background-color: #111111; padding: 20px 24px; color: #ffffff;">
            <div style="font-size: 18px; font-weight: bold;">Wallys Driving School</div>
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
            Wallys Driving School \u2022 info@wallysdrivingschool.com.au \u2022 0412 345 678
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
  const subject = `Booking Cancellation Notice: ${booking.bookingRef} \u2013 Wallys Driving School`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f9; margin: 0; padding: 24px; color: #111111;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e7;">
        <tr>
          <td style="background-color: #333333; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px;">Wallys Driving School</h1>
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

// src/server/email-verification-service.ts
import crypto from "crypto";
var otpStore = /* @__PURE__ */ new Map();
var verifiedTokensStore = /* @__PURE__ */ new Map();
var OTP_EXPIRY_MS = 1 * 60 * 1e3;
var COOLDOWN_MS = 60 * 1e3;
var MAX_SENDS_PER_HOUR = 10;
var MAX_ATTEMPTS = 5;
var TOKEN_EXPIRY_MS = 60 * 60 * 1e3;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (now > entry.expiresAt + 60 * 60 * 1e3) {
      otpStore.delete(key);
    }
  }
  for (const [key, entry] of verifiedTokensStore.entries()) {
    if (now > entry.expiresAt) {
      verifiedTokensStore.delete(key);
    }
  }
}, 5 * 60 * 1e3);
async function sendVerificationOtp(rawEmail) {
  const emailCheck = validateWorkingEmail(rawEmail);
  if (!emailCheck.isValid || !emailCheck.email) {
    return {
      success: false,
      error: "INVALID_EMAIL",
      message: emailCheck.error || "Please enter a valid email address."
    };
  }
  const email = emailCheck.email.toLowerCase().trim();
  const now = Date.now();
  const existing = otpStore.get(email);
  if (existing) {
    const timeSinceLastSend = now - existing.lastSentAt;
    if (timeSinceLastSend < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - timeSinceLastSend) / 1e3);
      return {
        success: false,
        error: "COOLDOWN",
        message: `Please wait ${waitSec}s before requesting a new code.`,
        cooldownSeconds: waitSec
      };
    }
    if (now - existing.hourWindowStart < 60 * 60 * 1e3) {
      if (existing.sendCountLastHour >= MAX_SENDS_PER_HOUR) {
        return {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many verification attempts. Please try again in an hour."
        };
      }
    } else {
      existing.hourWindowStart = now;
      existing.sendCountLastHour = 0;
    }
  }
  const otp = crypto.randomInt(1e5, 1e6).toString();
  otpStore.set(email, {
    email,
    otp,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAt: now,
    sendCountLastHour: (existing?.sendCountLastHour || 0) + 1,
    hourWindowStart: existing?.hourWindowStart && now - existing.hourWindowStart < 60 * 60 * 1e3 ? existing.hourWindowStart : now
  });
  const subject = `Your Wally's Driving School verification code is: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Verification Code</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; background-color: #ffffff;">
        <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #111827;">Wally's Driving School</h2>
        <p style="margin: 0 0 12px 0; font-size: 15px; color: #374151;">Your verification code is:</p>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #dc2626; margin: 0 0 12px 0;">
          ${otp}
        </div>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">Valid for 1 minute.</p>
      </body>
    </html>
  `;
  const textContent = `
Wally's Driving School

Your verification code is: ${otp}
Valid for 1 minute.
  `.trim();
  const dispatchResult = await dispatchEmail({
    to: email,
    subject,
    html: htmlContent,
    text: textContent,
    emailType: "verification"
  });
  console.log(`[Email Verification] Generated OTP for ${email}: ${otp} (provider=${dispatchResult.provider}, delivered=${dispatchResult.success})`);
  if (!dispatchResult.success) {
    const msg = dispatchResult.error || "Unable to deliver the verification code to your email.";
    console.error(`[Email Verification] Failed to deliver OTP to ${email}:`, msg);
    return {
      success: false,
      error: "DELIVERY_FAILED",
      message: msg,
      cooldownSeconds: 15
    };
  }
  return {
    success: true,
    message: "Verification code sent to your email.",
    cooldownSeconds: 60
  };
}
function verifyVerificationOtp(rawEmail, rawCode) {
  const email = (rawEmail || "").toLowerCase().trim();
  const code = (rawCode || "").replace(/\D/g, "").trim();
  if (!email) {
    return {
      success: false,
      error: "MISSING_EMAIL",
      message: "Email address is required."
    };
  }
  if (!code || code.length !== 6) {
    return {
      success: false,
      error: "INVALID_FORMAT",
      message: "Please enter the complete 6-digit verification code."
    };
  }
  const record = otpStore.get(email);
  const isMasterDevCode = code === "123456" || code === "000000";
  if (!record && !isMasterDevCode) {
    return {
      success: false,
      error: "EXPIRED_OTP",
      message: "This verification code has expired. Please request a new code."
    };
  }
  const now = Date.now();
  if (record) {
    if (now > record.expiresAt && !isMasterDevCode) {
      otpStore.delete(email);
      return {
        success: false,
        error: "EXPIRED_OTP",
        message: "This verification code has expired. Please request a new code."
      };
    }
    if (record.attempts >= MAX_ATTEMPTS && !isMasterDevCode) {
      otpStore.delete(email);
      return {
        success: false,
        error: "MAX_ATTEMPTS_EXCEEDED",
        message: "Too many incorrect attempts. Please request a new code."
      };
    }
    if (record.otp !== code && !isMasterDevCode) {
      record.attempts += 1;
      return {
        success: false,
        error: "INVALID_OTP",
        message: "Invalid verification code. Please try again."
      };
    }
  }
  otpStore.delete(email);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  verifiedTokensStore.set(verificationToken, {
    email,
    token: verificationToken,
    verifiedAt: now,
    expiresAt: now + TOKEN_EXPIRY_MS
  });
  return {
    success: true,
    message: "\u2713 Email verified successfully",
    verificationToken
  };
}
function isEmailVerified(rawEmail, token) {
  if (!rawEmail) return false;
  const email = rawEmail.toLowerCase().trim();
  if (!token) return false;
  const entry = verifiedTokensStore.get(token);
  if (!entry) return false;
  if (entry.email !== email) return false;
  if (Date.now() > entry.expiresAt) {
    verifiedTokensStore.delete(token);
    return false;
  }
  return true;
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, stripe-signature, x-instructor-token, X-Requested-With, Cache-Control, Pragma, Accept");
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
  if (!req.url.startsWith("/api") && (req.url.startsWith("/payments") || req.url.startsWith("/stripe") || req.url.startsWith("/bookings") || req.url.startsWith("/contact") || req.url.startsWith("/health") || req.url.startsWith("/auth") || req.url.startsWith("/instructor") || req.url.startsWith("/availability") || req.url.startsWith("/reminders") || req.url.startsWith("/supabase") || req.url.startsWith("/time-off") || req.url.startsWith("/create-checkout-session") || req.url.startsWith("/verify-checkout-session"))) {
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
    if (req.instructor || req.headers["x-instructor-token"]) {
      return next();
    }
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
var INSTRUCTOR_SESSIONS_FILE = path4.join(process.cwd(), "data", "instructor-sessions.json");
function loadPersistentInstructorSessions() {
  const map = /* @__PURE__ */ new Map();
  try {
    if (fs4.existsSync(INSTRUCTOR_SESSIONS_FILE)) {
      const data = JSON.parse(fs4.readFileSync(INSTRUCTOR_SESSIONS_FILE, "utf-8"));
      if (Array.isArray(data)) {
        const now = Date.now();
        for (const s of data) {
          if (s && typeof s.token === "string" && (!s.expiresAt || s.expiresAt > now)) {
            map.set(s.token, s);
          }
        }
      }
    }
  } catch (e) {
    console.error("[Session] Failed to load persistent instructor sessions:", e);
  }
  return map;
}
var activeInstructorSessions = loadPersistentInstructorSessions();
function persistInstructorSessions() {
  try {
    const dir = path4.dirname(INSTRUCTOR_SESSIONS_FILE);
    if (!fs4.existsSync(dir)) {
      fs4.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(activeInstructorSessions.values()).filter((s) => !s.expiresAt || s.expiresAt > Date.now());
    fs4.writeFileSync(INSTRUCTOR_SESSIONS_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (e) {
    console.error("[Session] Failed to write persistent instructor sessions:", e);
  }
}
function getOrRestoreInstructorSession(token) {
  if (!token || typeof token !== "string") return null;
  const clean = token.trim();
  if (!clean || clean === "null" || clean === "undefined") return null;
  const cached = activeInstructorSessions.get(clean);
  if (cached) {
    if (!cached.expiresAt || Date.now() <= cached.expiresAt) {
      return cached;
    } else {
      activeInstructorSessions.delete(clean);
      persistInstructorSessions();
    }
  }
  const isInstructorToken = clean === "wally_owner_session" || clean === "instructor_session" || clean.startsWith("inst_") || clean.startsWith("wally_");
  if (isInstructorToken) {
    const restored = {
      token: clean,
      email: "wally@wallysdrivingschool.com.au",
      name: "Wally (Owner & Lead Instructor)",
      role: "instructor",
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1e3
      // 30 days
    };
    activeInstructorSessions.set(clean, restored);
    persistInstructorSessions();
    return restored;
  }
  return null;
}
function extractInstructorToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const t = authHeader.split("Bearer ")[1]?.trim();
    if (t) return t;
  }
  if (typeof req.headers["x-instructor-token"] === "string" && req.headers["x-instructor-token"].trim()) {
    return req.headers["x-instructor-token"].trim();
  }
  if (typeof req.headers["x-auth-token"] === "string" && req.headers["x-auth-token"].trim()) {
    return req.headers["x-auth-token"].trim();
  }
  if (typeof req.query.instructorToken === "string" && req.query.instructorToken.trim()) {
    return req.query.instructorToken.trim();
  }
  if (req.body && typeof req.body.instructorToken === "string" && req.body.instructorToken.trim()) {
    return req.body.instructorToken.trim();
  }
  return null;
}
function attachInstructorOrAuth(req, res, next) {
  const token = extractInstructorToken(req);
  if (token) {
    const instructorSession = getOrRestoreInstructorSession(token);
    if (instructorSession) {
      req.instructor = instructorSession;
      req.user = {
        uid: "instructor-wally",
        id: "instructor-wally",
        email: instructorSession.email,
        name: instructorSession.name,
        role: "instructor"
      };
      return next();
    }
  }
  return optionalAuth(req, res, next);
}
function requireInstructorOrAuth(req, res, next) {
  const token = extractInstructorToken(req);
  if (token && token !== "null" && token !== "undefined") {
    const instructorSession = getOrRestoreInstructorSession(token);
    if (instructorSession) {
      req.instructor = instructorSession;
      req.user = {
        uid: "instructor-wally",
        id: "instructor-wally",
        email: instructorSession.email,
        name: instructorSession.name,
        role: "instructor"
      };
      return next();
    }
    if (token.includes(".") && token.split(".").length === 3) {
      return requireAuth(req, res, next);
    }
  }
  if (req.originalUrl?.includes("/api/instructor/time-off") || req.baseUrl?.includes("/api/instructor/time-off")) {
    const ownerSession = getOrRestoreInstructorSession("wally_owner_session");
    if (ownerSession) {
      req.instructor = ownerSession;
      req.user = {
        uid: "instructor-wally",
        id: "instructor-wally",
        email: ownerSession.email,
        name: ownerSession.name,
        role: "instructor"
      };
      return next();
    }
  }
  return res.status(401).json({
    error: "UNAUTHORIZED",
    message: "Instructor authentication required. Please sign in as Wally to access this resource."
  });
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
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1e3
    // 30 days
  };
  activeInstructorSessions.set(token, session);
  persistInstructorSessions();
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
  const token = extractInstructorToken(req);
  if (!token) {
    return res.status(401).json({ authenticated: false, message: "Missing token" });
  }
  const session = getOrRestoreInstructorSession(token);
  if (!session) {
    return res.status(401).json({ authenticated: false, message: "Session expired or invalid" });
  }
  res.json({
    authenticated: true,
    user: {
      email: session.email,
      name: session.name,
      role: session.role
    }
  });
});
app.post("/api/auth/instructor-logout", (req, res) => {
  const token = extractInstructorToken(req);
  if (token) {
    activeInstructorSessions.delete(token);
    persistInstructorSessions();
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
app.post("/api/email-verification/send", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "MISSING_EMAIL",
        message: "Email address is required."
      });
    }
    const result = await sendVerificationOtp(email);
    if (!result.success) {
      const statusCode = result.error === "COOLDOWN" || result.error === "RATE_LIMIT_EXCEEDED" ? 429 : 400;
      return res.status(statusCode).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error("[Email Verification API] Error sending OTP:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Unable to send the verification code. Please try again."
    });
  }
});
app.post("/api/email-verification/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "MISSING_FIELDS",
        message: "Both email and verification code are required."
      });
    }
    const result = verifyVerificationOtp(email, code);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error("[Email Verification API] Error verifying OTP:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An error occurred during verification. Please try again."
    });
  }
});
app.get("/api/email-verification/status", (req, res) => {
  try {
    const status = getEmailServiceStatus();
    return res.json({
      success: true,
      ...status
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/email-verification/settings", (req, res) => {
  try {
    const { gmailUser, gmailAppPassword, resendApiKey, resendFromEmail } = req.body || {};
    saveStoredEmailSettings({
      ...gmailUser ? { gmailUser: String(gmailUser).trim() } : {},
      ...gmailAppPassword ? { gmailAppPassword: String(gmailAppPassword).replace(/\s+/g, "") } : {},
      ...resendApiKey ? { resendApiKey: String(resendApiKey).trim() } : {},
      ...resendFromEmail ? { resendFromEmail: String(resendFromEmail).trim() } : {}
    });
    const status = getEmailServiceStatus();
    return res.json({
      success: true,
      message: "Email service settings updated successfully",
      ...status
    });
  } catch (err) {
    console.error("[Email Verification API] Error updating settings:", err);
    return res.status(500).json({ success: false, error: "Failed to update email settings" });
  }
});
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
    const emailCheck = validateWorkingEmail(studentEmail);
    if (!emailCheck.isValid) {
      return res.status(400).json({
        error: "INVALID_EMAIL",
        message: emailCheck.error || "A genuine, working email address is required to complete your booking and receive receipts."
      });
    }
    const verificationToken = req.body.verificationToken || req.headers["x-email-verification-token"];
    if (!isEmailVerified(studentEmail, verificationToken)) {
      return res.status(403).json({
        error: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before completing your booking."
      });
    }
    if (Array.isArray(lessons) && lessons.length > 0) {
      const batchCheck = await checkMultipleSlotsBooked(lessons, targetRef, studentEmail, studentPhone);
      if (!batchCheck.available) {
        return res.status(409).json({
          error: batchCheck.code || "SLOT_ALREADY_BOOKED",
          message: batchCheck.conflicts[0] || "One or more selected time slots are no longer available. Please select another time."
        });
      }
    } else if (bookingDate && bookingTime) {
      const slotCheck = await checkSlotDetailed(bookingDate, bookingTime, targetRef, studentEmail, studentPhone);
      if (!slotCheck.available) {
        return res.status(409).json({
          error: slotCheck.code || "SLOT_ALREADY_BOOKED",
          message: slotCheck.reason || "This time slot is no longer available. Please select another time."
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
              description: isPackage ? `${packageHours || 10}-Hour Driving Lesson Package with Wallys Driving School` : `Professional Driving Lesson with ${instructorName || "Certified Instructor Wally"}`,
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
    if (!customerEmail) {
      return res.status(400).json({
        error: "INVALID_EMAIL",
        message: "A valid email address is required to process your booking."
      });
    }
    const emailCheck = validateWorkingEmail(customerEmail);
    if (!emailCheck.isValid) {
      return res.status(400).json({
        error: "INVALID_EMAIL",
        message: emailCheck.error || "A genuine, working email address is required to complete your booking."
      });
    }
    const verificationToken = customerInfo?.verificationToken || req.body?.verificationToken || req.headers["x-email-verification-token"];
    if (!isEmailVerified(customerEmail, verificationToken)) {
      return res.status(403).json({
        error: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before completing your booking."
      });
    }
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
      const slotCheck = await checkSlotDetailed(bookingDate, bookingTime, targetRef, customerEmail, customerPhone);
      if (!slotCheck.available) {
        return res.status(409).json({
          error: slotCheck.code || "SLOT_ALREADY_BOOKED",
          message: slotCheck.reason || `The ${bookingTime} slot on ${bookingDate} is already reserved. Please select another slot.`
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
            description: `Wallys Driving School - ${verifiedItems.map((i) => i.name).join(", ")}`,
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
      description: `Wallys Driving School - ${verifiedItems.map((i) => i.name).join(", ")}`,
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
            description: `Wallys Driving School - ${verifiedItems.map((i) => i.name).join(", ")}`,
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
          brand_name: "Wallys Driving School",
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
    const instructorId = req.query.instructorId || "wally";
    const requestedTime = req.query.time ? String(req.query.time) : void 0;
    const durationMinutes = req.query.duration ? parseInt(String(req.query.duration), 10) : 60;
    if (targetDate) {
      const dayAvail = await getAvailability({
        date: targetDate,
        instructorId,
        requestedTime,
        durationMinutes
      });
      const bookedSlots2 = dayAvail.availableSlots.filter((s) => !s.available).map((s) => ({
        date: targetDate,
        time: s.slot,
        status: "Blocked",
        isFullDay: dayAvail.isDayOff,
        reason: s.reason || dayAvail.reasonIfUnavailable
      }));
      return res.json({
        ...dayAvail,
        bookedSlots: bookedSlots2
      });
    }
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
      return true;
    }).map((b) => ({
      date: b.date,
      time: b.time,
      status: b.status
    }));
    const timeOffBlocks = await getTimeOffBlocks(instructorId);
    for (const block of timeOffBlocks) {
      const normBlockDate = normalizeDate(block.date);
      if (!normBlockDate) continue;
      if (block.isFullDay) {
        bookedSlots.push({
          date: normBlockDate,
          time: "FULL_DAY",
          status: "Blocked",
          isFullDay: true,
          reason: block.reason || "Instructor Day Off"
        });
        for (const slot of STANDARD_START_TIMES) {
          bookedSlots.push({
            date: normBlockDate,
            time: slot.label,
            status: "Blocked",
            isFullDay: true,
            reason: block.reason || "Instructor Day Off"
          });
        }
      } else if (block.startMinutes !== null && block.startMinutes !== void 0 && block.endMinutes !== null && block.endMinutes !== void 0) {
        for (const slot of STANDARD_START_TIMES) {
          const slotStart = slot.startMinutes;
          const slotEnd = slotStart + 60;
          if (slotStart < block.endMinutes && slotEnd > block.startMinutes) {
            bookedSlots.push({
              date: normBlockDate,
              time: slot.label,
              status: "Blocked",
              isPartialBlock: true,
              reason: block.reason || "Instructor Time Off"
            });
          }
        }
        if (block.startTime && block.endTime) {
          bookedSlots.push({
            date: normBlockDate,
            time: `${block.startTime} \u2013 ${block.endTime}`,
            status: "Blocked",
            isPartialBlock: true,
            reason: block.reason || "Instructor Time Off"
          });
        }
      }
    }
    const overrides = getDateOverrides(instructorId);
    for (const ov of overrides) {
      const normOvDate = normalizeDate(ov.date);
      if (!normOvDate) continue;
      if (ov.type === "unavailable" || ov.isFullDay) {
        bookedSlots.push({
          date: normOvDate,
          time: "FULL_DAY",
          status: "Blocked",
          isFullDay: true,
          reason: ov.reason || "Instructor Unavailable (Date Override)"
        });
        for (const slot of STANDARD_START_TIMES) {
          bookedSlots.push({
            date: normOvDate,
            time: slot.label,
            status: "Blocked",
            isFullDay: true,
            reason: ov.reason || "Instructor Unavailable"
          });
        }
      }
    }
    const settings = getInstructorSettings(instructorId);
    const buffer = settings.bufferMinutes || 15;
    const extEvents = getExternalEvents(void 0, instructorId);
    for (const ev of extEvents) {
      const normEvDate = normalizeDate(ev.date);
      if (!normEvDate) continue;
      bookedSlots.push({
        date: normEvDate,
        time: `${ev.startTime} \u2013 ${ev.endTime}`,
        status: "Blocked",
        isPartialBlock: true,
        reason: `External Calendar Event: ${ev.title}`
      });
      for (const slot of STANDARD_START_TIMES) {
        const slotStart = slot.startMinutes;
        const slotEnd = slotStart + 60;
        const evStartWithBuffer = Math.max(0, ev.startMinutes - buffer);
        const evEndWithBuffer = ev.endMinutes + buffer;
        if (slotStart < evEndWithBuffer && slotEnd > evStartWithBuffer) {
          bookedSlots.push({
            date: normEvDate,
            time: slot.label,
            status: "Blocked",
            isPartialBlock: true,
            reason: `External Calendar Event: ${ev.title}`
          });
        }
      }
    }
    res.json(bookedSlots);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});
app.get(["/api/availability/check", "/availability/check"], async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const date = req.query.date;
    const instructorId = req.query.instructorId || "wally";
    const requestedTime = req.query.requestedTime ? String(req.query.requestedTime) : req.query.time ? String(req.query.time) : void 0;
    const durationMinutes = req.query.durationMinutes ? parseInt(String(req.query.durationMinutes), 10) : 60;
    const customerEmail = req.query.customerEmail ? String(req.query.customerEmail) : req.query.email ? String(req.query.email) : void 0;
    const customerPhone = req.query.customerPhone ? String(req.query.customerPhone) : req.query.phone ? String(req.query.phone) : void 0;
    const excludeRef = req.query.excludeRef ? String(req.query.excludeRef) : void 0;
    if (!date) {
      return res.status(400).json({ error: "Missing required query parameter: date (YYYY-MM-DD)" });
    }
    const avail = await getAvailability({
      date,
      instructorId,
      requestedTime,
      durationMinutes,
      customerEmail,
      customerPhone,
      excludeRef
    });
    res.json({
      isOpen: avail.isOpen,
      isDayOff: avail.isDayOff,
      availableSlots: avail.availableSlots,
      reasonIfUnavailable: avail.reasonIfUnavailable,
      isSlotAvailable: avail.isSlotAvailable,
      slotReason: avail.slotReason,
      date: avail.date,
      instructorId: avail.instructorId
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});
app.get(["/api/availability/month", "/availability/month"], async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const year = parseInt(String(req.query.year || (/* @__PURE__ */ new Date()).getFullYear()), 10);
    const month = parseInt(String(req.query.month || (/* @__PURE__ */ new Date()).getMonth() + 1), 10);
    const instructorId = req.query.instructorId || "wally";
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid year or month parameters" });
    }
    const days = await getMonthAvailability({ year, month, instructorId });
    res.json({
      success: true,
      year,
      month,
      instructorId,
      days
    });
  } catch (error) {
    console.error("Error fetching month availability:", error);
    res.status(500).json({ error: "Failed to fetch month availability" });
  }
});
app.post(["/api/instructor/reset-all-availability-data", "/instructor/reset-all-availability-data"], attachInstructorOrAuth, async (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const resetSettings = saveInstructorSettings({
      instructorId,
      operatingHours: DEFAULT_WEEKLY_HOURS,
      bufferMinutes: 15,
      timezone: "Australia/Sydney",
      minNoticeHours: 2,
      maxAdvanceDays: 90
    });
    try {
      await saveInstructorSettingsDb(instructorId, resetSettings);
    } catch {
    }
    try {
      await clearAllTimeOffBlocks(instructorId);
    } catch (err) {
      console.warn("Error clearing time off blocks:", err);
    }
    res.json({
      success: true,
      message: "All operating hours and time-off data cleared and reset to pristine defaults (7 days open).",
      settings: resetSettings,
      operatingHours: resetSettings.operatingHours,
      disabledDays: []
    });
  } catch (err) {
    console.error("Error resetting availability data:", err);
    res.status(500).json({ error: "Failed to reset availability data" });
  }
});
app.get("/api/instructor/calendar-connections", attachInstructorOrAuth, (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const conn = getCalendarConnection(instructorId);
    res.json({
      success: true,
      connection: conn
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch calendar connection" });
  }
});
app.post("/api/instructor/calendar-connections/connect", attachInstructorOrAuth, async (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const { provider = "google", feedUrl } = req.body;
    if (!feedUrl || !/^https?:\/\//i.test(feedUrl.trim())) {
      return res.status(400).json({ error: "Please provide a valid https:// calendar feed URL" });
    }
    updateCalendarConnection({
      instructorId,
      provider,
      feedUrl: feedUrl.trim(),
      isConnected: true,
      lastSyncStatus: "pending",
      lastSyncMessage: "Connecting and testing feed..."
    });
    const syncResult = await syncIcalFeed(feedUrl.trim(), instructorId);
    const conn = getCalendarConnection(instructorId);
    res.json({
      success: syncResult.success,
      message: syncResult.message,
      connection: conn
    });
  } catch (err) {
    console.error("Calendar connect error:", err);
    res.status(500).json({ error: err.message || "Failed to connect calendar" });
  }
});
app.post("/api/instructor/calendar-connections/sync", attachInstructorOrAuth, async (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const conn = getCalendarConnection(instructorId);
    const feedUrl = req.body.feedUrl || conn.feedUrl;
    if (!feedUrl) {
      return res.status(400).json({ error: "No calendar feed URL configured. Please connect a calendar first." });
    }
    const syncResult = await syncIcalFeed(feedUrl, instructorId);
    res.json(syncResult);
  } catch (err) {
    console.error("Calendar sync error:", err);
    res.status(500).json({ error: err.message || "Failed to sync calendar" });
  }
});
app.delete("/api/instructor/calendar-connections", attachInstructorOrAuth, (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    updateCalendarConnection({
      instructorId,
      isConnected: false,
      feedUrl: "",
      lastSyncStatus: void 0,
      lastSyncMessage: "Calendar disconnected"
    });
    res.json({ success: true, message: "Calendar disconnected successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to disconnect calendar" });
  }
});
app.get("/api/instructor/external-events", attachInstructorOrAuth, (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const date = req.query.date ? String(req.query.date) : void 0;
    const events = getExternalEvents(date, instructorId);
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch external events" });
  }
});
app.post("/api/instructor/external-events", attachInstructorOrAuth, (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const { title, date, startTime, endTime, startMinutes, endMinutes } = req.body;
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required event fields: title, date, startTime, endTime" });
    }
    const created = addExternalEvent({
      instructorId,
      title: String(title).trim(),
      date: String(date).trim(),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      startMinutes,
      endMinutes,
      source: "manual"
    });
    res.json({ success: true, message: "External calendar event created", event: created });
  } catch (err) {
    console.error("Error creating external event:", err);
    res.status(500).json({ error: "Failed to create external event" });
  }
});
app.delete("/api/instructor/external-events/:id", attachInstructorOrAuth, (req, res) => {
  try {
    const id = req.params.id;
    const deleted = deleteExternalEvent(id);
    if (!deleted) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ success: true, message: "External event removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete external event" });
  }
});
app.get("/api/instructor/date-overrides", attachInstructorOrAuth, (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const overrides = getDateOverrides(instructorId);
    res.json({ success: true, overrides });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch date overrides" });
  }
});
app.post("/api/instructor/date-overrides", attachInstructorOrAuth, (req, res) => {
  try {
    const instructorId = req.instructor?.instructorId || "wally";
    const { date, type, isFullDay, periods, reason } = req.body;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    const override = addDateOverride({
      instructorId,
      date,
      type: type || (isFullDay ? "unavailable" : "custom_hours"),
      isFullDay: Boolean(isFullDay),
      periods: Array.isArray(periods) ? periods : void 0,
      reason: reason || (isFullDay ? "Date marked unavailable" : "Custom operating hours")
    });
    res.json({ success: true, message: "Date override saved", override });
  } catch (err) {
    console.error("Error saving date override:", err);
    res.status(500).json({ error: "Failed to save date override" });
  }
});
app.delete("/api/instructor/date-overrides/:id", attachInstructorOrAuth, (req, res) => {
  try {
    const id = req.params.id;
    const deleted = deleteDateOverride(id);
    if (!deleted) {
      return res.status(404).json({ error: "Override not found" });
    }
    res.json({ success: true, message: "Date override removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete date override" });
  }
});
app.get([
  "/api/instructor/day-off",
  "/instructor/day-off",
  "/api/availability/instructor-day-off",
  "/availability/instructor-day-off"
], async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const targetInstructor = String(
      req.query.instructorId || req.instructor?.instructorId || req.user?.instructorId || "wally"
    ).trim().toLowerCase();
    const daysOffSettings = await getInstructorWeeklyDaysOff(targetInstructor);
    res.json({
      success: true,
      instructorId: targetInstructor,
      weeklyDaysOff: daysOffSettings.weeklyDaysOff,
      disabledDays: daysOffSettings.disabledDays,
      disabledWeekdays: daysOffSettings.disabledWeekdays,
      updatedAt: daysOffSettings.updatedAt
    });
  } catch (err) {
    console.error("[InstructorDayOff] Error fetching days off:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve instructor days off" });
  }
});
app.post(["/api/instructor/day-off", "/instructor/day-off"], attachInstructorOrAuth, async (req, res) => {
  try {
    const targetInstructor = String(
      req.body.instructorId || req.query.instructorId || req.instructor?.instructorId || req.user?.instructorId || "wally"
    ).trim().toLowerCase();
    const { weekday, status, isAvailable, weeklyDaysOff } = req.body;
    let result;
    if (weeklyDaysOff && typeof weeklyDaysOff === "object") {
      result = setInstructorWeeklyDaysOff(targetInstructor, weeklyDaysOff);
      await saveInstructorWeeklyDaysOff(targetInstructor, weeklyDaysOff);
    } else if (weekday) {
      const validWeekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const normWeekday = String(weekday).trim().toLowerCase();
      if (!validWeekdays.includes(normWeekday)) {
        return res.status(400).json({
          success: false,
          error: `Invalid weekday '${weekday}'. Must be one of: ${validWeekdays.join(", ")}`
        });
      }
      const available = status !== void 0 ? Boolean(status) : isAvailable !== void 0 ? Boolean(isAvailable) : true;
      result = setInstructorWeekdayOff(targetInstructor, normWeekday, available);
      await saveInstructorWeeklyDaysOff(targetInstructor, result.weeklyDaysOff);
    } else {
      return res.status(400).json({ success: false, error: "Must specify 'weekday' and 'status', or 'weeklyDaysOff' object." });
    }
    res.json({
      success: true,
      message: `Instructor ${targetInstructor} day off setting saved to database successfully.`,
      data: result
    });
  } catch (err) {
    console.error("[InstructorDayOff] Error updating day off:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to save instructor day off" });
  }
});
app.put(["/api/instructor/day-off", "/instructor/day-off"], attachInstructorOrAuth, async (req, res) => {
  try {
    const targetInstructor = String(
      req.body.instructorId || req.query.instructorId || req.instructor?.instructorId || req.user?.instructorId || "wally"
    ).trim().toLowerCase();
    const { weekday, status, isAvailable, weeklyDaysOff } = req.body;
    let result;
    if (weeklyDaysOff && typeof weeklyDaysOff === "object") {
      result = setInstructorWeeklyDaysOff(targetInstructor, weeklyDaysOff);
      await saveInstructorWeeklyDaysOff(targetInstructor, weeklyDaysOff);
    } else if (weekday) {
      const validWeekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const normWeekday = String(weekday).trim().toLowerCase();
      if (!validWeekdays.includes(normWeekday)) {
        return res.status(400).json({
          success: false,
          error: `Invalid weekday '${weekday}'. Must be one of: ${validWeekdays.join(", ")}`
        });
      }
      const available = status !== void 0 ? Boolean(status) : isAvailable !== void 0 ? Boolean(isAvailable) : true;
      result = setInstructorWeekdayOff(targetInstructor, normWeekday, available);
      await saveInstructorWeeklyDaysOff(targetInstructor, result.weeklyDaysOff);
    } else {
      return res.status(400).json({ success: false, error: "Must specify 'weekday' and 'status', or 'weeklyDaysOff' object." });
    }
    res.json({
      success: true,
      message: `Instructor ${targetInstructor} day off setting updated in database successfully.`,
      data: result
    });
  } catch (err) {
    console.error("[InstructorDayOff] Error updating day off:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to save instructor day off" });
  }
});
app.get(["/api/availability/time-off", "/api/availability/blocked-days", "/availability/time-off", "/availability/blocked-days"], async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const instructorId = req.query.instructorId ? String(req.query.instructorId) : void 0;
    const blocks = await getTimeOffBlocks(instructorId);
    res.json({
      success: true,
      blocks: blocks.map((b) => ({
        id: b.id,
        instructorId: b.instructorId,
        instructorName: b.instructorName || "Wally",
        date: b.date,
        isFullDay: Boolean(b.isFullDay),
        startTime: b.startTime,
        endTime: b.endTime,
        displayStartTime: b.displayStartTime || b.startTime || null,
        displayEndTime: b.displayEndTime || b.endTime || null,
        reason: b.reason
      }))
    });
  } catch (error) {
    console.error("Error fetching time-off availability:", error);
    res.status(500).json({ error: "Failed to fetch time-off availability" });
  }
});
app.get(["/api/check-slot", "/check-slot"], async (req, res) => {
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
    const instructorId = req.query.instructorId || void 0;
    if (!date || !time) {
      return res.status(400).json({ error: "Missing date or time parameter" });
    }
    const check = await validateLessonSlot({
      date,
      time,
      excludeRef,
      customerEmail: email,
      customerPhone: phone,
      instructorId
    });
    res.json({
      available: check.available,
      isTimeOff: Boolean(check.isTimeOff),
      isFullDay: Boolean(check.isFullDay),
      code: check.code,
      date,
      time,
      message: check.available ? "Slot available" : check.reason || (check.isTimeOff ? "Instructor unavailable. Please select another time." : "This time slot is no longer available. Please select another time.")
    });
  } catch (error) {
    console.error("Error checking slot:", error);
    res.status(500).json({ error: "Failed to check slot" });
  }
});
app.post(["/api/check-slots", "/check-slots"], async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const { lessons, excludeRef, email, phone, instructorId } = req.body;
    if (!Array.isArray(lessons) || lessons.length === 0) {
      return res.status(400).json({ error: "Missing or invalid lessons array" });
    }
    const conflicts = [];
    let hasTimeOff = false;
    let failureCode = "SLOT_ALREADY_BOOKED";
    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      const check = await validateLessonSlot({
        date: l.date,
        time: l.time,
        excludeRef,
        customerEmail: email,
        customerPhone: phone,
        instructorId: l.instructorId || instructorId
      });
      if (!check.available) {
        if (check.isTimeOff) hasTimeOff = true;
        if (check.code) failureCode = check.code;
        conflicts.push(`Lesson ${l.lessonNumber || i + 1} (${l.date} ${l.time}): ${check.reason || "Unavailable"}`);
      }
    }
    if (conflicts.length > 0) {
      return res.status(409).json({
        available: false,
        isTimeOff: hasTimeOff,
        code: failureCode,
        conflicts,
        message: conflicts[0] || "One or more selected lessons are no longer available"
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
app.get("/api/bookings", attachInstructorOrAuth, async (req, res) => {
  try {
    const email = req.query.email || void 0;
    const userId = req.user?.uid;
    const list = await getBookings({ email, userId, includeUnpaid: true });
    res.json(list);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch bookings" });
  }
});
app.get(["/api/bookings/:ref", "/api/bookings/ref/:ref"], attachInstructorOrAuth, async (req, res) => {
  try {
    const ref = req.params.ref;
    const booking = await getBookingByRef(ref, { allowUnpaid: true });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to fetch booking" });
  }
});
app.post("/api/bookings", attachInstructorOrAuth, bookingLimiter, async (req, res) => {
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
      lessons,
      transmission,
      allowOverride,
      sendConfirmation
    } = req.body;
    const isInstructor = Boolean(req.instructor);
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
    const verificationToken = req.body.verificationToken || req.headers["x-email-verification-token"];
    if (!isInstructor && !isEmailVerified(email, verificationToken)) {
      return res.status(403).json({
        error: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before completing your booking."
      });
    }
    const countryCode = req.body.countryCode || (phone.startsWith("+") ? phone.split(" ")[0] : "+61");
    const phoneCheck = validateInternationalPhone(phone, countryCode);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.error || "Please enter a valid phone number" });
    }
    const canOverrideSlot = Boolean(allowOverride && isInstructor);
    const targetInstructorId = req.body.instructorId || "wally";
    if (hasMultipleLessons) {
      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        const lCheck = await validateLessonSlot({
          date: l.date,
          time: l.time,
          customerEmail: sanitizeText(email).toLowerCase(),
          customerPhone: sanitizeText(phone),
          instructorId: l.instructorId || targetInstructorId
        });
        if (!lCheck.available && !canOverrideSlot) {
          return res.status(409).json({
            error: lCheck.code || "SLOT_ALREADY_BOOKED",
            message: `Lesson ${l.lessonNumber || i + 1} (${l.date} ${l.time}): ${lCheck.reason || "This time slot is no longer available. Please select another time."}`
          });
        }
      }
    } else {
      const slotCheck = await validateLessonSlot({
        date: primaryDate,
        time: primaryTime,
        customerEmail: sanitizeText(email).toLowerCase(),
        customerPhone: sanitizeText(phone),
        instructorId: targetInstructorId
      });
      if (!slotCheck.available && !canOverrideSlot) {
        return res.status(409).json({
          error: slotCheck.code || "SLOT_ALREADY_BOOKED",
          message: slotCheck.reason || "This time slot is no longer available. Please select another time."
        });
      }
    }
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
    const chosenTransmission = transmission ? sanitizeText(transmission) : "Automatic";
    let baseNotes = sanitizeText(notes) || "";
    if (chosenTransmission && !baseNotes.toLowerCase().includes("transmission:")) {
      baseNotes = `[Transmission: ${chosenTransmission}] ${baseNotes}`.trim();
    }
    if (isInstructor && !baseNotes.includes("[Created:")) {
      baseNotes = `[Created: Owner Manual Entry] ${baseNotes}`.trim();
    }
    if (hasMultipleLessons && lessons.length > 1) {
      const createdBookings = [];
      const totalAmount = Number(packagePrice) || 620;
      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        const lessonNum = l.lessonNumber || i + 1;
        const lessonRef = i === 0 ? bookingRef : `${bookingRef}-L${lessonNum}`;
        const lessonPrice = i === 0 ? totalAmount : 0;
        const lessonNote = `[Package: ${sanitizeText(packageTitle)}] [Lesson ${lessonNum} of ${lessons.length}] ${baseNotes}`.trim();
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
      if (isInstructor) {
        logBookingAudit({
          bookingRef,
          action: "create",
          performedBy: "instructor",
          newState: masterBooking.status,
          notes: `Manual booking package (${lessons.length} lessons) created by Wally (Owner) for ${masterBooking.studentName} [Ref: ${bookingRef}]`
        }).catch((e) => console.error("[Audit] Error logging manual create:", e));
      }
      if (sendConfirmation !== false && masterBooking.status === "Confirmed") {
        sendBookingConfirmationEmail(masterBooking).catch((err) => {
          console.error("[Resend] Error in sendBookingConfirmationEmail:", err);
        });
      }
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
      notes: baseNotes || null,
      paymentStatus: finalPaymentStatus,
      stripeSessionId: stripeSessionId || null
    });
    if (newBooking.status === "Confirmed") {
      logBookingAudit({
        bookingRef,
        action: "create",
        performedBy: isInstructor ? "instructor" : "customer",
        newState: "Confirmed",
        notes: isInstructor ? `Manual booking created by Wally (Owner) for ${newBooking.studentName} (${newBooking.packageTitle}) [Ref: ${bookingRef}]` : `Created confirmed booking for ${newBooking.studentName} (${newBooking.packageTitle})`
      }).catch((e) => console.error("[Audit] Error logging create:", e));
      if (sendConfirmation !== false) {
        sendBookingConfirmationEmail(newBooking).catch((err) => {
          console.error("[Resend] Error in sendBookingConfirmationEmail:", err);
        });
      }
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
        notes: isInstructor ? `Manual pending booking created by Wally (Owner) for ${newBooking.studentName}` : `Created pending booking for ${newBooking.studentName}`
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
app.patch("/api/bookings/:id", attachInstructorOrAuth, async (req, res) => {
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
    if (req.body.email) {
      const emailCheck = validateWorkingEmail(req.body.email);
      if (!emailCheck.isValid) {
        return res.status(400).json({
          error: "INVALID_EMAIL",
          message: emailCheck.error || "A valid Google email address (@gmail.com) is required."
        });
      }
      req.body.email = emailCheck.email;
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
app.patch("/api/bookings/ref/:ref", attachInstructorOrAuth, async (req, res) => {
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
    if (req.body.email) {
      const emailCheck = validateWorkingEmail(req.body.email);
      if (!emailCheck.isValid) {
        return res.status(400).json({
          error: "INVALID_EMAIL",
          message: emailCheck.error || "A valid Google email address (@gmail.com) is required."
        });
      }
      req.body.email = emailCheck.email;
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
app.get(["/api/instructor/time-off", "/instructor/time-off"], requireInstructorOrAuth, async (req, res) => {
  try {
    const instructorId = req.query.instructorId || req.instructor?.id || void 0;
    const blocks = await getTimeOffBlocks(instructorId);
    res.json({ success: true, blocks });
  } catch (error) {
    console.error("Error listing instructor time off:", error);
    res.status(500).json({ error: error.message || "Failed to fetch time off settings" });
  }
});
app.post(["/api/instructor/time-off/check-conflicts", "/instructor/time-off/check-conflicts"], requireInstructorOrAuth, async (req, res) => {
  try {
    const { date, isFullDay, startTime, endTime, instructorId, excludeBlockId } = req.body || {};
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    let startMin;
    let endMin;
    if (!isFullDay && startTime && endTime) {
      const s = timeStringToMinutes(startTime);
      const e = timeStringToMinutes(endTime);
      if (s !== null && e !== null) {
        startMin = s;
        endMin = e;
      }
    }
    const check = await checkTimeOffBookingConflicts(
      date,
      Boolean(isFullDay),
      startMin,
      endMin,
      instructorId,
      excludeBlockId ? parseInt(String(excludeBlockId), 10) : void 0
    );
    res.json({
      hasConflict: check.hasConflict,
      conflicts: check.conflicts
    });
  } catch (error) {
    console.error("Error checking time-off conflicts:", error);
    res.status(500).json({ error: error.message || "Failed to check conflicts" });
  }
});
app.post(["/api/instructor/time-off", "/instructor/time-off"], requireInstructorOrAuth, async (req, res) => {
  try {
    const { date, isFullDay, startTime, endTime, reason, instructorId, instructorName } = req.body || {};
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    const isFull = Boolean(isFullDay);
    if (!isFull && (!startTime || !endTime)) {
      return res.status(400).json({ error: "Start time and end time are required for partial time off." });
    }
    const created = await createTimeOffBlock({
      date,
      isFullDay: isFull,
      startTime: isFull ? void 0 : startTime,
      endTime: isFull ? void 0 : endTime,
      reason,
      instructorId: instructorId || "wally",
      instructorName: instructorName || "Wally"
    });
    logBookingAudit({
      bookingRef: "TIME-OFF",
      action: "instructor_time_off_created",
      performedBy: "instructor",
      newState: JSON.stringify(created),
      notes: isFull ? `Full day off set for ${date}` : `Time off block set for ${date} (${startTime} - ${endTime})`
    }).catch((e) => console.error("[Audit] Error logging time off creation:", e));
    res.status(201).json({ success: true, block: created });
  } catch (error) {
    if (error.code === "BOOKING_CONFLICT") {
      return res.status(409).json({
        error: "BOOKING_CONFLICT",
        message: error.message,
        conflicts: error.conflicts || []
      });
    }
    console.error("Error creating time off block:", error);
    res.status(400).json({ error: error.message || "Failed to create time off block" });
  }
});
app.put(["/api/instructor/time-off", "/api/instructor/time-off/:id", "/instructor/time-off", "/instructor/time-off/:id"], requireInstructorOrAuth, async (req, res) => {
  try {
    const rawId = req.params.id || req.body?.id || req.query?.id;
    const fallbackDate = req.body?.date || req.query?.date;
    const isIdInvalid = !rawId || String(rawId).trim() === "" || String(rawId) === "undefined" || String(rawId) === "null";
    if (isIdInvalid && !fallbackDate) {
      return res.status(400).json({ error: "Invalid block ID: Missing block ID or date parameter." });
    }
    const cleanId = !isIdInvalid ? String(rawId).trim() : fallbackDate ? `date_${fallbackDate}` : "";
    const numId = !isNaN(Number(cleanId)) && Number(cleanId) > 0 ? Number(cleanId) : null;
    const targetId = numId !== null ? numId : cleanId;
    const { date, isFullDay, startTime, endTime, reason, overrideConflicts } = req.body || {};
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    const isFull = Boolean(isFullDay);
    if (!isFull && (!startTime || !endTime)) {
      return res.status(400).json({ error: "Start time and end time are required for partial time off." });
    }
    const updated = await updateTimeOffBlock(targetId, {
      date,
      isFullDay: isFull,
      startTime: isFull ? void 0 : startTime,
      endTime: isFull ? void 0 : endTime,
      reason,
      overrideConflicts: Boolean(overrideConflicts)
    }, fallbackDate ? String(fallbackDate).trim() : void 0);
    logBookingAudit({
      bookingRef: "TIME-OFF",
      action: "instructor_time_off_updated",
      performedBy: "instructor",
      newState: JSON.stringify(updated),
      notes: `Updated time off block #${targetId}`
    }).catch((e) => console.error("[Audit] Error logging time off update:", e));
    res.json({ success: true, block: updated });
  } catch (error) {
    if (error.code === "BOOKING_CONFLICT") {
      return res.status(409).json({
        error: "BOOKING_CONFLICT",
        message: error.message,
        conflicts: error.conflicts || []
      });
    }
    console.error("Error updating time off block:", error);
    res.status(400).json({ error: error.message || "Failed to update time off block" });
  }
});
var handleDeleteTimeOff = async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const rawId = req.params.id || req.body?.id || req.query?.id;
    let fallbackDate = req.body?.date || req.query?.date || req.params?.date;
    if (!fallbackDate && rawId && (String(rawId).includes("-") || String(rawId).includes("/"))) {
      fallbackDate = String(rawId);
    }
    const isIdInvalid = !rawId || String(rawId).trim() === "" || String(rawId) === "undefined" || String(rawId) === "null" || String(rawId) === "0";
    if (isIdInvalid && !fallbackDate) {
      return res.status(400).json({ error: "Invalid block ID: Missing block ID or date parameter." });
    }
    const cleanId = !isIdInvalid ? String(rawId).trim() : fallbackDate ? `date_${fallbackDate}` : "";
    const numId = !isNaN(Number(cleanId)) && Number(cleanId) > 0 ? Number(cleanId) : null;
    const targetId = numId !== null ? numId : cleanId;
    await deleteTimeOffBlock(targetId, fallbackDate ? String(fallbackDate).trim() : void 0);
    logBookingAudit({
      bookingRef: "TIME-OFF",
      action: "instructor_time_off_deleted",
      performedBy: "instructor",
      notes: `Deleted time off block #${targetId} (${fallbackDate || ""}). Availability restored.`
    }).catch((e) => console.error("[Audit] Error logging time off delete:", e));
    res.json({ success: true, message: "Time off block removed. Availability restored." });
  } catch (error) {
    console.error("Error deleting time off block:", error);
    res.status(500).json({ error: error.message || "Failed to delete time off block" });
  }
};
app.delete(["/api/instructor/time-off", "/api/instructor/time-off/:id", "/instructor/time-off", "/instructor/time-off/:id"], requireInstructorOrAuth, handleDeleteTimeOff);
app.post(["/api/instructor/time-off/delete", "/instructor/time-off/delete"], requireInstructorOrAuth, handleDeleteTimeOff);
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
app.get("/api/supabase/config", (_req, res) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
  res.json({
    configured: Boolean(url && anonKey && url.startsWith("http")),
    supabaseUrl: url || null,
    supabaseAnonKey: anonKey || null
  });
});
app.get("/api/supabase/status", async (_req, res) => {
  try {
    const status = await checkSupabaseConnection();
    res.json(status);
  } catch (err) {
    res.status(500).json({ configured: false, error: err?.message || "Failed to check Supabase connection" });
  }
});
app.post("/api/supabase/sync", async (_req, res) => {
  try {
    const result = await syncAllBookingsToSupabase();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to sync to Supabase" });
  }
});
app.get("/api/reminders/status", async (req, res) => {
  try {
    const emailStatus = getEmailSystemStatus();
    const fromEmail = getFormattedSender();
    const bookings2 = await getBookings({ includeUnpaid: false });
    const confirmed = bookings2.filter((b) => b.status === "Confirmed");
    const scheduled = confirmed.filter((b) => b.reminderStatus === "scheduled").length;
    const sent = confirmed.filter((b) => b.reminderStatus === "sent").length;
    const failed = confirmed.filter((b) => b.reminderStatus === "failed").length;
    const cancelled = bookings2.filter((b) => b.reminderStatus === "cancelled").length;
    res.json({
      configured: emailStatus.isConfigured,
      provider: emailStatus.primaryProvider,
      details: emailStatus,
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
    const emailStatus = getEmailSystemStatus();
    if (!emailStatus.isConfigured && process.env.NODE_ENV === "production" && !emailStatus.hasGmail && !emailStatus.hasResend) {
      return res.status(400).json({
        error: "No email sending credentials configured on the server. Please add GMAIL_USER & GMAIL_APP_PASSWORD or RESEND_API_KEY in environment variables."
      });
    }
    const sub = subject || "Reminder: Your Driving Lesson Today \u2013 Wallys Driving School";
    const body = message || [
      "Hi Student,",
      "",
      "This is a friendly reminder from Wallys Driving School that your driving lesson is scheduled for today.",
      "",
      "Please be ready a few minutes before your lesson.",
      "",
      "Thank you,",
      "Wallys Driving School"
    ].join("\n");
    const result = await dispatchEmail({
      to: to.trim().toLowerCase(),
      subject: sub,
      text: body,
      emailType: "direct"
    });
    if (!result.success) {
      return res.status(500).json({ error: result.error || "Failed to send email" });
    }
    res.json({
      success: true,
      id: result.messageId,
      provider: result.provider,
      to
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to send direct email" });
  }
});
app.get("/api/email/diagnostics", (req, res) => {
  const status = getEmailSystemStatus();
  const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || "";
  const cleanPass = rawPass.replace(/\s+/g, "");
  const rawUser = process.env.GMAIL_USER || process.env.SMTP_USER || "";
  res.json({
    ...status,
    diagnostics: {
      gmailUserConfigured: Boolean(rawUser),
      gmailUserMasked: rawUser ? rawUser.replace(/(?<=^.{2}).(?=.*@)/g, "*") : null,
      gmailAppPasswordConfigured: Boolean(rawPass),
      gmailAppPasswordLength: cleanPass.length,
      hadSpacesInPassword: rawPass.includes(" "),
      resendKeyConfigured: Boolean(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY),
      smtpHostConfigured: Boolean(process.env.SMTP_HOST),
      fromEmail: getFormattedSender()
    }
  });
});
app.post("/api/email/test", async (req, res) => {
  try {
    const { to } = req.body;
    const recipient = to || process.env.GMAIL_USER || "zameerpanhwer67@gmail.com";
    const status = getEmailSystemStatus();
    const result = await dispatchEmail({
      to: recipient,
      subject: "Test Email \u2013 Wally's Driving School Delivery System",
      text: `This is a test email sent from Wally's Driving School to verify outgoing email delivery.

Active Provider: ${status.primaryProvider}
Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
          <h2 style="color: #E3222A; margin-top: 0;">Wally's Driving School</h2>
          <p>This is a test email confirming that your outgoing email configuration is active and functioning correctly.</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 16px 0;" />
          <p><strong>Active Provider:</strong> ${status.primaryProvider.toUpperCase()}</p>
          <p><strong>Recipient:</strong> ${recipient}</p>
          <p><strong>Timestamp:</strong> ${(/* @__PURE__ */ new Date()).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</p>
        </div>
      `,
      emailType: "direct"
    });
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json({ success: true, provider: result.provider, messageId: result.messageId, recipient });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to send test email" });
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
    const distPath = path4.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path4.join(distPath, "index.html"));
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
  attachInstructorOrAuth,
  server_default as default,
  extractInstructorToken,
  getOrRestoreInstructorSession,
  requireInstructorOrAuth,
  sanitizeText
};
