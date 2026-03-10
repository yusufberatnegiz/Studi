import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { GradeResult, Question, QuestionSet } from "./types";
import PracticeNav from "./practice-nav";

type Props = {
  questionSet: QuestionSet;
  questions: Question[];
  grades: Record<string, GradeResult>;
  total: number;
  isPending: boolean;
  weakTopicError: string | null;
  onReviewMode: () => void;
  onGenerateWeakTopics: () => void;
  onRestart: () => void;
};

export default function CompletionScreen({
  questionSet,
  questions,
  grades,
  total,
  isPending,
  weakTopicError,
  onReviewMode,
  onGenerateWeakTopics,
  onRestart,
}: Props) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col">
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
            <Button variant="outline" className="w-full" onClick={onReviewMode}>
              Review Questions
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={onGenerateWeakTopics}
              disabled={isPending}
            >
              {isPending ? "Generating..." : "Practice Weak Topics"}
            </Button>
            {weakTopicError && (
              <p className="text-xs text-red-500">{weakTopicError}</p>
            )}
            <Button variant="outline" className="w-full" onClick={onRestart}>
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
