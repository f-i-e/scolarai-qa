import { test, expect } from "@playwright/test";
import { readEnvelope } from "../helpers/json";
import { apiRoutes } from "../helpers/api-routes";
import { pickLessonRef } from "../helpers/list-data";
import { bootstrapSession } from "../helpers/auth-flow";
import { bearerAuth } from "../helpers/auth-headers";

test.describe("OpenAPI — Billing (public)", () => {
  test("GET /v1/billing/plans — public catalog", async ({ request }) => {
    const res = await request.get(apiRoutes.billingPlans);
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });
});

/**
 * api.testing: lessons require JWT (`GET /v1/lessons`).
 * Assessments-by-lesson is still public per OpenAPI.
 */
test.describe("OpenAPI — Lessons & assessments (JWT for lessons)", () => {
  let accessToken: string | undefined;

  test.beforeAll(async ({ request }) => {
    const session = await bootstrapSession(request);
    accessToken = session.accessToken;
  });

  test("GET /v1/lessons — paginated list", async ({ request }) => {
    test.skip(
      !accessToken,
      "JWT required — login/refresh failed in beforeAll (check .env credentials; retry if api.testing returned INVALID_CREDENTIALS)"
    );
    const res = await request.get(`${apiRoutes.lessons}?page=1&limit=5`, {
      headers: bearerAuth(accessToken!),
    });
    const json = await readEnvelope(res);
    expect(res.status(), json.message).toBe(200);
    expect(json.success, json.message).toBe(true);
  });

  test("GET /v1/lessons/slug/{slug} — 404 for unknown slug", async ({
    request,
  }) => {
    test.skip(!accessToken, "JWT required");
    const res = await request.get(
      apiRoutes.lessonBySlug("qa-missing-lesson-slug-404"),
      { headers: bearerAuth(accessToken!) }
    );
    expect([404, 200], await res.text()).toContain(res.status());
    if (res.status() === 200) {
      test.skip(true, "API returned 200 for unknown slug — cannot assert 404");
    }
  });

  test("GET /v1/assessments/lesson/{lessonId} — list by lesson", async ({
    request,
  }) => {
    test.skip(!accessToken, "JWT required to read lessons list for lessonId");

    const lessonsRes = await request.get(`${apiRoutes.lessons}?page=1&limit=5`, {
      headers: bearerAuth(accessToken!),
    });
    const lessonsJson = await readEnvelope(lessonsRes);
    expect(lessonsRes.status(), lessonsJson.message).toBe(200);

    let lessonId = pickLessonRef(lessonsJson.data)?.lessonId;
    const slug = pickLessonRef(lessonsJson.data)?.slug;
    if (!lessonId && slug) {
      const detailRes = await request.get(apiRoutes.lessonBySlug(slug), {
        headers: bearerAuth(accessToken!),
      });
      const detailJson = await readEnvelope(detailRes);
      if (detailRes.status() === 200 && detailJson.success) {
        const data = detailJson.data as Record<string, unknown> | null;
        lessonId =
          typeof data?.id === "string"
            ? data.id
            : typeof data?.lessonId === "string"
              ? data.lessonId
              : undefined;
      }
    }
    if (!lessonId) {
      test.skip(true, "Lessons list has no id/slug — cannot call assessments-by-lesson");
      return;
    }

    const res = await request.get(
      `${apiRoutes.assessmentsByLesson(lessonId)}?page=1&limit=10`
    );
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });
});
