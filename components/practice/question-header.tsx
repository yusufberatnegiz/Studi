const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  medium: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  hard: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const style = DIFFICULTY_STYLE[difficulty] ?? "bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400";
  const label = DIFFICULTY_LABEL[difficulty] ?? difficulty;
  return (
    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${style}`}>
      {label}
    </span>
  );
}

export function KeyHint({ type, hasAnswer }: { type: string; hasAnswer: boolean }) {
  if (type === "open" || type === "coding") {
    return (
      <span className="text-xs text-gray-400 dark:text-zinc-500">
        or{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 font-mono text-[11px]">
          ⌘↵
        </kbd>
      </span>
    );
  }
  if ((type === "mcq" || type === "tf") && hasAnswer) {
    return (
      <span className="text-xs text-gray-400 dark:text-zinc-500">
        or{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 font-mono text-[11px]">
          ↵
        </kbd>
      </span>
    );
  }
  return null;
}
