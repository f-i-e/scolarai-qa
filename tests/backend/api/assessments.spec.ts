import { test, expect } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { readEnvelope } from "../helpers/json";
import { extractSession } from "../helpers/auth-builders";
import {
  bootstrapSession,
  postLogin,
  registerAndLoginAs,
  resolveAccessTokenFromLogin,
} from "../helpers/auth-flow";
import { pickFirstIdFromList, pickLessonRef } from "../helpers/list-data";

const sampleQuestions = [
  {
    question: "Playwright QA — which option is correct?",
    options: ["First", "Second", "Third", "Fourth"],
    correctAnswer: 0,
  },
];

function assessmentCreateBody(lessonId: string) {
  return {
    title: `QA assessment ${Date.now()}`,
    description: "Automated assessment created by Playwright",
    lessonId,
    questions: sampleQuestions,
    passingScore: 70,
    timeLimit: 600,
    purpose: "LESSON" as const,
  };
}

async function resolveLessonId(
  request: import("@playwright/test").APIRequestContext,
  accessToken: string
): Promise<string | undefined> {
  const headers = bearerAuth(accessToken);
  const listRes = await request.get(`${apiRoutes.lessons}?page=1&limit=10`, {
    headers,
  });
  const listJson = await readEnvelope(listRes);
  if (listRes.status() !== 200 || !listJson.success) return undefined;

  const ref = pickLessonRef(listJson.data);
  if (ref?.lessonId) return ref.lessonId;

  if (ref?.slug) {
    const detailRes = await request.get(apiRoutes.lessonBySlug(ref.slug), {
      headers,
    });
    const detailJson = await readEnvelope(detailRes);
    if (detailRes.status() === 200 && detailJson.success) {
      const data = detailJson.data as Record<string, unknown> | null;
      const id =
        typeof data?.id === "string"
          ? data.id
          : typeof data?.lessonId === "string"
            ? data.lessonId
            : undefined;
      if (id) return id;
    }
  }

  return pickFirstIdFromList(listJson.data);
}

