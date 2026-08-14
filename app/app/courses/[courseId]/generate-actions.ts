"use server";

import {
  generateQuestions as generateQuestionsImpl,
  generateWeakTopicQuestions as generateWeakTopicQuestionsImpl,
} from "@/lib/question-generation-actions";
import type {
  GenerateState,
  WeakTopicGenerateState,
} from "@/lib/question-generation-actions";

export type { GenerateState, WeakTopicGenerateState };

export async function generateQuestions(
  previousState: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  return generateQuestionsImpl(previousState, formData);
}

export async function generateWeakTopicQuestions(
  courseId: string
): Promise<WeakTopicGenerateState> {
  return generateWeakTopicQuestionsImpl(courseId);
}
