import { Button } from "@/components/ui/button";
import type { GradeResult, Question, QuestionSet } from "./types";
import PracticeNav from "./practice-nav";
import { DifficultyBadge } from "./question-header";
import { SolutionBox } from "./result-panel";

type Props = {
  questionSet: QuestionSet;
  total: number;
  questions: Question[];
  grades: Record<string, GradeResult>;
  answers: Record<string, string>;
  submittedIds: Set<string>;
  onBack: () => void;
};

export default function ReviewScreen({
  questionSet,
  total,
  questions,
  grades,
  answers,
  submittedIds,
  onBack,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col">
      <PracticeNav questionSet={questionSet} index={total} total={total} />
      <main className="max-w-[720px] mx-auto w-full px-4 sm:px-6 py-10 space-y-5">
        <button
          onClick={onBack}
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

        <Button variant="outline" className="w-full" onClick={onBack}>
          Back to Results
        </Button>
      </main>
    </div>
  );
}
