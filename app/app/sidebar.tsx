"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

export default function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navItems = [{ label: "Dashboard", href: "/app" }];

  if (!mounted) {
    return <aside className="w-56 shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0" />;
  }

  return (
    <aside
      className={`shrink-0 flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo row */}
      <div className="h-14 flex items-center border-b border-gray-100 shrink-0 px-2 gap-1.5">
        {collapsed ? (
          <>
            {/* Logo — navigates to /app */}
            <Link
              href="/app"
              title="Dashboard"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <img src="/logo.png" alt="Exai" className="h-6 w-6 object-contain" />
            </Link>
            {/* Expand button — separate from logo */}
            <button
              onClick={toggle}
              title="Expand sidebar"
              className="flex items-center justify-center w-6 h-6 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 2 8 6 4 10" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <Link href="/app" className="flex items-center gap-2 flex-1 min-w-0 px-1">
              <img src="/logo.png" alt="Exai" className="h-7 w-7 object-contain shrink-0" />
              <span className="font-semibold text-gray-900 tracking-tight truncate">Exai</span>
            </Link>
            {/* Collapse button */}
            <button
              onClick={toggle}
              title="Collapse sidebar"
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="8 2 4 6 8 10" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-3 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          if (collapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center w-8 h-8 mx-auto rounded-lg transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
                  <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
                  <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
                  <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
                </svg>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User / sign-out */}
      <div className={`border-t border-gray-100 shrink-0 space-y-0.5 ${collapsed ? "p-2" : "p-3"}`}>
        {!collapsed && (
          <div className="px-3 py-1.5">
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title="Sign out"
          className={`transition-colors ${
            collapsed
              ? "flex items-center justify-center w-8 h-8 mx-auto rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              : "w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
              <polyline points="10 11 14 8 10 5" />
              <line x1="14" y1="8" x2="6" y2="8" />
            </svg>
          ) : (
            "Sign out"
          )}
        </button>
      </div>
    </aside>
  );
}
