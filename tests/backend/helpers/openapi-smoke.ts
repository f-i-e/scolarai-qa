import type { APIRequestContext, APIResponse } from "@playwright/test";
import { bearerAuth } from "./auth-headers";
import {
  PLACEHOLDER_QUESTION_ID,
  PLACEHOLDER_SUBMISSION_ID,
  PLACEHOLDER_UUID,
  type OpenApiContext,
} from "./openapi-context";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type OpenApiOperation = {
  method: HttpMethod;
  path: string;
  operationId?: string;
  tags: string[];
  requiresJwt: boolean;
};

type OpenApiSpec = {
  paths: Record<
    string,
    Partial<
      Record<
        Lowercase<HttpMethod>,
        {
          tags?: string[];
          operationId?: string;
          security?: Record<string, unknown>[];
        }
      >
    >
  >;
  security?: Record<string, unknown>[];
};

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** Destructive or side-effect-heavy — covered by dedicated specs, not smoke. */
export const SKIP_OPERATIONS = new Set<string>([
  "DELETE /v1/users/account",
  "POST /v1/admin/auth/force-logout",
  "DELETE /v1/tutor/me",
]);

/** Smoke skips admin surfaces and mutating tutor/chat/seat flows (see dedicated specs). */
export function shouldSkipOpenApiSmoke(op: OpenApiOperation): boolean {
  if (SKIP_OPERATIONS.has(operationKey(op))) return true;

  const { path, method } = op;
  if (path.includes("/admin/")) return true;

  const mutating = method !== "GET";
  const dedicatedPrefixes = [
    "/v1/chat/",
    "/v1/tutor/",
    "/v1/seats/",
    "/v1/governance/",
    "/v1/institution/",
    "/v1/assignments/",
    "/v1/attendance/",
    "/v1/document-extraction/",
    "/v1/tutor-ai-assist/",
    "/v1/ai/sync",
  ];
  if (mutating && dedicatedPrefixes.some((p) => path.startsWith(p) || path.includes(p))) {
    return true;
  }

  return false;
}

const PAGINATED_GET_PATHS = new Set([
  "/v1/users",
  "/v1/notifications",
  "/v1/lessons",
  "/v1/curriculum/curricula",
  "/v1/assessments/history",
  "/v1/admin/assessments",
  "/v1/admin/submissions",
  "/v1/exam-hub/packs",
  "/v1/roles",
  "/v1/users/profile/search",
  "/v1/users/locations/search",
  "/v1/chat/sessions",
  "/v1/tutor/classes",
  "/v1/tutor/roster",
  "/v1/tutor/assignments",
  "/v1/tutor/questions",
  "/v1/tutor/documents",
  "/v1/tutor/review",
  "/v1/assignments",
  "/v1/seats/pools",
  "/v1/seats/invoices",
]);

export function listOperations(spec: OpenApiSpec): OpenApiOperation[] {
  const ops: OpenApiOperation[] = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const op = methods[method.toLowerCase() as Lowercase<HttpMethod>];
      if (!op) continue;
      const security = op.security ?? spec.security ?? [];
      const requiresJwt =
        security.length > 0 &&
        !security.some((entry) => Object.keys(entry).length === 0);
      ops.push({
        method,
        path,
        operationId: op.operationId,
        tags: op.tags ?? ["untagged"],
        requiresJwt,
      });
    }
  }
  return ops.sort((a, b) =>
    a.path === b.path
      ? a.method.localeCompare(b.method)
      : a.path.localeCompare(b.path)
  );
}

