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
  userById: (id: string) => `${apiRoutePrefix}/users/${encodeURIComponent(id)}`,
  userProfileCreate: `${apiRoutePrefix}/users/profile`,
  userProfileMe: `${apiRoutePrefix}/users/profile/me`,
  userProfileUpdate: `${apiRoutePrefix}/users/profile/update`,
  userProfileSearch: `${apiRoutePrefix}/users/profile/search`,
  learnerProfiles: `${apiRoutePrefix}/users/learner-profiles`,
  learnerProfilesMe: `${apiRoutePrefix}/users/learner-profiles/me`,
  learnerProfileById: (id: string) =>
    `${apiRoutePrefix}/users/learner-profiles/${encodeURIComponent(id)}`,
  learnerCountriesList: `${apiRoutePrefix}/users/learner-profiles/countries/list`,
  learnerStatesByCountry: (countryId: string) =>
    `${apiRoutePrefix}/users/learner-profiles/countries/${encodeURIComponent(countryId)}/states`,
  learnerSchoolsByState: (stateId: string) =>
    `${apiRoutePrefix}/users/learner-profiles/states/${encodeURIComponent(stateId)}/schools`,
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
