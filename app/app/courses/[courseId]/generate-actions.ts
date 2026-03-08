"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf, extractTextWithOCR } from "@/lib/extract";

export type GenerateState = { error: string } | { success: true } | null;
export type WeakTopicGenerateState = { error: string } | { questionSetId: string } | null;

// ---------------------------------------------------------------------------
// Zod schema — validates the raw JSON the model returns
// ---------------------------------------------------------------------------

const QuestionSchema = z.object({
  question_text: z.string().min(1),
  question_type: z.enum(["open", "tf", "mcq", "coding"]),
  choices: z.array(z.string()).nullable().optional(),
  solution_text: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  source_refs: z.array(z.string()),
});

const AIResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(10),
});

// ---------------------------------------------------------------------------
// Instruction parser — extracts explicit type counts from free-text instructions
// ---------------------------------------------------------------------------

type TypeCounts = { total: number; open: number; tf: number; mcq: number; coding: number };

function parseTypeCounts(instructions: string, fallbackTotal: number): TypeCounts | null {
  const s = instructions.toLowerCase();

  const get = (pattern: RegExp) => {
    const m = s.match(pattern);
    return m ? Math.max(0, parseInt(m[1])) : 0;
  };

  const tf     = get(/(\d+)\s*(?:tf\b|true[\s\-/]?false)/);
  const mcq    = get(/(\d+)\s*(?:mcq\b|multiple[\s\-]?choice)/);
  const coding = get(/(\d+)\s*(?:coding\b|code\b)/);
  const open   = get(/(\d+)\s*(?:open\b|explanation\b|definition\b)/);

  const sum = tf + mcq + coding + open;
  if (sum === 0) return null; // no explicit breakdown found

  const totalMatch = s.match(/(\d+)\s*questions?\b/);
  const total = totalMatch ? parseInt(totalMatch[1]) : sum;

  return { total, open, tf, mcq, coding };
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(total: number, instructions: string, counts: TypeCounts | null): string {
  const typeDefinitions = `QUESTION TYPES:
- "open": Free-text answer (definitions, explanations). choices must be null.
- "tf": True/False. question_text is a declarative STATEMENT. choices must be ["True", "False"]. solution_text begins with "True." or "False." and explains why.
- "mcq": Multiple choice. choices must be exactly 4 strings (one correct, three plausible distractors). solution_text names the correct choice and explains why.
- "coding": Student must write code (implement, complete, or declare). choices must be null.`;

  const schema = `Return a JSON object:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "open" | "tf" | "mcq" | "coding",
      "choices": null | ["True", "False"] | ["A", "B", "C", "D"],
      "solution_text": "...",
      "topic": "...",
      "difficulty": "easy" | "medium" | "hard",
      "source_refs": []
    }
  ]
}`;

  if (counts) {
    const breakdown = [
      counts.open   > 0 ? `  - ${counts.open} open/explanation` : "",
      counts.tf     > 0 ? `  - ${counts.tf} true/false` : "",
      counts.mcq    > 0 ? `  - ${counts.mcq} multiple choice` : "",
      counts.coding > 0 ? `  - ${counts.coding} coding` : "",
    ].filter(Boolean).join("\n");

    const extra = instructions ? `\nStyle/topic context: ${instructions}` : "";

    return `You are generating university exam-style practice questions for a one-question-at-a-time study app.

Generate EXACTLY ${counts.total} questions with this EXACT type breakdown — do not deviate:
${breakdown}${extra}

RULES:
- Each question tests exactly ONE concept. No multi-part questions.
- question_text must be concise (1–3 sentences). Do not number or label questions.
- solution_text must be a complete, clear model answer.
- Questions must be directly answerable from the provided material.

${typeDefinitions}

${schema}`;
  }

  // No explicit breakdown — free choice of types
  const countLine = instructions
    ? `Follow the user's instructions — including question count and any style preferences.`
    : `Generate EXACTLY ${total} question${total !== 1 ? "s" : ""}.`;
  const instrBlock = instructions ? `\nUser instructions: ${instructions}` : "";

  return `You are generating university exam-style practice questions for a one-question-at-a-time study app.

${countLine}${instrBlock}

RULES:
- Each question tests exactly ONE concept. No multi-part questions.
- question_text must be concise (1–3 sentences). Do not number or label questions.
- solution_text must be a complete, clear model answer.
- Questions must be directly answerable from the provided material.
- Choose question types naturally based on the material and any user instructions.

${typeDefinitions}

${schema}`;
}

// ---------------------------------------------------------------------------
// Post-AI count validation
// ---------------------------------------------------------------------------

function validateCounts(
  questions: z.infer<typeof QuestionSchema>[],
  counts: TypeCounts
): string | null {
  if (questions.length !== counts.total) {
    return `Expected ${counts.total} questions but AI generated ${questions.length}. Please try again.`;
  }
  const got = { open: 0, tf: 0, mcq: 0, coding: 0 };
  for (const q of questions) got[q.question_type as keyof typeof got]++;

  if (got.open   !== counts.open)   return `Expected ${counts.open} open question(s) but got ${got.open}. Please try again.`;
  if (got.tf     !== counts.tf)     return `Expected ${counts.tf} true/false question(s) but got ${got.tf}. Please try again.`;
  if (got.mcq    !== counts.mcq)    return `Expected ${counts.mcq} MCQ question(s) but got ${got.mcq}. Please try again.`;
  if (got.coding !== counts.coding) return `Expected ${counts.coding} coding question(s) but got ${got.coding}. Please try again.`;
  return null;
}

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
  const instructions = ((formData.get("instructions") as string) ?? "").trim().slice(0, 500);
  const total = Math.min(10, Math.max(1, parseInt(formData.get("total") as string) || 5));

  // Parse explicit type counts from instructions (e.g. "2 tf 2 mcq 1 coding 1 open")
  const parsedCounts = parseTypeCounts(instructions, total);
  const effectiveTotal = parsedCounts ? parsedCounts.total : total;

  if (!z.string().uuid().safeParse(courseId).success) {
    return { error: "Invalid course." };
  }

  const validExamFiles = examFiles.filter((f) => f instanceof File && f.size > 0);

  if (validExamFiles.length === 0 && !pastedText) {
    return { error: "Provide a past exam file or paste exam text — at least one is required." };
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
  // 2. Extract exam context from provided files + pasted text
  // ---------------------------------------------------------------------------

  let examContext = pastedText.slice(0, 4000);
  const fileWarnings: string[] = [];

  for (const file of validExamFiles) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") {
      const buffer = await file.arrayBuffer();
      const extracted = await extractTextFromPdf(buffer);
      if (extracted.trim().length < 50) {
        fileWarnings.push(
          `${file.name}: this PDF appears to be scanned (no selectable text). ` +
            `Export each page as a .jpg or .png and upload those, or paste the exam text directly.`
        );
      } else {
        examContext += "\n\n" + extracted.slice(0, 3000);
      }
    } else if (["jpg", "jpeg", "png"].includes(ext)) {
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      const buffer = await file.arrayBuffer();
      const text = await extractTextWithOCR(buffer, mimeType);
      if (text.trim().length < 20) {
        fileWarnings.push(`${file.name}: OCR found no readable text. Paste the questions instead.`);
      } else {
        examContext += "\n\n" + text.slice(0, 3000);
      }
    }
  }

  examContext = examContext.slice(0, 6000).trim();

  if (!examContext) {
    const warn = fileWarnings.length > 0 ? " " + fileWarnings.join(" ") : "";
    return { error: "No readable exam content found." + warn };
  }

  // ---------------------------------------------------------------------------
  // 3. Build AI user message
  // ---------------------------------------------------------------------------

  const userMessage = knowledgeBase
    ? `## Course Material (Knowledge Base)\n${knowledgeBase.trim()}\n\n## Past Exam (Style Reference)\n${examContext.trim()}\n\nGenerate exactly ${effectiveTotal} questions based on the course material. Match the style and difficulty of the past exam.`
    : `## Source Material\n${examContext.trim()}\n\nGenerate exactly ${effectiveTotal} exam-style questions from this material.`;

  // ---------------------------------------------------------------------------
  // 4. Create question_set row (rolled back on AI failure)
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
  // 5. Call OpenAI
  // ---------------------------------------------------------------------------

  const openai = new OpenAI({ apiKey: process.env.AI_API_KEY });

  let parsed: z.infer<typeof AIResponseSchema>;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(total, instructions, parsedCounts) },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    parsed = AIResponseSchema.parse(JSON.parse(raw));

    // If instructions specified an exact breakdown, validate strictly
    if (parsedCounts) {
      const err = validateCounts(parsed.questions, parsedCounts);
      if (err) throw new Error(err);
    }
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
      choices: q.choices?.length ? q.choices : null,
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

