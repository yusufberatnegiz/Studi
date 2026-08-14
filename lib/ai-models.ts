import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions/completions";

export const AI_MODELS = {
  generation: process.env.AI_GENERATION_MODEL ?? "gpt-5.6-terra",
  utility: process.env.AI_UTILITY_MODEL ?? "gpt-5.6-luna",
  generationFallback: process.env.AI_GENERATION_FALLBACK_MODEL ?? "gpt-4.1",
  utilityFallback: process.env.AI_UTILITY_FALLBACK_MODEL ?? "gpt-4.1-mini",
} as const;

type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";

type CompletionOptions = {
  primaryModel: string;
  fallbackModel: string;
  reasoningEffort: ReasoningEffort;
  fallbackTemperature: number;
};

type CompletionParams = Omit<ChatCompletionCreateParamsNonStreaming, "model">;

function usesReasoningParameters(model: string): boolean {
  return /^gpt-5(?:[.-]|$)/.test(model);
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return [error.status, error.code ?? error.name].filter(Boolean).join(" ");
  }
  return error instanceof Error ? error.name : "Unknown API error";
}

function shouldUseFallback(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  return error.status === 400 || error.status === 403 || error.status === 404 || error.status === 429 || error.status >= 500;
}

export async function createChatCompletionWithFallback(
  openai: OpenAI,
  params: CompletionParams,
  options: CompletionOptions
): Promise<ChatCompletion> {
  const models = [...new Set([options.primaryModel, options.fallbackModel].filter(Boolean))];
  let lastError: unknown;

  for (const [index, model] of models.entries()) {
    try {
      return await openai.chat.completions.create({
        ...params,
        model,
        ...(usesReasoningParameters(model)
          ? { reasoning_effort: options.reasoningEffort }
          : { temperature: options.fallbackTemperature }),
      });
    } catch (error) {
      lastError = error;
      if (index < models.length - 1 && shouldUseFallback(error)) {
        console.warn(
          `[ai] ${model} request failed; retrying with ${models[index + 1]}: ${safeErrorMessage(error)}`
        );
      } else {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("The AI request failed.");
}
