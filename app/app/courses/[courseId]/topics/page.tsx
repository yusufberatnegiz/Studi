import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WeakTopicForm from "../weak-topic-form";
import { generateWeakTopicQuestions } from "../generate-actions";

export default async function TopicsPage({
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

  const { data: topicStatsRaw } = await supabase
    .from("topic_stats")
    .select("topic, attempts, correct")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .gte("attempts", 1)
    .order("attempts", { ascending: false });

  const topicStats = (topicStatsRaw ?? []).map((t) => ({
    ...t,
    accuracy: t.attempts > 0 ? t.correct / t.attempts : 0,
  }));

  const weakTopics = topicStats
    .filter((t) => t.accuracy < 0.8)
    .sort((a, b) => a.accuracy - b.accuracy);

  const strongTopics = topicStats
    .filter((t) => t.accuracy >= 0.8)
    .sort((a, b) => b.accuracy - a.accuracy);

  const hasWeakTopics = topicStats.some((t) => t.attempts >= 2 && t.accuracy < 0.8);

  const totalAnswered = topicStats.reduce((s, t) => s + t.attempts, 0);
  const totalCorrect = topicStats.reduce((s, t) => s + t.correct, 0);
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm mb-3">
          <Link href="/app" className="text-gray-400 hover:text-gray-700 transition-colors">
            Dashboard
          </Link>
          <span className="text-gray-200">/</span>
          <Link
            href={`/app/courses/${courseId}`}
            className="text-gray-400 hover:text-gray-700 transition-colors truncate max-w-[160px]"
          >
            {course.title}
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-gray-500">Topics</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Topics</h1>
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

      {topicStats.length === 0 && (
        <p className="text-sm text-gray-400 pt-6 border-t border-gray-100">
          Complete a practice session to see your topic breakdown.
        </p>
      )}

      {/* Weak Topics */}
      {topicStats.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Weak Topics</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Accuracy below 80%, ranked weakest first.
            </p>
          </div>

          {weakTopics.length === 0 ? (
            <p className="text-sm text-gray-400">No weak topics — keep it up!</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {weakTopics.map((t) => (
                <div
                  key={t.topic}
                  className="flex items-center justify-between px-4 py-3 gap-4"
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{t.topic}</p>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-gray-400 tabular-nums">
                    <span>{t.correct}/{t.attempts}</span>
                    <span
                      className={`font-semibold w-10 text-right ${
                        t.accuracy >= 0.5 ? "text-amber-500" : "text-red-500"
                      }`}
                    >
                      {Math.round(t.accuracy * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <WeakTopicForm
            courseId={courseId}
            hasWeakTopics={hasWeakTopics}
            action={generateWeakTopicQuestions}
          />
        </section>
      )}

      {/* Strong Topics */}
      {topicStats.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Strong Topics</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Accuracy 80% or above.
            </p>
          </div>

          {strongTopics.length === 0 ? (
            <p className="text-sm text-gray-400">No strong topics yet — keep practising!</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {strongTopics.map((t) => (
                <div
                  key={t.topic}
                  className="flex items-center justify-between px-4 py-3 gap-4"
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{t.topic}</p>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-gray-400 tabular-nums">
                    <span>{t.correct}/{t.attempts}</span>
                    <span className="font-semibold text-green-600 w-10 text-right">
                      {Math.round(t.accuracy * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
