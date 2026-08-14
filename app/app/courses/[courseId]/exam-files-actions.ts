"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSourceFileMimeType, sanitizeFilename } from "@/lib/source-upload";

export type ExamFile = {
  id: string;
  filename: string;
  file_size: number | null;
  created_at: string;
};

export type ExamFileState = { error: string } | { success: true } | null;

export async function saveExamFile(
  _prevState: ExamFileState,
  formData: FormData
): Promise<ExamFileState> {
  const courseId = formData.get("courseId") as string;
  if (!z.string().uuid().safeParse(courseId).success) return { error: "Invalid course." };

  const files = formData.getAll("examFiles") as File[];
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);
  if (validFiles.length === 0) return { error: "Select at least one file." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to upload files." };

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();
  if (!course) return { error: "You do not have permission to upload to this course." };

  for (const file of validFiles) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      return { error: `${file.name}: use PDF, JPG, or PNG.` };
    }
    if (file.size > 10 * 1024 * 1024) return { error: `${file.name} exceeds 10 MB.` };

    const safeName = sanitizeFilename(file.name);
    const mimeType = getSourceFileMimeType(file);
    if (!mimeType) return { error: `${file.name}: unsupported file type.` };
    // Path: userId/exam-files/courseId/uuid-filename
    // userId is the first component — consistent with the existing bucket policy
    // that enforces (storage.foldername(name))[1] = auth.uid()::text
    const storagePath = `${user.id}/exam-files/${courseId}/${randomUUID()}-${safeName}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("exam-uploads")
      .upload(storagePath, buffer, { contentType: mimeType });

    if (uploadError) {
      console.error("[saveExamFile] storage error:", uploadError.message);
      return { error: "Upload failed. Please try again." };
    }

    const { error: dbError } = await supabase.from("exam_files").insert({
      course_id: courseId,
      user_id: user.id,
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
    });
    if (dbError) {
      console.error("[saveExamFile] db error:", dbError.message);
      await supabase.storage.from("exam-uploads").remove([storagePath]);
      return { error: "Upload failed. Please try again." };
    }
  }

  revalidatePath(`/app/courses/${courseId}/generate`);
  return { success: true };
}

export async function deleteExamFile(fileId: string): Promise<ExamFileState> {
  if (!z.string().uuid().safeParse(fileId).success) return { error: "Invalid file." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to delete files." };

  const { data: file } = await supabase
    .from("exam_files")
    .select("id, storage_path, course_id")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();
  if (!file) return { error: "File not found." };

  const { error: storageError } = await supabase.storage
    .from("exam-uploads")
    .remove([file.storage_path]);
  if (storageError) return { error: "Could not delete the stored file. Please try again." };

  const { error: deleteError } = await supabase
    .from("exam_files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", user.id);
  if (deleteError) return { error: "Could not delete the file record. Please try again." };

  revalidatePath(`/app/courses/${file.course_id}/generate`);
  return { success: true };
}
