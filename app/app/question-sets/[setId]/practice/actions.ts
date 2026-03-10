"use server";

import { z } from "zod";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GradeResult = {
  is_correct: boolean;
  score: number;
  feedback: string;
  gradingFailed?: boolean;
};

export type AttemptResult = { error: string } | { grade: GradeResult } | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]+$/, "");
}

// ---------------------------------------------------------------------------
// Grading helpers
// ---------------------------------------------------------------------------

function gradeTf(
  solutionText: string,
  answerText: string,
  correctAnswer: string | null
): GradeResult {
  let correct: string;

  if (correctAnswer) {
    // Reliable: normalized comparison against stored correct_answer
    correct = correctAnswer.trim();
  } else {
    // Legacy fallback: infer from solution_text
    correct = solutionText.trim().toLowerCase().startsWith("true") ? "True" : "False";
  }

  const is_correct = normalize(answerText) === normalize(correct);
  return {
    is_correct,
    score: is_correct ? 100 : 0,
    feedback: is_correct
      ? "Correct."
      : `Incorrect. The correct answer is ${correct}.`,
  };
}

function gradeMcq(
  solutionText: string,
  answerText: string,
  correctAnswer: string | null
): GradeResult {
  let is_correct: boolean;

  if (correctAnswer) {
    // Reliable: normalized string comparison against stored correct_answer
    is_correct = normalize(correctAnswer) === normalize(answerText);
  } else {
    // Legacy fallback: check if answer appears in the opening of solution_text
    const solutionStart = solutionText.trim().slice(0, 120).toLowerCase();
    is_correct = solutionStart.includes(answerText.trim().toLowerCase());
  }

  return {
    is_correct,
    score: is_correct ? 100 : 0,
    feedback: is_correct
      ? "Correct."
      : correctAnswer
      ? `Incorrect. The correct answer is "${correctAnswer}".`
      : "Incorrect. Check the solution for the right answer.",
  };
}

async function gradeWithAI(
  questionText: string,
  solutionText: string,
  answerText: string,
  isCoding: boolean
): Promise<GradeResult> {
  const openai = new OpenAI({ apiKey: process.env.AI_API_KEY });

  const typeGuidance = isCoding
    ? "Focus on whether the code is logically correct and solves the task — do not penalise for minor style differences."
    : "Focus on whether the key concept is correctly explained.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are grading a student's answer for a university exam question. ${typeGuidance}

Respond with ONLY a JSON object:
{
  "is_correct": true | false,
  "score": 0-100,
  "feedback": "1–2 sentence feedback"
}

Scoring:
- 90–100: fully correct and complete
- 70–89: mostly correct, minor gaps
- 40–69: partially correct, key idea present but incomplete
- 0–39: mostly wrong or key concept missing

is_correct = true when score >= 70.
feedback must be SHORT (1–2 sentences): say what was right or state the most important thing missed.`,
        },
        {
          role: "user",
          content: `Question: ${questionText}\n\nCorrect solution: ${solutionText}\n\nStudent's answer: ${answerText}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const json = JSON.parse(raw);
    const score = Math.min(100, Math.max(0, Number(json.score) || 0));
    return {
      is_correct: Boolean(json.is_correct),
      score,
      feedback:
        typeof json.feedback === "string" && json.feedback.length > 0
          ? json.feedback.slice(0, 300)
          : "Graded.",
    };
  } catch {
    return { is_correct: false, score: 0, feedback: "", gradingFailed: true };
  }
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

const SubmitSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(1, "Please write an answer before submitting."),
});

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

  const { questionId, answerText } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Load question for grading — include correct_answer for reliable MCQ/TF grading
  const { data: question } = await supabase
    .from("questions")
    .select("question_text, question_type, choices, solution_text, correct_answer, topic, question_set_id")
    .eq("id", questionId)
    .single();

  if (!question) return { error: "Question not found." };

  // Insert attempt first (so it's saved even if grading fails)
  const { data: attempt, error: insertError } = await supabase
    .from("attempts")
    .insert({ user_id: user.id, question_id: questionId, answer_text: answerText })
    .select("id")
    .single();

  if (insertError || !attempt) {
    return { error: `Could not save answer: ${insertError?.message ?? "unknown error"}` };
  }

  // Grade the answer
  let grade: GradeResult;
  const qType = question.question_type as string;
  // correct_answer may be null for old questions (before the column was added)
  const correctAnswer = (question as { correct_answer?: string | null }).correct_answer ?? null;

  if (qType === "tf") {
    grade = gradeTf(question.solution_text, answerText, correctAnswer);
  } else if (qType === "mcq") {
    grade = gradeMcq(question.solution_text, answerText, correctAnswer);
  } else {
    // open or coding — AI grading
    grade = await gradeWithAI(
      question.question_text,
      question.solution_text,
      answerText,
      qType === "coding"
    );
  }

  // Update attempt with grade (best-effort)
  if (!grade.gradingFailed) {
    await supabase
      .from("attempts")
      .update({ is_correct: grade.is_correct, score: grade.score, feedback: grade.feedback })
      .eq("id", attempt.id);
  }

  // Update topic_stats (best-effort — don't fail grading if this errors)
  if (!grade.gradingFailed && question.topic && question.question_set_id) {
    const { data: qsData } = await supabase
      .from("question_sets")
      .select("course_id")
      .eq("id", question.question_set_id)
      .single();

    if (qsData?.course_id) {
      const { data: existing } = await supabase
        .from("topic_stats")
        .select("attempts, correct")
        .eq("user_id", user.id)
        .eq("course_id", qsData.course_id)
        .eq("topic", question.topic)
        .maybeSingle();

      await supabase.from("topic_stats").upsert(
        {
          user_id: user.id,
          course_id: qsData.course_id,
          topic: question.topic,
          attempts: (existing?.attempts ?? 0) + 1,
          correct: (existing?.correct ?? 0) + (grade.is_correct ? 1 : 0),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,course_id,topic" }
      );
    }
  }

  return { grade };
}
