import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();

  if (!course) notFound();

  // Metadata counts for cards
  const [{ count: docCount }, { count: setCount }, { data: topicStatsRaw }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId),
      supabase
        .from("question_sets")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("user_id", user.id),
      supabase
        .from("topic_stats")
        .select("attempts, correct")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .gte("attempts", 1),
    ]);

  const topicStats = (topicStatsRaw ?? []).map((t) => ({
    ...t,
    accuracy: t.attempts > 0 ? t.correct / t.attempts : 0,
  }));
  const weakCount = topicStats.filter((t) => t.accuracy < 0.8).length;
  const strongCount = topicStats.filter((t) => t.accuracy >= 0.8).length;
  const totalAnswered = topicStats.reduce((s, t) => s + t.attempts, 0);
  const totalCorrect = topicStats.reduce((s, t) => s + t.correct, 0);
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  const sections = [
    {
      href: `/app/courses/${courseId}/materials`,
      label: "Source Materials",
      description: "Upload lecture notes, textbook chapters, or slides.",
      meta: docCount != null ? `${docCount} ${docCount === 1 ? "file" : "files"}` : null,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2h8l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
          <polyline points="12 2 12 6 16 6" />
          <line x1="7" y1="10" x2="13" y2="10" />
          <line x1="7" y1="13" x2="11" y2="13" />
        </svg>
      ),
    },
    {
      href: `/app/courses/${courseId}/generate`,
      label: "Generate Practice",
      description: "Upload a past exam to generate AI practice questions.",
      meta: null,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="10 2 13 8 19 8.5 14.5 13 16 19 10 16 4 19 5.5 13 1 8.5 7 8 10 2" />
        </svg>
      ),
    },
    {
      href: `/app/courses/${courseId}/topics`,
      label: "Topics",
      description: "Track your weak and strong topics across practice sessions.",
      meta:
        topicStats.length > 0
          ? `${weakCount} weak · ${strongCount} strong`
          : null,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="17" x2="2" y2="17" />
          <rect x="3" y="10" width="3" height="7" rx="0.5" />
          <rect x="8.5" y="5" width="3" height="12" rx="0.5" />
          <rect x="14" y="1" width="3" height="16" rx="0.5" />
        </svg>
      ),
    },
    {
      href: `/app/courses/${courseId}/sets`,
      label: "Exam Sets",
      description: "Browse and start all generated practice question sets.",
      meta: setCount != null ? `${setCount} ${setCount === 1 ? "set" : "sets"}` : null,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="16" height="4" rx="1" />
          <rect x="2" y="9" width="16" height="4" rx="1" />
          <rect x="2" y="15" width="10" height="3" rx="1" />
        </svg>
      ),
    },
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {/* Breadcrumb + title */}
      <div>
        <div className="flex items-center gap-2 text-sm mb-3">
          <Link href="/app" className="text-gray-400 hover:text-gray-700 transition-colors">
            Dashboard
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-gray-500 truncate max-w-[240px]">{course.title}</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          {overallAccuracy !== null && (
            <div className="flex items-center gap-2 shrink-0 pb-0.5">
              <span className="text-sm text-gray-400">{totalAnswered} answered</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  overallAccuracy >= 75
                    ? "bg-emerald-50 text-emerald-700"
                    : overallAccuracy >= 50
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {overallAccuracy}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Section cards */}
      <div className="grid gap-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-4 hover:border-gray-300 transition-colors"
          >
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${s.iconBg} ${s.iconColor}`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              {s.meta && (
                <span className="text-xs text-gray-400 tabular-nums">{s.meta}</span>
              )}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-300 group-hover:text-gray-500 transition-colors"
              >
                <polyline points="5 3 9 7 5 11" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
