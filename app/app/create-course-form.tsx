"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCourse, type CreateCourseState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CreateCourseForm() {
  const [state, formAction, isPending] = useActionState<
    CreateCourseState,
    FormData
  >(createCourse, null);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Course</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-3">
          <Input
            name="title"
            placeholder="Course title (e.g. Calculus II)"
            required
            disabled={isPending}
          />
          <Input
            name="course_code"
            placeholder="Course code — optional (e.g. MATH 201)"
            disabled={isPending}
          />
          {state && "error" in state && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Creating…" : "Create course"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
