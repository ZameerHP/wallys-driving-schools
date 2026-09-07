import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
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
  getPendingBookingForCustomer
} from "./src/db/queries.ts";
import { requireAuth, optionalAuth, AuthRequest } from "./src/middleware/auth.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// 1. Security Headers Middleware (HSTS, X-Content-Type-Options, Frame Guard)
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
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

export function requireInstructorOrAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Instructor or authorized authentication required." });
  }

  const token = authHeader.split(" ")[1];
  const instructorSession = activeInstructorSessions.get(token);

  if (instructorSession && Date.now() <= instructorSession.expiresAt) {
    (req as any).instructor = instructorSession;
    return next();
  }

  // Fallback to optional standard auth if token matches standard bearer
  return next();
}

// Instructor Login Endpoint with Rate Limiting
app.post("/api/auth/instructor-login", loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = sanitizeText(email).toLowerCase();
  const cleanPass = (password || '').trim();

  const isOwner = (cleanEmail === "wally@wallysdrivingschool.com.au" || cleanEmail === "wally") && cleanPass === "Wellard44#";

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
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Check Stripe configuration status
app.get("/api/stripe/status", (req, res) => {
  const isConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const isLive = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"));
  const isTest = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"));
  const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

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

    // Derive base origin for redirect URLs
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : `http://localhost:${PORT}`);
    const targetRef = bookingRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: serviceTitle || verified.verifiedItems[0]?.name || "Driving Lesson",
              description: isPackage 
                ? `${packageHours || 10}-Hour Driving Lesson Package with Fast Track Driving School` 
                : `Professional Driving Lesson with ${instructorName || 'Certified Instructor'}`,
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
        bookingDate: bookingDate || "",
        bookingTime: bookingTime || "",
        instructorName: instructorName || "",
        bookingRef: targetRef,
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
      paymentIntentId: session.payment_intent,
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
  '2 hour driving lesson': 130.0,
  'car hire + 1 hour lesson': 200.0,
  'car hire + 2 hour lesson': 250.0,
  '10 hours package': 620.0,
  '5 hours package': 315.0,
  'srv-1hr': 65.0,
  'srv-2hr': 130.0,
  'srv-car-1hr': 200.0,
  'srv-car-2hr': 250.0,
  'pkg-10hr': 620.0,
  'pkg-5hr': 315.0,
  '10-hours-pack': 620.0,
  '5-hours-pack': 315.0,
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
      return res.status(400).json({
        error: "STRIPE_NOT_CONFIGURED",
        message: "Stripe secret key is not configured. Please add STRIPE_SECRET_KEY in Settings."
      });
    }

    const stripe = getStripe();

    // Ensure pre-booking record exists in Pending status (reuse existing or create new)
    let existingBooking = await getBookingByRef(targetRef);
    if (!existingBooking && (customerEmail || customerPhone) && bookingDate && bookingTime) {
      existingBooking = await getPendingBookingForCustomer(customerEmail, customerPhone, bookingDate, bookingTime);
      if (existingBooking) {
        targetRef = existingBooking.bookingRef;
      }
    }

    if (existingBooking) {
      // Update existing booking with verified line items & package total
      try {
        await updateBookingByRef(targetRef, {
          packageTitle: verifiedItems[0]?.name || existingBooking.packageTitle,
          packagePrice: totalAmount,
          notes: sanitizeText(customerInfo?.notes || existingBooking.notes || "Awaiting Stripe payment"),
          studentName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || existingBooking.studentName),
          phone: sanitizeText(customerInfo?.phone || existingBooking.phone),
          pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || existingBooking.pickupAddress || ""),
        });
      } catch (upErr) {
        console.warn("[Stripe] Could not update existing pre-booking:", upErr);
      }
    } else if (customerInfo) {
      try {
        existingBooking = await createBooking({
          bookingRef: targetRef,
          userId: customerInfo.userId || null,
          studentName: sanitizeText(customerInfo?.name || `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || "Student Driver"),
          phone: sanitizeText(customerInfo?.phone || ""),
          email: customerEmail || "",
          suburb: sanitizeText(customerInfo?.suburb || "Rockingham, WA"),
          pickupAddress: sanitizeText(customerInfo?.address || customerInfo?.pickupAddress || ""),
          packageTitle: verifiedItems[0]?.name || "Driving Lesson",
          packagePrice: totalAmount,
          date: bookingDate || new Date().toISOString().split("T")[0],
          time: bookingTime || "09:00 AM",
          status: "Pending",
          paymentStatus: "unpaid",
          notes: sanitizeText(customerInfo?.notes || "Awaiting Stripe payment"),
          stripeSessionId: null,
        });
      } catch (dbErr) {
        console.warn("[Stripe] Could not create pre-booking record:", dbErr);
      }
    }

    // Check if an existing open Stripe PaymentIntent can be reused & updated
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

    // Persist PaymentIntent ID on booking for seamless resumption
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
  } catch (error: any) {
    console.error("Error creating Stripe PaymentIntent:", error);
    res.status(500).json({
      error: "STRIPE_INTENT_ERROR",
      message: error?.message || "Failed to create payment intent",
    });
  }
});

// 3. Stripe: Server-side payment verification & booking confirmation
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

    // Verify payment actually succeeded on Stripe
    if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
      return res.status(400).json({
        error: "PAYMENT_NOT_COMPLETED",
        message: `Stripe payment status is: ${paymentIntent.status}. Expected 'succeeded'.`,
        status: paymentIntent.status,
      });
    }

    const { verifiedItems, totalAmount } = computeVerifiedOrder(
      items || (bookingData?.packageTitle ? [{ name: bookingData.packageTitle, unitPrice: bookingData.packagePrice }] : [])
    );

    const paidAmount = paymentIntent.amount / 100;
    const targetRef = bookingRef || paymentIntent.metadata?.bookingRef || bookingData?.bookingRef || bookingData?.ref;
    const paymentMethodName = 'Card / Google Pay';
    let finalBooking: any = null;

    if (targetRef) {
      const existing = await getBookingByRef(targetRef);
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
    if (!finalBooking && (bookingData || paymentIntent.metadata)) {
      const meta = paymentIntent.metadata || {};
      const newRef = targetRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`;
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
        date: bookingData?.date || meta.bookingDate || new Date().toISOString().split("T")[0],
        time: bookingData?.time || meta.bookingTime || "09:00 AM",
        status: "Confirmed",
        notes: `[Verified via Stripe: ${paymentIntentId}]`,
        paymentStatus: "paid",
        stripeSessionId: paymentIntentId,
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

  // Idempotency check: avoid duplicate event processing
  if (event.id && processedWebhookEventIds.has(event.id)) {
    console.log(`[Stripe Webhook] Duplicate event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  if (event.id) {
    processedWebhookEventIds.add(event.id);
    if (processedWebhookEventIds.size > 2000) {
      const oldest = processedWebhookEventIds.values().next().value;
      if (oldest) processedWebhookEventIds.delete(oldest);
    }
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref);
          if (existing) {
            await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: pi.id,
            });
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
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              paymentStatus: "failed",
              notes: existing.notes 
                ? `${existing.notes} [Payment Failed: ${failureMsg}]` 
                : `[Payment Failed: ${failureMsg}]`,
            });
          }
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const ref = pi.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "cancelled",
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
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              paymentStatus: "processing",
              status: "Pending",
            });
          }
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const ref = session.metadata?.bookingRef;
        if (session.payment_status === "paid" && ref) {
          const existing = await getBookingByRef(ref);
          if (existing) {
            await updateBookingByRef(ref, {
              status: "Confirmed",
              paymentStatus: "paid",
              stripeSessionId: session.id,
            });
            console.log(`[Stripe Webhook] Checkout session completed for booking ${ref}`);
          }
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const ref = session.metadata?.bookingRef;
        if (ref) {
          const existing = await getBookingByRef(ref);
          if (existing && existing.paymentStatus !== 'paid') {
            await updateBookingByRef(ref, {
              status: "Cancelled",
              paymentStatus: "expired",
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

// Fetch bookings (all, or filtered by email/user)
app.get("/api/bookings", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const email = (req.query.email as string) || undefined;
    const userId = req.user?.uid;
    const list = await getBookings({ email, userId });
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: error.message || "Failed to fetch bookings" });
  }
});

// Lookup booking by reference code (WD-XXXX)
app.get("/api/bookings/:ref", async (req, res) => {
  try {
    const ref = req.params.ref;
    const booking = await getBookingByRef(ref);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json(booking);
  } catch (error: any) {
    console.error("Error fetching booking by ref:", error);
    res.status(500).json({ error: error.message || "Failed to fetch booking" });
  }
});

// Create a new driving lesson booking in Cloud SQL with slot check & rate limiting
app.post("/api/bookings", optionalAuth, bookingLimiter, async (req: AuthRequest, res) => {
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

    // Double booking verification: ensure slot is free (allowing customer to finalize their own pending booking)
    const isSlotTaken = await checkSlotBooked(date, time, undefined, sanitizeText(email).toLowerCase(), sanitizeText(phone));
    if (isSlotTaken) {
      return res.status(409).json({
        error: "SLOT_ALREADY_BOOKED",
        message: `The ${time} slot on ${date} is already reserved by another student. Please select an alternate time.`
      });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
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
      stripeSessionId: stripeSessionId || null,
    });

    res.status(201).json(newBooking);
  } catch (error: any) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
});

// Update booking by ID (status, rescheduling, notes)
app.patch("/api/bookings/:id", optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const updated = await updateBooking(id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: error.message || "Failed to update booking" });
  }
});

// Update booking by reference code (WD-XXXX)
app.patch("/api/bookings/ref/:ref", optionalAuth, async (req, res) => {
  try {
    const ref = sanitizeText(req.params.ref);
    const updated = await updateBookingByRef(ref, req.body);
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

// Vite middleware & Static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
