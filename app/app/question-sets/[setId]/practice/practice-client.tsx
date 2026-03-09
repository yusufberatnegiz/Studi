"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-green-600 bg-green-50",
  medium: "text-amber-600 bg-amber-50",
  hard: "text-red-600 bg-red-50",
};

export default function PracticeClient({ questionSet, questions, action, weakTopicAction }: Props) {
  const total = questions.length;
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [reviewMode, setReviewMode] = useState(false);
  const [weakTopicError, setWeakTopicError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const isComplete = index >= total;
  const question = !isComplete ? questions[index] : null;

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit(questionId: string) {
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
  }

  function toggleReveal(questionId: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function handleRestart() {
    setIndex(0);
    setAnswers({});
    setSubmittedIds(new Set());
    setRevealedIds(new Set());
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

  // ── Completion screen ─────────────────────────────────────────────────────

  if (isComplete) {
    // Score calculation
    const gradedQuestions = questions.filter(
      (q) => grades[q.id] && !grades[q.id].gradingFailed
    );
    const correctCount = gradedQuestions.filter((q) => grades[q.id].is_correct).length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : null;

    // Topic breakdown from graded questions only
    const topicMap: Record<string, { total: number; correct: number }> = {};
    for (const q of questions) {
      const g = grades[q.id];
      if (!g || g.gradingFailed) continue;
      if (!topicMap[q.topic]) topicMap[q.topic] = { total: 0, correct: 0 };
      topicMap[q.topic].total++;
      if (g.is_correct) topicMap[q.topic].correct++;
    }
    const topicBreakdown = Object.entries(topicMap)
      .map(([topic, { total: t, correct }]) => ({
        topic,
        total: t,
        correct,
        accuracy: correct / t,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const strongTopics = topicBreakdown.filter((t) => t.accuracy >= 0.8);
    const weakTopics = topicBreakdown.filter((t) => t.accuracy < 0.8);

    // ── Review screen ─────────────────────────────────────────────────────
    if (reviewMode) {
      return (
        <div className="min-h-screen bg-white flex flex-col">
          <Nav questionSet={questionSet} />
          <main className="max-w-2xl mx-auto w-full px-6 py-10 space-y-6">
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
              const isSubmitted = submittedIds.has(q.id);

              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-gray-100 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {q.topic}
                    </p>
                    <span className="text-xs text-gray-300 tabular-nums">Q{i + 1}</span>
                  </div>

                  <p className="text-sm font-medium text-gray-900 leading-relaxed">
                    {q.question_text}
                  </p>

                  {isSubmitted && submittedAnswer ? (
                    <div className="space-y-2">
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          g?.is_correct
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : g
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-gray-50 text-gray-700 border border-gray-100"
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

                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Solution
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {q.solution_text}
                    </p>
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={() => setReviewMode(false)}>
                Back to Results
              </Button>
            </div>
          </main>
        </div>
      );
    }

    // ── Results screen ────────────────────────────────────────────────────
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Nav questionSet={questionSet} />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-md w-full space-y-8">

            {/* Score card */}
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
                <p className="text-sm text-gray-400 mt-2">
                  No graded answers yet.
                </p>
              )}
            </div>

            {/* Topic breakdown */}
            {topicBreakdown.length > 0 && (
              <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
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

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setReviewMode(true)}
              >
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
                <Link href={`/app/courses/${questionSet.courseId}`}>
                  Back to Course
                </Link>
              </Button>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ── Practice screen ───────────────────────────────────────────────────────

  const q = question!;
  const answer = answers[q.id] ?? "";
  const isSubmitted = submittedIds.has(q.id);
  const isRevealed = revealedIds.has(q.id);
  const submitError = submitErrors[q.id];
  const grade = grades[q.id] ?? null;
  const difficultyStyle = DIFFICULTY_STYLES[q.difficulty] ?? "text-gray-500 bg-gray-50";
  const needsAiGrade = q.question_type === "open" || q.question_type === "coding";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav questionSet={questionSet} />

      <main className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-2xl space-y-8">

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>
                Question {index + 1} / {total}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyStyle}`}>
                {q.difficulty}
              </span>
            </div>
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {q.topic}
            </p>
            <p className="text-lg font-medium text-gray-900 leading-relaxed">
              {q.question_text}
            </p>
          </div>

          {/* Answer area */}
          <div className="space-y-3">
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

            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleSubmit(q.id)}
                disabled={isSubmitted || isPending || !answer.trim()}
                className="w-28 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPending
                  ? needsAiGrade ? "Grading..." : "Saving..."
                  : isSubmitted ? "Submitted" : "Submit"}
              </Button>

              <Button
                variant="outline"
                onClick={() => toggleReveal(q.id)}
              >
                {isRevealed ? "Hide Solution" : "Reveal Solution"}
              </Button>
            </div>
          </div>

          {/* Grade feedback */}
          {grade && (
            <GradeFeedback grade={grade} total={total} />
          )}

          {/* Solution */}
          {isRevealed && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Solution
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {q.solution_text}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="text-gray-500"
            >
              Previous
            </Button>

            {index < total - 1 ? (
              <Button
                variant="outline"
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => setIndex(total)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Finish
              </Button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

// ── Grade feedback ────────────────────────────────────────────────────────────

function GradeFeedback({ grade, total }: { grade: GradeResult; total: number }) {
  if (grade.gradingFailed) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
        <p className="text-sm text-gray-500">
          Answer saved, but grading is temporarily unavailable.
        </p>
      </div>
    );
  }

  const maxPts = 100 / total;
  const earnedPts = (grade.score / 100) * maxPts;

  const isCorrect = grade.is_correct;
  const containerClass = isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50";
  const labelClass = isCorrect ? "text-emerald-700" : "text-red-600";
  const label = isCorrect ? "✓ Correct" : "✗ Incorrect";

  return (
    <div className={`rounded-xl border px-5 py-4 space-y-1.5 ${containerClass}`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${labelClass}`}>{label}</span>
        <span className="text-xs text-gray-400 tabular-nums">
          {earnedPts.toFixed(1)} / {maxPts.toFixed(1)} pts
        </span>
      </div>
      {grade.feedback && (
        <p className="text-sm text-gray-700 leading-relaxed">{grade.feedback}</p>
      )}
    </div>
  );
}

// ── Answer input — renders differently per question type ──────────────────────

type AnswerInputProps = {
  question: Question;
  answer: string;
  isSubmitted: boolean;
  isPending: boolean;
  onChange: (val: string) => void;
};

function AnswerInput({ question, answer, isSubmitted, isPending, onChange }: AnswerInputProps) {
  const disabled = isSubmitted || isPending;

  // True/False
  if (question.question_type === "tf") {
    const tfChoices = question.choices?.length === 2 ? question.choices : ["True", "False"];
    return (
      <div className="flex gap-3">
        {tfChoices.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors
              ${answer === opt
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // Multiple choice
  if (question.question_type === "mcq" && question.choices && question.choices.length > 0) {
    return (
      <div className="space-y-2">
        {question.choices.map((opt, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-colors
              ${answer === opt
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="font-semibold mr-2 opacity-60">
              {String.fromCharCode(65 + i)}.
            </span>
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // Coding
  if (question.question_type === "coding") {
    return <CodingTextarea value={answer} onChange={onChange} disabled={disabled} />;
  }

  // Open (default)
  return (
    <Textarea
      placeholder="Write your answer here..."
      value={answer}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="min-h-[140px] text-sm resize-none"
    />
  );
}

// ── Coding textarea ───────────────────────────────────────────────────────────

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
      placeholder="// Write your code here..."
      className="w-full min-h-[220px] font-mono text-sm bg-gray-950 text-gray-100
        border border-gray-700 rounded-xl p-4 resize-none leading-relaxed
        placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600
        disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

// ── Shared nav ────────────────────────────────────────────────────────────────

function Nav({ questionSet }: { questionSet: QuestionSet }) {
  return (
    <nav className="border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-2 text-sm">
        <Link
          href="/app"
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-gray-200">/</span>
        <Link
          href={`/app/courses/${questionSet.courseId}`}
          className="text-gray-400 hover:text-gray-700 transition-colors truncate max-w-[160px]"
        >
          {questionSet.courseTitle}
        </Link>
        <span className="text-gray-200">/</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">
          Practice
        </span>
      </div>
    </nav>
  );
}
