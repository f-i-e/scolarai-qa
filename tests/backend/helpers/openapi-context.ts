import type { APIRequestContext } from "@playwright/test";
import { apiRoutes } from "./api-routes";
import { bootstrapSession } from "./auth-flow";
import { bearerAuth } from "./auth-headers";
import { readEnvelope } from "./json";
import { pickFirstIdFromList, pickLessonRef } from "./list-data";
import { paths } from "./paths";

export const PLACEHOLDER_UUID = "00000000-0000-4000-8000-000000000099";
export const PLACEHOLDER_QUESTION_ID = "00000000-0000-4000-8000-000000000001";
export const PLACEHOLDER_SUBMISSION_ID = "00000000-0000-4000-8000-000000000002";

export type OpenApiContext = {
  accessToken?: string;
  authReason?: string;
  userId?: string;
  lessonId?: string;
  lessonSlug?: string;
  curriculumId?: string;
  curriculumCode?: string;
  countryId?: string;
  stateId?: string;
  schoolId?: string;
  roleId?: string;
  assessmentId?: string;
  planId?: string;
  notificationId?: string;
  packId?: string;
  sessionId?: string;
  subjectId?: string;
  learnerProfileId?: string;
};

export async function buildOpenApiContext(
  request: APIRequestContext
): Promise<OpenApiContext> {
  const session = await bootstrapSession(request);
  const ctx: OpenApiContext = {
    accessToken: session.accessToken,
    authReason: session.reason,
  };
  if (!session.accessToken) return ctx;

  const headers = bearerAuth(session.accessToken);

  const meRes = await request.get(paths.me, { headers });
  const meJson = await readEnvelope(meRes);
  if (meRes.status() === 200 && meJson.data && typeof meJson.data === "object") {
    const data = meJson.data as Record<string, unknown>;
    if (typeof data.id === "string") ctx.userId = data.id;
  }

  const lessonsRes = await request.get(`${apiRoutes.lessons}?page=1&limit=5`, {
    headers,
  });
  const lessonsJson = await readEnvelope(lessonsRes);
  if (lessonsRes.status() === 200 && lessonsJson.success) {
    const ref = pickLessonRef(lessonsJson.data);
    if (ref?.lessonId) ctx.lessonId = ref.lessonId;
    if (ref?.slug) ctx.lessonSlug = ref.slug;
  }

  const curriculaRes = await request.get(
    `${apiRoutes.curriculumCurricula}?page=1&limit=5`,
    { headers }
  );
  const curriculaJson = await readEnvelope(curriculaRes);
  if (curriculaRes.status() === 200 && curriculaJson.success) {
    ctx.curriculumId = pickFirstIdFromList(curriculaJson.data);
    const rows = Array.isArray(curriculaJson.data)
      ? curriculaJson.data
      : (curriculaJson.data as { items?: unknown[] })?.items;
    const first = rows?.[0] as Record<string, unknown> | undefined;
    if (typeof first?.code === "string") ctx.curriculumCode = first.code;
  }

  const countriesRes = await request.get(apiRoutes.learnerCountriesList, {
    headers,
  });
  const countriesJson = await readEnvelope(countriesRes);
  if (countriesRes.status() === 200 && countriesJson.success) {
    ctx.countryId = pickFirstIdFromList(countriesJson.data);
    if (ctx.countryId) {
      const statesRes = await request.get(
        apiRoutes.learnerStatesByCountry(ctx.countryId),
        { headers }
      );
      const statesJson = await readEnvelope(statesRes);
      if (statesRes.status() === 200) {
        ctx.stateId = pickFirstIdFromList(statesJson.data);
        if (ctx.stateId) {
          const schoolsRes = await request.get(
            apiRoutes.learnerSchoolsByState(ctx.stateId),
            { headers }
          );
          const schoolsJson = await readEnvelope(schoolsRes);
          if (schoolsRes.status() === 200) {
            ctx.schoolId = pickFirstIdFromList(schoolsJson.data);
          }
        }
      }
    }
  }

  const rolesRes = await request.get(apiRoutes.roles, { headers });
  const rolesJson = await readEnvelope(rolesRes);
  if (rolesRes.status() === 200 && rolesJson.success) {
    ctx.roleId = pickFirstIdFromList(rolesJson.data);
  }

  if (ctx.lessonId) {
    const byLessonRes = await request.get(
      `${apiRoutes.assessmentsByLesson(ctx.lessonId)}?page=1&limit=5`
    );
    const byLessonJson = await readEnvelope(byLessonRes);
    if (byLessonRes.status() === 200 && byLessonJson.success) {
      ctx.assessmentId = pickFirstIdFromList(byLessonJson.data);
    }
  }

  const plansRes = await request.get(apiRoutes.billingPlans);
  const plansJson = await readEnvelope(plansRes);
  if (plansRes.status() === 200 && plansJson.success) {
    ctx.planId = pickFirstIdFromList(plansJson.data);
  }

  const notificationsRes = await request.get(
    `${apiRoutes.notifications}?page=1&limit=5`,
    { headers }
  );
  const notificationsJson = await readEnvelope(notificationsRes);
  if (notificationsRes.status() === 200 && notificationsJson.success) {
    ctx.notificationId = pickFirstIdFromList(notificationsJson.data);
  }

  const packsRes = await request.get(apiRoutes.examHubPacks, { headers });
  const packsJson = await readEnvelope(packsRes);
  if (packsRes.status() === 200 && packsJson.success) {
    ctx.packId = pickFirstIdFromList(packsJson.data);
    if (ctx.packId) {
      const subjectsRes = await request.get(
        apiRoutes.examHubPackSubjects(ctx.packId),
        { headers }
      );
      const subjectsJson = await readEnvelope(subjectsRes);
      if (subjectsRes.status() === 200) {
        ctx.subjectId = pickFirstIdFromList(subjectsJson.data);
      }
    }
  }

  const learnerMeRes = await request.get(apiRoutes.learnerProfilesMe, {
    headers,
  });
  const learnerMeJson = await readEnvelope(learnerMeRes);
  if (learnerMeRes.status() === 200 && learnerMeJson.data) {
    const data = learnerMeJson.data as Record<string, unknown>;
    if (typeof data.id === "string") ctx.learnerProfileId = data.id;
  }

  return ctx;
}
