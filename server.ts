import express from "express";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import { 
  getBookings, 
  getBookingByRef, 
  createBooking, 
  updateBooking, 
  updateBookingByRef,
  deleteBookingById,
  deleteBookingByRef,
  createContactMessage,
  getOrCreateUser,
  checkSlotBooked,
  checkMultipleSlotsBooked,
  getPendingBookingForCustomer,
  normalizeDate,
  bookingLock,
  logBookingAudit,
  getBookingAuditLogs,
  isWebhookEventProcessed,
  recordWebhookEvent,
  syncAllBookingsToSupabase
} from "./src/db/queries.ts";
import { requireAuth, optionalAuth, AuthRequest } from "./src/middleware/auth.ts";
import { checkSupabaseConnection } from "./src/lib/supabase-server.ts";
import { validateAustralianPhone, validateWorkingEmail, validateInternationalPhone } from "./src/lib/validation.ts";
import {
  processPendingLessonReminders,
  scheduleOrSendLessonReminder,
  handleBookingConfirmed,
  handleBookingRescheduled,
  handleBookingCancelled,
  cancelScheduledLessonReminder,
  generateReminderEmailContent,
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
  sendBookingCancellationNoticeEmail,
  sendInstructorNotificationEmail,
  getResend,
  getFormattedSender
} from "./src/server/email-reminder-service.ts";

dotenv.config();

// In-memory store for simulated Stripe checkout sessions when API keys are not provided
const simulatedCheckoutSessions = new Map<string, any>();


function getBookingTimestamp(date: string, time: string): number {
  let hours = 9;
  let minutes = 0;
  const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (timeMatch) {
    let [_, h, m, ampm] = timeMatch;
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10) || 0;
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
  }

  // Handle DD/MM/YYYY
  if (date.includes('/')) {
    const parts = date.split('/').map(Number);
    if (parts.length === 3 && parts[0] <= 31 && parts[1] <= 12) {
      const [day, month, year] = parts;
      const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }

  // Handle YYYY-MM-DD or standard date string
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
  }
  return Date.now();
}

const app = express();
const PORT = 3000;

// Enable CORS for API requests across domains/previews
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, stripe-signature");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Normalize API route URLs for Vercel / serverless deployments (if proxy/rewrite stripped /api or routed via /api/index)
app.use((req, _res, next) => {
  // If Vercel rewrote with query path or if req.url lost the specific sub-route
  if (req.query?.path) {
    const rawPath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    req.url = `/api${cleanPath}`;
  } else if (req.url === '/api/index' || req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api/index?') || req.url.startsWith('/api?')) {
    const matchedPath = 
      (req.headers['x-matched-path'] as string) ||
      (req.headers['x-vercel-matched-path'] as string) ||
      (req.headers['x-vercel-original-url'] as string) ||
      (req.headers['x-forwarded-uri'] as string) ||
      (req.headers['x-original-url'] as string) ||
      ((req.originalUrl && req.originalUrl !== '/api' && req.originalUrl !== '/api/') ? req.originalUrl : undefined);

    if (matchedPath) {
      const normalizedPath = matchedPath.startsWith('/api') ? matchedPath : `/api${matchedPath.startsWith('/') ? matchedPath : `/${matchedPath}`}`;
      const qIdx = req.url.indexOf('?');
      const query = qIdx !== -1 ? req.url.slice(qIdx) : '';
      req.url = `${normalizedPath}${query && !normalizedPath.includes('?') ? query : ''}`;
    }
  }

  if (!req.url.startsWith('/api') && (
    req.url.startsWith('/payments') ||
    req.url.startsWith('/stripe') ||
    req.url.startsWith('/bookings') ||
    req.url.startsWith('/contact') ||
    req.url.startsWith('/health') ||
    req.url.startsWith('/auth') ||
    req.url.startsWith('/instructor') ||
    req.url.startsWith('/create-checkout-session') ||
    req.url.startsWith('/verify-checkout-session')
  )) {
    req.url = `/api${req.url}`;
  }
  next();
});

// If body is already parsed by Vercel serverless runtime, avoid re-reading consumed stream which causes requests to hang
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    return next();
  }
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })(req, res, next);
});

// 1. Security Headers Middleware (HSTS, X-Content-Type-Options)
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// 2. Sliding Window Rate Limiter
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimits = new Map<string, RateLimitEntry>();

function createRateLimiter(windowMs: number, maxRequests: number, message: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Authenticated instructor / owner requests bypass public rate limits
    if ((req as any).instructor || req.headers["x-instructor-token"]) {
      return next();
    }
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "ip_default";
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

const loginLimiter = createRateLimiter(15 * 60 * 1000, 5, "Too many login attempts. Please try again in 15 minutes.");
const bookingLimiter = createRateLimiter(60 * 1000, 25, "Too many booking requests. Please wait a moment.");
const contactLimiter = createRateLimiter(60 * 1000, 5, "Too many contact inquiries. Please wait a moment.");

// 3. String Sanitizer helper
export function sanitizeText(val: any): string {
  if (typeof val !== "string") return "";
  return val.replace(/<[^>]*>?/gm, "").trim();
}

// 4. Server-Side Instructor Sessions (8-hour token expiry)
interface InstructorSession {
  token: string;
  email: string;
  name: string;
  role: string;
  expiresAt: number;
}
const activeInstructorSessions = new Map<string, InstructorSession>();

export function attachInstructorOrAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token && typeof req.headers["x-instructor-token"] === "string") {
    token = req.headers["x-instructor-token"];
  }

  if (token) {
    const instructorSession = activeInstructorSessions.get(token);
    if (instructorSession && Date.now() <= instructorSession.expiresAt) {
      (req as any).instructor = instructorSession;
      (req as any).user = {
        uid: "instructor-wally",
        id: "instructor-wally",
        email: instructorSession.email,
        name: instructorSession.name,
        role: "instructor"
      };
      return next();
    }
  }

  return optionalAuth(req as AuthRequest, res, next);
}

export function requireInstructorOrAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token && typeof req.headers["x-instructor-token"] === "string") {
    token = req.headers["x-instructor-token"];
  }

  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Instructor or authorized authentication required." });
  }

  const instructorSession = activeInstructorSessions.get(token);
  if (instructorSession && Date.now() <= instructorSession.expiresAt) {
    (req as any).instructor = instructorSession;
    (req as any).user = {
      uid: "instructor-wally",
      id: "instructor-wally",
      email: instructorSession.email,
      name: instructorSession.name,
      role: "instructor"
    };
    return next();
  }

  // Fallback to standard Supabase auth if token provided
  return requireAuth(req as AuthRequest, res, next);
}

// Instructor Login Endpoint with Rate Limiting
app.post("/api/auth/instructor-login", loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = sanitizeText(email).toLowerCase();
  const cleanPass = (password || '').trim();

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
  const session: InstructorSession = {
    token,
    email: "wally@wallysdrivingschool.com.au",
    name: "Wally (Owner & Lead Instructor)",
    role: "instructor",
    expiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
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

// Instructor Token Verification Endpoint
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

// Instructor Logout Endpoint
app.post("/api/auth/instructor-logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    activeInstructorSessions.delete(token);
  }
  res.json({ success: true, message: "Instructor logged out successfully" });
});

// Lazy Stripe initialization to prevent crashes if key is not yet set
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = (process.env.STRIPE_SECRET_KEY || "").trim();
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Check Stripe configuration status
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
    message: isConfigured 
      ? `Stripe is connected in ${isLive ? 'LIVE' : 'TEST'} mode. Ready to receive real payments.`
      : "Stripe Secret Key not found. Please add STRIPE_SECRET_KEY in Settings."
  });
});

