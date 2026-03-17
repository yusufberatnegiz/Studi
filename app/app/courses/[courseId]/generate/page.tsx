import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GenerateForm from "../generate-form";
import { generateQuestions } from "../generate-actions";

export default async function GeneratePage({
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

  const [{ data: course }, { data: profile }, { data: examFiles }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, is_premium")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("plan, daily_gen_count, daily_gen_date").eq("user_id", user.id).single(),
    supabase
      .from("exam_files")
      .select("id, filename, file_size, created_at")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!course) notFound();

  const isAccountPremium = profile?.plan != null && profile.plan !== "free";
  const isPremium = isAccountPremium || (course.is_premium ?? false);

  const todayStr = new Date().toISOString().split("T")[0];
  const usedToday = profile?.daily_gen_date === todayStr ? (profile.daily_gen_count ?? 0) : 0;
  const FREE_DAILY_LIMIT = 15;

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
          <span className="text-gray-500 dark:text-zinc-400">Generate Practice</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Practice</h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-zinc-400">
          Upload a past exam PDF or paste exam questions to set the style and
          instructions. Questions are generated from your source materials.
        </p>
      </div>

      {/* Generate form */}
      {/* Usage counter - free users only */}
      {!isPremium && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-600 dark:text-zinc-400">Questions generated today</p>
              <p className="text-xs font-semibold tabular-nums text-gray-700 dark:text-zinc-300">
                {usedToday} / {FREE_DAILY_LIMIT}
              </p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-zinc-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usedToday >= FREE_DAILY_LIMIT
                    ? "bg-red-500"
                    : usedToday >= FREE_DAILY_LIMIT * 0.8
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, (usedToday / FREE_DAILY_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
          <Link
            href="/app/settings"
            className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      )}

      <section className="space-y-4 pt-6 border-t border-gray-100 dark:border-zinc-700">
        <GenerateForm
          courseId={courseId}
          action={generateQuestions}
          isPremium={isPremium}
          savedExamFiles={examFiles ?? []}
        />
      </section>
    </main>
  );
}
