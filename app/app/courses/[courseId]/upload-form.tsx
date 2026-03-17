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
  const [files, setFiles] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_TOTAL_MB = 45;
  const totalMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
  const tooLarge = totalMB > MAX_TOTAL_MB;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tooLarge) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(null, formData);
      setState(result);
      if (result && "success" in result) {
        setFileNames([]);
        setFiles([]);
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Files</span>
          {fileNames.length > 0 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-40"
            >
              + Add more
            </button>
          )}
        </div>

        {fileNames.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm text-gray-400 dark:text-zinc-500 hover:border-gray-300 dark:hover:border-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 transition-colors disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8M4 6l4-4 4 4M2 12h12" />
            </svg>
            Upload course materials
          </button>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-zinc-700 divide-y divide-gray-100 dark:divide-zinc-700 overflow-hidden">
            {fileNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-zinc-800">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400 dark:text-zinc-500">
                  <path d="M8 1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L8 1z" />
                  <polyline points="8 1 8 5 12 5" />
                </svg>
                <p className="text-sm text-gray-700 dark:text-zinc-300 truncate flex-1">{name}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 shrink-0">
                  {(files[i].size / 1024).toFixed(0)} KB
                </p>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          name="files"
          accept=".pdf,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          disabled={isPending}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setFiles(picked);
            setFileNames(picked.map((f) => f.name));
            setState(null);
          }}
        />
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">
          PDF, DOCX, PPT, PPTX, JPG, PNG - max 10 MB per file, 45 MB per batch
        </p>
      </div>

      {tooLarge && (
        <p className="text-sm text-red-500">
          Total size {totalMB.toFixed(1)} MB exceeds the 45 MB batch limit.
          Split your files into smaller groups and upload in batches.
        </p>
      )}

      {state && "error" in state && (
        <p className="text-sm text-red-500 whitespace-pre-line">{state.error}</p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-emerald-600">
          Files uploaded and processing.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || fileNames.length === 0 || tooLarge}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white
          hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
