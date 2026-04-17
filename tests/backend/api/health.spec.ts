import { test, expect } from "@playwright/test";
import { healthRoutes } from "../helpers/api-routes";

test.describe("OpenAPI — Health & metrics", () => {
  test("GET /v1 — health check", async ({ request }) => {
    const res = await request.get(healthRoutes.root);
    expect(res.status(), await res.text()).toBe(200);
  });

  test("GET /v1/metrics", async ({ request }) => {
    const res = await request.get(healthRoutes.metrics);
    expect(res.status(), await res.text()).toBe(200);
  });
});
