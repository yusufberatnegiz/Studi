"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  chunkText,
  extractTextFromPdf,
  extractTextWithOCR,
  sanitizeExtractedText,
} from "@/lib/extract";
import {
  buildBalancedContext,
  generateQuestionSet,
  parseTypeCounts,
  QuestionGenerationQualityError,
  type ContextGroup,
  type LabeledContext,
} from "@/lib/question-generation";
import { createClient } from "@/lib/supabase/server";

export type GenerateState =
  | { error: string }
  | {
      success: true;
      questionSetId: string;
      setTitle: string;
      questionCount: number;
      warnings?: string[];
    }
  | null;

export type WeakTopicGenerateState = { error: string } | { questionSetId: string } | null;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type Profile = {
  plan: string | null;
  daily_gen_count: number | null;
  daily_gen_date: string | null;
  daily_ocr_count?: number | null;
  daily_ocr_date?: string | null;
};
type SavedExamFile = {
  id: string;
  filename: string;
  storage_path: string;
};

const FREE_PLAN_MAX_QUESTIONS = 10;
const PREMIUM_MAX_QUESTIONS = 30;
const FREE_DAILY_QUESTION_LIMIT = 15;
const FREE_DAILY_OCR_LIMIT = 10;
const MAX_EXAM_FILES_PER_GENERATION = 6;
const MAX_EXAM_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EXAM_CONTEXT_CHARS = 28_000;
const MAX_KNOWLEDGE_CONTEXT_CHARS = 28_000;
const EXAM_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

const GenerateInputSchema = z.object({
  courseId: z.string().uuid(),
  pastedText: z.string().trim().max(30_000),
  instructions: z.string().trim().max(1000),
  total: z.coerce.number().int().min(1).max(PREMIUM_MAX_QUESTIONS),
  savedExamFileIds: z.array(z.string().uuid()).max(MAX_EXAM_FILES_PER_GENERATION),
});

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function usageForToday(count: number | null | undefined, date: string | null | undefined): number {
  return date === today() ? count ?? 0 : 0;
}

