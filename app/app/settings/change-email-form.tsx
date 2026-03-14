"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (email.toLowerCase() === currentEmail.toLowerCase()) {
      setError("That is already your current email.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("taken") || msg.includes("in use") || msg.includes("registered")) {
        setError("This email is already in use by another account.");
      } else if (msg.includes("invalid") || msg.includes("valid email")) {
        setError("Please enter a valid email address.");
      } else if (msg.includes("rate") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Could not update email. Please try again.");
      }
      return;
    }

    setSuccess(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        Change email
      </button>
    );
  }

  if (success) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400 text-right">
        Confirmation sent to new email. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2 w-full max-w-xs">
      <input
        type="email"
        placeholder="New email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setEmail(""); }}
          disabled={loading}
          className="text-sm font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
