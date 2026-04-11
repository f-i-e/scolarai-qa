import type { APIResponse } from "@playwright/test";

export function getSetCookieHeaders(res: APIResponse): string[] {
  const out: string[] = [];
  for (const { name, value } of res.headersArray()) {
    if (name.toLowerCase() === "set-cookie") out.push(value);
  }
  return out;
}

export function cookieNames(setCookieValues: string[]): string[] {
  return setCookieValues.map((line) => line.split(";", 1)[0].split("=", 1)[0].trim());
}

export function hasHttpOnlyRefreshCookie(setCookieValues: string[]): boolean {
  return setCookieValues.some((line) => {
    const lower = line.toLowerCase();
    return lower.includes("httponly") && /refresh|rt_|session/i.test(line);
  });
}

export function setCookieMentionsAccessTokenName(setCookieValues: string[]): boolean {
  const names = cookieNames(setCookieValues).map((n) => n.toLowerCase());
  return names.some((n) => n === "access" || n.includes("access_token") || n === "accesstoken");
}
