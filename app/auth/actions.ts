"use server";

// Kept temporarily for compatibility with stale clients. Public auth flows must
// never reveal whether an email address is already registered.
export async function checkEmailExists(): Promise<boolean> {
  return false;
}
