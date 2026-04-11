import type { APIRequestContext, APIResponse } from "@playwright/test";
import { expect } from "@playwright/test";
import type { ApiEnvelope } from "./json";
import { readEnvelope } from "./json";
import { paths } from "./paths";
import { extractSession, registerBody, type RegisterBody, VALID_PASSWORD } from "./auth-builders";

export async function postRegister(request: APIRequestContext, body: RegisterBody) {
  const res = await request.post(paths.register, { data: body });
  const json = await readEnvelope(res);
  return { res, json, body };
}

export async function postLogin(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(paths.login, { data: { email, password } });
  const json = await readEnvelope(res);
  return { res, json };
}

/**
 * Happy-path register must be 200/201. HTTP 500 is always treated as a backend/infrastructure failure
 * (SMTP, DB, etc.) — not a Playwright routing bug.
 */
export function assertRegisterCreated(reg: { res: APIResponse; json: ApiEnvelope }) {
  if (reg.res.status() === 500) {
    const code = reg.json.error?.code ?? "";
    throw new Error(
      `POST ${paths.register} → HTTP 500 (${code}): ${reg.json.message}. ` +
        `This is not the "email already exists" case (that is HTTP 409 on a second register with the same address). ` +
        `Here the server failed while creating a brand-new user — fix API/logs (email pipeline, DB, secrets). ` +
        `Expected 200/201 for a valid body.`
    );
  }
  expect([200, 201], reg.json.message).toContain(reg.res.status());
  expect(reg.json.success, reg.json.message).toBe(true);
}

/** Registers + logs in; fails if register/login not successful (caller may skip on 403). */
export async function registerAndLoginStudent(request: APIRequestContext) {
  const body = registerBody({ password: VALID_PASSWORD });
  const reg = await postRegister(request, body);
  assertRegisterCreated(reg);

  const login = await postLogin(request, body.email, body.password);
  return { body, reg, login };
}

export async function registerAndLoginAs(
  request: APIRequestContext,
  role: RegisterBody["role"]
) {
  const body = registerBody({ password: VALID_PASSWORD, role });
  const reg = await postRegister(request, body);
  assertRegisterCreated(reg);
  const login = await postLogin(request, body.email, body.password);
  return { body, reg, login };
}

export { extractSession, registerBody, VALID_PASSWORD };
