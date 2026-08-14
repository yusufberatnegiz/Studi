"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ResetEmailSchema = z.string().trim().email().max(320);

export async function sendPasswordReset(
  email: string
): Promise<{ error: string } | { success: true }> {
  const parsedEmail = ResetEmailSchema.safeParse(email);
  if (!parsedEmail.success) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
    redirectTo: "https://www.exai.study/update-password",
  });

  if (error) {
    console.error("[sendPasswordReset] Reset email error:", error);
    return { error: "Could not send reset email. Please try again." };
  }

  return { success: true };
}
