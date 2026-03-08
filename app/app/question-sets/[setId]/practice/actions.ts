"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SubmitSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(1, "Please write an answer before submitting."),
});

export type AttemptResult = { error: string } | { success: true } | null;

export async function submitAttempt(
  _prev: AttemptResult,
  formData: FormData
): Promise<AttemptResult> {
  const parsed = SubmitSchema.safeParse({
    questionId: formData.get("questionId"),
    answerText: formData.get("answerText"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("attempts").insert({
    user_id: user.id,
    question_id: parsed.data.questionId,
    answer_text: parsed.data.answerText,
  });

  if (error) return { error: `Could not save answer: ${error.message}` };
  return { success: true };
}
