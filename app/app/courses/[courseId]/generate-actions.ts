"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf, extractTextWithOCR } from "@/lib/extract";
import { getSourceFileMimeType } from "@/lib/source-upload";

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
  const examFiles = formData.getAll("examFiles") as File[];
  const pastedText = ((formData.get("pastedText") as string) ?? "").trim();

  if (!z.string().uuid().safeParse(courseId).success) {
    return { error: "Invalid course." };
  }

  const validExamFiles = examFiles.filter((f) => f instanceof File && f.size > 0);
  const hasFiles = validExamFiles.length > 0;
  const hasText = pastedText.length > 0;

  if (!hasFiles && !hasText) {
    return {
      error: "Provide a past exam file or paste exam text - at least one is required.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();
  if (!course) return { error: "Course not found." };

  // ---------------------------------------------------------------------------
  // 1. Gather source material chunks (knowledge base — optional)
  // ---------------------------------------------------------------------------

  let knowledgeBase = "";

  const { data: readyDocs } = await supabase
    .from("documents")
    .select("id")
    .eq("course_id", courseId)
    .eq("status", "ready");

  const readyIds = (readyDocs ?? []).map((d) => d.id);

  if (readyIds.length > 0) {
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content")
      .in("document_id", readyIds)
      .order("chunk_index", { ascending: true });

    const MAX_KB = 6000;
    for (const chunk of chunks ?? []) {
      if (knowledgeBase.length + chunk.content.length > MAX_KB) break;
      knowledgeBase += chunk.content + "\n\n";
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Extract exam context from all provided files + pasted text
  // ---------------------------------------------------------------------------

  let examContext = pastedText.slice(0, 4000);
  const fileWarnings: string[] = [];

  for (const file of validExamFiles) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") {
      const buffer = await file.arrayBuffer();
      const extracted = await extractTextFromPdf(buffer);
      if (extracted.trim().length < 20) {
        fileWarnings.push(`${file.name}: could not extract text (may be scanned). Paste the text instead.`);
      } else {
        examContext += "\n\n" + extracted.slice(0, 3000);
      }
    } else if (["jpg", "jpeg", "png"].includes(ext)) {
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      const buffer = await file.arrayBuffer();
      const ocr = await extractTextWithOCR(buffer, mimeType);
      if (ocr.trim().length < 20) {
        fileWarnings.push(`${file.name}: OCR found no readable text. Paste the questions instead.`);
      } else {
        examContext += "\n\n" + ocr.slice(0, 3000);
      }
    }
  }

  // Cap total exam context
  examContext = examContext.slice(0, 6000).trim();

  if (!examContext) {
    const warn = fileWarnings.length > 0 ? " " + fileWarnings.join(" ") : "";
    return { error: "No readable exam content found." + warn };
  }

  // ---------------------------------------------------------------------------
  // 3. Build AI user message
  // ---------------------------------------------------------------------------

  const userMessage = knowledgeBase
    ? `## Course Material (Knowledge Base)\n${knowledgeBase.trim()}\n\n## Past Exam (Style Reference)\n${examContext.trim()}\n\nGenerate 5 questions based on the course material. Match the style and difficulty of the past exam.`
    : `## Source Material\n${examContext.trim()}\n\nGenerate 5 exam-style questions from this material.`;

  // ---------------------------------------------------------------------------
  // 4. Create question_set row (roll back on AI failure)
  // ---------------------------------------------------------------------------

  const questionSetId = randomUUID();
  const title = `${course.title} - ${new Date().toLocaleDateString("en-GB")}`;

  const { error: qsError } = await supabase.from("question_sets").insert({
    id: questionSetId,
    user_id: user.id,
    course_id: courseId,
    title,
  });
  if (qsError) return { error: `Could not create question set: ${qsError.message}` };

  // ---------------------------------------------------------------------------
  // 5. Call OpenAI server-side
  // ---------------------------------------------------------------------------

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
- Each question must test exactly ONE main concept - no multi-part questions.
- Keep question_text short and concise (1–3 sentences max). Do not number or label questions.
- Write solution_text as a clear, complete model answer (not a list of sub-answers).
- Questions must be directly answerable from the provided material.
- If a past exam is provided as style reference, match its question style and difficulty.

QUESTION MIX - generate exactly 5 questions in this order:
1. Definition question - "Define X" or "What is X?"
2. Definition question - "Define X" or "What is X?"
3. Explanation question - "Explain how/why X works"
4. Explanation question - "Explain the difference between X and Y"
5. Coding or application question - short code snippet or applied scenario (if material contains code; otherwise use another explanation question)

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
          content: userMessage,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const json = JSON.parse(raw);
    parsed = AIResponseSchema.parse(json);
  } catch (err) {
    await supabase.from("question_sets").delete().eq("id", questionSetId);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { error: `AI generation failed: ${msg}` };
  }

  // ---------------------------------------------------------------------------
  // 6. Insert questions
  // ---------------------------------------------------------------------------

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
