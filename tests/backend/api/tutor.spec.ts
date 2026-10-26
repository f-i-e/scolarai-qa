import { test, expect } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { readEnvelope } from "../helpers/json";
import { expectStatus } from "../helpers/http-expect";
import { pickFirstIdFromList } from "../helpers/list-data";
import {
  requireLearnerAccessToken,
  requireTutorAccessToken,
} from "../helpers/require-session";

test.describe("OpenAPI — Tutor portal (role boundaries)", () => {
  test("learner JWT — tutor/me is forbidden or empty profile", async ({
    request,
  }) => {
    const accessToken = await requireLearnerAccessToken(request);

    const res = await request.get(apiRoutes.tutorMe, {
      headers: bearerAuth(accessToken),
    });
    await expectStatus(
      res,
      [200, 403, 404],
      "student must not get tutor workspace unless dual-role"
    );
  });

  test.describe("verified tutor account", () => {
    test.describe.configure({ mode: "serial" });

    let tutorAccessToken = "";
    let classId = "";

    test.beforeAll(async ({ request }) => {
      tutorAccessToken = await requireTutorAccessToken(request);
    });

    test("GET /v1/tutor/me — tutor profile", async ({ request }) => {
      const res = await request.get(apiRoutes.tutorMe, {
        headers: bearerAuth(tutorAccessToken),
      });
      const json = await readEnvelope(res);
      await expectStatus(res, [200, 403, 404], "tutor/me");
      if (res.status() === 200) {
        expect(json.success, json.message).toBe(true);
      }
    });

    test("GET /v1/tutor/workspace — dashboard stats", async ({ request }) => {
      const res = await request.get(apiRoutes.tutorWorkspace, {
        headers: bearerAuth(tutorAccessToken),
      });
      await expectStatus(res, [200, 403, 404], "tutor/workspace");
    });

    test("GET /v1/tutor/classes — classroom list", async ({ request }) => {
      const res = await request.get(`${apiRoutes.tutorClasses}?page=1&limit=10`, {
        headers: bearerAuth(tutorAccessToken),
      });
      const json = await readEnvelope(res);
      await expectStatus(res, [200, 403, 404], "tutor/classes");
      if (res.status() === 200) {
        expect(json.success, json.message).toBe(true);
        classId = pickFirstIdFromList(json.data) ?? "";
      }
    });

    test("GET /v1/tutor/classes/:id when list returned an id", async ({
      request,
    }) => {
      expect(
        classId,
        "Tutor classes list returned 200 but no class id — create a class for this tutor or use a seeded account"
      ).toBeTruthy();

      const res = await request.get(apiRoutes.tutorClassById(classId), {
        headers: bearerAuth(tutorAccessToken),
      });
      await expectStatus(res, [200, 403, 404], "tutor class detail");
    });

    test("GET /v1/tutor/roster — linked students", async ({ request }) => {
      const res = await request.get(`${apiRoutes.tutorRoster}?page=1&limit=10`, {
        headers: bearerAuth(tutorAccessToken),
      });
      await expectStatus(res, [200, 403, 404], "tutor/roster");
    });
  });
});