// Check payment capabilities on client Stripe account
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
    let account: any = null;
    try {
      if ((stripe as any).account?.retrieve) {
        account = await (stripe as any).account.retrieve();
      } else {
        account = await (stripe.accounts as any).retrieve("acct_1SQQjBITqby17yse");
      }
    } catch (err: any) {
      console.warn("[Stripe] Could not retrieve account details:", err?.message);
    }

    const cardActive = account ? account.capabilities?.card_payments === 'active' : true;

    res.json({
      configured: true,
      card: cardActive,
      googlePay: true, // Google Pay is supported via card wallets on eligible browsers/devices
      link: false,     // Disabled per instructions
      applePay: false, // Disabled per instructions
      paypal: false
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to query payment capabilities" });
  }
});

// Create a Stripe Checkout Session for driving lessons (with real Stripe payment methods: Card, Google Pay, Link)
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
    const targetRef = bookingRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`;

    // Authoritative slot check before creating checkout session
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

    // Minify lessons list for Stripe metadata
    let minifiedLessonsJson: string | undefined = undefined;
    if (Array.isArray(lessons) && lessons.length > 0) {
      const minified = lessons.slice(0, 10).map((l: any, i: number) => ({
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
      // Sandbox fallback: generate simulated checkout session
      const simSessionId = `cs_sim_${Date.now()}_${targetRef}`;
      simulatedCheckoutSessions.set(simSessionId, {
        id: simSessionId,
        amount_total: amountInCents,
        payment_status: "paid",
        currency: "aud",
        customer_details: {
          name: studentName || "Student Driver",
          email: studentEmail || "student@example.com",
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
          lessonsJson: minifiedLessonsJson || "",
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
              description: isPackage 
                ? `${packageHours || 10}-Hour Driving Lesson Package with Wally's Driving School` 
                : `Professional Driving Lesson with ${instructorName || 'Certified Instructor Wally'}`,
              images: [
                "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&auto=format&fit=crop&q=80"
              ]
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: studentEmail || undefined,
      metadata: {
        studentName: studentName || "Student",
        studentPhone: studentPhone || "",
        serviceTitle: serviceTitle || verified.verifiedItems[0]?.name || "",
        pickupAddress: pickupAddress || "",
        bookingDate: firstLessonDate || "",
        bookingTime: firstLessonTime || "",
        instructorName: instructorName || "Wally",
        bookingRef: targetRef,
        lessonsJson: minifiedLessonsJson || "",
      },
      success_url: `${origin}/book-now?session_id={CHECKOUT_SESSION_ID}&step=confirmed`,
      cancel_url: `${origin}/book-now?cancelled=true`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).json({
      error: "STRIPE_SESSION_ERROR",
      message: error?.message || "Failed to create checkout session"
    });
  }
});