// ---------------------------------------------------------------------------
// Weak-topic generation — called directly from WeakTopicForm client component
// ---------------------------------------------------------------------------

export async function generateWeakTopicQuestions(
  courseId: string
): Promise<WeakTopicGenerateState> {
  if (!z.string().uuid().safeParse(courseId).success) {
    return { error: "Invalid course." };
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

  // 1. Load weak topics — at least 2 attempts, sorted by accuracy asc
  const { data: stats } = await supabase
    .from("topic_stats")
    .select("topic, attempts, correct")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .gte("attempts", 2);

  if (!stats || stats.length === 0) {
    return {
      error:
        "Answer more questions to unlock weak-topic practice. You need at least 2 attempts on a topic.",
    };
  }

  // Sort weakest first (lowest accuracy), take top 5
  const weakTopics = [...stats]
    .sort((a, b) => {
      const accA = a.correct / a.attempts;
      const accB = b.correct / b.attempts;
      return accA - accB;
    })
    .slice(0, 5);

  // 2. Load knowledge base chunks
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

  if (!knowledgeBase.trim()) {
    return {
      error:
        "No course materials found. Upload lecture notes or slides before generating weak-topic practice.",
    };
  }

  // 3. Build prompt
  const topicList = weakTopics
    .map((t) => {
      const acc = Math.round((t.correct / t.attempts) * 100);
      return `- ${t.topic} (${acc}% accuracy, ${t.attempts} attempt${t.attempts === 1 ? "" : "s"})`;
    })
    .join("\n");

  const systemPrompt = `You are generating university exam-style practice questions for a one-question-at-a-time study app.

Generate EXACTLY 5 questions targeting the student's weakest topics. Prioritize the topics listed weakest-first.

RULES:
- Each question tests exactly ONE concept. No multi-part questions.
- question_text must be concise (1–3 sentences). Do not number or label questions.
- solution_text must be a complete, clear model answer.
- Questions must be directly answerable from the provided material.
- Choose question types naturally based on the material (open, tf, mcq, or coding).

QUESTION TYPES:
- "open": Free-text answer (definitions, explanations). choices must be null.
- "tf": True/False. question_text is a declarative STATEMENT. choices must be ["True", "False"]. solution_text begins with "True." or "False." and explains why.
- "mcq": Multiple choice. choices must be exactly 4 strings (one correct, three plausible distractors). solution_text names the correct choice and explains why.
- "coding": Student must write code (implement, complete, or declare). choices must be null.

Return a JSON object:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "open" | "tf" | "mcq" | "coding",
      "choices": null | ["True", "False"] | ["A", "B", "C", "D"],
      "solution_text": "...",
      "topic": "...",
      "difficulty": "easy" | "medium" | "hard",
      "source_refs": []
    }
  ]
}`;

  const userMessage = `## Course Material (Knowledge Base)
${knowledgeBase.trim()}

## Weak Topics to Target (weakest first)
${topicList}

Generate exactly 5 exam-style practice questions that specifically target the weak topics listed above. Focus most questions on the weakest topics.`;

  // 4. Create question_set row
  const questionSetId = randomUUID();
  const title = `${course.title} – Weak Topics · ${new Date().toLocaleDateString("en-GB")}`;

  const { error: qsError } = await supabase.from("question_sets").insert({
    id: questionSetId,
    user_id: user.id,
    course_id: courseId,
    title,
    mode: "weak_topics",
  });
  if (qsError) return { error: `Could not create question set: ${qsError.message}` };

  // 5. Call OpenAI
  const openai = new OpenAI({ apiKey: process.env.AI_API_KEY });

  let parsed: z.infer<typeof AIResponseSchema>;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    parsed = AIResponseSchema.parse(JSON.parse(raw));
  } catch (err) {
    await supabase.from("question_sets").delete().eq("id", questionSetId);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { error: `AI generation failed: ${msg}` };
  }

  // 6. Insert questions
  const { error: qError } = await supabase.from("questions").insert(
    parsed.questions.map((q, i) => ({
      user_id: user.id,
      question_set_id: questionSetId,
      index_in_set: i,
      question_text: q.question_text,
      question_type: q.question_type,
      choices: q.choices?.length ? q.choices : null,
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
  return { questionSetId };
}
