"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function sendPasswordReset(
  email: string
): Promise<{ error: string } | { success: true }> {
  const admin = createAdminClient();

  // Check if the email is registered using admin client
  const { data, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error("[sendPasswordReset] Could not check users:", listError);
    return { error: "Something went wrong. Please try again." };
  }

  const exists = data.users.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!exists) {
    return { error: "No account found with that email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://www.exai.study/update-password",
  });

  if (error) {
    console.error("[sendPasswordReset] Reset email error:", error);
    return { error: "Could not send reset email. Please try again." };
  }

  return { success: true };
}
