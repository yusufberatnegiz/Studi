"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WeakTopicGenerateState } from "./generate-actions";

type Props = {
  courseId: string;
  hasWeakTopics: boolean;
  action: (courseId: string) => Promise<WeakTopicGenerateState>;
};

export default function WeakTopicForm({ courseId, hasWeakTopics, action }: Props) {
  const [state, setState] = useState<WeakTopicGenerateState>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!hasWeakTopics) {
    return (
      <p className="text-sm text-gray-400">
        Answer at least 2 questions on a topic to unlock weak-topic practice.
      </p>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await action(courseId);
      setState(result);
      if (result && "questionSetId" in result) {
        router.push(`/app/question-sets/${result.questionSetId}/practice`);
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white
          hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "Generating..." : "Generate Weak Topic Practice"}
      </button>
      {state && "error" in state && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}
    </div>
  );
}
