import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/app/app/sign-out-button";
import UploadForm from "./upload-form";
import { uploadDocument } from "./actions";

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

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>

        {/* Upload */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Upload exam
          </h2>
          <UploadForm courseId={courseId} action={uploadDocument} />
        </section>

        {/* Documents list */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Uploaded documents
          </h2>

          {!documents || documents.length === 0 ? (
            <p className="text-sm text-gray-400">
              No documents yet. Upload one above.
            </p>
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
                      <p className="text-xs text-red-400 mt-1">
                        {doc.error}
                      </p>
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
        </section>
      </main>
    </div>
  );
}