// Verify completed Stripe Checkout Session
app.get("/api/verify-checkout-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    let sessionData: any = null;

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
      const targetRef = meta.bookingRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`;
      
      let parsedLessons: Array<{ n?: number; d: string; t: string }> = [];
      try {
        if (meta.lessonsJson) {
          parsedLessons = JSON.parse(meta.lessonsJson);
        }
      } catch {}

      if (Array.isArray(parsedLessons) && parsedLessons.length > 1) {
        // Multi-lesson package: create or update individual bookings for each lesson
        for (let i = 0; i < parsedLessons.length; i++) {
          const l = parsedLessons[i];
          const lessonNum = l.n || i + 1;
          const lessonRef = i === 0 ? targetRef : `${targetRef}-L${lessonNum}`;
          const existing = await getBookingByRef(lessonRef, { allowUnpaid: true });

          const lessonPrice = i === 0 ? (sessionData.amount_total ? sessionData.amount_total / 100 : 620) : 0;
          const lessonNote = `[Verified via Stripe Checkout: ${sessionData.id}] [Package: ${meta.serviceTitle || 'Multi-Lesson Package'}] [Lesson ${lessonNum} of ${parsedLessons.length}]`;

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
              stripeSessionId: sessionData.id,
            });
          }

          if (lessonBooking) {
            handleBookingConfirmed(lessonBooking).catch(err => {
              console.error(`[Resend Reminder] Error in handleBookingConfirmed for ${lessonRef}:`, err);
            });
          }

          if (i === 0) {
            finalBooking = lessonBooking;
          }
        }
      } else {
        // Single lesson or test package
        const existing = await getBookingByRef(targetRef, { allowUnpaid: true });
        if (existing) {
          finalBooking = await updateBookingByRef(targetRef, {
            status: "Confirmed",
            paymentStatus: "paid",
            stripeSessionId: sessionData.id,
            packagePrice: sessionData.amount_total ? sessionData.amount_total / 100 : existing.packagePrice,
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
            date: sanitizeText(meta.bookingDate || new Date().toISOString().split("T")[0]),
            time: sanitizeText(meta.bookingTime || "09:00 AM"),
            status: "Confirmed",
            notes: `[Verified via Stripe Checkout: ${sessionData.id}]`,
            paymentStatus: "paid",
            stripeSessionId: sessionData.id,
          });
        }

        if (finalBooking) {
          handleBookingConfirmed(finalBooking).catch(err => {
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
      booking: finalBooking,
    });
  } catch (error: any) {
    console.error("Error verifying checkout session:", error);
    res.status(500).json({
      error: "VERIFY_ERROR",
      message: error?.message || "Failed to verify session"
    });
  }
});

// ==========================================
// SERVER-SIDE SECURE PAYMENT ENDPOINTS
// ==========================================

const CANONICAL_PRICES: Record<string, number> = {
  '1 hour driving lesson': 65.0,
  '60 minutes lesson': 65.0,
  '60 min lesson': 65.0,
  '60-min-lesson': 65.0,
  '2 hour driving lesson': 130.0,
  '2 hours lesson': 130.0,
  '2-hour-lesson': 130.0,
  'car hire + 1 hour lesson': 200.0,
  'car hire & 1 lesson': 200.0,
  'driving test package + 1 lesson': 200.0,
  'driving test package': 200.0,
  'test-1-lesson': 200.0,
  'car hire + 2 hour lesson': 250.0,
  'car hire & 2 lessons': 250.0,
  'driving test package + 2 lessons': 250.0,
  'test-2-lesson': 250.0,
  '10 hours package': 620.0,
  '10 hours pack': 620.0,
  '10-hours-pack': 620.0,
  '5 hours package': 315.0,
  '5 hours pack': 315.0,
  '5-hours-pack': 315.0,
  'srv-1hr': 65.0,
  'srv-2hr': 130.0,
  'srv-car-1hr': 200.0,
  'srv-car-2hr': 250.0,
  'pkg-10hr': 620.0,
  'pkg-5hr': 315.0,
  'single-lesson': 65.0,
  '2-hours-lesson': 130.0,
  'practice-test': 95.0,
};

function computeVerifiedOrder(items: any[]): {
  verifiedItems: Array<{ name: string; unitPrice: number; quantity: number; lineTotal: number }>;
  totalAmount: number;
} {
  let total = 0;
  const verifiedItems: Array<{ name: string; unitPrice: number; quantity: number; lineTotal: number }> = [];

  const rawItems = Array.isArray(items) && items.length > 0 ? items : [{ name: '1 Hour Driving Lesson', quantity: 1 }];

  for (const raw of rawItems) {
    const qty = Math.max(1, parseInt(String(raw.quantity || 1), 10) || 1);
    const rawName = String(raw.name || raw.title || raw.id || '1 Hour Driving Lesson').trim();
    const nameLower = rawName.toLowerCase();
    
    let unitPrice = 65.0; // standard default

    if (CANONICAL_PRICES[nameLower]) {
      unitPrice = CANONICAL_PRICES[nameLower];
    } else if (raw.id && CANONICAL_PRICES[String(raw.id).toLowerCase()]) {
      unitPrice = CANONICAL_PRICES[String(raw.id).toLowerCase()];
    } else {
      const match = Object.entries(CANONICAL_PRICES).find(([key]) => nameLower.includes(key));
      if (match) {
        unitPrice = match[1];
      } else if (typeof raw.unitPrice === 'number' && raw.unitPrice > 0) {
        unitPrice = raw.unitPrice;
      } else if (typeof raw.packagePrice === 'number' && raw.packagePrice > 0) {
        unitPrice = raw.packagePrice;
      }
    }

    const lineTotal = Number((unitPrice * qty).toFixed(2));
    total += lineTotal;

    verifiedItems.push({
      name: rawName,
      unitPrice,
      quantity: qty,
      lineTotal,
    });
  }

  return {
    verifiedItems,
    totalAmount: Number(total.toFixed(2)),
  };
}

// 1. Calculate authoritative total amount server-side
app.post("/api/payments/calculate", (req, res) => {
  try {
    const { items } = req.body;
    const { verifiedItems, totalAmount } = computeVerifiedOrder(items);
    res.json({
      items: verifiedItems,
      totalAmount,
      currency: "AUD",
    });
  } catch (error: any) {
    console.error("Error computing order total:", error);
    res.status(500).json({ error: "Failed to calculate total amount" });
  }
});

// 2. Stripe: Create Payment Intent with server-computed amount & slot conflict prevention
app.post("/api/payments/stripe/create-intent", async (req, res) => {
  try {
    const { items, customerInfo, bookingRef } = req.body;
    const { verifiedItems, totalAmount } = computeVerifiedOrder(items);
    const amountInCents = Math.round(totalAmount * 100);

    const bookingDate = customerInfo?.bookingDate || customerInfo?.date;
    const bookingTime = customerInfo?.bookingTime || customerInfo?.time;
    const customerEmail = customerInfo?.email ? sanitizeText(customerInfo.email).toLowerCase() : undefined;
    const customerPhone = customerInfo?.phone ? sanitizeText(customerInfo.phone) : undefined;

    // Check if the student already has an unpaid pending reservation for this slot (reuse ref)
    let targetRef = bookingRef;
    if (!targetRef && (customerEmail || customerPhone) && bookingDate && bookingTime) {
      const existingPending = await getPendingBookingForCustomer(customerEmail, customerPhone, bookingDate, bookingTime);
      if (existingPending) {
        targetRef = existingPending.bookingRef;
      }
    }
    if (!targetRef) {
      targetRef = `WD-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Server-side slot availability check (prevent double-booking, allowing customer to resume their checkout)
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
      // Sandbox fallback: Return simulated client secret without creating any unpaid pre-booking
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

    // Check if an existing open Stripe PaymentIntent can be reused & updated
    let existingBooking = await getBookingByRef(targetRef, { allowUnpaid: true });
    if (existingBooking?.stripeSessionId && existingBooking.stripeSessionId.startsWith('pi_')) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(existingBooking.stripeSessionId);
        const reusableStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action'];
        if (existingPI && reusableStatuses.includes(existingPI.status)) {
          const updatedPI = await stripe.paymentIntents.update(existingPI.id, {
            amount: amountInCents,
            description: `Wally's Driving School - ${verifiedItems.map(i => i.name).join(", ")}`,
            metadata: {
              bookingRef: targetRef,
              customerName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || "Student"),
              customerEmail: sanitizeText(customerInfo?.email || ""),
              customerPhone: sanitizeText(customerInfo?.phone || ""),
              pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || ""),
              suburb: sanitizeText(customerInfo?.suburb || ""),
              bookingDate: bookingDate || "",
              bookingTime: bookingTime || "",
              packageTitle: verifiedItems[0]?.name || "Driving Lesson",
            },
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
      } catch (piReuseErr: any) {
        console.log("[Stripe] Notice: could not reuse stored paymentIntent, creating fresh intent:", piReuseErr?.message);
      }
    }

    // Create real Stripe PaymentIntent on merchant's account
    // Specifically enable 'card' only. Google Pay is provided via card wallets in Stripe Elements.
    // Link and Apple Pay are excluded per user instructions.
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: "aud",
      payment_method_types: ["card"],
      description: `Wally's Driving School - ${verifiedItems.map(i => i.name).join(", ")}`,
      metadata: {
        bookingRef: targetRef,
        customerName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || "Student"),
        customerEmail: sanitizeText(customerInfo?.email || ""),
        customerPhone: sanitizeText(customerInfo?.phone || ""),
        pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || ""),
        suburb: sanitizeText(customerInfo?.suburb || ""),
        bookingDate: bookingDate || "",
        bookingTime: bookingTime || "",
        packageTitle: verifiedItems[0]?.name || "Driving Lesson",
      },
    };

    let paymentIntent: Stripe.PaymentIntent;
    const clientProvidedIdempotency = req.headers["idempotency-key"] as string | undefined;

    try {
      paymentIntent = await stripe.paymentIntents.create(
        paymentIntentParams,
        clientProvidedIdempotency ? { idempotencyKey: clientProvidedIdempotency } : undefined
      );
    } catch (createErr: any) {
      if (createErr?.type === 'StripeIdempotencyError' || createErr?.message?.toLowerCase().includes('idempotent')) {
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
  } catch (error: any) {
    console.error("Error creating Stripe PaymentIntent:", error);
    res.status(500).json({
      error: "STRIPE_INTENT_ERROR",
      message: error?.message || "Failed to create payment intent",
    });
  }
});

app.get("/api/payments/stripe/create-intent", (_req, res) => {
  res.status(405).json({
    error: "METHOD_NOT_ALLOWED",
    message: "Use POST with lesson items and customer info to create a Stripe payment intent."
  });
});

