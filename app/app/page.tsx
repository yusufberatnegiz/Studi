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

  // Fetch courses with question set counts
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, created_at, question_sets(count)")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Plan:{" "}
            <span className="text-gray-600 font-medium capitalize">
              {profile?.plan ?? "free"}
            </span>
          </p>
        </div>
      </div>

      {/* Create a course */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          New course
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <CreateCourseForm action={createCourse} />
        </div>
      </section>

      {/* Courses list */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Your courses
        </h2>
        {!courses || courses.length === 0 ? (
          <p className="text-sm text-gray-400">
            No courses yet. Create one above.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {courses.map((course) => {
              const setCount =
                Array.isArray(course.question_sets) &&
                course.question_sets.length > 0
                  ? (course.question_sets[0] as { count: number }).count
                  : 0;
              return (
                <Link
                  key={course.id}
                  href={`/app/courses/${course.id}`}
                  className="group block bg-white rounded-xl border border-gray-100 p-5 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
                >
                  <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {course.title}
                  </p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
                    <span>
                      {setCount} {setCount === 1 ? "question set" : "question sets"}
                    </span>
                    <span>&middot;</span>
                    <span>
                      {new Date(course.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
