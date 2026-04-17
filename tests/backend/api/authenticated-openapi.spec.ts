import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { extractSession } from "../helpers/auth-builders";
import { registerAndLoginStudent } from "../helpers/auth-flow";

test.describe("OpenAPI — Authenticated smoke (JWT)", () => {
  test("GET /users/profile/me — 200 or 404 (profile optional)", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed (verified user or env SCHOLARAI_VERIFIED_USER_*)");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
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
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
      return;
    }

    const res = await request.get(apiRoutes.learnerProfilesMe, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
  });

  test("GET /users/learner-profiles/countries/list", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
      return;
    }

    const res = await request.get(apiRoutes.learnerCountriesList, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /progress — current user progress", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
      return;
    }

    const res = await request.get(apiRoutes.progress, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /notifications — paginated", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
      return;
    }

    const res = await request.get(`${apiRoutes.notifications}?page=1&limit=10`, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /curriculum — list (JWT)", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
      return;
    }

    const res = await request.get(`${apiRoutes.curriculum}?page=1&limit=5`, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /curriculum/search — query params", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
      return;
    }

    const res = await request.get(
      `${apiRoutes.curriculumSearch}?page=1&limit=5&q=math`,
      { headers: bearerAuth(accessToken) }
    );
    const jsonSearch = await readEnvelope(res);
    expect([200, 400], jsonSearch.message).toContain(res.status());
    if (res.status() === 200) {
      expect(jsonSearch.success, jsonSearch.message).toBe(true);
    }
  });

  test("GET /analytics/overview — platform metrics", async ({ request }) => {
    const { login } = await registerAndLoginStudent(request);
    if (login.res.status() !== 200) {
      test.skip(true, "Login must succeed");
      return;
    }
    const { accessToken } = extractSession(login.json.data);
    if (!accessToken) {
      test.skip(true, "No access token");
      return;
    }

    const res = await request.get(apiRoutes.analyticsOverview, {
      headers: bearerAuth(accessToken),
    });
    const jsonAnalytics = await readEnvelope(res);
    expect([200, 403], jsonAnalytics.message).toContain(res.status());
    if (res.status() === 200) {
      expect(jsonAnalytics.success, jsonAnalytics.message).toBe(true);
    }
  });
});
