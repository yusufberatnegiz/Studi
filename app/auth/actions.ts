"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function checkEmailExists(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error || !data) return false;
  return data.users.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}
