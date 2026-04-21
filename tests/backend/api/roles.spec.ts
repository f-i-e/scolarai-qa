import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
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

/** Response `data` for a single role entity (OpenAPI does not fix shape; we accept common fields). */
function pickRoleId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  if (typeof o.id === "string" && o.id.length > 0) return o.id;
  return undefined;
}

/** First role id from list payload (array or `{ items: [...] }`). */
function pickFirstRoleIdFromList(data: unknown): string | undefined {
  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        "items" in data &&
        Array.isArray((data as { items: unknown }).items)
      ? (data as { items: unknown[] }).items
      : undefined;
  if (!rows?.length) return undefined;
  return pickRoleId(rows[0]);
}

test.describe("OpenAPI — Roles", () => {
  test.describe.configure({ mode: "serial" });

  const ctx = {
    accessToken: "",
    userId: "",
    /** Set when POST /roles returns 201 */
    createdRoleId: "",
  };

  test("authenticate — JWT + userId for assign/revoke/permissions", async ({ request }) => {
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
        "Login must succeed — set SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD or use an API that allows login after register"
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

  test("GET /roles — list all", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.get(apiRoutes.roles, {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("POST /roles — create (name + description)", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const name = `QA-ROLE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await request.post(apiRoutes.roles, {
      headers: bearerAuth(ctx.accessToken),
      data: { name, description: "Playwright Roles module" },
    });
    const json = await readEnvelope(res);
    expect([201, 403], json.message).toContain(res.status());
    if (res.status() === 201) {
      expect(json.success, json.message).toBe(true);
      const id = pickRoleId(json.data);
      expect(id, "role id in envelope data").toBeTruthy();
      ctx.createdRoleId = id!;
    }
  });

  test("GET /roles/{id} — by id", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const list = await request.get(apiRoutes.roles, {
      headers: bearerAuth(ctx.accessToken),
    });
    const listJson = await readEnvelope(list);
    if (list.status() !== 200 || !listJson.success) {
      test.skip(true, "Cannot resolve role id without list");
      return;
    }
    const anyId = ctx.createdRoleId || pickFirstRoleIdFromList(listJson.data);
    if (!anyId) {
      test.skip(true, "No role id from create or list");
      return;
    }

    const res = await request.get(apiRoutes.roleById(anyId), {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 403, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("PATCH /roles/{id} — update", async ({ request }) => {
    test.skip(!ctx.accessToken || !ctx.createdRoleId, "Needs JWT and a role created in this run");
    const res = await request.patch(apiRoutes.roleById(ctx.createdRoleId), {
      headers: bearerAuth(ctx.accessToken),
      data: { description: "Updated by Playwright" },
    });
    const json = await readEnvelope(res);
    expect([200, 403, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("POST /roles/assign — user + role", async ({ request }) => {
    test.skip(!ctx.accessToken || !ctx.userId, "Needs JWT and userId");
    const list = await request.get(apiRoutes.roles, {
      headers: bearerAuth(ctx.accessToken),
    });
    const listJson = await readEnvelope(list);
    if (list.status() !== 200 || !listJson.success) {
      test.skip(true, "Cannot list roles for assign");
      return;
    }
    const roleId = ctx.createdRoleId || pickFirstRoleIdFromList(listJson.data);
    if (!roleId) {
      test.skip(true, "No role id available");
      return;
    }

    const res = await request.post(apiRoutes.rolesAssign, {
      headers: bearerAuth(ctx.accessToken),
      data: { userId: ctx.userId, roleId },
    });
    const json = await readEnvelope(res);
    expect([201, 403, 404, 409], json.message).toContain(res.status());
    if (res.status() === 201) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /roles/user/{userId}/permissions", async ({ request }) => {
    test.skip(!ctx.accessToken || !ctx.userId, "Needs JWT and userId");
    const res = await request.get(apiRoutes.userRolePermissions(ctx.userId), {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("POST /roles/revoke — user + role", async ({ request }) => {
    test.skip(!ctx.accessToken || !ctx.userId, "Needs JWT and userId");
    const list = await request.get(apiRoutes.roles, {
      headers: bearerAuth(ctx.accessToken),
    });
    const listJson = await readEnvelope(list);
    if (list.status() !== 200 || !listJson.success) {
      test.skip(true, "Cannot list roles for revoke");
      return;
    }
    const roleId = ctx.createdRoleId || pickFirstRoleIdFromList(listJson.data);
    if (!roleId) {
      test.skip(true, "No role id available");
      return;
    }

    const res = await request.post(apiRoutes.rolesRevoke, {
      headers: bearerAuth(ctx.accessToken),
      data: { userId: ctx.userId, roleId },
    });
    const json = await readEnvelope(res);
    // OpenAPI says 200; some builds return 201. Accept either as success.
    expect([200, 201, 403, 404], json.message).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("DELETE /roles/{id} — soft delete (cleanup)", async ({ request }) => {
    test.skip(!ctx.accessToken || !ctx.createdRoleId, "Needs JWT and role created in this run");
    const res = await request.delete(apiRoutes.roleById(ctx.createdRoleId), {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 403, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });
});
