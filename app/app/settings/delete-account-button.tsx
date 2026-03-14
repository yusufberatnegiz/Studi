"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount } from "./actions";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteAccount();
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors underline underline-offset-2"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-zinc-300">
        This will permanently delete your account and all associated data. This cannot be undone.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Yes, delete my account"}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setError(null); }}
          disabled={loading}
          className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
