"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SetMutationSchema = z.object({
  setId: z.string().uuid(),
  courseId: z.string().uuid(),
});

export async function deleteQuestionSet(
  setId: string,
  courseId: string
): Promise<{ error: string } | { success: true }> {
  const input = SetMutationSchema.safeParse({ setId, courseId });
  if (!input.success) return { error: "Invalid question set." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("question_sets")
    .delete()
    .eq("id", input.data.setId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete question set error:", error);
    return { error: "Could not delete question set." };
  }

  revalidatePath(`/app/courses/${input.data.courseId}/sets`);
  return { success: true };
}

export async function renameQuestionSet(
  setId: string,
  courseId: string,
  title: string
): Promise<{ error: string } | { success: true }> {
  const input = SetMutationSchema.safeParse({ setId, courseId });
  if (!input.success) return { error: "Invalid question set." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmed = title.trim();
  if (!trimmed) return { error: "Title cannot be empty." };
  if (trimmed.length > 120) return { error: "Title must be 120 characters or fewer." };

  const { error } = await supabase
    .from("question_sets")
    .update({ title: trimmed })
    .eq("id", input.data.setId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Rename question set error:", error);
    return { error: "Could not rename question set." };
  }

  revalidatePath(`/app/courses/${input.data.courseId}/sets`);
  return { success: true };
}