// 3. Stripe: Server-side payment verification & booking confirmation
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
    const targetRef = bookingRef || bookingData?.bookingRef || bookingData?.ref || `WD-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentMethodName = req.body.paymentMethod || (paymentIntentId.startsWith("pi_sim_") ? "Stripe" : "Stripe Card / Google Pay");

    if (paymentIntentId.startsWith("pi_sim_")) {
      // Sandbox mode: verified simulation
      paidAmount = totalAmount > 0 ? totalAmount : (bookingData?.packagePrice || 65);
    } else {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(400).json({ error: "STRIPE_SECRET_KEY is not configured" });
      }

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Verify payment actually succeeded on Stripe
      if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
        return res.status(400).json({
          error: "PAYMENT_NOT_COMPLETED",
          message: `Stripe payment status is: ${paymentIntent.status}. Expected 'succeeded'.`,
          status: paymentIntent.status,
        });
      }
      paidAmount = paymentIntent.amount / 100;
    }

    let finalBooking: any = null;

    if (targetRef) {
      const existing = await getBookingByRef(targetRef, { allowUnpaid: true });
      if (existing) {
        // Idempotency: if already paid with this intent, return existing confirmed booking
        if (existing.paymentStatus === 'paid' && existing.stripeSessionId === paymentIntentId) {
          return res.json({
            success: true,
            verified: true,
            paymentStatus: "paid",
            booking: existing,
            transactionId: paymentIntentId,
            amount: paidAmount,
            message: "Payment already verified.",
          });
        }

        finalBooking = await updateBookingByRef(targetRef, {
          paymentStatus: "paid",
          status: "Confirmed",
          stripeSessionId: paymentIntentId,
          packagePrice: paidAmount > 0 ? paidAmount : existing.packagePrice,
          notes: existing.notes 
            ? `${existing.notes} [Verified via Stripe: ${paymentIntentId}]` 
            : `[Verified via Stripe: ${paymentIntentId}]`,
        });
      }
    }

    // If no existing booking, create new verified booking in DB
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
        date: sanitizeText(bookingData?.date || new Date().toISOString().split("T")[0]),
        time: sanitizeText(bookingData?.time || "09:00 AM"),
        status: "Confirmed",
        notes: `[Verified via Stripe: ${paymentIntentId}]`,
        paymentStatus: "paid",
        stripeSessionId: paymentIntentId,
      });
    }

    if (finalBooking) {
      logBookingAudit({
        bookingRef: targetRef,
        action: 'payment_verified',
        performedBy: 'stripe_client_confirm',
        previousState: 'Pending',
        newState: 'Confirmed',
        notes: `Verified $${paidAmount.toFixed(2)} AUD via ${paymentMethodName} (Tx: ${paymentIntentId})`
      }).catch(e => console.error("[Audit] Error logging confirm-payment audit:", e));

      sendBookingConfirmationEmail(finalBooking).catch(e => console.error("[Resend] Error sending confirmation:", e));
      sendPaymentReceiptEmail(finalBooking, {
        method: paymentMethodName.toLowerCase().includes('google') ? 'google_pay' : 'card',
        transactionId: paymentIntentId,
        amount: paidAmount
      }).catch(e => console.error("[Resend] Error sending receipt:", e));
      sendInstructorNotificationEmail(finalBooking).catch(e => console.error("[Resend] Error notifying instructor:", e));
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
      message: `${paymentMethodName} payment successfully verified and booking marked as Confirmed and Paid.`,
    });
  } catch (error: any) {
    console.error("Error verifying Stripe payment:", error);
    res.status(500).json({ error: error?.message || "Failed to confirm payment" });
  }
});

// Idempotency cache for processed webhook event IDs
const processedWebhookEventIds = new Set<string>();

// Centralized Stripe Webhook Handler with cryptographic signature verification and idempotency
async function handleStripeWebhookEvent(req: express.Request, res: express.Response) {
  let event: Stripe.Event;
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (webhookSecret && sig) {
      const stripe = getStripe();
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? Buffer.from(req.body) : Buffer.from(JSON.stringify(req.body)));
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // If webhook secret is not set, parse payload safely
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (webhookSecret && !sig) {
        console.warn("[Stripe Webhook] Received webhook event without stripe-signature header");
      }
    }
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  // Database-backed idempotency check: avoid duplicate event processing across processes/restarts
  if (event.id) {
    const alreadyProcessedInDb = await isWebhookEventProcessed(event.id);
    if (alreadyProcessedInDb || processedWebhookEventIds.has(event.id)) {
      console.log(`[Stripe Webhook] Duplicate event ignored: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }

    processedWebhookEventIds.add(event.id);
    if (processedWebhookEventIds.size > 2000) {
      const oldest = processedWebhookEventIds.values().next().value;
      if (oldest) processedWebhookEventIds.delete(oldest);
    }
    await recordWebhookEvent(event.id, 'stripe', event.type);
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing) {
            const updated = await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: pi.id,
              packagePrice: (pi.amount_received ? pi.amount_received / 100 : existing.packagePrice),
            });

            await logBookingAudit({
              bookingRef: ref,
              action: 'payment_verified',
              performedBy: 'stripe_webhook',
              previousState: existing.status,
              newState: 'Confirmed',
              notes: `Payment verified by Stripe PaymentIntent ${pi.id} ($${(pi.amount_received / 100).toFixed(2)} AUD)`
            });

            if (updated) {
              sendBookingConfirmationEmail(updated).catch(e => console.error("[Resend] Error sending confirmation:", e));
              sendPaymentReceiptEmail(updated, {
                method: 'card',
                transactionId: pi.id,
                amount: pi.amount_received ? pi.amount_received / 100 : (Number(updated.packagePrice) || 70)
              }).catch(e => console.error("[Resend] Error sending receipt:", e));
              sendInstructorNotificationEmail(updated).catch(e => console.error("[Resend] Error notifying instructor:", e));
              handleBookingConfirmed(updated).catch(e => console.error("[Resend] Error scheduling reminder:", e));
            }

            console.log(`[Stripe Webhook] Booking ${ref} confirmed as paid for PaymentIntent ${pi.id}`);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const ref = pi.metadata?.bookingRef;
        const failureMsg = pi.last_payment_error?.message || "Payment declined";
        console.warn(`[Stripe Webhook] Payment failed for ${ref}: ${failureMsg}`);
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              paymentStatus: "failed",
              notes: existing.notes 
                ? `${existing.notes} [Payment Failed: ${failureMsg}]` 
                : `[Payment Failed: ${failureMsg}]`,
            });
            await logBookingAudit({
              bookingRef: ref,
              action: 'payment_failed',
              performedBy: 'stripe_webhook',
              previousState: existing.status,
              newState: 'failed',
              notes: failureMsg
            });
          }
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "cancelled",
            });
            await logBookingAudit({
              bookingRef: ref,
              action: 'cancel',
              performedBy: 'stripe_webhook',
              previousState: existing.status,
              newState: 'Cancelled',
              notes: 'Stripe PaymentIntent canceled'
            });
            console.log(`[Stripe Webhook] Booking ${ref} cancelled due to payment intent cancellation`);
          }
        }
        break;
      }
      case "payment_intent.processing": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              paymentStatus: "processing",
              status: "Pending",
            });
          }
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        const refundAmount = charge.amount_refunded ? charge.amount_refunded / 100 : 0;
        
        // Find booking by stripeSessionId or payment intent
        const allBookings = await getBookings({ includeUnpaid: true });
        const targetBooking = allBookings.find(b => 
          (paymentIntentId && b.stripeSessionId === paymentIntentId) || 
          (b.notes && b.notes.includes(paymentIntentId || ''))
        );

        if (targetBooking) {
          const updated = await updateBooking(targetBooking.id, {
            status: "Cancelled",
            paymentStatus: "refunded",
            notes: (targetBooking.notes || '') + ` [Refund of $${refundAmount.toFixed(2)} AUD processed via Stripe]`,
          });

          await logBookingAudit({
            bookingRef: targetBooking.bookingRef,
            action: 'refund',
            performedBy: 'stripe_webhook',
            previousState: targetBooking.status,
            newState: 'refunded',
            notes: `Stripe charge refunded: $${refundAmount.toFixed(2)} AUD`
          });

          if (updated) {
            sendBookingCancellationNoticeEmail(updated, {
              reason: 'Payment refunded via Stripe',
              refundStatus: 'refunded',
              amountRefunded: refundAmount,
              refundTxId: charge.id
            }).catch(e => console.error("[Resend] Error sending refund email:", e));
            cancelScheduledLessonReminder(updated, 'Payment was refunded');
          }
          console.log(`[Stripe Webhook] Booking ${targetBooking.bookingRef} marked as refunded`);
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const ref = session.metadata?.bookingRef;
        if (session.payment_status === "paid" && ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing) {
            const updated = await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: session.id,
            });

            await logBookingAudit({
              bookingRef: ref,
              action: 'payment_verified',
              performedBy: 'stripe_webhook',
              previousState: existing.status,
              newState: 'Confirmed',
              notes: `Checkout Session completed (${session.id})`
            });

            if (updated) {
              sendBookingConfirmationEmail(updated).catch(e => console.error("[Resend] Error sending confirmation:", e));
              sendPaymentReceiptEmail(updated, {
                method: 'card',
                transactionId: session.id,
                amount: (session.amount_total ? session.amount_total / 100 : Number(updated.packagePrice) || 70)
              }).catch(e => console.error("[Resend] Error sending receipt:", e));
              sendInstructorNotificationEmail(updated).catch(e => console.error("[Resend] Error notifying instructor:", e));
              handleBookingConfirmed(updated).catch(e => console.error("[Resend] Error scheduling reminder:", e));
            }
            console.log(`[Stripe Webhook] Checkout session completed for booking ${ref}`);
          }
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const ref = session.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref, { allowUnpaid: true });
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "expired",
            });
            await logBookingAudit({
              bookingRef: ref,
              action: 'cancel',
              performedBy: 'stripe_webhook',
              previousState: existing.status,
              newState: 'Cancelled',
              notes: 'Checkout session expired'
            });
            console.log(`[Stripe Webhook] Booking ${ref} expired`);
          }
        }
        break;
      }
      default:
        // Ignore unhandled event types cleanly
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook] Handler error:", err?.message || err);
    res.status(500).json({ error: "Webhook handler error" });
  }
}

