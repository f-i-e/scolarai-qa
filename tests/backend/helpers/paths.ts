/**
 * Route prefix before `/auth/...` (no trailing slash).
 *
 * - **`/v1`** — default; matches api.testing OpenAPI (`/v1/auth/...`).
 * - **`/api/v1`** — legacy test-api gateway; set `SCHOLARAI_API_VERSION_PREFIX=/api/v1`.
 * - **`/api`** — unversioned gateway; set `SCHOLARAI_API_VERSION_PREFIX=/api`.
 *
 * **baseURL** must stay **origin-only** (e.g. `https://api.testing.scolarai.com`). See `playwright.config.ts`.
 *
 * Note: GitHub Actions often passes `SCHOLARAI_API_VERSION_PREFIX=` as an **empty string** when the
 * variable is unset — `??` would not fall back. We treat blank as missing and default to `/v1`.
 */
export const apiRoutePrefix = (
  process.env.SCHOLARAI_API_VERSION_PREFIX?.trim() || "/v1"
).replace(/\/$/, "");

const versionPrefix = apiRoutePrefix;

export const paths = {
  register: process.env.SCHOLARAI_PATH_REGISTER ?? `${versionPrefix}/auth/register`,
  login: process.env.SCHOLARAI_PATH_LOGIN ?? `${versionPrefix}/auth/login`,
  refresh: process.env.SCHOLARAI_PATH_REFRESH ?? `${versionPrefix}/auth/refresh`,
  logout: process.env.SCHOLARAI_PATH_LOGOUT ?? `${versionPrefix}/auth/logout`,
  me: process.env.SCHOLARAI_PATH_ME ?? `${versionPrefix}/auth/me`,
  verify: process.env.SCHOLARAI_PATH_VERIFY ?? `${versionPrefix}/auth/verify`,
  passwordResetRequest:
    process.env.SCHOLARAI_PATH_PASSWORD_RESET_REQUEST ??
    `${versionPrefix}/auth/password/reset/request`,
  passwordResetConfirm:
    process.env.SCHOLARAI_PATH_PASSWORD_RESET_CONFIRM ??
    `${versionPrefix}/auth/password/reset/confirm`,
  passwordChange:
    process.env.SCHOLARAI_PATH_PASSWORD_CHANGE ??
    `${versionPrefix}/auth/password/change`,
  emailChangeRequest:
    process.env.SCHOLARAI_PATH_EMAIL_CHANGE_REQUEST ??
    `${versionPrefix}/auth/email/change/request`,
  emailChangeConfirm:
    process.env.SCHOLARAI_PATH_EMAIL_CHANGE_CONFIRM ??
    `${versionPrefix}/auth/email/change/confirm`,
  socialLogin: (provider: string) =>
    `${versionPrefix}/auth/social/${encodeURIComponent(provider)}`,
};
