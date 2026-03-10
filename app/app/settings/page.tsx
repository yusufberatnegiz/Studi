import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./theme-toggle";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          Manage your account and preferences.
        </p>
      </div>

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Choose between light, dark, or follow your system setting.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {user.email ?? "—"}
            </p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
              {profile?.plan ?? "free"}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