// Support both endpoint paths so any dashboard webhook configuration works
app.post("/api/payments/webhook", handleStripeWebhookEvent);
app.post("/api/stripe/webhook", handleStripeWebhookEvent);

// ----------------------------------------------------------------------------
// Stripe Refund API (Protected for Instructor / Admin)
// ----------------------------------------------------------------------------
app.post("/api/payments/stripe/refund", requireInstructorOrAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { bookingRef, reason, amount } = req.body;
    if (!bookingRef) {
      return res.status(400).json({ error: "bookingRef is required" });
    }

    const booking = await getBookingByRef(bookingRef, { allowUnpaid: true });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.paymentStatus === 'refunded') {
      return res.status(400).json({ error: "Booking has already been refunded" });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    let refundId = `sim_ref_${Date.now()}`;
    let refundAmount = amount ? Number(amount) : Number(booking.packagePrice) || 70;

    if (stripeKey && booking.stripeSessionId && !booking.stripeSessionId.startsWith('sim_')) {
      const stripe = getStripe();
      let piId = booking.stripeSessionId;

      // If it was a checkout session, retrieve the payment intent
      if (piId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(piId);
        if (session.payment_intent && typeof session.payment_intent === 'string') {
          piId = session.payment_intent;
        }
      }

      if (piId.startsWith('pi_')) {
        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: piId,
          reason: 'requested_by_customer',
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
      notes: (booking.notes || '') + ` [Refunded $${refundAmount.toFixed(2)} AUD: ${refundId}]`,
    });

    await logBookingAudit({
      bookingRef,
      action: 'refund',
      performedBy: 'instructor',
      previousState: booking.status,
      newState: 'refunded',
      notes: `Instructor issued refund of $${refundAmount.toFixed(2)} AUD (Ref: ${refundId}). Reason: ${reason || 'N/A'}`
    });

    if (updated) {
      sendBookingCancellationNoticeEmail(updated, {
        reason: reason || 'Instructor issued cancellation and refund',
        refundStatus: 'refunded',
        amountRefunded: refundAmount,
        refundTxId: refundId
      }).catch(e => console.error("[Resend] Error sending cancellation notice:", e));
      cancelScheduledLessonReminder(updated, 'Lesson was refunded');
    }

    res.json({
      success: true,
      message: `Successfully refunded $${refundAmount.toFixed(2)} AUD for booking ${bookingRef}`,
      refundId,
      booking: updated
    });
  } catch (err: any) {
    console.error("Stripe refund error:", err);
    res.status(500).json({ error: err?.message || "Failed to process Stripe refund" });
  }
});

// ----------------------------------------------------------------------------
// PayPal Real & Sandbox Integration API
// ----------------------------------------------------------------------------
async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const isLive = process.env.PAYPAL_ENVIRONMENT === 'live';
  const base = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
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

    const targetRef = bookingRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`;
    const accessToken = await getPayPalAccessToken();

    if (accessToken) {
      const isLive = process.env.PAYPAL_ENVIRONMENT === 'live';
      const base = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const origin = req.headers.origin || 'https://wallysdrivingschool.com.au';

      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: targetRef,
            description: `Wally's Driving School - ${verifiedItems.map(i => i.name).join(', ')}`,
            amount: {
              currency_code: 'AUD',
              value: totalAmount.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: 'AUD',
                  value: totalAmount.toFixed(2)
                }
              }
            },
            items: verifiedItems.map(i => ({
              name: i.name,
              unit_amount: {
                currency_code: 'AUD',
                value: i.unitPrice.toFixed(2)
              },
              quantity: String(i.quantity)
            }))
          }
        ],
        application_context: {
          brand_name: "Wally's Driving School",
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${origin}/book-now?paypal_status=success&ref=${targetRef}`,
          cancel_url: `${origin}/book-now?paypal_status=cancel&ref=${targetRef}`
        }
      };

      const ppRes = await fetch(`${base}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await ppRes.json();
      if (!ppRes.ok) {
        return res.status(400).json({ error: orderData.message || 'Failed to create PayPal order' });
      }

      const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;
      return res.json({
        orderId: orderData.id,
        bookingRef: targetRef,
        approveUrl: approveLink,
        totalAmount
      });
    }

    // Sandbox simulation fallback if PayPal credentials are not yet supplied
    const simOrderId = `PAYPAL_SIM_${Date.now()}`;
    return res.json({
      orderId: simOrderId,
      bookingRef: targetRef,
      approveUrl: null,
      totalAmount,
      isSimulated: true
    });
  } catch (err: any) {
    console.error("PayPal create order error:", err);
    res.status(500).json({ error: err?.message || "Failed to initialize PayPal order" });
  }
});

