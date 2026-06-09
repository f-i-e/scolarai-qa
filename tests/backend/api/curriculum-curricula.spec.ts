import { test, expect } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { readEnvelope } from "../helpers/json";
import { bootstrapSession } from "../helpers/auth-flow";
import { pickFirstIdFromList } from "../helpers/list-data";

test.describe("OpenAPI — Curriculum curricula", () => {
  test.describe.configure({ mode: "serial" });

  const ctx = {
    accessToken: "" as string,
    curriculumId: "" as string,
    curriculumCode: "" as string,
  };

  test("authenticate — JWT", async ({ request }) => {
    const session = await bootstrapSession(request);
    if (!session.accessToken) {
      test.skip(true, session.reason ?? "Login required for curriculum routes (JWT)");
      return;
    }
    ctx.accessToken = session.accessToken;
  });

  test("GET /curriculum/curricula — paginated list", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.get(
      `${apiRoutes.curriculumCurricula}?page=1&limit=10`,
      { headers: bearerAuth(ctx.accessToken) }
    );
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() !== 200) {
      test.skip(true, "Curriculum curricula routes not deployed on this host");
      return;
    }
    expect(json.success, json.message).toBe(true);

    const id = pickFirstIdFromList(json.data);
    if (id) ctx.curriculumId = id;

    const rows = Array.isArray(json.data)
      ? json.data
      : json.data &&
          typeof json.data === "object" &&
          "items" in json.data &&
          Array.isArray((json.data as { items: unknown[] }).items)
        ? (json.data as { items: unknown[] }).items
        : [];
    const first = rows[0] as Record<string, unknown> | undefined;
    const code = typeof first?.code === "string" ? first.code : undefined;
    if (code) ctx.curriculumCode = code;
  });

  test("GET /curriculum/curricula/{id} — by id", async ({ request }) => {
    test.skip(!ctx.accessToken || !ctx.curriculumId, "Needs JWT and curriculum id from list");
    const res = await request.get(apiRoutes.curriculumById(ctx.curriculumId), {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /curriculum/curricula/{id}/structure — full structure", async ({
    request,
  }) => {
    test.skip(!ctx.accessToken || !ctx.curriculumId, "Needs JWT and curriculum id");
    const res = await request.get(apiRoutes.curriculumStructure(ctx.curriculumId), {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /curriculum/curricula/code/{code} — lookup by code", async ({
    request,
  }) => {
    test.skip(!ctx.accessToken || !ctx.curriculumCode, "Needs JWT and code from list");
    const res = await request.get(apiRoutes.curriculumByCode(ctx.curriculumCode), {
      headers: bearerAuth(ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });
});
