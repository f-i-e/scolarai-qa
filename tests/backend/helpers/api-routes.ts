import { apiRoutePrefix } from "./paths";

/**
 * OpenAPI: health routes are under `/v1` (not under `/api/v1`).
 * @see https://test-api.scolarai.com/openapi-spec.json
 */
export const healthRoutes = {
  root: "/v1",
  metrics: "/v1/metrics",
} as const;

/** Routes under `SCHOLARAI_API_VERSION_PREFIX` (default `/api/v1`). */
export const apiRoutes = {
  users: `${apiRoutePrefix}/users`,
  userProfileMe: `${apiRoutePrefix}/users/profile/me`,
  learnerProfilesMe: `${apiRoutePrefix}/users/learner-profiles/me`,
  learnerCountriesList: `${apiRoutePrefix}/users/learner-profiles/countries/list`,
  lessons: `${apiRoutePrefix}/lessons`,
  lessonBySlug: (slug: string) => `${apiRoutePrefix}/lessons/${encodeURIComponent(slug)}`,
  assessments: `${apiRoutePrefix}/assessments`,
  progress: `${apiRoutePrefix}/progress`,
  notifications: `${apiRoutePrefix}/notifications`,
  curriculum: `${apiRoutePrefix}/curriculum`,
  curriculumSearch: `${apiRoutePrefix}/curriculum/search`,
  analyticsOverview: `${apiRoutePrefix}/analytics/overview`,
  /** @see OpenAPI tag Roles */
  roles: `${apiRoutePrefix}/roles`,
  roleById: (id: string) => `${apiRoutePrefix}/roles/${encodeURIComponent(id)}`,
  rolesAssign: `${apiRoutePrefix}/roles/assign`,
  rolesRevoke: `${apiRoutePrefix}/roles/revoke`,
  userRolePermissions: (userId: string) =>
    `${apiRoutePrefix}/roles/user/${encodeURIComponent(userId)}/permissions`,
} as const;
