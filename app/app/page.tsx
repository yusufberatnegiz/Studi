import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateCourseForm from "./create-course-form";
import { createCourse } from "./actions";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Upsert profile on first login — idempotent
  const { data: profile } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, ...(user.email ? { email: user.email } : {}) },
      { onConflict: "id" }
    )
    .select("plan")
    .single();

  // Parallel data fetches
  const [
    { data: courses },
    { data: recentSets },
    { count: totalAnswered },
    { count: totalCorrect },
    { data: allTopicStats },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, created_at, question_sets(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("question_sets")
      .select("id, title, created_at, course_id, courses(title), questions(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_correct", true),
    supabase
      .from("topic_stats")
      .select("course_id, attempts, correct")
      .eq("user_id", user.id)
      .gte("attempts", 2),
  ]);

  const answered = totalAnswered ?? 0;
  const correct = totalCorrect ?? 0;
  const accuracyPct = answered > 0 ? Math.round((correct / answered) * 100) : null;

  const weakTopicsCount = (allTopicStats ?? []).filter(
    (t) => t.correct / t.attempts < 0.8
  ).length;

  const weakPerCourse: Record<string, number> = {};
  for (const t of allTopicStats ?? []) {
    if (t.correct / t.attempts < 0.8) {
      weakPerCourse[t.course_id] = (weakPerCourse[t.course_id] ?? 0) + 1;
    }
  }

  const continueset = recentSets?.[0] ?? null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-white0">
            Plan:{" "}
            <span className="text-gray-600 dark:text-zinc-300 font-medium capitalize">
              {profile?.plan ?? "free"}
            </span>
          </p>
        </div>
      </div>

      {/* Learning Snapshot */}
      {answered > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-white0 uppercase tracking-wide mb-3">
            Learning Snapshot
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Questions Answered" value={String(answered)} />
            <StatCard
              label="Overall Accuracy"
              value={accuracyPct !== null ? `${accuracyPct}%` : "—"}
              highlight={
                accuracyPct !== null
                  ? accuracyPct >= 80
                    ? "emerald"
                    : accuracyPct >= 60
                    ? "amber"
                    : "red"
                  : undefined
              }
            />
            <StatCard
              label="Weak Topics"
              value={String(weakTopicsCount)}
              highlight={weakTopicsCount > 0 ? "amber" : undefined}
            />
            <StatCard label="Courses" value={String(courses?.length ?? 0)} />
          </div>
        </section>
      )}

      {/* Continue Practicing */}
      {continueset && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-white0 uppercase tracking-wide mb-3">
            Continue Practicing
          </h2>
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 dark:text-white0 truncate">
                {Array.isArray(continueset.courses) && continueset.courses.length > 0
                  ? (continueset.courses[0] as { title: string }).title
                  : "Course"}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                {continueset.title}
              </p>
              <p className="text-xs text-gray-400 dark:text-white0 mt-1">
                {(Array.isArray(continueset.questions) && continueset.questions.length > 0
                  ? (continueset.questions[0] as { count: number }).count
                  : 0)}{" "}
                questions
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/app/question-sets/${continueset.id}/exam`}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              >
                Exam
              </Link>
              <Link
                href={`/app/question-sets/${continueset.id}/practice`}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Practice
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recent Practice */}
      {recentSets && recentSets.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-white0 uppercase tracking-wide mb-3">
            Recent Practice
          </h2>
          <div className="divide-y divide-gray-100 dark:divide-zinc-700 rounded-xl border border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            {recentSets.map((qs) => {
              const count =
                Array.isArray(qs.questions) && qs.questions.length > 0
                  ? (qs.questions[0] as { count: number }).count
                  : 0;
              const courseTitle =
                Array.isArray(qs.courses) && qs.courses.length > 0
                  ? (qs.courses[0] as { title: string }).title
                  : "Course";
              return (
                <div
                  key={qs.id}
                  className="flex items-center justify-between px-4 py-3 gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-zinc-400 truncate">
                      {qs.title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-white0 mt-0.5">
                      {courseTitle} &middot; {count} {count === 1 ? "question" : "questions"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/app/question-sets/${qs.id}/exam`}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                    >
                      Exam
                    </Link>
                    <Link
                      href={`/app/question-sets/${qs.id}/practice`}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      Practice
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Your Courses */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-white0 uppercase tracking-wide mb-3">
          Your Courses
        </h2>
        {!courses || courses.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-white0">
            No courses yet. Create one below.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {courses.map((course) => {
              const setCount =
                Array.isArray(course.question_sets) && course.question_sets.length > 0
                  ? (course.question_sets[0] as { count: number }).count
                  : 0;
              const weakCount = weakPerCourse[course.id] ?? 0;
              return (
                <Link
                  key={course.id}
                  href={`/app/courses/${course.id}`}
                  className="group block bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 p-5 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-zinc-200 transition-colors truncate">
                    {course.title}
                  </p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400 dark:text-white0">
                    <span>
                      {setCount} {setCount === 1 ? "set" : "sets"}
                    </span>
                    {weakCount > 0 && (
                      <>
                        <span>&middot;</span>
                        <span className="text-amber-500 font-medium">
                          {weakCount} weak {weakCount === 1 ? "topic" : "topics"}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* New Course */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-white0 uppercase tracking-wide mb-3">
          New Course
        </h2>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 p-5">
          <CreateCourseForm action={createCourse} />
        </div>
      </section>
    </main>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "emerald" | "amber" | "red";
}) {
  const valueColor =
    highlight === "emerald"
      ? "text-emerald-600"
      : highlight === "amber"
      ? "text-amber-600"
      : highlight === "red"
      ? "text-red-600"
      : "text-gray-900 dark:text-white";

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 px-4 py-4">
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-white0 mt-1">{label}</p>
    </div>
  );
}
