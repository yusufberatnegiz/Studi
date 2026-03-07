"use client";

import { useState, useTransition, useRef } from "react";
import type { UploadState } from "./actions";

type Props = {
  courseId: string;
  action: (prevState: null, formData: FormData) => Promise<UploadState>;
};

export default function SourceUploadForm({ courseId, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<UploadState>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(null, formData);
      setState(result);
      if (result && "success" in result) {
        setFileNames([]);
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />

      <div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg
              hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Choose files
          </button>
          <span className="text-sm text-gray-400 truncate max-w-xs">
            {fileNames.length === 0
              ? "No files chosen"
              : fileNames.length === 1
              ? fileNames[0]
              : `${fileNames.length} files selected`}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="files"
          accept=".pdf,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          disabled={isPending}
          onChange={(e) =>
            setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))
          }
        />
        <p className="text-xs text-gray-400 mt-1.5">
          PDF, DOCX, PPT, PPTX, JPG, PNG - max 10 MB each
        </p>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-500 whitespace-pre-line">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-green-600">
          Files uploaded and processing.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || fileNames.length === 0}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white
          hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
