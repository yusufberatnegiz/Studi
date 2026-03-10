import Link from "next/link";
import type { QuestionSet } from "./types";

export default function PracticeNav({
  questionSet,
  index,
  total,
}: {
  questionSet: QuestionSet;
  index: number;
  total: number;
}) {
  return (
    <nav className="bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-700 shrink-0">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 text-sm">
          <Link
            href={`/app/courses/${questionSet.courseId}`}
            className="text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors shrink-0 truncate max-w-[120px]"
          >
            {questionSet.courseTitle}
          </Link>
          <span className="text-gray-200 dark:text-zinc-700 shrink-0">/</span>
          <span className="text-gray-700 dark:text-zinc-300 font-medium truncate max-w-[200px]">
            {questionSet.title}
          </span>
        </div>
        <span className="shrink-0 text-sm font-medium text-gray-400 dark:text-zinc-400 tabular-nums">
          {Math.min(index + 1, total)} / {total}
        </span>
      </div>
    </nav>
  );
}
