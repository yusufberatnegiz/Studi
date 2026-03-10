import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SourceUploadForm from "../upload-form";
import { uploadSourceMaterials, deleteDocument } from "../actions";
import DeleteDocumentButton from "./delete-button";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "text-gray-400",
  processing: "text-amber-500",
  ready: "text-green-600",
  failed: "text-red-500",
};

export default async function MaterialsPage({
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
          <span className="text-gray-500 dark:text-zinc-400">Source Materials</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Source Materials</h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-zinc-400">
          Upload lecture notes, textbook chapters, or slides. These are used as
          the knowledge base for question generation.
        </p>
      </div>

      {/* Upload */}
      <section className="space-y-4 pt-6 border-t border-gray-100 dark:border-zinc-700">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-400 uppercase tracking-wide">
          Upload files
        </h2>
        <SourceUploadForm courseId={courseId} action={uploadSourceMaterials} />
      </section>

      {/* File list */}
      <section className="space-y-4 pt-6 border-t border-gray-100 dark:border-zinc-700">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-400 uppercase tracking-wide">
          Uploaded files
        </h2>
        {!documents || documents.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-400">No files uploaded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-700 rounded-xl border border-gray-100 dark:border-zinc-700">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between px-4 py-3 gap-4 bg-white dark:bg-zinc-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-zinc-200 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-zinc-400 mt-0.5">
                    {new Date(doc.created_at).toLocaleString()}
                  </p>
                  {doc.status === "failed" && doc.error && (
                    <p className="text-xs text-red-400 mt-1">{doc.error}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-xs font-medium capitalize ${
                      STATUS_STYLES[doc.status] ?? "text-gray-400"
                    }`}
                  >
                    {doc.status}
                  </span>
                  <DeleteDocumentButton documentId={doc.id} action={deleteDocument} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
