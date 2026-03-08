"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AttemptResult } from "./actions";

type Question = {
  id: string;
  question_text: string;
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

type Props = {
  questionSet: QuestionSet;
  questions: Question[];
  action: (_prev: AttemptResult, formData: FormData) => Promise<AttemptResult>;
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-green-600 bg-green-50",
  medium: "text-amber-600 bg-amber-50",
  hard: "text-red-600 bg-red-50",
};

export default function PracticeClient({ questionSet, questions, action }: Props) {
  const total = questions.length;

  // Navigation: 0..total-1 = questions, total = completion screen
  const [index, setIndex] = useState(0);

  // Per-question answer text (keyed by question id)
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Questions whose answer has been saved to DB
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  // Questions whose solution is currently visible
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Per-question submit error
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({});

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
      } else {
        setSubmittedIds((prev) => new Set([...prev, questionId]));
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
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function handleRestart() {
    setIndex(0);
    setAnswers({});
    setSubmittedIds(new Set());
    setRevealedIds(new Set());
    setSubmitErrors({});
  }

  // ── Completion screen ────────────────────────────────────────────────────

  if (isComplete) {
    const answeredCount = submittedIds.size;
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Nav questionSet={questionSet} />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="space-y-2">
              <p className="text-4xl font-bold text-gray-900">Done</p>
              <p className="text-gray-500 text-sm">
                You answered{" "}
                <span className="font-semibold text-gray-800">
                  {answeredCount} of {total}
                </span>{" "}
                {total === 1 ? "question" : "questions"}.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={handleRestart} className="w-full">
                Restart Practice
              </Button>
              <Button variant="outline" className="w-full" asChild>
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

  // ── Practice screen ──────────────────────────────────────────────────────

  const q = question!;
  const answer = answers[q.id] ?? "";
  const isSubmitted = submittedIds.has(q.id);
  const isRevealed = revealedIds.has(q.id);
  const submitError = submitErrors[q.id];
  const difficultyStyle = DIFFICULTY_STYLES[q.difficulty] ?? "text-gray-500 bg-gray-50";

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
                className="h-full bg-gray-800 rounded-full transition-all duration-300"
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
            <Textarea
              placeholder="Write your answer here..."
              value={answer}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              disabled={isSubmitted || isPending}
              className="min-h-[140px] text-sm resize-none"
            />

            {submitError && (
              <p className="text-xs text-red-500">{submitError}</p>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleSubmit(q.id)}
                disabled={isSubmitted || isPending || !answer.trim()}
                className="w-28"
              >
                {isPending ? "Saving..." : isSubmitted ? "Saved" : "Submit"}
              </Button>

              <Button
                variant="outline"
                onClick={() => toggleReveal(q.id)}
              >
                {isRevealed ? "Hide Solution" : "Reveal Solution"}
              </Button>
            </div>
          </div>

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
              <Button onClick={() => setIndex(total)}>
                Finish
              </Button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

// ── Shared nav ─────────────────────────────────────────────────────────────

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
