import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

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

  res.json({
    configured: isConfigured,
    mode: isLive ? "live" : isTest ? "test" : isConfigured ? "custom" : "none",
    message: isConfigured 
      ? `Stripe is connected in ${isLive ? 'LIVE' : 'TEST'} mode. Ready to receive real payments.`
      : "Stripe Secret Key not found. Please add STRIPE_SECRET_KEY in Settings."
  });
});

// Create a Stripe Checkout Session for driving lessons
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
      packageHours
    } = req.body;

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({
        error: "STRIPE_NOT_CONFIGURED",
        message: "Stripe API key is not yet set in Settings. Please add your STRIPE_SECRET_KEY to start receiving payments."
      });
    }

    const stripe = getStripe();
    const amountInCents = Math.round(Number(totalAmount || 65) * 100);

    // Derive base origin for redirect URLs
    const origin = req.headers.origin || `http://localhost:${PORT}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: serviceTitle || "Driving Lesson",
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
        serviceTitle: serviceTitle || "",
        pickupAddress: pickupAddress || "",
        bookingDate: bookingDate || "",
        bookingTime: bookingTime || "",
        instructorName: instructorName || "",
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

startServer();
