import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { apiRoutes } from "../helpers/api-routes";

/**
 * Endpoints documented without JWT in OpenAPI (lessons/assessments list + read).
 */
test.describe("OpenAPI — Public GET (no auth)", () => {
  test("GET /api/v1/lessons — paginated list", async ({ request }) => {
    const res = await request.get(`${apiRoutes.lessons}?page=1&limit=5`);
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /api/v1/lessons/{slug} — 404 for unknown slug", async ({ request }) => {
    const res = await request.get(apiRoutes.lessonBySlug("qa-missing-lesson-slug-404"));
    expect(res.status()).toBe(404);
  });

  test("GET /api/v1/assessments — list", async ({ request }) => {
    const res = await request.get(apiRoutes.assessments);
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });
});
