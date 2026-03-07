"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export type GenerateState = { error: string } | { success: true } | null;

// ---------------------------------------------------------------------------
// Zod schema — validates the raw JSON the model returns
// ---------------------------------------------------------------------------

const QuestionSchema = z.object({
  question_text: z.string().min(1),
  question_type: z.literal("open"),
  solution_text: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  source_refs: z.array(z.string()),
});

const AIResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(10),
});

// ---------------------------------------------------------------------------
// Server action — called from GenerateForm
// ---------------------------------------------------------------------------

export async function generateQuestions(
  _prevState: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const courseId = formData.get("courseId") as string;

  if (!z.string().uuid().safeParse(courseId).success) {
    return { error: "Invalid course." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Verify course ownership
  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();
  if (!course) return { error: "Course not found." };

  // Get IDs of ready documents in this course
  const { data: readyDocs } = await supabase
    .from("documents")
    .select("id")
    .eq("course_id", courseId)
    .eq("status", "ready");

  const readyIds = (readyDocs ?? []).map((d) => d.id);
  if (readyIds.length === 0) {
    return {
      error:
        "No ready documents found. Upload a document and wait for extraction to finish.",
    };
  }

  // Fetch chunks for those documents, ordered by document + chunk index
  const { data: chunks } = await supabase
    .from("document_chunks")
    .select("content")
    .in("document_id", readyIds)
    .order("chunk_index", { ascending: true });

  if (!chunks || chunks.length === 0) {
    return { error: "Documents processed but no content found." };
  }

  // Cap material at ~8 000 chars to keep prompt cost reasonable
  const MAX_CHARS = 8000;
  let material = "";
  for (const chunk of chunks) {
    if (material.length + chunk.content.length > MAX_CHARS) break;
    material += chunk.content + "\n\n";
  }

  // Create question_set row first so we can roll it back on AI failure
  const questionSetId = randomUUID();
  const title = `${course.title} — ${new Date().toLocaleDateString("en-GB")}`;

  const { error: qsError } = await supabase.from("question_sets").insert({
    id: questionSetId,
    user_id: user.id,
    course_id: courseId,
    title,
  });
  if (qsError) return { error: `Could not create question set: ${qsError.message}` };

  // Call OpenAI server-side (key never leaves the server)
  const openai = new OpenAI({ apiKey: process.env.AI_API_KEY });

  let parsed: z.infer<typeof AIResponseSchema>;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are generating university exam-style practice questions for a one-question-at-a-time study app.

RULES:
- Use ONLY the provided material as the source.
- Each question must test exactly ONE main concept — no multi-part questions.
- Keep question_text short and concise (1–3 sentences max). Do not number or label questions.
- Write solution_text as a clear, complete model answer (not a list of sub-answers).
- Questions must be directly answerable from the material.

QUESTION MIX — generate exactly 5 questions in this order:
1. Definition question — "Define X" or "What is X?"
2. Definition question — "Define X" or "What is X?"
3. Explanation question — "Explain how/why X works"
4. Explanation question — "Explain the difference between X and Y"
5. Coding or application question — short code snippet or applied scenario (if material contains code; otherwise use another explanation question)

Return EXACTLY 5 questions as a JSON object:
{
  "questions": [
    {
      "question_text": "Concise question text",
      "question_type": "open",
      "solution_text": "Complete model answer",
      "topic": "Topic or concept name",
      "difficulty": "easy" | "medium" | "hard",
      "source_refs": []
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Generate 5 exam-style questions from this material:\n\n${material}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const json = JSON.parse(raw);
    parsed = AIResponseSchema.parse(json);
  } catch (err) {
    // Roll back the empty question_set row
    await supabase.from("question_sets").delete().eq("id", questionSetId);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { error: `AI generation failed: ${msg}` };
  }

  // Insert questions
  const { error: qError } = await supabase.from("questions").insert(
    parsed.questions.map((q, i) => ({
      user_id: user.id,
      question_set_id: questionSetId,
      index_in_set: i,
      question_text: q.question_text,
      question_type: q.question_type,
      solution_text: q.solution_text,
      topic: q.topic,
      difficulty: q.difficulty,
      source_refs: q.source_refs,
    }))
  );

  if (qError) {
    await supabase.from("question_sets").delete().eq("id", questionSetId);
    return { error: `Failed to save questions: ${qError.message}` };
  }

  revalidatePath(`/app/courses/${courseId}`);
  return { success: true };
}
