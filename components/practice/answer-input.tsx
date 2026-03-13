"use client";

import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Question } from "./types";
import type { CodingEditorProps } from "./coding-editor";

const CodingEditorDynamic = dynamic(() => import("./coding-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
      Loading editor…
    </div>
  ),
}) as React.ComponentType<CodingEditorProps>;

export type AnswerInputProps = {
  question: Question;
  answer: string;
  isSubmitted: boolean;
  isPending: boolean;
  onChange: (val: string) => void;
  onCmdEnter?: () => void;
};

export function AnswerInput({
  question,
  answer,
  isSubmitted,
  isPending,
  onChange,
  onCmdEnter,
}: AnswerInputProps) {
  const disabled = isSubmitted || isPending;

  if (question.question_type === "tf") {
    const choices = question.choices?.length === 2 ? question.choices : ["True", "False"];
    const selectedStyles = [
      "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
      "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
    ];
    return (
      <div className="grid grid-cols-2 gap-3">
        {choices.map((opt, i) => {
          const selected = answer === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`py-4 rounded-xl text-sm font-semibold border-2 transition-all
                ${
                  selected
                    ? selectedStyles[i]
                    : "border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-600"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.question_type === "mcq" && question.choices && question.choices.length > 0) {
    return (
      <div className="space-y-2">
        {question.choices.map((opt, i) => {
          const selected = answer === opt;
          const letter = String.fromCharCode(65 + i);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
                ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 hover:border-gray-300 dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-600"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${selected ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-zinc-600 text-gray-500 dark:text-zinc-400"}`}
              >
                {letter}
              </span>
              <span
                className={`text-sm leading-relaxed ${
                  selected ? "text-blue-800 dark:text-blue-300 font-medium" : "text-gray-700 dark:text-zinc-300"
                }`}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.question_type === "coding") {
    return (
      <CodingEditorDynamic
        value={answer}
        onChange={onChange}
        disabled={disabled}
        language="javascript"
        onCmdEnter={onCmdEnter}
      />
    );
  }

  return <OpenTextarea value={answer} onChange={onChange} disabled={disabled} />;
}

function OpenTextarea({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Write your answer here..."
      rows={4}
      style={{ overflow: "hidden" }}
      className="w-full rounded-xl border border-gray-200 dark:border-zinc-600 px-4 py-3 text-sm text-gray-900 dark:text-zinc-300
        bg-white dark:bg-zinc-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20
        focus:border-blue-400 transition-colors placeholder:text-gray-400 dark:placeholder:text-zinc-500
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-zinc-800"
    />
  );
}
