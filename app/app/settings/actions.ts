"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function cancelSubscription(): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("paddle_subscription_id")
    .eq("user_id", user.id)
    .single();

  const subscriptionId = profile?.paddle_subscription_id as string | null | undefined;
  if (!subscriptionId) return { error: "No active subscription found." };

  const apiKey = process.env.PADDLE_API_KEY;
  const env = process.env.PADDLE_ENV ?? "sandbox";
  if (!apiKey) return { error: "Billing is not configured." };

  const baseUrl =
    env === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

  const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ effective_from: "next_billing_period" }),
  });

  if (!res.ok) {
    console.error("[cancelSubscription] Paddle API error:", await res.text());
    return { error: "Could not cancel subscription. Please try again." };
  }

  // Do NOT downgrade immediately. Premium access continues until the billing
  // period ends. Paddle fires subscription.canceled at that point, which
  // triggers the actual downgrade via webhook.
  const admin = createAdminClient();
  await admin.from("profiles").update({ cancel_at_period_end: true }).eq("user_id", user.id);

  revalidatePath("/app/settings");
  return { success: true };
}

export async function deleteAccount(confirmation: string): Promise<{ error: string } | { success: true }> {
  if (confirmation !== "DELETE") return { error: "Invalid confirmation." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Delete account error:", error);
    return { error: "Could not delete account. Please try again." };
  }

  return { success: true };
}
