"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

type Course = { id: string; title: string };

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      <polyline points="10 11 14 8 10 5" />
      <line x1="14" y1="8" x2="6" y2="8" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 2 5 6.5 9 11" />
    </svg>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({
  userEmail,
  courses,
}: {
  userEmail: string | null;
  courses: Course[];
}) {
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

  const initial = userEmail?.slice(0, 1).toUpperCase() ?? "?";
  const dashActive = pathname === "/app";
  const settingsActive = pathname.startsWith("/app/settings");

  if (!mounted) {
    return (
      <aside className={`shrink-0 bg-white dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-800 h-screen sticky top-0 ${collapsed ? "w-14" : "w-56"}`} />
    );
  }

  return (
    <aside
      className={`shrink-0 flex flex-col bg-white dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-800 h-screen sticky top-0 transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* ── Logo row ─────────────────────────────────────────────────────── */}
      <div
        className={`h-14 flex items-center shrink-0 border-b border-gray-100 dark:border-zinc-800 ${
          collapsed ? "justify-center px-2" : "px-4"
        }`}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <img src="/logo.png" alt="Exai" className="h-5 w-5 object-contain" />
          </button>
        ) : (
          <>
            <Link href="/app" className="flex items-center gap-2.5 flex-1 min-w-0">
              <img src="/logo.png" alt="Exai" className="h-6 w-6 object-contain shrink-0" />
              <span className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
                Exai
              </span>
            </Link>
            <button
              onClick={toggle}
              title="Collapse sidebar"
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-gray-300 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <IconCollapse />
            </button>
          </>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">

        {/* Dashboard */}
        <div className="space-y-0.5">
          {collapsed ? (
            <Link
              href="/app"
              title="Dashboard"
              className={`flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors ${
                dashActive
                  ? "bg-blue-500/15 text-blue-400"
                  : "text-gray-400 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              <IconDashboard />
            </Link>
          ) : (
            <Link
              href="/app"
              className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13.5px] font-medium transition-colors ${
                dashActive
                  ? "bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                  : "text-gray-500 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <span className="shrink-0 opacity-80"><IconDashboard /></span>
              Dashboard
            </Link>
          )}
        </div>

        {/* Courses */}
        {courses.length > 0 && (
          <div className="mt-5">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-1.5">
                Courses
              </p>
            )}
            <div className="space-y-0.5">
              {courses.map((course) => {
                const active = pathname.startsWith(`/app/courses/${course.id}`);
                if (collapsed) {
                  return (
                    <Link
                      key={course.id}
                      href={`/app/courses/${course.id}`}
                      title={course.title}
                      className={`flex items-center justify-center w-9 h-8 mx-auto rounded-lg transition-colors ${
                        active
                          ? "bg-blue-500/15 text-blue-400"
                          : "text-gray-400 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-white"
                      }`}
                    >
                      <span className="text-[11px] font-bold uppercase leading-none">
                        {course.title.slice(0, 1)}
                      </span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={course.id}
                    href={`/app/courses/${course.id}`}
                    className={`flex items-center px-3 py-[6px] rounded-lg text-[13px] transition-colors min-w-0 ${
                      active
                        ? "bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium"
                        : "text-gray-500 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <span className="truncate">{course.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── Settings link ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 dark:border-zinc-800 shrink-0 px-2 py-2">
        {collapsed ? (
          <Link
            href="/app/settings"
            title="Settings"
            className={`flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors ${
              settingsActive
                ? "bg-blue-500/15 text-blue-400"
                : "text-gray-400 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-white"
            }`}
          >
            <IconSettings />
          </Link>
        ) : (
          <Link
            href="/app/settings"
            className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13.5px] font-medium transition-colors ${
              settingsActive
                ? "bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "text-gray-500 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-800 dark:hover:text-white"
            }`}
          >
            <span className="shrink-0 opacity-80"><IconSettings /></span>
            Settings
          </Link>
        )}
      </div>

      {/* ── Account block ────────────────────────────────────────────────── */}
      <div
        className={`border-t border-gray-100 dark:border-zinc-800 shrink-0 ${
          collapsed ? "p-2" : "px-3 py-3"
        }`}
      >
        {collapsed ? (
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center justify-center w-9 h-9 mx-auto rounded-lg text-gray-400 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            <IconSignOut />
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-300 uppercase leading-none">
                {initial}
              </span>
            </div>
            <p className="flex-1 text-[12px] text-gray-400 dark:text-zinc-400 truncate min-w-0">
              {userEmail}
            </p>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-gray-300 dark:text-zinc-500 hover:text-gray-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <IconSignOut />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
