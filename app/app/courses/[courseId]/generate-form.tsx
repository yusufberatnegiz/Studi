"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import type { GenerateState } from "./generate-actions";
import type { ExamFile, ExamFileState } from "./exam-files-actions";
import { saveExamFile, deleteExamFile } from "./exam-files-actions";

const MAX_SELECTED_EXAMS = 6;

type Props = {
  courseId: string;
  isPremium?: boolean;
  savedExamFiles: ExamFile[];
  action: (prevState: GenerateState, formData: FormData) => Promise<GenerateState>;
};

export default function GenerateForm({ courseId, isPremium = false, action, savedExamFiles }: Props) {
  const [state, setState] = useState<GenerateState>(null);
  const [isPending, startTransition] = useTransition();
  const [total, setTotal] = useState(5);
  const formRef = useRef<HTMLFormElement>(null);

  // Saved files state
  const [files, setFiles] = useState<ExamFile[]>(savedExamFiles);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(savedExamFiles.slice(0, MAX_SELECTED_EXAMS).map((f) => f.id))
  );
  const [uploadState, setUploadState] = useState<ExamFileState>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECTED_EXAMS) {
        next.add(id);
      }
      return next;
    });
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    if (chosen.length === 0) return;
    const fd = new FormData();
    fd.set("courseId", courseId);
    chosen.forEach((f) => fd.append("examFiles", f));
    startUploadTransition(async () => {
      const result = await saveExamFile(null, fd);
      setUploadState(result);
      if (result && "success" in result) {
        // Refresh saved files list by re-fetching via reload
        window.location.reload();
      }
      if (uploadRef.current) uploadRef.current.value = "";
    });
  }

  async function handleDelete(fileId: string) {
    setIsDeletingId(fileId);
    const result = await deleteExamFile(fileId);
    if (result && "success" in result) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(fileId); return next; });
      setUploadState(null);
    } else if (result && "error" in result) {
      setUploadState(result);
    }
    setIsDeletingId(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("total", String(total));
    // Remove any stale savedExamFileId entries then re-add selected
    selectedIds.forEach((id) => formData.append("savedExamFileId", id));
    startTransition(async () => {
      setState(null);
      const result = await action(null, formData);
      setState(result);
      if (result && "success" in result) {
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />

      {/* Saved exam files */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-500 dark:text-zinc-400">
            Past exam files
          </label>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            disabled={isUploading || isPending}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-40"
          >
            {isUploading ? "Saving..." : "+ Add file"}
          </button>
        </div>
        <input
          ref={uploadRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={handleUpload}
        />

        {files.length === 0 ? (
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            disabled={isUploading || isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm text-gray-400 dark:text-zinc-500 hover:border-gray-300 dark:hover:border-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 transition-colors disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8M4 6l4-4 4 4M2 12h12" />
            </svg>
            Upload a past exam (PDF or image)
          </button>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-zinc-700 divide-y divide-gray-100 dark:divide-zinc-700 overflow-hidden">
            {files.map((f) => {
              const selected = selectedIds.has(f.id);
              const isDeleting = isDeletingId === f.id;
              return (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-zinc-800 transition-colors ${
                    selected ? "" : "opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSelect(f.id)}
                    disabled={isPending || (!selected && selectedIds.size >= MAX_SELECTED_EXAMS)}
                    aria-pressed={selected}
                    aria-label={`${selected ? "Exclude" : "Include"} ${f.filename}`}
                    className={`shrink-0 w-4 h-4 rounded border-2 transition-colors flex items-center justify-center ${
                      selected
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700"
                    }`}
                  >
                    {selected && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 3.5 3.5 6 8 1" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-zinc-300 truncate">{f.filename}</p>
                    {f.file_size && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500">
                        {(f.file_size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    disabled={isDeleting || isPending}
                    className="shrink-0 text-gray-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 rounded-full border border-current border-t-transparent animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 7.5h6.6l.7-7.5" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {uploadState && "error" in uploadState && (
          <p className="text-xs text-red-500 mt-1">{uploadState.error}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">
          PDF, JPG, PNG - max 10 MB each. Select up to {MAX_SELECTED_EXAMS} examples per generation.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-gray-300 dark:text-zinc-600">
        <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-700" />
        or paste exam text
        <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-700" />
      </div>

      {/* Pasted exam text */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 block mb-1.5">
          Paste past exam questions
        </label>
        <Textarea
          name="pastedText"
          placeholder="Paste the exam questions here..."
          disabled={isPending}
          rows={5}
          maxLength={30000}
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 block mb-1.5">
          Instructions{" "}
          <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
        </label>
        <Textarea
          name="instructions"
          placeholder="e.g. Include 3 MCQ and 2 true/false. Focus on sorting algorithms. Make them hard."
          disabled={isPending}
          rows={2}
          maxLength={1000}
        />
      </div>

      {/* Number of questions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-zinc-400">Number of questions</label>
          {isPremium && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Up to 30
            </span>
          )}
        </div>
        <CountStepper
          value={total}
          min={1}
          max={isPremium ? 30 : 10}
          disabled={isPending}
          onChange={setTotal}
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-zinc-500">
        Select saved files or paste text. Your uploaded course materials are used as the knowledge base.
      </p>

      {state && "error" in state && (
        <p className="text-sm text-red-500 whitespace-pre-line">{state.error}</p>
      )}
      {state && "success" in state && (
        <div className="space-y-2">
        {state.warnings && state.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
            {state.warnings.map((warning) => (
              <p key={warning} className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-gray-100 dark:border-zinc-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 gap-4 bg-white dark:bg-zinc-800">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800 dark:text-zinc-200 truncate">
                  {state.setTitle}
                </p>
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-medium">
                  New
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-zinc-400 mt-0.5">
                {state.questionCount} {state.questionCount === 1 ? "question" : "questions"} · just generated
              </p>
            </div>
            <Link
              href={`/app/question-sets/${state.questionSetId}/practice`}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Practice
            </Link>
          </div>
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-700 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Question set created successfully.
            </p>
            <Link
              href={`/app/courses/${courseId}/sets`}
              className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
            >
              View all sets →
            </Link>
          </div>
        </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white
          hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "Generating..." : "Generate Questions"}
      </button>
    </form>
  );
}

function CountStepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease question count"
        className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-30 text-base leading-none select-none"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-medium text-gray-800 dark:text-zinc-400 tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase question count"
        className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-30 text-base leading-none select-none"
      >
        +
      </button>
    </div>
  );
}