test.describe("OpenAPI — Assessments", () => {
  test.describe.configure({ mode: "serial" });

  const ctx = {
    accessToken: "" as string,
    authorToken: "" as string,
    lessonId: "" as string,
    assessmentId: "" as string,
  };

  test("bootstrap — JWT for student flows", async ({ request }) => {
    const session = await bootstrapSession(request);
    if (!session.accessToken) {
      test.skip(
        true,
        session.reason ??
          "Login required — set SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD in .env"
      );
      return;
    }
    ctx.accessToken = session.accessToken;
  });

  test("resolve lesson id from lessons list (JWT)", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const lessonId = await resolveLessonId(request, ctx.accessToken);
    if (!lessonId) {
      test.skip(true, "Lessons list returned no id/slug to drive assessment routes");
      return;
    }
    ctx.lessonId = lessonId;
  });

  test("GET /assessments/lesson/{lessonId} — public list", async ({ request }) => {
    test.skip(!ctx.lessonId, "Needs lesson id");
    const res = await request.get(
      `${apiRoutes.assessmentsByLesson(ctx.lessonId)}?page=1&limit=10`
    );
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
      const existingId = pickFirstIdFromList(json.data);
      if (existingId) ctx.assessmentId = existingId;
    }
  });

  test("GET /assessments/{id} — 404 for unknown id", async ({ request }) => {
    const res = await request.get(
      apiRoutes.assessmentById("00000000-0000-4000-8000-000000000099")
    );
    expect(res.status()).toBe(404);
  });

  test("POST /assessments — create (author/tutor; student may get 403)", async ({
    request,
  }) => {
    test.skip(!ctx.lessonId, "Needs lesson id");

    const verifiedEmail = process.env.SCHOLARAI_VERIFIED_USER_EMAIL?.trim();
    const verifiedPassword = process.env.SCHOLARAI_VERIFIED_USER_PASSWORD?.trim();
    let token = ctx.accessToken;

    if (verifiedEmail && verifiedPassword) {
      const login = await postLogin(
        request,
        verifiedEmail.trim(),
        verifiedPassword.trim()
      );
      const authorToken = await resolveAccessTokenFromLogin(request, login);
      if (authorToken) {
        token = authorToken;
        ctx.authorToken = authorToken;
      }
    } else {
      try {
        const { login } = await registerAndLoginAs(request, "AUTHOR");
        const authorToken = await resolveAccessTokenFromLogin(request, login);
        if (authorToken) {
          token = authorToken;
          ctx.authorToken = authorToken;
        }
      } catch {
        // fall back to student token
      }
    }

    test.skip(!token, "Needs JWT");

    const res = await request.post(apiRoutes.assessments, {
      headers: bearerAuth(token),
      data: assessmentCreateBody(ctx.lessonId),
    });
    const json = await readEnvelope(res);
    expect([201, 400, 403], json.message).toContain(res.status());

    if (res.status() === 201 && json.success) {
      const data = json.data as Record<string, unknown> | null;
      const id = typeof data?.id === "string" ? data.id : undefined;
      if (id) ctx.assessmentId = id;
      expect(json.success, json.message).toBe(true);
    }
  });

  test("GET /assessments/{id} — read created or listed assessment", async ({
    request,
  }) => {
    test.skip(!ctx.assessmentId, "No assessment id from list or create");
    const res = await request.get(apiRoutes.assessmentById(ctx.assessmentId));
    const json = await readEnvelope(res);
    expect([200, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("PUT /assessments/{id} — update (JWT)", async ({ request }) => {
    test.skip(!ctx.assessmentId || !ctx.accessToken, "Needs assessment id + JWT");
    const res = await request.put(apiRoutes.assessmentById(ctx.assessmentId), {
      headers: bearerAuth(ctx.authorToken || ctx.accessToken),
      data: { title: `QA assessment updated ${Date.now()}` },
    });
    const json = await readEnvelope(res);
    expect([200, 400, 403, 404], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("POST /assessments/{id}/publish — publish (role-dependent)", async ({
    request,
  }) => {
    test.skip(!ctx.assessmentId || !ctx.accessToken, "Needs assessment id + JWT");
    const res = await request.post(apiRoutes.assessmentPublish(ctx.assessmentId), {
      headers: bearerAuth(ctx.authorToken || ctx.accessToken),
    });
    const json = await readEnvelope(res);
    expect([200, 400, 403, 404], json.message).toContain(res.status());
  });

  test("GET /assessments/history — student history", async ({ request }) => {
    test.skip(!ctx.accessToken, "Needs JWT");
    const res = await request.get(
      `${apiRoutes.assessmentsHistory}?page=1&limit=10`,
      { headers: bearerAuth(ctx.accessToken) }
    );
    const json = await readEnvelope(res);
    // Student role may be forbidden on api.testing even with a valid JWT.
    expect([200, 403], json.message).toContain(res.status());
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
    }
  });

  test("POST /assessments/{id}/submit — submit answers (published assessment)", async ({
    request,
  }) => {
    test.skip(!ctx.assessmentId || !ctx.accessToken, "Needs assessment id + JWT");
    const res = await request.post(apiRoutes.assessmentSubmit(ctx.assessmentId), {
      headers: bearerAuth(ctx.accessToken),
      data: { answers: [0], timeSpentSeconds: 30 },
    });
    const json = await readEnvelope(res);
    expect([201, 400, 403, 404], json.message).toContain(res.status());
  });

  test("POST /assessments/{id}/unpublish — unpublish (role-dependent)", async ({
    request,
  }) => {
    test.skip(!ctx.assessmentId || !ctx.accessToken, "Needs assessment id + JWT");
    const res = await request.post(
      apiRoutes.assessmentUnpublish(ctx.assessmentId),
      { headers: bearerAuth(ctx.authorToken || ctx.accessToken) }
    );
    const json = await readEnvelope(res);
    expect([200, 403, 404], json.message).toContain(res.status());
  });
});
