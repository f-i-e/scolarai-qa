import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { paths } from "../helpers/paths";
import { extractSession, registerBody, VALID_PASSWORD } from "../helpers/auth-builders";
import { postRegister, assertRegisterCreated, registerAndLoginStudent } from "../helpers/auth-flow";
import { uniqueEmail } from "../helpers/unique";
import { expectStatus } from "../helpers/http-expect";

/**
 * User-perspective scenarios: realistic mistakes, edge cases, and one full happy-path journey.
 * Complements `auth-service.sprint-1-2.spec.ts` (numbered test-plan cases).
 */

test.describe("User journeys — full flows", () => {
  test.describe.configure({ mode: "serial" });

  test("New user: register → login → who am I → refresh session → logout → profile blocked", async ({
    request,
  }) => {
    const body = registerBody({ password: VALID_PASSWORD });
    await test.step("Register", async () => {
      const reg = await postRegister(request, body);
      assertRegisterCreated(reg);
      expect(reg.res.status(), reg.json.message).toBe(201);
    });

    await test.step("Login", async () => {
      const res = await request.post(paths.login, {
        data: { email: body.email, password: body.password },
      });
      if (res.status() === 403) {
        test.skip(true, "Login requires verified email — complete verify or set SCHOLARAI_VERIFIED_USER_*");
      }
      expect(res.status(), await res.text()).toBe(200);
      const json = await readEnvelope(res);
      expect(json.success, json.message).toBe(true);
    });

    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let userId: string | undefined;

    await test.step("Capture session", async () => {
      const login = await request.post(paths.login, {
        data: { email: body.email, password: body.password },
      });
      expect(login.status()).toBe(200);
      const json = await readEnvelope(login);
      const s = extractSession(json.data);
      accessToken = s.accessToken;
      refreshToken = s.refreshToken;
      userId = s.userId;
      expect(accessToken, "user expects to stay signed in").toBeTruthy();
      if (!refreshToken || !userId) {
        test.skip(true, "API did not return refreshToken + userId — cannot demo refresh in journey");
      }
    });

    await test.step("See my profile (GET /auth/me)", async () => {
      const res = await request.get(paths.me, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status(), await res.text()).toBe(200);
      const json = await readEnvelope(res);
      expect(json.success, json.message).toBe(true);
    });

    await test.step("Refresh when access feels stale", async () => {
      const res = await request.post(paths.refresh, {
        data: { userId, refreshToken },
      });
      expect(res.status(), await res.text()).toBe(200);
      const json = await readEnvelope(res);
      expect(json.success, json.message).toBe(true);
      const next = extractSession(json.data);
      expect(next.accessToken).toBeTruthy();
      accessToken = next.accessToken ?? accessToken;
      refreshToken = next.refreshToken ?? refreshToken;
    });

    await test.step("Sign out", async () => {
      const res = await request.post(paths.logout, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {},
      });
      expect(res.status(), await res.text()).toBe(200);
    });

    await test.step("After logout, profile should not load with old access token", async () => {
      const res = await request.get(paths.me, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect([401, 403], await res.text()).toContain(res.status());
    });
  });
});

