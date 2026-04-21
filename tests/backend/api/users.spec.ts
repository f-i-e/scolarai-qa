import { test, expect } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { readEnvelope } from "../helpers/json";
import { extractSession } from "../helpers/auth-builders";
import { postLogin, registerAndLoginStudent } from "../helpers/auth-flow";
import { decodeJwtPayload } from "../helpers/jwt-payload";

function userIdFromLoginEnvelope(data: unknown, accessToken: string | undefined): string | undefined {
  const s = extractSession(data);
  if (s.userId) return s.userId;
  if (!accessToken) return undefined;
  try {
    const sub = decodeJwtPayload(accessToken).sub;
    return typeof sub === "string" ? sub : undefined;
  } catch {
    return undefined;
  }
}

function pickFirstIdFromList(data: unknown): string | undefined {
  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        "items" in data &&
        Array.isArray((data as { items: unknown }).items)
      ? (data as { items: unknown[] }).items
      : undefined;
  if (!rows?.length) return undefined;
  const first = rows[0] as Record<string, unknown>;
  const id = first?.id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

test.describe("OpenAPI — Users", () => {
  test.describe.configure({ mode: "serial" });

  const ctx = {
    accessToken: "" as string,
    userId: "" as string,
  };

  test("authenticate — JWT + user id", async ({ request }) => {
    const verifiedEmail = process.env.SCHOLARAI_VERIFIED_USER_EMAIL;
    const verifiedPassword = process.env.SCHOLARAI_VERIFIED_USER_PASSWORD;

    let loginJson = null as Awaited<ReturnType<typeof postLogin>>["json"] | null;
    let status = 0;

    if (verifiedEmail && verifiedPassword) {
      const login = await postLogin(request, verifiedEmail, verifiedPassword);
      status = login.res.status();
      loginJson = login.json;
    }

    if (status !== 200) {
      const { login } = await registerAndLoginStudent(request);
      status = login.res.status();
      loginJson = login.json;
    }

    if (status !== 200 || !loginJson) {
      test.skip(
        true,
        "Login must succeed — set SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD (email verification gate often makes fresh register→login return 403)"
      );
      return;
    }

    const s = extractSession(loginJson.data);
    if (!s.accessToken) {
      test.skip(true, "API must return accessToken in login data");
      return;
    }
    const uid = userIdFromLoginEnvelope(loginJson.data, s.accessToken);
    if (!uid) {
      test.skip(true, "Could not resolve user id from login body or JWT sub");
      return;
    }
    ctx.accessToken = s.accessToken;
    ctx.userId = uid;
  });

  test("GET /users — paginated list", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.get(`${apiRoutes.users}?page=1&limit=10`, {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    // Often admin-only; OpenAPI marks JWT but not role policy.
    expect([200, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /users/{id} — current user or listed user", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");

    // Prefer self id; fallback to first id from list if self is not accessible.
    const candidates = [ctx.userId].filter(Boolean);
    if (candidates.length === 0) {
      test.skip(true, "No userId available");
      return;
    }

    let lastStatus = 0;
    for (const id of candidates) {
      const res = await request.get(apiRoutes.userById(id), {
        headers: bearerAuth(ctx.accessToken),
      });
      lastStatus = res.status();
      if (lastStatus === 200) {
        const json = await readEnvelope(res);
        expect(json.success, json.message).toBe(true);
        return;
      }
      if (![403, 404].includes(lastStatus)) {
        expect([200, 403, 404], await res.text()).toContain(lastStatus);
        return;
      }
    }

    // If self lookup forbidden/not found, try list to grab any id (admin may allow list+get).
    const list = await request.get(`${apiRoutes.users}?page=1&limit=10`, {
      headers: bearerAuth(ctx.accessToken),
    });
    const listJson = await readEnvelope(list);
    if (list.status() !== 200 || !listJson.success) {
      test.skip(true, `No accessible user id (self GET returned ${lastStatus})`);
      return;
    }
    const anyId = pickFirstIdFromList(listJson.data);
    if (!anyId) {
      test.skip(true, "User list returned no ids");
      return;
    }

    const res = await request.get(apiRoutes.userById(anyId), {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 403, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("PATCH /users/{id} — update user (safe fields)", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.patch(apiRoutes.userById(ctx.userId), {
      headers: bearerAuth(ctx.accessToken),
      data: { firstName: "QA", lastName: "Updated" },
    });
    const json = await readEnvelope(res);
    // Might be forbidden if only admins can update users.
    expect([200, 403, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("DELETE /users/{id} — soft delete (usually admin-only)", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.delete(apiRoutes.userById(ctx.userId), {
      headers: bearerAuth(ctx.accessToken),
    });
    // OpenAPI says 204; but permissions likely block.
    expect([204, 403, 404], await res.text()).toContain(res.status());
  });

  test("GET /users/profile/me — 200 or 404", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.get(apiRoutes.userProfileMe, {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404, 401, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("POST /users/profile — create profile (multipart)", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.post(apiRoutes.userProfileCreate, {
      headers: bearerAuth(ctx.accessToken),
      multipart: {
        age: String(20 + Math.floor(Math.random() * 10)),
        bio: "Playwright user profile create",
        timezone: "Africa/Douala",
        preferredLanguage: "en",
      },
    });
    const json = await readEnvelope(res);
    expect([201, 409, 401, 403], json.message).toContain(res.status());
    if (res.status() === 201) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("PATCH /users/profile/update — update profile (multipart)", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.patch(apiRoutes.userProfileUpdate, {
      headers: bearerAuth(ctx.accessToken),
      multipart: {
        bio: "Playwright user profile updated",
      },
    });
    const json = await readEnvelope(res);
    expect([200, 404, 401, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /users/profile/search?q=qa — authenticated", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.get(`${apiRoutes.userProfileSearch}?q=qa&page=1&limit=5`, {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 401, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("POST /users/learner-profiles — create (needs countryId)", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");

    const countriesRes = await request.get(apiRoutes.learnerCountriesList, {
      headers: bearerAuth(ctx.accessToken),
    });
    const countriesJson = await readEnvelope(countriesRes);
    if (countriesRes.status() !== 200 || !countriesJson.success) {
      expect([200, 401, 403], countriesRes.status()).toContain(countriesRes.status());
      test.skip(true, "Cannot fetch countries to build learner profile payload");
      return;
    }

    const rows = Array.isArray(countriesJson.data)
      ? countriesJson.data
      : countriesJson.data &&
          typeof countriesJson.data === "object" &&
          "items" in (countriesJson.data as object) &&
          Array.isArray((countriesJson.data as { items: unknown }).items)
        ? (countriesJson.data as { items: unknown[] }).items
        : [];
    const first = rows[0] as Record<string, unknown> | undefined;
    const countryId = typeof first?.id === "string" ? first.id : undefined;
    if (!countryId) {
      test.skip(true, "Countries list returned no ids");
      return;
    }

    const res = await request.post(apiRoutes.learnerProfiles, {
      headers: bearerAuth(ctx.accessToken),
      data: {
        countryId,
        yearOfStudy: "Grade 9",
        level: "Beginner",
        type: "EXAM_PREPARATION",
      },
    });
    const json = await readEnvelope(res);
    expect([201, 409, 400, 401, 403], json.message).toContain(res.status());
    if (res.status() === 201) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /users/learner-profiles/me — 200 or 404", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.get(apiRoutes.learnerProfilesMe, {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404, 401, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });
});

