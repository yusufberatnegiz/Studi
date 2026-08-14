"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processSourceFile } from "@/lib/source-upload";

const CreateCourseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer"),
});

export type CreateCourseState =
  | { error: string }
  | { success: true; courseId: string; fileErrors?: string[] }
  | null;

export async function createCourse(
  _prevState: CreateCourseState,
  formData: FormData
): Promise<CreateCourseState> {
  const parsed = CreateCourseSchema.safeParse({
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const files = formData.getAll("files") as File[];
  const validFiles = files.filter((file) => file instanceof File && file.size > 0);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Free-plan course limit — premium users bypass
  const FREE_PLAN_MAX_COURSES = 2;
  const [{ data: profile }, { count: courseCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, daily_ocr_count, daily_ocr_date")
      .eq("user_id", user.id)
      .single(),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const isPremiumUser = profile?.plan != null && profile.plan !== "free";
  if (!isPremiumUser && (courseCount ?? 0) >= FREE_PLAN_MAX_COURSES) {
    return { error: `Free plan is limited to ${FREE_PLAN_MAX_COURSES} courses. Upgrade to create more.` };
  }
  if (!isPremiumUser && validFiles.length > 15) {
    return { error: "A free course can start with up to 15 source materials." };
  }

  const imageFiles = validFiles.filter((file) =>
    ["jpg", "jpeg", "png"].includes(file.name.split(".").pop()?.toLowerCase() ?? "")
  );
  if (!isPremiumUser && imageFiles.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const usedToday = profile?.daily_ocr_date === today ? profile.daily_ocr_count ?? 0 : 0;
    if (usedToday + imageFiles.length > 10) {
      return { error: `You have ${Math.max(0, 10 - usedToday)} image scans left today.` };
    }
  }

  const { data: course, error } = await supabase
    .from("courses")
    .insert({ title: parsed.data.title, user_id: user.id })
    .select("id")
    .single();

  if (error || !course) {
    console.error("Course creation error:", error);
    return { error: "Could not create course. Please try again." };
  }

  // Optional: process any source files uploaded during course creation
  const fileErrors: string[] = [];
  for (const file of validFiles) {
    const err = await processSourceFile(supabase, file, user.id, course.id, isPremiumUser);
    if (err) fileErrors.push(err);
  }

  if (!isPremiumUser && imageFiles.length > 0) {
    const currentDate = new Date().toISOString().split("T")[0];
    const usedToday = profile?.daily_ocr_date === currentDate ? profile.daily_ocr_count ?? 0 : 0;
    await supabase
      .from("profiles")
      .update({ daily_ocr_count: usedToday + imageFiles.length, daily_ocr_date: currentDate })
      .eq("user_id", user.id);
  }

  revalidatePath("/app");
  return {
    success: true,
    courseId: course.id,
    ...(fileErrors.length > 0 ? { fileErrors } : {}),
  };
}

export type DeleteCourseState = { error: string } | { success: true } | null;

export async function deleteCourse(
  courseId: string
): Promise<DeleteCourseState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete course error:", error);
    return { error: "Could not delete course. Please try again." };
  }

  revalidatePath("/app");
  return { success: true };
}
