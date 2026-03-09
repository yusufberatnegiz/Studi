"use client";

import { useState, useTransition } from "react";
import type { DeleteDocState } from "../actions";

type Props = {
  documentId: string;
  action: (documentId: string) => Promise<DeleteDocState>;
};

export default function DeleteDocumentButton({ documentId, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleClick() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    startTransition(async () => {
      const result = await action(documentId);
      if (result && "error" in result) {
        setError(result.error);
        setConfirmed(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`shrink-0 text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40
          ${confirmed
            ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50"
          }`}
      >
        {isPending ? "Deleting…" : confirmed ? "Confirm delete" : "Delete"}
      </button>
      {confirmed && !isPending && (
        <button
          onClick={() => setConfirmed(false)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
