import { uniqueEmail } from "./unique";

export type Role = "STUDENT" | "TUTOR" | "AUTHOR";

export const VALID_PASSWORD = "Str0ng!pass1";

export type RegisterBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
};

export function registerBody(overrides: Partial<RegisterBody> = {}): RegisterBody {
  return {
    firstName: "QA",
    lastName: "Automation",
    email: uniqueEmail("auth"),
    password: VALID_PASSWORD,
    role: "STUDENT",
    ...overrides,
  };
}

export function pickString(obj: unknown, keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

/** Pull tokens / user id from common API shapes. */
export function extractSession(data: unknown): {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
} {
  const accessToken =
    pickString(data, ["accessToken", "access_token", "token"]) ??
    (typeof data === "object" && data && "tokens" in (data as object)
      ? pickString((data as { tokens?: unknown }).tokens, [
          "accessToken",
          "access_token",
        ])
      : undefined);

  const refreshToken =
    pickString(data, ["refreshToken", "refresh_token"]) ??
    (typeof data === "object" && data && "tokens" in (data as object)
      ? pickString((data as { tokens?: unknown }).tokens, [
          "refreshToken",
          "refresh_token",
        ])
      : undefined);

  let userId = pickString(data, ["userId", "user_id", "id"]);
  if (!userId && data && typeof data === "object" && "user" in data) {
    userId = pickString((data as { user?: unknown }).user, ["id", "userId"]);
  }
  return { accessToken, refreshToken, userId };
}
