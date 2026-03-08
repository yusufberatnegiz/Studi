import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/app/app/sign-out-button";
import SourceUploadForm from "./upload-form";
import { uploadSourceMaterials } from "./actions";
import GenerateForm from "./generate-form";
import { generateQuestions } from "./generate-actions";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "text-gray-400",
  processing: "text-amber-500",
  ready: "text-green-600",
  failed: "text-red-500",
};

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

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, status, error, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  const { data: questionSets } = await supabase
    .from("question_sets")
    .select("id, title, created_at, questions(count)")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/app"
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-gray-200">/</span>
            <span className="text-gray-900 font-medium truncate max-w-[200px]">
              {course.title}
            </span>
          </div>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>

        {/* ── Section 1: Course Materials ─────────────────────────────── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Course Materials
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Upload lecture notes, textbook chapters, or slides. These are used
              as the knowledge base for question generation.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Upload files
            </p>
            <SourceUploadForm
              courseId={courseId}
              action={uploadSourceMaterials}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Uploaded materials
            </p>
            {!documents || documents.length === 0 ? (
              <p className="text-sm text-gray-400">No files uploaded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between px-4 py-3 gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(doc.created_at).toLocaleString()}
                      </p>
                      {doc.status === "failed" && doc.error && (
                        <p className="text-xs text-red-400 mt-1">{doc.error}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium capitalize shrink-0 pt-0.5 ${
                        STATUS_STYLES[doc.status] ?? "text-gray-400"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Generate Questions ───────────────────────────── */}
        <section className="space-y-6 pt-4 border-t border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Generate Questions
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Upload a past exam PDF or paste exam questions to set the style.
              Questions are generated from your course materials.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Exam input
            </p>
            <GenerateForm courseId={courseId} action={generateQuestions} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Question sets
            </p>
            {!questionSets || questionSets.length === 0 ? (
              <p className="text-sm text-gray-400">
                No question sets yet. Generate one above.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {questionSets.map((qs) => {
                  const count =
                    Array.isArray(qs.questions) && qs.questions.length > 0
                      ? (qs.questions[0] as { count: number }).count
                      : 0;
                  return (
                    <div
                      key={qs.id}
                      className="flex items-center justify-between px-4 py-3 gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {qs.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {count} {count === 1 ? "question" : "questions"} &middot;{" "}
                          {new Date(qs.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Link
                        href={`/app/question-sets/${qs.id}/practice`}
                        className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                      >
                        Start Practice
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
