import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./theme-toggle";
import PlanUpgradeButton from "./plan-upgrade-button";
import DeleteAccountButton from "./delete-account-button";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const isPremium = profile?.plan != null && profile.plan !== "free";

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      {/* Checkout success banner */}
      {checkout === "success" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-4 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <polyline points="2 9 7 14 16 4" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Payment received</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Your account will be upgraded to Premium shortly. Refresh this page in a few seconds.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-zinc-400">
          Manage your account and preferences.
        </p>
      </div>

      {/* Appearance */}
      <section className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Appearance</h2>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Theme</p>
              <p className="text-xs text-gray-400 dark:text-zinc-400 mt-0.5">
                Choose between light, dark, or follow your system setting.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-700">
          <div className="px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-zinc-400">Email</p>
            <p className="text-sm font-medium text-gray-800 dark:text-zinc-400">
              {user.email ?? "-"}
            </p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-zinc-400">Plan</p>
            {isPremium ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 1l1.2 2.4L9 4.1 7 6l.5 2.9L5 7.5 2.5 8.9 3 6 1 4.1l2.8-.7L5 1z" />
                </svg>
                Premium
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 uppercase tracking-wide">
                Free
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Plan & Billing */}
      {!isPremium && (
        <section className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Plan & Billing</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5l1.9 3.9 4.3 .6-3.1 3 .7 4.3L8 11.1l-3.8 2.2.7-4.3-3.1-3 4.3-.6L8 1.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Upgrade to Premium</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Unlock all courses, max questions, and no file limits.</p>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-1.5">
              {[
                "Unlimited courses",
                "Up to 30 questions per generation",
                "No file size limit on uploads",
                "All current and future premium features",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
                    <polyline points="2 7 5.5 10.5 12 3" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* Price + button */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">$8</span>
                <span className="text-sm text-gray-400 dark:text-zinc-400">/ month</span>
              </div>
              <PlanUpgradeButton
                userId={user.id}
                priceId={process.env.PADDLE_PRICE_ID_PREMIUM ?? ""}
              />
            </div>
          </div>
        </section>
      )}

      {/* Delete account */}
      <div className="pt-2">
        <DeleteAccountButton />
      </div>
    </main>
  );
}
