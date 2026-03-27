"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteQuestionSet, renameQuestionSet } from "./actions";

type QuestionSet = {
  id: string;
  title: string;
  created_at: string;
  mode: string | null;
  questions: { count: number }[];
};

export default function SetsList({
  sets,
  courseId,
}: {
  sets: QuestionSet[];
  courseId: string;
}) {
  const [items, setItems] = useState(sets);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRename(setId: string) {
    setError(null);
    const result = await renameQuestionSet(setId, courseId, renameValue);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setItems((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, title: renameValue.trim() } : s))
    );
    setRenamingId(null);
  }

  async function handleDelete(setId: string) {
    setError(null);
    setDeletingId(setId);
    const result = await deleteQuestionSet(setId, courseId);
    if ("error" in result) {
      setError(result.error);
      setDeletingId(null);
      return;
    }
    setItems((prev) => prev.filter((s) => s.id !== setId));
    setDeletingId(null);
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400 dark:text-zinc-400">No question sets yet.</p>
        <Link
          href={`/app/courses/${courseId}/generate`}
          className="mt-3 inline-block text-sm font-medium text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2 transition-colors"
        >
          Generate your first set
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600 dark:text-red-400 pb-1">{error}</p>}
      <div className="divide-y divide-gray-100 dark:divide-zinc-700 rounded-xl border border-gray-100 dark:border-zinc-700">
        {items.map((qs) => {
          const count =
            Array.isArray(qs.questions) && qs.questions.length > 0
              ? (qs.questions[0] as { count: number }).count
              : 0;
          const isRenaming = renamingId === qs.id;
          const isDeleting = deletingId === qs.id;

          return (
            <div
              key={qs.id}
              className="flex items-center justify-between px-4 py-3 gap-4 bg-white dark:bg-zinc-800"
            >
              <div className="min-w-0 flex-1">
                {isRenaming ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRename(qs.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 text-sm font-medium px-2 py-1 rounded border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="text-xs font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-zinc-200 truncate">
                        {qs.title}
                      </p>
                      {qs.mode === "weak_topics" && (
                        <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          Weak Topics
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-zinc-400 mt-0.5">
                      {count} {count === 1 ? "question" : "questions"} &middot;{" "}
                      {new Date(qs.created_at).toLocaleDateString("en-US")}
                    </p>
                  </div>
                )}
              </div>

              {!isRenaming && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/app/question-sets/${qs.id}/exam`}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    Exam
                  </Link>
                  <Link
                    href={`/app/question-sets/${qs.id}/practice`}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Practice
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(qs.id);
                      setRenameValue(qs.title);
                      setError(null);
                    }}
                    className="text-xs font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors px-1"
                    title="Rename"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(qs.id)}
                    disabled={isDeleting}
                    className="text-xs font-medium text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors px-1 disabled:opacity-50"
                    title="Delete"
                  >
                    {isDeleting ? "..." : "Delete"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
