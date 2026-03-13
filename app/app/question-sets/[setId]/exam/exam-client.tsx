"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import type { AttemptResult, GradeResult } from "../practice/actions";
import type { CodingEditorProps } from "@/components/practice/coding-editor";

const CodingEditorDynamic = dynamic(() => import("@/components/practice/coding-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] rounded-xl border border-gray-700 bg-gray-900 flex items-center justify-center text-sm text-gray-500">
      Loading editor…
    </div>
  ),
}) as React.ComponentType<CodingEditorProps>;

// ── Types ──────────────────────────────────────────────────────────────────────

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

type ExamPhase = "active" | "submitting" | "complete";

type Props = {
  questionSet: QuestionSet;
  questions: Question[];
  action: (_prev: AttemptResult, formData: FormData) => Promise<AttemptResult>;
};

const SECONDS_PER_QUESTION = 120; // 2 minutes

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  medium: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  hard: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function ExamClient({ questionSet, questions, action }: Props) {
  const total = questions.length;
  const storageKey = `exam-answers-${questionSet.id}`;

  const [phase, setPhase] = useState<ExamPhase>("active");
  const [timeLeft, setTimeLeft] = useState(total * SECONDS_PER_QUESTION);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [grades, setGrades] = useState<Record<string, GradeResult | null>>({});
  const [reviewMode, setReviewMode] = useState(false);

  // Refs to avoid stale closures
  const answersRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false);

  // ── Restore from sessionStorage on mount ────────────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        setAnswers(parsed);
        answersRef.current = parsed;
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Warn before leaving during active exam ───────────────────────────────────
  useEffect(() => {
    if (phase !== "active") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // ── Answer change ────────────────────────────────────────────────────────────
  const handleAnswerChange = useCallback((qId: string, val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      answersRef.current = next;
      try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // ── Submit exam (batch grade) ────────────────────────────────────────────────
  const handleSubmitExam = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");
    try { sessionStorage.removeItem(storageKey); } catch {}

    const currentAnswers = answersRef.current;

    const results = await Promise.all(
      questions.map(async (q) => {
        const answerText = (currentAnswers[q.id] ?? "").trim();
        if (!answerText) return { id: q.id, grade: null };
        const fd = new FormData();
        fd.set("questionId", q.id);
        fd.set("answerText", answerText);
        try {
          const result = await action(null, fd);
          if (result && "grade" in result) return { id: q.id, grade: result.grade };
        } catch {}
        return { id: q.id, grade: null };
      })
    );

    const gradeMap: Record<string, GradeResult | null> = {};
    for (const r of results) gradeMap[r.id] = r.grade;
    setGrades(gradeMap);
    setPhase("complete");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, action, storageKey]);

  // ── Auto-submit when time runs out ───────────────────────────────────────────
  const handleSubmitRef = useRef(handleSubmitExam);
  useEffect(() => { handleSubmitRef.current = handleSubmitExam; }, [handleSubmitExam]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "active") {
      handleSubmitRef.current();
    }
  }, [timeLeft, phase]);

  // ── Submitting screen ────────────────────────────────────────────────────────
  if (phase === "submitting") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500 dark:text-zinc-400">Grading your answers…</p>
      </div>
    );
  }

  // ── Complete: review mode ────────────────────────────────────────────────────
  if (phase === "complete" && reviewMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col">
        <ExamNav questionSet={questionSet} phase="complete" timeLeft={0} total={total} />
        <main className="max-w-[720px] mx-auto w-full px-4 sm:px-6 py-10 space-y-5">
          <button
            onClick={() => setReviewMode(false)}
            className="text-sm text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          >
            ← Back to results
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Question Review</h2>
          {questions.map((q, i) => {
            const g = grades[q.id] ?? null;
            const submittedAnswer = answers[q.id] ?? null;
            return (
              <div key={q.id} className="bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-gray-400 dark:text-zinc-500">Q{i + 1}</span>
                    {q.topic && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 truncate max-w-[180px]">
                        {q.topic}
                      </span>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_STYLE[q.difficulty] ?? "bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400"}`}>
                    {q.difficulty}
                  </span>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-200 leading-relaxed">{q.question_text}</p>
                  {submittedAnswer ? (
                    <div className="space-y-2">
                      <div className={`rounded-lg px-3 py-2 text-sm border ${
                        g?.is_correct
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                          : g
                          ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50"
                          : "bg-gray-50 dark:bg-zinc-700/50 text-gray-700 dark:text-zinc-300 border-gray-100 dark:border-zinc-700"
                      }`}>
                        <span className="font-medium">Your answer: </span>
                        <span className="whitespace-pre-wrap">{submittedAnswer}</span>
                      </div>
                      {g && !g.gradingFailed && g.feedback && (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{g.feedback}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Not answered</p>
                  )}
                  <div className="rounded-xl bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 px-4 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Solution</p>
                    <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{q.solution_text}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800" onClick={() => setReviewMode(false)}>
            Back to Results
          </Button>
        </main>
      </div>
    );
  }

  // ── Complete: results screen ─────────────────────────────────────────────────
  if (phase === "complete") {
    const gradedQuestions = questions.filter((q) => grades[q.id] && !grades[q.id]?.gradingFailed);
    const correctCount = gradedQuestions.filter((q) => grades[q.id]?.is_correct).length;
    const answeredCount = questions.filter((q) => (answers[q.id] ?? "").trim()).length;
    const scorePercent = gradedQuestions.length > 0
      ? Math.round((correctCount / gradedQuestions.length) * 100)
      : null;

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

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col">
        <ExamNav questionSet={questionSet} phase="complete" timeLeft={0} total={total} />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                Exam Complete
              </p>
              {scorePercent !== null ? (
                <>
                  <p className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {correctCount}
                    <span className="text-2xl text-gray-400 dark:text-zinc-500 font-normal"> / {gradedQuestions.length}</span>
                  </p>
                  <p className="text-lg text-gray-500 dark:text-zinc-400">{scorePercent}%</p>
                </>
              ) : (
                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-2">No answers submitted.</p>
              )}
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                {answeredCount} of {total} questions answered
              </p>
            </div>

            {topicBreakdown.length > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-700">
                {strongTopics.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Strong</p>
                    {strongTopics.map((t) => (
                      <div key={t.topic} className="flex items-center justify-between">
                        <span className="text-sm text-emerald-600 dark:text-emerald-400 truncate">✓ {t.topic}</span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums shrink-0 ml-3">
                          {Math.round(t.accuracy * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {weakTopics.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Needs improvement</p>
                    {weakTopics.map((t) => (
                      <div key={t.topic} className="flex items-center justify-between">
                        <span className="text-sm text-amber-600 dark:text-amber-400 truncate">⚠ {t.topic}</span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums shrink-0 ml-3">
                          {Math.round(t.accuracy * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800" onClick={() => setReviewMode(true)}>
                Review Answers
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

  // ── Active exam ──────────────────────────────────────────────────────────────
  const q = questions[currentIndex];
  const answer = answers[q.id] ?? "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col">
      <ExamNav
        questionSet={questionSet}
        phase="active"
        timeLeft={timeLeft}
        total={total}
        onSubmit={handleSubmitExam}
      />

      {/* Question dot navigation */}
      <div className="bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-3 flex gap-1.5 flex-wrap">
          {questions.map((question, i) => {
            const isAnswered = !!(answers[question.id] ?? "").trim();
            const isCurrent = i === currentIndex;
            return (
              <button
                key={question.id}
                onClick={() => setCurrentIndex(i)}
                title={`Q${i + 1}`}
                className={`w-7 h-7 rounded-full text-[11px] font-semibold transition-colors ${
                  isCurrent
                    ? "bg-blue-500 text-white"
                    : isAnswered
                    ? "bg-gray-700 dark:bg-zinc-500 text-white"
                    : "bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-600"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8">
        {/* Question card */}
        <div className="w-full max-w-[720px] bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm dark:shadow-none overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 dark:text-zinc-400 shrink-0">Q{currentIndex + 1}</span>
              {q.topic && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 truncate max-w-[220px]">
                  {q.topic}
                </span>
              )}
            </div>
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_STYLE[q.difficulty] ?? "bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400"}`}>
              {q.difficulty}
            </span>
          </div>

          {/* Question + answer */}
          <div className="px-6 py-6 space-y-5">
            <p className="text-base font-medium text-gray-900 dark:text-zinc-200 leading-relaxed">
              {q.question_text}
            </p>
            <ExamAnswerInput
              question={q}
              answer={answer}
              onChange={(val) => handleAnswerChange(q.id, val)}
            />
          </div>
        </div>

        {/* Navigation row */}
        <div className="w-full max-w-[720px] mt-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="text-sm text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1 py-1"
          >
            ← Previous
          </button>
          {currentIndex < total - 1 ? (
            <Button
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={handleSubmitExam}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
            >
              Submit Exam
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Exam nav ───────────────────────────────────────────────────────────────────

function ExamNav({
  questionSet,
  phase,
  timeLeft,
  total,
  onSubmit,
}: {
  questionSet: QuestionSet;
  phase: ExamPhase;
  timeLeft: number;
  total: number;
  onSubmit?: () => void;
}) {
  const isLow = timeLeft < 60;
  return (
    <nav className="bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 shrink-0">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 text-sm">
          <Link
            href={`/app/courses/${questionSet.courseId}`}
            className="text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors shrink-0 truncate max-w-[120px]"
          >
            {questionSet.courseTitle}
          </Link>
          <span className="text-gray-200 dark:text-zinc-700 shrink-0">/</span>
          <span className="text-gray-700 dark:text-zinc-300 font-medium truncate max-w-[160px]">
            {questionSet.title}
          </span>
          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Exam
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {phase === "active" && (
            <>
              <span className={`font-mono text-sm font-semibold tabular-nums ${isLow ? "text-red-500" : "text-gray-600 dark:text-zinc-300"}`}>
                {formatTime(timeLeft)}
              </span>
              {onSubmit && (
                <button
                  onClick={onSubmit}
                  className="text-xs font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Submit
                </button>
              )}
            </>
          )}
          {phase === "complete" && (
            <span className="text-xs font-semibold text-gray-400 dark:text-zinc-500">Complete</span>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Exam answer input (no submit/result feedback) ──────────────────────────────

function ExamAnswerInput({
  question,
  answer,
  onChange,
}: {
  question: Question;
  answer: string;
  onChange: (v: string) => void;
}) {
  // TF
  if (question.question_type === "tf") {
    const choices = question.choices?.length === 2 ? question.choices : ["True", "False"];
    const selectedStyles = [
      "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
      "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
    ];
    return (
      <div className="grid grid-cols-2 gap-3">
        {choices.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`py-4 rounded-xl text-sm font-semibold border-2 transition-all ${
              answer === opt
                ? selectedStyles[i]
                : "border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-600"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // MCQ
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
              onClick={() => onChange(opt)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                selected
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 hover:border-gray-300 dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-600"
              }`}
            >
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                selected ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-zinc-600 text-gray-500 dark:text-zinc-400"
              }`}>
                {letter}
              </span>
              <span className={`text-sm leading-relaxed ${selected ? "text-emerald-800 dark:text-emerald-300 font-medium" : "text-gray-700 dark:text-zinc-300"}`}>
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
    return (
      <CodingEditorDynamic
        value={answer}
        onChange={onChange}
        disabled={false}
        language="javascript"
      />
    );
  }

  // Open
  return <ExamTextarea value={answer} onChange={onChange} />;
}

// ── Open textarea ──────────────────────────────────────────────────────────────

function ExamTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
      placeholder="Write your answer here..."
      rows={4}
      style={{ overflow: "hidden" }}
      className="w-full rounded-xl border border-gray-200 dark:border-zinc-600 px-4 py-3 text-sm text-gray-900 dark:text-zinc-200
        bg-white dark:bg-zinc-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20
        focus:border-blue-400 transition-colors placeholder:text-gray-400 dark:placeholder:text-zinc-500"
    />
  );
}