function extension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function sourceLabel(kind: "EXAM" | "MATERIAL" | "STYLE", filename: string, index: number): string {
  const cleanName = filename
    .replace(/[\[\]\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `${kind}:${index + 1}:${cleanName || "source"}`;
}

function segmentsFromText(text: string): string[] {
  const sanitized = sanitizeExtractedText(text).slice(0, 60_000);
  return chunkText(sanitized, 2500);
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
}

async function loadKnowledgeContext(
  supabase: SupabaseClient,
  courseId: string,
  userId: string
): Promise<LabeledContext> {
  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (!documents?.length) return { text: "", references: [] };

  const { data: chunks } = await supabase
    .from("document_chunks")
    .select("document_id, chunk_index, content")
    .in(
      "document_id",
      documents.map((document) => document.id)
    )
    .order("chunk_index", { ascending: true });

  const groups: ContextGroup[] = documents.map((document, index) => ({
    label: sourceLabel("MATERIAL", document.filename, index),
    segments: (chunks ?? [])
      .filter((chunk) => chunk.document_id === document.id)
      .map((chunk) => chunk.content),
  }));

  return buildBalancedContext(groups, MAX_KNOWLEDGE_CONTEXT_CHARS);
}

async function extractExamText(
  filename: string,
  buffer: ArrayBuffer
): Promise<{ text: string; warning: string | null }> {
  const ext = extension(filename);
  if (ext === "pdf") {
    const text = await extractTextFromPdf(buffer);
    if (text.trim().length < 50) {
      return {
        text: "",
        warning: `${filename}: this appears to be a scanned PDF. Upload its pages as JPG or PNG so the questions can be read.`,
      };
    }
    return { text, warning: null };
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    const text = await extractTextWithOCR(buffer, mimeType);
    if (text.trim().length < 20) {
      return { text: "", warning: `${filename}: no readable exam text was found.` };
    }
    return { text, warning: null };
  }

  return { text: "", warning: `${filename}: unsupported file type.` };
}

async function buildExamContext({
  supabase,
  savedFiles,
  uploadedFiles,
  pastedText,
}: {
  supabase: SupabaseClient;
  savedFiles: SavedExamFile[];
  uploadedFiles: File[];
  pastedText: string;
}): Promise<{ context: LabeledContext; warnings: string[] }> {
  const warnings: string[] = [];
  const groups: ContextGroup[] = [];

  if (pastedText) {
    groups.push({ label: sourceLabel("EXAM", "pasted text", 0), segments: segmentsFromText(pastedText) });
  }

  for (const [index, file] of savedFiles.entries()) {
    const { data: blob, error } = await supabase.storage
      .from("exam-uploads")
      .download(file.storage_path);
    if (error || !blob) {
      warnings.push(`${file.filename}: the saved file could not be opened.`);
      continue;
    }

    const extracted = await extractExamText(file.filename, await blob.arrayBuffer());
    if (extracted.warning) warnings.push(extracted.warning);
    if (extracted.text) {
      groups.push({
        label: sourceLabel("EXAM", file.filename, index + 1),
        segments: segmentsFromText(extracted.text),
      });
    }
  }

  for (const [index, file] of uploadedFiles.entries()) {
    const extracted = await extractExamText(file.name, await file.arrayBuffer());
    if (extracted.warning) warnings.push(extracted.warning);
    if (extracted.text) {
      groups.push({
        label: sourceLabel("EXAM", file.name, savedFiles.length + index + 1),
        segments: segmentsFromText(extracted.text),
      });
    }
  }

  return {
    context: buildBalancedContext(groups, MAX_EXAM_CONTEXT_CHARS),
    warnings,
  };
}

async function saveQuestionSet({
  supabase,
  userId,
  courseId,
  title,
  mode,
  questions,
}: {
  supabase: SupabaseClient;
  userId: string;
  courseId: string;
  title: string;
  mode?: "weak_topics";
  questions: Awaited<ReturnType<typeof generateQuestionSet>>;
}): Promise<{ questionSetId: string } | { error: string }> {
  const questionSetId = randomUUID();
  const { error: setError } = await supabase.from("question_sets").insert({
    id: questionSetId,
    user_id: userId,
    course_id: courseId,
    title,
    ...(mode ? { mode } : {}),
  });
  if (setError) {
    console.error("Question set creation failed:", setError.message);
    return { error: "Could not save the question set. Please try again." };
  }

  const { error: questionError } = await supabase.from("questions").insert(
    questions.map(({ style_reference: _styleReference, ...question }, index) => ({
      ...question,
      user_id: userId,
      question_set_id: questionSetId,
      index_in_set: index,
    }))
  );
  if (questionError) {
    console.error("Question insert failed:", questionError.message);
    await supabase.from("question_sets").delete().eq("id", questionSetId).eq("user_id", userId);
    return { error: "Could not save the generated questions. Please try again." };
  }

  return { questionSetId };
}

async function updateFreeUsage(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile | null,
  questionCount: number,
  ocrCount = 0
): Promise<void> {
  const currentGen = usageForToday(profile?.daily_gen_count, profile?.daily_gen_date);
  const currentOcr = usageForToday(profile?.daily_ocr_count, profile?.daily_ocr_date);
  const { error } = await supabase
    .from("profiles")
    .update({
      daily_gen_count: currentGen + questionCount,
      daily_gen_date: today(),
      ...(ocrCount > 0
        ? { daily_ocr_count: currentOcr + ocrCount, daily_ocr_date: today() }
        : {}),
    })
    .eq("user_id", userId);
  if (error) console.error("Usage counter update failed:", error.message);
}

export async function generateQuestions(
  _previousState: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const uploadedFiles = (formData.getAll("examFiles") as File[]).filter(
    (file) => file instanceof File && file.size > 0
  );
  const input = GenerateInputSchema.safeParse({
    courseId: formData.get("courseId"),
    pastedText: formData.get("pastedText") ?? "",
    instructions: formData.get("instructions") ?? "",
    total: formData.get("total") ?? 5,
    savedExamFileIds: formData.getAll("savedExamFileId"),
  });
  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Check the generation settings." };
  }

  if (uploadedFiles.length + input.data.savedExamFileIds.length > MAX_EXAM_FILES_PER_GENERATION) {
    return { error: `Use up to ${MAX_EXAM_FILES_PER_GENERATION} past exam files per generation.` };
  }
  for (const file of uploadedFiles) {
    if (!EXAM_EXTENSIONS.has(extension(file.name))) {
      return { error: `${file.name}: use PDF, JPG, or PNG.` };
    }
    if (file.size > MAX_EXAM_FILE_BYTES) {
      return { error: `${file.name}: exceeds the 10 MB limit.` };
    }
  }
  if (
    uploadedFiles.length === 0 &&
    input.data.savedExamFileIds.length === 0 &&
    !input.data.pastedText
  ) {
    return { error: "Select a past exam file or paste past exam questions." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const [{ data: course }, { data: profile }, { data: savedFiles }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, is_premium")
      .eq("id", input.data.courseId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("plan, daily_gen_count, daily_gen_date, daily_ocr_count, daily_ocr_date")
      .eq("user_id", user.id)
      .single(),
    input.data.savedExamFileIds.length
      ? supabase
          .from("exam_files")
          .select("id, filename, storage_path")
          .in("id", input.data.savedExamFileIds)
          .eq("course_id", input.data.courseId)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as SavedExamFile[] }),
  ]);
  if (!course) return { error: "Course not found." };

  const accountPremium = profile?.plan != null && profile.plan !== "free";
  const isPremium = accountPremium || Boolean(course.is_premium);
  const perGenerationLimit = isPremium ? PREMIUM_MAX_QUESTIONS : FREE_PLAN_MAX_QUESTIONS;
  if (input.data.total > perGenerationLimit) {
    return { error: `This plan allows up to ${perGenerationLimit} questions per generation.` };
  }

  const typeRequest = parseTypeCounts(input.data.instructions, input.data.total);
  if (typeRequest.error) return { error: typeRequest.error };

  if (!isPremium) {
    const remainingQuestions = Math.max(
      0,
      FREE_DAILY_QUESTION_LIMIT - usageForToday(profile?.daily_gen_count, profile?.daily_gen_date)
    );
    if (remainingQuestions === 0) {
      return { error: "Daily question limit reached. Try again tomorrow or upgrade." };
    }
    if (input.data.total > remainingQuestions) {
      return { error: `You have ${remainingQuestions} question${remainingQuestions === 1 ? "" : "s"} left today. Lower the question count and try again.` };
    }
  }

  const selectedSavedFiles = (savedFiles ?? []) as SavedExamFile[];
  const ocrCount =
    selectedSavedFiles.filter((file) => IMAGE_EXTENSIONS.has(extension(file.filename))).length +
    uploadedFiles.filter((file) => IMAGE_EXTENSIONS.has(extension(file.name))).length;
  if (!isPremium && usageForToday(profile?.daily_ocr_count, profile?.daily_ocr_date) + ocrCount > FREE_DAILY_OCR_LIMIT) {
    const remaining = Math.max(
      0,
      FREE_DAILY_OCR_LIMIT - usageForToday(profile?.daily_ocr_count, profile?.daily_ocr_date)
    );
    return { error: `This generation needs ${ocrCount} image scan${ocrCount === 1 ? "" : "s"}, but you have ${remaining} left today.` };
  }

  const warnings: string[] = [];
  if (selectedSavedFiles.length !== input.data.savedExamFileIds.length) {
    warnings.push("One or more selected exam files were unavailable and were skipped.");
  }

  try {
    const [knowledgeContext, examResult] = await Promise.all([
      loadKnowledgeContext(supabase, input.data.courseId, user.id),
      buildExamContext({
        supabase,
        savedFiles: selectedSavedFiles,
        uploadedFiles,
        pastedText: input.data.pastedText,
      }),
    ]);
    warnings.push(...examResult.warnings);
    if (!isPremium && ocrCount > 0) {
      // OCR usage is consumed once images are read, even if later quality checks fail.
      await updateFreeUsage(supabase, user.id, profile as Profile | null, 0, ocrCount);
    }
    if (!examResult.context.text) {
      return { error: `No readable past exam questions were found.${warnings.length ? ` ${warnings.join(" ")}` : ""}` };
    }

    const questions = await generateQuestionSet({
      total: input.data.total,
      instructions: input.data.instructions,
      typeCounts: typeRequest.counts,
      examContext: examResult.context,
      knowledgeContext,
    });
    const title = `${course.title} - ${new Date().toLocaleDateString("en-US")}`;
    const saved = await saveQuestionSet({
      supabase,
      userId: user.id,
      courseId: input.data.courseId,
      title,
      questions,
    });
    if ("error" in saved) return saved;

    if (!isPremium) {
      await updateFreeUsage(supabase, user.id, profile as Profile | null, questions.length);
    }
    revalidatePath(`/app/courses/${input.data.courseId}`);
    return {
      success: true,
      questionSetId: saved.questionSetId,
      setTitle: title,
      questionCount: questions.length,
      ...(warnings.length ? { warnings } : {}),
    };
  } catch (error) {
    console.error("Question generation failed:", safeErrorMessage(error));
    return {
      error: error instanceof QuestionGenerationQualityError
        ? "Question generation did not pass the quality checks. Please try again."
        : "Question generation is temporarily unavailable. Please try again in a moment.",
    };
  }
}

async function loadRecentStyleContext(
  supabase: SupabaseClient,
  courseId: string,
  userId: string
): Promise<LabeledContext | null> {
  const { data: recentSet } = await supabase
    .from("question_sets")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!recentSet) return null;

  const { data: questions } = await supabase
    .from("questions")
    .select("question_text")
    .eq("question_set_id", recentSet.id)
    .eq("user_id", userId)
    .order("index_in_set", { ascending: true })
    .limit(12);
  if (!questions?.length) return null;

  return buildBalancedContext(
    [
      {
        label: sourceLabel("STYLE", "recent question set", 0),
        segments: questions.map((question) => question.question_text),
      },
    ],
    12_000
  );
}

