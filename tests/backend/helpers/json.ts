import type { APIResponse } from "@playwright/test";

export type ApiError = {
  code?: string;
  details?: Record<string, unknown>;
} | null;

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiError;
};

export async function readEnvelope<T = unknown>(
  res: APIResponse
): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) {
    return {
      success: false,
      message: "(empty body)",
      data: null,
      error: { code: "EMPTY" },
    };
  }
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(`Non-JSON response (${res.status()}): ${text.slice(0, 500)}`);
  }
}
