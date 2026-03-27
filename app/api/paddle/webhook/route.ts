import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Health check — GET /api/paddle/webhook
// Lets you verify the route is deployed and env vars are set.
// ---------------------------------------------------------------------------

export async function GET() {
  const missing: string[] = [];
  if (!process.env.PADDLE_WEBHOOK_SECRET) missing.push("PADDLE_WEBHOOK_SECRET");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");

  if (missing.length > 0) {
    console.error("[paddle/webhook] GET health check — MISSING ENV VARS:", missing);
    return NextResponse.json({ ok: false, missing }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Paddle webhook route is ready." });
}

// ---------------------------------------------------------------------------
// Signature verification
// Paddle-Signature header format: ts=<timestamp>;h1=<hex-signature>
// Signed payload: <timestamp>:<raw-body>
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];

  if (!ts || !h1) {
    console.error("[paddle/webhook] Signature header missing ts or h1. Header:", signatureHeader);
    return false;
  }

  const computed = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(h1, "hex"));
  } catch (e) {
    console.error("[paddle/webhook] timingSafeEqual error (likely length mismatch):", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Custom data shape passed at checkout
// ---------------------------------------------------------------------------

interface CheckoutCustomData {
  userId?: string;
  purchaseType?: "course" | "premium";
  courseId?: string;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("[paddle/webhook] POST received");

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[paddle/webhook] PADDLE_WEBHOOK_SECRET is not set — check Vercel env vars");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[paddle/webhook] SUPABASE_SERVICE_ROLE_KEY is not set — check Vercel env vars");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  // Read raw body before any parsing — required for signature verification
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("paddle-signature") ?? "";

  console.log("[paddle/webhook] Signature header present:", !!signatureHeader);

  if (!signatureHeader) {
    console.error("[paddle/webhook] Missing Paddle-Signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const valid = verifySignature(rawBody, signatureHeader, webhookSecret);
  if (!valid) {
    console.error("[paddle/webhook] Signature verification FAILED — check PADDLE_WEBHOOK_SECRET matches Paddle dashboard");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log("[paddle/webhook] Signature verified OK");

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("[paddle/webhook] Failed to parse JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type as string;
  const data = event.data as Record<string, unknown>;

  console.log("[paddle/webhook] Event type:", eventType);

  try {
    switch (eventType) {
      // Paddle fires transaction.completed for one-time payments.
      // Some Paddle accounts also fire transaction.paid — handle both.
      case "transaction.completed":
      case "transaction.paid":
        await handleTransactionCompleted(data);
        break;

      case "subscription.activated":
      case "subscription.updated":
        await handleSubscriptionActivated(data);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(data);
        break;

      default:
        console.log("[paddle/webhook] Unhandled event type (safe to ignore):", eventType);
        break;
    }
  } catch (err) {
    console.error(`[paddle/webhook] Error handling event ${eventType}:`, err);
    // Return 500 so Paddle retries
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleTransactionCompleted(data: Record<string, unknown>) {
  // custom_data can be a nested object or null
  const customData = (data.custom_data ?? {}) as CheckoutCustomData;
  const { userId, purchaseType, courseId } = customData;

  console.log("[paddle/webhook] transaction.completed — custom_data:", customData);

  if (!userId) {
    console.error("[paddle/webhook] transaction.completed — missing userId in custom_data. transaction_id:", data.id);
    return;
  }

  const supabase = createAdminClient();

  if (purchaseType === "course") {
    if (!courseId) {
      console.error("[paddle/webhook] transaction.completed — course purchase missing courseId. custom_data:", customData);
      return;
    }

    const transactionId = data.id as string | undefined;
    console.log("[paddle/webhook] Upgrading course", courseId, "for user", userId);

    const { error } = await supabase
      .from("courses")
      .update({
        is_premium: true,
        ...(transactionId ? { paddle_transaction_id: transactionId } : {}),
      })
      .eq("id", courseId)
      .eq("user_id", userId);

    if (error) {
      console.error("[paddle/webhook] Supabase error upgrading course:", courseId, error);
      throw error;
    }

    console.log("[paddle/webhook] Course", courseId, "upgraded to premium for user", userId);

  } else if (purchaseType === "premium") {
    const customerId = data.customer_id as string | undefined;
    console.log("[paddle/webhook] Upgrading profile to premium for user", userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        plan: "premium",
        ...(customerId ? { paddle_customer_id: customerId } : {}),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[paddle/webhook] Supabase error upgrading profile to premium:", userId, error);
      throw error;
    }

    console.log("[paddle/webhook] Profile upgraded to premium for user", userId);

  } else {
    console.warn("[paddle/webhook] transaction.completed — unknown purchaseType:", purchaseType, "custom_data:", customData);
  }
}

async function handleSubscriptionActivated(data: Record<string, unknown>) {
  const customData = (data.custom_data ?? {}) as CheckoutCustomData;
  const { userId } = customData;

  console.log("[paddle/webhook] subscription.activated — custom_data:", customData);

  if (!userId) {
    console.warn("[paddle/webhook] subscription.activated — missing userId in custom_data. subscription_id:", data.id);
    return;
  }

  const customerId = data.customer_id as string | undefined;
  const subscriptionId = data.id as string | undefined;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "premium",
      cancel_at_period_end: false,
      ...(customerId ? { paddle_customer_id: customerId } : {}),
      ...(subscriptionId ? { paddle_subscription_id: subscriptionId } : {}),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[paddle/webhook] Supabase error activating subscription for user:", userId, error);
    throw error;
  }

  console.log("[paddle/webhook] Subscription activated — user", userId, "is now premium, subscription:", subscriptionId);
}

async function handleSubscriptionCanceled(data: Record<string, unknown>) {
  const customData = (data.custom_data ?? {}) as CheckoutCustomData;
  const { userId } = customData;

  console.log("[paddle/webhook] subscription.canceled — custom_data:", customData);

  if (!userId) {
    console.warn("[paddle/webhook] subscription.canceled — missing userId. subscription_id:", data.id);
    return;
  }

  const supabase = createAdminClient();

  // subscription.canceled fires at end of billing period — safe to downgrade now.
  const { error } = await supabase
    .from("profiles")
    .update({ plan: "free", cancel_at_period_end: false, paddle_subscription_id: null })
    .eq("user_id", userId);

  if (error) {
    console.error("[paddle/webhook] Supabase error downgrading user to free:", userId, error);
    throw error;
  }

  console.log("[paddle/webhook] Subscription canceled — user", userId, "downgraded to free");
}
