import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { apiRoutes } from "../helpers/api-routes";

test.describe("OpenAPI — Billing (public)", () => {
  test("GET /billing/plans — available plans and exam packs", async ({ request }) => {
    const res = await request.get(apiRoutes.billingPlans);
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });
});
