"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AttemptResult, GradeResult } from "./actions";

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  choices: string[] | null;
  solution_text: string;
  topic: string;
  difficulty: string;
  index_in_set: number;
};

type QuestionSet = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
};

type WeakTopicResult = { error: string } | { questionSetId: string } | null;

type Props = {
  questionSet: QuestionSet;
  questions: Question[];
  action: (_prev: AttemptResult, formData: FormData) => Promise<AttemptResult>;
  weakTopicAction: (courseId: string) => Promise<WeakTopicResult>;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-red-50 text-red-700",
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
      const inTextarea = activeTag === "TEXTAREA" || activeTag === "INPUT";

      // ⌘/Ctrl+Enter: submit from textarea
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!isSubmitted && !isPending && answer.trim()) {
          handleSubmit(q!.id);
        }
        return;
      }

      // Enter (outside textarea): submit MCQ/TF, or advance after submit
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

      // MCQ: arrow keys + number keys
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

      // TF: T / F keys
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

  // ── Completion screen ──────────────────────────────────────────────────────

  if (isComplete) {
    const gradedQuestions = questions.filter((q) => grades[q.id] && !grades[q.id].gradingFailed);
    const correctCount = gradedQuestions.filter((q) => grades[q.id].is_correct).length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : null;

    const topicMap: Record<string, { total: number; correct: number }> = {};
    for (const q of questions) {
      const g = grades[q.id];
      if (!g || g.gradingFailed) continue;
      if (!topicMap[q.topic]) topicMap[q.topic] = { total: 0, correct: 0 };
      topicMap[q.topic].total++;
      if (g.is_correct) topicMap[q.topic].correct++;
    }
    const topicBreakdown = Object.entries(topicMap)
      .map(([topic, { total: t, correct }]) => ({ topic, total: t, correct, accuracy: correct / t }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const strongTopics = topicBreakdown.filter((t) => t.accuracy >= 0.8);
    const weakTopics = topicBreakdown.filter((t) => t.accuracy < 0.8);

    // ── Review screen ────────────────────────────────────────────────────────
    if (reviewMode) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <PracticeNav questionSet={questionSet} index={total} total={total} />
          <main className="max-w-[720px] mx-auto w-full px-4 sm:px-6 py-10 space-y-5">
            <button
              onClick={() => setReviewMode(false)}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              ← Back to results
            </button>
            <h2 className="text-xl font-bold text-gray-900">Question Review</h2>

            {questions.map((q, i) => {
              const g = grades[q.id] ?? null;
              const submittedAnswer = answers[q.id] ?? null;
              const wasSubmitted = submittedIds.has(q.id);
              return (
                <div key={q.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-gray-400">Q{i + 1}</span>
                      {q.topic && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 truncate max-w-[180px]">
                          {q.topic}
                        </span>
                      )}
                    </div>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">
                      {q.question_text}
                    </p>
                    {wasSubmitted && submittedAnswer ? (
                      <div className="space-y-2">
                        <div
                          className={`rounded-lg px-3 py-2 text-sm border ${
                            g?.is_correct
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : g
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-gray-50 text-gray-700 border-gray-100"
                          }`}
                        >
                          <span className="font-medium">Your answer: </span>
                          {submittedAnswer}
                        </div>
                        {g && !g.gradingFailed && g.feedback && (
                          <p className="text-xs text-gray-500 leading-relaxed">{g.feedback}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Not answered</p>
                    )}
                    <SolutionBox solution={q.solution_text} />
                  </div>
                </div>
              );
            })}

            <Button variant="outline" className="w-full" onClick={() => setReviewMode(false)}>
              Back to Results
            </Button>
          </main>
        </div>
      );
    }

    // ── Results screen ───────────────────────────────────────────────────────
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PracticeNav questionSet={questionSet} index={total} total={total} />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Practice Complete
              </p>
              {scorePercent !== null ? (
                <>
                  <p className="text-5xl font-bold text-gray-900 tabular-nums">
                    {correctCount}
                    <span className="text-2xl text-gray-400 font-normal"> / {total}</span>
                  </p>
                  <p className="text-lg text-gray-500">{scorePercent}%</p>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-2">No graded answers yet.</p>
              )}
            </div>

            {topicBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {strongTopics.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Strong
                    </p>
                    {strongTopics.map((t) => (
                      <div key={t.topic} className="flex items-center justify-between">
                        <span className="text-sm text-emerald-600">✓ {t.topic}</span>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {Math.round(t.accuracy * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {weakTopics.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Needs improvement
                    </p>
                    {weakTopics.map((t) => (
                      <div key={t.topic} className="flex items-center justify-between">
                        <span className="text-sm text-amber-600">⚠ {t.topic}</span>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {Math.round(t.accuracy * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full" onClick={() => setReviewMode(true)}>
                Review Questions
              </Button>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleGenerateWeakTopics}
                disabled={isPending}
              >
                {isPending ? "Generating..." : "Practice Weak Topics"}
              </Button>
              {weakTopicError && (
                <p className="text-xs text-red-500">{weakTopicError}</p>
              )}
              <Button variant="outline" className="w-full" onClick={handleRestart}>
                Restart Practice
              </Button>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                <Link href={`/app/courses/${questionSet.courseId}`}>Back to Course</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Practice screen ────────────────────────────────────────────────────────

  const q = question!;
  const needsAiGrade = q.question_type === "open" || q.question_type === "coding";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PracticeNav questionSet={questionSet} index={index} total={total} />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8">
        {/* Progress indicator */}
        <div className="w-full max-w-[720px] mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Question {index + 1}
              <span className="text-gray-400 font-normal"> / {total}</span>
            </span>
            <span className="text-xs text-gray-400 tabular-nums">
              {Math.round(((index + 1) / total) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="w-full max-w-[720px] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Card header: index + topic + difficulty */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 shrink-0">Q{index + 1}</span>
              {q.topic && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 truncate max-w-[220px]">
                  {q.topic}
                </span>
              )}
            </div>
            <DifficultyBadge difficulty={q.difficulty} />
          </div>

          {/* Question text + answer area */}
          <div className="px-6 py-6 space-y-5">
            <p className="text-base font-medium text-gray-900 leading-relaxed">
              {q.question_text}
            </p>

            <AnswerInput
              question={q}
              answer={answer}
              isSubmitted={isSubmitted}
              isPending={isPending}
              onChange={(val) => handleAnswerChange(q.id, val)}
            />

            {submitError && (
              <p className="text-xs text-red-500">{submitError}</p>
            )}

            {/* Submit row (hidden once submitted) */}
            {!isSubmitted && (
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={() => handleSubmit(q.id)}
                  disabled={isPending || !answer.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                >
                  {isPending
                    ? needsAiGrade
                      ? "Grading…"
                      : "Saving…"
                    : "Submit"}
                </Button>
                <KeyHint type={q.question_type} hasAnswer={!!answer} />
              </div>
            )}
          </div>

          {/* Result panel — auto-shown after submit */}
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

// ── Difficulty badge ───────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const style = DIFFICULTY_STYLE[difficulty] ?? "bg-gray-50 text-gray-500";
  const label = DIFFICULTY_LABEL[difficulty] ?? difficulty;
  return (
    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${style}`}>
      {label}
    </span>
  );
}

// ── Keyboard hint ──────────────────────────────────────────────────────────────

function KeyHint({ type, hasAnswer }: { type: string; hasAnswer: boolean }) {
  if (type === "open" || type === "coding") {
    return (
      <span className="text-xs text-gray-400">
        or{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[11px]">
          ⌘↵
        </kbd>
      </span>
    );
  }
  if ((type === "mcq" || type === "tf") && hasAnswer) {
    return (
      <span className="text-xs text-gray-400">
        or{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[11px]">
          ↵
        </kbd>
      </span>
    );
  }
  return null;
}

// ── Result panel ───────────────────────────────────────────────────────────────

function ResultPanel({
  grade,
  solution,
  total,
}: {
  grade: GradeResult | null;
  solution: string;
  total: number;
}) {
  if (!grade) return null;

  if (grade.gradingFailed) {
    return (
      <div className="border-t border-gray-100 px-6 py-5 space-y-4 bg-gray-50/60">
        <p className="text-sm text-gray-500">
          Answer saved, but grading is temporarily unavailable.
        </p>
        <SolutionBox solution={solution} />
      </div>
    );
  }

  const isCorrect = grade.is_correct;
  const maxPts = 100 / total;
  const earnedPts = (grade.score / 100) * maxPts;

  return (
    <div
      className={`border-t px-6 py-5 space-y-4 ${
        isCorrect ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/40"
      }`}
    >
      {/* Badge + points */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
            isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isCorrect ? "✓ Correct" : "✗ Incorrect"}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          {earnedPts.toFixed(1)} / {maxPts.toFixed(1)} pts
        </span>
      </div>

      {/* Feedback */}
      {grade.feedback && (
        <p className="text-sm text-gray-700 leading-relaxed">{grade.feedback}</p>
      )}

      {/* Solution */}
      <SolutionBox solution={solution} />
    </div>
  );
}

// ── Solution box ───────────────────────────────────────────────────────────────

function SolutionBox({ solution }: { solution: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Solution</p>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{solution}</p>
    </div>
  );
}

// ── Answer input ───────────────────────────────────────────────────────────────

type AnswerInputProps = {
  question: Question;
  answer: string;
  isSubmitted: boolean;
  isPending: boolean;
  onChange: (val: string) => void;
};

function AnswerInput({ question, answer, isSubmitted, isPending, onChange }: AnswerInputProps) {
  const disabled = isSubmitted || isPending;

  // True / False
  if (question.question_type === "tf") {
    const choices = question.choices?.length === 2 ? question.choices : ["True", "False"];
    return (
      <div className="grid grid-cols-2 gap-3">
        {choices.map((opt) => {
          const selected = answer === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`py-4 rounded-xl text-sm font-semibold border-2 transition-all
                ${
                  selected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  // Multiple choice
  if (question.question_type === "mcq" && question.choices && question.choices.length > 0) {
    return (
      <div className="space-y-2">
        {question.choices.map((opt, i) => {
          const selected = answer === opt;
          const letter = String.fromCharCode(65 + i);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all
                ${
                  selected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5
                  ${selected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}
              >
                {letter}
              </span>
              <span
                className={`text-sm leading-relaxed ${
                  selected ? "text-emerald-800 font-medium" : "text-gray-700"
                }`}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Coding
  if (question.question_type === "coding") {
    return <CodingTextarea value={answer} onChange={onChange} disabled={disabled} />;
  }

  // Open (default)
  return <OpenTextarea value={answer} onChange={onChange} disabled={disabled} />;
}

// ── Open textarea (auto-expand) ────────────────────────────────────────────────

function OpenTextarea({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Write your answer here..."
      rows={4}
      style={{ overflow: "hidden" }}
      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900
        leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20
        focus:border-emerald-400 transition-colors placeholder:text-gray-400
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
    />
  );
}

// ── Coding textarea ────────────────────────────────────────────────────────────

function CodingTextarea({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.substring(0, start) + "  " + value.substring(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="none"
      autoComplete="off"
      placeholder="// Write your solution here..."
      rows={10}
      className="w-full font-mono text-sm bg-gray-900 text-gray-100
        border border-gray-700 rounded-xl px-4 py-3 resize-y leading-relaxed
        placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30
        focus:border-emerald-500 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

// ── Practice nav ───────────────────────────────────────────────────────────────

function PracticeNav({
  questionSet,
  index,
  total,
}: {
  questionSet: QuestionSet;
  index: number;
  total: number;
}) {
  return (
    <nav className="bg-white border-b border-gray-100 shrink-0">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 text-sm">
          <Link
            href={`/app/courses/${questionSet.courseId}`}
            className="text-gray-400 hover:text-gray-700 transition-colors shrink-0 truncate max-w-[120px]"
          >
            {questionSet.courseTitle}
          </Link>
          <span className="text-gray-200 shrink-0">/</span>
          <span className="text-gray-700 font-medium truncate max-w-[200px]">
            {questionSet.title}
          </span>
        </div>
        <span className="shrink-0 text-sm font-medium text-gray-400 tabular-nums">
          {Math.min(index + 1, total)} / {total}
        </span>
      </div>
    </nav>
  );
}
