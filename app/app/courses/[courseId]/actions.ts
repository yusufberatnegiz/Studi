"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chunkText, extractTextFromPdf } from "@/lib/extract";

export type UploadState = { error: string } | { success: true } | null;

function sanitizeFilename(name: string): string {
  const turkishMap: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";

  const sanitizedBase = base
    .split("")
    .map((c) => turkishMap[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  const sanitizedExt = ext
    .split("")
    .map((c) => turkishMap[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");

  return (sanitizedBase || "file") + sanitizedExt;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
];

// ---------------------------------------------------------------------------
// Extraction pipeline — called synchronously inside the upload action
// ---------------------------------------------------------------------------

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function runExtraction({
  supabase,
  documentId,
  userId,
  courseId,
  mimeType,
  content,
  jobId,
}: {
  supabase: SupabaseClient;
  documentId: string;
  userId: string;
  courseId: string;
  mimeType: string;
  content: ArrayBuffer | string;
  jobId: string;
}) {
  // Transition: queued → running / processing
  await supabase
    .from("documents")
    .update({ status: "processing" })
    .eq("id", documentId);
  await supabase
    .from("jobs")
    .update({ status: "running" })
    .eq("id", jobId);

  try {
    let text: string;

    if (mimeType === "text/plain") {
      // Case A: pasted text or plain-text file — already have the content
      text =
        typeof content === "string"
          ? content
          : new TextDecoder().decode(content as ArrayBuffer);
    } else if (mimeType === "application/pdf") {
      // Case B: PDF — attempt text extraction
      const extracted = await extractTextFromPdf(content as ArrayBuffer);
      if (extracted.trim().length < 50) {
        // Scanned / image-only PDF — no selectable text
        throw new Error("OCR not implemented yet");
      }
      text = extracted;
    } else {
      // Case C: image (PNG / JPEG) — OCR not available yet
      throw new Error("OCR not implemented yet");
    }

    const chunks = chunkText(text);

    if (chunks.length > 0) {
      const { error: chunksError } = await supabase
        .from("document_chunks")
        .insert(
          chunks.map((chunkContent, i) => ({
            user_id: userId,
            document_id: documentId,
            chunk_index: i,
            content: chunkContent,
            page: null,
            metadata: {},
          }))
        );
      if (chunksError) throw new Error(chunksError.message);
    }

    // Transition: processing → ready
    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", documentId);
    await supabase
      .from("jobs")
      .update({ status: "done" })
      .eq("id", jobId);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Extraction failed";

    await supabase
      .from("documents")
      .update({ status: "failed", error: errorMsg })
      .eq("id", documentId);
    await supabase
      .from("jobs")
      .update({ status: "failed", error: errorMsg })
      .eq("id", jobId);
  }
}

// ---------------------------------------------------------------------------
// Upload + extract action (called from the upload form)
// ---------------------------------------------------------------------------

export async function uploadDocument(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const courseId = formData.get("courseId") as string;
  const file = formData.get("file") as File | null;
  const pastedText = ((formData.get("pastedText") as string) ?? "").trim();

  if (!z.string().uuid().safeParse(courseId).success) {
    return { error: "Invalid course." };
  }

  const hasFile = !!file && file.size > 0;
  const hasText = pastedText.length > 0;

  if (!hasFile && !hasText) {
    return { error: "Upload a file or paste exam text — cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();
  if (!course) return { error: "Course not found." };

  let content: ArrayBuffer | string;
  let filename: string;
  let mimeType: string;

  if (hasFile && file) {
    if (file.size > 10 * 1024 * 1024) {
      return { error: "File must be under 10 MB." };
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { error: "Only PDF, PNG, JPG, and plain text files are allowed." };
    }
    filename = file.name;
    mimeType = file.type;
    content = await file.arrayBuffer();
  } else {
    filename = "pasted-input.txt";
    mimeType = "text/plain";
    content = pastedText;
  }

  const documentId = randomUUID();
  const storagePath = `${user.id}/${courseId}/${documentId}/${sanitizeFilename(filename)}`;

  // 1. Upload to storage
  const { error: storageError } = await supabase.storage
    .from("exam-uploads")
    .upload(storagePath, content, { contentType: mimeType });

  if (storageError) {
    return { error: `Storage error: ${storageError.message}` };
  }

  // 2. Insert document row (status = 'uploaded')
  const { error: docError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: user.id,
    course_id: courseId,
    filename,
    mime_type: mimeType,
    storage_path: storagePath,
    status: "uploaded",
  });

  if (docError) {
    await supabase.storage.from("exam-uploads").remove([storagePath]);
    return { error: `Database error: ${docError.message}` };
  }

  // 3. Create extraction job (status = 'queued')
  const jobId = randomUUID();
  const { error: jobError } = await supabase.from("jobs").insert({
    id: jobId,
    user_id: user.id,
    document_id: documentId,
    type: "extract",
    status: "queued",
    input: { documentId },
    output: {},
    error: null,
  });

  if (jobError) {
    return { error: `Job creation failed: ${jobError.message}` };
  }

  // 4. Run extraction synchronously (server-side, inside this server action)
  await runExtraction({
    supabase,
    documentId,
    userId: user.id,
    courseId,
    mimeType,
    content,
    jobId,
  });

  revalidatePath(`/app/courses/${courseId}`);
  return { success: true };
}
