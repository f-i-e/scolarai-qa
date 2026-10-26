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

/** api.testing throttles register; back off and retry before falling back to verified-user login. */
export async function postRegisterWithRetry(
  request: APIRequestContext,
  body: RegisterBody,
  maxAttempts = 6
) {
  let last = await postRegister(request, body);
  for (let attempt = 1; attempt < maxAttempts && last.res.status() === 429; attempt++) {
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    last = await postRegister(request, body);
  }
  return last;
}

export async function postLogin(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(paths.login, { data: { email, password } });
  const json = await readEnvelope(res);
  return { res, json };
}

/**
 * api.testing often returns only `refreshToken` + `user` on login (no `accessToken` in body).
 * Exchange refresh for access via POST /auth/refresh when needed.
 */
export async function resolveAccessTokenFromLogin(
  request: APIRequestContext,
  login: Awaited<ReturnType<typeof postLogin>>
): Promise<string | undefined> {
  if (login.res.status() !== 200 || !login.json.success) return undefined;

  const session = extractSession(login.json.data);
  if (session.accessToken) return session.accessToken;

  const { refreshToken, userId } = session;
  if (!refreshToken || !userId) return undefined;

  const refreshRes = await request.post(paths.refresh, {
    data: { userId, refreshToken },
  });
  const refreshJson = await readEnvelope(refreshRes);
  if (refreshRes.status() !== 200 || !refreshJson.success) return undefined;

  return extractSession(refreshJson.data).accessToken;
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
  const reg = await postRegisterWithRetry(request, body);
  if (reg.res.status() === 429) {
    throw new Error(
      `POST ${paths.register} → HTTP 429 (rate limit). ` +
        `Set SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD in .env instead of registering on each run.`
    );
  }
  assertRegisterCreated(reg);

  const login = await postLogin(request, body.email, body.password);
  return { body, reg, login };
}

export async function registerAndLoginAs(
  request: APIRequestContext,
  role: RegisterBody["role"]
) {
  const body = registerBody({ password: VALID_PASSWORD, role });
  const reg = await postRegisterWithRetry(request, body);
  if (reg.res.status() === 429) {
    throw new Error(
      `POST ${paths.register} → HTTP 429 (rate limit) for role ${role}. ` +
        `Set verified credentials in .env instead.`
    );
  }
  assertRegisterCreated(reg);
  const login = await postLogin(request, body.email, body.password);
  return { body, reg, login };
}

export type BootstrapSession = {
  accessToken?: string;
  /** Set when accessToken is missing — show in test.skip() for easier debugging. */
  reason?: string;
};

async function accessTokenFromLoginWithReason(
  request: APIRequestContext,
  login: Awaited<ReturnType<typeof postLogin>>
): Promise<BootstrapSession> {
  if (login.res.status() !== 200 || !login.json.success) {
    if (login.res.status() === 403) {
      return {
        reason:
          `POST ${paths.login} → HTTP 403 (email not verified). ` +
          `Use SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD in .env.`,
      };
    }
    return {
      reason: `POST ${paths.login} → HTTP ${login.res.status()}: ${login.json.message}`,
    };
  }

  const session = extractSession(login.json.data);
  if (session.accessToken) return { accessToken: session.accessToken };

  const { refreshToken, userId } = session;
  if (!refreshToken || !userId) {
    return {
      reason:
        "Login returned 200 but body has no accessToken and is missing refreshToken or user.id",
    };
  }

  const refreshRes = await request.post(paths.refresh, {
    data: { userId, refreshToken },
  });
  const refreshJson = await readEnvelope(refreshRes);
  if (refreshRes.status() !== 200 || !refreshJson.success) {
    return {
      reason: `POST ${paths.refresh} → HTTP ${refreshRes.status()}: ${refreshJson.message}`,
    };
  }

  const accessToken = extractSession(refreshJson.data).accessToken;
  if (!accessToken) {
    return { reason: "Refresh returned 200 but body has no accessToken" };
  }
  return { accessToken };
}

/** Verified env login (+ retry on 401), else register+login student. */
export async function bootstrapSession(
  request: APIRequestContext
): Promise<BootstrapSession> {
  const verifiedEmail = process.env.SCHOLARAI_VERIFIED_USER_EMAIL?.trim();
  const verifiedPassword = process.env.SCHOLARAI_VERIFIED_USER_PASSWORD?.trim();

  if (verifiedEmail && verifiedPassword) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const login = await postLogin(request, verifiedEmail, verifiedPassword);
      if (login.res.status() === 401 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 750));
        continue;
      }
      const session = await accessTokenFromLoginWithReason(request, login);
      if (session.accessToken) return session;
      if (session.reason) return session;
    }
    return {
      reason:
        "Verified login failed after retry — check SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD (api.testing login can intermittently return INVALID_CREDENTIALS)",
    };
  }

  try {
    const { login } = await registerAndLoginStudent(request);
    const session = await accessTokenFromLoginWithReason(request, login);
    if (session.accessToken) return session;
    if (session.reason) return session;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { reason: `Register/login fallback failed: ${msg}` };
  }

  return {
    reason:
      "No SCHOLARAI_VERIFIED_USER_* in .env and register→login fallback did not yield a token",
  };
}

/** Verified env login, else register+login student. Returns token or undefined. */
export async function bootstrapAccessToken(
  request: APIRequestContext
): Promise<string | undefined> {
  const { accessToken } = await bootstrapSession(request);
  return accessToken;
}

/** Login using explicit credentials (e.g. verified tutor account in CI secrets). */
export async function bootstrapSessionWithCredentials(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<BootstrapSession> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const login = await postLogin(request, email, password);
    if (login.res.status() === 401 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 750));
      continue;
    }
    const session = await accessTokenFromLoginWithReason(request, login);
    if (session.accessToken || session.reason) return session;
  }
  return { reason: `Login failed for ${email}` };
}

export async function bootstrapTutorSession(
  request: APIRequestContext
): Promise<BootstrapSession> {
  const email = process.env.SCHOLARAI_VERIFIED_TUTOR_EMAIL?.trim();
  const password = process.env.SCHOLARAI_VERIFIED_TUTOR_PASSWORD?.trim();
  if (email && password) {
    return bootstrapSessionWithCredentials(request, email, password);
  }

  try {
    const { login } = await registerAndLoginAs(request, "TUTOR");
    const session = await accessTokenFromLoginWithReason(request, login);
    if (session.accessToken) return session;
    if (session.reason) return session;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { reason: `Tutor register/login fallback failed: ${msg}` };
  }

  return {
    reason:
      "No SCHOLARAI_VERIFIED_TUTOR_* in .env and register→login as TUTOR did not yield a token",
  };
}

export { extractSession, registerBody, VALID_PASSWORD };
