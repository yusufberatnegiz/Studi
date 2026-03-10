"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeOption = "light" | "dark" | "system";

const options: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="3" />
        <line x1="8" y1="1" x2="8" y2="2.5" />
        <line x1="8" y1="13.5" x2="8" y2="15" />
        <line x1="1" y1="8" x2="2.5" y2="8" />
        <line x1="13.5" y1="8" x2="15" y2="8" />
        <line x1="3.05" y1="3.05" x2="4.12" y2="4.12" />
        <line x1="11.88" y1="11.88" x2="12.95" y2="12.95" />
        <line x1="3.05" y1="12.95" x2="4.12" y2="11.88" />
        <line x1="11.88" y1="4.12" x2="12.95" y2="3.05" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="2" width="14" height="10" rx="1.5" />
        <path d="M5 14h6M8 12v2" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex gap-0.5 p-1 rounded-lg bg-gray-100 dark:bg-zinc-700">
        {options.map((opt) => (
          <div
            key={opt.value}
            className="px-3 py-1.5 rounded-md text-sm w-[76px] h-[32px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex gap-0.5 p-1 rounded-lg bg-gray-100 dark:bg-zinc-900">
      {options.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
              active
                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-sm"
                : "text-gray-500 dark:text-zinc-300 hover:text-gray-700 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
