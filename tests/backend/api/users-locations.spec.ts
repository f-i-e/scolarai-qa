import { test, expect } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { readEnvelope } from "../helpers/json";
import { bootstrapSession } from "../helpers/auth-flow";

test.describe("OpenAPI — Users locations search", () => {
  test("GET /users/locations/search — countries/states/schools", async ({
    request,
  }) => {
    const session = await bootstrapSession(request);
    if (!session.accessToken) {
      test.skip(true, session.reason ?? "Login required (JWT)");
      return;
    }
    const token = session.accessToken;

    const res = await request.get(
      `${apiRoutes.usersLocationsSearch}?limit=10&countryName=Nigeria`,
      { headers: bearerAuth(token) }
    );
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });
});
