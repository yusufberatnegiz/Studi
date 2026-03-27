"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function checkEmailExists(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  // Paginate through all users to find a match.
  // perPage=1000 is the maximum Supabase allows per page.
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return false;
    if (data.users.some((u) => u.email?.toLowerCase() === normalizedEmail)) return true;
    if (data.users.length < 1000) break; // Last page reached
    page++;
  }
  return false;
}