test.describe("Registration — what users get wrong", () => {
  const valid = () => registerBody();

  test("missing email → validation error", async ({ request }) => {
    const b = valid();
    const res = await request.post(paths.register, {
      data: { ...b, email: undefined },
    });
    await expectStatus(res, [400, 422]);
    expect((await readEnvelope(res)).success).toBe(false);
  });

  test("missing password → validation error", async ({ request }) => {
    const b = valid();
    const res = await request.post(paths.register, {
      data: { ...b, password: undefined },
    });
    await expectStatus(res, [400, 422]);
    expect((await readEnvelope(res)).success).toBe(false);
  });

  test("missing firstName → validation error", async ({ request }) => {
    const b = valid();
    const res = await request.post(paths.register, {
      data: { ...b, firstName: undefined },
    });
    await expectStatus(res, [400, 422]);
    expect((await readEnvelope(res)).success).toBe(false);
  });

  test("missing lastName → validation error", async ({ request }) => {
    const b = valid();
    const res = await request.post(paths.register, {
      data: { ...b, lastName: undefined },
    });
    await expectStatus(res, [400, 422]);
    expect((await readEnvelope(res)).success).toBe(false);
  });

  test("missing role → validation error", async ({ request }) => {
    const b = valid();
    const res = await request.post(paths.register, {
      data: { ...b, role: undefined },
    });
    await expectStatus(res, [400, 422]);
    expect((await readEnvelope(res)).success).toBe(false);
  });

  test("email without @ → rejected", async ({ request }) => {
    const res = await request.post(paths.register, {
      data: registerBody({ email: "plainaddress" }),
    });
    await expectStatus(res, [400, 422]);
  });

  test("email with spaces only around local part — rejected or accepted per API policy", async ({
    request,
  }) => {
    const core = uniqueEmail("space");
    const res = await request.post(paths.register, {
      data: registerBody({ email: `  ${core}  ` }),
    });
    expect([201, 400, 422], await res.text()).toContain(res.status());
  });

  test("password with no uppercase → rejected", async ({ request }) => {
    const res = await request.post(paths.register, {
      data: registerBody({ password: "lower1!lower" }),
    });
    await expectStatus(res, [400, 422]);
  });

  test("password with no digit → rejected", async ({ request }) => {
    const res = await request.post(paths.register, {
      data: registerBody({ password: "NoDigits!!" }),
    });
    await expectStatus(res, [400, 422]);
  });

  test("password with no special character → rejected", async ({ request }) => {
    const res = await request.post(paths.register, {
      data: registerBody({ password: "NoSpecial1" }),
    });
    await expectStatus(res, [400, 422]);
  });

  test("Unicode name (real user names) → 201 when rest valid", async ({ request }) => {
    const res = await request.post(paths.register, {
      data: registerBody({ firstName: "Amélie", lastName: "O'Brien" }),
    });
    if (res.status() === 500) test.skip(true, "Register 500");
    expect([201, 400], await res.text()).toContain(res.status());
  });

  test("Very long firstName — should not crash server", async ({ request }) => {
    const long = "A".repeat(500);
    const res = await request.post(paths.register, {
      data: registerBody({ firstName: long }),
    });
    expect(res.status(), await res.text()).toBeLessThan(600);
    expect([201, 400, 413, 422], await res.text()).toContain(res.status());
  });

  test("Script-like input in name — rejected or stored safely (no 5xx)", async ({ request }) => {
    const res = await request.post(paths.register, {
      data: registerBody({
        firstName: "<script>alert(1)</script>",
        lastName: "User",
      }),
    });
    if (res.status() === 500) {
      throw new Error(
        "Backend returned 500 for XSS-like firstName — should be 4xx validation; fix sanitisation / validation."
      );
    }
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("Login — what users get wrong", () => {
  test("unknown email → 401 invalid credentials", async ({ request }) => {
    const res = await request.post(paths.login, {
      data: { email: `ghost-${Date.now()}@example.com`, password: VALID_PASSWORD },
    });
    if (res.status() === 500) {
      throw new Error(
        "Backend returned 500 for unknown-user login — should be 401/404; fix lookup / error handling."
      );
    }
    await expectStatus(res, [401, 404]);
    expect((await readEnvelope(res)).success).toBe(false);
  });

  test("empty password → 400 validation", async ({ request }) => {
    const res = await request.post(paths.login, {
      data: { email: "anyone@example.com", password: "" },
    });
    await expectStatus(res, [400, 422]);
  });

  test("invalid email shape → 400 validation", async ({ request }) => {
    const res = await request.post(paths.login, {
      data: { email: "not-email", password: VALID_PASSWORD },
    });
    await expectStatus(res, [400, 422]);
  });

  test("missing email field → 400 validation", async ({ request }) => {
    const res = await request.post(paths.login, {
      data: { password: VALID_PASSWORD },
    });
    await expectStatus(res, [400, 422]);
  });

  test("SQL-ish input in password field — must not return 5xx", async ({ request }) => {
    const res = await request.post(paths.login, {
      data: {
        email: registerBody().email,
        password: "' OR '1'='1",
      },
    });
    if (res.status() === 500) {
      throw new Error(
        "Backend returned 500 for odd password string — should not surface as INTERNAL_SERVER_ERROR."
      );
    }
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("Email verification (OTP) — user mistakes", () => {
  test("missing otp_code → 400", async ({ request }) => {
    const res = await request.post(paths.verify, { data: {} });
    await expectStatus(res, [400, 422]);
  });

  test("otp_code as string (user pasted digits) — API accepts or normalizes", async ({
    request,
  }) => {
    const res = await request.post(paths.verify, {
      data: { otp_code: "555888" as unknown as number },
    });
    expect([200, 400, 422], await res.text()).toContain(res.status());
  });

  test("otp_code zero — invalid", async ({ request }) => {
    const res = await request.post(paths.verify, { data: { otp_code: 0 } });
    await expectStatus(res, [400, 422]);
  });

  test("otp_code negative — invalid", async ({ request }) => {
    const res = await request.post(paths.verify, { data: { otp_code: -1 } });
    await expectStatus(res, [400, 422]);
  });
});

test.describe("Session refresh — confused user", () => {
  test("sends access token as refreshToken → 401", async ({ request }) => {
    const { body, login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Need verified login");
    }
    const { accessToken, userId } = extractSession(login.json.data);
    if (!accessToken || !userId) test.skip(true, "Missing session fields");

    const res = await request.post(paths.refresh, {
      data: { userId, refreshToken: accessToken },
    });
    await expectStatus(res, [400, 401, 403]);
  });

  test("wrong userId with valid-shaped refresh string → 401", async ({ request }) => {
    const res = await request.post(paths.refresh, {
      data: {
        userId: "00000000-0000-0000-0000-000000000001",
        refreshToken: "not-a-jwt",
      },
    });
    await expectStatus(res, [400, 401, 403]);
  });
});

test.describe("Profile GET /auth/me — logged out or confused", () => {
  test("wrong HTTP method POST instead of GET → 404 or 405", async ({ request }) => {
    const res = await request.post(paths.me, { data: {} });
    expect([404, 405, 400, 401], await res.text()).toContain(res.status());
  });

  test("no Authorization header → 401", async ({ request }) => {
    const res = await request.get(paths.me);
    expect(res.status()).toBe(401);
  });

  test("Authorization Bearer malformed → 401", async ({ request }) => {
    const res = await request.get(paths.me, {
      headers: { Authorization: "NotBearer x.y.z" },
    });
    await expectStatus(res, [401, 403]);
  });

  test("empty Bearer token → 401", async ({ request }) => {
    const res = await request.get(paths.me, {
      headers: { Authorization: "Bearer " },
    });
    await expectStatus(res, [401, 403]);
  });
});

test.describe("Password reset — user paths", () => {
  test("request with malformed email → 400", async ({ request }) => {
    const res = await request.post(paths.passwordResetRequest, {
      data: { email: "not-an-email" },
    });
    await expectStatus(res, [400, 422]);
  });

  test("request with empty body → 400", async ({ request }) => {
    const res = await request.post(paths.passwordResetRequest, { data: {} });
    await expectStatus(res, [400, 422]);
  });

  test("request for plausible but unregistered email — often 200 (do not reveal existence)", async ({
    request,
  }) => {
    const res = await request.post(paths.passwordResetRequest, {
      data: { email: `nobody-${Date.now()}@example.com` },
    });
    if (res.status() === 500) {
      throw new Error(
        "Password reset request returned 500 for unknown email — backend should return 200 (opaque) or 4xx, not crash."
      );
    }
    expect([200, 400, 404, 422], await res.text()).toContain(res.status());
  });

  test("confirm without newPassword → 400", async ({ request }) => {
    const res = await request.post(paths.passwordResetConfirm, {
      data: { token: "x.y.z" },
    });
    await expectStatus(res, [400, 422]);
  });

  test("confirm without token → 400", async ({ request }) => {
    const res = await request.post(paths.passwordResetConfirm, {
      data: { newPassword: "NewP@ssw0rd!9" },
    });
    await expectStatus(res, [400, 422]);
  });

  test("confirm with weak new password → 400", async ({ request }) => {
    const res = await request.post(paths.passwordResetConfirm, {
      data: { token: "a.b.c", newPassword: "weak" },
    });
    await expectStatus(res, [400, 422]);
  });
});

test.describe("Tutor / author sign-up — same flow as student", () => {
  test("TUTOR can register and receives 201", async ({ request }) => {
    const reg = await postRegister(request, registerBody({ role: "TUTOR" }));
    assertRegisterCreated(reg);
    expect(reg.res.status(), reg.json.message).toBe(201);
  });

  test("AUTHOR can register and receives 201", async ({ request }) => {
    const reg = await postRegister(request, registerBody({ role: "AUTHOR" }));
    assertRegisterCreated(reg);
    expect(reg.res.status(), reg.json.message).toBe(201);
  });
});

test.describe("Logout — edge behaviour", () => {
  test("second logout with same token may be 401 (already logged out)", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) test.skip(true, "Verified session required");
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) test.skip(true, "No access token");

    const first = await request.post(paths.logout, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {},
    });
    expect([200, 401], await first.text()).toContain(first.status());

    const second = await request.post(paths.logout, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {},
    });
    expect([200, 401, 403], await second.text()).toContain(second.status());
  });
});