export async function generateWeakTopicQuestions(
  courseId: string
): Promise<WeakTopicGenerateState> {
  if (!z.string().uuid().safeParse(courseId).success) return { error: "Invalid course." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const [{ data: course }, { data: profile }, { data: stats }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, is_premium")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("plan, daily_gen_count, daily_gen_date")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("topic_stats")
      .select("topic, attempts, correct")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .gte("attempts", 2),
  ]);
  if (!course) return { error: "Course not found." };

  const weakTopics = (stats ?? [])
    .filter((item) => item.correct / item.attempts < 0.8)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
    .slice(0, 5);
  if (!weakTopics.length) {
    return { error: "No weak topics are ready yet. A topic needs at least two attempts and accuracy below 80%." };
  }

  const accountPremium = profile?.plan != null && profile.plan !== "free";
  const isPremium = accountPremium || Boolean(course.is_premium);
  const remaining = isPremium
    ? 5
    : Math.max(0, FREE_DAILY_QUESTION_LIMIT - usageForToday(profile?.daily_gen_count, profile?.daily_gen_date));
  if (remaining === 0) return { error: "Daily question limit reached. Try again tomorrow or upgrade." };
  const total = Math.min(5, remaining);

  try {
    const [knowledgeContext, styleContext] = await Promise.all([
      loadKnowledgeContext(supabase, courseId, user.id),
      loadRecentStyleContext(supabase, courseId, user.id),
    ]);
    if (!knowledgeContext.text) {
      return { error: "Upload course materials before generating weak-topic practice." };
    }

    const topicLabels = weakTopics.map((item) => {
      const accuracy = Math.round((item.correct / item.attempts) * 100);
      return `${item.topic} (${accuracy}% accuracy)`;
    });
    const questions = await generateQuestionSet({
      total,
      instructions: "Create focused remediation questions that diagnose and correct likely misconceptions.",
      typeCounts: null,
      examContext: styleContext,
      knowledgeContext,
      weakTopics: topicLabels,
    });
    const title = `${course.title} - Weak Topics - ${new Date().toLocaleDateString("en-US")}`;
    const saved = await saveQuestionSet({
      supabase,
      userId: user.id,
      courseId,
      title,
      mode: "weak_topics",
      questions,
    });
    if ("error" in saved) return saved;

    if (!isPremium) await updateFreeUsage(supabase, user.id, profile as Profile | null, questions.length);
    revalidatePath(`/app/courses/${courseId}`);
    return { questionSetId: saved.questionSetId };
  } catch (error) {
    console.error("Weak-topic generation failed:", safeErrorMessage(error));
    return {
      error: error instanceof QuestionGenerationQualityError
        ? "Weak-topic generation did not pass the quality checks. Please try again."
        : "Weak-topic generation is temporarily unavailable. Please try again in a moment.",
    };
  }
}
