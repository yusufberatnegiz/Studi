"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

type Course = { id: string; title: string };

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

  const navItems = [{ label: "Dashboard", href: "/app" }];
  const initial = userEmail?.slice(0, 1).toUpperCase() ?? "?";

  if (!mounted) {
    return <aside className="w-56 shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0" />;
  }

  return (
    <aside
      className={`shrink-0 flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* ── Logo row ──────────────────────────────────────────────────── */}
      <div className={`h-14 flex items-center shrink-0 border-b border-gray-100 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        {collapsed ? (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <img src="/logo.png" alt="Exai" className="h-5 w-5 object-contain" />
          </button>
        ) : (
          <>
            <Link href="/app" className="flex items-center gap-2.5 flex-1 min-w-0">
              <img src="/logo.png" alt="Exai" className="h-6 w-6 object-contain shrink-0" />
              <span className="text-[15px] font-semibold text-gray-900 tracking-tight">Exai</span>
            </Link>
            <button
              onClick={toggle}
              title="Collapse sidebar"
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 2 5 6.5 9 11" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className={`flex-1 overflow-y-auto py-3 ${collapsed ? "px-2" : "px-2"}`}>

        {/* Primary nav items */}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            if (collapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
                  <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
                  <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
                  <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
                  <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Courses */}
        {courses.length > 0 && (
          <div className="mt-5">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
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
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
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
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
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

      {/* ── Account block ─────────────────────────────────────────────── */}
      <div className={`border-t border-gray-100 shrink-0 ${collapsed ? "p-2" : "px-3 py-3"}`}>
        {collapsed ? (
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center justify-center w-9 h-9 mx-auto rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
              <polyline points="10 11 14 8 10 5" />
              <line x1="14" y1="8" x2="6" y2="8" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            {/* Avatar */}
            <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-gray-500 uppercase leading-none">
                {initial}
              </span>
            </div>
            {/* Email */}
            <p className="flex-1 text-[12px] text-gray-400 truncate min-w-0">
              {userEmail}
            </p>
            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                <polyline points="10 11 14 8 10 5" />
                <line x1="14" y1="8" x2="6" y2="8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
