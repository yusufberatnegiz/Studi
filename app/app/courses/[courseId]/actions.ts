"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processSourceFile } from "@/lib/source-upload";

export type UpgradeCourseState = { error: string } | { success: true } | null;

/**
 * Placeholder upgrade action — simulates payment by setting is_premium = true.
 * Will be replaced by a real Stripe checkout flow in the billing milestone.
 */
export async function upgradeCourse(courseId: string): Promise<UpgradeCourseState> {
  if (!z.string().uuid().safeParse(courseId).success) {
    return { error: "Invalid course." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("courses")
    .update({ is_premium: true })
    .eq("id", courseId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Course upgrade error:", error);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/app/courses/${courseId}`);
  return { success: true };
}

export type UploadState = { error: string } | { success: true } | null;
export type DeleteDocState = { error: string } | { success: true } | null;

export async function deleteDocument(documentId: string): Promise<DeleteDocState> {
  if (!z.string().uuid().safeParse(documentId).success) {
    return { error: "Invalid document." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Fetch doc to get storage path and verify ownership via course
  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path, course_id, courses!inner(user_id)")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found." };

  const course = Array.isArray(doc.courses) ? doc.courses[0] : doc.courses;
  if ((course as { user_id: string }).user_id !== user.id) {
    return { error: "Not authorized." };
  }

  // Delete from storage if path exists
  if (doc.storage_path) {
    await supabase.storage.from("exam-uploads").remove([doc.storage_path]);
  }

  // Delete DB record (cascades chunks/jobs)
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) return { error: "Failed to delete document." };

  revalidatePath(`/app/courses/${doc.course_id}/materials`);
  return { success: true };
}

/**
 * Upload one or more source material files for a course.
 * Accepts .pdf, .docx, .ppt, .pptx - multiple files at once.
 * Pasted text is no longer handled here; use the generate section instead.
 */
export async function uploadSourceMaterials(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  try {
  const courseId = formData.get("courseId") as string;

  if (!z.string().uuid().safeParse(courseId).success) {
    return { error: "Invalid course." };
  }

  const files = formData.getAll("files") as File[];
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);

  if (validFiles.length === 0) {
    return { error: "Select at least one file." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const [{ data: course }, { data: profile }, { count: docCount }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, is_premium")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("plan, daily_ocr_count, daily_ocr_date")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId),
  ]);
  if (!course) return { error: "Course not found." };

  const isAccountPremium = profile?.plan != null && profile.plan !== "free";
  const isPremium = isAccountPremium || (course.is_premium ?? false);

  const imageExts = new Set(["jpg", "jpeg", "png"]);
  const imageFiles = validFiles.filter((f) =>
    imageExts.has(f.name.split(".").pop()?.toLowerCase() ?? "")
  );

  if (!isPremium) {
    // Materials per course limit (15)
    if ((docCount ?? 0) + validFiles.length > 15) {
      const remaining = Math.max(0, 15 - (docCount ?? 0));
      return {
        error:
          remaining === 0
            ? "This course has reached the 15 material limit. Upgrade to add more."
            : `This course can only hold ${remaining} more material${remaining === 1 ? "" : "s"} (free plan limit: 15).`,
      };
    }

    // Daily OCR limit (10)
    if (imageFiles.length > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      const isNewDay = !profile?.daily_ocr_date || profile.daily_ocr_date !== todayStr;
      const usedToday = isNewDay ? 0 : (profile?.daily_ocr_count ?? 0);
      if (usedToday + imageFiles.length > 10) {
        const remaining = Math.max(0, 10 - usedToday);
        return {
          error: `Daily OCR limit reached. You have ${remaining} image scan${remaining === 1 ? "" : "s"} remaining today.`,
        };
      }
    }
  }

  const errors: string[] = [];
  for (const file of validFiles) {
    const err = await processSourceFile(supabase, file, user.id, courseId, isPremium);
    if (err) errors.push(err);
  }

  // Increment daily OCR counter for free users
  if (!isPremium && imageFiles.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];
    const isNewDay = !profile?.daily_ocr_date || profile.daily_ocr_date !== todayStr;
    const usedToday = isNewDay ? 0 : (profile?.daily_ocr_count ?? 0);
    await supabase
      .from("profiles")
      .update({ daily_ocr_count: usedToday + imageFiles.length, daily_ocr_date: todayStr })
      .eq("user_id", user.id);
  }

  revalidatePath(`/app/courses/${courseId}`);

  if (errors.length === validFiles.length) {
    return { error: errors.join("\n") };
  }
  if (errors.length > 0) {
    return { error: `Some files could not be uploaded:\n${errors.join("\n")}` };
  }
  return { success: true };
  } catch (err) {
    console.error("Upload error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