function resolveParam(path: string, param: string, ctx: OpenApiContext): string {
  if (param === "provider") return "google";
  if (param === "slug") return ctx.lessonSlug ?? "qa-smoke-slug";
  if (param === "code") return ctx.curriculumCode ?? "QA-SMOKE";
  if (param === "path") return "index.html";
  if (param === "userId") return ctx.userId ?? PLACEHOLDER_UUID;
  if (param === "learnerId") return ctx.learnerProfileId ?? ctx.userId ?? PLACEHOLDER_UUID;
  if (param === "lessonId") return ctx.lessonId ?? PLACEHOLDER_UUID;
  if (param === "curriculumId") return ctx.curriculumId ?? PLACEHOLDER_UUID;
  if (param === "subjectId") return ctx.subjectId ?? PLACEHOLDER_UUID;
  if (param === "schoolId") return ctx.schoolId ?? PLACEHOLDER_UUID;
  if (param === "countryId") return ctx.countryId ?? PLACEHOLDER_UUID;
  if (param === "stateId") return ctx.stateId ?? PLACEHOLDER_UUID;
  if (param === "packId") return ctx.packId ?? PLACEHOLDER_UUID;
  if (param === "sessionId") {
    if (path.includes("/chat/")) return ctx.chatSessionId ?? PLACEHOLDER_UUID;
    return ctx.sessionId ?? PLACEHOLDER_UUID;
  }
  if (param === "messageId") return ctx.chatMessageId ?? PLACEHOLDER_UUID;
  if (param === "classId" || param === "classroomId") {
    return ctx.tutorClassId ?? PLACEHOLDER_UUID;
  }
  if (param === "studentId") return ctx.rosterStudentId ?? PLACEHOLDER_UUID;
  if (param === "poolId" || param === "archiveId" || param === "jobId") {
    return PLACEHOLDER_UUID;
  }
  if (param === "planId") return ctx.planId ?? PLACEHOLDER_UUID;
  if (param === "questionId") return PLACEHOLDER_QUESTION_ID;
  if (param === "submissionId") return PLACEHOLDER_SUBMISSION_ID;

  if (param === "id") {
    if (path.includes("/roles/")) return ctx.roleId ?? PLACEHOLDER_UUID;
    if (path.includes("/users/learner-profiles/")) {
      return ctx.learnerProfileId ?? PLACEHOLDER_UUID;
    }
    if (path.includes("/users/")) return ctx.userId ?? PLACEHOLDER_UUID;
    if (path.includes("/lessons/")) return ctx.lessonId ?? PLACEHOLDER_UUID;
    if (path.includes("/assessments/")) return ctx.assessmentId ?? PLACEHOLDER_UUID;
    if (path.includes("/curriculum/curricula/")) return ctx.curriculumId ?? PLACEHOLDER_UUID;
    if (path.includes("/notifications/")) return ctx.notificationId ?? PLACEHOLDER_UUID;
    if (path.includes("/exam-hub/packs/")) return ctx.packId ?? PLACEHOLDER_UUID;
    if (path.includes("/exam-hub/sessions/")) return ctx.sessionId ?? PLACEHOLDER_UUID;
    if (path.includes("/test-dashboard/errors/")) return PLACEHOLDER_UUID;
    if (path.includes("/admin/billing/exam-packs/")) return PLACEHOLDER_UUID;
    if (path.includes("/admin/assessments/")) return ctx.assessmentId ?? PLACEHOLDER_UUID;
    if (path.includes("/billing/exam-packs/")) return PLACEHOLDER_UUID;
    if (path.includes("/users/countries/")) return ctx.countryId ?? PLACEHOLDER_UUID;
    if (path.includes("/users/states/")) return ctx.stateId ?? PLACEHOLDER_UUID;
    if (path.includes("/users/schools/")) return ctx.schoolId ?? PLACEHOLDER_UUID;
    if (path.includes("/chat/sessions/")) return ctx.chatSessionId ?? PLACEHOLDER_UUID;
    if (path.includes("/chat/messages/")) return ctx.chatMessageId ?? PLACEHOLDER_UUID;
    if (path.includes("/tutor/classes/")) return ctx.tutorClassId ?? PLACEHOLDER_UUID;
    return PLACEHOLDER_UUID;
  }

  return PLACEHOLDER_UUID;
}

export function resolveOperationPath(path: string, ctx: OpenApiContext): string {
  return path.replace(/\{([^}]+)\}/g, (_, param: string) =>
    encodeURIComponent(resolveParam(path, param, ctx))
  );
}

function withPagination(path: string, method: HttpMethod): string {
  if (method !== "GET" || path.includes("?")) return path;
  if (!PAGINATED_GET_PATHS.has(path)) return path;
  return `${path}?page=1&limit=5`;
}

export function smokeAllowedStatuses(
  method: HttpMethod,
  requiresJwt: boolean,
  hasToken: boolean
): readonly number[] {
  const client = [400, 401, 403, 404, 405, 409, 422, 429, 503] as const;
  const success = [200, 201, 204] as const;

  if (!requiresJwt) return [...success, ...client];
  if (hasToken) return [...success, ...client];
  return [...client];
}

export async function invokeOperation(
  request: APIRequestContext,
  op: OpenApiOperation,
  ctx: OpenApiContext
): Promise<APIResponse> {
  const url = withPagination(resolveOperationPath(op.path, ctx), op.method);
  const headers =
    op.requiresJwt && ctx.accessToken
      ? bearerAuth(ctx.accessToken)
      : undefined;
  const options = { headers, data: {} as Record<string, never> };

  switch (op.method) {
    case "GET":
      return request.get(url, { headers });
    case "POST":
      return request.post(url, options);
    case "PUT":
      return request.put(url, options);
    case "PATCH":
      return request.patch(url, options);
    case "DELETE":
      return request.delete(url, { headers });
  }
}

export function operationKey(op: OpenApiOperation): string {
  return `${op.method} ${op.path}`;
}
