"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AttemptResult, GradeResult } from "./actions";
import type { Question, QuestionSet, WeakTopicResult } from "@/components/practice/types";
import PracticeNav from "@/components/practice/practice-nav";
import { DifficultyBadge, KeyHint } from "@/components/practice/question-header";
import { AnswerInput } from "@/components/practice/answer-input";
import ResultPanel from "@/components/practice/result-panel";
import CompletionScreen from "@/components/practice/completion-screen";
import ReviewScreen from "@/components/practice/review-screen";

type Props = {
  questionSet: QuestionSet;
  questions: Question[];
  action: (_prev: AttemptResult, formData: FormData) => Promise<AttemptResult>;
  weakTopicAction: (courseId: string) => Promise<WeakTopicResult>;
};

export default function PracticeClient({
  questionSet,
  questions,
  action,
  weakTopicAction,
}: Props) {
  const total = questions.length;
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [reviewMode, setReviewMode] = useState(false);
  const [weakTopicError, setWeakTopicError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const isComplete = index >= total;
  const question = !isComplete ? questions[index] : null;

  const answer = question ? (answers[question.id] ?? "") : "";
  const isSubmitted = question ? submittedIds.has(question.id) : false;
  const grade = question ? (grades[question.id] ?? null) : null;
  const submitError = question ? (submitErrors[question.id] ?? null) : null;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(
    (questionId: string) => {
      const answerText = (answers[questionId] ?? "").trim();
      if (!answerText) {
        setSubmitErrors((prev) => ({
          ...prev,
          [questionId]: "Please write an answer before submitting.",
        }));
        return;
      }
      startTransition(async () => {
        const fd = new FormData();
        fd.set("questionId", questionId);
        fd.set("answerText", answerText);
        const result = await action(null, fd);
        if (result && "error" in result) {
          setSubmitErrors((prev) => ({ ...prev, [questionId]: result.error }));
        } else if (result && "grade" in result) {
          setSubmittedIds((prev) => new Set([...prev, questionId]));
          setGrades((prev) => ({ ...prev, [questionId]: result.grade }));
          setSubmitErrors((prev) => {
            const next = { ...prev };
            delete next[questionId];
            return next;
          });
        }
      });
    },
    [answers, action]
  );

  function handleRestart() {
    setIndex(0);
    setAnswers({});
    setSubmittedIds(new Set());
    setSubmitErrors({});
    setGrades({});
    setReviewMode(false);
    setWeakTopicError(null);
  }

  function handleGenerateWeakTopics() {
    setWeakTopicError(null);
    startTransition(async () => {
      const result = await weakTopicAction(questionSet.courseId);
      if (result && "error" in result) {
        setWeakTopicError(result.error);
      } else if (result && "questionSetId" in result) {
        router.push(`/app/question-sets/${result.questionSetId}/practice`);
      }
    });
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isComplete || reviewMode) return;
    const q = question;
    if (!q) return;

    function onKeyDown(e: KeyboardEvent) {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const inMonaco = !!(document.activeElement as HTMLElement)?.closest(".monaco-editor");
      const inTextarea = activeTag === "TEXTAREA" || activeTag === "INPUT" || inMonaco;

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!isSubmitted && !isPending && answer.trim()) {
          handleSubmit(q!.id);
        }
        return;
      }

      if (e.key === "Enter" && !inTextarea) {
        if (isSubmitted) {
          e.preventDefault();
          if (index < total - 1) setIndex((i) => i + 1);
          else setIndex(total);
          return;
        }
        if (!isPending && answer.trim()) {
          e.preventDefault();
          handleSubmit(q!.id);
        }
        return;
      }

      if (inTextarea) return;

      if (q!.question_type === "mcq" && q!.choices && !isSubmitted) {
        const choices = q!.choices;
        const cur = choices.indexOf(answer);
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          const next = cur < 0 ? 0 : (cur + 1) % choices.length;
          setAnswers((p) => ({ ...p, [q!.id]: choices[next] }));
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          const prev = cur <= 0 ? choices.length - 1 : cur - 1;
          setAnswers((p) => ({ ...p, [q!.id]: choices[prev] }));
          return;
        }
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= choices.length) {
          setAnswers((p) => ({ ...p, [q!.id]: choices[num - 1] }));
        }
        return;
      }

      if (q!.question_type === "tf" && !isSubmitted) {
        const choices = q!.choices?.length === 2 ? q!.choices : ["True", "False"];
        if (e.key === "t" || e.key === "T") setAnswers((p) => ({ ...p, [q!.id]: choices[0] }));
        if (e.key === "f" || e.key === "F") setAnswers((p) => ({ ...p, [q!.id]: choices[1] }));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isComplete,
    reviewMode,
    question,
    answer,
    isSubmitted,
    isPending,
    index,
    total,
    handleSubmit,
  ]);

  // ── Completion / review screens ────────────────────────────────────────────

  if (isComplete && reviewMode) {
    return (
      <ReviewScreen
        questionSet={questionSet}
        total={total}
        questions={questions}
        grades={grades}
        answers={answers}
        submittedIds={submittedIds}
        onBack={() => setReviewMode(false)}
      />
    );
  }

  if (isComplete) {
    return (
      <CompletionScreen
        questionSet={questionSet}
        questions={questions}
        grades={grades}
        total={total}
        isPending={isPending}
        weakTopicError={weakTopicError}
        onReviewMode={() => setReviewMode(true)}
        onGenerateWeakTopics={handleGenerateWeakTopics}
        onRestart={handleRestart}
      />
    );
  }

  // ── Practice screen ────────────────────────────────────────────────────────

  const q = question!;
  const needsAiGrade = q.question_type === "open" || q.question_type === "coding";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col">
      <PracticeNav questionSet={questionSet} index={index} total={total} />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8">
        {/* Question card */}
        <div className="w-full max-w-[720px] bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm dark:shadow-none overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 dark:text-zinc-400 shrink-0">Q{index + 1}</span>
              {q.topic && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 truncate max-w-[220px]">
                  {q.topic}
                </span>
              )}
            </div>
            <DifficultyBadge difficulty={q.difficulty} />
          </div>

          <div className="px-6 py-6 space-y-5">
            <p className="text-base font-medium text-gray-900 dark:text-zinc-300 leading-relaxed">
              {q.question_text}
            </p>

            <AnswerInput
              question={q}
              answer={answer}
              isSubmitted={isSubmitted}
              isPending={isPending}
              onChange={(val) => handleAnswerChange(q.id, val)}
              onCmdEnter={!isSubmitted && !isPending ? () => handleSubmit(q.id) : undefined}
            />

            {submitError && (
              <p className="text-xs text-red-500">{submitError}</p>
            )}

            {!isSubmitted && (
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={() => handleSubmit(q.id)}
                  disabled={isPending || !answer.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                >
                  {isPending ? (needsAiGrade ? "Grading…" : "Saving…") : "Submit"}
                </Button>
              </div>
            )}
          </div>

          {isSubmitted && (
            <ResultPanel grade={grade} solution={q.solution_text} total={total} />
          )}
        </div>

        {/* Navigation row */}
        <div className="w-full max-w-[720px] mt-4 flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1 py-1"
          >
            ← Previous
          </button>

          {isSubmitted ? (
            index < total - 1 ? (
              <Button
                onClick={() => setIndex((i) => i + 1)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
              >
                Next Question →
              </Button>
            ) : (
              <Button
                onClick={() => setIndex(total)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
              >
                Finish Practice →
              </Button>
            )
          ) : (
            index < total - 1 && (
              <button
                onClick={() => setIndex((i) => i + 1)}
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors px-1 py-1"
              >
                Skip →
              </button>
            )
          )}
        </div>
      </main>
    </div>
  );
}
