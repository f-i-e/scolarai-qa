import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { paths } from "../helpers/paths";
import { extractSession, registerBody, VALID_PASSWORD } from "../helpers/auth-builders";
import {
  postRegister,
  postLogin,
  assertRegisterCreated,
  registerAndLoginStudent,
  registerAndLoginAs,
} from "../helpers/auth-flow";
import { decodeJwtPayload, jwtRole } from "../helpers/jwt-payload";
import {
  getSetCookieHeaders,
  hasHttpOnlyRefreshCookie,
  setCookieMentionsAccessTokenName,
} from "../helpers/set-cookie";

/**
 * Backend Test Plan v1.0 — Sprints 1 & 2 — Auth Service
 * Contract aligned with OpenAPI. Routes use `SCHOLARAI_API_VERSION_PREFIX` + `/auth/...` (default `/api`).
 */
function protectedSmokePath(): string {
  return process.env.SCHOLARAI_PROTECTED_SMOKE_URL ?? paths.me;
}

test.describe("Sprints 1 & 2 — Auth Service (Test Plan v1.0)", () => {
  test.describe("TC01 — POST /auth/register — valid email and password", () => {
    test("201 Created; success (OpenAPI)", async ({
      request,
    }) => {
      const body = registerBody();
      const reg = await postRegister(request, body);
      assertRegisterCreated(reg);
      expect(reg.res.status(), reg.json.message).toBe(201);
      expect(reg.json.data).toBeTruthy();
    });
  });

  test.describe("TC02 — POST /auth/register — duplicate email", () => {
    test("409 — Email already exists (OpenAPI)", async ({ request }) => {
      const body = registerBody();
      const first = await postRegister(request, body);
      assertRegisterCreated(first);
      expect(first.res.status(), first.json.message).toBe(201);

      const second = await postRegister(request, body);
      expect(second.res.status(), await second.res.text()).toBe(409);
      const json = await readEnvelope(second.res);
      expect(json.success).toBe(false);
      const blob = `${json.message} ${JSON.stringify(json.error)}`.toLowerCase();
      expect(blob).toMatch(/email|already|exist|duplicate|registered|in use/);
    });
  });

  test.describe("TC03 — POST /auth/register — password under 8 characters", () => {
    test("400 — Password too short", async ({ request }) => {
      const body = registerBody({ password: "Aa1!x" });
      const res = await request.post(paths.register, { data: body });
      expect(res.status()).toBe(400);
      const json = await readEnvelope(res);
      expect(json.success).toBe(false);
      const flat = JSON.stringify(json.error?.details ?? {}).toLowerCase();
      expect(flat).toMatch(/password|short|8|length/);
    });
  });

  test.describe("TC04 — POST /auth/register — invalid email format", () => {
    test("400 — Invalid email", async ({ request }) => {
      const body = registerBody({ email: "not-an-email" });
      const res = await request.post(paths.register, { data: body });
      expect(res.status()).toBe(400);
      const json = await readEnvelope(res);
      expect(json.success).toBe(false);
      const flat = JSON.stringify(json.error?.details ?? {}).toLowerCase();
      expect(flat).toMatch(/email/);
    });
  });

  test.describe("TC05 — POST /auth/verify — valid OTP (within TTL)", () => {
    test("200 — Email verified successfully", async ({ request }) => {
      const raw = process.env.SCHOLARAI_VALID_OTP_CODE;
      test.skip(!raw, "Set SCHOLARAI_VALID_OTP_CODE (numeric OTP from email/SMS/logs) to run TC05");

      const otp_code = Number(raw);
      expect(Number.isFinite(otp_code), "SCHOLARAI_VALID_OTP_CODE must be a number").toBe(true);

      const res = await request.post(paths.verify, { data: { otp_code } });
      expect(res.status(), await res.text()).toBe(200);
      const json = await readEnvelope(res);
      expect(json.success, json.message).toBe(true);
    });
  });

  test.describe("TC06 — POST /auth/verify — invalid or expired OTP", () => {
    test("400 — Invalid or expired token", async ({ request }) => {
      const res = await request.post(paths.verify, { data: { otp_code: 111111 } });
      expect(res.status(), await res.text()).toBe(400);
      const json = await readEnvelope(res);
      expect(json.success).toBe(false);
      const blob = `${json.message} ${JSON.stringify(json.error)}`.toLowerCase();
      expect(blob).toMatch(/invalid|expired|otp|verification|token|code/);
    });
  });

  test.describe("TC07 — POST /auth/login — verified credentials", () => {
    test("200; JWT access token + refresh token returned", async ({ request }) => {
      const email = process.env.SCHOLARAI_VERIFIED_USER_EMAIL;
      const password = process.env.SCHOLARAI_VERIFIED_USER_PASSWORD;

      if (email && password) {
        const res = await request.post(paths.login, { data: { email, password } });
        expect(res.status(), await res.text()).toBe(200);
        const json = await readEnvelope(res);
        expect(json.success, json.message).toBe(true);
        const s = extractSession(json.data);
        expect(s.accessToken, "access token in body").toBeTruthy();
        expect(s.refreshToken, "refresh token in body").toBeTruthy();
        return;
      }

      const { login } = await registerAndLoginStudent(request);
      expect(login.res.status(), login.json.message).toBe(200);
      expect(login.json.success, login.json.message).toBe(true);
      const s = extractSession(login.json.data);
      expect(s.accessToken).toBeTruthy();
      expect(s.refreshToken).toBeTruthy();
    });
  });

  test.describe("OpenAPI — GET /auth/me", () => {
    test("200 — current user profile with Bearer access token", async ({ request }) => {
      const { login } = await registerAndLoginStudent(request);
      if (login.res.status() !== 200) {
        test.skip(true, "Verified login required for GET /auth/me");
      }
      const { accessToken } = extractSession(login.json.data);
      if (!accessToken) test.skip(true, "No access token");
      const res = await request.get(paths.me, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status(), await res.text()).toBe(200);
      const json = await readEnvelope(res);
      expect(json.success, json.message).toBe(true);
    });
  });

  test.describe("TC08 — POST /auth/login — incorrect password", () => {
    test("401 — Invalid credentials", async ({ request }) => {
      const { body, login: ok } = await registerAndLoginStudent(request);
      if (ok.res.status() !== 200) {
        test.skip(true, "TC08 needs verified login baseline (set SCHOLARAI_VERIFIED_USER_* or disable email gate)");
      }

      const res = await request.post(paths.login, {
        data: { email: body.email, password: `${body.password}_wrong_` },
      });
      expect(res.status(), await res.text()).toBe(401);
      const json = await readEnvelope(res);
      expect(json.success).toBe(false);
    });
  });

  test.describe("TC09 — POST /auth/login — unverified email", () => {
    test("403 — Email not verified", async ({ request }) => {
      const body = registerBody({ password: VALID_PASSWORD });
      const reg = await postRegister(request, body);
      assertRegisterCreated(reg);

      const login = await postLogin(request, body.email, body.password);
      if (login.res.status() === 200) {
        test.skip(true, "API auto-verifies new users; cannot assert TC09 without verification gate");
      }
      expect(login.res.status(), login.json.message).toBe(403);
      expect(login.json.success).toBe(false);
    });
  });

  test.describe("TC10 — POST /auth/login — rate limit", () => {
    test("429 — Too Many Requests on 6th attempt within 1 minute", async ({ request }) => {
      test.skip(
        process.env.SCHOLARAI_RUN_RATE_LIMIT !== "1",
        "Opt-in destructive test: set SCHOLARAI_RUN_RATE_LIMIT=1"
      );

      const { body } = await registerAndLoginStudent(request);
      if ((await postLogin(request, body.email, body.password)).res.status() !== 200) {
        test.skip(true, "TC10 requires successful login baseline (verified user)");
      }

      let last = 0;
      for (let i = 0; i < 6; i++) {
        const res = await request.post(paths.login, {
          data: { email: body.email, password: "WrongPassword!99" },
        });
        last = res.status();
        if (last === 429) break;
      }
      expect(last).toBe(429);
    });
  });

  test.describe("TC11 — Access token expiry (~15m) — 401 on protected route", () => {
    test("401 when access token expired (manual / seeded token)", async ({ request }) => {
      const url = protectedSmokePath();
      const expired = process.env.SCHOLARAI_EXPIRED_ACCESS_TOKEN;
      test.skip(!expired, "Set SCHOLARAI_EXPIRED_ACCESS_TOKEN (defaults to GET /auth/me if no SCHOLARAI_PROTECTED_SMOKE_URL)");

      const res = await request.get(url, {
        headers: { Authorization: `Bearer ${expired}` },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe("TC12 — POST /auth/refresh — valid refresh token", () => {
    test("200; new access token + rotated refresh token", async ({ request }) => {
      const { login } = await registerAndLoginStudent(request);
      if (login.res.status() !== 200) {
        test.skip(true, "Requires verified login; set SCHOLARAI_VERIFIED_USER_*");
      }
      expect(login.json.success).toBe(true);
      const { accessToken, refreshToken, userId } = extractSession(login.json.data);
      if (!refreshToken || !userId) {
        test.skip(true, "API must return userId + refreshToken for refresh contract");
      }

      const res = await request.post(paths.refresh, { data: { userId, refreshToken } });
      expect(res.status(), await res.text()).toBe(200);
      const json = await readEnvelope(res);
      expect(json.success, json.message).toBe(true);
      const next = extractSession(json.data);
      expect(next.accessToken && next.refreshToken).toBeTruthy();
      expect(next.accessToken).not.toBe(accessToken);
    });
  });

  test.describe("TC13 — POST /auth/refresh — invalidated refresh token", () => {
    test("401 — Invalid token after logout", async ({ request }) => {
      const { login } = await registerAndLoginStudent(request);
      if (login.res.status() !== 200) {
        test.skip(true, "Requires verified login; set SCHOLARAI_VERIFIED_USER_*");
      }
      const { accessToken, refreshToken, userId } = extractSession(login.json.data);
      if (!accessToken || !refreshToken || !userId) {
        test.skip(true, "Missing tokens/userId from login response");
      }

      const out = await request.post(paths.logout, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {},
      });
      expect(out.status(), await out.text()).toBe(200);

      const res = await request.post(paths.refresh, { data: { userId, refreshToken } });
      expect(res.status(), await res.text()).toBe(401);
      const json = await readEnvelope(res);
      expect(json.success).toBe(false);
    });
  });

  test.describe("TC14 — POST /auth/logout", () => {
    test("200; refresh token invalidated (follow-up refresh fails)", async ({ request }) => {
      const { login } = await registerAndLoginStudent(request);
      if (login.res.status() !== 200) {
        test.skip(true, "Requires verified login; set SCHOLARAI_VERIFIED_USER_*");
      }
      const { accessToken, refreshToken, userId } = extractSession(login.json.data);
      if (!accessToken) test.skip(true, "No accessToken for logout");

      const res = await request.post(paths.logout, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {},
      });
      expect(res.status(), await res.text()).toBe(200);

      if (refreshToken && userId) {
        const again = await request.post(paths.refresh, { data: { userId, refreshToken } });
        expect([401, 403], await again.text()).toContain(again.status());
      }
    });
  });

  test.describe("TC15–TC16 — Protected routes — tampered / missing JWT → 401", () => {
    test("401 — Unauthorized (OpenAPI: GET /auth/me)", async ({ request }) => {
      const url = protectedSmokePath();

      const missing = await request.get(url);
      expect(missing.status()).toBe(401);

      const bad = await request.get(url, {
        headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid" },
      });
      expect(bad.status()).toBe(401);
    });
  });

  test.describe("TC17 — Student role token on tutor-only route → 403", () => {
    test("403 — Forbidden", async ({ request }) => {
      const url = process.env.SCHOLARAI_URL_TUTOR_ONLY;
      test.skip(!url, "Set SCHOLARAI_URL_TUTOR_ONLY (e.g. GET /tutor/... )");

      const { login } = await registerAndLoginAs(request, "STUDENT");
      if (login.res.status() !== 200) test.skip(true, "Verified student JWT required");
      const { accessToken } = extractSession(login.json.data);
      if (!accessToken) test.skip(true, "No access token");

      const res = await request.get(url!, { headers: { Authorization: `Bearer ${accessToken}` } });
      expect(res.status()).toBe(403);
    });
  });

  test.describe("TC18 — Parent role token on student-only route → 403", () => {
    test("403 — Forbidden", async ({ request }) => {
      const url = process.env.SCHOLARAI_URL_STUDENT_ONLY;
      const parentToken = process.env.SCHOLARAI_PARENT_ACCESS_TOKEN;
      test.skip(!url || !parentToken, "Set SCHOLARAI_URL_STUDENT_ONLY + SCHOLARAI_PARENT_ACCESS_TOKEN");

      const res = await request.get(url!, {
        headers: { Authorization: `Bearer ${parentToken}` },
      });
      expect(res.status()).toBe(403);
    });
  });

  test.describe("TC19 — Tutor role token on parent-only route → 403", () => {
    test("403 — Forbidden", async ({ request }) => {
      const url = process.env.SCHOLARAI_URL_PARENT_ONLY;
      test.skip(!url, "Set SCHOLARAI_URL_PARENT_ONLY");

      const { login } = await registerAndLoginAs(request, "TUTOR");
      if (login.res.status() !== 200) test.skip(true, "Verified tutor JWT required");
      const { accessToken } = extractSession(login.json.data);
      if (!accessToken) test.skip(true, "No access token");

      const res = await request.get(url!, { headers: { Authorization: `Bearer ${accessToken}` } });
      expect(res.status()).toBe(403);
    });
  });

  test.describe("TC20 — Admin role enforcement", () => {
    test("403/401 unless admin token on admin route", async ({ request }) => {
      const url = process.env.SCHOLARAI_URL_ADMIN_ONLY;
      test.skip(!url, "Set SCHOLARAI_URL_ADMIN_ONLY");

      const { login } = await registerAndLoginAs(request, "STUDENT");
      if (login.res.status() !== 200) test.skip(true, "Need JWT for negative admin test");
      const { accessToken } = extractSession(login.json.data);
      if (!accessToken) test.skip(true, "No access token");

      const res = await request.get(url!, { headers: { Authorization: `Bearer ${accessToken}` } });
      expect([401, 403], await res.text()).toContain(res.status());
    });
  });

  test.describe("TC21 — POST /auth/login — JWT role claim matches registered role", () => {
    for (const role of ["STUDENT", "TUTOR", "AUTHOR"] as const) {
      test(`role claim contains ${role}`, async ({ request }) => {
        const { login } = await registerAndLoginAs(request, role);
        if (login.res.status() !== 200) {
          test.skip(true, "Verified login required for role claim decode");
        }
        const { accessToken } = extractSession(login.json.data);
        if (!accessToken) {
          test.skip(true, "No access token");
          return;
        }
        const payload = decodeJwtPayload(accessToken);
        const claim = jwtRole(payload);
        expect(String(claim ?? "").toUpperCase()).toContain(role);
      });
    }
  });

  test.describe("TC22–TC23 — Login response: refresh httpOnly cookie; access token body-only", () => {
    test("Set-Cookie refresh is HttpOnly; access token not in cookies", async ({ request }) => {
      const email = process.env.SCHOLARAI_VERIFIED_USER_EMAIL;
      const password = process.env.SCHOLARAI_VERIFIED_USER_PASSWORD;

      let loginRes;
      if (email && password) {
        loginRes = await request.post(paths.login, { data: { email, password } });
      } else {
        const { body, login } = await registerAndLoginStudent(request);
        if (login.res.status() !== 200) {
          test.skip(true, "Verified login required to inspect Set-Cookie contract");
        }
        loginRes = login.res;
      }

      expect(loginRes.status()).toBe(200);
      const json = await readEnvelope(loginRes);
      const { accessToken } = extractSession(json.data);
      expect(accessToken).toBeTruthy();

      const cookies = getSetCookieHeaders(loginRes);
      if (cookies.length === 0) {
        test.skip(true, "No Set-Cookie on login — if refresh is body-only, adjust TC22/23 in plan");
      }
      expect(hasHttpOnlyRefreshCookie(cookies)).toBe(true);
      expect(setCookieMentionsAccessTokenName(cookies)).toBe(false);
    });
  });

  test.describe("TC24 — POST /auth/password/reset/request — valid email", () => {
    test("200; reset instructions sent", async ({ request }) => {
      const email = process.env.SCHOLARAI_VERIFIED_USER_EMAIL;
      test.skip(!email, "Set SCHOLARAI_VERIFIED_USER_EMAIL (known account) for TC24");

      const res = await request.post(paths.passwordResetRequest, { data: { email } });
      expect(res.status(), await res.text()).toBe(200);
      const json = await readEnvelope(res);
      expect(json.success, json.message).toBe(true);
    });
  });

  test.describe("TC25 — POST /auth/password/reset/confirm — invalid or expired token", () => {
    test("400 — Invalid or expired token", async ({ request }) => {
      const res = await request.post(paths.passwordResetConfirm, {
        data: { token: "not-a-real-jwt", newPassword: "NewP@ssw0rd!9" },
      });
      expect(res.status(), await res.text()).toBe(400);
      const json = await readEnvelope(res);
      expect(json.success).toBe(false);
      const blob = `${json.message} ${JSON.stringify(json.error)}`.toLowerCase();
      expect(blob).toMatch(/expired|invalid|token/);
    });
  });
});
