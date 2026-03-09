"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import type { GenerateState } from "./generate-actions";

type Props = {
  courseId: string;
  action: (prevState: GenerateState, formData: FormData) => Promise<GenerateState>;
};

export default function GenerateForm({ courseId, action }: Props) {
  const [state, setState] = useState<GenerateState>(null);
  const [isPending, startTransition] = useTransition();
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [total, setTotal] = useState(5);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("total", String(total));
    startTransition(async () => {
      const result = await action(null, formData);
      setState(result);
      if (result && "success" in result) {
        setFileNames([]);
        formRef.current?.reset();
      }
    });
  }

  const fileLabel =
    fileNames.length === 0
      ? "No files chosen"
      : fileNames.length === 1
      ? fileNames[0]
      : `${fileNames.length} files selected`;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />

      {/* Past exam files */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Past exam files (PDF or image)
        </label>
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
          <span className="text-sm text-gray-400 truncate max-w-xs">{fileLabel}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="examFiles"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          disabled={isPending}
          onChange={(e) =>
            setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))
          }
        />
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 10 MB each</p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-gray-300">
        <div className="flex-1 h-px bg-gray-100" />
        or paste exam text
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Pasted exam text */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Paste past exam questions
        </label>
        <Textarea
          name="pastedText"
          placeholder="Paste the exam questions here..."
          disabled={isPending}
          rows={5}
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Instructions{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <Textarea
          name="instructions"
          placeholder="e.g. Include 3 MCQ and 2 true/false. Focus on sorting algorithms. Make them hard."
          disabled={isPending}
          rows={2}
        />
      </div>

      {/* Number of questions */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">Number of questions</label>
        <CountStepper
          value={total}
          min={1}
          max={10}
          disabled={isPending}
          onChange={setTotal}
        />
      </div>

      <p className="text-xs text-gray-400">
        Provide at least one file or paste text. Your uploaded course materials are used
        as the knowledge base.
      </p>

      {state && "error" in state && (
        <p className="text-sm text-red-500 whitespace-pre-line">{state.error}</p>
      )}
      {state && "success" in state && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {state.setTitle}
                </p>
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">
                  New
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {total} {total === 1 ? "question" : "questions"} · just generated
              </p>
            </div>
            <Link
              href={`/app/question-sets/${state.questionSetId}/practice`}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Practice
            </Link>
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Question set created successfully.
            </p>
            <Link
              href={`/app/courses/${courseId}/sets`}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              View all sets →
            </Link>
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
        className="w-6 h-6 flex items-center justify-center rounded border border-gray-200
          text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-base leading-none select-none"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-medium text-gray-800 tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 flex items-center justify-center rounded border border-gray-200
          text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-base leading-none select-none"
      >
        +
      </button>
    </div>
  );
}
