import { test, expect } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { readEnvelope } from "../helpers/json";
import { expectStatus } from "../helpers/http-expect";
import { requireLearnerAccessToken } from "../helpers/require-session";

test.describe("OpenAPI — Entitlement (Module 2)", () => {
  test("GET /v1/me/entitlement — resolved access for signed-in learner", async ({
    request,
  }) => {
    const accessToken = await requireLearnerAccessToken(request);

    const res = await request.get(apiRoutes.meEntitlement, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);

    await expectStatus(res, [200, 404], "me/entitlement");
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
      const data = json.data as Record<string, unknown> | null;
      expect(data).toBeTruthy();
      expect(
        typeof data?.source === "string" ||
          typeof data?.reason === "string" ||
          data?.capabilities !== undefined
      ).toBeTruthy();
    }
  });
});
