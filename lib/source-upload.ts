/**
 * Shared source-file upload + extraction utility.
 * Called by both the createCourse action (dashboard) and the
 * uploadSourceMaterials action (course page).
 *
 * NOT a "use server" file — it is a pure utility that receives an
 * already-authenticated Supabase client as a parameter.
 */

import { randomUUID } from "crypto";
import {
  chunkText,
  sanitizeExtractedText,
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromPptx,
  extractTextWithOCR,
} from "@/lib/extract";

// Using a broad type so this utility stays independent of the generated Supabase types
type Supabase = ReturnType<typeof Object.create>;

// ---------------------------------------------------------------------------
// Allowed source file types (by extension — more reliable than file.type for
// office documents whose MIME type browsers report inconsistently)
// ---------------------------------------------------------------------------

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** Returns the canonical MIME type for a source file, or null if not allowed. */
export function getSourceFileMimeType(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? null;
}

// ---------------------------------------------------------------------------
// Filename sanitisation (same rules as storage upload action)
// ---------------------------------------------------------------------------

export function sanitizeFilename(name: string): string {
  const turkishMap: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";

  const sanitizedBase = base
    .split("").map((c) => turkishMap[c] ?? c).join("")
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "");

  const sanitizedExt = ext
    .split("").map((c) => turkishMap[c] ?? c).join("")
    .toLowerCase().replace(/[^a-z0-9.]/g, "");

  return (sanitizedBase || "file") + sanitizedExt;
}

// ---------------------------------------------------------------------------
// Extraction pipeline
// ---------------------------------------------------------------------------

async function runExtraction({
  supabase,
  documentId,
  userId,
  mimeType,
  content,
  jobId,
}: {
  supabase: Supabase;
  documentId: string;
  userId: string;
  mimeType: string;
  content: ArrayBuffer;
  jobId: string;
}) {
  await supabase.from("documents").update({ status: "processing" }).eq("id", documentId);
  await supabase.from("jobs").update({ status: "running" }).eq("id", jobId);

  try {
    let text: string;

    if (mimeType === "application/pdf") {
      const extracted = await extractTextFromPdf(content);
      if (extracted.trim().length < 50) {
        // Scanned PDF: page-rendering to images is not yet implemented.
        // Passing raw PDF bytes to the vision API is invalid — PDF binary is
        // not a JPEG/PNG. Fail clearly instead of silently sending garbage.
        throw new Error(
          "This PDF appears to be scanned (no selectable text). " +
          "Please export it to images (.jpg/.png) and upload those instead."
        );
      }
      text = extracted;
    } else if (mimeType === "image/jpeg" || mimeType === "image/png") {
      const ocr = await extractTextWithOCR(content, mimeType);
      if (ocr.trim().length < 20) {
        throw new Error("Image OCR found no readable text.");
      }
      text = ocr;
    } else if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const extracted = await extractTextFromDocx(content);
      // Normalize: collapse excess horizontal whitespace and blank lines
      const normalized = extracted
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const nonWsChars = normalized.replace(/\s/g, "").length;
      if (nonWsChars < 20) {
        throw new Error(
          `DOCX has no extractable text (raw: ${extracted.length} chars, non-whitespace: ${nonWsChars}).`
        );
      }
      text = normalized;
    } else if (
      mimeType === "application/vnd.ms-powerpoint" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      if (mimeType === "application/vnd.ms-powerpoint") {
        throw new Error("Legacy .ppt format is not supported. Please save as .pptx and re-upload.");
      }
      const extracted = await extractTextFromPptx(content);
      if (extracted.trim().length < 50) {
        throw new Error("PPTX has no extractable text (slides may be image-only).");
      }
      text = extracted;
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const chunks = chunkText(sanitizeExtractedText(text));
    if (chunks.length > 0) {
      const { error: chunksError } = await supabase
        .from("document_chunks")
        .insert(
          chunks.map((chunkContent: string, i: number) => ({
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

    await supabase.from("documents").update({ status: "ready" }).eq("id", documentId);
    await supabase.from("jobs").update({ status: "done" }).eq("id", jobId);
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
// Public API — process one source file end-to-end
// Returns an error string on failure, null on success.
// ---------------------------------------------------------------------------

export async function processSourceFile(
  supabase: Supabase,
  file: File,
  userId: string,
  courseId: string
): Promise<string | null> {
  if (file.size > 10 * 1024 * 1024) {
    return `${file.name}: exceeds 10 MB limit.`;
  }

  const mimeType = getSourceFileMimeType(file);
  if (!mimeType) {
    return `${file.name}: unsupported type. Use .pdf, .docx, .ppt, .pptx, .jpg, .jpeg, or .png.`;
  }

  const content = await file.arrayBuffer();
  const documentId = randomUUID();
  const storagePath = `${userId}/${courseId}/${documentId}/${sanitizeFilename(file.name)}`;

  const { error: storageError } = await supabase.storage
    .from("exam-uploads")
    .upload(storagePath, content, { contentType: mimeType });
  if (storageError) {
    return `${file.name}: storage error: ${storageError.message}`;
  }

  const { error: docError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: userId,
    course_id: courseId,
    filename: file.name,
    mime_type: mimeType,
    storage_path: storagePath,
    status: "uploaded",
  });
  if (docError) {
    await supabase.storage.from("exam-uploads").remove([storagePath]);
    return `${file.name}: database error: ${docError.message}`;
  }

  const jobId = randomUUID();
  const { error: jobError } = await supabase.from("jobs").insert({
    id: jobId,
    user_id: userId,
    type: "extract",
    status: "queued",
    input: { documentId },
    output: {},
    error: null,
  });
  if (jobError) {
    // Roll back: storage object and documents row are now orphaned without a job.
    await supabase.storage.from("exam-uploads").remove([storagePath]);
    await supabase.from("documents").delete().eq("id", documentId);
    return `${file.name}: job creation failed: ${jobError.message}`;
  }

  await runExtraction({ supabase, documentId, userId, mimeType, content, jobId });
  return null;
}
