import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import {
  bootstrapAccessToken,
  registerAndLoginStudent,
  resolveAccessTokenFromLogin,
} from "../helpers/auth-flow";

async function accessTokenForSmoke(
  request: import("@playwright/test").APIRequestContext
): Promise<string | undefined> {
  const fromEnv = await bootstrapAccessToken(request);
  if (fromEnv) return fromEnv;

  try {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) return undefined;
    return resolveAccessTokenFromLogin(request, login);
  } catch {
    return undefined;
  }
}

test.describe("OpenAPI — Authenticated smoke (JWT)", () => {
  test("GET /users/profile/me — 200 or 404 (profile optional)", async ({ request }) => {
    const accessToken = await accessTokenForSmoke(request);
    if (!accessToken) {
      test.skip(
        true,
        "Login/refresh failed — set SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD in .env"
      );
      return;
    }

    const res = await request.get(apiRoutes.userProfileMe, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /users/learner-profiles/me — 200 or 404", async ({ request }) => {
    const accessToken = await accessTokenForSmoke(request);
    if (!accessToken) {
      test.skip(true, "Login/refresh failed — set SCHOLARAI_VERIFIED_USER_* in .env");
      return;
    }

    const res = await request.get(apiRoutes.learnerProfilesMe, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
  });

  test("GET /users/learner-profiles/countries/list", async ({ request }) => {
    const accessToken = await accessTokenForSmoke(request);
    if (!accessToken) {
      test.skip(true, "Login/refresh failed — set SCHOLARAI_VERIFIED_USER_* in .env");
      return;
    }

    const res = await request.get(apiRoutes.learnerCountriesList, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /progress/summary — current user progress", async ({ request }) => {
    const accessToken = await accessTokenForSmoke(request);
    if (!accessToken) {
      test.skip(true, "Login/refresh failed — set SCHOLARAI_VERIFIED_USER_* in .env");
      return;
    }

    const res = await request.get(apiRoutes.progressSummary, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /notifications — paginated", async ({ request }) => {
    const accessToken = await accessTokenForSmoke(request);
    if (!accessToken) {
      test.skip(true, "Login/refresh failed — set SCHOLARAI_VERIFIED_USER_* in .env");
      return;
    }

    const res = await request.get(`${apiRoutes.notifications}?page=1&limit=10`, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /curriculum/curricula — list (JWT)", async ({ request }) => {
    const accessToken = await accessTokenForSmoke(request);
    if (!accessToken) {
      test.skip(true, "Login/refresh failed — set SCHOLARAI_VERIFIED_USER_* in .env");
      return;
    }

    const res = await request.get(
      `${apiRoutes.curriculumCurricula}?page=1&limit=5`,
      { headers: bearerAuth(accessToken) }
    );
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /analytics/learners/{learnerId}/overview", async ({ request }) => {
    const accessToken = await accessTokenForSmoke(request);
    if (!accessToken) {
      test.skip(true, "Login/refresh failed — set SCHOLARAI_VERIFIED_USER_* in .env");
      return;
    }

    const meRes = await request.get(apiRoutes.userProfileMe, {
      headers: bearerAuth(accessToken),
    });
    const meJson = await readEnvelope(meRes);
    const learnerId =
      meRes.status() === 200 &&
      meJson.data &&
      typeof meJson.data === "object" &&
      typeof (meJson.data as Record<string, unknown>).id === "string"
        ? ((meJson.data as Record<string, unknown>).id as string)
        : "00000000-0000-4000-8000-000000000099";

    const res = await request.get(apiRoutes.analyticsLearnerOverview(learnerId), {
      headers: bearerAuth(accessToken),
    });
    const jsonAnalytics = await readEnvelope(res);
    expect([200, 403, 404], jsonAnalytics.message).toContain(res.status());
    if (res.status() === 200) {
      expect(jsonAnalytics.success, jsonAnalytics.message).toBe(true);
    }
  });
});
