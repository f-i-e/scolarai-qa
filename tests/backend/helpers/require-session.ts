import { expect, type APIRequestContext } from "@playwright/test";
import {
  bootstrapSession,
  bootstrapTutorSession,
} from "./auth-flow";

export const VERIFIED_USER_ENV_HINT =
  "Set SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD in scholarai/scolarai-qa/.env " +
  "(Playwright loads that file from the qa repo root, not your shell cwd).";

export const VERIFIED_TUTOR_ENV_HINT =
  "Set SCHOLARAI_VERIFIED_TUTOR_EMAIL/PASSWORD in .env, or allow register-as-TUTOR fallback.";

function learnerFailureMessage(session: { reason?: string }): string {
  return [session.reason, VERIFIED_USER_ENV_HINT].filter(Boolean).join(" ");
}

function tutorFailureMessage(session: { reason?: string }): string {
  return [session.reason, VERIFIED_TUTOR_ENV_HINT].filter(Boolean).join(" ");
}

/** Obtains a learner JWT or fails the test run (never skips). */
export async function requireLearnerAccessToken(
  request: APIRequestContext
): Promise<string> {
  const session = await bootstrapSession(request);
  expect(session.accessToken, learnerFailureMessage(session)).toBeTruthy();
  return session.accessToken!;
}

/** Obtains a tutor JWT or fails the test run (never skips). */
export async function requireTutorAccessToken(
  request: APIRequestContext
): Promise<string> {
  const session = await bootstrapTutorSession(request);
  expect(session.accessToken, tutorFailureMessage(session)).toBeTruthy();
  return session.accessToken!;
}
