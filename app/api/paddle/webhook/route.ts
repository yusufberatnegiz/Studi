import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verifies the Paddle-Signature header using HMAC-SHA256.
 * Header format: ts=<timestamp>;h1=<hex-signature>
 * Signed payload:  <timestamp>:<raw-body>
 */
function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const tsPart = signatureHeader.split(";").find((p) => p.startsWith("ts="));
  const h1Part = signatureHeader.split(";").find((p) => p.startsWith("h1="));

  if (!tsPart || !h1Part) return false;

  const ts = tsPart.slice(3);
  const h1 = h1Part.slice(3);

  const computed = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(h1, "hex"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Custom data shape we pass at checkout
// ---------------------------------------------------------------------------

interface CheckoutCustomData {
  userId?: string;
  purchaseType?: "course" | "premium";
  courseId?: string;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Paddle webhook: PADDLE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  // Read raw body — must not be parsed before verification
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("paddle-signature") ?? "";

  if (!verifySignature(rawBody, signatureHeader, webhookSecret)) {
    console.error("Paddle webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type as string;
  const data = event.data as Record<string, unknown>;

  try {
    switch (eventType) {
      case "transaction.completed":
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
        // Acknowledge unhandled events — do not return 4xx
        break;
    }
  } catch (err) {
    console.error(`Paddle webhook: error handling ${eventType}:`, err);
    // Return 500 so Paddle retries
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * transaction.completed fires for both one-time and first subscription payment.
 * We use custom_data.purchaseType to route to the right provisioning path.
 */
async function handleTransactionCompleted(data: Record<string, unknown>) {
  const customData = (data.custom_data ?? {}) as CheckoutCustomData;
  const { userId, purchaseType, courseId } = customData;

  if (!userId) {
    console.error("Paddle webhook: transaction.completed missing userId in custom_data", data);
    return;
  }

  const supabase = createAdminClient();

  if (purchaseType === "course") {
    if (!courseId) {
      console.error("Paddle webhook: transaction.completed course purchase missing courseId", data);
      return;
    }

    const transactionId = data.id as string | undefined;

    // Idempotent: already premium is fine
    const { error } = await supabase
      .from("courses")
      .update({
        is_premium: true,
        ...(transactionId ? { paddle_transaction_id: transactionId } : {}),
      })
      .eq("id", courseId)
      .eq("user_id", userId);

    if (error) {
      console.error("Paddle webhook: failed to upgrade course", courseId, error);
      throw error;
    }

    console.log(`Paddle webhook: course ${courseId} upgraded for user ${userId}`);

  } else if (purchaseType === "premium") {
    const customerId = data.customer_id as string | undefined;

    const { error } = await supabase
      .from("profiles")
      .update({
        plan: "premium",
        ...(customerId ? { paddle_customer_id: customerId } : {}),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Paddle webhook: failed to upgrade profile to premium", userId, error);
      throw error;
    }

    console.log(`Paddle webhook: profile upgraded to premium for user ${userId}`);

  } else {
    console.warn("Paddle webhook: transaction.completed unknown purchaseType", customData);
  }
}

/**
 * subscription.activated fires when a subscription becomes active.
 * Also handles subscription.updated (plan changes, renewals).
 */
async function handleSubscriptionActivated(data: Record<string, unknown>) {
  const customData = (data.custom_data ?? {}) as CheckoutCustomData;
  const { userId } = customData;

  if (!userId) {
    console.warn("Paddle webhook: subscription event missing userId in custom_data");
    return;
  }

  const customerId = data.customer_id as string | undefined;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "premium",
      ...(customerId ? { paddle_customer_id: customerId } : {}),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Paddle webhook: failed to activate subscription for user", userId, error);
    throw error;
  }

  console.log(`Paddle webhook: subscription activated for user ${userId}`);
}

/**
 * subscription.canceled — downgrade user back to free plan.
 */
async function handleSubscriptionCanceled(data: Record<string, unknown>) {
  const customData = (data.custom_data ?? {}) as CheckoutCustomData;
  const { userId } = customData;

  if (!userId) {
    console.warn("Paddle webhook: subscription.canceled missing userId in custom_data");
    return;
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ plan: "free" })
    .eq("user_id", userId);

  if (error) {
    console.error("Paddle webhook: failed to downgrade user to free", userId, error);
    throw error;
  }

  console.log(`Paddle webhook: subscription canceled, user ${userId} downgraded to free`);
}
