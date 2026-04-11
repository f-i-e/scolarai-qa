/** Decode JWT payload (no signature verification) — for QA claim checks only. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT format");
  const payload = parts[1];
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const json = Buffer.from(b64 + pad, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export function jwtRole(payload: Record<string, unknown>): string | undefined {
  const direct = payload.role ?? payload.roles;
  if (typeof direct === "string") return direct;
  if (Array.isArray(direct) && typeof direct[0] === "string") return direct[0];
  const nested = (payload.user as Record<string, unknown> | undefined)?.role;
  if (typeof nested === "string") return nested;
  return undefined;
}