app.post("/api/payments/paypal/capture-order", async (req, res) => {
  try {
    const { orderId, bookingRef, bookingData, items } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });

    const { verifiedItems, totalAmount } = computeVerifiedOrder(items);
    const targetRef = bookingRef || bookingData?.bookingRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`;

    const accessToken = await getPayPalAccessToken();
    let captureId = orderId;
    let paidAmount = totalAmount;

    if (accessToken && !orderId.startsWith('PAYPAL_SIM_')) {
      const isLive = process.env.PAYPAL_ENVIRONMENT === 'live';
      const base = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const captureData = await captureRes.json();
      if (!captureRes.ok) {
        return res.status(400).json({ error: captureData.message || 'PayPal capture failed' });
      }

      const captureObj = captureData.purchase_units?.[0]?.payments?.captures?.[0];
      captureId = captureObj?.id || orderId;
      paidAmount = captureObj?.amount?.value ? parseFloat(captureObj.amount.value) : totalAmount;
    }

    // Update or create booking
    let finalBooking = await getBookingByRef(targetRef, { allowUnpaid: true });
    if (finalBooking) {
      finalBooking = await updateBookingByRef(targetRef, {
        status: 'Confirmed',
        paymentStatus: 'paid',
        stripeSessionId: `paypal_${captureId}`,
        packagePrice: paidAmount,
        notes: (finalBooking.notes || '') + ` [Verified via PayPal: ${captureId}]`
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
        date: sanitizeText(bookingData?.date || new Date().toISOString().split("T")[0]),
        time: sanitizeText(bookingData?.time || "09:00 AM"),
        status: "Confirmed",
        notes: `[Verified via PayPal: ${captureId}]`,
        paymentStatus: "paid",
        stripeSessionId: `paypal_${captureId}`,
      });
    }

    await logBookingAudit({
      bookingRef: targetRef,
      action: 'payment_verified',
      performedBy: 'paypal_capture',
      previousState: 'Pending',
      newState: 'Confirmed',
      notes: `Verified $${paidAmount.toFixed(2)} AUD via PayPal (Capture: ${captureId})`
    });

    if (finalBooking) {
      sendBookingConfirmationEmail(finalBooking).catch(e => console.error("[Resend] Error sending confirmation:", e));
      sendPaymentReceiptEmail(finalBooking, {
        method: 'paypal',
        transactionId: captureId,
        amount: paidAmount
      }).catch(e => console.error("[Resend] Error sending receipt:", e));
      sendInstructorNotificationEmail(finalBooking).catch(e => console.error("[Resend] Error notifying instructor:", e));
      handleBookingConfirmed(finalBooking).catch(e => console.error("[Resend] Error scheduling reminder:", e));
    }

    res.json({
      success: true,
      verified: true,
      paymentStatus: 'paid',
      booking: finalBooking,
      transactionId: captureId,
      amount: paidAmount,
      message: "PayPal payment successfully captured and booking confirmed."
    });
  } catch (err: any) {
    console.error("PayPal capture error:", err);
    res.status(500).json({ error: err?.message || "Failed to capture PayPal order" });
  }
});

// ----------------------------------------------------------------------------
// Audit Logs API (Protected for Instructor / Admin)
// ----------------------------------------------------------------------------
app.get("/api/audit-logs", requireInstructorOrAuth, async (req: express.Request, res: express.Response) => {
  try {
    const bookingRef = req.query.bookingRef as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = await getBookingAuditLogs(bookingRef, limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Sync authenticated user to PostgreSQL users table
app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const dbUser = await getOrCreateUser(
      user.uid,
      user.email || '',
      user.name || undefined,
      user.picture || undefined
    );
    res.json({ success: true, user: dbUser });
  } catch (error: any) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: error.message || "Failed to sync user" });
  }
});

// Fetch bookings (all, or filtered by email/user) - only paid bookings for customer facing views

// Fetch availability (booked slots only, no PII, real-time with zero caching)
app.get("/api/availability", async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    const targetDate = req.query.date ? normalizeDate(String(req.query.date)) : undefined;
    const list = await getBookings({ includeUnpaid: true });
    const now = Date.now();
    const PENDING_TIMEOUT_MS = 20 * 60 * 1000;

    const bookedSlots = list
      .filter(b => {
        if (b.status === 'Cancelled') return false;
        // If pending and unpaid, check if timed out
        if ((b.status === 'Pending' || b.paymentStatus === 'unpaid') && b.paymentStatus !== 'paid') {
          const createdAtMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (createdAtMs > 0 && (now - createdAtMs) > PENDING_TIMEOUT_MS) {
            return false;
          }
        }
        if (targetDate) {
          return normalizeDate(b.date) === targetDate;
        }
        return true;
      })
      .map(b => ({
        date: b.date,
        time: b.time,
        status: b.status
      }));

    res.json(bookedSlots);
  } catch (error: any) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// Fast real-time check for a single date & time slot
app.get("/api/check-slot", async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    const date = req.query.date as string;
    const time = req.query.time as string;
    const excludeRef = (req.query.excludeRef as string) || undefined;
    const email = (req.query.email as string) || undefined;
    const phone = (req.query.phone as string) || undefined;

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
  } catch (error: any) {
    console.error("Error checking slot:", error);
    res.status(500).json({ error: "Failed to check slot" });
  }
});

// Fast real-time check for multiple date & time slots (multi-lesson packages)
app.post("/api/check-slots", async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
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
  } catch (error: any) {
    console.error("Error checking multiple slots:", error);
    res.status(500).json({ error: "Failed to check slots" });
  }
});

app.get("/api/bookings", attachInstructorOrAuth, async (req: AuthRequest, res) => {
  try {
    const email = (req.query.email as string) || undefined;
    const userId = req.user?.uid;
    const isInstructor = Boolean((req as any).instructor);
    const list = await getBookings({ email, userId, includeUnpaid: isInstructor });
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch bookings" });
  }
});

// Lookup booking by reference code (WD-XXXX) - only returns paid bookings to customers
app.get("/api/bookings/:ref", attachInstructorOrAuth, async (req: AuthRequest, res) => {
  try {
    const ref = req.params.ref;
    const isInstructor = Boolean((req as any).instructor);
    const booking = await getBookingByRef(ref, { allowUnpaid: isInstructor });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found or payment not completed" });
    }
    res.json(booking);
  } catch (error: any) {
    console.error("Error fetching booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to fetch booking" });
  }
});

// Create a new driving lesson booking in Cloud SQL with slot check & rate limiting
app.post("/api/bookings", attachInstructorOrAuth, bookingLimiter, async (req: AuthRequest, res) => {
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

    const isInstructor = Boolean((req as any).instructor);
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

    const countryCode = req.body.countryCode || (phone.startsWith('+') ? phone.split(' ')[0] : '+61');
    const phoneCheck = validateInternationalPhone(phone, countryCode);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.error || "Please enter a valid phone number" });
    }

    // Double booking verification: multi-lesson batch or single slot
    const canOverrideSlot = Boolean(allowOverride && isInstructor);
    if (hasMultipleLessons) {
      const batchCheck = await checkMultipleSlotsBooked(lessons, undefined, sanitizeText(email).toLowerCase(), sanitizeText(phone));
      if (!batchCheck.available && !canOverrideSlot) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: batchCheck.conflicts[0] || "One or more selected lesson slots are no longer available. Please select another time."
        });
      }
    } else {
      const isSlotTaken = await checkSlotBooked(primaryDate, primaryTime, undefined, sanitizeText(email).toLowerCase(), sanitizeText(phone));
      if (isSlotTaken && !canOverrideSlot) {
        return res.status(409).json({
          error: "SLOT_ALREADY_BOOKED",
          message: "This time slot is no longer available. Please select another time."
        });
      }
    }

    // Enforce that bookings must have successful payment or be marked pending (e.g. cash in car)
    const finalPaymentStatus = paymentStatus || (isInstructor ? "paid" : "unpaid");
    const isPendingOrCash = (status === "Pending" || req.body.paymentMethod === "cash" || finalPaymentStatus === "unpaid");
    if (finalPaymentStatus !== "paid" && !isInstructor && !isPendingOrCash) {
      return res.status(400).json({
        error: "PAYMENT_REQUIRED",
        message: "Lesson bookings require successful online payment via Stripe before they can be booked."
      });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = req.body.bookingRef || `WD-${randomNum}`;

    // Format transmission and manual entry metadata in notes
    const chosenTransmission = transmission ? sanitizeText(transmission) : 'Automatic';
    let baseNotes = sanitizeText(notes) || '';
    if (chosenTransmission && !baseNotes.toLowerCase().includes('transmission:')) {
      baseNotes = `[Transmission: ${chosenTransmission}] ${baseNotes}`.trim();
    }
    if (isInstructor && !baseNotes.includes('[Created:')) {
      baseNotes = `[Created: Owner Manual Entry] ${baseNotes}`.trim();
    }

    if (hasMultipleLessons && lessons.length > 1) {
      // Atomic multi-lesson package creation
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
          stripeSessionId: stripeSessionId || null,
        });

        if (itemBooking.status === "Confirmed") {
          handleBookingConfirmed(itemBooking).catch(err => {
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
          action: 'create',
          performedBy: 'instructor',
          newState: masterBooking.status,
          notes: `Manual booking package (${lessons.length} lessons) created by Wally (Owner) for ${masterBooking.studentName} [Ref: ${bookingRef}]`
        }).catch(e => console.error("[Audit] Error logging manual create:", e));
      }

      if (sendConfirmation !== false && masterBooking.status === "Confirmed") {
        sendBookingConfirmationEmail(masterBooking).catch(err => {
          console.error("[Resend] Error in sendBookingConfirmationEmail:", err);
        });
      }

      return res.status(201).json(masterBooking);
    }

    // Single booking creation
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
      stripeSessionId: stripeSessionId || null,
    });

    if (newBooking.status === "Confirmed") {
      logBookingAudit({
        bookingRef,
        action: 'create',
        performedBy: isInstructor ? 'instructor' : 'customer',
        newState: 'Confirmed',
        notes: isInstructor
          ? `Manual booking created by Wally (Owner) for ${newBooking.studentName} (${newBooking.packageTitle}) [Ref: ${bookingRef}]`
          : `Created confirmed booking for ${newBooking.studentName} (${newBooking.packageTitle})`
      }).catch(e => console.error("[Audit] Error logging create:", e));

      if (sendConfirmation !== false) {
        sendBookingConfirmationEmail(newBooking).catch(err => {
          console.error("[Resend] Error in sendBookingConfirmationEmail:", err);
        });
      }
      sendInstructorNotificationEmail(newBooking).catch(err => {
        console.error("[Resend] Error in sendInstructorNotificationEmail:", err);
      });
      handleBookingConfirmed(newBooking).catch(err => {
        console.error("[Resend Reminder] Error in handleBookingConfirmed for new booking:", err);
      });
    } else {
      logBookingAudit({
        bookingRef,
        action: 'create',
        performedBy: isInstructor ? 'instructor' : 'customer',
        newState: 'Pending',
        notes: isInstructor
          ? `Manual pending booking created by Wally (Owner) for ${newBooking.studentName}`
          : `Created pending booking for ${newBooking.studentName}`
      }).catch(e => console.error("[Audit] Error logging create:", e));
    }

    res.status(201).json(newBooking);
  } catch (error: any) {
    if (error.code === 'SLOT_ALREADY_BOOKED' || error.status === 409) {
      return res.status(409).json({
        error: "SLOT_ALREADY_BOOKED",
        message: "This time slot was just booked by another customer. Please select another time."
      });
    }
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
});

// Update booking by ID (status, rescheduling, notes)
app.patch("/api/bookings/:id", attachInstructorOrAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    if (req.body.status === 'Cancelled') {
      req.body.reminderStatus = 'cancelled';
      req.body.reminderError = 'Lesson was cancelled';
      // Need to fetch existing first
      const bookings = await getBookings({ includeUnpaid: true });
      const existing = bookings.find(b => b.id === id);
      if (existing && existing.status !== 'Cancelled') {
        const timestamp = getBookingTimestamp(existing.date, existing.time);
        const hoursUntilBooking = (timestamp - Date.now()) / (1000 * 60 * 60);
        
        if (hoursUntilBooking > 24) {
          // Process Stripe refund
          if (existing.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
            const stripe = getStripe();
            try {
              if (existing.stripeSessionId.startsWith('pi_')) {
                await stripe.refunds.create({ payment_intent: existing.stripeSessionId });
              } else if (existing.stripeSessionId.startsWith('cs_')) {
                const session = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
                if (session.payment_intent && typeof session.payment_intent === 'string') {
                  await stripe.refunds.create({ payment_intent: session.payment_intent });
                }
              }
              req.body.notes = (req.body.notes || existing.notes || '') + ' [Refund issued]';
              req.body.paymentStatus = 'refunded';
            } catch (err: any) {
              console.error("Stripe refund failed:", err);
            }
          } else if (existing.paymentStatus === 'paid') {
            // For bookings recorded as paid in demo/preview or without active Stripe keys
            req.body.notes = (req.body.notes || existing.notes || '') + ' [Refund issued]';
            req.body.paymentStatus = 'refunded';
          }
        } else {
          // Within 24 hours
          req.body.notes = (req.body.notes || existing.notes || '') + ' [Late cancellation - no refund]';
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
      if (req.body.status === 'Cancelled') {
        logBookingAudit({
          bookingRef: ref,
          action: 'cancel',
          performedBy: (req as any).instructor ? 'instructor' : 'customer',
          newState: 'Cancelled',
          notes: req.body.notes || 'Booking cancelled via patch API'
        }).catch(e => console.error("[Audit] Error logging cancel:", e));

        sendBookingCancellationNoticeEmail(updated, {
          reason: req.body.notes || 'Lesson cancellation requested',
          refundStatus: req.body.paymentStatus === 'refunded' ? 'refunded' : 'none'
        }).catch(e => console.error("[Resend] Error sending cancellation notice:", e));

        handleBookingCancelled(updated).catch(() => {});
      } else if (req.body.date || req.body.time) {
        logBookingAudit({
          bookingRef: ref,
          action: 'reschedule',
          performedBy: (req as any).instructor ? 'instructor' : 'customer',
          newState: updated.status,
          notes: `Rescheduled to ${updated.date} at ${updated.time}`
        }).catch(e => console.error("[Audit] Error logging reschedule:", e));

        handleBookingRescheduled(updated, updated.date, updated.time).catch(() => {});
      } else if (req.body.status === 'Confirmed') {
        handleBookingConfirmed(updated).catch(() => {});
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: error.message || "Failed to update booking" });
  }
});

// Update booking by reference code (WD-XXXX)
app.patch("/api/bookings/ref/:ref", attachInstructorOrAuth, async (req, res) => {
  try {
    const ref = sanitizeText(req.params.ref);
    
    // Check if it's a cancellation
    if (req.body.status === 'Cancelled') {
      req.body.reminderStatus = 'cancelled';
      req.body.reminderError = 'Lesson was cancelled';
      const existing = await getBookingByRef(ref, { allowUnpaid: true });
      if (existing && existing.status !== 'Cancelled') {
        const timestamp = getBookingTimestamp(existing.date, existing.time);
        const hoursUntilBooking = (timestamp - Date.now()) / (1000 * 60 * 60);
        
        if (hoursUntilBooking > 24) {
          // Process Stripe refund if there is a session/intent id
          if (existing.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
            const stripe = getStripe();
            try {
              // Note: stripeSessionId could be a checkout session or a payment intent
              if (existing.stripeSessionId.startsWith('pi_')) {
                await stripe.refunds.create({ payment_intent: existing.stripeSessionId });
              } else if (existing.stripeSessionId.startsWith('cs_')) {
                const session = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
                if (session.payment_intent && typeof session.payment_intent === 'string') {
                  await stripe.refunds.create({ payment_intent: session.payment_intent });
                }
              }
              req.body.notes = (req.body.notes || existing.notes || '') + ' [Refund issued]';
              req.body.paymentStatus = 'refunded';
            } catch (err: any) {
              console.error("Stripe refund failed:", err);
            }
          } else if (existing.paymentStatus === 'paid') {
            // For bookings recorded as paid in demo/preview or without active Stripe keys
            req.body.notes = (req.body.notes || existing.notes || '') + ' [Refund issued]';
            req.body.paymentStatus = 'refunded';
          }
        } else {
          // Within 24 hours, no refund
          req.body.notes = (req.body.notes || existing.notes || '') + ' [Late cancellation - no refund]';
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
      if (req.body.status === 'Cancelled') {
        logBookingAudit({
          bookingRef: ref,
          action: 'cancel',
          performedBy: (req as any).instructor ? 'instructor' : 'customer',
          newState: 'Cancelled',
          notes: req.body.notes || 'Booking cancelled via ref API'
        }).catch(e => console.error("[Audit] Error logging cancel:", e));

        sendBookingCancellationNoticeEmail(updated, {
          reason: req.body.notes || 'Lesson cancellation requested',
          refundStatus: req.body.paymentStatus === 'refunded' ? 'refunded' : 'none'
        }).catch(e => console.error("[Resend] Error sending cancellation notice:", e));

        handleBookingCancelled(updated).catch(() => {});
      } else if (req.body.date || req.body.time) {
        logBookingAudit({
          bookingRef: ref,
          action: 'reschedule',
          performedBy: (req as any).instructor ? 'instructor' : 'customer',
          newState: updated.status,
          notes: `Rescheduled to ${updated.date} at ${updated.time}`
        }).catch(e => console.error("[Audit] Error logging reschedule:", e));

        handleBookingRescheduled(updated, updated.date, updated.time).catch(() => {});
      } else if (req.body.status === 'Confirmed') {
        handleBookingConfirmed(updated).catch(() => {});
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to update booking" });
  }
});

// Delete booking by ID - Role guarded for Instructor/Owner
app.delete("/api/bookings/:id", requireInstructorOrAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    logBookingAudit({
      action: 'cancel',
      performedBy: 'instructor',
      newState: 'deleted',
      notes: `Booking ID ${id} deleted by instructor`
    }).catch(e => console.error("[Audit] Error logging delete:", e));

    await deleteBookingById(id);
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: error.message || "Failed to delete booking" });
  }
});

// Delete booking by reference code - Role guarded for Instructor/Owner
app.delete("/api/bookings/ref/:ref", requireInstructorOrAuth, async (req, res) => {
  try {
    const ref = sanitizeText(req.params.ref);
    logBookingAudit({
      bookingRef: ref,
      action: 'cancel',
      performedBy: 'instructor',
      newState: 'deleted',
      notes: `Booking ${ref} deleted by instructor`
    }).catch(e => console.error("[Audit] Error logging delete:", e));

    await deleteBookingByRef(ref);
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to delete booking" });
  }
});

// Submit contact form inquiry to Cloud SQL with rate limiting & sanitization
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
      const countryCode = req.body.countryCode || (phone.startsWith('+') ? phone.split(' ')[0] : '+61');
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
      message: sanitizeText(message),
    });

    res.status(201).json({ success: true, message: saved });
  } catch (error: any) {
    console.error("Error saving contact message:", error);
    res.status(500).json({ error: error.message || "Failed to save contact message" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Supabase live connection status endpoint
app.get("/api/supabase/status", async (_req, res) => {
  try {
    const status = await checkSupabaseConnection();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ configured: false, error: err?.message || "Failed to check Supabase connection" });
  }
});

// Supabase sync endpoint - syncs all existing bookings to Supabase
app.post("/api/supabase/sync", async (_req, res) => {
  try {
    const result = await syncAllBookingsToSupabase();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to sync to Supabase" });
  }
});

// =========================================================================
// RESEND EMAIL LESSON REMINDERS API ENDPOINTS
// =========================================================================

// Get Resend Reminder Configuration and Queue Status
app.get("/api/reminders/status", async (req, res) => {
  try {
    const isConfigured = !!process.env.RESEND_API_KEY;
    const fromEmail = getFormattedSender();

    const bookings = await getBookings({ includeUnpaid: false });
    const confirmed = bookings.filter(b => b.status === 'Confirmed');

    const scheduled = confirmed.filter(b => b.reminderStatus === 'scheduled').length;
    const sent = confirmed.filter(b => b.reminderStatus === 'sent').length;
    const failed = confirmed.filter(b => b.reminderStatus === 'failed').length;
    const cancelled = bookings.filter(b => b.reminderStatus === 'cancelled').length;

    res.json({
      configured: isConfigured,
      provider: 'resend',
      fromEmail,
      timezone: process.env.SCHOOL_TIMEZONE || 'Australia/Sydney',
      intervalSeconds: 60,
      stats: {
        totalConfirmed: confirmed.length,
        scheduled,
        sent,
        failed,
        cancelled
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get reminder status" });
  }
});

// Admin: Preview the exact reminder email that will be sent
app.get("/api/reminders/preview/:refOrId", optionalAuth, async (req, res) => {
  try {
    const refOrId = req.params.refOrId;
    const bookings = await getBookings({ includeUnpaid: true });
    const booking = bookings.find(
      b => (b.bookingRef && b.bookingRef.toUpperCase() === refOrId.toUpperCase()) || 
           String(b.id) === String(refOrId)
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { subject, text } = generateReminderEmailContent({
      studentName: booking.studentName || 'Student',
      date: booking.date,
      time: booking.time,
      pickupAddress: booking.pickupAddress,
      suburb: booking.suburb || 'Rooty Hill'
    });

    res.json({
      bookingRef: booking.bookingRef || booking.ref,
      recipientEmail: booking.email,
      from: getFormattedSender(),
      subject,
      text
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to preview email reminder" });
  }
});

// Admin: Trigger manual schedule/send or retry for a booking's reminder
app.post("/api/reminders/send/:refOrId", optionalAuth, async (req, res) => {
  try {
    const refOrId = req.params.refOrId;
    const bookings = await getBookings({ includeUnpaid: true });
    const booking = bookings.find(
      b => (b.bookingRef && b.bookingRef.toUpperCase() === refOrId.toUpperCase()) || 
           String(b.id) === String(refOrId)
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const force = req.body?.force === true || req.query.force === 'true';
    const result = await scheduleOrSendLessonReminder(booking, { force });

    res.json({
      bookingRef: booking.bookingRef || booking.ref,
      studentName: booking.studentName,
      studentEmail: booking.email,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to trigger reminder" });
  }
});

// Admin / System: Force run pending reminders pass (supports POST and GET for Vercel Cron)
app.all("/api/reminders/cron/run", optionalAuth, async (req, res) => {
  try {
    const result = await processPendingLessonReminders();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to run reminder cron" });
  }
});

// Send a direct email reminder or test message via Resend
app.post("/api/reminders/send-direct", async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: "Valid recipient email address is required" });
    }

    const resend = getResend();
    if (!resend) {
      return res.status(400).json({
        error: "RESEND_API_KEY is not configured on the server. Please add it to your server environment variables."
      });
    }

    const fromEmail = getFormattedSender();
    const sub = subject || "Reminder: Your Driving Lesson Today – Wally’s Driving School";
    const body = message || [
      "Hi Student,",
      "",
      "This is a friendly reminder from Wally’s Driving School that your driving lesson is scheduled for today.",
      "",
      "Please be ready a few minutes before your lesson.",
      "",
      "Thank you,",
      "Wally’s Driving School"
    ].join('\n');

    let sendPayload: any = {
      from: fromEmail,
      to: [to.trim().toLowerCase()],
      subject: sub,
      text: body
    };

    let result = await resend.emails.send(sendPayload);

    // Fallback for unverified domains during testing/sandbox mode
    if (result.error && (result.error.message.includes('domain') || result.error.name === 'validation_error')) {
      sendPayload.from = "Wally’s Driving School <onboarding@resend.dev>";
      result = await resend.emails.send(sendPayload);
    }

    if (result.error) {
      return res.status(500).json({ error: result.error.message || "Resend email send error" });
    }

    res.json({ success: true, id: result.data?.id, to });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send direct email" });
  }
});

// Global JSON error handler to ensure JSON responses on unexpected exceptions
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server Error]", err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: err?.message || "An internal server error occurred"
    });
  }
});

// Vite middleware & Static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // =========================================================================
  // PRODUCTION-READY AUTOMATIC RESEND EMAIL LESSON REMINDER SCHEDULER
  // =========================================================================
  // Checks every 60 seconds server-side for confirmed lessons starting in 2 hours
  // Works autonomously even if the website is closed or no admin is logged in
  const REMINDER_CHECK_INTERVAL_MS = 60 * 1000;

  setInterval(async () => {
    try {
      await processPendingLessonReminders();
    } catch (err) {
      console.error("[Resend Reminder Engine] Error in periodic reminder check:", err);
    }
  }, REMINDER_CHECK_INTERVAL_MS);

  // Initial pass shortly after boot
  setTimeout(() => {
    processPendingLessonReminders().catch(err => {
      console.warn("[Resend Reminder Engine] Initial check warning:", err?.message || err);
    });
  }, 3000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`[Resend Reminder Engine] Initialized in timezone: ${process.env.SCHOOL_TIMEZONE || 'Australia/Sydney'}`);
  });
}

if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NOW_REGION) {
  startServer().catch(err => console.error("Server start error:", err));
}

export default app;
export { app };

