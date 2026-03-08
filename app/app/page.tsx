import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import CreateCourseForm from "./create-course-form";
import { Card, CardContent } from "@/components/ui/card";
import { createCourse } from "./actions";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Upsert profile on first login — idempotent
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, ...(user.email ? { email: user.email } : {}) },
      { onConflict: "id" }
    )
    .select("plan")
    .single();

  // Fetch this user's courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <img src="/logo.png" alt="Exai" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-gray-900 tracking-tight">Exai</span>
          </span>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Logged in as{" "}
            <span className="text-gray-900">{user.email ?? user.id}</span>
          </p>
          {profileError ? (
            <p className="mt-1 text-sm text-amber-600">
              Could not load profile data. Some features may be limited.
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-400">
              Plan:{" "}
              <span className="text-gray-600 font-medium capitalize">
                {profile?.plan ?? "free"}
              </span>
            </p>
          )}
        </div>

        {/* Create course */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Add a course
          </h2>
          <CreateCourseForm action={createCourse} />
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
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/app/courses/${course.id}`}
                  className="group block"
                >
                  <Card className="transition-colors group-hover:border-gray-300">
                    <CardContent className="p-4">
                      <p className="font-medium text-gray-900">
                        {course.title}
                      </p>
                      <p className="text-xs text-gray-300 mt-2">
                        {new Date(course.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
