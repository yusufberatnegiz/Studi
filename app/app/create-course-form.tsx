"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CreateCourseState } from "./actions";

type Props = {
  action: (prevState: null, formData: FormData) => Promise<CreateCourseState>;
};

export default function CreateCourseForm({ action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CreateCourseState>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await action(null, formData);
      setState(result);
      if (result && "success" in result) {
        router.push(`/app/courses/${result.courseId}`);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Course</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-3">
          <Input
            name="title"
            placeholder="Course title (e.g. Calculus II)"
            required
            disabled={isPending}
          />

          {/* Optional source file upload */}
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isPending}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg
                  hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Add source files
              </button>
              <span className="text-xs text-gray-400 truncate max-w-[200px]">
                {fileNames.length === 0
                  ? "Optional - PDF, DOCX, PPT, PPTX, JPG, PNG"
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
          </div>

          {state && "error" in state && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state &&
            "success" in state &&
            state.fileErrors &&
            state.fileErrors.length > 0 && (
              <p className="text-sm text-amber-500 whitespace-pre-line">
                Course created. Some files failed:{"\n"}
                {state.fileErrors.join("\n")}
              </p>
            )}

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Creating…" : "Create course"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
