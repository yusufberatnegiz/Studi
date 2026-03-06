"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CreateCourseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  course_code: z.string().optional(),
});

export type CreateCourseState = { error: string } | { success: true } | null;

export async function createCourse(
  _prevState: CreateCourseState,
  formData: FormData
): Promise<CreateCourseState> {
  const parsed = CreateCourseSchema.safeParse({
    title: formData.get("title"),
    course_code: (formData.get("course_code") as string) || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase.from("courses").insert({
    title: parsed.data.title,
    course_code: parsed.data.course_code ?? null,
    user_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app");
  return { success: true };
}
