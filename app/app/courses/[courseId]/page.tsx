import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WeakTopicForm from "./weak-topic-form";
import { generateWeakTopicQuestions } from "./generate-actions";

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

  const [
    { count: docCount },
    { count: setCount },
    { data: topicStatsRaw },
    { data: recentSetsRaw },
  ] = await Promise.all([
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
      .select("topic, attempts, correct")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .gte("attempts", 1),
    supabase
      .from("question_sets")
      .select("id, title, mode, created_at, questions(count)")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const topicStats = (topicStatsRaw ?? []).map((t) => ({
    ...t,
    accuracy: t.attempts > 0 ? t.correct / t.attempts : 0,
  }));
  const weakTopics = topicStats.filter((t) => t.accuracy < 0.8).sort((a, b) => a.accuracy - b.accuracy);
  const strongTopics = topicStats.filter((t) => t.accuracy >= 0.8);
  const weakCount = weakTopics.length;
  const strongCount = strongTopics.length;
  const totalAnswered = topicStats.reduce((s, t) => s + t.attempts, 0);
  const totalCorrect = topicStats.reduce((s, t) => s + t.correct, 0);
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  const topicBars = [...topicStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

  const recentSets = (recentSetsRaw ?? []).map((qs) => ({
    ...qs,
    questionCount:
      Array.isArray(qs.questions) && qs.questions.length > 0
        ? (qs.questions[0] as { count: number }).count
        : 0,
  }));

  const sections = [
    {
      href: `/app/courses/${courseId}/materials`,
      label: "Source Materials",
      description: "Upload lecture notes, textbook chapters, or slides.",
      meta: docCount != null ? `${docCount} ${docCount === 1 ? "file" : "files"}` : null,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-500 dark:text-blue-400",
      hoverClass: "hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-900/20",
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
      iconBg: "bg-violet-50 dark:bg-violet-900/30",
      iconColor: "text-violet-500 dark:text-violet-400",
      hoverClass: "hover:border-violet-200 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-900/20",
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
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
      iconColor: "text-amber-500 dark:text-amber-400",
      hoverClass: "hover:border-amber-200 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-900/20",
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
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      hoverClass: "hover:border-emerald-200 dark:hover:border-emerald-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/20",
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
          <Link href="/app" className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Dashboard
          </Link>
          <span className="text-gray-200 dark:text-gray-700">/</span>
          <span className="text-gray-500 dark:text-gray-400 truncate max-w-[240px]">{course.title}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
      </div>

      {/* Progress summary — 4 stat chips */}
      {totalAnswered > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatChip label="Answered" value={totalAnswered.toString()} sub="questions" />
          <StatChip
            label="Accuracy"
            value={`${overallAccuracy}%`}
            sub="overall"
            accent={overallAccuracy! >= 70 ? "emerald" : overallAccuracy! >= 50 ? "amber" : "red"}
          />
          <StatChip
            label="Weak"
            value={weakCount.toString()}
            sub={weakCount === 1 ? "topic" : "topics"}
            accent={weakCount > 0 ? "red" : undefined}
          />
          <StatChip
            label="Strong"
            value={strongCount.toString()}
            sub={strongCount === 1 ? "topic" : "topics"}
            accent={strongCount > 0 ? "emerald" : undefined}
          />
        </div>
      )}

      {/* Section nav cards */}
      <div className="grid gap-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`group flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 ${s.hoverClass} transition-colors`}
          >
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${s.iconBg} ${s.iconColor}`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{s.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{s.description}</p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              {s.meta && (
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{s.meta}</span>
              )}
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors"
              >
                <polyline points="5 3 9 7 5 11" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Topic performance bars */}
      {topicBars.length > 0 && (
        <section className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Topic Performance
            </h2>
            {topicStats.length > 5 && (
              <Link
                href={`/app/courses/${courseId}/topics`}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                View all →
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {topicBars.map((t) => {
              const pct = Math.round(t.accuracy * 100);
              const barColor = pct < 50 ? "bg-red-400" : pct < 80 ? "bg-amber-400" : "bg-emerald-400";
              const textColor = pct < 50 ? "text-red-500 dark:text-red-400" : pct < 80 ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
              return (
                <div key={t.topic} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate min-w-0">{t.topic}</span>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                        {t.attempts} {t.attempts === 1 ? "attempt" : "attempts"}
                      </span>
                      <span className={`text-xs font-semibold tabular-nums w-8 text-right ${textColor}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Weak topics CTA */}
      {weakCount > 0 && (
        <section className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/20 px-5 py-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {weakCount} weak {weakCount === 1 ? "topic" : "topics"} need attention
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Generate a targeted practice set focused on your weakest areas.
            </p>
          </div>
          <WeakTopicForm
            courseId={courseId}
            hasWeakTopics={true}
            action={generateWeakTopicQuestions}
          />
        </section>
      )}

      {/* Recent practice */}
      {recentSets.length > 0 && (
        <section className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Recent Practice
            </h2>
            <Link
              href={`/app/courses/${courseId}/sets`}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {recentSets.map((qs) => (
              <div
                key={qs.id}
                className="flex items-center justify-between px-4 py-3 gap-4 bg-white dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{qs.title}</p>
                    {qs.mode === "weak_topics" && (
                      <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        Weak
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {qs.questionCount} {qs.questionCount === 1 ? "question" : "questions"} &middot;{" "}
                    {new Date(qs.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/app/question-sets/${qs.id}/exam`}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    Exam
                  </Link>
                  <Link
                    href={`/app/question-sets/${qs.id}/practice`}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Practice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────────

type Accent = "emerald" | "amber" | "red";

const ACCENT_STYLES: Record<Accent, { value: string; bg: string }> = {
  emerald: { value: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800/40" },
  amber:   { value: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800/40" },
  red:     { value: "text-red-700 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/40" },
};

function StatChip({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: Accent;
}) {
  const style = accent ? ACCENT_STYLES[accent] : null;
  return (
    <div className={`rounded-xl border px-4 py-3 ${style?.bg ?? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold tabular-nums leading-tight ${style?.value ?? "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
