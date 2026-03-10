import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SetsPage({
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

  const { data: questionSets } = await supabase
    .from("question_sets")
    .select("id, title, created_at, mode, questions(count)")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm mb-3">
          <Link href="/app" className="text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors">
            Dashboard
          </Link>
          <span className="text-gray-200 dark:text-zinc-700">/</span>
          <Link
            href={`/app/courses/${courseId}`}
            className="text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors truncate max-w-[160px]"
          >
            {course.title}
          </Link>
          <span className="text-gray-200 dark:text-zinc-700">/</span>
          <span className="text-gray-500 dark:text-zinc-400">Exam Sets</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exam Sets</h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-zinc-400">
          All generated question sets for this course.
        </p>
      </div>

      <section className="pt-6 border-t border-gray-100 dark:border-zinc-700">
        {!questionSets || questionSets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 dark:text-zinc-400">No question sets yet.</p>
            <Link
              href={`/app/courses/${courseId}/generate`}
              className="mt-3 inline-block text-sm font-medium text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2 transition-colors"
            >
              Generate your first set
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-700 rounded-xl border border-gray-100 dark:border-zinc-700">
            {questionSets.map((qs) => {
              const count =
                Array.isArray(qs.questions) && qs.questions.length > 0
                  ? (qs.questions[0] as { count: number }).count
                  : 0;
              return (
                <div
                  key={qs.id}
                  className="flex items-center justify-between px-4 py-3 gap-4 bg-white dark:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-zinc-200 truncate">
                        {qs.title}
                      </p>
                      {qs.mode === "weak_topics" && (
                        <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          Weak Topics
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-zinc-400 mt-0.5">
                      {count} {count === 1 ? "question" : "questions"} &middot;{" "}
                      {new Date(qs.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/app/question-sets/${qs.id}/exam`}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
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
        )}
      </section>
    </main>
  );
}
