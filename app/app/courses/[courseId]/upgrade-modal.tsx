"use client";

import { useState } from "react";
import { getPaddleInstance } from "@paddle/paddle-js";

type Props = {
  courseId: string;
  isPremium: boolean;
  userId: string;
  priceId: string;
};

export default function UpgradeModal({ courseId, isPremium, userId, priceId }: Props) {
  const [open, setOpen] = useState(false);
  const [launched, setLaunched] = useState(false);

  function handleUpgrade() {
    const paddle = getPaddleInstance();
    if (!paddle) return;

    setLaunched(true);
    setOpen(false);

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId,
        purchaseType: "course",
        courseId,
      },
      settings: {
        displayMode: "overlay",
        successUrl: `${window.location.origin}/app/courses/${courseId}?checkout=success`,
      },
    });
  }

  if (isPremium) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 1l1.2 2.4L9 4.1 7 6l.5 2.9L5 7.5 2.5 8.9 3 6 1 4.1l2.8-.7L5 1z" />
        </svg>
        Premium
      </span>
    );
  }

  return (
    <>
      {/* Free badge + upgrade button */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
          Free
        </span>
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-colors uppercase tracking-wide"
        >
          Upgrade
        </button>
      </div>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-xl p-6 space-y-5">

            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1.5l1.9 3.9 4.3 .6-3.1 3 .7 4.3L8 11.1l-3.8 2.2.7-4.3-3.1-3 4.3-.6L8 1.5z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Upgrade this course</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                Unlock unlimited question generation, OCR, and materials for this course.
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {[
                "Up to 30 questions per generation",
                "No file size limit on uploads",
                "Unlimited source materials",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
                    <polyline points="2 7 5.5 10.5 12 3" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">$4</span>
              <span className="text-sm text-gray-400 dark:text-zinc-400">one-time · this course only</span>
            </div>

            {/* Full-premium nudge */}
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Want unlimited access to all courses?{" "}
              <a
                href="/app/settings"
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                Upgrade to Full Premium - $8/mo
              </a>
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={launched}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-40"
              >
                {launched ? "Opening checkout…" : "Upgrade Course - $4"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
