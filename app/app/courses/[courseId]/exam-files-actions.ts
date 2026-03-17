"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) continue;
    if (file.size > 10 * 1024 * 1024) return { error: `${file.name} exceeds 10 MB.` };

    const safeName = file.name.replace(/\s+/g, "_");
    // Path: userId/exam-files/courseId/uuid-filename
    // userId is the first component — consistent with the existing bucket policy
    // that enforces (storage.foldername(name))[1] = auth.uid()::text
    const storagePath = `${user.id}/exam-files/${courseId}/${randomUUID()}-${safeName}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("exam-uploads")
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("[saveExamFile] storage error:", uploadError.message);
      return { error: `Storage error: ${uploadError.message}` };
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
      return { error: `DB error: ${dbError.message}` };
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

  await supabase.storage.from("exam-uploads").remove([file.storage_path]);
  await supabase.from("exam_files").delete().eq("id", fileId);

  revalidatePath(`/app/courses/${file.course_id}/generate`);
  return { success: true };
}
